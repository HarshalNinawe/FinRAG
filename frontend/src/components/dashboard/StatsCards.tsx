"use client";

import { useEffect, useState, useCallback } from "react";
import { eventService, FinancialEvent } from "@/lib/event-service";

interface StatsCardsProps {
  /** Increment this value to trigger an immediate refresh outside the poll cycle. */
  refreshTrigger?: number;
}

export default function StatsCards({ refreshTrigger }: StatsCardsProps) {
  const [events, setEvents] = useState<FinancialEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    try {
      const data = await eventService.getEvents();
      setEvents(data);
    } catch (err) {
      console.error("Failed to load stats", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Regular polling — interval is never recreated by refreshTrigger
  useEffect(() => {
    fetchEvents();
    const id = setInterval(fetchEvents, 10000); // refresh every 10s
    return () => clearInterval(id);
  }, [fetchEvents]);

  // Instant refresh via custom window event (fired by PaymentPanel on success)
  useEffect(() => {
    const handler = () => fetchEvents();
    window.addEventListener("dashboardRefresh", handler);
    return () => window.removeEventListener("dashboardRefresh", handler);
  }, [fetchEvents]);

  // Also react to prop-based refreshTrigger (increments from parent)
  useEffect(() => {
    if (typeof refreshTrigger === "number" && refreshTrigger > 0) {
      fetchEvents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  const totalEvents = events.length;
  const failedPayments = events.filter((e) => e.event_type === "payment.failed" || e.status === "failed" || e.status === "declined").length;
  const disputes = events.filter((e) => e.event_type === "dispute.opened" || e.status === "disputed").length;
  const refunds = events.filter((e) => e.event_type === "refund.created" || e.status === "refunded").length;

  if (loading && totalEvents === 0) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="rounded-xl bg-gray-50 border border-gray-200 p-4 animate-pulse h-24" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Total Events */}
      <div className="rounded-xl bg-white border border-gray-200 p-4 flex flex-col justify-center shadow-sm">
        <span className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">
          Total Events
        </span>
        <span className="text-2xl font-bold text-black">{totalEvents}</span>
      </div>

      {/* Failed Payments */}
      <div className="rounded-xl bg-white border border-gray-200 p-4 flex flex-col justify-center shadow-sm">
        <span className="text-[10px] uppercase tracking-wider text-red-500 font-semibold mb-1">
          Failed Payments
        </span>
        <span className="text-2xl font-bold text-black">{failedPayments}</span>
      </div>

      {/* Disputes */}
      <div className="rounded-xl bg-white border border-gray-200 p-4 flex flex-col justify-center shadow-sm">
        <span className="text-[10px] uppercase tracking-wider text-purple-600 font-semibold mb-1">
          Disputes
        </span>
        <span className="text-2xl font-bold text-black">{disputes}</span>
      </div>

      {/* Refunds */}
      <div className="rounded-xl bg-white border border-gray-200 p-4 flex flex-col justify-center shadow-sm">
        <span className="text-[10px] uppercase tracking-wider text-orange-500 font-semibold mb-1">
          Refunds
        </span>
        <span className="text-2xl font-bold text-black">{refunds}</span>
      </div>
    </div>
  );
}
