import { Hono } from "hono";
import { walletAuth } from "../middleware/wallet-auth";
import { borrowService } from "../services/borrow-service";
import type { WalletAuthVariables } from "../middleware/wallet-auth";

export const borrowRouter = new Hono<{ Variables: WalletAuthVariables }>();
export const repayRouter = new Hono<{ Variables: WalletAuthVariables }>();

borrowRouter.use("*", walletAuth);
repayRouter.use("*", walletAuth);

// POST /api/borrow/lock — record a BTC lock (deposit) transaction
borrowRouter.post("/lock", async (c) => {
  const walletAddress = c.get("walletAddress");

  let body: { txHash?: unknown; amountBtc?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  if (!body.txHash || typeof body.txHash !== "string") {
    return c.json({ error: "txHash is required" }, 400);
  }
  const amountBtc = Number(body.amountBtc);
  if (isNaN(amountBtc) || amountBtc <= 0) {
    return c.json({ error: "amountBtc must be a positive number" }, 400);
  }

  try {
    borrowService.recordLock(walletAddress, amountBtc, body.txHash);
    return c.json({ recorded: true }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to record lock";
    return c.json({ error: message }, 500);
  }
});

// GET /api/borrow/position — return on-chain position + derived fields
borrowRouter.get("/position", async (c) => {
  const walletAddress = c.get("walletAddress");
  try {
    const position = await borrowService.getPosition(walletAddress);
    return c.json(position, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch position";
    console.error("[borrow] getPosition error:", message);
    return c.json({ error: message }, 500);
  }
});

// GET /api/borrow/history — return transaction history from SQLite
borrowRouter.get("/history", (c) => {
  const walletAddress = c.get("walletAddress");
  try {
    const history = borrowService.getHistory(walletAddress);
    return c.json(history, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch history";
    console.error("[borrow] getHistory error:", message);
    return c.json({ error: message }, 500);
  }
});

// POST /api/borrow — execute a borrow transaction
borrowRouter.post("/", async (c) => {
  const walletAddress = c.get("walletAddress");

  let body: { amount?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const amount = Number(body.amount);
  if (!body.amount || isNaN(amount) || amount <= 0) {
    return c.json({ error: "amount must be a positive number" }, 400);
  }

  try {
    const result = await borrowService.executeBorrow(walletAddress, amount);
    return c.json(result, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Borrow transaction failed";
    console.error("[borrow] executeBorrow error:", message);
    // Return 400 for contract reverts, 500 for infrastructure errors
    const status = message.includes("MezoLending:") ? 400 : 500;
    return c.json({ error: message }, status);
  }
});

// POST /api/repay — execute a repay transaction
repayRouter.post("/", async (c) => {
  const walletAddress = c.get("walletAddress");

  let body: { amount?: unknown };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const amount = Number(body.amount);
  if (!body.amount || isNaN(amount) || amount <= 0) {
    return c.json({ error: "amount must be a positive number" }, 400);
  }

  try {
    const result = await borrowService.executeRepay(walletAddress, amount);
    return c.json(result, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Repay transaction failed";
    console.error("[repay] executeRepay error:", message);
    const status = message.includes("MezoLending:") ? 400 : 500;
    return c.json({ error: message }, status);
  }
});
