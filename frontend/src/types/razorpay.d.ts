// ─── Razorpay Checkout.js — Global Type Declarations ─────────────────────────
// These types describe the Razorpay checkout SDK loaded via CDN script tag.
// Reference: https://razorpay.com/docs/payment-gateway/web-integration/standard/

export {};

declare global {
  interface Window {
    Razorpay: RazorpayConstructor;
  }
}

type RazorpayConstructor = new (options: RazorpayOptions) => RazorpayInstance;

export interface RazorpayOptions {
  key: string;
  amount: number;         // paise (INR × 100)
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  handler: (response: RazorpaySuccessResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  modal?: {
    ondismiss?: () => void;
  };
}

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayInstance {
  open(): void;
  close(): void;
  on(event: string, handler: (response: unknown) => void): void;
}
