"use client";

import { useEffect, useState, useCallback } from "react";
import { eventService, FinancialEvent } from "@/lib/event-service";

const POLL_INTERVAL_MS = 5000;

interface LiveEventFeedProps {
  /** Increment to trigger an immediate out-of-cycle refresh. */
  refreshTrigger?: number;
}

function EventTypeBadge({ type }: { type: string | null }) {
  switch (type) {
    case "payment.captured":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-semibold">
          <span className="w-1 h-1 rounded-full bg-emerald-400" />
          captured
        </span>
      );
    case "payment.failed":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-semibold">
          <span className="w-1 h-1 rounded-full bg-rose-400 animate-pulse" />
          failed
        </span>
      );
    case "refund.created":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-semibold">
          <span className="w-1 h-1 rounded-full bg-amber-400" />
          refund
        </span>
      );
    case "dispute.opened":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[10px] font-semibold">
          <span className="w-1 h-1 rounded-full bg-violet-400 animate-ping" />
          dispute
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/40 text-[10px] font-semibold">
          {type ?? "unknown"}
        </span>
      );
  }
}

function formatTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  } catch {
    return dateStr;
  }
}

export default function LiveEventFeed({ refreshTrigger }: LiveEventFeedProps) {
  const [events, setEvents] = useState<FinancialEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [pulsing, setPulsing] = useState(false);

  const fetchEvents = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await eventService.getEvents();
      setEvents(data);
      setLastRefreshed(new Date());
      if (silent) {
        setPulsing(true);
        setTimeout(() => setPulsing(false), 600);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to connect to backend";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Regular polling — interval is never recreated by refreshTrigger
  useEffect(() => {
    fetchEvents();
    const id = setInterval(() => fetchEvents(true), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [fetchEvents]);

  // Instant refresh via custom window event
  useEffect(() => {
    const handler = () => fetchEvents(true);
    window.addEventListener("dashboardRefresh", handler);
    return () => window.removeEventListener("dashboardRefresh", handler);
  }, [fetchEvents]);

  // Also react to prop-based refreshTrigger
  useEffect(() => {
    if (typeof refreshTrigger === "number" && refreshTrigger > 0) {
      fetchEvents(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  return (
    <div className="flex flex-col h-full rounded-xl bg-white/[0.03] border border-white/8 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/6 shrink-0">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full transition-colors ${error ? "bg-rose-400" : "bg-emerald-400 animate-pulse"}`} />
          <span className="text-xs font-semibold text-white/70">Live Events</span>
        </div>
        <span className="text-[10px] text-white/25 font-mono">
          {lastRefreshed.toLocaleTimeString()}
        </span>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full py-8">
            <svg className="animate-spin h-5 w-5 text-violet-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full py-8 px-4 text-center gap-2">
            <span className="text-[10px] text-rose-400">{error}</span>
            <button
              onClick={() => fetchEvents()}
              className="text-[10px] text-violet-400 hover:text-violet-300 underline"
            >
              Retry
            </button>
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8 text-center px-4">
            <span className="text-2xl mb-2">📭</span>
            <p className="text-xs text-white/30">No events yet. Start the webhook simulator.</p>
          </div>
        ) : (
          <ul className={`divide-y divide-white/5 transition-opacity duration-300 ${pulsing ? "opacity-60" : "opacity-100"}`}>
            {events.slice(0, 50).map((event) => (
              <li key={event.id} className="px-4 py-2.5 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <EventTypeBadge type={event.event_type} />
                  <span className="text-[10px] text-white/30 font-mono shrink-0">
                    {formatTime(event.created_at)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/60 font-medium truncate max-w-[120px]">
                    {event.merchant ?? "—"}
                  </span>
                  <span className="text-white font-bold shrink-0">
                    ${event.amount.toFixed(2)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-white/6 shrink-0 flex items-center justify-between">
        <span className="text-[10px] text-white/25">{events.length} total events</span>
        <span className="text-[10px] text-white/25">Polling every 5s</span>
      </div>
    </div>
  );
}
