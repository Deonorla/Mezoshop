import { db } from "../db/client"

interface WishlistRow {
  id: string
  wallet_address: string
  product_id: string
  added_at: string
}

class WishlistService {
  /** Returns all product IDs in the wallet's wishlist */
  list(walletAddress: string): string[] {
    const rows = db
      .query<WishlistRow, [string]>(
        "SELECT * FROM wishlists WHERE wallet_address = ? ORDER BY added_at DESC"
      )
      .all(walletAddress)
    return rows.map((r) => r.product_id)
  }

  /** Adds a product to the wishlist. Silently ignores duplicates. */
  add(walletAddress: string, productId: string): void {
    const id = crypto.randomUUID()
    const addedAt = new Date().toISOString()
    db.query<void, [string, string, string, string]>(
      `INSERT OR IGNORE INTO wishlists (id, wallet_address, product_id, added_at)
       VALUES (?, ?, ?, ?)`
    ).run(id, walletAddress, productId, addedAt)
  }

  /** Removes a product from the wishlist. No-op if not present. */
  remove(walletAddress: string, productId: string): void {
    db.query<void, [string, string]>(
      "DELETE FROM wishlists WHERE wallet_address = ? AND product_id = ?"
    ).run(walletAddress, productId)
  }

  /** Returns true if the product is in the wallet's wishlist */
  has(walletAddress: string, productId: string): boolean {
    const row = db
      .query<WishlistRow, [string, string]>(
        "SELECT id FROM wishlists WHERE wallet_address = ? AND product_id = ?"
      )
      .get(walletAddress, productId)
    return row !== null
  }
}

export const wishlistService = new WishlistService()
