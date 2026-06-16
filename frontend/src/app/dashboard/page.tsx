"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

import LiveEventFeed from "@/components/dashboard/LiveEventFeed";
import FraudAlerts from "@/components/dashboard/FraudAlerts";
import ChatPanel from "@/components/dashboard/ChatPanel";
import TransactionSearch from "@/components/dashboard/TransactionSearch";
import StatsCards from "@/components/dashboard/StatsCards";
import PaymentPanel from "@/components/dashboard/PaymentPanel"; // added import

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);

  // Prevent SSR hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Refresh handler for payment events
  const handleRefresh = () => {
    // Dispatch a custom event that child components listen for
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("dashboardRefresh"));
    }
  };

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-white text-black flex flex-col relative overflow-x-hidden">

      {/* ─── Navbar ────────────────────────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-5 sm:px-8 py-4 border-b border-gray-200 bg-white sticky top-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-black text-white flex items-center justify-center text-sm font-bold">
            F
          </div>
          <span className="text-lg font-semibold tracking-tight">FinRAG</span>
          <span className="hidden sm:inline-flex items-center gap-1.5 ml-1 px-2.5 py-0.5 rounded-full bg-gray-100 border border-gray-200 text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
            Dashboard
          </span>
        </div>

        <div className="flex items-center gap-5 sm:gap-7 text-sm text-gray-500">
          <Link href="/" className="hover:text-black transition-colors text-xs sm:text-sm">
            Home
          </Link>
          <Link href="/dashboard" className="text-black font-medium text-xs sm:text-sm">
            Dashboard
          </Link>
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000"}/docs`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-black transition-colors text-xs sm:text-sm hidden sm:inline"
          >
            API Docs
          </a>
        </div>

        {/* Connection indicator */}
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] text-gray-500 hidden sm:inline">Live</span>
        </div>
      </nav>

      {/* ─── Main Content ──────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-5">

        {/* ─── Page Title ──────────────────────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-black">
            Financial Intelligence Dashboard
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Real-time event monitoring · Fraud detection · AI-powered analysis
          </p>
        </div>

        {/* ─── Stats Cards ──────────────────────────────────────────────────────── */}
        <StatsCards />

        {/* Insert Payment Panel directly below StatsCards */}
        <PaymentPanel onPaymentSuccess={handleRefresh} />

        {/* ─── Row 1: Live Events + Fraud Alerts ───────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5" style={{ minHeight: "320px", maxHeight: "380px" }}>
          <LiveEventFeed />
          <FraudAlerts />
        </div>

        {/* ─── Row 2: AI Chat (full width) ────────────────────────────────────── */}
        <div style={{ minHeight: "420px" }}>
          <ChatPanel />
        </div>

        {/* ─── Row 3: Transaction Search ──────────────────────────────────────── */}
        <TransactionSearch />

      </div>

      {/* ─── Footer ────────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-gray-200 px-6 sm:px-8 py-5 flex items-center justify-between text-[11px] text-gray-400 bg-white">
        <span>© 2026 FinRAG</span>
      </footer>
    </main>
  );
}
