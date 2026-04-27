# Requirements Document

## Introduction

MezoShop is an AI-powered fashion shopping assistant built on the Mezo blockchain. Users connect their Mezo Passport wallet, converse with a Gemini-powered ReAct agent to discover products from a curated catalog, and pay with MUSD via a real on-chain ERC-20 transfer. The system replaces all mock/simulated flows with live on-chain interactions on Mezo Testnet (Chain ID 31611), using a Bun + Hono backend with SQLite persistence and a Vite + React + TypeScript frontend wired to wagmi for wallet interactions.

## Glossary

- **System**: The MezoShop application as a whole (frontend + backend).
- **Frontend**: The Vite + React + TypeScript browser application.
- **Backend**: The Bun + Hono API server running on port 3001.
- **Agent**: The Gemini-powered ReAct AI agent hosted in the backend chat route.
- **Product_Service**: The backend service that loads and searches the static product catalog.
- **Cart_Service**: The backend service that persists cart items in SQLite.
- **Order_Service**: The backend service that records confirmed MUSD purchases in SQLite.
- **Session_Service**: The backend in-memory service that stores chat message history keyed by session UUID.
- **Chat_Hook**: The frontend `useChat` React hook that manages streaming chat state.
- **Checkout_Hook**: The frontend `useMUSDCheckout` React hook that executes on-chain MUSD transfers.
- **Balance_Hook**: The frontend `useMUSDBalance` React hook that reads MUSD balance from Mezo Testnet.
- **MUSD**: The ERC-20 stablecoin deployed at `0x118917a40FAF1CD7a13dB0Ef56C86De7973Ac503` on Mezo Testnet.
- **Mezo_Testnet**: The Mezo blockchain test network with Chain ID 31611 and RPC `https://rpc.test.mezo.org`.
- **Merchant_Address**: The merchant wallet address configured via the `MERCHANT_WALLET_ADDRESS` environment variable.
- **Wallet**: The user's Mezo Passport wallet connected via wagmi.
- **UIMessage**: The standard AI SDK message structure with `id`, `role`, and `parts` fields.
- **Cart_Item**: A record associating a wallet address with a product, quantity, and optional size/color.
- **Order**: A record of a completed purchase including wallet address, items, total MUSD, transaction hash, and status.
- **txHash**: A 0x-prefixed hexadecimal string identifying a confirmed Mezo Testnet transaction.

---

## Requirements

### Requirement 1: Wallet Connection and Identity

**User Story:** As a shopper, I want to connect my Mezo Passport wallet, so that the system can identify me and scope my cart, orders, and chat sessions to my wallet address.

#### Acceptance Criteria

1. WHEN a user connects their wallet, THE Frontend SHALL send the wallet address in the `X-Wallet-Address` header on all subsequent API requests.
2. WHEN the Backend receives a request, THE Backend SHALL extract the wallet address from the `X-Wallet-Address` header and use it as the user identity for all data operations.
3. IF the `X-Wallet-Address` header is absent or contains an invalid EVM address, THEN THE Backend SHALL return a 400 Bad Request response.
4. THE System SHALL never require a JWT or server-side session token; the wallet address is the sole user identity.

---

### Requirement 2: Product Catalog

**User Story:** As a shopper, I want to browse and search a curated fashion catalog, so that I can discover products to purchase with MUSD.

#### Acceptance Criteria

1. THE Product_Service SHALL load the static `catalog.json` file once at startup and hold it in memory for the lifetime of the server process.
2. WHEN a search request is received with a non-empty query string, THE Product_Service SHALL return only products whose `name`, `brand`, `description`, or `category` field contains the query string (case-insensitive substring match).
3. WHEN a search request includes a `category` filter, THE Product_Service SHALL return only products whose `category` field exactly matches the filter value.
4. WHEN a search request includes a `brand` filter, THE Product_Service SHALL return only products whose `brand` field contains the filter value (case-insensitive).
5. WHEN a search request includes a `minPrice` filter, THE Product_Service SHALL return only products whose `musd` price is greater than or equal to `minPrice`.
6. WHEN a search request includes a `maxPrice` filter, THE Product_Service SHALL return only products whose `musd` price is less than or equal to `maxPrice`.
7. THE Product_Service SHALL apply all provided filters as a logical AND (all conditions must be satisfied simultaneously).
8. THE Product_Service SHALL return a `total` field equal to the count of all matching products before pagination is applied.
9. WHEN pagination parameters are provided, THE Product_Service SHALL return at most `limit` products (default 5, maximum 20) starting from the correct offset for the requested `page` (default 1).
10. WHEN a product ID is requested via `getById`, THE Product_Service SHALL return the matching product or `null` if no product with that ID exists.

---

### Requirement 3: AI Chat Agent

**User Story:** As a shopper, I want to chat with an AI assistant, so that I can discover products through natural conversation and receive personalized recommendations.

#### Acceptance Criteria

1. WHEN a `POST /api/chat` request is received with a valid wallet address and at least one message, THE Agent SHALL stream a response using the AI SDK SSE (Server-Sent Events) UI message protocol.
2. THE Backend SHALL include an `X-Session-Id` response header containing the session UUID on every chat response.
3. WHEN a `sessionId` is not provided in the request, THE Session_Service SHALL create a new session keyed by a generated UUID and scoped to the requesting wallet address.
4. WHEN a `sessionId` is provided and exists in the session store, THE Session_Service SHALL load the existing message history for that session.
5. IF a `sessionId` is provided but does not exist in the session store, THEN THE Backend SHALL return a 404 Not Found response.
6. IF a `sessionId` is provided but belongs to a different wallet address, THEN THE Backend SHALL return a 403 Forbidden response.
7. THE Agent SHALL have access to `searchProducts` and `getProductDetails` tools that delegate to the Product_Service.
8. THE Agent SHALL terminate after at most 3 tool-call steps per user turn (`stopWhen: stepCountIs(3)`).
9. WHEN the Agent finishes streaming, THE Session_Service SHALL append all new messages (user message and assistant response) to the session history.
10. WHEN a tool call to `searchProducts` fails inside the Agent, THE Agent SHALL receive a tool error result and SHALL respond with a graceful fallback message to the user.

---

### Requirement 4: Cart Management

**User Story:** As a shopper, I want to add, view, and remove items from my cart, so that I can manage my intended purchases before checkout.

#### Acceptance Criteria

1. WHEN a `POST /api/cart` request is received with a valid wallet address and cart item input, THE Cart_Service SHALL persist the item to SQLite and return the created `CartItem` with a generated `id` and `addedAt` timestamp.
2. WHEN a `GET /api/cart` request is received, THE Cart_Service SHALL return only the cart items whose `wallet_address` matches the requesting wallet address.
3. WHEN a `DELETE /api/cart/:itemId` request is received, THE Cart_Service SHALL remove the item with the matching `id` from the cart, scoped to the requesting wallet address.
4. THE Cart_Service SHALL never return cart items belonging to a different wallet address in response to any request.
5. WHEN `clear` is called for a wallet address, THE Cart_Service SHALL remove all cart items for that wallet address from SQLite.

---

### Requirement 5: MUSD Checkout

**User Story:** As a shopper, I want to pay for my cart with MUSD, so that I can complete a real on-chain purchase on Mezo Testnet.

#### Acceptance Criteria

1. WHEN the user initiates checkout, THE Checkout_Hook SHALL read the user's MUSD balance via `useBalance` before calling `writeContract`.
2. IF the user's MUSD balance is less than `totalMusd`, THEN THE Checkout_Hook SHALL throw an `InsufficientBalanceError` and SHALL NOT call `writeContract`.
3. WHEN the balance check passes, THE Checkout_Hook SHALL call `writeContract` with the MUSD ERC-20 `transfer` function, passing `MERCHANT_ADDRESS` and `amountWei` (totalMusd converted to 18-decimal wei) as arguments.
4. WHEN `writeContract` returns a transaction hash, THE Checkout_Hook SHALL wait for the transaction receipt via `useWaitForTransactionReceipt` before proceeding.
5. WHEN the transaction receipt confirms success, THE Checkout_Hook SHALL send a `POST /api/orders` request with the cart items, total MUSD, transaction hash, and wallet address.
6. WHEN the order is successfully recorded, THE Checkout_Hook SHALL call `Cart_Service.clear` for the wallet address and return `{ orderId, txHash, status: "confirmed" }`.
7. IF `writeContract` throws a `UserRejectedRequestError`, THEN THE Frontend SHALL display a dismissible toast message "Transaction cancelled." and SHALL NOT clear the cart.
8. IF the transaction receipt status is not "success", THEN THE Checkout_Hook SHALL throw an error and SHALL NOT record an order or clear the cart.
9. IF `POST /api/orders` returns a 5xx error after a successful on-chain transfer, THEN THE Frontend SHALL display the transaction hash to the user with a warning that order recording failed, and SHALL still clear the cart.

---

### Requirement 6: Order Recording

**User Story:** As a shopper, I want my completed purchases to be recorded, so that I have a history of my transactions.

#### Acceptance Criteria

1. WHEN a `POST /api/orders` request is received with a valid wallet address, items, total MUSD, and transaction hash, THE Order_Service SHALL persist the order to SQLite with status `"pending"` and return the created `Order`.
2. WHEN a `GET /api/orders` request is received, THE Order_Service SHALL return only the orders whose `wallet_address` matches the requesting wallet address.
3. IF a `POST /api/orders` request is received with a `txHash` that already exists in the orders table, THEN THE Order_Service SHALL return the existing order rather than creating a duplicate.
4. THE Order_Service SHALL never return orders belonging to a different wallet address in response to any request.

---

### Requirement 7: MUSD Balance Display

**User Story:** As a shopper, I want to see my real MUSD balance, so that I know how much I can spend before initiating checkout.

#### Acceptance Criteria

1. WHEN a wallet address is provided, THE Balance_Hook SHALL read the MUSD token balance from Mezo Testnet using wagmi `useBalance` with the MUSD contract address and Chain ID 31611.
2. THE Balance_Hook SHALL return the raw balance as a `bigint`, a human-readable `formatted` string, and an `isLoading` boolean.
3. WHILE the checkout page is displayed, THE Frontend SHALL refetch the MUSD balance at a maximum interval of 10 seconds.

---

### Requirement 8: Network and Chain Validation

**User Story:** As a shopper, I want the system to guide me to the correct network, so that my transactions are executed on Mezo Testnet.

#### Acceptance Criteria

1. WHEN the user initiates checkout and their wallet's `chainId` is not 31611, THE Frontend SHALL display a banner prompting the user to switch to Mezo Testnet.
2. WHEN the wrong-network banner is displayed, THE Frontend SHALL offer a one-click chain switch using wagmi `useSwitchChain`.
3. WHEN the user successfully switches to Mezo Testnet (chainId 31611), THE Frontend SHALL automatically allow the checkout flow to proceed.

---

### Requirement 9: Error Handling and Resilience

**User Story:** As a shopper, I want the system to handle errors gracefully, so that I am never left in an ambiguous state after a failure.

#### Acceptance Criteria

1. IF the Backend is unreachable or returns a 5xx response during a chat request, THEN THE Frontend SHALL display an error state in the chat interface with the message "Shopping assistant is temporarily unavailable."
2. WHEN a backend error occurs during chat, THE Frontend SHALL preserve the current cart state and offer a retry mechanism.
3. IF a `searchProducts` tool call fails inside the Agent, THEN THE Agent SHALL respond with a graceful fallback message rather than propagating an unhandled error to the user.
4. WHEN an insufficient MUSD balance is detected, THE Frontend SHALL display an inline error message indicating the required amount, the available amount, and a link to the Mezo testnet faucet or borrow page.

---

### Requirement 10: API Structure and Health

**User Story:** As a developer, I want a well-structured REST API with a health endpoint, so that I can verify the backend is running and integrate with it reliably.

#### Acceptance Criteria

1. THE Backend SHALL expose a `GET /health` endpoint that returns a 200 OK response when the server is running.
2. THE Backend SHALL expose the following routes: `POST /api/chat`, `GET /api/cart`, `POST /api/cart`, `DELETE /api/cart/:itemId`, `GET /api/products`, `GET /api/products/:id`, `POST /api/orders`, `GET /api/orders`.
3. THE Backend SHALL apply CORS headers restricting cross-origin requests to the configured frontend origin in production.
4. THE Backend SHALL never expose the Gemini API key, SQLite file contents, or `MERCHANT_ADDRESS` value in any API response.
