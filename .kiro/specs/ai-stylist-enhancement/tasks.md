# Implementation Plan: AI Stylist Enhancement

## Overview

Enhance the MezoShop AI Stylist with personalised context injection, an `addToCart` AI tool, markdown rendering, wired inline product card actions, and dynamic quick prompts. Changes span `backend/src/routes/chat.ts` and the frontend (`src/hooks/useChat.ts`, `src/pages/Dashboard.tsx`). All new pure functions are extracted for independent testability. Backend property tests use Bun + fast-check; frontend property tests use Vitest + fast-check.

## Tasks

- [x] 1. Set up frontend test infrastructure
  - Add `vitest`, `@vitest/ui`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, and `fast-check` to frontend `devDependencies` in `package.json`
  - Add a `test` script to `package.json`: `"test": "vitest --run"`
  - Add a `vitest.config.ts` (or extend `vite.config.ts`) with `environment: 'jsdom'` and `setupFiles` pointing to a test setup file
  - Create `src/__tests__/setup.ts` that imports `@testing-library/jest-dom`
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.6, 7.5, 7.6_

- [x] 2. Backend — extract `buildSystemPrompt` pure function
  - [x] 2.1 Implement `buildSystemPrompt(userContext: UserContext): string` in `backend/src/routes/chat.ts`
    - Define the `UserContext` interface (`aesthetic?`, `shopFor?`, `size?`, `musdBalance?`)
    - Write the base identity section (always present): Bitcoin-native personal stylist identity, instructs markdown use, opinionated recommendations, MUSD as currency, use `addToCart` when user wants to purchase
    - Append a `--- User Context ---` personalisation block only when at least one field is present; each present field adds exactly one sentence; absent fields add nothing
    - Replace the existing `SYSTEM_PROMPT` constant with a call to `buildSystemPrompt` (passing an empty object initially)
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 2.5, 8.6_

  - [ ]* 2.2 Write property test for `buildSystemPrompt` field containment
    - Create `backend/tests/chat.property.test.ts`
    - **Property 1: System prompt contains all present UserContext fields**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 8.6**
    - Generate arbitrary `UserContext` objects with `fc.record` using `fc.option` for each field
    - For each generated context: assert every present field's value appears in the returned string; assert no fabricated values appear for absent fields (check that the personalisation block is absent when all fields are absent)

- [x] 3. Backend — implement `addToCart` AI SDK tool
  - [x] 3.1 Import `cartService` and `productService` into `backend/src/routes/chat.ts`
    - Add `import { cartService } from '../services/cart-service'` and `import { productService } from '../services/product-service'` (already imported — verify and keep)
    - Define the `addToCart` tool using the AI SDK `tool()` helper, closing over `walletAddress` from the Hono context
    - Parameters: `productId: z.string()`, `size: z.string().optional()`, `color: z.string().optional()`
    - In `execute`: call `cartService.add(walletAddress, { productId, quantity: 1, size, color })`, then `productService.getById(productId)` to get the product name
    - On success: return `{ success: true, productName: product?.name ?? productId, message: \`Added \${name} to your cart.\` }`
    - On failure: return `{ success: false, error: 'Could not add item to cart. Please try the cart button on the product card.' }`
    - If `walletAddress` is absent: return `{ success: false, error: 'Please connect your wallet to add items to your cart.' }`
    - Register `addToCart` in the `tools` object passed to `streamText`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.6_

  - [ ]* 3.2 Write property test for `addToCart` quantity invariant
    - In `backend/tests/chat.property.test.ts`
    - **Property 2: `addToCart` tool always passes quantity 1**
    - **Validates: Requirements 3.2**
    - Extract the `addToCart` execute function into a testable unit (or test via the exported function)
    - Mock `cartService.add` to capture the call arguments
    - Generate arbitrary `{ productId, size, color }` inputs with `fc.record`
    - Assert `cartService.add` is always called with `quantity: 1` and the exact provided `productId`, `size`, `color`

  - [ ]* 3.3 Write property test for `addToCart` success message contains product name
    - In `backend/tests/chat.property.test.ts`
    - **Property 3: `addToCart` success response contains product name**
    - **Validates: Requirements 3.3**
    - Generate arbitrary product name strings with `fc.string({ minLength: 1 })`
    - Mock `cartService.add` to succeed and `productService.getById` to return a product with the generated name
    - Assert the returned result's `message` (or confirmation field) contains the product name

- [x] 4. Backend — extend request body schema to accept `userContext`
  - Add a Zod schema for `UserContext` in `backend/src/routes/chat.ts`:
    ```ts
    const userContextSchema = z.object({
      aesthetic: z.string().optional(),
      shopFor: z.string().optional(),
      size: z.string().optional(),
      musdBalance: z.number().optional(),
    }).optional();
    ```
  - Extend the request body parsing to include `userContext` alongside `messages` and `sessionId`
  - Pass the parsed `userContext` (or `{}` if absent) to `buildSystemPrompt` so the `system` parameter is personalised per request
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 5. Checkpoint — backend tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Frontend — implement `generateQuickPrompts` pure function
  - [x] 6.1 Implement `generateQuickPrompts(ctx: QuickPromptContext): [string, string, string, string]` in `src/pages/Dashboard.tsx`
    - Define the `QuickPromptContext` interface (`aesthetic?`, `shopFor?`, `musdBalance?` as string)
    - Slot 0: if `aesthetic` present → `"Find me ${aesthetic} pieces"`, else `"Find me a luxury coat"`
    - Slot 1: if `shopFor` present → `"Best ${shopFor} looks this season"`, else `"Show me designer bags"`
    - Slot 2: if `musdBalance` present → `"What can I get for ${musdBalance} MUSD?"`, else `"Best watches under 15k MUSD"`
    - Slot 3: always `"New runway drops"`
    - Extract the function above the component definition so it is importable for tests
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [ ]* 6.2 Write property test for `generateQuickPrompts` always returns 4
    - Create `src/__tests__/generateQuickPrompts.property.test.ts`
    - **Property 4: Quick prompts always return exactly four items**
    - **Validates: Requirements 7.5**
    - Generate arbitrary `QuickPromptContext` objects (all fields optional) with `fc.record` + `fc.option`
    - Assert `generateQuickPrompts(ctx).length === 4` and every element is a non-empty string

  - [ ]* 6.3 Write property test for `generateQuickPrompts` is deterministic
    - In `src/__tests__/generateQuickPrompts.property.test.ts`
    - **Property 5: Quick prompts are deterministic**
    - **Validates: Requirements 7.6**
    - Same generator as Property 4
    - Call `generateQuickPrompts(ctx)` twice with the same input; assert deep equality

  - [ ]* 6.4 Write property test for `generateQuickPrompts` references present fields
    - In `src/__tests__/generateQuickPrompts.property.test.ts`
    - **Property 6: Quick prompts reference present profile fields**
    - **Validates: Requirements 7.1, 7.2, 7.3**
    - Generate contexts where `aesthetic` is a non-empty string; assert at least one prompt contains the `aesthetic` value
    - Repeat independently for `shopFor` and `musdBalance`

- [x] 7. Frontend — implement `MarkdownMessage` component
  - [x] 7.1 Install `react-markdown`, `rehype-sanitize`, and `remark-gfm` as frontend dependencies
    - Run `npm install react-markdown rehype-sanitize remark-gfm` in the workspace root
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.6_

  - [x] 7.2 Create `src/components/MarkdownMessage.tsx`
    - Define `MarkdownMessageProps { content: string; className?: string }`
    - Render using `<ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>`
    - Apply existing message bubble prose styles via `className` prop (font size, line height, colour matching the current `<p>` tag in Dashboard)
    - Wrap in a React error boundary; on error fall back to `<p>{content}</p>`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8_

  - [ ]* 7.3 Write property test for markdown renderer hides raw syntax
    - Create `src/__tests__/MarkdownMessage.property.test.ts`
    - **Property 7: Markdown renderer does not expose raw syntax**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**
    - Use `@testing-library/react` to render `MarkdownMessage`
    - Generate strings containing `**bold**`, `*italic*`, `- list item`, `1. ordered` patterns
    - Assert the rendered text content does not contain the raw delimiters (`**`, `- `, `1. `) as literal visible text

  - [ ]* 7.4 Write property test for markdown renderer XSS prevention
    - In `src/__tests__/MarkdownMessage.property.test.ts`
    - **Property 8: Markdown renderer escapes HTML tags (XSS prevention)**
    - **Validates: Requirements 6.6**
    - Generate strings containing `<script>alert(1)</script>`, `<img onerror="...">`, `<a href="javascript:...">`
    - Assert the rendered DOM contains no `<script>` elements and no `onerror` attributes

  - [ ]* 7.5 Write property test for plain text round-trip
    - In `src/__tests__/MarkdownMessage.property.test.ts`
    - **Property 9: Plain text round-trip**
    - **Validates: Requirements 6.7**
    - Generate strings with no markdown characters (filter out `*`, `_`, `` ` ``, `#`, `[`, `]`, `!`, `<`, `>`)
    - Assert the rendered text content equals the input string (trimmed)

- [x] 8. Frontend — enhance `useChat` hook to accept `userContext`
  - In `src/hooks/useChat.ts`:
    - Define a `UserContext` interface (`aesthetic?`, `shopFor?`, `size?`, `musdBalance?` as number)
    - Update `UseChatReturn.sendMessage` signature to `sendMessage: (text: string, userContext?: UserContext) => Promise<void>`
    - In the `sendMessage` implementation, include `userContext` in the `fetch` body alongside `messages` and `sessionId` (only when defined)
    - _Requirements: 1.5, 8.1, 8.2_

- [x] 9. Frontend — wire `InlineProductCard` with Add to Cart and View Product
  - In `src/pages/Dashboard.tsx`, update the `InlineProductCard` component:
    - Add props: `walletAddress: string | undefined`, `onAddToCart: (productId: string) => Promise<void>`, `onNavigate: (productId: string) => void`
    - Add local state: `status: 'idle' | 'loading' | 'success' | 'error'`
    - Wire the "Add to Cart" button: call `onAddToCart(product.id)`, set `status` to `'loading'` while in flight, `'success'` on resolve, `'error'` on reject; revert to `'idle'` after 1500ms for both success and error states
    - Disable the button while `status === 'loading'`
    - Show "Added ✓" text on `'success'` state and "Failed — retry" on `'error'` state
    - Add a "View Product" button: always visible on touch (use `@media (hover: none)` or a `touch` CSS class), visible on hover on desktop; calls `onNavigate(product.id)`
    - Make the product image and name also call `onNavigate(product.id)` on click
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4_

- [x] 10. Frontend — update Dashboard to wire everything together
  - In `src/pages/Dashboard.tsx`:
    - Import and call `useAuth()` to get `getProfile()`; read `profile.aesthetic`, `profile.shopFor`, `profile.size`
    - Read `musdFormatted` from `useWalletBalances()` (already imported) and pass it as `musdBalance` string to `generateQuickPrompts`
    - Replace the static `quickPrompts` array with `generateQuickPrompts({ aesthetic: profile.aesthetic, shopFor: profile.shopFor, musdBalance: musdFormatted })`
    - Build a `userContext` object from `profile` and the raw numeric MUSD balance (use `useWalletBalances` raw value if available, otherwise omit `musdBalance`)
    - Update the `handleSendMessage` call to pass `userContext` as the second argument: `await sendMessage(text, userContext)`
    - Replace the `<p>` tag inside assistant message bubbles with `<MarkdownMessage content={msg.content} className="text-sm text-mezo-ink/80 leading-relaxed" />`
    - In `renderMessage`, pass `walletAddress`, an `onAddToCart` handler (calls `backendClient.addCartItem` then `queryClient.invalidateQueries({ queryKey: ['cart'] })`), and an `onNavigate` handler (calls `navigate(\`/products/${productId}\`)`) to each `InlineProductCard`
    - _Requirements: 1.5, 1.6, 1.7, 2.6, 4.5, 5.2, 5.4, 7.1, 7.2, 7.3, 7.4, 9.1, 9.2, 9.3, 9.4_

- [x] 11. Final checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Backend tests run with `bun test` inside the `backend/` directory
- Frontend tests run with `npm test` (Vitest `--run` mode) in the workspace root
- Property tests validate universal correctness properties; unit tests validate specific examples and edge cases
- The `addToCart` tool bypasses HTTP and calls `cartService.add` directly to avoid re-authentication overhead
- `MarkdownMessage` uses `rehype-sanitize` (not a custom allowlist) to ensure XSS safety without new security surface area
