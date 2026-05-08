# Tasks — Mezo BTC Lending

## Implementation Plan

Tasks are ordered by dependency. Complete each group before starting the next. Each task maps to one or more requirements from `requirements.md`.

---

## Group 1: Smart Contract

### Task 1.1 — Scaffold Hardhat project
- [ ] Create `contracts/` directory at repo root
- [ ] Run `npm init -y` inside `contracts/`
- [ ] Install: `hardhat`, `@nomicfoundation/hardhat-toolbox`, `@openzeppelin/contracts`, `dotenv`
- [ ] Create `contracts/hardhat.config.ts` with Mezo testnet network (chain ID 31611, RPC `https://rpc.test.mezo.org`)
- [ ] Create `contracts/tsconfig.json`
- [ ] Create `contracts/.env.example` with `DEPLOYER_PRIVATE_KEY`
- **Requirement:** 1–6

### Task 1.2 — Write `MezoLending.sol`
- [ ] Create `contracts/src/MezoLending.sol`
- [ ] Implement storage: `mapping(address => uint256) collateral`, `mapping(address => uint256) debt`, `IERC20 immutable musd`
- [ ] Implement `deposit()` payable — credits collateral, emits `Deposited`, reverts on zero value
- [ ] Implement `borrow(uint256 musdAmount, uint256 btcPriceUSD)` — LTV check (≤60%), treasury transfer, debt record, emits `Borrowed`
- [ ] Implement `repay(uint256 musdAmount)` — transferFrom caller, reduces debt, emits `Repaid`, reverts on zero or excess
- [ ] Implement `withdraw(uint256 btcAmount, uint256 btcPriceUSD)` — LTV check after removal, native BTC transfer, emits `Withdrawn`
- [ ] Implement `liquidate(address user, uint256 btcPriceUSD)` — LTV > 75% check, transfer collateral to liquidator, clear debt, emits `Liquidated`
- [ ] Implement `getPosition(address user)` view — returns `(collateral[user], debt[user])`
- [ ] Implement `treasuryBalance()` view — returns `musd.balanceOf(address(this))`
- [ ] Constructor: accepts `_musd` address and `initialTreasury`, calls `musd.transferFrom(msg.sender, address(this), initialTreasury)`
- [ ] All LTV math uses integer arithmetic: `collateralUSD = collateral[user] * btcPriceUSD / 1e8`
- **Requirement:** 1, 2, 3, 4, 5, 6

### Task 1.3 — Write deploy script
- [ ] Create `contracts/scripts/deploy.ts`
- [ ] Script deploys `MezoLending` with MUSD testnet address and a configurable `initialTreasury` amount
- [ ] Script logs deployed contract address
- [ ] Script reads `DEPLOYER_PRIVATE_KEY` from env
- **Requirement:** 6

### Task 1.4 — Compile and verify
- [ ] Run `npx hardhat compile` — confirm no errors
- [ ] Confirm ABI generated at `contracts/artifacts/src/MezoLending.sol/MezoLending.json`
- [ ] Deploy to Mezo testnet: `npx hardhat run scripts/deploy.ts --network mezoTestnet`
- [ ] Record deployed contract address
- **Requirement:** 6, 12

---

## Group 2: Backend — Infrastructure

### Task 2.1 — Add env vars
- [ ] Add `LENDING_CONTRACT_ADDRESS` and `LENDING_SIGNER_PRIVATE_KEY` to `backend/src/lib/env.ts` zod schema with validation (EVM address regex, 32-byte hex key regex)
- [ ] Add both vars to `backend/.env` (real values) and `backend/.env.example` (placeholder values)
- **Requirement:** 12

### Task 2.2 — Add SQLite schema migration
- [ ] Append `lending_transactions` table creation to the `db.exec()` block in `backend/src/db/client.ts`
- [ ] Columns: `id TEXT PRIMARY KEY`, `wallet_address TEXT NOT NULL`, `type TEXT NOT NULL`, `amount_musd REAL NOT NULL`, `tx_hash TEXT NOT NULL UNIQUE`, `status TEXT NOT NULL DEFAULT 'confirmed'`, `created_at TEXT NOT NULL`
- [ ] Add index: `CREATE INDEX IF NOT EXISTS idx_lending_wallet ON lending_transactions(wallet_address)`
- [ ] Restart backend and confirm no DB errors
- **Requirement:** 12

### Task 2.3 — Create CoinGecko client
- [ ] Create `backend/src/lib/coingecko.ts`
- [ ] Export `fetchBtcPriceUSD(): Promise<number>`
- [ ] Use `AbortController` with 5000ms timeout
- [ ] Throw on non-200 response with status + body in message
- [ ] Throw if `response.bitcoin.usd` is not a number
- **Requirement:** 7

---

## Group 3: Backend — Service and Routes

### Task 3.1 — Create borrow service
- [ ] Create `backend/src/services/borrow-service.ts`
- [ ] Set up viem `publicClient` (Mezo testnet, `https://rpc.test.mezo.org`)
- [ ] Set up viem `walletClient` using `privateKeyToAccount(env.LENDING_SIGNER_PRIVATE_KEY)`
- [ ] Import ABI from `contracts/artifacts/src/MezoLending.sol/MezoLending.json`
- [ ] Implement `getPosition(walletAddress)`:
  - Call `publicClient.readContract({ functionName: "getPosition", args: [walletAddress] })`
  - Call `fetchBtcPriceUSD()`
  - Compute `collateralValueUSD`, `totalBorrowable`, `available`
  - Return `BorrowPosition` object with all fields as JS numbers (divide wei by 1e18)
- [ ] Implement `executeBorrow(walletAddress, amountMusd)`:
  - Call `fetchBtcPriceUSD()`
  - Convert `amountMusd` to wei: `parseUnits(String(amountMusd), 18)`
  - Convert price to 8-decimal BigInt: `BigInt(Math.round(btcPriceUSD * 1e8))`
  - Call `walletClient.writeContract({ functionName: "borrow", args: [musdWei, btcPriceScaled] })`
  - Call `publicClient.waitForTransactionReceipt({ hash: txHash })`
  - Insert row into `lending_transactions` SQLite table
  - Return `{ txHash, btcPriceUSD }`
- [ ] Implement `executeRepay(walletAddress, amountMusd)`:
  - Convert `amountMusd` to wei
  - Call `walletClient.writeContract({ functionName: "repay", args: [musdWei] })`
  - Wait for receipt
  - Insert row into `lending_transactions`
  - Return `{ txHash }`
- [ ] Implement `getHistory(walletAddress)`:
  - Query `lending_transactions WHERE wallet_address = ? ORDER BY created_at DESC`
  - Map rows to `{ type, amount: amount_musd, date: created_at, status }`
- **Requirement:** 7, 8, 9, 10, 11, 12

### Task 3.2 — Create borrow router
- [ ] Create `backend/src/routes/borrow.ts`
- [ ] Apply `walletAuth` middleware to all routes
- [ ] `GET /` (mounted at `/api/borrow/position`) → `borrowService.getPosition(walletAddress)` → `c.json(position, 200)`
- [ ] `GET /history` → `borrowService.getHistory(walletAddress)` → `c.json(history, 200)`
- [ ] `POST /` (mounted at `/api/borrow`) → validate `body.amount` is positive number → `borrowService.executeBorrow(walletAddress, amount)` → `c.json(result, 200)`
- [ ] `POST /repay` (mounted at `/api/repay`) → validate `body.amount` → `borrowService.executeRepay(walletAddress, amount)` → `c.json(result, 200)`
- [ ] On contract revert: catch error, return `c.json({ error: revertReason }, 400)`
- [ ] On missing/invalid amount: return `c.json({ error: "amount must be a positive number" }, 400)`
- **Requirement:** 8, 9, 10, 11

### Task 3.3 — Register routes in `index.ts`
- [ ] Import `borrowRouter` from `./routes/borrow`
- [ ] Add `app.route("/api/borrow", borrowRouter)` — this covers `/api/borrow/position`, `/api/borrow/history`, and `POST /api/borrow`
- [ ] Add `app.route("/api/repay", repayRouter)` — export a separate repay sub-router from `borrow.ts`
- [ ] Add `"PATCH"` to CORS `allowMethods` if needed (not needed — POST is already allowed)
- **Requirement:** 8, 9, 10, 11

### Task 3.4 — Manual backend test
- [ ] Start backend: `bun run dev`
- [ ] Test `GET /api/borrow/position` with a valid wallet address header — confirm response shape
- [ ] Test `GET /api/borrow/history` — confirm empty array for new wallet
- [ ] Test `POST /api/borrow` with `{ amount: 100 }` — confirm contract call or meaningful error
- [ ] Test `POST /api/repay` with `{ amount: 50 }` — confirm contract call or meaningful error
- **Requirement:** 8, 9, 10, 11

---

## Group 4: Frontend

### Task 4.1 — Replace mock functions in `src/lib/api.ts`
- [ ] Import `BackendError` from `./backendClient`
- [ ] Replace `fetchBorrowPosition` with real `fetch` to `GET /api/borrow/position` with `X-Wallet-Address` header; return zero-position if no address
- [ ] Replace `fetchBorrowHistory` with real `fetch` to `GET /api/borrow/history`; return `[]` if no address
- [ ] Replace `executeBorrow` with real `POST /api/borrow` with `{ amount }` body
- [ ] Replace `executeRepay` with real `POST /api/repay` with `{ amount }` body
- [ ] Throw `BackendError` on non-ok responses with status + message from response body
- [ ] Remove the `delay()` helper calls from these four functions
- **Requirement:** 13

### Task 4.2 — Extend `src/lib/backendClient.ts`
- [ ] Add `BorrowPosition` and `BorrowTx` type imports (or inline them)
- [ ] Add `getBorrowPosition()` to `createBackendClient` return object — calls `GET /api/borrow/position`
- [ ] Add `getBorrowHistory()` — calls `GET /api/borrow/history`
- [ ] Add `executeBorrow(amount: number)` — calls `POST /api/borrow`
- [ ] Add `executeRepay(amount: number)` — calls `POST /api/repay`
- [ ] Add all four methods to the `backendClient` standalone object
- [ ] All methods use `buildHeaders(walletAddress)` for the `X-Wallet-Address` header
- **Requirement:** 14

### Task 4.3 — Add error state to `src/pages/Borrow.tsx`
- [ ] Derive `txError` from `borrowMutation.error` and `repayMutation.error`
- [ ] Render a dismissible error banner above the CTA button when `txError` is non-null, using the existing `AlertTriangle` icon and red styling
- [ ] Add a dismiss button that calls `borrowMutation.reset()` or `repayMutation.reset()`
- [ ] Disable the borrow/repay button when `address` is undefined
- **Requirement:** 15, 16

### Task 4.4 — End-to-end smoke test
- [ ] Connect wallet in browser
- [ ] Navigate to `/borrow`
- [ ] Confirm stats row shows real on-chain data (not hardcoded 0.42 BTC)
- [ ] Confirm history panel shows real transactions (empty for new wallet)
- [ ] Attempt a borrow — confirm loading state, success state, and cache invalidation
- [ ] Attempt a repay — confirm same
- [ ] Disconnect wallet — confirm buttons are disabled
- **Requirement:** 15, 16

---

## Dependency Order

```
Task 1.1 → Task 1.2 → Task 1.3 → Task 1.4
                                      │
                    ┌─────────────────┘
                    ▼
Task 2.1 → Task 2.2 → Task 2.3
                          │
                          ▼
              Task 3.1 → Task 3.2 → Task 3.3 → Task 3.4
                                                    │
                                    ┌───────────────┘
                                    ▼
                        Task 4.1 → Task 4.2 → Task 4.3 → Task 4.4
```

Group 1 (contract) must be fully deployed before Group 3 (backend service) can be tested against a real contract. Groups 2 and 4 can be started in parallel with Group 1 once the interfaces are agreed.
