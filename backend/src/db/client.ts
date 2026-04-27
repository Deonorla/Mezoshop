import { Database } from "bun:sqlite"

const db = new Database("mezoshop.db")

// Run schema migrations on startup
db.exec(`
  CREATE TABLE IF NOT EXISTS cart_items (
    id TEXT PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    product_id TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    size TEXT,
    color TEXT,
    added_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_cart_wallet ON cart_items(wallet_address);

  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    items_json TEXT NOT NULL,
    total_musd REAL NOT NULL,
    tx_hash TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_orders_wallet ON orders(wallet_address);
`)

export { db }
