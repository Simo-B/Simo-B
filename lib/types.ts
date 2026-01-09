export type SubscriptionStatus = 'free' | 'premium' | 'pro';

export interface User {
  id: string;
  email: string;
  created_at: string;
  subscription_status: SubscriptionStatus;
}

export interface Analysis {
  id: string;
  user_id: string;
  wallet_address: string;
  blockchain: string;
  currency: string;
  last_fetch: string | null;
  created_at: string;
}

export interface AnalysisResult {
  id: string;
  analysis_id: string;
  cost_saved_or_lost: number | null;
  discipline_score: number | null;
  recommendation: string | null;
  preview_visible: boolean;
}
