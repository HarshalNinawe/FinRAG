"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

import LiveEventFeed from "@/components/dashboard/LiveEventFeed";
import FraudAlerts from "@/components/dashboard/FraudAlerts";
import ChatPanel from "@/components/dashboard/ChatPanel";
import TransactionSearch from "@/components/dashboard/TransactionSearch";
import StatsCards from "@/components/dashboard/StatsCards";

export default function Dashboard() {
  const [mounted, setMounted] = useState(false);

  // Prevent SSR hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-white flex flex-col relative overflow-x-hidden">

      {/* ── Ambient Glow ────────────────────────────────────────────────────── */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-violet-600/6 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* ── Navbar ──────────────────────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-5 sm:px-8 py-4 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-sm font-bold shadow-lg shadow-violet-500/20">
            F
          </div>
          <span className="text-lg font-semibold tracking-tight">FinRAG</span>
          <span className="hidden sm:inline-flex items-center gap-1.5 ml-1 px-2.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-[10px] font-semibold text-violet-400 uppercase tracking-wider">
            <span className="w-1 h-1 rounded-full bg-violet-400 animate-pulse" />
            Dashboard
          </span>
        </div>

        <div className="flex items-center gap-5 sm:gap-7 text-sm text-white/50">
          <Link href="/" className="hover:text-white transition-colors text-xs sm:text-sm">
            Home
          </Link>
          <Link href="/dashboard" className="text-white font-medium text-xs sm:text-sm">
            Dashboard
          </Link>
          <a
            href={`${process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000"}/docs`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-white transition-colors text-xs sm:text-sm hidden sm:inline"
          >
            API Docs
          </a>
        </div>

        {/* Connection indicator */}
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-white/35 hidden sm:inline">Live</span>
        </div>
      </nav>

      {/* ── Main Content ────────────────────────────────────────────────────── */}
      <div className="relative z-10 flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-5">

        {/* ── Page Title ──────────────────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
            Financial Intelligence Dashboard
          </h1>
          <p className="text-xs text-white/35 mt-1">
            Real-time event monitoring · Fraud detection · AI-powered analysis
          </p>
        </div>

        {/* ── Stats Cards ─────────────────────────────────────────────────── */}
        <StatsCards />

        {/* ── Row 1: Live Events + Fraud Alerts ───────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5" style={{ minHeight: "320px", maxHeight: "380px" }}>
          <LiveEventFeed />
          <FraudAlerts />
        </div>

        {/* ── Row 2: AI Chat (full width) ─────────────────────────────────── */}
        <div style={{ minHeight: "420px" }}>
          <ChatPanel />
        </div>

        {/* ── Row 3: Transaction Search ────────────────────────────────────── */}
        <TransactionSearch />

      </div>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/5 px-6 sm:px-8 py-5 flex items-center justify-between text-[11px] text-white/20 bg-[#0a0a0f]">
        <span>© 2026 FinRAG. Built with Next.js + FastAPI.</span>
        <span>Day 7 Refactor Complete ✓</span>
      </footer>
    </main>
  );
}
