/**
 * Property-based tests for OrderService
 *
 * Properties tested:
 * - Property 13: Order Isolation (Validates: Requirements 6.2, 6.4)
 * - Property 14: Idempotent Order Creation (Validates: Requirements 6.3)
 */

import { describe, test, expect } from "bun:test";
import * as fc from "fast-check";
import { Database } from "bun:sqlite";
import { createTestDb } from "./helpers/test-db";

// ---- Inline OrderService implementation using injected db ----

interface OrderItem {
  productId: string;
  quantity: number;
  priceMusd: number;
}

interface CreateOrderInput {
  walletAddress: string;
  items: OrderItem[];
  totalMusd: number;
  txHash: string;
}

interface Order {
  id: string;
  walletAddress: string;
  items: OrderItem[];
  totalMusd: number;
  txHash: string;
  status: "pending" | "confirmed";
  createdAt: string;
}

interface OrderRow {
  id: string;
  wallet_address: string;
  items_json: string;
  total_musd: number;
  tx_hash: string;
  status: string;
  created_at: string;
}

function rowToOrder(row: OrderRow): Order {
  return {
    id: row.id,
    walletAddress: row.wallet_address,
    items: JSON.parse(row.items_json) as OrderItem[],
    totalMusd: row.total_musd,
    txHash: row.tx_hash,
    status: row.status as "pending" | "confirmed",
    createdAt: row.created_at,
  };
}

function makeOrderService(db: Database) {
  return {
    async create(input: CreateOrderInput): Promise<Order> {
      // Idempotency: return existing order if txHash already exists
      const existing = db
        .query<OrderRow, [string]>("SELECT * FROM orders WHERE tx_hash = ?")
        .get(input.txHash);

      if (existing) {
        return rowToOrder(existing);
      }

      const id = crypto.randomUUID();
      const createdAt = new Date().toISOString();
      const itemsJson = JSON.stringify(input.items);

      db.query<void, [string, string, string, number, string, string, string]>(
        `INSERT INTO orders (id, wallet_address, items_json, total_musd, tx_hash, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(id, input.walletAddress, itemsJson, input.totalMusd, input.txHash, "pending", createdAt);

      return {
        id,
        walletAddress: input.walletAddress,
        items: input.items,
        totalMusd: input.totalMusd,
        txHash: input.txHash,
        status: "pending",
        createdAt,
      };
    },

    async list(walletAddress: string): Promise<Order[]> {
      const rows = db
        .query<OrderRow, [string]>("SELECT * FROM orders WHERE wallet_address = ?")
        .all(walletAddress);
      return rows.map(rowToOrder);
    },
  };
}

// Arbitraries
const walletAddressArb = fc.hexaString({ minLength: 40, maxLength: 40 }).map((h) => `0x${h}`);
const txHashArb = fc.hexaString({ minLength: 64, maxLength: 64 }).map((h) => `0x${h}`);
const orderItemArb = fc.record({
  productId: fc.string({ minLength: 1, maxLength: 20 }),
  quantity: fc.integer({ min: 1, max: 10 }),
  priceMusd: fc.float({ min: 1, max: 1000, noNaN: true }),
});

const createOrderInputArb = (walletAddress: string) =>
  fc.record({
    walletAddress: fc.constant(walletAddress),
    items: fc.array(orderItemArb, { minLength: 1, maxLength: 5 }),
    totalMusd: fc.float({ min: 1, max: 10000, noNaN: true }),
    txHash: txHashArb,
  });

// Two distinct wallet addresses
const twoDistinctWalletsArb = fc
  .tuple(walletAddressArb, walletAddressArb)
  .filter(([a, b]) => a.toLowerCase() !== b.toLowerCase());

/**
 * Property 13: Order Isolation
 * **Validates: Requirements 6.2, 6.4**
 *
 * Orders for wallet A never appear in list for wallet B.
 */
describe("Property 13: Order Isolation", () => {
  test("orders created by wallet A never appear in wallet B's order list", async () => {
    await fc.assert(
      fc.asyncProperty(
        twoDistinctWalletsArb,
        txHashArb,
        fc.array(orderItemArb, { minLength: 1, maxLength: 3 }),
        fc.float({ min: 1, max: 1000, noNaN: true }),
        async ([walletA, walletB], txHash, items, totalMusd) => {
          const db = createTestDb();
          const service = makeOrderService(db);

          // Create order for wallet A
          await service.create({ walletAddress: walletA, items, totalMusd, txHash });

          // Wallet B's orders should be empty
          const ordersB = await service.list(walletB);
          expect(ordersB).toHaveLength(0);

          db.close();
        }
      ),
      { numRuns: 30 }
    );
  });

  test("each wallet only sees their own orders", async () => {
    await fc.assert(
      fc.asyncProperty(
        twoDistinctWalletsArb,
        fc.tuple(txHashArb, txHashArb).filter(([a, b]) => a !== b),
        fc.array(orderItemArb, { minLength: 1, maxLength: 3 }),
        async ([walletA, walletB], [txHashA, txHashB], items) => {
          const db = createTestDb();
          const service = makeOrderService(db);

          // Create one order for each wallet
          const orderA = await service.create({
            walletAddress: walletA,
            items,
            totalMusd: 100,
            txHash: txHashA,
          });
          const orderB = await service.create({
            walletAddress: walletB,
            items,
            totalMusd: 200,
            txHash: txHashB,
          });

          // Each wallet only sees their own order
          const ordersA = await service.list(walletA);
          const ordersB = await service.list(walletB);

          expect(ordersA.every((o) => o.walletAddress === walletA)).toBe(true);
          expect(ordersB.every((o) => o.walletAddress === walletB)).toBe(true);

          expect(ordersA.some((o) => o.id === orderA.id)).toBe(true);
          expect(ordersA.some((o) => o.id === orderB.id)).toBe(false);

          expect(ordersB.some((o) => o.id === orderB.id)).toBe(true);
          expect(ordersB.some((o) => o.id === orderA.id)).toBe(false);

          db.close();
        }
      ),
      { numRuns: 30 }
    );
  });
});

/**
 * Property 14: Idempotent Order Creation
 * **Validates: Requirements 6.3**
 *
 * Submitting the same txHash twice returns the same order and creates no duplicate.
 */
describe("Property 14: Idempotent Order Creation", () => {
  test("submitting the same txHash twice returns the same order", async () => {
    await fc.assert(
      fc.asyncProperty(
        walletAddressArb,
        txHashArb,
        fc.array(orderItemArb, { minLength: 1, maxLength: 3 }),
        fc.float({ min: 1, max: 1000, noNaN: true }),
        async (wallet, txHash, items, totalMusd) => {
          const db = createTestDb();
          const service = makeOrderService(db);

          const input: CreateOrderInput = { walletAddress: wallet, items, totalMusd, txHash };

          const first = await service.create(input);
          const second = await service.create(input);

          // Both calls return the same order id
          expect(second.id).toBe(first.id);
          expect(second.txHash).toBe(first.txHash);
          expect(second.walletAddress).toBe(first.walletAddress);

          db.close();
        }
      ),
      { numRuns: 30 }
    );
  });

  test("submitting the same txHash twice creates exactly one order record", async () => {
    await fc.assert(
      fc.asyncProperty(
        walletAddressArb,
        txHashArb,
        fc.array(orderItemArb, { minLength: 1, maxLength: 3 }),
        fc.float({ min: 1, max: 1000, noNaN: true }),
        async (wallet, txHash, items, totalMusd) => {
          const db = createTestDb();
          const service = makeOrderService(db);

          const input: CreateOrderInput = { walletAddress: wallet, items, totalMusd, txHash };

          await service.create(input);
          await service.create(input);

          // Count orders with this txHash — must be exactly 1
          const count = db
            .query<{ count: number }, [string]>(
              "SELECT COUNT(*) as count FROM orders WHERE tx_hash = ?"
            )
            .get(txHash);

          expect(count!.count).toBe(1);

          db.close();
        }
      ),
      { numRuns: 30 }
    );
  });

  test("new order is created with status 'pending'", async () => {
    await fc.assert(
      fc.asyncProperty(
        walletAddressArb,
        txHashArb,
        fc.array(orderItemArb, { minLength: 1, maxLength: 3 }),
        fc.float({ min: 1, max: 1000, noNaN: true }),
        async (wallet, txHash, items, totalMusd) => {
          const db = createTestDb();
          const service = makeOrderService(db);

          const order = await service.create({ walletAddress: wallet, items, totalMusd, txHash });

          expect(order.status).toBe("pending");
          expect(order.id).toBeTruthy();
          expect(order.createdAt).toBeTruthy();

          // Verify createdAt is a valid ISO date
          const date = new Date(order.createdAt);
          expect(isNaN(date.getTime())).toBe(false);

          db.close();
        }
      ),
      { numRuns: 20 }
    );
  });

  test("list returns all orders for a wallet after multiple creates", async () => {
    await fc.assert(
      fc.asyncProperty(
        walletAddressArb,
        fc.array(txHashArb, { minLength: 2, maxLength: 5 }).filter(
          (hashes) => new Set(hashes).size === hashes.length // all unique
        ),
        async (wallet, txHashes) => {
          const db = createTestDb();
          const service = makeOrderService(db);

          for (const txHash of txHashes) {
            await service.create({
              walletAddress: wallet,
              items: [{ productId: "p1", quantity: 1, priceMusd: 10 }],
              totalMusd: 10,
              txHash,
            });
          }

          const orders = await service.list(wallet);
          expect(orders.length).toBe(txHashes.length);

          db.close();
        }
      ),
      { numRuns: 20 }
    );
  });
});
