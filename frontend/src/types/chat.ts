// ─── Chat Message ────────────────────────────────────────────────────────────

export type MessageRole = "user" | "assistant";

export interface Message {
  /** Client-side UUID for React keys */
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  /** True when the message represents an API error */
  isError?: boolean;
}

// ─── Session ──────────────────────────────────────────────────────────────────

export interface ChatSession {
  session_id: string;
  title: string;
  created_at?: string;
}

// ─── API Payloads / Responses ─────────────────────────────────────────────────

/** POST /api/chat/session → body */
export interface CreateSessionPayload {
  title?: string;
}

/** POST /api/chat/session → response */
export interface CreateSessionResponse {
  session_id: string;
  title: string;
}

/** POST /api/chat/{session_id} → body */
export interface SendMessagePayload {
  message: string;
}

/** POST /api/chat/{session_id} → response */
export interface ChatApiResponse {
  answer: string;
  session_id?: string;
}

/** POST /chat (simple fallback) → body */
export interface SimpleChatPayload {
  query: string;
}

/** GET /api/chat/{session_id}/history → single history item */
export interface HistoryMessage {
  id: string;
  role: MessageRole;
  content: string;
  created_at: string;
}

/** GET /api/chat/{session_id}/history → response */
export interface ChatHistoryResponse {
  session_id: string;
  messages: HistoryMessage[];
}

// ─── UI State ─────────────────────────────────────────────────────────────────

export interface ChatState {
  messages: Message[];
  sessionId: string | null;
  isLoading: boolean;
  error: string | null;
}

export type SuggestedPrompt = {
  icon: string;
  label: string;
  prompt: string;
};
