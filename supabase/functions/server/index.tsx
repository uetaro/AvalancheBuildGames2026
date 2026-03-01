// Heartel API Server — Slim orchestrator
// Routes are split into separate files for maintainability.
import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { ROUTE_PREFIX } from "./_shared.tsx";

// Route modules
import stays from "./routes_stays.tsx";
import rooms from "./routes_rooms.tsx";
import cards from "./routes_cards.tsx";
import seed from "./routes_seed.tsx";
import auth from "./routes_auth.tsx";
import affiliation from "./routes_affiliation.tsx";
import analyticsRoutes from "./routes_analytics.tsx";

const app = new Hono();

// Enable logger
app.use("*", logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check
app.get(`${ROUTE_PREFIX}/health`, (c) => {
  return c.json({ status: "ok" });
});

// Mount route modules
// Hono sub-app routes are mounted by adding all routes from each module
app.route("/", stays);   // /ops-checkin, /ops-checkout
app.route("/", rooms);   // /ops-rooms
app.route("/", cards);   // /ops-cards, /ops-cards-all, /ops-update-card-binding
app.route("/", seed);    // /seed
app.route("/", auth);    // /signup, /check-membership, /ops-members
app.route("/", affiliation); // /ops-affiliation-requests, /ops-affiliation-requests-decide
app.route("/", analyticsRoutes); // /ops-analytics

Deno.serve(app.fetch);