import { TransferData } from './alchemy';

export interface ConversionEvent {
  timestamp: string;
  amount: number;
  token: string;
  toAddress: string;
  hash: string;
}

export type FrequencyPattern = 'daily' | 'weekly' | 'bi-weekly' | 'monthly' | 'irregular' | 'insufficient-data';

export interface AnalysisResult {
  conversions: ConversionEvent[];
  totalConversions: number;
  frequency: FrequencyPattern;
  averageAmount: number;
  totalVolume: number;
  averageDaysBetweenConversions: number | null;
  firstConversionDate: string | null;
  lastConversionDate: string | null;
}

export function parseConversionEvents(
  transfers: TransferData[],
  walletAddress: string
): ConversionEvent[] {
  const conversions: ConversionEvent[] = [];

  for (const transfer of transfers) {
    // A conversion is when the wallet sends stablecoin OUT (from = wallet)
    if (transfer.from.toLowerCase() === walletAddress.toLowerCase() && transfer.to) {
      conversions.push({
        timestamp: transfer.timestamp || new Date().toISOString(),
        amount: transfer.value,
        token: transfer.asset,
        toAddress: transfer.to,
        hash: transfer.hash,
      });
    }
  }

  // Sort by timestamp ascending (oldest first)
  conversions.sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return conversions;
}

export function detectFrequencyPattern(conversions: ConversionEvent[]): FrequencyPattern {
  if (conversions.length < 2) {
    return 'insufficient-data';
  }

  // Calculate days between each conversion
  const daysBetween: number[] = [];
  for (let i = 1; i < conversions.length; i++) {
    const prevDate = new Date(conversions[i - 1].timestamp);
    const currDate = new Date(conversions[i].timestamp);
    const days = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
    daysBetween.push(days);
  }

  if (daysBetween.length === 0) {
    return 'insufficient-data';
  }

  // Calculate average and standard deviation
  const avgDays = daysBetween.reduce((sum, days) => sum + days, 0) / daysBetween.length;
  const variance = daysBetween.reduce((sum, days) => sum + Math.pow(days - avgDays, 2), 0) / daysBetween.length;
  const stdDev = Math.sqrt(variance);

  // Calculate coefficient of variation (CV) to measure consistency
  // Lower CV means more regular pattern
  const cv = stdDev / avgDays;

  // Determine pattern based on average days and consistency
  if (cv < 0.3) {
    // Regular pattern (CV < 30% means fairly consistent)
    if (avgDays <= 2) return 'daily';
    if (avgDays <= 9) return 'weekly';
    if (avgDays <= 16) return 'bi-weekly';
    if (avgDays <= 35) return 'monthly';
  }

  // If CV >= 0.3, the pattern is irregular
  return 'irregular';
}

export function calculateAverageDaysBetween(conversions: ConversionEvent[]): number | null {
  if (conversions.length < 2) {
    return null;
  }

  let totalDays = 0;
  for (let i = 1; i < conversions.length; i++) {
    const prevDate = new Date(conversions[i - 1].timestamp);
    const currDate = new Date(conversions[i].timestamp);
    const days = (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24);
    totalDays += days;
  }

  return totalDays / (conversions.length - 1);
}

export function analyzeTransfers(
  transfers: TransferData[],
  walletAddress: string
): AnalysisResult {
  const conversions = parseConversionEvents(transfers, walletAddress);
  const totalConversions = conversions.length;
  
  const totalVolume = conversions.reduce((sum, conv) => sum + conv.amount, 0);
  const averageAmount = totalConversions > 0 ? totalVolume / totalConversions : 0;
  
  const frequency = detectFrequencyPattern(conversions);
  const averageDaysBetweenConversions = calculateAverageDaysBetween(conversions);

  const firstConversionDate = conversions.length > 0 ? conversions[0].timestamp : null;
  const lastConversionDate = conversions.length > 0 ? conversions[conversions.length - 1].timestamp : null;

  return {
    conversions,
    totalConversions,
    frequency,
    averageAmount,
    totalVolume,
    averageDaysBetweenConversions,
    firstConversionDate,
    lastConversionDate,
  };
}
