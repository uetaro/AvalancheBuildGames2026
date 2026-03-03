// On-chain Worker routes: chain-worker-submit / chain-worker-confirm
// DD-OPS-CHECKOUT-ONCHAIN §7–9
// pg_cron から毎分 POST で呼ばれる。Authorization: Bearer <service_role_key> が必須。
import { Hono } from "npm:hono";
import { ethers } from "npm:ethers@6";
import { createServiceClient } from "./_shared.ts";

const chainWorker = new Hono();

// ReceiptRegistry コントラクトの最小 ABI（呼び出しに必要な関数のみ）
const RECEIPT_REGISTRY_ABI = [
  "function recordReceipt(bytes32 anchorHash, uint32 points) external",
  "function isRecorded(bytes32 anchorHash) external view returns (bool)",
];

/** pg_cron からの呼び出しを検証する Bearer 認証（SERVICE_ROLE_KEY または CHAIN_WORKER_SECRET） */
function authorizeWorker(authHeader: string | undefined): boolean {
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!bearer) return false;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceKey && bearer === serviceKey) return true;
  const workerSecret = Deno.env.get("CHAIN_WORKER_SECRET");
  if (workerSecret && bearer === workerSecret) return true;
  return false;
}

/** 指数バックオフ（分）: min(2^retryCount, 60) */
function backoffMs(retryCount: number): number {
  return Math.min(Math.pow(2, retryCount), 60) * 60 * 1000;
}

// ─── chain-worker-submit ───────────────────────────────────────────────────
// queued / failed (かつ next_attempt_at <= now) のレシートを最大 5 件処理し、
// Avalanche C-Chain (Fuji) の ReceiptRegistry.recordReceipt() を呼んで送信する。
chainWorker.post("/chain-worker-submit", async (c) => {
  if (!authorizeWorker(c.req.header("Authorization"))) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const ISSUER_PK = Deno.env.get("ISSUER_PRIVATE_KEY");
  const FUJI_RPC = Deno.env.get("AVALANCHE_RPC_URL") ?? "https://api.avax-test.network/ext/bc/C/rpc";
  const DEFAULT_CONTRACT = Deno.env.get("RECEIPT_REGISTRY_ADDRESS") ?? "";

  if (!ISSUER_PK) {
    return c.json({ error: "ISSUER_PRIVATE_KEY not configured" }, 500);
  }

  const supabase = createServiceClient();
  const now = new Date().toISOString();

  // 対象レコード取得（queued/failed かつリトライ時刻が過ぎたもの）
  const { data: receipts, error: fetchErr } = await supabase
    .from("chain_receipt")
    .select("chain_receipt_id, anchor_hash, points_awarded, retry_count, contract_address")
    .in("receipt_status", ["queued", "failed"])
    .or(`next_attempt_at.is.null,next_attempt_at.lte.${now}`)
    .order("created_at", { ascending: true })
    .limit(5);

  if (fetchErr) {
    console.log("[chain-worker-submit] DB fetch error:", fetchErr.message);
    return c.json({ error: fetchErr.message }, 500);
  }
  if (!receipts?.length) {
    return c.json({ processed: 0, submitted: 0, failed: 0 });
  }

  const provider = new ethers.JsonRpcProvider(FUJI_RPC);
  const wallet = new ethers.Wallet(ISSUER_PK, provider);

  let submitted = 0;
  let failed = 0;

  for (const receipt of receipts) {
    const contractAddr = receipt.contract_address || DEFAULT_CONTRACT;

    if (!contractAddr) {
      await supabase.from("chain_receipt").update({
        receipt_status: "failed",
        tx_error: "CONTRACT_ADDRESS not configured",
        last_attempt_at: now,
        retry_count: (receipt.retry_count ?? 0) + 1,
        updated_at: now,
      }).eq("chain_receipt_id", receipt.chain_receipt_id);
      failed++;
      continue;
    }

    const contract = new ethers.Contract(contractAddr, RECEIPT_REGISTRY_ABI, wallet);

    try {
      // 冪等チェック: すでにオンチェーンに記録済みか確認
      const alreadyRecorded: boolean = await contract.isRecorded(receipt.anchor_hash);
      if (alreadyRecorded) {
        // 既に記録済み → confirmed として扱う（重複送信防止）
        await supabase.from("chain_receipt").update({
          receipt_status: "confirmed",
          confirmed_at: now,
          fail_reason: "already_recorded",
          last_attempt_at: now,
          updated_at: now,
        }).eq("chain_receipt_id", receipt.chain_receipt_id);
        submitted++;
        console.log(`[chain-worker-submit] already_recorded: ${receipt.chain_receipt_id}`);
        continue;
      }

      // ── Tx 送信 ──────────────────────────────────────────────────────────
      // gasLimit: recordReceipt は 1 SSTORE + イベント発行で ~60,000 gas。
      // 安全マージン込みで 100,000 に固定（Fuji/C-Chain でも有効）。
      // gasPrice は ethers が EIP-1559 base fee を自動取得するため省略。
      const tx = await contract.recordReceipt(
        receipt.anchor_hash,
        receipt.points_awarded,
        { gasLimit: 100_000 },
      );

      await supabase.from("chain_receipt").update({
        receipt_status: "submitted",
        tx_hash: tx.hash,
        submitted_at: now,
        last_attempt_at: now,
        tx_error: null,
        updated_at: now,
      }).eq("chain_receipt_id", receipt.chain_receipt_id);

      submitted++;
      console.log(`[chain-worker-submit] submitted tx=${tx.hash} for ${receipt.chain_receipt_id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const retryCount = (receipt.retry_count ?? 0) + 1;
      const nextAttempt = new Date(Date.now() + backoffMs(retryCount)).toISOString();

      await supabase.from("chain_receipt").update({
        receipt_status: "failed",
        retry_count: retryCount,
        next_attempt_at: nextAttempt,
        last_attempt_at: now,
        tx_error: msg.slice(0, 500),
        updated_at: now,
      }).eq("chain_receipt_id", receipt.chain_receipt_id);

      failed++;
      console.log(`[chain-worker-submit] failed ${receipt.chain_receipt_id}: ${msg}`);
    }
  }

  return c.json({ processed: receipts.length, submitted, failed });
});

// ─── chain-worker-confirm ──────────────────────────────────────────────────
// submitted のレシートについて eth_getTransactionReceipt を確認し、
// status=1 → confirmed / status=0 → failed+backoff に更新する。
chainWorker.post("/chain-worker-confirm", async (c) => {
  if (!authorizeWorker(c.req.header("Authorization"))) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const FUJI_RPC = Deno.env.get("AVALANCHE_RPC_URL") ?? "https://api.avax-test.network/ext/bc/C/rpc";
  const supabase = createServiceClient();
  const now = new Date().toISOString();

  const { data: receipts, error: fetchErr } = await supabase
    .from("chain_receipt")
    .select("chain_receipt_id, tx_hash, retry_count")
    .eq("receipt_status", "submitted")
    .not("tx_hash", "is", null)
    .is("confirmed_at", null)
    .limit(10);

  if (fetchErr) {
    console.log("[chain-worker-confirm] DB fetch error:", fetchErr.message);
    return c.json({ error: fetchErr.message }, 500);
  }
  if (!receipts?.length) {
    return c.json({ processed: 0, confirmed: 0, failed: 0 });
  }

  const provider = new ethers.JsonRpcProvider(FUJI_RPC);

  let confirmed = 0;
  let failed = 0;

  for (const receipt of receipts) {
    try {
      const txReceipt = await provider.getTransactionReceipt(receipt.tx_hash);

      if (!txReceipt) {
        // まだ pending — 次回スキャンに持ち越す
        continue;
      }

      if (txReceipt.status === 1) {
        // ── Tx 成功 ────────────────────────────────────────────────────────
        await supabase.from("chain_receipt").update({
          receipt_status: "confirmed",
          confirmed_at: now,
          updated_at: now,
        }).eq("chain_receipt_id", receipt.chain_receipt_id);

        confirmed++;
        console.log(`[chain-worker-confirm] confirmed: ${receipt.chain_receipt_id} tx=${receipt.tx_hash}`);
      } else {
        // ── Tx revert ─────────────────────────────────────────────────────
        const retryCount = (receipt.retry_count ?? 0) + 1;
        const nextAttempt = new Date(Date.now() + backoffMs(retryCount)).toISOString();

        await supabase.from("chain_receipt").update({
          receipt_status: "failed",
          retry_count: retryCount,
          next_attempt_at: nextAttempt,
          tx_error: "tx_reverted",
          updated_at: now,
        }).eq("chain_receipt_id", receipt.chain_receipt_id);

        failed++;
        console.log(`[chain-worker-confirm] reverted: ${receipt.chain_receipt_id}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`[chain-worker-confirm] error for ${receipt.chain_receipt_id}: ${msg}`);
    }
  }

  return c.json({ processed: receipts.length, confirmed, failed });
});

export default chainWorker;
