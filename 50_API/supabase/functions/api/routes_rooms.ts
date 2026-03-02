// Room list route: ops-rooms
import { Hono } from "npm:hono";
import { authAndAuthorize, ROUTE_PREFIX } from "./_shared.ts";

const rooms = new Hono();

// ─── ops-rooms ─────────────────────────────────────────────
// DD-OPS-ROOM-LIST v1.0 — Room list with active stay info
rooms.post(`${ROUTE_PREFIX}/ops-rooms`, async (c) => {
  try {
    const body = await c.req.json().catch(() => null);
    const { access_token, company_id, include_inactive } = body ?? {};

    const auth = await authAndAuthorize(access_token, company_id, "ops-rooms");
    if (!auth.ok) {
      return c.json(auth.body, auth.status as any);
    }
    const { svc: supabaseSvc } = auth;

    // Fetch rooms
    let roomQuery = supabaseSvc
      .from("room")
      .select("room_id, room_code, room_label, is_active, created_at")
      .eq("company_id", company_id)
      .order("room_code", { ascending: true });

    if (!include_inactive) {
      roomQuery = roomQuery.eq("is_active", true);
    }

    const { data: roomRows, error: roomErr } = await roomQuery;
    if (roomErr) {
      console.log("[ops-rooms] Room query error:", roomErr.message);
      return c.json({ error_code: "INTERNAL_ERROR", message: "Failed to fetch rooms" }, 500);
    }

    // Fetch active stays for these rooms
    const { data: activeStays, error: stayErr } = await supabaseSvc
      .from("stay")
      .select("stay_id, room_id, card_id, stay_status, checkin_at")
      .eq("company_id", company_id)
      .eq("stay_status", "active");

    if (stayErr) {
      console.log("[ops-rooms] Stay query error:", stayErr.message);
    }

    // Fetch card UIDs for active stays
    const stayCardIds = (activeStays || []).map((s: any) => s.card_id);
    let cardMap: Record<string, string> = {};
    if (stayCardIds.length > 0) {
      const { data: cards } = await supabaseSvc
        .from("card")
        .select("card_id, card_uid")
        .in("card_id", stayCardIds);
      if (cards) {
        for (const card of cards) {
          cardMap[card.card_id] = card.card_uid;
        }
      }
    }

    // Merge stay info into rooms
    const stayByRoom: Record<string, any> = {};
    for (const stay of (activeStays || [])) {
      stayByRoom[stay.room_id] = stay;
    }

    const items = (roomRows || []).map((room: any) => {
      const stay = stayByRoom[room.room_id];
      return {
        room_id: room.room_id,
        room_code: room.room_code,
        room_label: room.room_label,
        is_active: room.is_active,
        created_at: room.created_at,
        active_stay: stay ? {
          stay_id: stay.stay_id,
          card_id: stay.card_id,
          card_uid: cardMap[stay.card_id] || null,
          checkin_at: stay.checkin_at,
        } : null,
      };
    });

    console.log("[ops-rooms] OK: returned", items.length, "rooms");
    return c.json({ items });
  } catch (e) {
    console.log("[ops-rooms] Unexpected error:", e);
    return c.json({ error_code: "INTERNAL_ERROR", message: `Failed: ${e}` }, 500);
  }
});

export default rooms;
