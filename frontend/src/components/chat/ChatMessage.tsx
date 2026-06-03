"use client";

import type { Message } from "@/types/chat";

interface ChatMessageProps {
  message: Message;
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

export default function ChatMessage({ message }: ChatMessageProps) {
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
          // Error variant
          <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-rose-500/10 border border-rose-500/20 text-sm text-rose-300 leading-relaxed">
            <div className="flex items-center gap-2 mb-1">
              <svg className="h-3.5 w-3.5 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-xs font-semibold text-rose-400">Error</span>
            </div>
            <p className="text-xs text-rose-300/80">{message.content}</p>
          </div>
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
