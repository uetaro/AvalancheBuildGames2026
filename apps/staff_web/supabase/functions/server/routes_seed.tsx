// Seed data route
// NOTE: Fixed UUIDs here are TEST FIXTURES for idempotent seeding only.
// No other file should reference these values. Production code must
// discover company_id dynamically via check-membership.
import { Hono } from "npm:hono";
import postgres from "npm:postgres";
import { createServiceClient, ROUTE_PREFIX } from "./_shared.tsx";

const seed = new Hono();

/**
 * Ensure the company_member_request table exists.
 * Uses raw SQL via SUPABASE_DB_URL because supabase-js cannot run DDL.
 */
async function ensureTables() {
  const dbUrl = Deno.env.get("SUPABASE_DB_URL");
  if (!dbUrl) {
    console.log("[seed] SUPABASE_DB_URL not set — skipping DDL");
    return;
  }
  const sql = postgres(dbUrl, { max: 1 });
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS company_member_request (
        company_member_request_id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
        company_id uuid NOT NULL REFERENCES company (company_id),
        user_id uuid NOT NULL REFERENCES "user" (user_id),
        requested_role text NOT NULL DEFAULT 'employee',
        request_status text NOT NULL DEFAULT 'pending',
        request_note text,
        review_note text,
        reviewed_by_company_member_id uuid REFERENCES company_member (company_member_id),
        reviewed_at timestamptz,
        version integer NOT NULL DEFAULT 1,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    // Index for listing by company + status
    await sql`
      CREATE INDEX IF NOT EXISTS idx_cmr_company_status
        ON company_member_request (company_id, request_status, created_at DESC)
    `;
    console.log("[seed] ensureTables: company_member_request OK");
  } catch (e) {
    console.log("[seed] ensureTables error (may be benign):", e);
  } finally {
    await sql.end();
  }
}

// ─── Helper: deterministic UUID generator for seed ─────────
function seedUUID(prefix: string, index: number): string {
  const hex = index.toString(16).padStart(12, "0");
  return `${prefix}-0000-0000-0000-${hex}`;
}

// ─── Helper: generate date N days ago at a random hour ─────
function daysAgo(days: number, hourOffset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(8 + hourOffset, Math.floor(hourOffset * 17) % 60, 0, 0);
  return d.toISOString();
}

// ─── seed ──────────────────────────────────────────────────
// POST /make-server-20781d19/seed
// Creates minimum seed data for check-in flow (idempotent via upsert)
seed.post(`${ROUTE_PREFIX}/seed`, async (c) => {
  try {
    // Ensure required tables exist before seeding
    await ensureTables();

    const supabaseSvc = createServiceClient();

    // ── Test fixture UUIDs (used ONLY for idempotent upsert) ──
    const COMPANY_ID = "10000000-0000-0000-0000-000000000001";
    const USER_ID = "20000000-0000-0000-0000-000000000001";
    const MEMBER_ID = "30000000-0000-0000-0000-000000000001";

    const ROOMS = [
      { room_id: "a0000000-0000-0000-0000-000000000001", room_code: "201", room_label: "Room 201" },
      { room_id: "a0000000-0000-0000-0000-000000000002", room_code: "202", room_label: "Room 202" },
      { room_id: "a0000000-0000-0000-0000-000000000003", room_code: "203", room_label: "Room 203" },
      { room_id: "a0000000-0000-0000-0000-000000000004", room_code: "301", room_label: "Room 301" },
      { room_id: "a0000000-0000-0000-0000-000000000005", room_code: "302", room_label: "Room 302" },
      { room_id: "a0000000-0000-0000-0000-000000000006", room_code: "303", room_label: "Room 303" },
      { room_id: "a0000000-0000-0000-0000-000000000007", room_code: "401", room_label: "Room 401" },
      { room_id: "a0000000-0000-0000-0000-000000000008", room_code: "402", room_label: "Room 402" },
      { room_id: "a0000000-0000-0000-0000-000000000009", room_code: "403", room_label: "Room 403" },
    ];

    const CARDS = [
      { card_id: "b0000000-0000-0000-0000-000000000001", card_uid: "4532-8821-9043", card_status: "active" },
      { card_id: "b0000000-0000-0000-0000-000000000002", card_uid: "4532-1156-7732", card_status: "active" },
      { card_id: "b0000000-0000-0000-0000-000000000003", card_uid: "4532-9944-2381", card_status: "active" },
      { card_id: "b0000000-0000-0000-0000-000000000004", card_uid: "4532-6677-4429", card_status: "active" },
    ];

    // Card -> Room bindings (each card is pre-bound to a vacant room)
    const BINDINGS = [
      { card_room_binding_id: "c0000000-0000-0000-0000-000000000001", card_id: CARDS[0].card_id, room_id: ROOMS[1].room_id },
      { card_room_binding_id: "c0000000-0000-0000-0000-000000000002", card_id: CARDS[1].card_id, room_id: ROOMS[2].room_id },
      { card_room_binding_id: "c0000000-0000-0000-0000-000000000003", card_id: CARDS[2].card_id, room_id: ROOMS[4].room_id },
      { card_room_binding_id: "c0000000-0000-0000-0000-000000000004", card_id: CARDS[3].card_id, room_id: ROOMS[6].room_id },
    ];

    // ── Additional staff members for analytics ──
    const EXTRA_STAFF = [
      { user_id: seedUUID("f0000001", 1), member_id: seedUUID("30000000", 2), name: "Yuki Tanaka", email: "y.tanaka@heartel.example.com", job_title: "Front Desk", role: "staff" },
      { user_id: seedUUID("f0000002", 1), member_id: seedUUID("30000000", 3), name: "Sakura Kimura", email: "s.kimura@heartel.example.com", job_title: "Restaurant", role: "staff" },
      { user_id: seedUUID("f0000003", 1), member_id: seedUUID("30000000", 4), name: "Mei Chen", email: "m.chen@heartel.example.com", job_title: "Concierge", role: "staff" },
      { user_id: seedUUID("f0000004", 1), member_id: seedUUID("30000000", 5), name: "Hiroshi Sato", email: "h.sato@heartel.example.com", job_title: "Housekeeping", role: "staff" },
      { user_id: seedUUID("f0000005", 1), member_id: seedUUID("30000000", 6), name: "Akiko Yamada", email: "a.yamada@heartel.example.com", job_title: "Restaurant", role: "staff" },
      { user_id: seedUUID("f0000006", 1), member_id: seedUUID("30000000", 7), name: "Ryu Nakamura", email: "r.nakamura@heartel.example.com", job_title: "Front Desk", role: "staff" },
    ];

    // All member IDs (original + extra)
    const ALL_MEMBER_IDS = [MEMBER_ID, ...EXTRA_STAFF.map(s => s.member_id)];

    // Test users for affiliation requests (no company_member — pending approval)
    const REQUEST_USERS = [
      { user_id: "d0000000-0000-0000-0000-000000000001", email: "tanaka@heartel.example.com", display_name: "Taro Tanaka" },
      { user_id: "d0000000-0000-0000-0000-000000000002", email: "sato@heartel.example.com", display_name: "Hanako Sato" },
      { user_id: "d0000000-0000-0000-0000-000000000003", email: "yamamoto@heartel.example.com", display_name: "Yuki Yamamoto" },
    ];

    const AFFILIATION_REQUESTS = [
      {
        company_member_request_id: "e0000000-0000-0000-0000-000000000001",
        company_id: COMPANY_ID,
        user_id: REQUEST_USERS[0].user_id,
        requested_role: "employee",
        request_status: "pending",
        request_note: "Front Desk / employee id: 12345",
      },
      {
        company_member_request_id: "e0000000-0000-0000-0000-000000000002",
        company_id: COMPANY_ID,
        user_id: REQUEST_USERS[1].user_id,
        requested_role: "manager",
        request_status: "pending",
        request_note: "Requesting manager access for team oversight responsibilities.",
      },
      {
        company_member_request_id: "e0000000-0000-0000-0000-000000000003",
        company_id: COMPANY_ID,
        user_id: REQUEST_USERS[2].user_id,
        requested_role: "employee",
        request_status: "pending",
        request_note: "Housekeeping staff, starting next week.",
      },
    ];

    // ── Generate stays (60 stays over last 30 days) ──
    const KUDOS_CATEGORIES = ["Service", "Cleanliness", "Dining", "Amenities", "Communication", "Friendliness"];
    const GUEST_NAMES = [
      "Sarah Johnson", "Michael Chen", "Emma Wilson", "David Lee", "Sophie Martin",
      "James Brown", "Olivia Taylor", "Liam Anderson", "Isabella Garcia", "Noah Martinez",
      "Ava Robinson", "Lucas Clark", "Mia Lewis", "Ethan Walker", "Charlotte Hall",
      "Mason Young", "Amelia King", "Logan Wright", "Harper Scott", "Alexander Green",
    ];
    const KUDOS_MESSAGES: Record<string, string[]> = {
      "Service": [
        "Exceptional check-in experience! Made us feel welcome immediately.",
        "Handled our late check-in with grace and efficiency. Much appreciated!",
        "Went above and beyond to accommodate our special requests.",
        "Quick and professional response to our room change request.",
        "Outstanding luggage assistance and warm greeting upon arrival.",
        "Seamless checkout process, the fastest I've ever experienced.",
      ],
      "Cleanliness": [
        "Room was spotless and everything worked perfectly. Outstanding!",
        "Immaculate room every single day of our stay.",
        "The attention to cleanliness detail is remarkable.",
        "Spotless bathroom and fresh linens every day. Perfection!",
        "Cleanest hotel room I have ever stayed in.",
      ],
      "Dining": [
        "Best restaurant service I've experienced. Impeccable attention to detail!",
        "The dinner service was amazing. Great wine pairing suggestions!",
        "Breakfast buffet was incredible. So many fresh options!",
        "Chef's special recommendation was absolutely divine.",
        "Room service arrived hot and perfectly presented.",
        "The afternoon tea experience was unforgettable.",
      ],
      "Amenities": [
        "The spa facilities are world-class. We'll definitely return!",
        "Pool area was beautifully maintained and never crowded.",
        "Gym equipment was top-notch and the space was immaculate.",
        "Love the complimentary welcome amenities in the room.",
        "The rooftop bar atmosphere is simply breathtaking.",
      ],
      "Communication": [
        "Excellent local recommendations and cultural insights. Thank you!",
        "Staff spoke multiple languages fluently. Very impressive!",
        "Clear and helpful information about local attractions.",
        "Follow-up communication after our request was prompt and thorough.",
        "Proactive communication about the schedule change was appreciated.",
      ],
      "Friendliness": [
        "Every staff member greeted us with genuine warmth.",
        "The team made our anniversary celebration truly special.",
        "Children were treated like VIPs. Our family felt so welcomed!",
        "Personal touches like remembering our names made all the difference.",
        "Staff went out of their way to make us feel at home.",
        "Such a friendly and approachable team throughout our entire stay.",
      ],
    };

    const STAYS: any[] = [];
    const KUDOS_ENTRIES: any[] = [];

    // Generate 60 stays spread over 30 days
    for (let i = 0; i < 60; i++) {
      const stayId = seedUUID("55000000", i + 1);
      const dayOffset = Math.floor(i / 2); // ~2 stays per day
      const roomIdx = i % ROOMS.length;
      const cardIdx = i % CARDS.length;
      const checkinDate = daysAgo(30 - dayOffset, (i % 8));
      const isCompleted = dayOffset < 28; // last 2 days stays still active
      const checkoutDate = isCompleted ? daysAgo(30 - dayOffset - 1, (i % 6) + 2) : null;
      const createdByIdx = i % ALL_MEMBER_IDS.length;

      STAYS.push({
        stay_id: stayId,
        company_id: COMPANY_ID,
        room_id: ROOMS[roomIdx].room_id,
        card_id: CARDS[cardIdx].card_id,
        stay_status: isCompleted ? "completed" : "active",
        checkin_at: checkinDate,
        checkout_at: checkoutDate,
        rules_snapshot: { max_cards: 1, allow_reentry: true },
        created_by_company_member_id: ALL_MEMBER_IDS[createdByIdx],
        version: 1,
      });

      // Generate 1-4 kudos per stay
      const kudosCount = 1 + (i % 4);
      for (let k = 0; k < kudosCount; k++) {
        const kudosId = seedUUID("66000000", i * 4 + k + 1);
        const catIdx = (i + k) % KUDOS_CATEGORIES.length;
        const category = KUDOS_CATEGORIES[catIdx];
        const receiverIdx = (i + k) % ALL_MEMBER_IDS.length;
        const guestIdx = (i + k * 3) % GUEST_NAMES.length;
        const messages = KUDOS_MESSAGES[category];
        const msgIdx = (i + k) % messages.length;
        // points: 8-15 based on position
        const points = 8 + ((i + k) % 8);

        KUDOS_ENTRIES.push({
          kudos_id: kudosId,
          company_id: COMPANY_ID,
          stay_id: stayId,
          receiver_company_member_id: ALL_MEMBER_IDS[receiverIdx],
          category,
          message_text: messages[msgIdx],
          message_is_masked: false,
          kudos_status: "confirmed",
          points_awarded: points,
          confirmed_at: checkinDate,
          guest_name: GUEST_NAMES[guestIdx], // will be stored in detail for display
          version: 1,
          created_at: checkinDate,
        });
      }
    }

    const errors: string[] = [];

    // 1) Company
    console.log("[seed] Upserting company...");
    const { error: companyErr } = await supabaseSvc
      .from("company")
      .upsert({
        company_id: COMPANY_ID,
        company_name: "Heartel Grand Hotel",
        company_slug: "heartel-grand",
        company_country: "Japan",
        company_country_code: "JP",
        company_region: "Tokyo",
        company_city: "Minato-ku",
        timezone: "Asia/Tokyo",
        company_status: "active",
        version: 1,
      }, { onConflict: "company_id" });
    if (companyErr) errors.push(`company: ${companyErr.message}`);

    // 2) Original User
    console.log("[seed] Upserting user...");
    const { error: userErr } = await supabaseSvc
      .from("user")
      .upsert({
        user_id: USER_ID,
        cognito_sub: "seed-staff-user-placeholder",
        email: "staff@heartel.example.com",
        display_name: "Heartel Staff",
        user_type: "company_member",
        version: 1,
      }, { onConflict: "user_id" });
    if (userErr) errors.push(`user: ${userErr.message}`);

    // 3) Original Company Member (manager for analytics access)
    console.log("[seed] Upserting company_member...");
    const { error: memberErr } = await supabaseSvc
      .from("company_member")
      .upsert({
        company_member_id: MEMBER_ID,
        company_id: COMPANY_ID,
        user_id: USER_ID,
        member_role: "manager",
        member_status: "active",
        job_title: "General Manager",
        visibility_scope: "company",
        version: 1,
      }, { onConflict: "company_member_id" });
    if (memberErr) errors.push(`company_member: ${memberErr.message}`);

    // 3b) Extra staff users + company_members
    console.log("[seed] Upserting extra staff...");
    for (const staff of EXTRA_STAFF) {
      const { error: uErr } = await supabaseSvc
        .from("user")
        .upsert({
          user_id: staff.user_id,
          cognito_sub: `seed-staff-${staff.user_id}`,
          email: staff.email,
          display_name: staff.name,
          user_type: "company_member",
          version: 1,
        }, { onConflict: "user_id" });
      if (uErr) errors.push(`user ${staff.name}: ${uErr.message}`);

      const { error: mErr } = await supabaseSvc
        .from("company_member")
        .upsert({
          company_member_id: staff.member_id,
          company_id: COMPANY_ID,
          user_id: staff.user_id,
          member_role: staff.role,
          member_status: "active",
          job_title: staff.job_title,
          visibility_scope: "company",
          version: 1,
        }, { onConflict: "company_member_id" });
      if (mErr) errors.push(`member ${staff.name}: ${mErr.message}`);
    }

    // 4) Rooms
    console.log("[seed] Upserting rooms...");
    for (const room of ROOMS) {
      const { error: roomErr } = await supabaseSvc
        .from("room")
        .upsert({
          room_id: room.room_id,
          company_id: COMPANY_ID,
          room_code: room.room_code,
          room_label: room.room_label,
          is_active: true,
          version: 1,
        }, { onConflict: "room_id" });
      if (roomErr) errors.push(`room ${room.room_code}: ${roomErr.message}`);
    }

    // 5) Cards
    console.log("[seed] Upserting cards...");
    for (const card of CARDS) {
      const { error: cardErr } = await supabaseSvc
        .from("card")
        .upsert({
          card_id: card.card_id,
          company_id: COMPANY_ID,
          card_uid: card.card_uid,
          card_status: card.card_status,
          issued_at: new Date().toISOString(),
          version: 1,
        }, { onConflict: "card_id" });
      if (cardErr) errors.push(`card ${card.card_uid}: ${cardErr.message}`);
    }

    // 6) Card-Room Bindings
    console.log("[seed] Upserting card_room_bindings...");
    for (const binding of BINDINGS) {
      const { error: bindErr } = await supabaseSvc
        .from("card_room_binding")
        .upsert({
          card_room_binding_id: binding.card_room_binding_id,
          company_id: COMPANY_ID,
          card_id: binding.card_id,
          room_id: binding.room_id,
          bound_at: new Date().toISOString(),
          unbound_at: null,
          version: 1,
        }, { onConflict: "card_room_binding_id" });
      if (bindErr) errors.push(`binding ${binding.card_room_binding_id}: ${bindErr.message}`);
    }

    // 7) Users for affiliation requests
    console.log("[seed] Upserting request users...");
    for (const ru of REQUEST_USERS) {
      const { error: ruErr } = await supabaseSvc
        .from("user")
        .upsert({
          user_id: ru.user_id,
          cognito_sub: `seed-request-user-${ru.user_id}`,
          email: ru.email,
          display_name: ru.display_name,
          user_type: "company_member",
          version: 1,
        }, { onConflict: "user_id" });
      if (ruErr) errors.push(`request_user ${ru.display_name}: ${ruErr.message}`);
    }

    // 8) Affiliation Requests
    console.log("[seed] Upserting affiliation_requests...");
    for (const request of AFFILIATION_REQUESTS) {
      const { error: requestErr } = await supabaseSvc
        .from("company_member_request")
        .upsert({
          company_member_request_id: request.company_member_request_id,
          company_id: request.company_id,
          user_id: request.user_id,
          requested_role: request.requested_role,
          request_status: request.request_status,
          request_note: request.request_note,
          version: 1,
        }, { onConflict: "company_member_request_id" });
      if (requestErr) errors.push(`request ${request.company_member_request_id}: ${requestErr.message}`);
    }

    // 9) Stays (60 stays over 30 days)
    console.log("[seed] Upserting stays...", STAYS.length, "records");
    for (const stay of STAYS) {
      const { error: stayErr } = await supabaseSvc
        .from("stay")
        .upsert(stay, { onConflict: "stay_id" });
      if (stayErr) errors.push(`stay ${stay.stay_id}: ${stayErr.message}`);
    }

    // 10) Kudos (150+ entries)
    console.log("[seed] Upserting kudos...", KUDOS_ENTRIES.length, "records");
    for (const kudos of KUDOS_ENTRIES) {
      // Remove guest_name from the insert (not a DB column); store as metadata if needed
      const { guest_name, ...kudosRow } = kudos;
      const { error: kudosErr } = await supabaseSvc
        .from("kudos")
        .upsert(kudosRow, { onConflict: "kudos_id" });
      if (kudosErr) errors.push(`kudos ${kudos.kudos_id}: ${kudosErr.message}`);
    }

    if (errors.length > 0) {
      console.log("[seed] Completed with errors:", errors);
      return c.json({ status: "partial", errors, message: "Some inserts failed" }, 207);
    }

    console.log("[seed] All seed data created successfully");
    return c.json({
      status: "ok",
      message: "Seed data created successfully",
      data: {
        company_id: COMPANY_ID,
        user_id: USER_ID,
        company_member_id: MEMBER_ID,
        rooms: ROOMS.length,
        cards: CARDS.length,
        bindings: BINDINGS.length,
        extra_staff: EXTRA_STAFF.length,
        stays: STAYS.length,
        kudos: KUDOS_ENTRIES.length,
        affiliation_requests: AFFILIATION_REQUESTS.length,
      },
    });
  } catch (e) {
    console.log("[seed] Unexpected error:", e);
    return c.json({ error_code: "INTERNAL_ERROR", message: `Seed failed: ${e}` }, 500);
  }
});

export default seed;
