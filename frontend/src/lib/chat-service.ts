import { apiClient } from "./api-client";
import type { ChatApiResponse, SimpleChatPayload } from "@/types/chat";

/**
 * Sends a query to the RAG chat endpoint.
 * Uses: POST /chat  →  { query: string }  →  { answer: string }
 *
 * NOTE: The backend's simple /chat endpoint (routes/chat.py) expects
 * the field name "query", NOT "message" and NOT session-based payloads.
 */
export async function sendChat(query: string): Promise<ChatApiResponse> {
  const payload: SimpleChatPayload = { query };
  return apiClient.post<ChatApiResponse>("/chat", payload);
}
