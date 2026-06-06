"use client";

import { useEffect, useState, useCallback } from "react";
import { eventService, FinancialEvent } from "@/lib/event-service";

interface TransactionSearchProps {
  /** Increment to trigger an immediate out-of-cycle data refresh. */
  refreshTrigger?: number;
}

function StatusDot({ status }: { status: string }) {
  const s = status.toLowerCase();
  const color =
    s === "captured" || s === "settled" || s === "successful"
      ? "bg-emerald-400"
      : s === "failed" || s === "declined"
      ? "bg-rose-400"
      : s === "refunded"
      ? "bg-amber-400"
      : s === "disputed"
      ? "bg-violet-400"
      : "bg-white/30";

  return <span className={`inline-block w-1.5 h-1.5 rounded-full ${color} shrink-0`} />;
}

export default function TransactionSearch({ refreshTrigger }: TransactionSearchProps) {
  const [allEvents, setAllEvents] = useState<FinancialEvent[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const data = await eventService.getEvents();
      setAllEvents(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load transactions";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Instant refresh via custom window event (fired by PaymentPanel on success)
  useEffect(() => {
    const handler = () => fetchAll();
    window.addEventListener("dashboardRefresh", handler);
    return () => window.removeEventListener("dashboardRefresh", handler);
  }, [fetchAll]);

  // Also react to prop-based refreshTrigger
  useEffect(() => {
    if (typeof refreshTrigger === "number" && refreshTrigger > 0) {
      fetchAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  // Client-side filtering across transaction_id, customer_id, merchant, status
  const filtered = query.trim()
    ? allEvents.filter((e) => {
        const q = query.toLowerCase();
        return (
          e.transaction_id.toLowerCase().includes(q) ||
          (e.customer_id ?? "").toLowerCase().includes(q) ||
          (e.merchant ?? "").toLowerCase().includes(q) ||
          e.status.toLowerCase().includes(q)
        );
      })
    : [];

  const showResults = query.trim().length > 0;

  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/8 overflow-hidden">
      {/* Header + Search box */}
      <div className="px-4 py-3 border-b border-white/6">
        <div className="flex items-center gap-2 mb-3">
          <svg className="h-3.5 w-3.5 text-violet-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span className="text-xs font-semibold text-white/70">Transaction Search</span>
        </div>

        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-3.5 w-3.5 text-white/25" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            id="transaction-search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search transaction ID or customer ID…"
            className="w-full pl-9 pr-10 py-2 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:border-violet-500/50 text-xs text-white placeholder-white/20 transition-all"
          />
          {query && (
            <button
              id="transaction-search-clear"
              onClick={() => setQuery("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/30 hover:text-white/60 transition-colors"
              aria-label="Clear search"
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <svg className="animate-spin h-4 w-4 text-violet-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : error ? (
        <p className="px-4 py-4 text-[10px] text-rose-400">{error}</p>
      ) : !showResults ? (
        <p className="px-4 py-4 text-[10px] text-white/25 text-center">
          Type to search across {allEvents.length} transactions
        </p>
      ) : filtered.length === 0 ? (
        <p className="px-4 py-4 text-[10px] text-white/30 text-center">
          No matches for &ldquo;{query}&rdquo;
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 text-[9px] text-white/25 uppercase font-bold tracking-wider">
                <th className="py-2 px-4">Transaction ID</th>
                <th className="py-2 px-4 hidden sm:table-cell">Customer ID</th>
                <th className="py-2 px-4">Merchant</th>
                <th className="py-2 px-4">Amount</th>
                <th className="py-2 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.slice(0, 20).map((e) => (
                <tr key={e.id} className="hover:bg-white/[0.02] transition-colors text-[11px]">
                  <td className="py-2 px-4 font-mono text-white/60 max-w-[120px] truncate">
                    {e.transaction_id}
                  </td>
                  <td className="py-2 px-4 font-mono text-white/50 hidden sm:table-cell">
                    {e.customer_id ?? "—"}
                  </td>
                  <td className="py-2 px-4 text-white/70 font-medium">
                    {e.merchant ?? "—"}
                  </td>
                  <td className="py-2 px-4 font-bold text-white">
                    ${e.amount.toFixed(2)}
                  </td>
                  <td className="py-2 px-4">
                    <span className="inline-flex items-center gap-1.5">
                      <StatusDot status={e.status} />
                      <span className="text-white/50 uppercase text-[9px] font-bold tracking-wider">
                        {e.status}
                      </span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 20 && (
            <p className="px-4 py-2 text-[10px] text-white/25 border-t border-white/5">
              Showing 20 of {filtered.length} results. Refine your search.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
