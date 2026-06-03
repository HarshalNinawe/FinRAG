"use client";

import { useEffect, useRef, KeyboardEvent, ChangeEvent } from "react";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  isLoading,
  disabled = false,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea up to ~6 lines
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [value]);

  // Focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter or Cmd+Enter → send
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
      return;
    }
    // Plain Enter → send (Shift+Enter = newline)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (!value.trim() || isLoading || disabled) return;
    onSend();
  };

  const canSend = value.trim().length > 0 && !isLoading && !disabled;

  return (
    <div className="relative flex items-end gap-3 px-3 py-3 bg-white/3 border border-white/8 rounded-2xl backdrop-blur-sm focus-within:border-violet-500/40 focus-within:bg-white/5 transition-all duration-200 shadow-lg shadow-black/20">
      {/* Textarea */}
      <textarea
        ref={textareaRef}
        id="chat-input"
        value={value}
        onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask about your financial data…"
        disabled={isLoading || disabled}
        rows={1}
        className="flex-1 resize-none bg-transparent text-sm text-white placeholder-white/25 outline-none leading-relaxed max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 disabled:opacity-50 transition-opacity py-1"
        aria-label="Chat message input"
      />

      {/* Send Button */}
      <button
        id="chat-send-button"
        onClick={handleSend}
        disabled={!canSend}
        aria-label="Send message"
        className={`
          shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200
          ${canSend
            ? "bg-gradient-to-br from-violet-500 to-indigo-600 hover:from-violet-400 hover:to-indigo-500 shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 hover:scale-105 active:scale-95 cursor-pointer"
            : "bg-white/5 border border-white/10 cursor-not-allowed opacity-40"
          }
        `}
      >
        {isLoading ? (
          <svg
            className="animate-spin h-4 w-4 text-white"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          <svg
            className="h-4 w-4 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
            />
          </svg>
        )}
      </button>
    </div>
  );
}
