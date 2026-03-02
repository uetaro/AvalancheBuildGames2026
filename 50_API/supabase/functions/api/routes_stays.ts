// Stay lifecycle routes: ops-checkin, ops-checkout
import { Hono } from "npm:hono";
import { authAndAuthorize, createServiceClient, ROUTE_PREFIX } from "./_shared.ts";

const stays = new Hono();

// ─── ops-checkin ───────────────────────────────────────────
// DD-OPS-CHECKIN v1.3 — Check-in API
stays.post(`${ROUTE_PREFIX}/ops-checkin`, async (c) => {
  let clientRequestId: string | undefined;

  try {
    const body = await c.req.json().catch(() => null);
    const { access_token, company_id, room_id, card_id, checkin_at, client_request_id } = body ?? {};
    clientRequestId = client_request_id;

    // Auth + Authz
    const auth = await authAndAuthorize(access_token, company_id, "ops-checkin");
    if (!auth.ok) {
      return c.json({ ...auth.body, details: { client_request_id: clientRequestId } }, auth.status as any);
    }
    const { member, svc: supabaseSvc } = auth;

    console.log("[ops-checkin] Request:", { auth_user_id: auth.userId, company_id, room_id, card_id, client_request_id: clientRequestId });

    if (!room_id || !card_id) {
      return c.json(
        { error_code: "VALIDATION_ERROR", message: "Missing required fields: room_id, card_id", details: { client_request_id: clientRequestId } },
        400,
      );
    }

    // 4) Validate room belongs to company and is active
    const { data: room, error: roomErr } = await supabaseSvc
      .from("room")
      .select("room_id, is_active")
      .eq("room_id", room_id)
      .eq("company_id", company_id)
      .maybeSingle();

    if (roomErr || !room) {
      console.log("[ops-checkin] Room not found:", roomErr?.message);
      return c.json(
        { error_code: "VALIDATION_ERROR", message: "Room not found in this company", details: { client_request_id: clientRequestId } },
        400,
      );
    }
    if (!room.is_active) {
      return c.json(
        { error_code: "VALIDATION_ERROR", message: "Room is inactive", details: { client_request_id: clientRequestId } },
        400,
      );
    }

    // 5) Validate card belongs to company and is not revoked
    const { data: card, error: cardErr } = await supabaseSvc
      .from("card")
      .select("card_id, card_status")
      .eq("card_id", card_id)
      .eq("company_id", company_id)
      .maybeSingle();

    if (cardErr || !card) {
      console.log("[ops-checkin] Card not found:", cardErr?.message);
      return c.json(
        { error_code: "VALIDATION_ERROR", message: "Card not found in this company", details: { client_request_id: clientRequestId } },
        400,
      );
    }
    if (card.card_status === "revoked") {
      return c.json(
        { error_code: "VALIDATION_ERROR", message: "Card is revoked", details: { client_request_id: clientRequestId } },
        400,
      );
    }

    // 6) Validate card_room_binding exists
    const { data: binding, error: bindErr } = await supabaseSvc
      .from("card_room_binding")
      .select("card_room_binding_id")
      .eq("card_id", card_id)
      .eq("room_id", room_id)
      .eq("company_id", company_id)
      .is("unbound_at", null)
      .maybeSingle();

    if (bindErr || !binding) {
      console.log("[ops-checkin] No active binding for card->room:", bindErr?.message);
      return c.json(
        { error_code: "VALIDATION_ERROR", message: "Card is not bound to this room", details: { client_request_id: clientRequestId } },
        400,
      );
    }

    // 7) Double check-in prevention
    const { data: existingRoomStay } = await supabaseSvc
      .from("stay")
      .select("stay_id")
      .eq("room_id", room_id)
      .eq("stay_status", "active")
      .maybeSingle();

    if (existingRoomStay) {
      return c.json(
        { error_code: "CONFLICT", message: "Room already has an active stay", details: { client_request_id: clientRequestId } },
        409,
      );
    }

    const { data: existingCardStay } = await supabaseSvc
      .from("stay")
      .select("stay_id")
      .eq("card_id", card_id)
      .eq("stay_status", "active")
      .maybeSingle();

    if (existingCardStay) {
      return c.json(
        { error_code: "CONFLICT", message: "Card already has an active stay", details: { client_request_id: clientRequestId } },
        409,
      );
    }

    // 8) Build rules_snapshot (MVP fixed values)
    const rulesSnapshot = {
      kudos_quota: 3,
      cooldown_sec: 600,
      post_checkout_window_sec: 3600,
      points_award: 100,
    };

    const checkinTime = checkin_at || new Date().toISOString();

    // 9) Insert stay record
    const { data: newStay, error: stayErr } = await supabaseSvc
      .from("stay")
      .insert({
        company_id,
        room_id,
        card_id,
        stay_status: "active",
        checkin_at: checkinTime,
        rules_snapshot: rulesSnapshot,
        created_by_company_member_id: member.company_member_id,
        version: 1,
      })
      .select("stay_id, checkin_at, rules_snapshot")
      .single();

    if (stayErr || !newStay) {
      console.log("[ops-checkin] Stay insert error:", stayErr?.message);
      return c.json(
        { error_code: "INTERNAL_ERROR", message: `Failed to create stay: ${stayErr?.message}`, details: { client_request_id: clientRequestId } },
        500,
      );
    }

    // 10) Audit log
    const { error: auditErr } = await supabaseSvc
      .from("audit_log")
      .insert({
        actor_company_member_id: member.company_member_id,
        company_id,
        action: "CHECKIN",
        target_table: "stay",
        target_id: newStay.stay_id,
        detail_json: { room_id, card_id, checkin_at: checkinTime, client_request_id: clientRequestId },
        version: 1,
      });

    if (auditErr) {
      console.log("[ops-checkin] Audit log insert warning (non-fatal):", auditErr.message);
    }

    console.log("[ops-checkin] Success: stay_id=", newStay.stay_id);

    return c.json({
      stay_id: newStay.stay_id,
      stay_status: "active",
      checkin_at: newStay.checkin_at,
      rules_snapshot: newStay.rules_snapshot,
    });
  } catch (e) {
    console.log("[ops-checkin] Unexpected error:", e);
    return c.json(
      { error_code: "INTERNAL_ERROR", message: "Unexpected server error", details: { client_request_id: clientRequestId } },
      500,
    );
  }
});

// ─── ops-checkout ──────────────────────────────────────────
// DD-OPS-CHECKOUT v1.0 — Check-out API
// Closes stay, finalizes Kudos (confirmed/rejected), queues chain_receipt
stays.post(`${ROUTE_PREFIX}/ops-checkout`, async (c) => {
  let clientRequestId: string | undefined;

  try {
    const body = await c.req.json().catch(() => null);
    const { access_token, company_id, stay_id, room_id, checkout_at, client_request_id } = body ?? {};
    clientRequestId = client_request_id;

    // Auth + Authz
    const auth = await authAndAuthorize(access_token, company_id, "ops-checkout");
    if (!auth.ok) {
      return c.json({ ...auth.body, details: { client_request_id: clientRequestId } }, auth.status as any);
    }
    const { member, svc: supabaseSvc } = auth;

    if (!stay_id && !room_id) {
      return c.json(
        { error_code: "VALIDATION_ERROR", message: "stay_id or room_id is required", details: { client_request_id: clientRequestId } },
        400,
      );
    }

    // 3) Find stay — by stay_id (preferred) or room_id (fallback)
    let stayQuery = supabaseSvc
      .from("stay")
      .select("stay_id, card_id, room_id, checkin_at, stay_status")
      .eq("company_id", company_id);

    if (stay_id) {
      stayQuery = stayQuery.eq("stay_id", stay_id);
    } else {
      stayQuery = stayQuery.eq("room_id", room_id).eq("stay_status", "active");
    }

    const { data: targetStay, error: stayErr } = await stayQuery.maybeSingle();

    if (stayErr) {
      console.log("[ops-checkout] Stay query error:", stayErr.message);
      return c.json(
        { error_code: "INTERNAL_ERROR", message: "Failed to find stay", details: { client_request_id: clientRequestId } },
        500,
      );
    }

    if (!targetStay) {
      return c.json(
        { error_code: "NOT_FOUND", message: "Stay not found", details: { stay_id, room_id, client_request_id: clientRequestId } },
        404,
      );
    }

    // 4) Validate stay status
    if (targetStay.stay_status === "closed") {
      return c.json(
        { error_code: "CONFLICT_ALREADY_CLOSED", message: "Stay already closed.", details: { stay_id: targetStay.stay_id, client_request_id: clientRequestId } },
        409,
      );
    }
    if (targetStay.stay_status !== "active") {
      return c.json(
        { error_code: "CONFLICT_STAY_NOT_ACTIVE", message: "Stay is not active.", details: { stay_id: targetStay.stay_id, client_request_id: clientRequestId } },
        409,
      );
    }

    const now = checkout_at || new Date().toISOString();

    // 5) Validate checkout_at >= checkin_at
    if (new Date(now) < new Date(targetStay.checkin_at)) {
      return c.json(
        { error_code: "VALIDATION_ERROR", message: "checkout_at cannot be before checkin_at", details: { client_request_id: clientRequestId } },
        400,
      );
    }

    // 6) Close stay
    const { data: closedStay, error: updateErr } = await supabaseSvc
      .from("stay")
      .update({
        stay_status: "closed",
        checkout_at: now,
        closed_by_company_member_id: member.company_member_id,
        updated_at: now,
      })
      .eq("stay_id", targetStay.stay_id)
      .eq("stay_status", "active")
      .select("stay_id, checkout_at")
      .single();

    if (updateErr || !closedStay) {
      console.log("[ops-checkout] Update error:", updateErr?.message);
      return c.json(
        { error_code: "INTERNAL_ERROR", message: `Failed to close stay: ${updateErr?.message}`, details: { client_request_id: clientRequestId } },
        500,
      );
    }

    // 7) Finalize Kudos for this stay
    let confirmedCount = 0;
    let rejectedCount = 0;
    let queuedReceiptCount = 0;

    // 7a) Reject blocked kudos (pending + moderation_decision='block')
    const { data: blockedKudos } = await supabaseSvc
      .from("kudos_moderation")
      .select("kudos_id")
      .eq("moderation_decision", "block");

    const blockedKudosIds = (blockedKudos || []).map((bk: any) => bk.kudos_id);

    if (blockedKudosIds.length > 0) {
      const { data: rejectedRows, error: rejectErr } = await supabaseSvc
        .from("kudos")
        .update({ kudos_status: "rejected", updated_at: now })
        .eq("stay_id", targetStay.stay_id)
        .eq("kudos_status", "pending")
        .in("kudos_id", blockedKudosIds)
        .select("kudos_id");

      if (rejectErr) {
        console.log("[ops-checkout] Kudos reject warning:", rejectErr.message);
      }
      rejectedCount = rejectedRows?.length || 0;
    }

    // 7b) Confirm remaining pending kudos
    const { data: confirmedRows, error: confirmErr } = await supabaseSvc
      .from("kudos")
      .update({ kudos_status: "confirmed", updated_at: now })
      .eq("stay_id", targetStay.stay_id)
      .eq("kudos_status", "pending")
      .select("kudos_id, points_awarded, company_id, receiver_company_member_id, category, created_at");

    if (confirmErr) {
      console.log("[ops-checkout] Kudos confirm warning:", confirmErr.message);
    }
    confirmedCount = confirmedRows?.length || 0;

    // 8) Create chain_receipt for confirmed kudos
    // TODO: Blockchain — MVP queues receipts; actual on-chain anchoring is deferred.
    // When blockchain integration is implemented:
    //   - Compute anchor_hash = sha256(kudos_id:company_id:stay_id:receiver:category:points:created_at)
    //   - A background job will pick up queued receipts and write to chain (e.g. Avalanche C-Chain)
    //   - After tx confirmation, update receipt_status='confirmed' with tx_hash
    if (confirmedRows && confirmedRows.length > 0) {
      const receipts = confirmedRows.map((k: any) => ({
        kudos_id: k.kudos_id,
        chain_name: "Avalanche C-Chain",
        anchor_hash: `TODO_sha256_${k.kudos_id}`, // TODO: Blockchain — compute real sha256 hash
        tx_hash: null,
        points_awarded: k.points_awarded || 0,
        receipt_status: "queued",
        submitted_at: null,
        confirmed_at: null,
        fail_reason: null,
        version: 1,
        created_at: now,
        updated_at: now,
      }));

      const { data: insertedReceipts, error: receiptErr } = await supabaseSvc
        .from("chain_receipt")
        .upsert(receipts, { onConflict: "kudos_id", ignoreDuplicates: true })
        .select("chain_receipt_id");

      if (receiptErr) {
        // Non-fatal: chain_receipt table may not exist in MVP seed
        console.log("[ops-checkout] chain_receipt insert warning (non-fatal):", receiptErr.message);
      } else {
        queuedReceiptCount = insertedReceipts?.length || 0;
      }
    }

    // 9) Audit log
    const { error: auditErr } = await supabaseSvc
      .from("audit_log")
      .insert({
        actor_company_member_id: member.company_member_id,
        company_id,
        action: "CHECKOUT",
        target_table: "stay",
        target_id: closedStay.stay_id,
        detail_json: {
          room_id: targetStay.room_id,
          card_id: targetStay.card_id,
          checkout_at: now,
          confirmed_count: confirmedCount,
          rejected_count: rejectedCount,
          queued_receipt_count: queuedReceiptCount,
          client_request_id: clientRequestId,
        },
        version: 1,
      });

    if (auditErr) {
      console.log("[ops-checkout] Audit log warning (non-fatal):", auditErr.message);
    }

    console.log("[ops-checkout] Success: stay_id=", closedStay.stay_id,
      "confirmed=", confirmedCount, "rejected=", rejectedCount, "queued=", queuedReceiptCount);

    return c.json({
      stay_id: closedStay.stay_id,
      stay_status: "closed",
      checkout_at: closedStay.checkout_at,
      finalized: {
        confirmed_count: confirmedCount,
        rejected_count: rejectedCount,
        queued_receipt_count: queuedReceiptCount,
      },
    });
  } catch (e) {
    console.log("[ops-checkout] Unexpected error:", e);
    return c.json(
      { error_code: "INTERNAL_ERROR", message: "Unexpected server error", details: { client_request_id: clientRequestId } },
      500,
    );
  }
});

export default stays;
