import { db } from "../db/client"

export interface CartItem {
  id: string
  walletAddress: string
  productId: string
  quantity: number
  size?: string
  color?: string
  addedAt: string
}

export interface AddCartItemInput {
  productId: string
  quantity: number
  size?: string
  color?: string
}

export interface CartService {
  list(walletAddress: string): Promise<CartItem[]>
  add(walletAddress: string, item: AddCartItemInput): Promise<CartItem>
  remove(walletAddress: string, itemId: string): Promise<void>
  clear(walletAddress: string): Promise<void>
}

// Row shape returned from SQLite (snake_case columns)
interface CartItemRow {
  id: string
  wallet_address: string
  product_id: string
  quantity: number
  size: string | null
  color: string | null
  added_at: string
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
  }
}

class CartServiceImpl implements CartService {
  async list(walletAddress: string): Promise<CartItem[]> {
    const rows = db
      .query<CartItemRow, [string]>(
        "SELECT * FROM cart_items WHERE wallet_address = ?"
      )
      .all(walletAddress)
    return rows.map(rowToCartItem)
  }

  async add(walletAddress: string, item: AddCartItemInput): Promise<CartItem> {
    const id = crypto.randomUUID()
    const addedAt = new Date().toISOString()

    db.query<void, [string, string, string, number, string | null, string | null, string]>(
      `INSERT INTO cart_items (id, wallet_address, product_id, quantity, size, color, added_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      walletAddress,
      item.productId,
      item.quantity,
      item.size ?? null,
      item.color ?? null,
      addedAt
    )

    return {
      id,
      walletAddress,
      productId: item.productId,
      quantity: item.quantity,
      size: item.size,
      color: item.color,
      addedAt,
    }
  }

  async remove(walletAddress: string, itemId: string): Promise<void> {
    db.query<void, [string, string]>(
      "DELETE FROM cart_items WHERE id = ? AND wallet_address = ?"
    ).run(itemId, walletAddress)
  }

  async clear(walletAddress: string): Promise<void> {
    db.query<void, [string]>(
      "DELETE FROM cart_items WHERE wallet_address = ?"
    ).run(walletAddress)
  }
}

export const cartService = new CartServiceImpl()
