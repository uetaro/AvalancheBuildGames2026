// Heartel Unified API — single Supabase Edge Function
// Consolidates all routes from staff_web, staff_mobile, guest_mobile.
import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";

// ── Route modules ────────────────────────────────────────────────────────────
// Ops (staff_web) — hotel operations
import stays from "./routes_stays.ts";
import rooms from "./routes_rooms.ts";
import cards from "./routes_cards.ts";
import auth from "./routes_auth.ts";
import affiliationOps from "./routes_affiliation_ops.ts";
import analytics from "./routes_analytics.ts";
import seed from "./routes_seed.ts";

// Staff (staff_mobile) — employee self-service
import work from "./routes_work.ts";
import affiliationReq from "./routes_affiliation_req.ts";
import kudosStaff from "./routes_kudos_staff.ts";
import profileRoutes from "./routes_profile.ts";

// Guest (guest_mobile) — guest-facing
import entry from "./routes_entry.ts";
import kudosGuest from "./routes_kudos_guest.ts";
import staffList from "./routes_staff_list.ts";

// On-chain Worker — pg_cron から呼ばれるブロックチェーン非同期処理
import chainWorker from "./routes_chain_worker.ts";

// ── App setup ────────────────────────────────────────────────────────────────
const app = new Hono();

app.use("*", logger(console.log));
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "apikey", "x-user-token", "X-Guest-Session-Token"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// ── Health check ─────────────────────────────────────────────────────────────
app.get("/api/health", (c) => c.json({ status: "ok" }));

// ── Ops routes — staff_web 由来 ──────────────────────────────────────────────
// Supabase は関数名 "api" をパスに含めるため /api/* でマウントする
// 各ルートファイルは内部で /make-server-20781d19/... を定義している
const opsApp = new Hono();
opsApp.route("/", stays);           // POST /make-server-20781d19/ops-checkin, ops-checkout
opsApp.route("/", rooms);           // POST /make-server-20781d19/ops-rooms
opsApp.route("/", cards);           // POST /make-server-20781d19/ops-cards, ops-cards-all, ops-update-card-binding
opsApp.route("/", auth);            // POST /make-server-20781d19/signup, check-membership, ops-members
opsApp.route("/", affiliationOps);  // POST /make-server-20781d19/ops-affiliation-requests, ops-affiliation-requests-decide
opsApp.route("/", analytics);       // POST /make-server-20781d19/ops-analytics
opsApp.route("/", seed);            // POST /make-server-20781d19/seed

app.route("/api", opsApp);

// ── Staff routes — staff_mobile 由来 ─────────────────────────────────────────
const staffApp = new Hono();
staffApp.route("/", work);           // POST /work-tap, GET /work-tags, GET /work-status
staffApp.route("/", affiliationReq); // GET /company-search, POST /affiliation-request, etc.
staffApp.route("/", kudosStaff);     // GET /my-kudos, GET /my-kudos/:id
staffApp.route("/", profileRoutes);  // GET/PUT /my-profile, POST/DELETE /my-profile/avatar

app.route("/api/make-server-c253248c", staffApp);

// ── Guest routes — guest_mobile 由来 ─────────────────────────────────────────
const guestApp = new Hono();
guestApp.route("/", entry);      // POST /public-entry-verify
guestApp.route("/", kudosGuest); // POST /public-kudos-send
guestApp.route("/", staffList);  // GET /public-staff-list

app.route("/api/make-server-14a1e5b0", guestApp);

// ── On-chain Worker routes ─────────────────────────────────────────────────
// POST /api/chain-worker-submit  — queued レシートを Avalanche に送信
// POST /api/chain-worker-confirm — submitted Tx の完了を確認
// 認証: Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>（pg_cron が付与）
app.route("/api", chainWorker);

// ── Serve ─────────────────────────────────────────────────────────────────────
Deno.serve(app.fetch);
