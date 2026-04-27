# Implementation Plan: MezoShop

## Overview

Build the MezoShop AI-powered fashion shopping assistant on Mezo Testnet. The implementation wires a new Bun + Hono backend (SQLite, Gemini ReAct agent, product catalog) to the existing Vite + React + TypeScript frontend, replacing all mock data and simulated flows with live on-chain MUSD interactions.

## Tasks

- [x] 1. Bootstrap the Bun + Hono backend
  - Create `backend/` directory with `package.json` (bun runtime, hono, ai, @ai-sdk/google, zod, viem dependencies)
  - Create `backend/src/index.ts` with Hono app, CORS middleware, and route registration stubs
  - Create `backend/src/lib/env.ts` to load and validate required env vars (`GEMINI_API_KEY`, `MERCHANT_WALLET_ADDRESS`, `FRONTEND_ORIGIN`)
  - Expose `GET /health` returning `{ status: "ok" }`
  - Create `backend/tsconfig.json`
  - Commit with message: `feat: bootstrap bun+hono backend with health endpoint`
  - _Requirements: 10.1, 10.3_

- [x] 2. Implement shared MUSD/Mezo constants
  - [x] 2.1 Create `backend/src/lib/mezo.ts` with `MUSD_TESTNET_ADDRESS`, `MUSD_MAINNET_ADDRESS`, `MEZO_TESTNET_CHAIN_ID`, `MEZO_MAINNET_CHAIN_ID`, `ERC20_ABI`, and `MERCHANT_ADDRESS` (from env)
  - Create `src/lib/musd.ts` in the frontend with the same constants (excluding `MERCHANT_ADDRESS`) for use in wagmi hooks
  - Commit with message: `feat: add shared MUSD/Mezo constants for backend and frontend`
  - _Requirements: 5.3, 7.1, 8.1_

- [x] 3. Implement the Product Service and catalog
  - [x] 3.1 Copy `src/lib/products.ts` catalog data into `backend/src/catalog.json` as a static JSON file
  - [x] 3.2 Create `backend/src/services/product-service.ts` implementing `ProductService` interface: `search(params)` and `getById(id)`
    - Load `catalog.json` once at startup into memory
    - `search`: apply text filter (name/brand/description/category, case-insensitive substring), category exact match, brand substring, minPrice/maxPrice inclusive, then paginate (default limit 5, max 20)
    - `getById`: return matching product or `null`
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10_

  - [ ]* 3.3 Write property test for search filter correctness
    - **Property 1: Search Filter Correctness** — every returned product satisfies all provided filter conditions simultaneously
    - **Property 4: Search Completeness (No False Negatives)** — any product whose name contains the query must appear in unpaginated results
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.5, 2.6, 2.7**
    - Use fast-check; test file at `backend/tests/product-service.property.test.ts`

  - [ ]* 3.4 Write property test for pagination and total correctness
    - **Property 2: Search Pagination and Total Correctness** — `result.products.length <= limit` and `result.total >= result.products.length`
    - **Validates: Requirements 2.8, 2.9**

  - [ ]* 3.5 Write property test for product lookup round-trip
    - **Property 3: Product Lookup Round-Trip** — `getById(p.id)` returns `p` for every catalog product; unknown IDs return `null`
    - **Validates: Requirements 2.10**

  - Commit with message: `feat: add product catalog and product service with search`

- [x] 4. Implement wallet address middleware and API routes skeleton
  - [x] 4.1 Create `backend/src/middleware/wallet-auth.ts` that extracts `X-Wallet-Address` from the request header, validates it as a valid EVM address (using viem `isAddress`), and returns 400 if absent or invalid
  - [x] 4.2 Register all route stubs in `backend/src/index.ts`: `POST /api/chat`, `GET /api/cart`, `POST /api/cart`, `DELETE /api/cart/:itemId`, `GET /api/products`, `GET /api/products/:id`, `POST /api/orders`, `GET /api/orders`
  - Commit with message: `feat: add wallet-auth middleware and register API route stubs`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 10.2_

- [x] 5. Implement Cart Service (SQLite)
  - [x] 5.1 Create `backend/src/db/client.ts` initialising the Bun SQLite database and running schema migrations on startup
    - Schema: `cart_items` table and `orders` table with indexes as defined in the design
  - [x] 5.2 Create `backend/src/services/cart-service.ts` implementing `CartService`: `list`, `add`, `remove`, `clear`
    - All operations scoped strictly to `walletAddress`
    - `add` generates a UUID `id` and ISO `addedAt` timestamp
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 5.3 Write property test for cart isolation
    - **Property 5: Cart Isolation** — items added by wallet A never appear in cart for wallet B
    - **Validates: Requirements 4.2, 4.4**

  - [ ]* 5.4 Write property test for cart CRUD round-trip
    - **Property 6: Cart CRUD Round-Trip** — add → list contains item; remove → item gone; clear → empty cart
    - **Validates: Requirements 4.1, 4.3, 4.5**

  - Commit with message: `feat: add SQLite schema and cart service`

- [x] 6. Implement Order Service (SQLite)
  - [x] 6.1 Create `backend/src/services/order-service.ts` implementing `OrderService`: `create` and `list`
    - `create`: insert with status `"pending"`, return existing order if `txHash` already exists (idempotent)
    - `list`: return only orders for the requesting `walletAddress`
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]* 6.2 Write property test for order isolation
    - **Property 13: Order Isolation** — orders for wallet A never appear in list for wallet B
    - **Validates: Requirements 6.2, 6.4**

  - [ ]* 6.3 Write property test for idempotent order creation
    - **Property 14: Idempotent Order Creation** — submitting the same `txHash` twice returns the same order and creates no duplicate
    - **Validates: Requirements 6.3**

  - Commit with message: `feat: add order service with idempotent order creation`

- [x] 7. Implement Cart and Order HTTP routes
  - [x] 7.1 Wire `GET /api/cart` and `POST /api/cart` and `DELETE /api/cart/:itemId` to `CartService` in `backend/src/routes/cart.ts`
  - [x] 7.2 Wire `GET /api/orders` and `POST /api/orders` to `OrderService` in `backend/src/routes/orders.ts`
  - [x] 7.3 Wire `GET /api/products` and `GET /api/products/:id` to `ProductService` in `backend/src/routes/products.ts`
  - Commit with message: `feat: wire cart, order, and product HTTP routes`
  - _Requirements: 4.1, 4.2, 4.3, 6.1, 6.2, 10.2_

- [x] 8. Checkpoint — Ensure all backend unit and property tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Commit with message: `test: all backend tests passing at checkpoint`

- [x] 9. Implement Chat Session Service and Gemini ReAct Agent
  - [x] 9.1 Create `backend/src/services/session-service.ts` with an in-memory `Map<sessionId, { walletAddress, messages: UIMessage[] }>` implementing `createSession`, `getSession`, `appendMessages`
    - _Requirements: 3.3, 3.4, 3.5, 3.6, 3.9_

  - [ ]* 9.2 Write property test for session ownership
    - **Property 10: Session Ownership** — accessing session with a different wallet address returns 403
    - **Validates: Requirements 3.6**

  - [ ]* 9.3 Write property test for session message persistence round-trip
    - **Property 11: Session Message Persistence Round-Trip** — after streaming, session contains all prior + new messages
    - **Validates: Requirements 3.4, 3.9**

  - [x] 9.4 Create `backend/src/routes/chat.ts` implementing `POST /api/chat`
    - Validate `X-Wallet-Address`; resolve or create session
    - Call AI SDK `streamText` with Gemini model, system prompt, `searchProducts` and `getProductDetails` tools, `stopWhen: stepCountIs(3)`
    - Set `X-Session-Id` response header
    - On finish, append all new messages to session via `SessionService`
    - On `searchProducts` tool error, return a graceful fallback result to the LLM
    - _Requirements: 3.1, 3.2, 3.3, 3.7, 3.8, 3.9, 3.10_

  - [ ]* 9.5 Write unit test for agent step bound
    - **Property 12: Agent Step Bound** — tool-call steps never exceed 3 per user turn
    - **Validates: Requirements 3.8**

  - Commit with message: `feat: add chat session service and Gemini ReAct agent`

- [x] 10. Implement frontend API client
  - [x] 10.1 Create `src/lib/backendClient.ts` with typed `fetch` wrappers for all backend endpoints
    - Attach `X-Wallet-Address` header on every request using the connected wallet address
    - Throw typed errors for 4xx/5xx responses
    - _Requirements: 1.1, 9.1, 9.2_
  - Commit with message: `feat: add typed backend API client with wallet-address auth`

- [x] 11. Implement frontend MUSD hooks
  - [x] 11.1 Create `src/hooks/useMUSDBalance.ts` — thin wrapper around wagmi `useBalance` with `token: MUSD_TESTNET_ADDRESS` and `chainId: 31611`; returns `{ balance: bigint | undefined, formatted: string, isLoading: boolean }`
    - _Requirements: 7.1, 7.2_

  - [x] 11.2 Create `src/hooks/useMUSDCheckout.ts` implementing the full checkout flow:
    - Read MUSD balance; throw `InsufficientBalanceError` if balance < totalMusd (do NOT call `writeContract`)
    - Call `writeContract(MUSD.transfer, MERCHANT_ADDRESS, amountWei)` where `amountWei = parseUnits(totalMusd.toString(), 18)`
    - Await `useWaitForTransactionReceipt`; throw if receipt status ≠ "success"
    - POST to `/api/orders`; on 5xx show txHash warning but still clear cart
    - Call `CartService.clear` on success; return `{ orderId, txHash, status: "confirmed" }`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

  - [ ]* 11.3 Write property test for balance guard
    - **Property 7: Balance Guard** — when `balance < totalMusd`, `InsufficientBalanceError` is thrown and `writeContract` is never called
    - **Validates: Requirements 5.2**

  - [ ]* 11.4 Write property test for MUSD amount conversion correctness
    - **Property 8: MUSD Amount Conversion Correctness** — `amountWei === parseUnits(totalMusd.toString(), 18)` for any positive `totalMusd`
    - **Validates: Requirements 5.3**

  - [ ]* 11.5 Write property test for cart cleared after successful checkout
    - **Property 9: Cart Cleared After Successful Checkout** — after successful checkout, `Cart_Service.list` returns empty array for that wallet
    - **Validates: Requirements 5.6**

  - Commit with message: `feat: add useMUSDBalance and useMUSDCheckout hooks`

- [x] 12. Implement frontend Chat hook
  - [x] 12.1 Create `src/hooks/useChat.ts` using AI SDK `useChat` (or manual SSE fetch) pointed at `VITE_API_URL/api/chat`
    - Attach `X-Wallet-Address` header; persist and send `sessionId` from `X-Session-Id` response header
    - Expose `{ messages, isStreaming, sessionId, sendMessage, reset }`
    - On backend 5xx, set error state with "Shopping assistant is temporarily unavailable."
    - _Requirements: 3.1, 3.2, 9.1, 9.2_
  - Commit with message: `feat: add useChat hook with SSE streaming and session management`

- [x] 13. Implement network/chain validation UI
  - [x] 13.1 Create `src/components/WrongNetworkBanner.tsx` that reads `useAccount().chainId`; when chainId ≠ 31611, renders a banner with a one-click "Switch to Mezo Testnet" button using wagmi `useSwitchChain`
  - [x] 13.2 Render `WrongNetworkBanner` in the Checkout page; disable the "Pay with MUSD" button while on the wrong network
  - Commit with message: `feat: add wrong-network banner and chain switch for Mezo Testnet`
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 14. Wire frontend pages to real backend
  - [x] 14.1 Update `src/pages/Dashboard.tsx` to use `useChat` hook instead of mock `getAIResponse()`; render product cards from agent tool results
  - [x] 14.2 Update `src/pages/Checkout.tsx` to use `useMUSDCheckout`, display inline `InsufficientBalanceError` with required/available amounts and faucet link, handle `UserRejectedRequestError` toast, and show txHash warning on order recording failure
  - [x] 14.3 Update `src/pages/Borrow.tsx` (or balance display component) to use `useMUSDBalance` with 10s refetch interval
  - [x] 14.4 Update `src/pages/Orders.tsx` to fetch from `GET /api/orders` via `backendClient`
  - [x] 14.5 Replace in-memory cart calls in `src/lib/api.ts` with `backendClient` calls to `GET/POST/DELETE /api/cart`
  - Commit with message: `feat: wire all frontend pages to real backend and on-chain flows`
  - _Requirements: 3.1, 4.1, 4.2, 4.3, 5.1–5.9, 7.3, 9.1, 9.4_

- [x] 15. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
  - Commit with message: `chore: final checkpoint — all tests passing, mezoshop complete`

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Property tests use fast-check; run with `bun test` in the `backend/` directory
- The backend runs on port 3001; set `VITE_API_URL=http://localhost:3001` in `.env`
- Sessions are in-memory and lost on server restart — acceptable for hackathon scope
- `MERCHANT_WALLET_ADDRESS` must be set in `backend/.env` before running checkout flows
