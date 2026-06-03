"use client";

export default function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 px-4 py-2">
      {/* FinRAG Avatar */}
      <div className="shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-xs font-bold shadow-lg shadow-violet-500/20 mt-0.5">
        F
      </div>

      {/* Bubble */}
      <div className="flex items-center gap-1.5 px-4 py-3 rounded-2xl rounded-tl-sm bg-white/5 border border-white/10 backdrop-blur-sm">
        <span className="text-xs text-white/40 mr-1">FinRAG is analyzing</span>
        <span
          className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce"
          style={{ animationDelay: "0ms" }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce"
          style={{ animationDelay: "150ms" }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce"
          style={{ animationDelay: "300ms" }}
        />
      </div>
    </div>
  );
}
