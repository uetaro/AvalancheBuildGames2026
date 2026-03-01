// Card routes: ops-cards, ops-cards-all, ops-update-card-binding
import { Hono } from "npm:hono";
import { authAndAuthorize, ROUTE_PREFIX } from "./_shared.tsx";

const cards = new Hono();

// ─── ops-cards ─────────────────────────────────────────────
// Card list (available cards, excluding those with active stays)
cards.post(`${ROUTE_PREFIX}/ops-cards`, async (c) => {
  try {
    const body = await c.req.json().catch(() => null);
    const { access_token, company_id, status } = body ?? {};

    const auth = await authAndAuthorize(access_token, company_id, "ops-cards");
    if (!auth.ok) {
      return c.json(auth.body, auth.status as any);
    }
    const { svc: supabaseSvc } = auth;

    // Parse status filter (comma-separated, e.g. "active,issued")
    const statusFilter = status ? String(status).split(",").map((s: string) => s.trim()) : ["active", "issued"];

    // Fetch cards
    const { data: cardRows, error: cardErr } = await supabaseSvc
      .from("card")
      .select("card_id, card_uid, card_status, issued_at, created_at")
      .eq("company_id", company_id)
      .in("card_status", statusFilter)
      .order("created_at", { ascending: true });

    if (cardErr) {
      console.log("[ops-cards] Card query error:", cardErr.message);
      return c.json({ error_code: "INTERNAL_ERROR", message: "Failed to fetch cards" }, 500);
    }

    // Exclude cards with active stays
    const { data: activeStays } = await supabaseSvc
      .from("stay")
      .select("card_id")
      .eq("company_id", company_id)
      .eq("stay_status", "active");

    const activeCardIds = new Set((activeStays || []).map((s: any) => s.card_id));

    // Fetch current bindings
    const cardIds = (cardRows || []).map((cd: any) => cd.card_id);
    let bindingMap: Record<string, { room_id: string; room_code: string; room_label: string }> = {};

    if (cardIds.length > 0) {
      const { data: bindings } = await supabaseSvc
        .from("card_room_binding")
        .select("card_id, room_id")
        .eq("company_id", company_id)
        .is("unbound_at", null)
        .in("card_id", cardIds);

      if (bindings && bindings.length > 0) {
        const roomIds = bindings.map((b: any) => b.room_id);
        const { data: roomRows } = await supabaseSvc
          .from("room")
          .select("room_id, room_code, room_label")
          .in("room_id", roomIds);

        const roomMap: Record<string, any> = {};
        for (const r of (roomRows || [])) { roomMap[r.room_id] = r; }

        for (const b of bindings) {
          const room = roomMap[b.room_id];
          if (room) {
            bindingMap[b.card_id] = { room_id: room.room_id, room_code: room.room_code, room_label: room.room_label };
          }
        }
      }
    }

    // Build items (exclude cards with active stays)
    const items = (cardRows || [])
      .filter((cd: any) => !activeCardIds.has(cd.card_id))
      .map((cd: any) => ({
        card_id: cd.card_id,
        card_uid: cd.card_uid,
        card_status: cd.card_status,
        current_room: bindingMap[cd.card_id] || null,
      }));

    console.log("[ops-cards] OK: returned", items.length, "available cards");
    return c.json({ items });
  } catch (e) {
    console.log("[ops-cards] Unexpected error:", e);
    return c.json({ error_code: "INTERNAL_ERROR", message: `Failed: ${e}` }, 500);
  }
});

// ─── ops-cards-all ─────────────────────────────────────────
// Card list (all cards, including those with active stays)
cards.post(`${ROUTE_PREFIX}/ops-cards-all`, async (c) => {
  try {
    const body = await c.req.json().catch(() => null);
    const { access_token, company_id, status } = body ?? {};

    const auth = await authAndAuthorize(access_token, company_id, "ops-cards-all");
    if (!auth.ok) {
      return c.json(auth.body, auth.status as any);
    }
    const { svc: supabaseSvc } = auth;

    // Parse status filter (comma-separated, e.g. "active,issued")
    const statusFilter = status ? String(status).split(",").map((s: string) => s.trim()) : ["active", "issued"];

    // Fetch cards
    const { data: cardRows, error: cardErr } = await supabaseSvc
      .from("card")
      .select("card_id, card_uid, card_status, issued_at, created_at")
      .eq("company_id", company_id)
      .in("card_status", statusFilter)
      .order("created_at", { ascending: true });

    if (cardErr) {
      console.log("[ops-cards-all] Card query error:", cardErr.message);
      return c.json({ error_code: "INTERNAL_ERROR", message: "Failed to fetch cards" }, 500);
    }

    // Fetch current bindings
    const cardIds = (cardRows || []).map((cd: any) => cd.card_id);
    let bindingMap: Record<string, { room_id: string; room_code: string; room_label: string }> = {};

    if (cardIds.length > 0) {
      const { data: bindings } = await supabaseSvc
        .from("card_room_binding")
        .select("card_id, room_id")
        .eq("company_id", company_id)
        .is("unbound_at", null)
        .in("card_id", cardIds);

      if (bindings && bindings.length > 0) {
        const roomIds = bindings.map((b: any) => b.room_id);
        const { data: roomRows } = await supabaseSvc
          .from("room")
          .select("room_id, room_code, room_label")
          .in("room_id", roomIds);

        const roomMap: Record<string, any> = {};
        for (const r of (roomRows || [])) { roomMap[r.room_id] = r; }

        for (const b of bindings) {
          const room = roomMap[b.room_id];
          if (room) {
            bindingMap[b.card_id] = { room_id: room.room_id, room_code: room.room_code, room_label: room.room_label };
          }
        }
      }
    }

    // Build items (include all cards)
    const items = (cardRows || [])
      .map((cd: any) => ({
        card_id: cd.card_id,
        card_uid: cd.card_uid,
        card_status: cd.card_status,
        current_room: bindingMap[cd.card_id] || null,
      }));

    console.log("[ops-cards-all] OK: returned", items.length, "cards");
    return c.json({ items });
  } catch (e) {
    console.log("[ops-cards-all] Unexpected error:", e);
    return c.json({ error_code: "INTERNAL_ERROR", message: `Failed: ${e}` }, 500);
  }
});

// ─── ops-update-card-binding ───────────────────────────────
// Update card-room binding (rebind / unbind)
cards.post(`${ROUTE_PREFIX}/ops-update-card-binding`, async (c) => {
  try {
    const body = await c.req.json().catch(() => null);
    const { access_token, company_id, card_id, room_id } = body ?? {};

    if (!card_id) {
      return c.json({ error_code: "VALIDATION_ERROR", message: "card_id is required" }, 400);
    }

    const auth = await authAndAuthorize(access_token, company_id, "ops-update-card-binding");
    if (!auth.ok) {
      return c.json(auth.body, auth.status as any);
    }
    const { member, svc: supabaseSvc } = auth;

    // Verify card belongs to company
    const { data: card, error: cardErr } = await supabaseSvc
      .from("card")
      .select("card_id, card_status")
      .eq("card_id", card_id)
      .eq("company_id", company_id)
      .maybeSingle();

    if (cardErr || !card) {
      console.log("[ops-update-card-binding] Card not found:", cardErr?.message);
      return c.json({ error_code: "VALIDATION_ERROR", message: "Card not found in this company" }, 400);
    }

    // Check card doesn't have active stay
    const { data: activeStay } = await supabaseSvc
      .from("stay")
      .select("stay_id")
      .eq("card_id", card_id)
      .eq("stay_status", "active")
      .maybeSingle();

    if (activeStay) {
      return c.json({ error_code: "CONFLICT", message: "Cannot change binding while card has an active stay" }, 409);
    }

    // If room_id is provided, verify room belongs to company
    if (room_id) {
      const { data: room, error: roomErr } = await supabaseSvc
        .from("room")
        .select("room_id, is_active")
        .eq("room_id", room_id)
        .eq("company_id", company_id)
        .maybeSingle();

      if (roomErr || !room) {
        return c.json({ error_code: "VALIDATION_ERROR", message: "Room not found in this company" }, 400);
      }
      if (!room.is_active) {
        return c.json({ error_code: "CONFLICT", message: "Room is inactive" }, 409);
      }

      // Check no other card is currently bound to the target room
      const { data: existingBinding } = await supabaseSvc
        .from("card_room_binding")
        .select("card_room_binding_id, card_id")
        .eq("room_id", room_id)
        .eq("company_id", company_id)
        .is("unbound_at", null)
        .maybeSingle();

      if (existingBinding && existingBinding.card_id !== card_id) {
        return c.json({ error_code: "CONFLICT", message: "Another card is already bound to this room" }, 409);
      }
    }

    const now = new Date().toISOString();

    // 1) Unbind current binding (if any)
    const { error: unbindErr } = await supabaseSvc
      .from("card_room_binding")
      .update({ unbound_at: now, updated_by_company_member_id: member.company_member_id })
      .eq("card_id", card_id)
      .eq("company_id", company_id)
      .is("unbound_at", null);

    if (unbindErr) {
      console.log("[ops-update-card-binding] Unbind error:", unbindErr.message);
    }

    // 2) Create new binding if room_id is provided
    let newBinding = null;
    if (room_id) {
      const { data: bindingData, error: bindErr } = await supabaseSvc
        .from("card_room_binding")
        .insert({
          company_id,
          card_id,
          room_id,
          bound_at: now,
          unbound_at: null,
          updated_by_company_member_id: member.company_member_id,
          version: 1,
        })
        .select("card_room_binding_id, card_id, room_id, bound_at")
        .single();

      if (bindErr) {
        console.log("[ops-update-card-binding] Bind error:", bindErr.message);
        return c.json({ error_code: "INTERNAL_ERROR", message: `Failed to create binding: ${bindErr.message}` }, 500);
      }
      newBinding = bindingData;
    }

    console.log("[ops-update-card-binding] OK card:", card_id, "-> room:", room_id || "unbound");
    return c.json({
      status: "ok",
      message: room_id ? "Card bound to room" : "Card unbound",
      binding: newBinding,
    });
  } catch (e) {
    console.log("[ops-update-card-binding] Unexpected error:", e);
    return c.json({ error_code: "INTERNAL_ERROR", message: `Failed: ${e}` }, 500);
  }
});

export default cards;