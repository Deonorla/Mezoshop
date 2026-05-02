# Requirements Document

## Introduction

The AI Stylist is the core differentiator of MezoShop — a Bitcoin-native fashion commerce dApp where users borrow MUSD against BTC collateral to shop. The current stylist is functional but generic: it has no awareness of who the user is, cannot act on their behalf (e.g. add to cart), and renders responses as plain text.

This enhancement makes the AI Stylist deeply personal and fully actionable. It will know the user's aesthetic preference, shopping category, size, and MUSD balance so every recommendation is relevant and financially grounded. It gains an `addToCart` tool so it can act — not just advise. Inline product cards become interactive with working cart and navigation actions. Chat responses gain markdown rendering for richer formatting. Quick prompts become dynamic, seeded from the user's onboarding profile. The system prompt is rewritten to be fashion-forward and Bitcoin-native.

---

## Glossary

- **AI_Stylist**: The Gemini-powered conversational agent served at `POST /api/chat` via the Vercel AI SDK.
- **Chat_UI**: The React chat interface rendered in the Dashboard page (`src/pages/Dashboard.tsx`).
- **User_Context**: The set of personalisation signals injected into the AI_Stylist's system prompt — comprising the user's aesthetic preference, shopping category, size, and MUSD balance.
- **UserProfile**: The per-wallet profile object stored in `localStorage` via `useAuth`, containing fields `aesthetic`, `shopFor`, `size`, `fullName`, `phone`, `addressLine`, `city`, and `country`.
- **MUSD**: The Mezo USD stablecoin. All product prices and wallet balances are denominated in MUSD.
- **Inline_Product_Card**: The product card component rendered inside a chat message when the AI_Stylist returns product results.
- **Quick_Prompts**: The grid of suggestion buttons shown on the welcome screen before the first message is sent.
- **addToCart_Tool**: An AI SDK tool callable by the AI_Stylist that adds a product to the authenticated user's cart via the backend cart service.
- **Cart**: The per-wallet shopping cart persisted in SQLite via `cart-service.ts` and exposed at `POST /api/cart`.
- **Session**: A server-side conversation session identified by `sessionId`, stored in `session-service.ts` and returned via the `X-Session-Id` response header.
- **Markdown_Renderer**: A frontend component that parses and renders markdown syntax (bold, italic, lists, headings) within AI_Stylist message bubbles.
- **System_Prompt**: The instruction string passed as the `system` parameter to `streamText` in `backend/src/routes/chat.ts`.

---

## Requirements

### Requirement 1: User Context Injection

**User Story:** As a shopper, I want the AI Stylist to know my aesthetic preference, shopping category, size, and MUSD balance, so that every recommendation it makes is personally relevant and financially realistic.

#### Acceptance Criteria

1. WHEN a chat request is received, THE AI_Stylist SHALL include the authenticated user's `aesthetic`, `shopFor`, and `size` fields from their UserProfile in the System_Prompt.
2. WHEN a chat request is received AND the user's MUSD balance is available, THE AI_Stylist SHALL include the user's current MUSD balance (as a numeric value) in the System_Prompt.
3. WHEN a chat request is received AND one or more UserProfile fields (`aesthetic`, `shopFor`, `size`) are absent, THE AI_Stylist SHALL omit those fields from the System_Prompt without error.
4. WHEN a chat request is received AND the user's MUSD balance is unavailable, THE AI_Stylist SHALL proceed without a balance figure in the System_Prompt.
5. THE Chat_UI SHALL pass the user's MUSD balance and UserProfile fields to the backend as part of the chat request body.
6. WHEN the AI_Stylist receives a product query, THE AI_Stylist SHALL use the user's `shopFor` and `size` context to filter or rank results before presenting them.
7. WHEN the AI_Stylist receives a product query AND the user's MUSD balance is known, THE AI_Stylist SHALL prioritise products whose price does not exceed the user's MUSD balance.

---

### Requirement 2: Personalised System Prompt

**User Story:** As a shopper, I want the AI Stylist to feel like a knowledgeable, Bitcoin-native personal stylist — not a generic chatbot — so that the experience matches the premium, crypto-forward identity of MezoShop.

#### Acceptance Criteria

1. THE AI_Stylist SHALL use a System_Prompt that establishes its identity as a Bitcoin-native personal stylist for MezoShop, referencing MUSD as the currency of choice.
2. THE AI_Stylist SHALL use a System_Prompt that instructs it to make opinionated, fashion-forward recommendations rather than neutral product listings.
3. THE AI_Stylist SHALL use a System_Prompt that instructs it to acknowledge the user's financial context (MUSD balance) when making recommendations — e.g. noting when a product is within or outside their budget.
4. THE AI_Stylist SHALL use a System_Prompt that instructs it to use markdown formatting (bold for product names, bullet lists for options, etc.) in its responses.
5. THE AI_Stylist SHALL use a System_Prompt that instructs it to address the user's aesthetic and shopping preferences when they are present in the context.
6. WHEN the user's UserProfile context is present, THE AI_Stylist SHALL reference the user's aesthetic or `shopFor` preference naturally in at least the first substantive recommendation of a session.

---

### Requirement 3: `addToCart` AI Tool

**User Story:** As a shopper, I want the AI Stylist to be able to add items directly to my cart on my behalf, so that I can complete purchases through natural conversation without leaving the chat.

#### Acceptance Criteria

1. THE AI_Stylist SHALL expose an `addToCart` tool that accepts a `productId`, an optional `size`, and an optional `color`.
2. WHEN the `addToCart` tool is invoked, THE AI_Stylist SHALL call `POST /api/cart` with the authenticated user's wallet address, the provided `productId`, a quantity of `1`, and any provided `size` and `color`.
3. WHEN the `addToCart` tool call succeeds, THE AI_Stylist SHALL confirm to the user that the item has been added to their cart, including the product name.
4. IF the `addToCart` tool call fails, THEN THE AI_Stylist SHALL inform the user that the item could not be added and suggest they try the cart button on the product card.
5. WHEN the `addToCart` tool is invoked, THE AI_Stylist SHALL NOT add the same product more than once in a single tool call sequence without explicit user confirmation.
6. THE `addToCart` tool SHALL be available only on authenticated requests (wallet address present); IF the wallet address is absent, THEN THE AI_Stylist SHALL inform the user they need to connect their wallet.

---

### Requirement 4: Wired "Add to Cart" Button on Inline Product Cards

**User Story:** As a shopper, I want the "Add to Cart" button on inline product cards in the chat to actually add the item to my cart, so that I can act on AI recommendations without switching context.

#### Acceptance Criteria

1. WHEN a user clicks the "Add to Cart" button on an Inline_Product_Card, THE Chat_UI SHALL call `POST /api/cart` with the product's `id`, a quantity of `1`, and no size or color (unless the product has exactly one size/color option, in which case that option SHALL be used).
2. WHEN the cart addition succeeds, THE Chat_UI SHALL display a brief visual confirmation on the card (e.g. button text changes to "Added ✓") for at least 1500ms before reverting.
3. IF the cart addition fails, THEN THE Chat_UI SHALL display a brief error state on the card (e.g. "Failed — retry") for at least 1500ms before reverting.
4. WHILE a cart addition is in progress, THE Chat_UI SHALL disable the "Add to Cart" button on that card to prevent duplicate submissions.
5. WHEN a cart addition succeeds, THE Chat_UI SHALL invalidate the cart query cache so the cart count in the sidebar updates immediately.

---

### Requirement 5: "View Product" Action on Inline Product Cards

**User Story:** As a shopper, I want a "View Product" action on inline product cards so that I can navigate to the full product detail page directly from the chat.

#### Acceptance Criteria

1. THE Inline_Product_Card SHALL display a "View Product" action that is accessible on hover (desktop) and always visible on touch devices.
2. WHEN a user activates the "View Product" action, THE Chat_UI SHALL navigate to the product detail page at the route `/products/:id` using the product's `id`.
3. THE Inline_Product_Card SHALL remain navigable to the product detail page by clicking the product image or name, in addition to the explicit "View Product" action.
4. WHEN navigating to the product detail page, THE Chat_UI SHALL preserve the current chat session so the user can return to the conversation.

---

### Requirement 6: Markdown Rendering in Chat Messages

**User Story:** As a shopper, I want AI Stylist responses to render markdown formatting (bold text, bullet lists, etc.) so that recommendations are easier to scan and feel polished.

#### Acceptance Criteria

1. THE Markdown_Renderer SHALL render `**bold**` syntax as visually bold text within assistant message bubbles.
2. THE Markdown_Renderer SHALL render `*italic*` syntax as visually italic text within assistant message bubbles.
3. THE Markdown_Renderer SHALL render unordered lists (`- item`) as styled bullet lists within assistant message bubbles.
4. THE Markdown_Renderer SHALL render ordered lists (`1. item`) as styled numbered lists within assistant message bubbles.
5. THE Markdown_Renderer SHALL NOT render raw markdown syntax as literal characters in the final output.
6. THE Markdown_Renderer SHALL sanitise rendered output to prevent cross-site scripting (XSS) — HTML tags in AI responses SHALL be escaped, not executed.
7. WHEN an assistant message contains no markdown syntax, THE Markdown_Renderer SHALL render the message as plain text without visual degradation.
8. THE Markdown_Renderer SHALL preserve the existing message bubble styling (font size, line height, colour) for non-markdown text.

---

### Requirement 7: Dynamic Quick Prompts

**User Story:** As a shopper, I want the quick prompt suggestions on the welcome screen to reflect my personal style preferences, so that they feel relevant to me rather than generic.

#### Acceptance Criteria

1. WHEN the welcome screen is displayed AND the user's UserProfile contains an `aesthetic` value, THE Chat_UI SHALL include at least one Quick_Prompt that references that aesthetic (e.g. "Find me [aesthetic] pieces").
2. WHEN the welcome screen is displayed AND the user's UserProfile contains a `shopFor` value, THE Chat_UI SHALL include at least one Quick_Prompt scoped to that shopping category (e.g. "Best [shopFor] looks this season").
3. WHEN the welcome screen is displayed AND the user's MUSD balance is known, THE Chat_UI SHALL include at least one Quick_Prompt that references their budget (e.g. "What can I get for [balance] MUSD?").
4. WHEN the welcome screen is displayed AND the user's UserProfile is empty or unavailable, THE Chat_UI SHALL fall back to a set of generic Quick_Prompts (e.g. "Find me a luxury coat", "Show me designer bags").
5. THE Chat_UI SHALL display exactly four Quick_Prompts on the welcome screen at all times.
6. WHEN the welcome screen is displayed, THE Chat_UI SHALL generate Quick_Prompts deterministically from the available UserProfile fields — the same profile SHALL always produce the same set of prompts.

---

### Requirement 8: Context API Contract (Frontend → Backend)

**User Story:** As a developer, I want a well-defined contract for how user context is passed from the frontend to the backend chat endpoint, so that the AI Stylist can reliably access personalisation data.

#### Acceptance Criteria

1. THE Chat_UI SHALL include a `userContext` object in the chat request body alongside `messages` and `sessionId`.
2. THE `userContext` object SHALL contain the following optional fields: `aesthetic` (string), `shopFor` (string), `size` (string), `musdBalance` (number).
3. THE backend chat route SHALL accept and validate the `userContext` object from the request body.
4. IF `userContext` is absent from the request body, THEN THE AI_Stylist SHALL proceed without personalisation context and SHALL NOT return an error.
5. THE backend chat route SHALL use `userContext` fields exclusively for System_Prompt construction and SHALL NOT persist them server-side.
6. FOR ALL valid `userContext` inputs, the System_Prompt constructed by the backend SHALL contain exactly the fields present in `userContext` and no fabricated values.

---

### Requirement 9: Affordability Awareness

**User Story:** As a shopper, I want the AI Stylist to know whether I can afford a product based on my MUSD balance, so that it never recommends items I can't buy right now.

#### Acceptance Criteria

1. WHEN the AI_Stylist recommends a product AND the user's MUSD balance is known, THE AI_Stylist SHALL compare the product's price to the user's balance and note affordability in its response.
2. WHEN a recommended product's price exceeds the user's MUSD balance, THE AI_Stylist SHALL acknowledge this and either suggest a lower-priced alternative or explain how the user can borrow more MUSD.
3. WHEN a recommended product's price is within the user's MUSD balance, THE AI_Stylist SHALL confirm affordability in a natural, encouraging way.
4. WHEN the user's MUSD balance is unknown, THE AI_Stylist SHALL NOT make affordability claims and SHALL NOT block recommendations on that basis.
