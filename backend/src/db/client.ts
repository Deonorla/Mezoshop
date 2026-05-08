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

  CREATE TABLE IF NOT EXISTS users (
    wallet_address TEXT PRIMARY KEY,
    aesthetic      TEXT,
    shop_for       TEXT,
    size           TEXT,
    full_name      TEXT,
    phone          TEXT,
    address_line   TEXT,
    city           TEXT,
    country        TEXT,
    onboarded      INTEGER NOT NULL DEFAULT 0,
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS wishlists (
    id             TEXT PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    product_id     TEXT NOT NULL,
    added_at       TEXT NOT NULL,
    UNIQUE(wallet_address, product_id)
  );

  CREATE INDEX IF NOT EXISTS idx_wishlists_wallet ON wishlists(wallet_address);

  CREATE TABLE IF NOT EXISTS chat_sessions (
    session_id     TEXT PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    messages_json  TEXT NOT NULL DEFAULT '[]',
    created_at     TEXT NOT NULL,
    updated_at     TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_chat_wallet ON chat_sessions(wallet_address);

  CREATE TABLE IF NOT EXISTS lending_transactions (
    id TEXT PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    type TEXT NOT NULL,
    amount_musd REAL NOT NULL,
    tx_hash TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'confirmed',
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_lending_wallet ON lending_transactions(wallet_address);
`)

export { db }
