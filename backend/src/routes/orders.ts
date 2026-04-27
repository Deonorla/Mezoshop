import { Hono } from "hono"
import { walletAuth } from "../middleware/wallet-auth"
import { orderService } from "../services/order-service"
import type { WalletAuthVariables } from "../middleware/wallet-auth"
import type { OrderItem } from "../services/order-service"

export const ordersRouter = new Hono<{ Variables: WalletAuthVariables }>()

// Apply wallet auth middleware to all order routes
ordersRouter.use("*", walletAuth)

// GET / — list orders for the authenticated wallet
ordersRouter.get("/", async (c) => {
  const walletAddress = c.get("walletAddress")
  const orders = await orderService.list(walletAddress)
  return c.json(orders, 200)
})

// POST / — create a new order after MUSD transfer
ordersRouter.post("/", async (c) => {
  const walletAddress = c.get("walletAddress")
  const body = await c.req.json<{
    items: OrderItem[]
    totalMusd: number
    txHash: string
  }>()
  const order = await orderService.create({
    walletAddress,
    items: body.items,
    totalMusd: body.totalMusd,
    txHash: body.txHash,
  })
  return c.json(order, 201)
})
