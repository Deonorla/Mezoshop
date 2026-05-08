import { db } from "../db/client"

export interface UserProfile {
  walletAddress: string
  aesthetic?: string
  shopFor?: string
  size?: string
  fullName?: string
  phone?: string
  addressLine?: string
  city?: string
  country?: string
  onboarded: boolean
  createdAt: string
  updatedAt: string
}

export interface UpsertProfileInput {
  aesthetic?: string
  shopFor?: string
  size?: string
  fullName?: string
  phone?: string
  addressLine?: string
  city?: string
  country?: string
  onboarded?: boolean
}

interface UserRow {
  wallet_address: string
  aesthetic: string | null
  shop_for: string | null
  size: string | null
  full_name: string | null
  phone: string | null
  address_line: string | null
  city: string | null
  country: string | null
  onboarded: number
  created_at: string
  updated_at: string
}

function rowToProfile(row: UserRow): UserProfile {
  return {
    walletAddress: row.wallet_address,
    aesthetic: row.aesthetic ?? undefined,
    shopFor: row.shop_for ?? undefined,
    size: row.size ?? undefined,
    fullName: row.full_name ?? undefined,
    phone: row.phone ?? undefined,
    addressLine: row.address_line ?? undefined,
    city: row.city ?? undefined,
    country: row.country ?? undefined,
    onboarded: row.onboarded === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

class UserService {
  /**
   * Returns the profile for a wallet address.
   * If no row exists yet, returns null.
   */
  getProfile(walletAddress: string): UserProfile | null {
    const row = db
      .query<UserRow, [string]>("SELECT * FROM users WHERE wallet_address = ?")
      .get(walletAddress)
    return row ? rowToProfile(row) : null
  }

  /**
   * Creates or updates the profile for a wallet address.
   * Only fields present in the input are updated; others are left unchanged.
   */
  upsertProfile(walletAddress: string, input: UpsertProfileInput): UserProfile {
    const now = new Date().toISOString()
    const existing = db
      .query<UserRow, [string]>("SELECT * FROM users WHERE wallet_address = ?")
      .get(walletAddress)

    if (!existing) {
      // Insert new row
      db.query<void, [string, string | null, string | null, string | null, string | null, string | null, string | null, string | null, string | null, number, string, string]>(
        `INSERT INTO users
           (wallet_address, aesthetic, shop_for, size, full_name, phone, address_line, city, country, onboarded, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        walletAddress,
        input.aesthetic ?? null,
        input.shopFor ?? null,
        input.size ?? null,
        input.fullName ?? null,
        input.phone ?? null,
        input.addressLine ?? null,
        input.city ?? null,
        input.country ?? null,
        input.onboarded ? 1 : 0,
        now,
        now,
      )
    } else {
      // Update only provided fields
      db.query<void, [string | null, string | null, string | null, string | null, string | null, string | null, string | null, string | null, number, string, string]>(
        `UPDATE users SET
           aesthetic    = COALESCE(?, aesthetic),
           shop_for     = COALESCE(?, shop_for),
           size         = COALESCE(?, size),
           full_name    = COALESCE(?, full_name),
           phone        = COALESCE(?, phone),
           address_line = COALESCE(?, address_line),
           city         = COALESCE(?, city),
           country      = COALESCE(?, country),
           onboarded    = CASE WHEN ? = 1 THEN 1 ELSE onboarded END,
           updated_at   = ?
         WHERE wallet_address = ?`
      ).run(
        input.aesthetic ?? null,
        input.shopFor ?? null,
        input.size ?? null,
        input.fullName ?? null,
        input.phone ?? null,
        input.addressLine ?? null,
        input.city ?? null,
        input.country ?? null,
        input.onboarded ? 1 : 0,
        now,
        walletAddress,
      )
    }

    return rowToProfile(
      db.query<UserRow, [string]>("SELECT * FROM users WHERE wallet_address = ?").get(walletAddress)!
    )
  }
}

export const userService = new UserService()
