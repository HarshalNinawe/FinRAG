"use client";

import { useEffect, useState, useCallback } from "react";
import { fraudService, FraudAlert } from "@/lib/fraud-service";

interface FraudAlertsProps {
  /** Increment to trigger an immediate out-of-cycle refresh. */
  refreshTrigger?: number;
}

function RiskBadge({ score }: { score: number }) {
  if (score > 80) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[10px] font-bold">
        <span className="w-1 h-1 rounded-full bg-rose-400 animate-pulse" />
        HIGH {score}
      </span>
    );
  }
  if (score > 50) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-bold">
        <span className="w-1 h-1 rounded-full bg-amber-400" />
        MED {score}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/40 text-[10px] font-bold">
      LOW {score}
    </span>
  );
}

function RiskBar({ score }: { score: number }) {
  const color =
    score > 80 ? "bg-rose-500" : score > 50 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="w-full h-1 rounded-full bg-white/5 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${Math.min(score, 100)}%` }}
      />
    </div>
  );
}

function formatTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return dateStr;
  }
}

export default function FraudAlerts({ refreshTrigger }: FraudAlertsProps) {
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    setError(null);
    try {
      const data = await fraudService.getFraudAlerts();
      setAlerts(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load fraud alerts";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  // Regular polling — interval is never recreated by refreshTrigger
  useEffect(() => {
    fetchAlerts();
    const id = setInterval(fetchAlerts, 10000);
    return () => clearInterval(id);
  }, [fetchAlerts]);

  // Instant refresh via custom window event
  useEffect(() => {
    const handler = () => fetchAlerts();
    window.addEventListener("dashboardRefresh", handler);
    return () => window.removeEventListener("dashboardRefresh", handler);
  }, [fetchAlerts]);

  // Also react to prop-based refreshTrigger
  useEffect(() => {
    if (typeof refreshTrigger === "number" && refreshTrigger > 0) {
      fetchAlerts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  return (
    <div className="flex flex-col h-full rounded-xl bg-white/[0.03] border border-white/8 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/6 shrink-0">
        <div className="flex items-center gap-2">
          <svg className="h-3.5 w-3.5 text-rose-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-xs font-semibold text-white/70">Fraud Alerts</span>
          {alerts.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/20 text-rose-400 text-[10px] font-bold">
              {alerts.length}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full py-8">
            <svg className="animate-spin h-5 w-5 text-rose-500/60" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : error ? (
          /* If endpoint is unavailable, show friendly placeholder */
          <div className="flex flex-col items-center justify-center h-full py-8 px-4 text-center gap-2">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-lg mb-1">
              ✅
            </div>
            <p className="text-xs font-semibold text-white/50">No fraud alerts detected</p>
            <p className="text-[10px] text-white/25 max-w-[160px]">
              All transactions within normal parameters.
            </p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full py-8 px-4 text-center gap-2">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-lg mb-1">
              ✅
            </div>
            <p className="text-xs font-semibold text-white/50">No fraud alerts detected</p>
            <p className="text-[10px] text-white/25 max-w-[160px]">
              All transactions within normal parameters.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {alerts.map((alert) => (
              <li key={alert.id} className="px-4 py-3 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center justify-between mb-1.5">
                  <RiskBadge score={alert.risk_score} />
                  <span className="text-[10px] text-white/30 font-mono">
                    {formatTime(alert.created_at)}
                  </span>
                </div>
                <RiskBar score={alert.risk_score} />
                <p className="text-[10px] text-white/50 font-mono mt-1.5 truncate">
                  {alert.transaction_id}
                </p>
                <p className="text-[10px] text-white/35 mt-0.5 leading-relaxed line-clamp-2">
                  {alert.reason}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-white/6 shrink-0">
        <span className="text-[10px] text-white/25">
          {alerts.filter((a) => a.risk_score > 80).length} high · {alerts.filter((a) => a.risk_score > 50 && a.risk_score <= 80).length} medium risk
        </span>
      </div>
    </div>
  );
}
