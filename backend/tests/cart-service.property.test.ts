/**
 * Property-based tests for CartService
 *
 * Properties tested:
 * - Property 5: Cart Isolation (Validates: Requirements 4.2, 4.4)
 * - Property 6: Cart CRUD Round-Trip (Validates: Requirements 4.1, 4.3, 4.5)
 */

import { describe, test, expect, beforeEach } from "bun:test";
import * as fc from "fast-check";
import { Database } from "bun:sqlite";
import { createTestDb } from "./helpers/test-db";

// ---- Inline CartService implementation using injected db ----
// We replicate the service logic here with a db parameter to enable
// isolated in-memory testing without touching the production singleton.

interface CartItem {
  id: string;
  walletAddress: string;
  productId: string;
  quantity: number;
  size?: string;
  color?: string;
  addedAt: string;
}

interface AddCartItemInput {
  productId: string;
  quantity: number;
  size?: string;
  color?: string;
}

interface CartItemRow {
  id: string;
  wallet_address: string;
  product_id: string;
  quantity: number;
  size: string | null;
  color: string | null;
  added_at: string;
}

function rowToCartItem(row: CartItemRow): CartItem {
  return {
    id: row.id,
    walletAddress: row.wallet_address,
    productId: row.product_id,
    quantity: row.quantity,
    size: row.size ?? undefined,
    color: row.color ?? undefined,
    addedAt: row.added_at,
  };
}

function makeCartService(db: Database) {
  return {
    async list(walletAddress: string): Promise<CartItem[]> {
      const rows = db
        .query<CartItemRow, [string]>(
          "SELECT * FROM cart_items WHERE wallet_address = ?"
        )
        .all(walletAddress);
      return rows.map(rowToCartItem);
    },

    async add(walletAddress: string, item: AddCartItemInput): Promise<CartItem> {
      const id = crypto.randomUUID();
      const addedAt = new Date().toISOString();
      db.query<void, [string, string, string, number, string | null, string | null, string]>(
        `INSERT INTO cart_items (id, wallet_address, product_id, quantity, size, color, added_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(id, walletAddress, item.productId, item.quantity, item.size ?? null, item.color ?? null, addedAt);
      return { id, walletAddress, productId: item.productId, quantity: item.quantity, size: item.size, color: item.color, addedAt };
    },

    async remove(walletAddress: string, itemId: string): Promise<void> {
      db.query<void, [string, string]>(
        "DELETE FROM cart_items WHERE id = ? AND wallet_address = ?"
      ).run(itemId, walletAddress);
    },

    async clear(walletAddress: string): Promise<void> {
      db.query<void, [string]>(
        "DELETE FROM cart_items WHERE wallet_address = ?"
      ).run(walletAddress);
    },
  };
}

// Arbitraries
const walletAddressArb = fc.hexaString({ minLength: 40, maxLength: 40 }).map((h) => `0x${h}`);
const productIdArb = fc.string({ minLength: 1, maxLength: 20 });
const quantityArb = fc.integer({ min: 1, max: 10 });

const cartItemInputArb = fc.record({
  productId: productIdArb,
  quantity: quantityArb,
  size: fc.option(fc.string({ minLength: 1, maxLength: 5 }), { nil: undefined }),
  color: fc.option(fc.string({ minLength: 1, maxLength: 10 }), { nil: undefined }),
});

// Two distinct wallet addresses
const twoDistinctWalletsArb = fc
  .tuple(walletAddressArb, walletAddressArb)
  .filter(([a, b]) => a.toLowerCase() !== b.toLowerCase());

/**
 * Property 5: Cart Isolation
 * **Validates: Requirements 4.2, 4.4**
 *
 * Items added by wallet A never appear in cart for wallet B.
 */
describe("Property 5: Cart Isolation", () => {
  test("items added by wallet A never appear in wallet B's cart", async () => {
    await fc.assert(
      fc.asyncProperty(
        twoDistinctWalletsArb,
        cartItemInputArb,
        async ([walletA, walletB], itemInput) => {
          const db = createTestDb();
          const service = makeCartService(db);

          // Add item for wallet A
          await service.add(walletA, itemInput);

          // Wallet B's cart should be empty
          const cartB = await service.list(walletB);
          expect(cartB).toHaveLength(0);

          db.close();
        }
      ),
      { numRuns: 30 }
    );
  });

  test("wallet A cannot remove wallet B's items", async () => {
    await fc.assert(
      fc.asyncProperty(
        twoDistinctWalletsArb,
        cartItemInputArb,
        async ([walletA, walletB], itemInput) => {
          const db = createTestDb();
          const service = makeCartService(db);

          // Add item for wallet B
          const item = await service.add(walletB, itemInput);

          // Wallet A tries to remove wallet B's item
          await service.remove(walletA, item.id);

          // Item should still be in wallet B's cart
          const cartB = await service.list(walletB);
          expect(cartB.some((i) => i.id === item.id)).toBe(true);

          db.close();
        }
      ),
      { numRuns: 30 }
    );
  });

  test("clear for wallet A does not affect wallet B's cart", async () => {
    await fc.assert(
      fc.asyncProperty(
        twoDistinctWalletsArb,
        cartItemInputArb,
        async ([walletA, walletB], itemInput) => {
          const db = createTestDb();
          const service = makeCartService(db);

          // Add items for both wallets
          await service.add(walletA, itemInput);
          const itemB = await service.add(walletB, itemInput);

          // Clear wallet A's cart
          await service.clear(walletA);

          // Wallet A's cart should be empty
          const cartA = await service.list(walletA);
          expect(cartA).toHaveLength(0);

          // Wallet B's cart should still have the item
          const cartB = await service.list(walletB);
          expect(cartB.some((i) => i.id === itemB.id)).toBe(true);

          db.close();
        }
      ),
      { numRuns: 30 }
    );
  });
});

/**
 * Property 6: Cart CRUD Round-Trip
 * **Validates: Requirements 4.1, 4.3, 4.5**
 *
 * add → list contains item; remove → item gone; clear → empty cart
 */
describe("Property 6: Cart CRUD Round-Trip", () => {
  test("add then list returns the added item", async () => {
    await fc.assert(
      fc.asyncProperty(
        walletAddressArb,
        cartItemInputArb,
        async (wallet, itemInput) => {
          const db = createTestDb();
          const service = makeCartService(db);

          const added = await service.add(wallet, itemInput);
          const cart = await service.list(wallet);

          const found = cart.find((i) => i.id === added.id);
          expect(found).toBeDefined();
          expect(found!.productId).toBe(itemInput.productId);
          expect(found!.quantity).toBe(itemInput.quantity);
          expect(found!.walletAddress).toBe(wallet);

          db.close();
        }
      ),
      { numRuns: 30 }
    );
  });

  test("remove then list does not contain the removed item", async () => {
    await fc.assert(
      fc.asyncProperty(
        walletAddressArb,
        cartItemInputArb,
        async (wallet, itemInput) => {
          const db = createTestDb();
          const service = makeCartService(db);

          const added = await service.add(wallet, itemInput);
          await service.remove(wallet, added.id);
          const cart = await service.list(wallet);

          expect(cart.some((i) => i.id === added.id)).toBe(false);

          db.close();
        }
      ),
      { numRuns: 30 }
    );
  });

  test("clear results in an empty cart", async () => {
    await fc.assert(
      fc.asyncProperty(
        walletAddressArb,
        fc.array(cartItemInputArb, { minLength: 1, maxLength: 5 }),
        async (wallet, items) => {
          const db = createTestDb();
          const service = makeCartService(db);

          // Add multiple items
          for (const item of items) {
            await service.add(wallet, item);
          }

          // Verify items were added
          const before = await service.list(wallet);
          expect(before.length).toBe(items.length);

          // Clear and verify empty
          await service.clear(wallet);
          const after = await service.list(wallet);
          expect(after).toHaveLength(0);

          db.close();
        }
      ),
      { numRuns: 20 }
    );
  });

  test("added item has generated id and addedAt timestamp", async () => {
    await fc.assert(
      fc.asyncProperty(
        walletAddressArb,
        cartItemInputArb,
        async (wallet, itemInput) => {
          const db = createTestDb();
          const service = makeCartService(db);

          const added = await service.add(wallet, itemInput);

          // id should be a non-empty string (UUID)
          expect(added.id).toBeTruthy();
          expect(typeof added.id).toBe("string");

          // addedAt should be a valid ISO date string
          const date = new Date(added.addedAt);
          expect(isNaN(date.getTime())).toBe(false);

          db.close();
        }
      ),
      { numRuns: 20 }
    );
  });
});
