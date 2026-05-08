import { Hono } from "hono"
import { walletAuth } from "../middleware/wallet-auth"
import { userService } from "../services/user-service"
import type { WalletAuthVariables } from "../middleware/wallet-auth"

export const profileRouter = new Hono<{ Variables: WalletAuthVariables }>()

profileRouter.use("*", walletAuth)

// GET / — return profile for the authenticated wallet
// Returns empty defaults if the user has never saved a profile
profileRouter.get("/", (c) => {
  const walletAddress = c.get("walletAddress")
  const profile = userService.getProfile(walletAddress)

  if (!profile) {
    // First visit — return empty defaults
    return c.json({
      walletAddress,
      aesthetic: null,
      shopFor: null,
      size: null,
      fullName: null,
      phone: null,
      addressLine: null,
      city: null,
      country: null,
      onboarded: false,
      createdAt: null,
      updatedAt: null,
    }, 200)
  }

  return c.json(profile, 200)
})

// PUT / — create or update profile for the authenticated wallet
profileRouter.put("/", async (c) => {
  const walletAddress = c.get("walletAddress")

  let body: Record<string, unknown>
  try {
    body = await c.req.json()
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400)
  }

  const profile = userService.upsertProfile(walletAddress, {
    aesthetic:   typeof body.aesthetic   === "string" ? body.aesthetic   : undefined,
    shopFor:     typeof body.shopFor     === "string" ? body.shopFor     : undefined,
    size:        typeof body.size        === "string" ? body.size        : undefined,
    fullName:    typeof body.fullName    === "string" ? body.fullName    : undefined,
    phone:       typeof body.phone       === "string" ? body.phone       : undefined,
    addressLine: typeof body.addressLine === "string" ? body.addressLine : undefined,
    city:        typeof body.city        === "string" ? body.city        : undefined,
    country:     typeof body.country     === "string" ? body.country     : undefined,
    onboarded:   body.onboarded === true,
  })

  return c.json(profile, 200)
})
