import { randomUUID } from "crypto";
import type { UIMessage } from "ai";
import { db } from "../db/client";

export interface ChatSession {
  walletAddress: string;
  messages: UIMessage[];
}

export interface SessionService {
  createSession(walletAddress: string): string;
  getSession(sessionId: string): ChatSession | null;
  appendMessages(sessionId: string, messages: UIMessage[]): void;
}

interface SessionRow {
  session_id: string;
  wallet_address: string;
  messages_json: string;
  created_at: string;
  updated_at: string;
}

class PersistentSessionService implements SessionService {
  /**
   * Creates a new session for the given wallet address, persisted to SQLite.
   * @returns The generated session UUID.
   */
  createSession(walletAddress: string): string {
    const sessionId = randomUUID();
    const now = new Date().toISOString();
    db.query<void, [string, string, string, string]>(
      `INSERT INTO chat_sessions (session_id, wallet_address, messages_json, created_at, updated_at)
       VALUES (?, ?, '[]', ?, ?)`
    ).run(sessionId, walletAddress, now, now);
    return sessionId;
  }

  /**
   * Returns the session for the given sessionId, or null if not found.
   */
  getSession(sessionId: string): ChatSession | null {
    const row = db
      .query<SessionRow, [string]>(
        "SELECT * FROM chat_sessions WHERE session_id = ?"
      )
      .get(sessionId);
    if (!row) return null;
    return {
      walletAddress: row.wallet_address,
      messages: JSON.parse(row.messages_json) as UIMessage[],
    };
  }

  /**
   * Appends messages to the session's message history and persists to SQLite.
   * No-op if the session does not exist.
   */
  appendMessages(sessionId: string, messages: UIMessage[]): void {
    const session = this.getSession(sessionId);
    if (!session) return;
    const updated = [...session.messages, ...messages];
    const now = new Date().toISOString();
    db.query<void, [string, string, string]>(
      "UPDATE chat_sessions SET messages_json = ?, updated_at = ? WHERE session_id = ?"
    ).run(JSON.stringify(updated), now, sessionId);
  }
}

export const sessionService = new PersistentSessionService();
