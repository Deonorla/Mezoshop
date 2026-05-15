import { Hono } from "hono";
import { streamText, tool, appendResponseMessages, convertToCoreMessages, StreamData } from "ai";
import type { JSONValue } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import type { UIMessage } from "ai";
import { walletAuth } from "../middleware/wallet-auth";
import type { WalletAuthVariables } from "../middleware/wallet-auth";
import { sessionService } from "../services/session-service";
import { productService } from "../services/product-service";
import { cartService } from "../services/cart-service";
import { env } from "../lib/env";

// Initialise Gemini provider with the API key from env
const googleAI = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY });
const model = googleAI("gemini-2.5-flash");

export interface UserContext {
  aesthetic?: string;
  shopFor?: string;
  size?: string;
  musdBalance?: number;
}

export function buildSystemPrompt(ctx: UserContext): string {
  const base = `You are a Bitcoin-native personal stylist for MezoShop — the premier fashion destination on the Mezo blockchain.

Your role is to deliver opinionated, fashion-forward recommendations that help users look and feel their best. You have a sharp eye for style, deep knowledge of current trends, and the confidence to tell users exactly what works.

**Formatting guidelines:**
- Use **bold** for product names and key style terms
- Use bullet lists when presenting multiple options or outfit components
- Keep responses concise but impactful — quality over quantity
- NEVER mention image paths, file names, or URLs in your text responses — the UI renders product images automatically from tool results

**Tool use rules — CRITICAL:**
- You MUST call \`searchProducts\` every time a user asks to see, find, browse, or shop for products — no exceptions
- NEVER describe or list products from memory — always call \`searchProducts\` first, then recommend from the actual results
- If \`searchProducts\` returns no results, try again with a broader query (e.g. use category only, or empty query)
- NEVER say you are "having trouble with the search engine" — just retry with a simpler query
- When a user asks for images or wants to see a product, call \`searchProducts\` — the UI will display the images automatically
- When a user wants to purchase an item, use the \`addToCart\` tool immediately — don't just suggest it

**Shopping guidelines:**
- All prices are in MUSD (Mezo USD stablecoin)
- Use \`getProductDetails\` for detailed information on a specific product by ID
- Make bold, specific recommendations rather than hedging — if something suits the user, say so
- If you can't find an exact match, suggest the closest alternative and explain why it works`;

  const fields: string[] = [];

  if (ctx.aesthetic !== undefined && ctx.aesthetic !== null) {
    fields.push(`The user's style aesthetic is **${ctx.aesthetic}** — lean into this when making recommendations.`);
  }
  if (ctx.shopFor !== undefined && ctx.shopFor !== null) {
    fields.push(`The user is shopping for **${ctx.shopFor}** — focus your recommendations accordingly.`);
  }
  if (ctx.size !== undefined && ctx.size !== null) {
    fields.push(`The user's size is **${ctx.size}** — only recommend items available in this size when possible.`);
  }
  if (ctx.musdBalance !== undefined && ctx.musdBalance !== null) {
    const formatted = ctx.musdBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    fields.push(`The user has **${formatted} MUSD** available — prioritise items within their budget and acknowledge when something exceeds it.`);
  }

  if (fields.length === 0) {
    return base;
  }

  const personalisation = `\n\n--- User Context ---\n${fields.join("\n")}\n\nUse this context to personalise every recommendation. Make the user feel like you know their wardrobe personally.`;

  return base + personalisation;
}

const userContextSchema = z.object({
  aesthetic: z.string().optional(),
  shopFor: z.string().optional(),
  size: z.string().optional(),
  musdBalance: z.number().optional(),
}).optional();

export const chatRouter = new Hono<{ Variables: WalletAuthVariables }>();

// Apply wallet auth middleware
chatRouter.use("*", walletAuth);

chatRouter.post("/", async (c) => {
  const walletAddress = c.get("walletAddress");

  // Parse request body
  let body: { messages: UIMessage[]; sessionId?: string; userContext?: UserContext };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { messages, sessionId: requestedSessionId } = body;
  const parsedUserContext = userContextSchema.safeParse(body.userContext);
  const userContext: UserContext | undefined = parsedUserContext.success ? parsedUserContext.data : undefined;

  if (!Array.isArray(messages) || messages.length === 0) {
    return c.json({ error: "messages must be a non-empty array" }, 400);
  }

  // --- Session resolution ---
  let sessionId: string;

  if (!requestedSessionId) {
    // No sessionId provided — create a new session
    sessionId = sessionService.createSession(walletAddress);
  } else {
    // sessionId provided — look it up
    const session = sessionService.getSession(requestedSessionId);
    if (!session) {
      return c.json({ error: "Session not found" }, 404);
    }
    if (session.walletAddress !== walletAddress) {
      return c.json({ error: "Forbidden: session belongs to a different wallet" }, 403);
    }
    sessionId = requestedSessionId;
  }

  // Build full message history: prior session history + new messages from request
  const session = sessionService.getSession(sessionId)!;
  const historyMessages = session.messages;

  // Combine history with the new incoming messages (deduplicate by using history + request messages)
  // The request messages represent the full conversation from the client's perspective;
  // we use the session history as the authoritative prior context and append the latest user message.
  const latestUserMessage = messages[messages.length - 1];
  const allMessages: UIMessage[] = [...historyMessages, latestUserMessage];

  // Convert UIMessages to CoreMessages for the AI SDK
  const coreMessages = convertToCoreMessages(allMessages);

  // --- Define tools ---
  const tools = {
    searchProducts: tool({
      description:
        "Search for fashion products in the MezoShop catalog. Use this to find products matching a query, category, brand, or price range.",
      parameters: z.object({
        query: z.string().optional().default("").describe("Search query (product name, type, style, etc.). Use empty string to browse all products."),
        category: z
          .string()
          .optional()
          .describe(
            "Filter by category: Shoes, Dresses, Bags, Tops, Bottoms, Coats, Loungewear"
          ),
        brand: z.string().optional().describe("Filter by brand name"),
        minPrice: z.number().optional().describe("Minimum price in MUSD"),
        maxPrice: z.number().optional().describe("Maximum price in MUSD"),
        page: z.number().optional().describe("Page number (default 1)"),
        limit: z.number().optional().describe("Results per page (default 5, max 20)"),
      }),
      execute: async (params) => {
        try {
          const result = await productService.search(params);
          return result;
        } catch (error) {
          // Graceful fallback: return an error result so the LLM can respond gracefully
          return {
            products: [],
            total: 0,
            query: params.query,
            error: "Product search is temporarily unavailable. Please try again.",
          };
        }
      },
    }),

    getProductDetails: tool({
      description:
        "Get detailed information about a specific product by its ID.",
      parameters: z.object({
        id: z.string().describe("The product ID to look up"),
      }),
      execute: async ({ id }) => {
        const product = await productService.getById(id);
        if (!product) {
          return { error: `Product with ID "${id}" not found.` };
        }
        return product;
      },
    }),

    addToCart: tool({
      description:
        "Add a product to the user's cart. Use this immediately when the user wants to purchase or add an item.",
      parameters: z.object({
        productId: z.string().describe("The product ID to add to the cart"),
        size: z.string().optional().describe("The size of the product (if applicable)"),
        color: z.string().optional().describe("The color of the product (if applicable)"),
      }),
      execute: async ({ productId, size, color }) => {
        if (!walletAddress) {
          return { success: false, error: "Please connect your wallet to add items to your cart." };
        }
        try {
          await cartService.add(walletAddress, { productId, quantity: 1, size, color });
          const product = await productService.getById(productId);
          const name = product?.name ?? productId;
          return { success: true, productName: name, message: `Added ${name} to your cart.` };
        } catch {
          return { success: false, error: "Could not add item to cart. Please try the cart button on the product card." };
        }
      },
    }),
  };

  // StreamData lets us send product annotations alongside the text stream
  const streamData = new StreamData();

  // Collect products from tool results to send as stream annotations
  const collectedProducts: JSONValue[] = [];

  // --- Stream LLM response ---
  const result = streamText({
    onError: (error) => {
      console.error("[chat] streamText error:", error);
    },
    experimental_repairToolCall: async ({ toolCall }) => {
      // If query is missing, inject an empty string so the tool can still execute
      if (toolCall.toolName === "searchProducts") {
        const args = JSON.parse(toolCall.args ?? "{}");
        if (!args.query) {
          args.query = "";
          return { ...toolCall, args: JSON.stringify(args) };
        }
      }
      return null; // let other errors propagate normally
    },
    onStepFinish: ({ toolResults }) => {
      // Collect products from each tool step and append as annotations
      for (const tr of toolResults) {
        if (tr.toolName === "searchProducts") {
          const res = tr.result as { products?: JSONValue[] };
          if (Array.isArray(res?.products)) {
            for (const p of res.products) {
              const product = p as Record<string, JSONValue>;
              const id = String(product.id);
              if (!collectedProducts.find((x) => String((x as Record<string, JSONValue>).id) === id)) {
                collectedProducts.push({ ...product, id } as JSONValue);
              }
            }
          }
        }
        if (tr.toolName === "getProductDetails") {
          const res = tr.result as Record<string, JSONValue>;
          if (res && res.id && !res.error) {
            const id = String(res.id);
            if (!collectedProducts.find((x) => String((x as Record<string, JSONValue>).id) === id)) {
              collectedProducts.push({ ...res, id } as JSONValue);
            }
          }
        }
      }
      // Append current product list as annotation so frontend gets updates mid-stream
      if (collectedProducts.length > 0) {
        streamData.append({ products: collectedProducts } as JSONValue);
      }
    },
    model,
    system: buildSystemPrompt(userContext ?? {}),
    messages: coreMessages,
    tools,
    maxSteps: 3, // limit tool call chains to reduce latency
    onFinish: async ({ response }) => {
      // Close the StreamData so the stream can finish
      streamData.close();
      // Append the new messages (user message + assistant response) to session history
      const updatedMessages = appendResponseMessages({
        messages: allMessages,
        responseMessages: response.messages,
      });
      const newMessages = updatedMessages.slice(allMessages.length) as UIMessage[];
      sessionService.appendMessages(sessionId, [latestUserMessage, ...newMessages]);
    },
  });

  // Set the session ID header and return the SSE stream with product annotations
  c.header("X-Session-Id", sessionId);
  return result.toDataStreamResponse({ data: streamData });
});
