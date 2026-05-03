/**
 * useChat — manages streaming chat with the MezoShop backend agent.
 *
 * Uses a manual SSE fetch (NOT the AI SDK useChat hook) pointed at
 * VITE_API_URL/api/chat. Attaches X-Wallet-Address on every request
 * and persists the sessionId from the X-Session-Id response header.
 *
 * The backend uses AI SDK's toDataStreamResponse() which sends the
 * Vercel AI SDK data stream format:
 *   0:"text chunk"   — text delta
 *   2:[{...}]        — data (tool results, etc.)
 *   3:"error msg"    — error
 *   d:{...}          — finish signal
 *
 * Requirements: 3.1, 3.2, 9.1, 9.2
 */

import { useState, useCallback, useRef } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProductResult {
  id: string;
  name: string;
  brand: string;
  category: string;
  musd: number;
  tag: string;
  description: string;
  images: string[];
  colors?: string[];
  sizes?: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  products?: ProductResult[];
}

export interface UserContext {
  aesthetic?: string;
  shopFor?: string;
  size?: string;
  musdBalance?: number;
}

export interface UseChatReturn {
  messages: ChatMessage[];
  isStreaming: boolean;
  sessionId: string | null;
  error: string | null;
  sendMessage: (text: string, userContext?: UserContext) => Promise<void>;
  reset: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Parse a single line from the Vercel AI SDK data stream.
 *
 * Stream line prefixes:
 *   0:"text"      — text delta
 *   2:[{...}]     — message parts (tool calls, tool results, etc.)
 *   3:"error"     — error
 *   d:{...}       — finish signal
 */
function parseStreamLine(
  line: string,
):
  | { type: 'text'; chunk: string }
  | { type: 'products'; products: ProductResult[] }
  | { type: 'finish' }
  | { type: 'error'; message: string }
  | null {
  if (!line.trim()) return null;

  // Text delta: 0:"json-encoded string"
  if (line.startsWith('0:')) {
    try {
      const chunk = JSON.parse(line.slice(2)) as string;
      return { type: 'text', chunk };
    } catch {
      return null;
    }
  }

  // Message parts / annotations: 2:[{...}, ...]
  // StreamData.append() sends data as: 2:[{"products":[...]}]
  if (line.startsWith('2:')) {
    try {
      const items = JSON.parse(line.slice(2)) as Array<{ products?: ProductResult[] }>;
      const products: ProductResult[] = [];
      for (const item of items) {
        if (Array.isArray(item?.products)) {
          for (const p of item.products) {
            products.push({ ...p, id: String(p.id) });
          }
        }
      }
      if (products.length > 0) {
        return { type: 'products', products };
      }
    } catch {
      // malformed line — ignore
    }
    return null;
  }

  // Finish signal: d:{...}
  if (line.startsWith('d:')) {
    return { type: 'finish' };
  }

  // Error: 3:"error message"
  if (line.startsWith('3:')) {
    try {
      const message = JSON.parse(line.slice(2)) as string;
      return { type: 'error', message };
    } catch {
      return { type: 'error', message: 'Unknown stream error' };
    }
  }

  return null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useChat(walletAddress: string | undefined): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Keep a ref to the current messages so sendMessage closure always sees latest
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;

  const sendMessage = useCallback(
    async (text: string, userContext?: UserContext): Promise<void> => {
      if (!text.trim() || isStreaming) return;

      setError(null);
      setIsStreaming(true);

      // 1. Append the user message immediately
      const userMessage: ChatMessage = {
        id: generateId(),
        role: 'user',
        content: text,
      };

      setMessages((prev) => [...prev, userMessage]);

      // 2. Build the request body — backend expects UIMessage format
      const requestMessages = [
        ...messagesRef.current,
        userMessage,
      ].map((msg) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        parts: [{ type: 'text', text: msg.content }],
      }));

      // 3. Create a placeholder assistant message for streaming
      const assistantId = generateId();
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
      };
      setMessages((prev) => [...prev, assistantMessage]);

      try {
        const response = await fetch(`${BASE_URL}/api/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(walletAddress ? { 'X-Wallet-Address': walletAddress } : {}),
          },
          body: JSON.stringify({
            messages: requestMessages,
            ...(sessionId ? { sessionId } : {}),
            ...(userContext ? { userContext } : {}),
          }),
        });

        // Handle 5xx errors
        if (response.status >= 500) {
          setError('Shopping assistant is temporarily unavailable.');
          // Remove the empty assistant placeholder
          setMessages((prev) => prev.filter((m) => m.id !== assistantId));
          return;
        }

        // Handle other non-ok responses
        if (!response.ok) {
          await response.text().catch(() => null);
          // 400 usually means wallet address missing/invalid
          if (response.status === 400) {
            setError('Please make sure your wallet is connected before chatting.');
          } else {
            setError(`Chat request failed (${response.status}). Please try again.`);
          }
          setMessages((prev) => prev.filter((m) => m.id !== assistantId));
          return;
        }

        // 4. Capture session ID from response header
        const newSessionId = response.headers.get('X-Session-Id');
        if (newSessionId) {
          setSessionId(newSessionId);
        }

        // 5. Read the SSE stream line by line
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Response body is not readable');
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let accumulatedText = '';
        const accumulatedProducts: ProductResult[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete lines
          const lines = buffer.split('\n');
          // Keep the last (potentially incomplete) line in the buffer
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const parsed = parseStreamLine(line);
            if (!parsed) continue;

            if (parsed.type === 'text') {
              accumulatedText += parsed.chunk;
              // Update the assistant message in real-time
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: accumulatedText }
                    : m,
                ),
              );
            } else if (parsed.type === 'products') {
              // Merge new products, deduplicating by id
              for (const p of parsed.products) {
                if (!accumulatedProducts.find((existing) => existing.id === p.id)) {
                  accumulatedProducts.push(p);
                }
              }
              // Attach products to the assistant message immediately
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, products: [...accumulatedProducts] }
                    : m,
                ),
              );
            } else if (parsed.type === 'error') {
              setError(parsed.message || 'Shopping assistant is temporarily unavailable.');
            }
            // 'finish' type — stream is done, handled by reader.done
          }
        }

        // Process any remaining buffer content
        if (buffer.trim()) {
          const parsed = parseStreamLine(buffer);
          if (parsed?.type === 'text') {
            accumulatedText += parsed.chunk;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: accumulatedText }
                  : m,
              ),
            );
          } else if (parsed?.type === 'products') {
            for (const p of parsed.products) {
              if (!accumulatedProducts.find((existing) => existing.id === p.id)) {
                accumulatedProducts.push(p);
              }
            }
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, products: [...accumulatedProducts] }
                  : m,
              ),
            );
          }
        }

        // 6. Finalize: if no content was streamed and no products, remove the placeholder
        if (!accumulatedText && accumulatedProducts.length === 0) {
          setMessages((prev) => prev.filter((m) => m.id !== assistantId));
        }
      } catch (err) {
        // Network errors or unexpected failures
        const message =
          err instanceof Error ? err.message : 'Unknown error occurred';

        // Check if it looks like a server error
        if (
          message.includes('500') ||
          message.includes('502') ||
          message.includes('503') ||
          message.includes('504') ||
          message.includes('fetch') ||
          message.includes('network') ||
          message.toLowerCase().includes('failed to fetch')
        ) {
          setError('Shopping assistant is temporarily unavailable.');
        } else {
          setError(message);
        }

        // Remove the empty assistant placeholder on error
        setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      } finally {
        setIsStreaming(false);
      }
    },
    [isStreaming, sessionId, walletAddress],
  );

  const reset = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    setError(null);
    setIsStreaming(false);
  }, []);

  return { messages, isStreaming, sessionId, error, sendMessage, reset };
}
