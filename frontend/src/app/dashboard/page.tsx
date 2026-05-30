"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface FinancialEvent {
  id: number;
  event_type: string;
  transaction_id: string;
  customer_id: string;
  merchant: string;
  amount: number;
  status: string;
  created_at: string;
}

export default function Dashboard() {
  const [events, setEvents] = useState<FinancialEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [filterType, setFilterType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchEvents = async (silent = false) => {
    if (!silent) setLoading(true);
    else setIsRefreshing(true);
    
    setError(null);
    try {
      const response = await fetch(`${API_URL}/events`);
      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.statusText}`);
      }
      const data = await response.json();
      setEvents(data);
      setLastRefreshed(new Date());
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to connect to the backend server. Please make sure the FastAPI server is running.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // Setup auto-refresh interval
  useEffect(() => {
    fetchEvents();
    const interval = setInterval(() => {
      fetchEvents(true);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (!mounted) return null;

  // Filter events based on filters
  const filteredEvents = events.filter((event) => {
    const matchesType = filterType === "all" || event.event_type === filterType;
    const matchesSearch = 
      event.merchant.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.customer_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.transaction_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.status.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesType && matchesSearch;
  });

  // Calculate high-level stats
  const totalVolume = events
    .filter((e) => e.event_type === "payment.captured")
    .reduce((sum, e) => sum + e.amount, 0);

  const failedCount = events.filter((e) => e.event_type === "payment.failed").length;
  const disputeCount = events.filter((e) => e.event_type === "dispute.opened").length;

  // Helper to render Event Type Badges
  const getEventTypeBadge = (type: string) => {
    switch (type) {
      case "payment.captured":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            payment.captured
          </span>
        );
      case "payment.failed":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
            payment.failed
          </span>
        );
      case "refund.created":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            refund.created
          </span>
        );
      case "dispute.opened":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping" />
            dispute.opened
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/50 text-xs font-semibold">
            {type}
          </span>
        );
    }
  };

  // Helper to format timestamps cleanly on the client side
  const formatTimestamp = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white flex flex-col relative overflow-x-hidden">
      {/* Ambient background glow effects */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-violet-600/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Navigation Header */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-sm font-bold shadow-lg shadow-violet-500/20">
            F
          </div>
          <span className="text-lg font-semibold tracking-tight">FinRAG</span>
        </div>
        <div className="flex items-center gap-6 text-sm text-white/50">
          <Link href="/" className="hover:text-white transition-colors">Home</Link>
          <Link href="/dashboard" className="text-white font-medium hover:text-white transition-colors">Live Feed</Link>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${error ? "bg-rose-400" : "bg-emerald-400 animate-pulse"}`} />
          <span className="text-xs text-white/40 hidden sm:inline">{error ? "Disconnected" : "Live Feed Connected"}</span>
        </div>
      </nav>

      {/* Main Dashboard Workspace */}
      <div className="flex-1 w-full max-w-7xl mx-auto px-6 py-8 relative z-10">
        
        {/* Banner Headers */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
              Live Financial Events
            </h1>
            <p className="text-sm text-white/40 mt-1">
              Ingest, monitor, and audit real-time webhook events from payment providers.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-xs text-white/30">
              Refreshed: {lastRefreshed.toLocaleTimeString()}
            </span>
            <button
              onClick={() => fetchEvents()}
              disabled={isRefreshing || loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 transition-all text-white/80"
            >
              {isRefreshing ? (
                <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
              )}
              Force Refresh
            </button>
          </div>
        </div>

        {/* Real-time Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="rounded-xl bg-white/3 border border-white/5 p-5 hover:bg-white/5 transition-all">
            <div className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">Total Events Ingested</div>
            <div className="text-3xl font-bold tracking-tight text-white">{events.length}</div>
            <p className="text-[10px] text-white/30 mt-2">All financial events stored in database</p>
          </div>
          
          <div className="rounded-xl bg-white/3 border border-white/5 p-5 hover:bg-white/5 transition-all">
            <div className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">Processed Volume</div>
            <div className="text-3xl font-bold tracking-tight text-emerald-400">
              ${totalVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-white/30 mt-2">Cumulative captured payments</p>
          </div>
          
          <div className="rounded-xl bg-white/3 border border-white/5 p-5 hover:bg-white/5 transition-all">
            <div className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">Failed Payments</div>
            <div className="text-3xl font-bold tracking-tight text-rose-400">{failedCount}</div>
            <p className="text-[10px] text-white/30 mt-2">Unsuccessful transactions resolved</p>
          </div>
          
          <div className="rounded-xl bg-white/3 border border-white/5 p-5 hover:bg-white/5 transition-all">
            <div className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-2">Disputed Events</div>
            <div className="text-3xl font-bold tracking-tight text-violet-400">{disputeCount}</div>
            <p className="text-[10px] text-white/30 mt-2">Active buyer disputes opened</p>
          </div>
        </div>

        {/* Dashboard Error Alert */}
        {error && (
          <div className="mb-6 rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 flex gap-3 items-start">
            <svg className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <h3 className="text-sm font-semibold text-rose-400">Database Connection Offline</h3>
              <p className="text-xs text-white/50 mt-1 leading-relaxed">{error}</p>
              <div className="flex gap-4 mt-3">
                <button
                  onClick={() => fetchEvents()}
                  className="text-xs font-bold text-rose-400 hover:text-rose-300 underline"
                >
                  Retry Connection
                </button>
                <span className="text-xs text-white/20">|</span>
                <span className="text-xs text-white/40">Using Endpoint: <code className="font-mono text-white/60 bg-white/5 px-1.5 py-0.5 rounded">{API_URL}</code></span>
              </div>
            </div>
          </div>
        )}

        {/* Interactive Controls & Filters */}
        <div className="bg-white/3 border border-white/5 rounded-t-xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => setFilterType("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterType === "all" 
                  ? "bg-white/10 text-white border border-white/10" 
                  : "text-white/40 hover:text-white border border-transparent"
              }`}
            >
              All Events
            </button>
            <button
              onClick={() => setFilterType("payment.captured")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterType === "payment.captured" 
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                  : "text-white/40 hover:text-white border border-transparent"
              }`}
            >
              Captured
            </button>
            <button
              onClick={() => setFilterType("payment.failed")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterType === "payment.failed" 
                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" 
                  : "text-white/40 hover:text-white border border-transparent"
              }`}
            >
              Failed
            </button>
            <button
              onClick={() => setFilterType("refund.created")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterType === "refund.created" 
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" 
                  : "text-white/40 hover:text-white border border-transparent"
              }`}
            >
              Refunds
            </button>
            <button
              onClick={() => setFilterType("dispute.opened")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterType === "dispute.opened" 
                  ? "bg-violet-500/10 text-violet-400 border border-violet-500/20" 
                  : "text-white/40 hover:text-white border border-transparent"
              }`}
            >
              Disputes
            </button>
          </div>

          <div className="relative w-full md:w-80 shrink-0">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-3.5 w-3.5 text-white/30" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search by Merchant, Customer, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:border-violet-500/50 text-xs placeholder-white/20 transition-all"
            />
          </div>
        </div>

        {/* Live Event Feed Grid / Table */}
        <div className="bg-white/3 border-x border-b border-white/5 rounded-b-xl overflow-hidden min-h-[300px] flex flex-col justify-between">
          
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 gap-3">
              <svg className="animate-spin h-8 w-8 text-violet-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-sm text-white/40">Loading latest events...</span>
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xl mb-4">
                🔍
              </div>
              <h3 className="text-sm font-semibold text-white/70">No Events Found</h3>
              <p className="text-xs text-white/30 mt-1 max-w-sm">
                {searchTerm || filterType !== "all" 
                  ? "Try resetting your search filters or searching for another term." 
                  : "We haven't received any webhook events yet. Start your local Webhook Event Simulator to ingest live events!"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              {/* Responsive Table for medium/large screens */}
              <table className="w-full text-left border-collapse hidden md:table">
                <thead>
                  <tr className="border-b border-white/5 text-[10px] text-white/30 uppercase font-bold tracking-wider">
                    <th className="py-4 px-6">Event Type</th>
                    <th className="py-4 px-6">Transaction ID</th>
                    <th className="py-4 px-6">Customer ID</th>
                    <th className="py-4 px-6">Merchant</th>
                    <th className="py-4 px-6">Amount</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6 text-right">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredEvents.map((event) => (
                    <tr key={event.id} className="hover:bg-white/[0.02] text-xs transition-colors">
                      <td className="py-4 px-6 font-medium">
                        {getEventTypeBadge(event.event_type)}
                      </td>
                      <td className="py-4 px-6 font-mono text-white/60">
                        {event.transaction_id}
                      </td>
                      <td className="py-4 px-6 font-mono text-white/60">
                        {event.customer_id}
                      </td>
                      <td className="py-4 px-6 font-semibold text-white/80">
                        {event.merchant}
                      </td>
                      <td className="py-4 px-6 font-bold text-white">
                        ${event.amount.toFixed(2)}
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center gap-1.5 uppercase text-[10px] font-bold text-white/60 tracking-wider">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            event.status === "captured" || event.status === "settled" || event.status === "successful"
                              ? "bg-emerald-400"
                              : event.status === "failed" || event.status === "declined"
                              ? "bg-rose-400"
                              : "bg-amber-400"
                          }`} />
                          {event.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right text-white/40 font-mono">
                        {formatTimestamp(event.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Stacked Cards for Mobile Layout */}
              <div className="grid grid-cols-1 divide-y divide-white/5 md:hidden">
                {filteredEvents.map((event) => (
                  <div key={event.id} className="p-4 flex flex-col gap-3 hover:bg-white/[0.02] transition-all">
                    <div className="flex items-center justify-between">
                      {getEventTypeBadge(event.event_type)}
                      <span className="text-[10px] font-mono text-white/40">{formatTimestamp(event.created_at)}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-[10px] text-white/30 uppercase font-semibold">Merchant</div>
                        <div className="text-white font-semibold">{event.merchant}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-white/30 uppercase font-semibold">Amount</div>
                        <div className="text-white font-bold">${event.amount.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-white/30 uppercase font-semibold">Customer ID</div>
                        <div className="text-white/60 font-mono">{event.customer_id}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-white/30 uppercase font-semibold">Status</div>
                        <div className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-white/60 mt-0.5">
                          <span className={`w-1 h-1 rounded-full ${
                            event.status === "captured" || event.status === "settled" || event.status === "successful"
                              ? "bg-emerald-400"
                              : event.status === "failed" || event.status === "declined"
                              ? "bg-rose-400"
                              : "bg-amber-400"
                          }`} />
                          {event.status}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-white/5 pt-2 flex items-center justify-between text-[10px]">
                      <span className="text-white/30 uppercase font-semibold">Transaction ID</span>
                      <span className="font-mono text-white/50">{event.transaction_id}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-white/5 px-6 py-4 flex items-center justify-between text-xs text-white/20">
            <span>Showing {filteredEvents.length} events matching filter</span>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Polling every 5s</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/5 px-8 py-6 flex items-center justify-between text-xs text-white/20 mt-auto bg-[#0a0a0f] relative z-10">
        <span>© 2026 FinRAG. Built with Next.js + FastAPI.</span>
        <span>Step 9 Complete ✓</span>
      </footer>
    </main>
  );
}
