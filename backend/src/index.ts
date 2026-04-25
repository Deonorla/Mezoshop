import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";

// Load and validate environment variables at startup
import { env } from "./lib/env.ts";

// Route handlers
import { cartRouter } from "./routes/cart";
import { chatRouter } from "./routes/chat";
import { ordersRouter } from "./routes/orders";
import { productsRouter } from "./routes/products";

const app = new Hono();

// --- Middleware ---

// Request logging
app.use("*", logger());

// CORS — restrict to configured frontend origin
app.use(
  "*",
  cors({
    origin: env.FRONTEND_ORIGIN,
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "X-Wallet-Address"],
    exposeHeaders: ["X-Session-Id"],
    credentials: true,
  })
);

// --- Health endpoint ---
app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

// --- API route stubs (wired in subsequent tasks) ---

// Chat
app.route("/api/chat", chatRouter);

// Cart
app.route("/api/cart", cartRouter);

// Products
app.route("/api/products", productsRouter);

// Orders
app.route("/api/orders", ordersRouter);

// --- Start server ---
const port = parseInt(env.PORT, 10);

console.log(`MezoShop backend listening on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
