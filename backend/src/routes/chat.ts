import { Hono } from "hono";
import { streamText, tool, appendResponseMessages, convertToCoreMessages } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import type { UIMessage } from "ai";
import { walletAuth } from "../middleware/wallet-auth";
import type { WalletAuthVariables } from "../middleware/wallet-auth";
import { sessionService } from "../services/session-service";
import { productService } from "../services/product-service";
import { env } from "../lib/env";

// Initialise Gemini provider with the API key from env
const googleAI = createGoogleGenerativeAI({ apiKey: env.GEMINI_API_KEY });
const model = googleAI("gemini-1.5-flash");

const SYSTEM_PROMPT = `You are a helpful and knowledgeable fashion shopping assistant for MezoShop, a premium fashion store on the Mezo blockchain.

Your role is to help users discover and explore fashion products from our curated catalog. You can search for products by name, brand, category, or price range, and provide detailed information about specific items.

Guidelines:
- Be friendly, enthusiastic, and knowledgeable about fashion
- When users ask about products, use the searchProducts tool to find relevant items
- When users want details about a specific product, use the getProductDetails tool
- Present product information clearly, including name, brand, price (in MUSD), and description
- Suggest complementary items when appropriate
- All prices are in MUSD (Mezo USD stablecoin)
- If you cannot find what the user is looking for, suggest alternatives or ask clarifying questions`;

export const chatRouter = new Hono<{ Variables: WalletAuthVariables }>();

// Apply wallet auth middleware
chatRouter.use("*", walletAuth);

chatRouter.post("/", async (c) => {
  const walletAddress = c.get("walletAddress");

  // Parse request body
  let body: { messages: UIMessage[]; sessionId?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  const { messages, sessionId: requestedSessionId } = body;

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
        query: z.string().describe("Search query (product name, type, style, etc.)"),
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
  };

  // --- Stream LLM response ---
  const result = streamText({
    model,
    system: SYSTEM_PROMPT,
    messages: coreMessages,
    tools,
    maxSteps: 3, // equivalent to stopWhen: stepCountIs(3)
    onFinish: async ({ response }) => {
      // Append the new messages (user message + assistant response) to session history
      const updatedMessages = appendResponseMessages({
        messages: allMessages,
        responseMessages: response.messages,
      });
      // Replace session messages with the full updated history
      // (appendResponseMessages returns the full array including prior messages)
      const newMessages = updatedMessages.slice(allMessages.length) as UIMessage[];
      sessionService.appendMessages(sessionId, [latestUserMessage, ...newMessages]);
    },
  });

  // Set the session ID header and return the SSE stream
  c.header("X-Session-Id", sessionId);
  return result.toDataStreamResponse();
});
