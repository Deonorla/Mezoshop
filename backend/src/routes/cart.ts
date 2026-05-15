import { Hono } from "hono"
import { walletAuth } from "../middleware/wallet-auth"
import { cartService } from "../services/cart-service"
import type { WalletAuthVariables } from "../middleware/wallet-auth"

export const cartRouter = new Hono<{ Variables: WalletAuthVariables }>()

// Apply wallet auth middleware to all cart routes
cartRouter.use("*", walletAuth)

// GET / — list cart items for the authenticated wallet
cartRouter.get("/", async (c) => {
  const walletAddress = c.get("walletAddress")
  const items = await cartService.list(walletAddress)
  return c.json(items, 200)
})

// POST / — add an item to the cart
cartRouter.post("/", async (c) => {
  const walletAddress = c.get("walletAddress")
  const body = await c.req.json<{
    productId: string
    quantity: number
    size?: string
    color?: string
  }>()
  const item = await cartService.add(walletAddress, {
    productId: body.productId,
    quantity: body.quantity,
    size: body.size,
    color: body.color,
  })
  return c.json(item, 201)
})

// DELETE / — clear all cart items for the authenticated wallet
cartRouter.delete("/", async (c) => {
  const walletAddress = c.get("walletAddress")
  await cartService.clear(walletAddress)
  return new Response(null, { status: 204 })
})

// DELETE /:itemId — remove an item from the cart
cartRouter.delete("/:itemId", async (c) => {
  const walletAddress = c.get("walletAddress")
  const itemId = c.req.param("itemId")
  await cartService.remove(walletAddress, itemId)
  return new Response(null, { status: 204 })
})
