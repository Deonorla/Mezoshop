# Requirements Document

## Introduction

This feature adds a BTC-collateral lending system to MezoShop. Users deposit native BTC (the gas currency on Mezo chain, chain ID 31611) as collateral and borrow MUSD (ERC20 stablecoin at `0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503`) against it at 0% interest. The system spans three layers: a Solidity smart contract deployed on Mezo testnet, a Bun/Hono backend that bridges CoinGecko price data to on-chain calls, and a React/wagmi frontend that replaces existing mock API functions with real backend calls.

---

## Glossary

- **MezoLending**: The Solidity smart contract deployed on Mezo testnet (chain ID 31611) that holds BTC collateral and a MUSD treasury, enforces LTV limits, and processes borrow/repay/liquidate operations.
- **MUSD**: The ERC20 stablecoin at address `0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503` on Mezo testnet, used as the borrowable asset.
- **Native BTC**: The gas currency on Mezo EVM, behaving identically to ETH on Ethereum — deposited via `msg.value` and read via `address.balance`.
- **LTV**: Loan-to-Value ratio — the ratio of outstanding MUSD debt to the USD value of BTC collateral, expressed as a percentage.
- **Liquidation_Threshold**: The LTV level (75%) at which a position becomes eligible for liquidation.
- **BorrowService**: The backend service module responsible for fetching BTC price from CoinGecko, reading position data from MezoLending via viem, and recording borrow/repay transactions in SQLite.
- **BorrowRouter**: The Hono route handler that exposes `/api/borrow/*` and `/api/repay` endpoints, protected by the existing `walletAuth` middleware.
- **BorrowPosition**: The data structure `{ btcLocked, btcPriceUSD, collateralValueUSD, totalBorrowable, alreadyBorrowed, available }` returned to the frontend.
- **BorrowTx**: A recorded borrow or repay transaction `{ type, amount, date, status }` stored in SQLite and returned by the history endpoint.
- **CoinGecko_Client**: The backend module that fetches the live BTC/USD price from the CoinGecko REST API.
- **Frontend_API**: The functions in `src/lib/api.ts` (`fetchBorrowPosition`, `fetchBorrowHistory`, `executeBorrow`, `executeRepay`) that are replaced with real HTTP calls to the backend.
- **BackendClient**: The typed fetch wrapper in `src/lib/backendClient.ts` extended with borrow/repay methods.

---

## Requirements

### Requirement 1: Smart Contract — BTC Collateral Deposit

**User Story:** As a MezoShop user, I want to deposit native BTC as collateral into the MezoLending contract, so that I can use it as backing to borrow MUSD.

#### Acceptance Criteria

1. WHEN a user sends a transaction to `MezoLending.deposit()` with a non-zero `msg.value`, THE MezoLending SHALL credit the sent BTC amount to the sender's collateral balance.
2. THE MezoLending SHALL store each user's collateral balance as a mapping from wallet address to BTC amount (in wei).
3. WHEN a deposit transaction is processed, THE MezoLending SHALL emit a `Deposited(address indexed user, uint256 amount)` event.
4. IF a user calls `MezoLending.deposit()` with `msg.value` equal to zero, THEN THE MezoLending SHALL revert the transaction with a descriptive error.

---

### Requirement 2: Smart Contract — MUSD Borrow

**User Story:** As a MezoShop user, I want to borrow MUSD against my deposited BTC collateral, so that I can access liquidity without selling my BTC.

#### Acceptance Criteria

1. WHEN a user calls `MezoLending.borrow(uint256 musdAmount, uint256 btcPriceUSD)`, THE MezoLending SHALL transfer `musdAmount` of MUSD from the contract treasury to the caller's wallet.
2. THE MezoLending SHALL enforce that the resulting LTV after borrowing does not exceed 60% — calculated as `(existingDebt + musdAmount) / (collateralBTC * btcPriceUSD) * 100`.
3. IF the requested borrow would cause the caller's LTV to exceed 60%, THEN THE MezoLending SHALL revert the transaction with a descriptive error.
4. IF the contract's MUSD treasury balance is less than `musdAmount`, THEN THE MezoLending SHALL revert the transaction with a descriptive error.
5. IF the caller's collateral balance is zero, THEN THE MezoLending SHALL revert the transaction with a descriptive error.
6. WHEN a borrow is processed, THE MezoLending SHALL emit a `Borrowed(address indexed user, uint256 musdAmount, uint256 btcPriceUSD)` event.
7. THE MezoLending SHALL record each user's outstanding MUSD debt as a mapping from wallet address to MUSD amount (in wei).

---

### Requirement 3: Smart Contract — MUSD Repay

**User Story:** As a MezoShop user, I want to repay my MUSD debt, so that I can reduce my LTV and eventually withdraw my BTC collateral.

#### Acceptance Criteria

1. WHEN a user calls `MezoLending.repay(uint256 musdAmount)`, THE MezoLending SHALL transfer `musdAmount` of MUSD from the caller's wallet back to the contract treasury.
2. THE MezoLending SHALL reduce the caller's recorded MUSD debt by `musdAmount` after a successful repay.
3. IF `musdAmount` exceeds the caller's current outstanding debt, THEN THE MezoLending SHALL revert the transaction with a descriptive error.
4. IF `musdAmount` is zero, THEN THE MezoLending SHALL revert the transaction with a descriptive error.
5. WHEN a repay is processed, THE MezoLending SHALL emit a `Repaid(address indexed user, uint256 musdAmount)` event.

---

### Requirement 4: Smart Contract — BTC Collateral Withdrawal

**User Story:** As a MezoShop user, I want to withdraw my BTC collateral, so that I can reclaim my BTC when I no longer need the loan.

#### Acceptance Criteria

1. WHEN a user calls `MezoLending.withdraw(uint256 btcAmount, uint256 btcPriceUSD)`, THE MezoLending SHALL transfer `btcAmount` of native BTC to the caller's wallet.
2. THE MezoLending SHALL enforce that the resulting LTV after withdrawal does not exceed 60% — calculated as `existingDebt / ((collateralBTC - btcAmount) * btcPriceUSD) * 100`.
3. IF the withdrawal would cause the caller's LTV to exceed 60%, THEN THE MezoLending SHALL revert the transaction with a descriptive error.
4. IF `btcAmount` exceeds the caller's collateral balance, THEN THE MezoLending SHALL revert the transaction with a descriptive error.
5. WHEN a withdrawal is processed, THE MezoLending SHALL emit a `Withdrawn(address indexed user, uint256 btcAmount)` event.

---

### Requirement 5: Smart Contract — Liquidation

**User Story:** As a protocol operator, I want to liquidate undercollateralized positions, so that the MUSD treasury remains solvent.

#### Acceptance Criteria

1. WHEN a liquidator calls `MezoLending.liquidate(address user, uint256 btcPriceUSD)` and the target user's LTV exceeds 75%, THE MezoLending SHALL transfer the target user's entire BTC collateral balance to the liquidator.
2. WHEN a liquidation is executed, THE MezoLending SHALL clear the target user's MUSD debt to zero.
3. IF the target user's LTV is 75% or below at the time of the call, THEN THE MezoLending SHALL revert the transaction with a descriptive error.
4. WHEN a liquidation is processed, THE MezoLending SHALL emit a `Liquidated(address indexed user, address indexed liquidator, uint256 btcAmount, uint256 debtCleared)` event.

---

### Requirement 6: Smart Contract — Price Input and Treasury Management

**User Story:** As a protocol designer, I want the contract to accept BTC price as a caller-supplied parameter and hold a MUSD treasury, so that the system works on Mezo testnet without an on-chain oracle.

#### Acceptance Criteria

1. THE MezoLending SHALL accept `btcPriceUSD` as a `uint256` parameter (representing USD price with 8 decimal places) on `borrow`, `withdraw`, and `liquidate` calls rather than reading from an on-chain oracle.
2. THE MezoLending SHALL hold a MUSD treasury funded at deploy time via an initial `IERC20.transferFrom` call in the constructor.
3. THE MezoLending SHALL expose a `getPosition(address user)` view function that returns `(uint256 collateralBTC, uint256 debtMUSD)` for a given wallet address.
4. THE MezoLending SHALL expose a `treasuryBalance()` view function that returns the contract's current MUSD balance.

---

### Requirement 7: Backend — BTC Price Fetching

**User Story:** As a backend service, I want to fetch the live BTC/USD price from CoinGecko, so that I can pass an accurate price to contract calls and return it to the frontend.

#### Acceptance Criteria

1. WHEN the BorrowService needs a BTC price, THE CoinGecko_Client SHALL fetch the BTC/USD price from the CoinGecko REST API endpoint `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd`.
2. THE CoinGecko_Client SHALL return the price as a JavaScript `number` representing USD per BTC.
3. IF the CoinGecko API returns a non-200 HTTP status, THEN THE CoinGecko_Client SHALL throw an error with the HTTP status code and response body included in the message.
4. IF the CoinGecko API response does not contain a valid numeric price at `response.bitcoin.usd`, THEN THE CoinGecko_Client SHALL throw an error with a descriptive message.
5. THE CoinGecko_Client SHALL complete the price fetch within 5000 milliseconds; IF the request exceeds this timeout, THEN THE CoinGecko_Client SHALL throw a timeout error.

---

### Requirement 8: Backend — Position Endpoint

**User Story:** As a frontend consumer, I want to retrieve my current lending position from the backend, so that the Borrow page can display accurate collateral and debt data.

#### Acceptance Criteria

1. WHEN an authenticated request is made to `GET /api/borrow/position`, THE BorrowRouter SHALL return a JSON object matching the `BorrowPosition` shape: `{ btcLocked, btcPriceUSD, collateralValueUSD, totalBorrowable, alreadyBorrowed, available }`.
2. THE BorrowService SHALL read `collateralBTC` and `debtMUSD` for the authenticated wallet address by calling `MezoLending.getPosition(walletAddress)` via viem on Mezo testnet RPC `https://rpc.test.mezo.org`.
3. THE BorrowService SHALL compute `collateralValueUSD = btcLocked * btcPriceUSD`, `totalBorrowable = floor(collateralValueUSD * 0.60)`, and `available = totalBorrowable - alreadyBorrowed`.
4. IF the wallet has no position on-chain (collateral and debt both zero), THE BorrowRouter SHALL return a valid `BorrowPosition` with all numeric fields set to zero.
5. WHEN the `GET /api/borrow/position` request is missing or contains an invalid `X-Wallet-Address` header, THE BorrowRouter SHALL return HTTP 400 with `{ "error": "Missing or invalid X-Wallet-Address header" }`.

---

### Requirement 9: Backend — Borrow Endpoint

**User Story:** As a frontend consumer, I want to submit a borrow request through the backend, so that the backend can fetch the current BTC price and call the contract on behalf of the user.

#### Acceptance Criteria

1. WHEN an authenticated `POST /api/borrow` request is received with body `{ amount: number }`, THE BorrowRouter SHALL fetch the live BTC price via CoinGecko_Client, call `MezoLending.borrow(amount, btcPriceUSD)` via viem using the backend signer wallet, and return `{ txHash: string, btcPriceUSD: number }` with HTTP 200.
2. THE BorrowService SHALL record the borrow transaction in SQLite with fields `(id, wallet_address, type='borrow', amount_musd, tx_hash, status='confirmed', created_at)` after the on-chain transaction is confirmed.
3. IF the on-chain `borrow` call reverts, THEN THE BorrowRouter SHALL return HTTP 400 with `{ "error": "<revert reason>" }` and SHALL NOT record a transaction in SQLite.
4. IF the request body is missing `amount` or `amount` is not a positive number, THEN THE BorrowRouter SHALL return HTTP 400 with `{ "error": "amount must be a positive number" }`.
5. WHEN the `POST /api/borrow` request is missing or contains an invalid `X-Wallet-Address` header, THE BorrowRouter SHALL return HTTP 400 with `{ "error": "Missing or invalid X-Wallet-Address header" }`.

---

### Requirement 10: Backend — Repay Endpoint

**User Story:** As a frontend consumer, I want to submit a repay request through the backend, so that the backend can call the contract and record the repayment.

#### Acceptance Criteria

1. WHEN an authenticated `POST /api/repay` request is received with body `{ amount: number }`, THE BorrowRouter SHALL call `MezoLending.repay(amount)` via viem using the backend signer wallet and return `{ txHash: string }` with HTTP 200.
2. THE BorrowService SHALL record the repay transaction in SQLite with fields `(id, wallet_address, type='repay', amount_musd, tx_hash, status='confirmed', created_at)` after the on-chain transaction is confirmed.
3. IF the on-chain `repay` call reverts, THEN THE BorrowRouter SHALL return HTTP 400 with `{ "error": "<revert reason>" }` and SHALL NOT record a transaction in SQLite.
4. IF the request body is missing `amount` or `amount` is not a positive number, THEN THE BorrowRouter SHALL return HTTP 400 with `{ "error": "amount must be a positive number" }`.
5. WHEN the `POST /api/repay` request is missing or contains an invalid `X-Wallet-Address` header, THE BorrowRouter SHALL return HTTP 400 with `{ "error": "Missing or invalid X-Wallet-Address header" }`.

---

### Requirement 11: Backend — Transaction History Endpoint

**User Story:** As a frontend consumer, I want to retrieve my borrow and repay history from the backend, so that the Borrow page can display recent activity.

#### Acceptance Criteria

1. WHEN an authenticated request is made to `GET /api/borrow/history`, THE BorrowRouter SHALL return a JSON array of `BorrowTx` objects `{ type, amount, date, status }` ordered by `created_at` descending.
2. THE BorrowService SHALL query the SQLite `lending_transactions` table filtered by the authenticated wallet address.
3. IF the wallet has no recorded transactions, THE BorrowRouter SHALL return an empty JSON array `[]` with HTTP 200.
4. WHEN the `GET /api/borrow/history` request is missing or contains an invalid `X-Wallet-Address` header, THE BorrowRouter SHALL return HTTP 400 with `{ "error": "Missing or invalid X-Wallet-Address header" }`.

---

### Requirement 12: Backend — SQLite Schema for Lending Transactions

**User Story:** As a backend developer, I want a dedicated SQLite table for lending transactions, so that borrow and repay history is persisted alongside existing cart and order data.

#### Acceptance Criteria

1. THE BorrowService SHALL create a `lending_transactions` table in the existing SQLite database on startup if it does not already exist, with columns: `id TEXT PRIMARY KEY`, `wallet_address TEXT NOT NULL`, `type TEXT NOT NULL` (values: `'borrow'` or `'repay'`), `amount_musd REAL NOT NULL`, `tx_hash TEXT NOT NULL UNIQUE`, `status TEXT NOT NULL DEFAULT 'confirmed'`, `created_at TEXT NOT NULL`.
2. THE BorrowService SHALL create an index on `lending_transactions(wallet_address)` on startup if it does not already exist.
3. THE MezoLending contract address SHALL be stored as a configurable environment variable `LENDING_CONTRACT_ADDRESS` validated at backend startup alongside existing env vars.
4. THE backend signer private key SHALL be stored as a configurable environment variable `LENDING_SIGNER_PRIVATE_KEY` validated at backend startup alongside existing env vars.

---

### Requirement 13: Frontend — Replace Mock API Functions

**User Story:** As a frontend developer, I want the borrow-related API functions in `src/lib/api.ts` to call the real backend, so that the Borrow page displays live on-chain data instead of hardcoded mock values.

#### Acceptance Criteria

1. THE Frontend_API SHALL replace `fetchBorrowPosition(address)` with a `fetch` call to `GET /api/borrow/position` that attaches the `X-Wallet-Address` header and returns a `BorrowPosition` object.
2. THE Frontend_API SHALL replace `fetchBorrowHistory(address)` with a `fetch` call to `GET /api/borrow/history` that attaches the `X-Wallet-Address` header and returns a `BorrowTx[]` array.
3. THE Frontend_API SHALL replace `executeBorrow(amount, address)` with a `fetch` call to `POST /api/borrow` with body `{ amount }` and the `X-Wallet-Address` header, returning `void` on success.
4. THE Frontend_API SHALL replace `executeRepay(amount, address)` with a `fetch` call to `POST /api/repay` with body `{ amount }` and the `X-Wallet-Address` header, returning `void` on success.
5. IF the backend returns a 4xx or 5xx response, THEN THE Frontend_API SHALL throw a `BackendError` with the HTTP status code and error message from the response body.

---

### Requirement 14: Frontend — BackendClient Extension

**User Story:** As a frontend developer, I want the typed `BackendClient` in `src/lib/backendClient.ts` to include borrow/repay methods, so that all backend calls follow the same typed pattern used by cart and orders.

#### Acceptance Criteria

1. THE BackendClient SHALL expose a `getBorrowPosition()` method that calls `GET /api/borrow/position` and returns `Promise<BorrowPosition>`.
2. THE BackendClient SHALL expose a `getBorrowHistory()` method that calls `GET /api/borrow/history` and returns `Promise<BorrowTx[]>`.
3. THE BackendClient SHALL expose a `executeBorrow(amount: number)` method that calls `POST /api/borrow` with body `{ amount }` and returns `Promise<{ txHash: string; btcPriceUSD: number }>`.
4. THE BackendClient SHALL expose a `executeRepay(amount: number)` method that calls `POST /api/repay` with body `{ amount }` and returns `Promise<{ txHash: string }>`.
5. THE BackendClient SHALL attach the `X-Wallet-Address` header on all four borrow/repay methods using the same `buildHeaders` helper used by existing cart and order methods.

---

### Requirement 15: Frontend — Borrow Page Data Wiring

**User Story:** As a MezoShop user, I want the Borrow page to display my real on-chain position and transaction history, so that I can make informed borrowing decisions.

#### Acceptance Criteria

1. THE `useBorrowPosition` hook SHALL call `fetchBorrowPosition` (backed by the real backend) and refetch every 30 seconds so that position data stays current.
2. THE `useBorrowHistory` hook SHALL call `fetchBorrowHistory` (backed by the real backend) and be enabled only when a wallet address is connected.
3. WHEN `useBorrow` mutation succeeds, THE `useBorrowPosition` and `useBorrowHistory` query caches SHALL be invalidated so the UI reflects the updated position.
4. WHEN `useRepay` mutation succeeds, THE `useBorrowPosition` and `useBorrowHistory` query caches SHALL be invalidated so the UI reflects the updated position.
5. WHILE the position data is loading, THE Borrow page SHALL display skeleton placeholder cards in place of the stats row, consistent with the existing loading state in `Borrow.tsx`.

---

### Requirement 16: Frontend — Error Handling on Borrow/Repay

**User Story:** As a MezoShop user, I want to see a clear error message when a borrow or repay transaction fails, so that I understand what went wrong and can take corrective action.

#### Acceptance Criteria

1. IF `executeBorrow` throws a `BackendError`, THEN THE Borrow page SHALL display the error message from the `BackendError` in a visible error state within the form panel.
2. IF `executeRepay` throws a `BackendError`, THEN THE Borrow page SHALL display the error message from the `BackendError` in a visible error state within the form panel.
3. WHEN a borrow or repay error is displayed, THE Borrow page SHALL allow the user to dismiss the error and return to the input state.
4. IF the user's wallet is not connected, THEN THE Borrow page SHALL disable the borrow and repay action buttons.
