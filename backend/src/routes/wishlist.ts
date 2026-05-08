import { Hono } from "hono"
import { walletAuth } from "../middleware/wallet-auth"
import { wishlistService } from "../services/wishlist-service"
import type { WalletAuthVariables } from "../middleware/wallet-auth"

export const wishlistRouter = new Hono<{ Variables: WalletAuthVariables }>()

wishlistRouter.use("*", walletAuth)

// GET / — return all wishlisted product IDs for the authenticated wallet
wishlistRouter.get("/", (c) => {
  const walletAddress = c.get("walletAddress")
  const productIds = wishlistService.list(walletAddress)
  return c.json(productIds, 200)
})

// POST /:productId — add a product to the wishlist
wishlistRouter.post("/:productId", (c) => {
  const walletAddress = c.get("walletAddress")
  const productId = c.req.param("productId")
  wishlistService.add(walletAddress, productId)
  return c.json({ productId, wishlisted: true }, 200)
})

// DELETE /:productId — remove a product from the wishlist
wishlistRouter.delete("/:productId", (c) => {
  const walletAddress = c.get("walletAddress")
  const productId = c.req.param("productId")
  wishlistService.remove(walletAddress, productId)
  return c.json({ productId, wishlisted: false }, 200)
})
