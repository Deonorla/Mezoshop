# Design Document — Mezo BTC Lending

## Overview

The lending system has three layers that work together:

1. **`MezoLending.sol`** — Solidity contract on Mezo testnet. Holds native BTC collateral and a MUSD treasury. Enforces LTV rules. Accepts BTC price as a caller parameter.
2. **Backend borrow service** — Hono routes + service module. Fetches live BTC price from CoinGecko, calls the contract via viem, persists transactions in SQLite.
3. **Frontend wiring** — Replaces mock functions in `src/lib/api.ts` with real backend calls. Extends `backendClient.ts`. Adds error state to `Borrow.tsx`.

---

## 1. Smart Contract

### 1.1 File Location

```
contracts/
  src/
    MezoLending.sol
  scripts/
    deploy.ts
  hardhat.config.ts
  package.json
  tsconfig.json
```

The `contracts/` directory lives at the repo root, separate from `backend/` and `src/`.

### 1.2 Storage Layout

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MezoLending {
    IERC20 public immutable musd;

    // BTC collateral per user (in wei, 18 decimals — native BTC on Mezo)
    mapping(address => uint256) public collateral;

    // MUSD debt per user (in MUSD wei, 18 decimals)
    mapping(address => uint256) public debt;

    // LTV cap: 60% — borrow up to 60% of collateral USD value
    uint256 public constant LTV_CAP = 60;

    // Liquidation threshold: 75%
    uint256 public constant LIQ_THRESHOLD = 75;

    // btcPriceUSD is passed with 8 decimal places
    // e.g. BTC = $95,000 → btcPriceUSD = 9_500_000_000_000 (95000 * 1e8)
    // collateral is in 1e18 (wei), so:
    // collateralUSD = collateral * btcPriceUSD / 1e8 / 1e18 * 1e18 (MUSD also 1e18)
    // simplified: collateralUSD_musd_units = collateral * btcPriceUSD / 1e8
}
```

### 1.3 Function Signatures

```solidity
// Deposit native BTC as collateral
function deposit() external payable;

// Borrow MUSD against collateral
// btcPriceUSD: USD price of 1 BTC with 8 decimal places (e.g. 9500000000000 = $95,000)
function borrow(uint256 musdAmount, uint256 btcPriceUSD) external;

// Repay MUSD debt (caller must approve contract first)
function repay(uint256 musdAmount) external;

// Withdraw BTC collateral (only if LTV stays ≤ 60% after withdrawal)
function withdraw(uint256 btcAmount, uint256 btcPriceUSD) external;

// Liquidate an undercollateralised position (LTV > 75%)
function liquidate(address user, uint256 btcPriceUSD) external;

// View: returns (collateralBTC, debtMUSD) for a wallet
function getPosition(address user) external view returns (uint256, uint256);

// View: returns contract's current MUSD balance
function treasuryBalance() external view returns (uint256);
```

### 1.4 LTV Math

All arithmetic uses integer math with no floating point.

```
// collateralUSD in MUSD units (1e18):
collateralUSD = collateral[user] * btcPriceUSD / 1e8

// LTV percentage (0–100):
ltv = debt[user] * 100 / collateralUSD

// Max borrowable:
maxBorrow = collateralUSD * LTV_CAP / 100

// Borrow check:
require((debt[user] + musdAmount) * 100 <= collateralUSD * LTV_CAP)

// Withdraw check (after removal):
newCollateralUSD = (collateral[user] - btcAmount) * btcPriceUSD / 1e8
require(debt[user] * 100 <= newCollateralUSD * LTV_CAP)
```

### 1.5 Events

```solidity
event Deposited(address indexed user, uint256 amount);
event Borrowed(address indexed user, uint256 musdAmount, uint256 btcPriceUSD);
event Repaid(address indexed user, uint256 musdAmount);
event Withdrawn(address indexed user, uint256 btcAmount);
event Liquidated(address indexed user, address indexed liquidator, uint256 btcAmount, uint256 debtCleared);
```

### 1.6 Constructor

```solidity
constructor(address _musd, uint256 initialTreasury) {
    musd = IERC20(_musd);
    // Deployer must have approved this contract for initialTreasury MUSD
    musd.transferFrom(msg.sender, address(this), initialTreasury);
}
```

### 1.7 Hardhat Config

```typescript
// contracts/hardhat.config.ts
networks: {
  mezoTestnet: {
    url: "https://rpc.test.mezo.org",
    chainId: 31611,
    accounts: [process.env.DEPLOYER_PRIVATE_KEY!],
  }
}
```

### 1.8 ABI Export

After `npx hardhat compile`, the ABI is at:
```
contracts/artifacts/src/MezoLending.sol/MezoLending.json
```

The backend imports it directly:
```typescript
import MezoLendingArtifact from "../../../contracts/artifacts/src/MezoLending.sol/MezoLending.json"
const LENDING_ABI = MezoLendingArtifact.abi
```

---

## 2. Backend

### 2.1 New Files

```
backend/src/
  lib/
    coingecko.ts          ← BTC price fetcher
  services/
    borrow-service.ts     ← position reads, tx recording, contract calls
  routes/
    borrow.ts             ← Hono router for /api/borrow/* and /api/repay
```

### 2.2 Environment Variables

Added to `backend/src/lib/env.ts` zod schema:

```typescript
LENDING_CONTRACT_ADDRESS: z
  .string()
  .min(1, "LENDING_CONTRACT_ADDRESS is required")
  .regex(/^0x[0-9a-fA-F]{40}$/, "Must be a valid EVM address"),

LENDING_SIGNER_PRIVATE_KEY: z
  .string()
  .min(1, "LENDING_SIGNER_PRIVATE_KEY is required")
  .regex(/^0x[0-9a-fA-F]{64}$/, "Must be a 32-byte hex private key"),
```

Added to `backend/.env` and `backend/.env.example`.

### 2.3 CoinGecko Client (`coingecko.ts`)

```typescript
const COINGECKO_URL =
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd";

export async function fetchBtcPriceUSD(): Promise<number> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(COINGECKO_URL, { signal: controller.signal });
    if (!res.ok) throw new Error(`CoinGecko ${res.status}: ${await res.text()}`);
    const data = await res.json();
    const price = data?.bitcoin?.usd;
    if (typeof price !== "number") throw new Error("Invalid CoinGecko response");
    return price;
  } finally {
    clearTimeout(timeout);
  }
}
```

### 2.4 DB Schema Addition (`db/client.ts`)

Appended to the existing `db.exec()` migration block:

```sql
CREATE TABLE IF NOT EXISTS lending_transactions (
  id TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  type TEXT NOT NULL,          -- 'borrow' | 'repay'
  amount_musd REAL NOT NULL,
  tx_hash TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lending_wallet
  ON lending_transactions(wallet_address);
```

### 2.5 Borrow Service (`borrow-service.ts`)

```typescript
interface LendingPosition {
  btcLocked: number;       // BTC in whole units (wei / 1e18)
  btcPriceUSD: number;     // USD per BTC from CoinGecko
  collateralValueUSD: number;
  totalBorrowable: number; // MUSD
  alreadyBorrowed: number; // MUSD
  available: number;       // MUSD
}

interface LendingTx {
  type: "borrow" | "repay";
  amount: number;          // MUSD
  date: string;            // ISO string
  status: string;
}

class BorrowService {
  // Reads on-chain position + fetches BTC price
  async getPosition(walletAddress: string): Promise<LendingPosition>

  // Fetches BTC price, calls contract borrow(), records in SQLite
  async executeBorrow(walletAddress: string, amountMusd: number): Promise<{ txHash: string; btcPriceUSD: number }>

  // Calls contract repay(), records in SQLite
  async executeRepay(walletAddress: string, amountMusd: number): Promise<{ txHash: string }>

  // Queries SQLite lending_transactions
  async getHistory(walletAddress: string): Promise<LendingTx[]>
}
```

**viem setup inside the service:**

```typescript
import { createPublicClient, createWalletClient, http, parseUnits, formatUnits } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { env } from "../lib/env"
import LENDING_ABI from "../../../contracts/artifacts/src/MezoLending.sol/MezoLending.json"

const mezoTestnet = { id: 31611, name: "Mezo Testnet", rpcUrls: { default: { http: ["https://rpc.test.mezo.org"] } } }

const publicClient = createPublicClient({ chain: mezoTestnet, transport: http() })
const account = privateKeyToAccount(env.LENDING_SIGNER_PRIVATE_KEY as `0x${string}`)
const walletClient = createWalletClient({ account, chain: mezoTestnet, transport: http() })
```

**Position read:**
```typescript
const [collateralWei, debtWei] = await publicClient.readContract({
  address: env.LENDING_CONTRACT_ADDRESS as `0x${string}`,
  abi: LENDING_ABI.abi,
  functionName: "getPosition",
  args: [walletAddress],
})
```

**Borrow call:**
```typescript
// Convert MUSD amount to wei (18 decimals)
const musdWei = parseUnits(String(amountMusd), 18)
// Convert BTC price to 8-decimal integer
const btcPriceScaled = BigInt(Math.round(btcPriceUSD * 1e8))

const txHash = await walletClient.writeContract({
  address: env.LENDING_CONTRACT_ADDRESS as `0x${string}`,
  abi: LENDING_ABI.abi,
  functionName: "borrow",
  args: [musdWei, btcPriceScaled],
})
await publicClient.waitForTransactionReceipt({ hash: txHash })
```

### 2.6 Borrow Router (`routes/borrow.ts`)

```
GET  /api/borrow/position  → borrowService.getPosition(walletAddress)
GET  /api/borrow/history   → borrowService.getHistory(walletAddress)
POST /api/borrow           → borrowService.executeBorrow(walletAddress, amount)
POST /api/repay            → borrowService.executeRepay(walletAddress, amount)
```

All routes protected by existing `walletAuth` middleware.

### 2.7 Registration in `index.ts`

```typescript
import { borrowRouter } from "./routes/borrow"
app.route("/api/borrow", borrowRouter)
app.route("/api/repay", repayRouter)  // repay is a sub-export from borrow.ts
```

---

## 3. Frontend

### 3.1 New Types in `src/lib/api.ts`

The existing `BorrowPosition` and `BorrowTx` interfaces are already correct. No type changes needed.

### 3.2 Replace Mock Functions in `src/lib/api.ts`

```typescript
const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export async function fetchBorrowPosition(address?: string): Promise<BorrowPosition> {
  if (!address) return zeroPosition();
  const res = await fetch(`${BASE_URL}/api/borrow/position`, {
    headers: { "X-Wallet-Address": address },
  });
  if (!res.ok) throw new BackendError(res.status, await res.text());
  return res.json();
}

export async function fetchBorrowHistory(address?: string): Promise<BorrowTx[]> {
  if (!address) return [];
  const res = await fetch(`${BASE_URL}/api/borrow/history`, {
    headers: { "X-Wallet-Address": address },
  });
  if (!res.ok) throw new BackendError(res.status, await res.text());
  return res.json();
}

export async function executeBorrow(amount: number, address?: string): Promise<void> {
  if (!address) throw new Error("Wallet not connected");
  const res = await fetch(`${BASE_URL}/api/borrow`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Wallet-Address": address },
    body: JSON.stringify({ amount }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new BackendError(res.status, body.error ?? res.statusText);
  }
}

export async function executeRepay(amount: number, address?: string): Promise<void> {
  if (!address) throw new Error("Wallet not connected");
  const res = await fetch(`${BASE_URL}/api/repay`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Wallet-Address": address },
    body: JSON.stringify({ amount }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new BackendError(res.status, body.error ?? res.statusText);
  }
}
```

`BackendError` is imported from `src/lib/backendClient.ts` (already exists there).

### 3.3 BackendClient Extensions (`src/lib/backendClient.ts`)

Added to `createBackendClient` return object and `backendClient` standalone object:

```typescript
getBorrowPosition(): Promise<BorrowPosition>
getBorrowHistory(): Promise<BorrowTx[]>
executeBorrow(amount: number): Promise<{ txHash: string; btcPriceUSD: number }>
executeRepay(amount: number): Promise<{ txHash: string }>
```

### 3.4 Queries Hook Changes (`src/hooks/queries.ts`)

`useBorrowPosition`, `useBorrowHistory`, `useBorrow`, `useRepay` already exist and call the `api.ts` functions. No hook signature changes needed — only the underlying `api.ts` functions change.

The `useBorrow` and `useRepay` mutations already invalidate the correct query keys on success.

### 3.5 Borrow.tsx Error State

Add a `txError` state string to `Borrow.tsx`. When `borrowMutation.error` or `repayMutation.error` is set, display it in a dismissible error banner above the CTA button, styled consistently with the existing `AlertTriangle` warning block.

```tsx
const txError =
  (borrowMutation.error as Error)?.message ??
  (repayMutation.error as Error)?.message ??
  null;
```

---

## 4. Data Flow

### Deposit → Borrow

```
User (browser)
  │  sends native BTC tx directly to MezoLending.deposit()
  │  (this is a direct wallet tx, not via backend)
  ▼
MezoLending.sol
  │  credits collateral[user] += msg.value
  │  emits Deposited
  ▼
User clicks "Borrow X MUSD" in Borrow.tsx
  │
  ▼
POST /api/borrow { amount }
  │
  ▼
BorrowRouter → BorrowService
  ├── fetchBtcPriceUSD() → CoinGecko API
  ├── walletClient.writeContract(borrow, [musdWei, btcPriceScaled])
  ├── waitForTransactionReceipt()
  └── db.insert(lending_transactions)
  │
  ▼
Response { txHash, btcPriceUSD }
  │
  ▼
TanStack Query invalidates useBorrowPosition + useBorrowHistory
  │
  ▼
GET /api/borrow/position → updated stats shown in UI
```

### Repay → Withdraw

```
User clicks "Repay X MUSD" in Borrow.tsx
  │
  ▼
POST /api/repay { amount }
  │
  ▼
BorrowService
  ├── walletClient.writeContract(repay, [musdWei])
  │   (user must have approved contract for MUSD spend beforehand)
  ├── waitForTransactionReceipt()
  └── db.insert(lending_transactions)
  │
  ▼
Response { txHash }
  │
  ▼
User sends withdraw tx directly to MezoLending.withdraw(btcAmount, btcPriceUSD)
  (direct wallet tx — not via backend)
```

> **Note on direct vs backend-mediated calls:** `deposit()` and `withdraw()` are called directly from the user's wallet (they move the user's own BTC). `borrow()` and `repay()` are called by the backend signer on behalf of the user because the backend needs to inject the live BTC price. This is the key architectural decision.

---

## 5. Deployment Sequence

1. Fund deployer wallet with testnet BTC (for gas) and MUSD (for treasury)
2. Approve `MezoLending` contract address for `initialTreasury` MUSD spend
3. Run `npx hardhat run scripts/deploy.ts --network mezoTestnet`
4. Copy deployed contract address to `backend/.env` as `LENDING_CONTRACT_ADDRESS`
5. Set `LENDING_SIGNER_PRIVATE_KEY` in `backend/.env`
6. Restart backend — schema migration runs automatically on startup

---

## 6. Key Decisions & Constraints

| Decision | Rationale |
|---|---|
| BTC price passed as parameter, not oracle | No Chainlink on Mezo testnet; CoinGecko is sufficient for demo |
| Backend calls `borrow()`/`repay()`, user calls `deposit()`/`withdraw()` | Price injection needed for borrow/withdraw LTV checks; deposit/withdraw don't need price |
| MUSD treasury held in contract | Simpler than minting; deployer pre-funds the contract |
| SQLite for tx history | Consistent with existing cart/orders persistence; no new infra |
| Hardhat in separate `contracts/` dir | Keeps Solidity toolchain isolated from Bun backend |
| `btcPriceUSD` scaled to 8 decimals as `uint256` | Avoids floating point in Solidity; matches CoinGecko integer math |
