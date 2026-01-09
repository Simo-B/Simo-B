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

export interface ConversionEvent {
  timestamp: string;
  amount: number;
  token: string;
  toAddress: string;
  hash: string;
}

export type FrequencyPattern = 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'irregular' | 'insufficient-data';

export interface WalletAnalysisData {
  analysis: Analysis;
  transferCount: number;
  conversions: ConversionEvent[];
  totalConversions: number;
  frequency: FrequencyPattern;
  averageAmount: number;
  totalVolume: number;
  averageDaysBetweenConversions: number | null;
  firstConversionDate: string | null;
  lastConversionDate: string | null;
}

// Discipline Rule Types
export interface SimulatedConversion {
  timestamp: string;
  amount: number;
  priceAtConversion: number;
  convertedTo: string;
}

export interface SimulationResult {
  simulatedConversions: SimulatedConversion[];
  conversionPercentage: number;
  targetDayOfMonth: number;
  totalSimulatedAmount: number;
  averageSimulatedAmount: number;
}

// Cost Calculator Types
export interface CostResult {
  costOrSavedAmount: number;
  currency: string;
  costType: 'saved' | 'lost';
  actualCost: number;
  simulatedCost: number;
  conversionCount: number;
}

// Discipline Score Types
export interface ScoreResult {
  score: number;
  explanation: string;
  components: {
    frequencyScore: number;
    consistencyScore: number;
    timingScore: number;
  };
}

// Recommendation Types
export interface RecommendationResult {
  recommendation: string;
}
