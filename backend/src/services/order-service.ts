import { db } from "../db/client"

export interface OrderItem {
  productId: string
  quantity: number
  priceMusd: number
}

export interface CreateOrderInput {
  walletAddress: string
  items: OrderItem[]
  totalMusd: number
  txHash: string
}

export interface Order {
  id: string
  walletAddress: string
  items: OrderItem[]
  totalMusd: number
  txHash: string
  status: "pending" | "confirmed"
  createdAt: string
}

export interface OrderService {
  create(input: CreateOrderInput): Promise<Order>
  list(walletAddress: string): Promise<Order[]>
}

// Row shape returned from SQLite (snake_case columns)
interface OrderRow {
  id: string
  wallet_address: string
  items_json: string
  total_musd: number
  tx_hash: string
  status: string
  created_at: string
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
  }
}

class OrderServiceImpl implements OrderService {
  async create(input: CreateOrderInput): Promise<Order> {
    // Check for existing order with the same txHash (idempotent)
    const existing = db
      .query<OrderRow, [string]>(
        "SELECT * FROM orders WHERE tx_hash = ?"
      )
      .get(input.txHash)

    if (existing) {
      return rowToOrder(existing)
    }

    const id = crypto.randomUUID()
    const createdAt = new Date().toISOString()
    const itemsJson = JSON.stringify(input.items)

    db.query<void, [string, string, string, number, string, string, string]>(
      `INSERT INTO orders (id, wallet_address, items_json, total_musd, tx_hash, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      input.walletAddress,
      itemsJson,
      input.totalMusd,
      input.txHash,
      "pending",
      createdAt
    )

    return {
      id,
      walletAddress: input.walletAddress,
      items: input.items,
      totalMusd: input.totalMusd,
      txHash: input.txHash,
      status: "pending",
      createdAt,
    }
  }

  async list(walletAddress: string): Promise<Order[]> {
    const rows = db
      .query<OrderRow, [string]>(
        "SELECT * FROM orders WHERE wallet_address = ?"
      )
      .all(walletAddress)
    return rows.map(rowToOrder)
  }
}

export const orderService = new OrderServiceImpl()
