// Routes for Kudos Send (Guest -> Staff)
// Implements full business logic without relying on the DB RPC,
// since the RPC restricts member_role to 'employee' only but the
// staff list shows employee/staff/manager.
import { Hono } from "npm:hono";
import { ethers } from "npm:ethers@6";
import { errorResponse, validateGuestSession, createServiceClient } from "./_shared.ts";

const ALLOWED_ROLES = ["employee", "staff", "manager"];

// ── Blockchain: anchor_hash 生成（Option B — 送信時点でオンチェーン記録）──────
// 設計書 DD-OPS-CHECKOUT-ONCHAIN §5.2 準拠
// V2: message_text のハッシュを追加し、メッセージ改ざんも検知可能にした
const CHAIN_ID = 43113; // Fuji Testnet（本番は 43114）
const SCHEMA_ID = ethers.keccak256(ethers.toUtf8Bytes("HEARTEL_RECEIPT_V2"));

/**
 * anchor_hash = keccak256(abi.encode(
 *   SCHEMA_ID, kudos_uuid(bytes16), stay_uuid(bytes16),
 *   company_uuid(bytes16), receiver_uuid(bytes16),
 *   category_hash(bytes32), message_hash(bytes32), points(uint32), issued_at_sec(uint64)
 * ))
 * DB の値から確定的に計算される。チェックアウト後に再計算しても一致する。
 * V2 追加: message_hash = keccak256(message_text) により本文の改ざんも検知可能。
 */
function computeAnchorHash(k: {
  kudos_id: string;
  stay_id: string;
  company_id: string;
  receiver_company_member_id: string;
  category: string;
  message_text: string;
  points_awarded: number;
  created_at: string;
}): string {
  const categoryHash = ethers.keccak256(ethers.toUtf8Bytes(k.category ?? ""));
  const messageHash = ethers.keccak256(ethers.toUtf8Bytes(k.message_text ?? ""));
  const issuedAtSec = BigInt(Math.floor(new Date(k.created_at).getTime() / 1000));

  const encoded = ethers.AbiCoder.defaultAbiCoder().encode(
    ["bytes32", "bytes16", "bytes16", "bytes16", "bytes16", "bytes32", "bytes32", "uint32", "uint64"],
    [
      SCHEMA_ID,
      "0x" + k.kudos_id.replace(/-/g, ""),
      "0x" + k.stay_id.replace(/-/g, ""),
      "0x" + k.company_id.replace(/-/g, ""),
      "0x" + k.receiver_company_member_id.replace(/-/g, ""),
      categoryHash,
      messageHash,
      k.points_awarded,
      issuedAtSec,
    ],
  );

  return ethers.keccak256(encoded);
}

const kudos = new Hono();

// POST /public-kudos-send
kudos.post("/public-kudos-send", async (c) => {
  try {
    // ── 1) Validate guest session ──────────────────────────────────
    const guestToken = c.req.header("X-Guest-Session-Token") ?? null;
    const result = await validateGuestSession(guestToken);

    if (!result.ok) {
      return c.json(
        errorResponse(result.error_code, result.message),
        result.status as any
      );
    }

    const { guest_session_id, stay_id, company_id } = result.session;
    const db = createServiceClient();

    // ── 2) Parse & validate request body ───────────────────────────
    let body: any;
    try {
      body = await c.req.json();
    } catch {
      return c.json(errorResponse("VALIDATION_ERROR", "Invalid JSON body"), 400);
    }

    const { receiver_company_member_id, category, message_text } = body;

    if (!receiver_company_member_id || typeof receiver_company_member_id !== "string") {
      return c.json(errorResponse("VALIDATION_ERROR", "receiver_company_member_id is required"), 400);
    }
    if (!category || typeof category !== "string" || category.trim().length === 0) {
      return c.json(errorResponse("VALIDATION_ERROR", "category is required"), 400);
    }
    if (!message_text || typeof message_text !== "string" || message_text.trim().length === 0) {
      return c.json(errorResponse("VALIDATION_ERROR", "message_text is required"), 400);
    }
    if (message_text.length > 500) {
      return c.json(errorResponse("VALIDATION_ERROR", "message_text exceeds 500 characters"), 400);
    }

    // ── 3) Fetch stay (rules_snapshot, status, checkout_at) ────────
    const { data: stay, error: stayErr } = await db
      .from("stay")
      .select("stay_id, company_id, stay_status, checkout_at, rules_snapshot")
      .eq("stay_id", stay_id)
      .maybeSingle();

    if (stayErr || !stay) {
      console.error("Error fetching stay:", stayErr);
      return c.json(errorResponse("INTERNAL_ERROR", "Failed to fetch stay"), 500);
    }

    const rules = stay.rules_snapshot ?? {};
    const quota = (rules as any).kudos_quota ?? 3;
    const cooldownSec = (rules as any).cooldown_sec ?? 0;
    const postWindow = (rules as any).post_checkout_window_sec ?? 0;
    const pointsAward = (rules as any).points_award ?? 10;

    // ── 4) Post-checkout window check ──────────────────────────────
    const now = new Date();
    if (stay.stay_status === "closed") {
      if (!stay.checkout_at) {
        return c.json(errorResponse("INTERNAL_ERROR", "Closed stay missing checkout_at"), 500);
      }
      const deadline = new Date(new Date(stay.checkout_at).getTime() + postWindow * 1000);
      if (now > deadline) {
        return c.json(
          errorResponse("POST_CHECKOUT_WINDOW_EXPIRED", "The post-checkout window has expired."),
          409
        );
      }
    }

    // ── 5) Receiver validation (same company, active, allowed role) ─
    const { data: receiver, error: rcvErr } = await db
      .from("company_member")
      .select("company_member_id, company_id, member_status, member_role")
      .eq("company_member_id", receiver_company_member_id)
      .maybeSingle();

    if (rcvErr) {
      console.error("Error fetching receiver:", rcvErr);
      return c.json(errorResponse("INTERNAL_ERROR", "Database error fetching receiver"), 500);
    }

    if (!receiver) {
      return c.json(errorResponse("RECEIVER_NOT_FOUND", "Staff member not found."), 404);
    }
    if (receiver.company_id !== company_id) {
      return c.json(errorResponse("RECEIVER_NOT_FOUND", "Staff member not in this company."), 404);
    }
    if (receiver.member_status !== "active") {
      return c.json(errorResponse("RECEIVER_NOT_FOUND", "Staff member is not active."), 404);
    }
    if (!ALLOWED_ROLES.includes(receiver.member_role)) {
      return c.json(errorResponse("RECEIVER_NOT_FOUND", "Staff member role not eligible."), 404);
    }

    // ── 6) On-duty validation ──────────────────────────────────────
    const { data: dutyRows, error: dutyErr } = await db
      .from("on_duty_session")
      .select("on_duty_session_id")
      .eq("company_id", company_id)
      .eq("company_member_id", receiver_company_member_id)
      .eq("duty_status", "active")
      .limit(1);

    if (dutyErr) {
      console.error("Error checking on-duty:", dutyErr);
      return c.json(errorResponse("INTERNAL_ERROR", "Database error checking duty status"), 500);
    }
    if (!dutyRows || dutyRows.length === 0) {
      return c.json(
        errorResponse("RECEIVER_NOT_ON_DUTY", "Staff member is not currently on duty."),
        409
      );
    }

    // ── 7) Quota check ─────────────────────────────────────────────
    const { count: usedCount, error: countErr } = await db
      .from("kudos")
      .select("kudos_id", { count: "exact", head: true })
      .eq("stay_id", stay_id)
      .in("kudos_status", ["pending", "confirmed"]);

    if (countErr) {
      console.error("Error counting kudos:", countErr);
      return c.json(errorResponse("INTERNAL_ERROR", "Database error counting kudos"), 500);
    }

    const used = usedCount ?? 0;
    if (used >= quota) {
      return c.json(
        errorResponse("QUOTA_EXCEEDED", "Kudos quota exceeded for this stay.", {
          remaining_quota: 0,
        }),
        409
      );
    }

    // ── 8) Cooldown check ──────────────────────────────────────────
    let nextAvailableAt: string | null = null;

    if (cooldownSec > 0) {
      const { data: lastKudos, error: lastErr } = await db
        .from("kudos")
        .select("created_at")
        .eq("stay_id", stay_id)
        .in("kudos_status", ["pending", "confirmed"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastErr) {
        console.error("Error checking cooldown:", lastErr);
        return c.json(errorResponse("INTERNAL_ERROR", "Database error checking cooldown"), 500);
      }

      if (lastKudos) {
        const lastAt = new Date(lastKudos.created_at);
        const cooldownEnd = new Date(lastAt.getTime() + cooldownSec * 1000);
        nextAvailableAt = cooldownEnd.toISOString();
        if (now < cooldownEnd) {
          return c.json(
            errorResponse("COOLDOWN_ACTIVE", "Please wait before sending another Kudos.", {
              next_available_at: nextAvailableAt,
            }),
            409
          );
        }
      }
    }

    // ── 9) Minimal moderation (MVP rule-based) ─────────────────────
    let moderationDecision = "allow";
    const lowerMsg = message_text.toLowerCase();
    if (lowerMsg.includes("http://") || lowerMsg.includes("https://")) {
      moderationDecision = "review";
    }

    // ── 10) Insert kudos ───────────────────────────────────────────
    const kudosStatus = moderationDecision === "block" ? "rejected" : "pending";

    const { data: newKudos, error: insertErr } = await db
      .from("kudos")
      .insert({
        company_id,
        stay_id,
        receiver_company_member_id,
        category: category.trim(),
        message_text: message_text.trim(),
        message_is_masked: false,
        kudos_status: kudosStatus,
        points_awarded: pointsAward,
        guest_session_id,
        version: 1,
      })
      .select("kudos_id, kudos_status, created_at")
      .single();

    if (insertErr) {
      console.error("Error inserting kudos:", insertErr);
      return c.json(
        errorResponse("INTERNAL_ERROR", "Failed to create Kudos record.", {
          error: insertErr.message,
        }),
        500
      );
    }

    // ── 11) オンチェーン記録キュー投入（Option B — 送信時点） ──────────
    // anchor_hash を今この時点の DB 値から確定的に計算し、chain_receipt を queued で作成。
    // Worker（chain-worker-submit）が ~1 分以内に Avalanche C-Chain に送信する。
    // kudos_status（pending/confirmed/rejected）はチェックアウト時に DB 側で確定するが、
    // チェーン上の記録（存在証明）はここで永久にロックされる。
    try {
      const anchorHash = computeAnchorHash({
        kudos_id: newKudos.kudos_id,
        stay_id,
        company_id,
        receiver_company_member_id,
        category: category.trim(),
        message_text: message_text.trim(),
        points_awarded: pointsAward,
        created_at: newKudos.created_at,
      });

      const receiptNow = new Date().toISOString();
      const { error: receiptErr } = await db.from("chain_receipt").insert({
        kudos_id: newKudos.kudos_id,
        chain_name: "Avalanche C-Chain",
        anchor_hash: anchorHash,
        tx_hash: null,
        points_awarded: pointsAward,
        receipt_status: "queued",
        chain_id: CHAIN_ID,
        contract_address: Deno.env.get("RECEIPT_REGISTRY_ADDRESS") ?? "",
        hash_alg: "keccak256",
        retry_count: 0,
        next_attempt_at: null,
        last_attempt_at: null,
        tx_error: null,
        submitted_at: null,
        confirmed_at: null,
        fail_reason: null,
        version: 1,
        created_at: receiptNow,
        updated_at: receiptNow,
      });

      if (receiptErr) {
        // Non-fatal: Kudos 自体は成功させる。Worker のリトライで回収可能。
        console.error("[public-kudos-send] chain_receipt insert warning:", receiptErr.message);
      } else {
        console.log(`[public-kudos-send] chain_receipt queued: kudos_id=${newKudos.kudos_id} anchor=${anchorHash.slice(0, 10)}...`);
      }
    } catch (hashErr) {
      console.error("[public-kudos-send] anchor_hash computation error (non-fatal):", hashErr);
    }

    // ── 13) Insert moderation record ───────────────────────────────
    const { error: modErr } = await db
      .from("kudos_moderation")
      .insert({
        kudos_id: newKudos.kudos_id,
        moderation_decision: moderationDecision,
        reason_codes: null,
        score_json: null,
        model_name: "mvp-rule",
        reviewed_by_user_id: null,
        reviewed_at: null,
        version: 1,
      });

    if (modErr) {
      // Non-fatal: log but don't fail the request
      console.error("Error inserting kudos_moderation (non-fatal):", modErr);
    }

    // ── 14) Compute remaining quota ────────────────────────────────
    const remainingQuota = Math.max(0, quota - (used + 1));

    console.log(
      `Kudos created: kudos_id=${newKudos.kudos_id}, status=${newKudos.kudos_status}, remaining=${remainingQuota}`
    );

    return c.json(
      {
        kudos_id: newKudos.kudos_id,
        kudos_status: newKudos.kudos_status,
        remaining_quota: remainingQuota,
        cooldown_sec: cooldownSec,
        next_available_at: nextAvailableAt,
      },
      201
    );
  } catch (error) {
    console.error("Unexpected error in public-kudos-send:", error);
    return c.json(
      errorResponse("INTERNAL_ERROR", "Unexpected error occurred", {
        error: error.message,
      }),
      500
    );
  }
});

export default kudos;
