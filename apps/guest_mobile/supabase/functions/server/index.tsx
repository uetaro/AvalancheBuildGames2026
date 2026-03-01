// Heartel API Server - Slim orchestrator
// Routes are split into separate files for maintainability.
import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { ROUTE_PREFIX } from "./_shared.tsx";

// Route modules
import entry from "./routes_entry.tsx";
import staff from "./routes_staff.tsx";
import kudos from "./routes_kudos.tsx";

const app = new Hono();

// Enable logger
app.use("*", logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization", "X-Guest-Session-Token"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get(`${ROUTE_PREFIX}/health`, (c) => {
  return c.json({ status: "ok" });
});

// Mount route modules
app.route(ROUTE_PREFIX, entry);
app.route(ROUTE_PREFIX, staff);
app.route(ROUTE_PREFIX, kudos);

Deno.serve(app.fetch);