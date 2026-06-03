import { apiClient } from "./api-client";

export interface FraudAlert {
  id: number;
  transaction_id: string;
  risk_score: number;
  reason: string;
  created_at: string;
}

export const fraudService = {
  async getFraudAlerts(): Promise<FraudAlert[]> {
    return apiClient.get<FraudAlert[]>("/fraud-alerts");
  },
};
