"use client";

import type { Message } from "@/types/chat";

interface ChatMessageProps {
  message: Message;
  onRetry?: () => void;
}

/** Converts plain-text answer into simple HTML with newlines and inline code */
function formatContent(text: string): React.ReactNode {
  const lines = text.split("\n");

  return lines.map((line, lineIdx) => {
    // Render inline code: `code`
    const parts = line.split(/(`[^`]+`)/g);
    const renderedParts = parts.map((part, partIdx) => {
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={partIdx}
            className="font-mono text-violet-300 bg-violet-500/10 px-1.5 py-0.5 rounded text-[0.8em]"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      // Bold: **text**
      const boldParts = part.split(/(\*\*[^*]+\*\*)/g);
      return boldParts.map((bp, bpIdx) => {
        if (bp.startsWith("**") && bp.endsWith("**")) {
          return (
            <strong key={`${partIdx}-${bpIdx}`} className="font-semibold text-white">
              {bp.slice(2, -2)}
            </strong>
          );
        }
        return <span key={`${partIdx}-${bpIdx}`}>{bp}</span>;
      });
    });

    return (
      <span key={lineIdx}>
        {renderedParts}
        {lineIdx < lines.length - 1 && <br />}
      </span>
    );
  });
}

export default function ChatMessage({ message, onRetry }: ChatMessageProps) {
  const isUser = message.role === "user";

  const timeString = message.timestamp.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // ── User message ──────────────────────────────────────────────────────────
  if (isUser) {
    return (
      <div className="flex items-end justify-end gap-2 px-4 py-1 group">
        <div className="flex flex-col items-end gap-1 max-w-[75%] md:max-w-[60%]">
          <div className="px-4 py-3 rounded-2xl rounded-br-sm bg-gradient-to-br from-violet-600 to-indigo-600 text-white text-sm leading-relaxed shadow-lg shadow-violet-500/20">
            {message.content}
          </div>
          <span className="text-[10px] text-white/25 opacity-0 group-hover:opacity-100 transition-opacity pr-1">
            {timeString}
          </span>
        </div>
      </div>
    );
  }

  // ── Assistant message ─────────────────────────────────────────────────────
  return (
    <div className="flex items-start gap-3 px-4 py-1 group">
      {/* Avatar */}
      <div className="shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-xs font-bold shadow-lg shadow-violet-500/20 mt-0.5">
        F
      </div>

      <div className="flex flex-col gap-1 max-w-[75%] md:max-w-[70%]">
        {message.isError ? (
          message.isQuota ? (
            // ── Quota / rate-limit error ───────────────────────────────────
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-amber-500/10 border border-amber-500/25 text-sm text-amber-200 leading-relaxed">
              <div className="flex items-center gap-2 mb-2">
                <svg className="h-3.5 w-3.5 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-xs font-semibold text-amber-400">Rate Limited</span>
              </div>
              <p className="text-xs text-amber-200/80 mb-3">{message.content}</p>
              {onRetry && (
                <button
                  id="chat-retry-btn"
                  onClick={onRetry}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/35 border border-amber-500/30 text-[11px] font-semibold text-amber-300 hover:text-amber-100 transition-all"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Retry
                </button>
              )}
            </div>
          ) : (
            // ── Generic error ──────────────────────────────────────────────
            <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-rose-500/10 border border-rose-500/20 text-sm text-rose-300 leading-relaxed">
              <div className="flex items-center gap-2 mb-1">
                <svg className="h-3.5 w-3.5 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-xs font-semibold text-rose-400">Error</span>
              </div>
              <p className="text-xs text-rose-300/80">{message.content}</p>
            </div>
          )
        ) : (
          // Normal assistant bubble
          <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-white/5 border border-white/10 backdrop-blur-sm text-sm text-white/85 leading-relaxed">
            {formatContent(message.content)}
          </div>
        )}
        <span className="text-[10px] text-white/25 opacity-0 group-hover:opacity-100 transition-opacity pl-1">
          FinRAG · {timeString}
        </span>
      </div>
    </div>
  );
}
