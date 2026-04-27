import type { MiddlewareHandler } from "hono"
import { isAddress } from "viem"

export type WalletAuthVariables = {
  walletAddress: string
}

export const walletAuth: MiddlewareHandler<{ Variables: WalletAuthVariables }> = async (c, next) => {
  const address = c.req.header("X-Wallet-Address")

  if (!address || !isAddress(address)) {
    return c.json({ error: "Missing or invalid X-Wallet-Address header" }, 400)
  }

  c.set("walletAddress", address)
  await next()
}
