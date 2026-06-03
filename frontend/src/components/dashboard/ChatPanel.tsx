"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";

import ChatMessage from "@/components/chat/ChatMessage";
import ChatInput from "@/components/chat/ChatInput";
import TypingIndicator from "@/components/chat/TypingIndicator";
import { sendChat } from "@/lib/chat-service";
import { ApiError } from "@/lib/api-client";
import type { Message } from "@/types/chat";

const STARTER_PROMPTS = [
  "Summarize the latest transactions.",
  "Are there any high-risk fraud alerts?",
  "What is the total captured payment volume?",
];

export default function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSend = useCallback(
    async (overrideText?: string) => {
      const text = (overrideText ?? inputValue).trim();
      if (!text || isLoading) return;

      setInputValue("");

      const userMsg: Message = {
        id: uuidv4(),
        role: "user",
        content: text,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsLoading(true);

      try {
        // POST /chat with { query: string } — confirmed backend schema
        const response = await sendChat(text);

        const assistantMsg: Message = {
          id: uuidv4(),
          role: "assistant",
          content: response.answer,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } catch (err) {
        // Show the real backend error message rather than a generic one
        const errorContent =
          err instanceof ApiError
            ? `${err.message}${err.status ? ` (HTTP ${err.status})` : ""}`
            : err instanceof Error
              ? err.message
              : "Something went wrong. Please check your connection and try again.";

        const errorMsg: Message = {
          id: uuidv4(),
          role: "assistant",
          content: errorContent,
          timestamp: new Date(),
          isError: true,
        };
        setMessages((prev) => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
      }
    },
    [inputValue, isLoading]
  );

  const hasMessages = messages.length > 0;

  return (
    <div className="flex flex-col rounded-xl bg-white/[0.03] border border-white/8 overflow-hidden h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/6 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-[10px] font-bold">
            F
          </div>
          <span className="text-xs font-semibold text-white/70">AI Chat Assistant</span>
          <span className="px-1.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[9px] font-semibold uppercase tracking-wider">
            Gemini
          </span>
        </div>
        {hasMessages && (
          <button
            id="chat-panel-clear"
            onClick={() => setMessages([])}
            className="text-[10px] text-white/30 hover:text-white/60 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto min-h-0 py-2">
        {!hasMessages ? (
          <div className="flex flex-col items-center justify-center h-full px-4 text-center gap-3 py-6">
            <p className="text-xs text-white/30">Ask about your financial data</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {STARTER_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => handleSend(p)}
                  disabled={isLoading}
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/8 hover:border-violet-500/30 text-[11px] text-white/50 hover:text-white/80 transition-all disabled:opacity-40 text-left"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {isLoading && <TypingIndicator />}
            <div ref={bottomRef} className="h-1" />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-3 pb-3 pt-2 border-t border-white/6 shrink-0">
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={() => handleSend()}
          isLoading={isLoading}
        />
        <p className="text-[9px] text-white/20 text-center mt-1.5">
          Powered by Gemini · POST /chat
        </p>
      </div>
    </div>
  );
}
