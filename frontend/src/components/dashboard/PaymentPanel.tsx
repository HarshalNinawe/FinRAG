"use client";

import { useState, useCallback } from "react";
import { paymentService, loadRazorpayScript } from "@/lib/payment-service";
import type { RazorpayOptions } from "@/types/razorpay.d";

// ─── Props ────────────────────────────────────────────────────────────────────

interface PaymentPanelProps {
  /** Called after any successful payment/simulation so the dashboard can refresh. */
  onPaymentSuccess?: () => void;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBanner({
  type,
  message,
  onDismiss,
}: {
  type: "success" | "error" | "info";
  message: string;
  onDismiss: () => void;
}) {
  const styles = {
    success:
      "bg-emerald-500/10 border-emerald-500/25 text-emerald-300",
    error:
      "bg-rose-500/10 border-rose-500/25 text-rose-300",
    info:
      "bg-violet-500/10 border-violet-500/25 text-violet-300",
  };

  const icons = {
    success: "✓",
    error: "✗",
    info: "⟳",
  };

  return (
    <div
      className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-2.5 text-xs ${styles[type]} animate-in fade-in duration-300`}
    >
      <span className="mt-px shrink-0 font-bold">{icons[type]}</span>
      <span className="leading-relaxed flex-1">{message}</span>
      <button
        onClick={onDismiss}
        className="shrink-0 opacity-50 hover:opacity-100 transition-opacity text-xs leading-none"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <svg
      className="animate-spin h-3.5 w-3.5 text-current"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type BusyState =
  | "idle"
  | "sim-success"
  | "sim-failed"
  | "sim-dispute"
  | "razorpay-order"
  | "razorpay-verify";

interface Banner {
  type: "success" | "error" | "info";
  message: string;
}

export default function PaymentPanel({ onPaymentSuccess }: PaymentPanelProps) {
  const [amount, setAmount] = useState<string>("500");
  const [customerId, setCustomerId] = useState<string>("cust_demo_001");
  const [busy, setBusy] = useState<BusyState>("idle");
  const [banner, setBanner] = useState<Banner | null>(null);

  const isIdle = busy === "idle";

  // ── Show banner helper ────────────────────────────────────────────────────

  const showBanner = useCallback((b: Banner) => setBanner(b), []);
  const clearBanner = useCallback(() => setBanner(null), []);

  // ── Parse & validate amount ───────────────────────────────────────────────

  const parsedAmount = parseFloat(amount);
  const isAmountValid = !isNaN(parsedAmount) && parsedAmount > 0;

  // ── Simulate payment ──────────────────────────────────────────────────────

  const simulate = useCallback(
    async (status: "captured" | "failed" | "disputed") => {
      if (!isAmountValid) {
        showBanner({ type: "error", message: "Enter a valid amount before simulating." });
        return;
      }
      const busyKey: BusyState =
        status === "captured"
          ? "sim-success"
          : status === "failed"
          ? "sim-failed"
          : "sim-dispute";

      setBusy(busyKey);
      clearBanner();

      try {
        const res = await paymentService.simulate({
          amount: parsedAmount,
          customer_id: customerId.trim() || "cust_demo_001",
          status,
        });

        showBanner({
          type: status === "captured" ? "success" : "error",
          message: `Simulation [${status}] complete · txn: ${res.transaction.transaction_id} · ₹${res.transaction.amount.toFixed(2)}`,
        });

        onPaymentSuccess?.();
      } catch (err) {
        showBanner({
          type: "error",
          message: err instanceof Error ? err.message : "Simulation failed. Check the backend.",
        });
      } finally {
        setBusy("idle");
      }
    },
    [isAmountValid, parsedAmount, customerId, showBanner, clearBanner, onPaymentSuccess]
  );

  // ── Razorpay Checkout ─────────────────────────────────────────────────────

  const handleRazorpayPayment = useCallback(async () => {
    if (!isAmountValid) {
      showBanner({ type: "error", message: "Enter a valid amount to pay with Razorpay." });
      return;
    }

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!keyId) {
      showBanner({
        type: "error",
        message: "NEXT_PUBLIC_RAZORPAY_KEY_ID is not set. Check .env.local.",
      });
      return;
    }

    setBusy("razorpay-order");
    clearBanner();

    try {
      // Step 1 — Create a Razorpay order
      const orderRes = await paymentService.createOrder(parsedAmount);

      if (!orderRes.success || !orderRes.order_id) {
        throw new Error("Backend did not return a valid order_id.");
      }

      // Step 2 — Load Razorpay SDK (no-op if already loaded)
      setBusy("razorpay-order"); // still "loading" phase
      await loadRazorpayScript();

      if (!window.Razorpay) {
        throw new Error("Razorpay SDK failed to initialise on window.");
      }

      // Step 3 — Open Razorpay Checkout
      const options: RazorpayOptions = {
        key: keyId,
        amount: Math.round(parsedAmount * 100), // paise
        currency: "INR",
        name: "FinRAG Demo",
        description: `Payment of ₹${parsedAmount.toFixed(2)}`,
        order_id: orderRes.order_id,

        handler: async (response) => {
          // Step 4 — Verify on success
          setBusy("razorpay-verify");
          try {
            const verifyRes = await paymentService.verifyPayment({
              ...response,
              amount: parsedAmount,
              customer_id: customerId.trim() || "cust_razorpay",
              merchant: "FinRAG Razorpay Demo",
            });

            showBanner({
              type: "success",
              message: `✓ Payment verified · txn: ${verifyRes.transaction_id} · ₹${parsedAmount.toFixed(2)} · Indexed in ChromaDB`,
            });

            onPaymentSuccess?.();
          } catch (err) {
            showBanner({
              type: "error",
              message:
                err instanceof Error
                  ? `Verification failed: ${err.message}`
                  : "Payment verification failed.",
            });
          } finally {
            setBusy("idle");
          }
        },

        prefill: {
          name: customerId.trim() || "Demo Customer",
          email: "demo@finrag.dev",
          contact: "9000000000",
        },

        theme: { color: "#7c3aed" },

        modal: {
          ondismiss: () => {
            showBanner({ type: "info", message: "Razorpay checkout was dismissed." });
            setBusy("idle");
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
      setBusy("idle"); // modal is open — free the button while modal runs
    } catch (err) {
      showBanner({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to open Razorpay checkout.",
      });
      setBusy("idle");
    }
  }, [
    isAmountValid,
    parsedAmount,
    customerId,
    showBanner,
    clearBanner,
    onPaymentSuccess,
  ]);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-xl bg-white/[0.03] border border-white/8 overflow-hidden">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/6">
        <div className="flex items-center gap-2">
          {/* Razorpay-blue icon */}
          <div className="w-5 h-5 rounded-md bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-[10px]">
            ₹
          </div>
          <span className="text-xs font-semibold text-white/70">Payment Panel</span>
          <span className="px-1.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[9px] font-semibold uppercase tracking-wider">
            Razorpay Sandbox
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          <span className="text-[10px] text-white/30">Test Mode</span>
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="px-4 py-4 flex flex-col gap-4">

        {/* ── Input Row ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Amount */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="payment-amount"
              className="text-[10px] font-semibold uppercase tracking-wider text-white/40"
            >
              Amount (INR ₹)
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-white/30 text-xs pointer-events-none">
                ₹
              </span>
              <input
                id="payment-amount"
                type="number"
                min="1"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="500"
                className="w-full pl-7 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:border-violet-500/50 text-xs text-white placeholder-white/20 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
            {!isAmountValid && amount !== "" && (
              <span className="text-[10px] text-rose-400">Enter a positive number</span>
            )}
          </div>

          {/* Customer ID */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="payment-customer-id"
              className="text-[10px] font-semibold uppercase tracking-wider text-white/40"
            >
              Customer ID
            </label>
            <input
              id="payment-customer-id"
              type="text"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              placeholder="cust_demo_001"
              className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:border-violet-500/50 text-xs text-white placeholder-white/20 transition-all"
            />
          </div>
        </div>

        {/* ── Banner ────────────────────────────────────────────────────────── */}
        {banner && (
          <StatusBanner
            type={banner.type}
            message={banner.message}
            onDismiss={clearBanner}
          />
        )}

        {/* ── Action buttons ────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-2.5">

          {/* Simulation row */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-white/30">
              Simulate Payment
            </span>
            <div className="grid grid-cols-3 gap-2">
              {/* Simulate Success */}
              <button
                id="btn-simulate-success"
                onClick={() => simulate("captured")}
                disabled={!isIdle || !isAmountValid}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busy === "sim-success" ? (
                  <Spinner />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                )}
                Success
              </button>

              {/* Simulate Failed */}
              <button
                id="btn-simulate-failed"
                onClick={() => simulate("failed")}
                disabled={!isIdle || !isAmountValid}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-semibold hover:bg-rose-500/20 hover:border-rose-500/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busy === "sim-failed" ? (
                  <Spinner />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                )}
                Failed
              </button>

              {/* Simulate Dispute */}
              <button
                id="btn-simulate-dispute"
                onClick={() => simulate("disputed")}
                disabled={!isIdle || !isAmountValid}
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400 text-[11px] font-semibold hover:bg-violet-500/20 hover:border-violet-500/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busy === "sim-dispute" ? (
                  <Spinner />
                ) : (
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping" />
                )}
                Dispute
              </button>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/6" />
            <span className="text-[10px] text-white/25 font-medium">or</span>
            <div className="flex-1 h-px bg-white/6" />
          </div>

          {/* Razorpay Checkout button */}
          <button
            id="btn-razorpay-checkout"
            onClick={handleRazorpayPayment}
            disabled={!isIdle || !isAmountValid}
            className="relative w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-semibold text-sm transition-all
              bg-gradient-to-r from-blue-600 via-blue-500 to-violet-600
              hover:from-blue-500 hover:via-blue-400 hover:to-violet-500
              shadow-lg shadow-blue-500/20 hover:shadow-blue-500/35
              hover:scale-[1.01] active:scale-[0.99]
              disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100 disabled:shadow-none
              text-white"
          >
            {busy === "razorpay-order" || busy === "razorpay-verify" ? (
              <>
                <Spinner />
                <span>
                  {busy === "razorpay-verify"
                    ? "Verifying payment…"
                    : "Creating order…"}
                </span>
              </>
            ) : (
              <>
                {/* Razorpay logo glyph */}
                <svg
                  className="w-4 h-4 shrink-0"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M14.557 0L9.925 14.376H6.119L3.443 6.116C7.065 4.25 11.08 2.965 14.557 0zM22 7.993l-3.527 6.383h-4.02L20.21 3.5c.758 1.395 1.382 2.901 1.79 4.493zM9.04 24l1.875-5.624h4.42L13.457 24H9.04z" />
                </svg>
                Pay with Razorpay  ·  ₹{isAmountValid ? parsedAmount.toFixed(2) : "—"}
              </>
            )}
          </button>

        </div>

        {/* ── Test card hint ───────────────────────────────────────────────── */}
        <div className="rounded-lg bg-white/[0.02] border border-white/5 px-3 py-2 flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold text-white/30 uppercase tracking-wider">
            Test Card
          </span>
          <span className="text-[11px] text-white/50 font-mono">
            4111 1111 1111 1111 &nbsp;·&nbsp; Any future date &nbsp;·&nbsp; Any CVV
          </span>
        </div>

      </div>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <div className="px-4 py-2 border-t border-white/6 flex items-center justify-between">
        <span className="text-[10px] text-white/25">
          Simulate → DB → Fraud Detection → ChromaDB → RAG
        </span>
        <span className="text-[10px] text-white/20">Sandbox only</span>
      </div>
    </div>
  );
}
