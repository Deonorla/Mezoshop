# Design Document: AI Stylist Enhancement

## Overview

This document describes the technical design for enhancing the MezoShop AI Stylist. The current stylist is a functional but generic chat agent. This enhancement makes it deeply personal and fully actionable: it knows who the user is, can add items to their cart, renders rich markdown responses, and surfaces dynamic quick prompts seeded from the user's onboarding profile.

The changes span both the backend (`backend/src/routes/chat.ts`) and the frontend (`src/pages/Dashboard.tsx`, `src/hooks/useChat.ts`), with a new shared API contract for user context.

### Key Research Findings

**Markdown rendering**: `react-markdown` is the standard choice for React. It supports CommonMark, is actively maintained, and pairs with `rehype-sanitize` for XSS protection. `remark-gfm` adds GitHub Flavored Markdown (tables, strikethrough). No markdown library is currently installed in the frontend.

**Vercel AI SDK tool execution**: The `tool()` helper in `ai` v4 supports an `execute` async function that receives the parsed parameters. The tool has access to the outer closure (including `walletAddress` from the Hono context), so `addToCart` can call the cart service directly without any additional plumbing.

**TanStack Query cache invalidation**: `queryClient.invalidateQueries({ queryKey: ['cart'] })` is the correct pattern to trigger a cart count refresh after a successful add-to-cart action.

---

## Architecture

The enhancement follows the existing layered architecture without introducing new layers:

```
Frontend (React + Vite)
  └── Dashboard.tsx
        ├── generateQuickPrompts()       [new pure function]
        ├── InlineProductCard            [enhanced: add-to-cart + navigation]
        ├── MarkdownMessage              [new component wrapping react-markdown]
        └── useChat (hook)              [enhanced: sends userContext]

Backend (Bun + Hono)
  └── routes/chat.ts
        ├── buildSystemPrompt()          [new pure function]
        ├── addToCart tool               [new AI SDK tool]
        └── userContext validation       [new Zod schema]
```

Data flow for a personalised chat request:

```
User types message
  → useChat.sendMessage(text, userContext)
  → POST /api/chat { messages, sessionId, userContext }
  → chat.ts: buildSystemPrompt(userContext) → system string
  → streamText({ system, messages, tools: { searchProducts, getProductDetails, addToCart } })
  → SSE stream → useChat parses → Dashboard renders MarkdownMessage + InlineProductCards
```

---

## Components and Interfaces

### Backend: `buildSystemPrompt(userContext)`

A pure function extracted from `chat.ts` that constructs the system prompt string from a `UserContext` object. Extracting it makes it independently testable.

```typescript
interface UserContext {
  aesthetic?: string;
  shopFor?: string;
  size?: string;
  musdBalance?: number;
}

function buildSystemPrompt(ctx: UserContext): string
```

The function produces a base identity section (always present) followed by conditional personalisation sections for each present field.

### Backend: `addToCart` Tool

A new AI SDK tool registered alongside `searchProducts` and `getProductDetails` in `chat.ts`. It closes over `walletAddress` from the Hono context.

```typescript
addToCart: tool({
  description: "Add a product to the user's cart on their behalf.",
  parameters: z.object({
    productId: z.string(),
    size: z.string().optional(),
    color: z.string().optional(),
  }),
  execute: async ({ productId, size, color }) => { ... }
})
```

The tool calls `cartService.add(walletAddress, { productId, quantity: 1, size, color })` directly, bypassing HTTP to avoid re-authentication overhead.

### Backend: Request Body Schema

The chat route's request body is extended with an optional `userContext` field:

```typescript
interface ChatRequestBody {
  messages: UIMessage[];
  sessionId?: string;
  userContext?: {
    aesthetic?: string;
    shopFor?: string;
    size?: string;
    musdBalance?: number;
  };
}
```

Validated with Zod. If absent, the route proceeds without personalisation.

### Frontend: `generateQuickPrompts(profile, musdBalance)`

A pure function in `Dashboard.tsx` that produces exactly four quick prompt strings from the available profile fields. Extracted from the component for testability.

```typescript
interface QuickPromptContext {
  aesthetic?: string;
  shopFor?: string;
  musdBalance?: string; // formatted string e.g. "1,234.56"
}

function generateQuickPrompts(ctx: QuickPromptContext): [string, string, string, string]
```

The function fills slots deterministically: slot 0 = aesthetic prompt (or generic fallback), slot 1 = shopFor prompt (or generic fallback), slot 2 = budget prompt (or generic fallback), slot 3 = always a generic discovery prompt.

### Frontend: `useChat` Hook Enhancement

`sendMessage` gains a second parameter for user context:

```typescript
sendMessage: (text: string, userContext?: UserContext) => Promise<void>
```

The hook passes `userContext` in the request body alongside `messages` and `sessionId`.

### Frontend: `MarkdownMessage` Component

A new component that wraps `react-markdown` with `rehype-sanitize` and `remark-gfm`:

```typescript
interface MarkdownMessageProps {
  content: string;
  className?: string;
}

function MarkdownMessage({ content, className }: MarkdownMessageProps): JSX.Element
```

Rendered inside the assistant message bubble in place of the current `<p>` tag.

### Frontend: `InlineProductCard` Enhancement

The existing `InlineProductCard` component gains:
- A wired "Add to Cart" button with loading/success/error states
- A "View Product" action (hover on desktop, always visible on touch)
- Click navigation on image and product name

```typescript
interface InlineProductCardProps {
  product: ProductResult;
  walletAddress: string | undefined;
  onAddToCart: (productId: string) => Promise<void>;
  onNavigate: (productId: string) => void;
}
```

---

## Data Models

### `UserContext` (shared concept, defined separately in frontend and backend)

| Field | Type | Required | Description |
|---|---|---|---|
| `aesthetic` | string | No | User's style aesthetic (e.g. "minimalist", "streetwear") |
| `shopFor` | string | No | Shopping category (e.g. "men", "women", "kids") |
| `size` | string | No | Clothing/shoe size |
| `musdBalance` | number | No | Current MUSD balance as a raw numeric value |

### System Prompt Structure

The system prompt is composed of two sections:

**Base section** (always present): Establishes the AI's identity as a Bitcoin-native personal stylist for MezoShop. Instructs it to use markdown formatting, make opinionated recommendations, reference MUSD as currency, and use the `addToCart` tool when users want to purchase.

**Personalisation section** (conditional): Appended only when `userContext` fields are present. Each present field adds a sentence. Example:

```
--- User Context ---
Aesthetic preference: minimalist
Shopping for: women
Size: M
MUSD balance: 1,234.56 MUSD

Use this context to personalise every recommendation. Prioritise products within the user's budget. If a product exceeds their balance, acknowledge it and suggest alternatives.
```

### `ChatMessage` (frontend, existing — no changes to shape)

The existing `ChatMessage` interface in `useChat.ts` is unchanged. The `products` field already supports inline product cards.

### Quick Prompt Slot Assignment

| Slot | Condition | Template | Fallback |
|---|---|---|---|
| 0 | `aesthetic` present | `"Find me [aesthetic] pieces"` | `"Find me a luxury coat"` |
| 1 | `shopFor` present | `"Best [shopFor] looks this season"` | `"Show me designer bags"` |
| 2 | `musdBalance` present | `"What can I get for [balance] MUSD?"` | `"Best watches under 15k MUSD"` |
| 3 | Always | `"New runway drops"` | `"New runway drops"` |

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: System prompt contains all present UserContext fields

*For any* `UserContext` object with any combination of present/absent optional fields, the string returned by `buildSystemPrompt` SHALL contain exactly the values of the fields that are present, and SHALL NOT contain fabricated values for fields that are absent.

**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 8.6**

### Property 2: `addToCart` tool always passes quantity 1

*For any* valid `productId`, optional `size`, and optional `color`, when the `addToCart` tool's execute function is called, it SHALL invoke `cartService.add` with `quantity: 1` and the exact `productId`, `size`, and `color` values provided.

**Validates: Requirements 3.2**

### Property 3: `addToCart` success response contains product name

*For any* product name string, when `cartService.add` succeeds, the `addToCart` tool's execute function SHALL return a result object whose confirmation message contains that product name.

**Validates: Requirements 3.3**

### Property 4: Quick prompts always return exactly four items

*For any* `QuickPromptContext` (including empty/undefined), `generateQuickPrompts` SHALL return an array of exactly four non-empty strings.

**Validates: Requirements 7.5**

### Property 5: Quick prompts are deterministic

*For any* `QuickPromptContext`, calling `generateQuickPrompts` twice with the same input SHALL return identical arrays.

**Validates: Requirements 7.6**

### Property 6: Quick prompts reference present profile fields

*For any* `QuickPromptContext` where `aesthetic` is present, at least one of the four returned prompts SHALL contain the `aesthetic` value. The same holds independently for `shopFor` and `musdBalance`.

**Validates: Requirements 7.1, 7.2, 7.3**

### Property 7: Markdown renderer does not expose raw syntax

*For any* string containing markdown syntax (`**bold**`, `*italic*`, `- list item`, `1. ordered`), the output of `MarkdownMessage` rendered to HTML SHALL NOT contain the raw markdown delimiters (`**`, `*`, `- `, `1. `) as literal visible text.

**Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**

### Property 8: Markdown renderer escapes HTML tags (XSS prevention)

*For any* string containing HTML tags (e.g. `<script>`, `<img onerror=...>`), the rendered output of `MarkdownMessage` SHALL NOT contain executable HTML — all tags SHALL be escaped or stripped.

**Validates: Requirements 6.6**

### Property 9: Plain text round-trip

*For any* string containing no markdown syntax, the text content of the `MarkdownMessage` rendered output SHALL equal the input string (modulo whitespace normalisation).

**Validates: Requirements 6.7**

---

## Error Handling

### `addToCart` Tool Failures

The tool's `execute` function wraps `cartService.add` in a try/catch. On failure it returns a structured error result (not throws), so the LLM can compose a user-facing message:

```typescript
try {
  const item = await cartService.add(walletAddress, { productId, quantity: 1, size, color });
  const product = await productService.getById(productId);
  return { success: true, productName: product?.name ?? productId };
} catch {
  return { success: false, error: "Could not add item to cart. Please try the cart button on the product card." };
}
```

### Inline Product Card Cart Failures

The `InlineProductCard` component manages its own `status` state (`'idle' | 'loading' | 'success' | 'error'`). On failure, it displays an error state for 1500ms then reverts to idle. The button is disabled during `'loading'` state.

### Missing `userContext`

The backend chat route treats `userContext` as fully optional. If absent or malformed, `buildSystemPrompt` is called with an empty object, producing the base system prompt without personalisation. No error is returned.

### Markdown Rendering Failures

`react-markdown` does not throw on malformed input — it degrades gracefully to plain text. The `MarkdownMessage` component wraps the renderer in an error boundary as a safety net; on error it falls back to rendering the raw content string in a `<p>` tag.

---

## Testing Strategy

### Unit Tests (example-based)

Located in `backend/tests/` (Bun test runner) and `src/__tests__/` (Vitest).

- `buildSystemPrompt` with a fully populated `UserContext` — verify all fields appear
- `buildSystemPrompt` with an empty `UserContext` — verify no personalisation section
- `addToCart` tool with a missing wallet address — verify error result
- `addToCart` tool on cart service failure — verify error result shape
- `generateQuickPrompts` with an empty profile — verify generic fallback set
- `InlineProductCard` button disabled during loading state
- `InlineProductCard` success state reverts after 1500ms
- `InlineProductCard` error state reverts after 1500ms
- `InlineProductCard` invalidates cart query on success
- `MarkdownMessage` renders `<strong>` for `**bold**`
- `MarkdownMessage` renders `<em>` for `*italic*`
- `MarkdownMessage` renders `<ul>` for `- list`
- `MarkdownMessage` renders `<ol>` for `1. list`

### Property-Based Tests (fast-check)

The backend already uses `fast-check` (in `devDependencies`). Frontend property tests use Vitest + `fast-check`.

**Property 1** — `buildSystemPrompt` field containment:
```
fc.record({
  aesthetic: fc.option(fc.string()),
  shopFor: fc.option(fc.string()),
  size: fc.option(fc.string()),
  musdBalance: fc.option(fc.float({ min: 0 })),
})
```
For each generated context, assert present fields appear in the prompt and absent fields do not introduce fabricated values.
**Tag: Feature: ai-stylist-enhancement, Property 1: system prompt contains all present UserContext fields**

**Property 2** — `addToCart` quantity invariant:
```
fc.record({
  productId: fc.string({ minLength: 1 }),
  size: fc.option(fc.string()),
  color: fc.option(fc.string()),
})
```
Mock `cartService.add`. Assert it is always called with `quantity: 1`.
**Tag: Feature: ai-stylist-enhancement, Property 2: addToCart tool always passes quantity 1**

**Property 3** — `addToCart` success message contains product name:
```
fc.string({ minLength: 1 })  // product name
```
Mock `cartService.add` to succeed and `productService.getById` to return a product with the generated name. Assert the return value's confirmation message contains the name.
**Tag: Feature: ai-stylist-enhancement, Property 3: addToCart success response contains product name**

**Property 4** — `generateQuickPrompts` always returns 4:
```
fc.record({
  aesthetic: fc.option(fc.string()),
  shopFor: fc.option(fc.string()),
  musdBalance: fc.option(fc.string()),
})
```
Assert `generateQuickPrompts(ctx).length === 4`.
**Tag: Feature: ai-stylist-enhancement, Property 4: quick prompts always return exactly four items**

**Property 5** — `generateQuickPrompts` is deterministic:
Same generator as Property 4. Call twice, assert deep equality.
**Tag: Feature: ai-stylist-enhancement, Property 5: quick prompts are deterministic**

**Property 6** — `generateQuickPrompts` references present fields:
Generate contexts where `aesthetic`, `shopFor`, and `musdBalance` are each independently present. Assert at least one prompt contains the value.
**Tag: Feature: ai-stylist-enhancement, Property 6: quick prompts reference present profile fields**

**Property 7** — Markdown renderer hides raw syntax:
```
fc.array(fc.oneof(
  fc.string().map(s => `**${s}**`),
  fc.string().map(s => `*${s}*`),
  fc.string().map(s => `- ${s}`),
), { minLength: 1 })
```
Render with `MarkdownMessage`, assert raw delimiters not present in text content.
**Tag: Feature: ai-stylist-enhancement, Property 7: markdown renderer does not expose raw syntax**

**Property 8** — XSS prevention:
```
fc.array(fc.oneof(
  fc.constant('<script>alert(1)</script>'),
  fc.string().map(s => `<img onerror="${s}">`),
  fc.string().map(s => `<a href="javascript:${s}">`),
))
```
Render with `MarkdownMessage`, assert no `<script>` tags or `onerror` attributes in rendered DOM.
**Tag: Feature: ai-stylist-enhancement, Property 8: markdown renderer escapes HTML tags**

**Property 9** — Plain text round-trip:
```
fc.string().filter(s => !/[*_`#\[\]!<>]/.test(s))  // no markdown chars
```
Render with `MarkdownMessage`, assert text content equals input (trimmed).
**Tag: Feature: ai-stylist-enhancement, Property 9: plain text round-trip**

### Integration Tests

- End-to-end: POST `/api/chat` with `userContext` → verify `X-Session-Id` header returned and stream begins
- `addToCart` tool invocation via a real chat request with a mocked cart service
- Inline product card "Add to Cart" → verify cart item appears in `GET /api/cart`
