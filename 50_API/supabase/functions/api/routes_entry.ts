// Routes for Guest Entry (NFC/QR verification)
import { Hono } from "npm:hono";
import { errorResponse, hashToken, generateOpaqueToken, createServiceClient } from "./_shared.ts";

const entry = new Hono();

// POST /public-entry-verify
// Verify NFC card and create guest session
entry.post("/public-entry-verify", async (c) => {
  try {
    const body = await c.req.json().catch(() => null);
    const { card_public_id, company_public_id, client_request_id } = body ?? {};
    
    if (!card_public_id) {
      return c.json(
        errorResponse(
          "VALIDATION_ERROR",
          "card_public_id is required",
          { client_request_id }
        ),
        400
      );
    }

    const db = createServiceClient();

    // 1) Get card by public id
    const { data: card, error: cardError } = await db
      .from("card")
      .select("card_id, company_id, card_status, card_uid")
      .eq("card_public_id", card_public_id)
      .maybeSingle();

    if (cardError) {
      console.error("Error fetching card:", cardError);
      return c.json(
        errorResponse(
          "INTERNAL_ERROR",
          "Database error while fetching card",
          { client_request_id }
        ),
        500
      );
    }

    if (!card) {
      return c.json(
        errorResponse(
          "CARD_NOT_FOUND",
          "Card not found",
          { client_request_id }
        ),
        404
      );
    }

    if (card.card_status === "revoked") {
      return c.json(
        errorResponse(
          "CARD_REVOKED",
          "Card has been revoked",
          { client_request_id }
        ),
        409
      );
    }

    if (card.card_status !== "active") {
      return c.json(
        errorResponse(
          "CARD_NOT_ACTIVE",
          "Card is not active",
          { client_request_id, status: card.card_status }
        ),
        409
      );
    }

    // 2) Check current room binding
    const { data: binding, error: bindingError } = await db
      .from("card_room_binding")
      .select("room_id, room:room_id(room_code, room_label)")
      .eq("card_id", card.card_id)
      .is("unbound_at", null)
      .maybeSingle();

    if (bindingError) {
      console.error("Error fetching binding:", bindingError);
      return c.json(
        errorResponse(
          "INTERNAL_ERROR",
          "Database error while fetching room binding",
          { client_request_id }
        ),
        500
      );
    }

    if (!binding) {
      return c.json(
        errorResponse(
          "CARD_NOT_BOUND",
          "Card is not bound to a room",
          { client_request_id }
        ),
        409
      );
    }

    // 3) Get active stay
    const { data: stay, error: stayError } = await db
      .from("stay")
      .select("stay_id, checkin_at, rules_snapshot, stay_status")
      .eq("card_id", card.card_id)
      .eq("stay_status", "active")
      .maybeSingle();

    if (stayError) {
      console.error("Error fetching stay:", stayError);
      return c.json(
        errorResponse(
          "INTERNAL_ERROR",
          "Database error while fetching stay",
          { client_request_id }
        ),
        500
      );
    }

    if (!stay) {
      return c.json(
        errorResponse(
          "NO_ACTIVE_STAY",
          "No active stay found for this card",
          { client_request_id }
        ),
        409
      );
    }

    // 4) Get company information
    const { data: company, error: companyError } = await db
      .from("company")
      .select("company_id, company_name, company_status, timezone, company_public_id")
      .eq("company_id", card.company_id)
      .maybeSingle();

    if (companyError) {
      console.error("Error fetching company:", companyError);
      return c.json(
        errorResponse(
          "INTERNAL_ERROR",
          "Database error while fetching company",
          { client_request_id }
        ),
        500
      );
    }

    if (!company) {
      return c.json(
        errorResponse(
          "INTERNAL_ERROR",
          "Company not found",
          { client_request_id }
        ),
        500
      );
    }

    if (company.company_status !== "active") {
      return c.json(
        errorResponse(
          "COMPANY_SUSPENDED",
          "Company is suspended",
          { client_request_id }
        ),
        423
      );
    }

    // Check company_public_id match if provided
    if (company_public_id && company.company_public_id && company_public_id !== company.company_public_id) {
      return c.json(
        errorResponse(
          "COMPANY_MISMATCH",
          "Company public ID mismatch",
          { client_request_id }
        ),
        409
      );
    }

    // 5) Calculate remaining quota
    const quota = stay.rules_snapshot?.kudos_quota ?? 0;
    const { count, error: kudosError } = await db
      .from("kudos")
      .select("kudos_id", { count: "exact", head: true })
      .eq("stay_id", stay.stay_id)
      .in("kudos_status", ["pending", "confirmed"]);

    if (kudosError) {
      console.error("Error counting kudos:", kudosError);
      // Continue with 0 count on error
    }

    const used = count ?? 0;
    const remaining_quota = Math.max(0, quota - used);

    // 6) Create guest session
    const token = generateOpaqueToken();
    const hash = await hashToken(token);

    const ttlMinutes = 30;
    const expires_at = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();

    const { data: guestSession, error: gsError } = await db
      .from("guest_session")
      .insert({
        guest_session_id: crypto.randomUUID(),
        stay_id: stay.stay_id,
        card_id: card.card_id,
        session_token_hash: hash,
        expires_at,
        version: 1
      })
      .select("guest_session_id")
      .single();

    if (gsError) {
      console.error("Error creating guest session:", gsError);
      return c.json(
        errorResponse(
          "INTERNAL_ERROR",
          "Failed to create guest session",
          { client_request_id, error: gsError.message }
        ),
        500
      );
    }

    // 7) Return response
    const room = binding.room ?? {};

    return c.json({
      guest_session_token: token,
      expires_at,
      stay: {
        stay_id: stay.stay_id,
        company_id: company.company_id,
        company_name: company.company_name,
        checkin_at: stay.checkin_at,
        room_code: room.room_code ?? null,
        room_label: room.room_label ?? null,
        card_uid: card.card_uid,
        post_checkout_deadline: null
      },
      rules_snapshot: stay.rules_snapshot,
      remaining_quota
    }, 200);

  } catch (error) {
    console.error("Unexpected error in public-entry-verify:", error);
    return c.json(
      errorResponse(
        "INTERNAL_ERROR",
        "Unexpected error occurred",
        { error: error.message }
      ),
      500
    );
  }
});

export default entry;
