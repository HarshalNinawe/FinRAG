import { apiClient } from "./api-client";
import type { RazorpaySuccessResponse } from "@/types/razorpay.d";

// ─── Request / Response types ─────────────────────────────────────────────────

export interface SimulatePaymentRequest {
  amount: number;
  customer_id: string;
  status: "captured" | "failed" | "disputed";
}

export interface SimulatePaymentResponse {
  success: boolean;
  message: string;
  transaction: {
    transaction_id: string;
    event: string;
    amount: number;
    customer_id: string;
    source: string;
    status: string;
    created_at: string;
  };
}

export interface CreateOrderResponse {
  success: boolean;
  order_id: string;
  amount: number;
}

export interface VerifyPaymentResponse {
  success: boolean;
  message: string;
  transaction_id: string;
}

// ─── Payment Service ──────────────────────────────────────────────────────────

export const paymentService = {
  /**
   * POST /api/payments/simulate
   * Simulates a payment with status: captured | failed | disputed
   */
  async simulate(payload: SimulatePaymentRequest): Promise<SimulatePaymentResponse> {
    return apiClient.post<SimulatePaymentResponse>("/api/payments/simulate", payload);
  },

  /**
   * POST /api/payments/create-order
   * Creates a Razorpay order and returns order_id for checkout initialisation.
   * Amount in INR (backend converts to paise).
   */
  async createOrder(amount: number): Promise<CreateOrderResponse> {
    return apiClient.post<CreateOrderResponse>("/api/payments/create-order", { amount });
  },

  /**
   * POST /api/payments/verify
   * Verifies Razorpay signature, persists transaction, triggers fraud + ChromaDB pipeline.
   */
  async verifyPayment(
    payload: RazorpaySuccessResponse & {
      amount: number;
      customer_id?: string;
      merchant?: string;
    }
  ): Promise<VerifyPaymentResponse> {
    return apiClient.post<VerifyPaymentResponse>("/api/payments/verify", payload);
  },
};

// ─── Razorpay SDK Loader ──────────────────────────────────────────────────────

const RAZORPAY_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";
const SCRIPT_ID = "razorpay-checkout-script";

/**
 * Loads Razorpay checkout.js once and resolves when it is ready.
 * Safe to call multiple times — will not inject duplicate <script> tags.
 */
export function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Already loaded
    if (typeof window !== "undefined" && window.Razorpay) {
      resolve();
      return;
    }

    // Script element already injected — wait for it
    if (document.getElementById(SCRIPT_ID)) {
      const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement;
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Razorpay script failed to load")));
      return;
    }

    // Fresh injection
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = RAZORPAY_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Razorpay SDK"));
    document.body.appendChild(script);
  });
}
