// On-chain Worker routes: chain-worker-submit / chain-worker-confirm
// DD-OPS-CHECKOUT-ONCHAIN §7–9
// Called by pg_cron via POST. Authorization: Bearer <service_role_key> required.
// ethers@6 is heavy; dynamically imported so other routes are not slowed.
import { Hono } from "npm:hono";
import { createServiceClient } from "./_shared.ts";

const chainWorker = new Hono();

const RECEIPT_REGISTRY_ABI = [
  "function recordReceipt(bytes32 anchorHash, uint32 points) external",
  "function isRecorded(bytes32 anchorHash) external view returns (bool)",
  "function recordAffiliation(bytes32 anchorHash, bytes32 companyHash, bytes32 staffHash) external",
  "function isAffiliationRecorded(bytes32 anchorHash) external view returns (bool)",
];

async function loadEthers() {
  const { ethers } = await import("npm:ethers@6");
  return ethers;
}

/** Verify Bearer auth from pg_cron (SERVICE_ROLE_KEY or CHAIN_WORKER_SECRET) */
function authorizeWorker(authHeader: string | undefined): boolean {
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!bearer) return false;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceKey && bearer === serviceKey) return true;
  const workerSecret = Deno.env.get("CHAIN_WORKER_SECRET");
  if (workerSecret && bearer === workerSecret) return true;
  return false;
}

/** Exponential backoff (minutes): min(2^retryCount, 60) */
function backoffMs(retryCount: number): number {
  return Math.min(Math.pow(2, retryCount), 60) * 60 * 1000;
}

// ─── chain-worker-submit ───────────────────────────────────────────────────
// Process up to 5 queued/failed receipts (next_attempt_at <= now), send via ReceiptRegistry.recordReceipt() on Avalanche C-Chain (Fuji).
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

  // Fetch records (queued/failed and retry time passed)
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

  const ethers = await loadEthers();
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
      // Idempotency: check if already recorded on-chain
      const alreadyRecorded: boolean = await contract.isRecorded(receipt.anchor_hash);
      if (alreadyRecorded) {
        // Already recorded → treat as confirmed (avoid duplicate send)
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

      // Send Tx — recordReceipt ~60k gas (1 SSTORE + event). Use 100k for safety. gasPrice omitted (ethers uses EIP-1559).
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
// For submitted receipts, check eth_getTransactionReceipt; status=1 → confirmed, status=0 → failed+backoff.
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

  const ethers = await loadEthers();
  const provider = new ethers.JsonRpcProvider(FUJI_RPC);

  let confirmed = 0;
  let failed = 0;

  for (const receipt of receipts) {
    try {
      const txReceipt = await provider.getTransactionReceipt(receipt.tx_hash);

      if (!txReceipt) {
        // Still pending — defer to next scan
        continue;
      }

      if (txReceipt.status === 1) {
        // Tx success
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

// ─── chain-worker-affiliation-submit ──────────────────────────────────────
// Process queued/failed chain_affiliation rows → recordAffiliation() on Avalanche.
chainWorker.post("/chain-worker-affiliation-submit", async (c) => {
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

  const { data: rows, error: fetchErr } = await supabase
    .from("chain_affiliation")
    .select("chain_affiliation_id, anchor_hash, company_hash, staff_hash, retry_count, contract_address")
    .in("receipt_status", ["queued", "failed"])
    .or(`next_attempt_at.is.null,next_attempt_at.lte.${now}`)
    .order("created_at", { ascending: true })
    .limit(5);

  if (fetchErr) {
    console.log("[chain-worker-aff-submit] DB fetch error:", fetchErr.message);
    return c.json({ error: fetchErr.message }, 500);
  }
  if (!rows?.length) {
    return c.json({ processed: 0, submitted: 0, failed: 0 });
  }

  const ethers = await loadEthers();
  const provider = new ethers.JsonRpcProvider(FUJI_RPC);
  const wallet = new ethers.Wallet(ISSUER_PK, provider);

  let submitted = 0;
  let failed = 0;

  for (const row of rows) {
    const contractAddr = row.contract_address || DEFAULT_CONTRACT;

    if (!contractAddr) {
      await supabase.from("chain_affiliation").update({
        receipt_status: "failed",
        tx_error: "CONTRACT_ADDRESS not configured",
        last_attempt_at: now,
        retry_count: (row.retry_count ?? 0) + 1,
        updated_at: now,
      }).eq("chain_affiliation_id", row.chain_affiliation_id);
      failed++;
      continue;
    }

    const contract = new ethers.Contract(contractAddr, RECEIPT_REGISTRY_ABI, wallet);

    try {
      const alreadyRecorded: boolean = await contract.isAffiliationRecorded(row.anchor_hash);
      if (alreadyRecorded) {
        await supabase.from("chain_affiliation").update({
          receipt_status: "confirmed",
          confirmed_at: now,
          fail_reason: "already_recorded",
          last_attempt_at: now,
          updated_at: now,
        }).eq("chain_affiliation_id", row.chain_affiliation_id);
        submitted++;
        console.log(`[chain-worker-aff-submit] already_recorded: ${row.chain_affiliation_id}`);
        continue;
      }

      const tx = await contract.recordAffiliation(
        row.anchor_hash,
        row.company_hash,
        row.staff_hash,
        { gasLimit: 120_000 },
      );

      await supabase.from("chain_affiliation").update({
        receipt_status: "submitted",
        tx_hash: tx.hash,
        submitted_at: now,
        last_attempt_at: now,
        tx_error: null,
        updated_at: now,
      }).eq("chain_affiliation_id", row.chain_affiliation_id);

      submitted++;
      console.log(`[chain-worker-aff-submit] submitted tx=${tx.hash} for ${row.chain_affiliation_id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const retryCount = (row.retry_count ?? 0) + 1;
      const nextAttempt = new Date(Date.now() + backoffMs(retryCount)).toISOString();

      await supabase.from("chain_affiliation").update({
        receipt_status: "failed",
        retry_count: retryCount,
        next_attempt_at: nextAttempt,
        last_attempt_at: now,
        tx_error: msg.slice(0, 500),
        updated_at: now,
      }).eq("chain_affiliation_id", row.chain_affiliation_id);

      failed++;
      console.log(`[chain-worker-aff-submit] failed ${row.chain_affiliation_id}: ${msg}`);
    }
  }

  return c.json({ processed: rows.length, submitted, failed });
});

// ─── chain-worker-affiliation-confirm ─────────────────────────────────────
chainWorker.post("/chain-worker-affiliation-confirm", async (c) => {
  if (!authorizeWorker(c.req.header("Authorization"))) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const FUJI_RPC = Deno.env.get("AVALANCHE_RPC_URL") ?? "https://api.avax-test.network/ext/bc/C/rpc";
  const supabase = createServiceClient();
  const now = new Date().toISOString();

  const { data: rows, error: fetchErr } = await supabase
    .from("chain_affiliation")
    .select("chain_affiliation_id, tx_hash, retry_count")
    .eq("receipt_status", "submitted")
    .not("tx_hash", "is", null)
    .is("confirmed_at", null)
    .limit(10);

  if (fetchErr) {
    console.log("[chain-worker-aff-confirm] DB fetch error:", fetchErr.message);
    return c.json({ error: fetchErr.message }, 500);
  }
  if (!rows?.length) {
    return c.json({ processed: 0, confirmed: 0, failed: 0 });
  }

  const ethers = await loadEthers();
  const provider = new ethers.JsonRpcProvider(FUJI_RPC);

  let confirmed = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const txReceipt = await provider.getTransactionReceipt(row.tx_hash);

      if (!txReceipt) continue;

      if (txReceipt.status === 1) {
        await supabase.from("chain_affiliation").update({
          receipt_status: "confirmed",
          confirmed_at: now,
          updated_at: now,
        }).eq("chain_affiliation_id", row.chain_affiliation_id);

        confirmed++;
        console.log(`[chain-worker-aff-confirm] confirmed: ${row.chain_affiliation_id} tx=${row.tx_hash}`);
      } else {
        const retryCount = (row.retry_count ?? 0) + 1;
        const nextAttempt = new Date(Date.now() + backoffMs(retryCount)).toISOString();

        await supabase.from("chain_affiliation").update({
          receipt_status: "failed",
          retry_count: retryCount,
          next_attempt_at: nextAttempt,
          tx_error: "tx_reverted",
          updated_at: now,
        }).eq("chain_affiliation_id", row.chain_affiliation_id);

        failed++;
        console.log(`[chain-worker-aff-confirm] reverted: ${row.chain_affiliation_id}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`[chain-worker-aff-confirm] error for ${row.chain_affiliation_id}: ${msg}`);
    }
  }

  return c.json({ processed: rows.length, confirmed, failed });
});

export default chainWorker;
