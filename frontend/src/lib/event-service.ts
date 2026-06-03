import { apiClient } from "./api-client";

export interface FinancialEvent {
  id: number;
  event_type: string | null;
  transaction_id: string;
  customer_id: string | null;
  merchant: string | null;
  amount: number;
  status: string;
  created_at: string;
}

export const eventService = {
  async getEvents(): Promise<FinancialEvent[]> {
    return apiClient.get<FinancialEvent[]>("/events");
  },
};
