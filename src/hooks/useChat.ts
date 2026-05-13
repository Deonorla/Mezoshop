/**
 * useChat — manages streaming chat with the MezoShop backend agent.
 *
 * Chat state (messages + sessionId) is stored in TanStack Query cache
 * keyed by wallet address, so it persists across navigation.
 */

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

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
  recentSearches: string[];
  sendMessage: (text: string, userContext?: UserContext) => Promise<void>;
  reset: () => void;
}

interface ChatState {
  messages: ChatMessage[];
  sessionId: string | null;
  isStreaming: boolean;
  error: string | null;
  recentSearches: string[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3001';
const MAX_RECENT_SEARCHES = 5;

function chatKey(walletAddress: string | undefined) {
  return ['chat', walletAddress ?? 'anonymous'];
}

function defaultState(): ChatState {
  return {
    messages: [],
    sessionId: null,
    isStreaming: false,
    error: null,
    recentSearches: [],
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function parseStreamLine(
  line: string,
):
  | { type: 'text'; chunk: string }
  | { type: 'products'; products: ProductResult[] }
  | { type: 'finish' }
  | { type: 'error'; message: string }
  | null {
  if (!line.trim()) return null;

  if (line.startsWith('0:')) {
    try {
      const chunk = JSON.parse(line.slice(2)) as string;
      return { type: 'text', chunk };
    } catch {
      return null;
    }
  }

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
      if (products.length > 0) return { type: 'products', products };
    } catch {
      // ignore
    }
    return null;
  }

  if (line.startsWith('d:')) return { type: 'finish' };

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
  const qc = useQueryClient();
  const key = chatKey(walletAddress);

  // Read state from cache — defaults to empty state if not yet set
  const state: ChatState = qc.getQueryData<ChatState>(key) ?? defaultState();

  function setState(updater: (prev: ChatState) => ChatState) {
    qc.setQueryData<ChatState>(key, (prev) => updater(prev ?? defaultState()));
  }

  const sendMessage = useCallback(
    async (text: string, userContext?: UserContext): Promise<void> => {
      const current = qc.getQueryData<ChatState>(key) ?? defaultState();
      if (!text.trim() || current.isStreaming) return;

      // Update recent searches (deduplicated, max 5, newest first)
      const updatedSearches = [
        text,
        ...current.recentSearches.filter((s) => s !== text),
      ].slice(0, MAX_RECENT_SEARCHES);

      // 1. Append user message + set streaming
      const userMessage: ChatMessage = { id: generateId(), role: 'user', content: text };
      const assistantId = generateId();
      const assistantMessage: ChatMessage = { id: assistantId, role: 'assistant', content: '' };

      setState((prev) => ({
        ...prev,
        error: null,
        isStreaming: true,
        recentSearches: updatedSearches,
        messages: [...prev.messages, userMessage, assistantMessage],
      }));

      try {
        const currentMessages = (qc.getQueryData<ChatState>(key) ?? defaultState()).messages;
        const requestMessages = currentMessages
          .filter((m) => m.id !== assistantId) // exclude the empty placeholder
          .map((msg) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            parts: [{ type: 'text', text: msg.content }],
          }));

        const sessionId = (qc.getQueryData<ChatState>(key) ?? defaultState()).sessionId;

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

        if (response.status >= 500) {
          setState((prev) => ({
            ...prev,
            isStreaming: false,
            error: 'Shopping assistant is temporarily unavailable.',
            messages: prev.messages.filter((m) => m.id !== assistantId),
          }));
          return;
        }

        if (!response.ok) {
          await response.text().catch(() => null);
          setState((prev) => ({
            ...prev,
            isStreaming: false,
            error: response.status === 400
              ? 'Please make sure your wallet is connected before chatting.'
              : `Chat request failed (${response.status}). Please try again.`,
            messages: prev.messages.filter((m) => m.id !== assistantId),
          }));
          return;
        }

        const newSessionId = response.headers.get('X-Session-Id');
        if (newSessionId) {
          setState((prev) => ({ ...prev, sessionId: newSessionId }));
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error('Response body is not readable');

        const decoder = new TextDecoder();
        let buffer = '';
        let accumulatedText = '';
        const accumulatedProducts: ProductResult[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            const parsed = parseStreamLine(line);
            if (!parsed) continue;

            if (parsed.type === 'text') {
              accumulatedText += parsed.chunk;
              setState((prev) => ({
                ...prev,
                messages: prev.messages.map((m) =>
                  m.id === assistantId ? { ...m, content: accumulatedText } : m,
                ),
              }));
            } else if (parsed.type === 'products') {
              for (const p of parsed.products) {
                if (!accumulatedProducts.find((e) => e.id === p.id)) {
                  accumulatedProducts.push(p);
                }
              }
              setState((prev) => ({
                ...prev,
                messages: prev.messages.map((m) =>
                  m.id === assistantId ? { ...m, products: [...accumulatedProducts] } : m,
                ),
              }));
            } else if (parsed.type === 'error') {
              setState((prev) => ({
                ...prev,
                error: parsed.message || 'Shopping assistant is temporarily unavailable.',
              }));
            }
          }
        }

        // Process remaining buffer
        if (buffer.trim()) {
          const parsed = parseStreamLine(buffer);
          if (parsed?.type === 'text') {
            accumulatedText += parsed.chunk;
            setState((prev) => ({
              ...prev,
              messages: prev.messages.map((m) =>
                m.id === assistantId ? { ...m, content: accumulatedText } : m,
              ),
            }));
          }
        }

        // Remove placeholder if nothing was streamed
        if (!accumulatedText && accumulatedProducts.length === 0) {
          setState((prev) => ({
            ...prev,
            messages: prev.messages.filter((m) => m.id !== assistantId),
          }));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error occurred';
        setState((prev) => ({
          ...prev,
          error: message.toLowerCase().includes('fetch') || message.toLowerCase().includes('network')
            ? 'Shopping assistant is temporarily unavailable.'
            : message,
          messages: prev.messages.filter((m) => m.id !== assistantId),
        }));
      } finally {
        setState((prev) => ({ ...prev, isStreaming: false }));
      }
    },
    [walletAddress, qc, key],
  );

  const reset = useCallback(() => {
    setState((prev) => ({
      ...defaultState(),
      // Keep recent searches across resets
      recentSearches: prev.recentSearches,
    }));
  }, [qc, key]);

  return {
    messages: state.messages,
    isStreaming: state.isStreaming,
    sessionId: state.sessionId,
    error: state.error,
    recentSearches: state.recentSearches,
    sendMessage,
    reset,
  };
}
