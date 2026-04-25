import { randomUUID } from "crypto";
import type { UIMessage } from "ai";

export interface ChatSession {
  walletAddress: string;
  messages: UIMessage[];
}

export interface SessionService {
  createSession(walletAddress: string): string;
  getSession(sessionId: string): ChatSession | null;
  appendMessages(sessionId: string, messages: UIMessage[]): void;
}

class InMemorySessionService implements SessionService {
  private sessions = new Map<string, ChatSession>();

  /**
   * Creates a new session for the given wallet address.
   * @returns The generated session UUID.
   */
  createSession(walletAddress: string): string {
    const sessionId = randomUUID();
    this.sessions.set(sessionId, { walletAddress, messages: [] });
    return sessionId;
  }

  /**
   * Returns the session for the given sessionId, or null if not found.
   */
  getSession(sessionId: string): ChatSession | null {
    return this.sessions.get(sessionId) ?? null;
  }

  /**
   * Appends messages to the session's message history.
   * No-op if the session does not exist.
   */
  appendMessages(sessionId: string, messages: UIMessage[]): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;
    session.messages.push(...messages);
  }
}

export const sessionService = new InMemorySessionService();
