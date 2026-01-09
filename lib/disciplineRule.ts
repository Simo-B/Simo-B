import { ConversionEvent } from './types';

/**
 * Represents a simulated conversion under the discipline rule
 */
export interface SimulatedConversion {
  /** Timestamp of simulated conversion */
  timestamp: string;
  /** Amount of stablecoin converted */
  amount: number;
  /** Exchange rate at time of conversion (stablecoin to fiat) */
  priceAtConversion: number;
  /** Target currency (EUR or USD) */
  convertedTo: string;
}

/**
 * Result of discipline rule simulation
 */
export interface SimulationResult {
  /** Simulated conversions following monthly discipline rule */
  simulatedConversions: SimulatedConversion[];
  /** Percentage of balance converted each time */
  conversionPercentage: number;
  /** Day of month for conversions (1-28 for safety) */
  targetDayOfMonth: number;
  /** Total simulated amount converted */
  totalSimulatedAmount: number;
  /** Average simulated conversion amount */
  averageSimulatedAmount: number;
}

/**
 * Generate mock exchange rates for historical dates
 * In production, this would integrate with price APIs (e.g., CoinGecko, CryptoCompare)
 */
function getExchangeRateAtTimestamp(timestamp: string, targetCurrency: string): number {
  const date = new Date(timestamp);
  const baseDate = new Date('2024-01-01');
  const daysSinceBase = Math.floor((date.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Add some realistic variation based on date
  // USDC typically stays close to $1.00 with small fluctuations
  const baseUsd = 1.0;
  const fluctuation = Math.sin(daysSinceBase * 0.1) * 0.002 + (Math.random() - 0.5) * 0.001;
  const usdRate = baseUsd + fluctuation;
  
  // EUR typically slightly less than USD (around 0.92-0.95 in 2024)
  const eurToUsd = 0.92 + Math.sin(daysSinceBase * 0.05) * 0.02;
  const eurRate = usdRate * eurToUsd;
  
  return targetCurrency.toUpperCase() === 'EUR' ? eurRate : usdRate;
}

/**
 * Calculate the percentage of balance that was converted based on actual conversions
 * Uses the average ratio of conversion amount to stablecoin balance
 */
function calculateConversionPercentage(
  conversions: ConversionEvent[],
  currentStablecoinBalance: number
): number {
  if (conversions.length === 0 || currentStablecoinBalance <= 0) {
    return 0.5; // Default to 50% if no data
  }
  
  const totalConverted = conversions.reduce((sum, c) => sum + c.amount, 0);
  const averageConversion = totalConverted / conversions.length;
  
  // Calculate what percentage of balance the average conversion represents
  const percentage = averageConversion / currentStablecoinBalance;
  
  // Clamp between 10% and 90% to keep simulation realistic
  return Math.max(0.1, Math.min(0.9, percentage));
}

/**
 * Determine the most common day of month from actual conversion dates
 */
function determineTargetDayOfMonth(conversions: ConversionEvent[]): number {
  if (conversions.length === 0) {
    return 1; // Default to 1st of month
  }
  
  const dayCounts: Record<number, number> = {};
  for (const conversion of conversions) {
    const day = new Date(conversion.timestamp).getDate();
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  }
  
  let maxCount = 0;
  let targetDay = 1;
  for (const [day, count] of Object.entries(dayCounts)) {
    if (count > maxCount) {
      maxCount = count;
      targetDay = parseInt(day, 10);
    }
  }
  
  // Ensure day is between 1 and 28 (to avoid month-end issues)
  return Math.max(1, Math.min(28, targetDay));
}

/**
 * Generate all monthly conversion dates between first and last actual conversion
 */
function generateMonthlyConversionDates(
  firstConversion: Date,
  lastConversion: Date,
  targetDayOfMonth: number
): Date[] {
  const dates: Date[] = [];
  const currentDate = new Date(firstConversion);
  
  // Set to target day of month
  currentDate.setDate(targetDayOfMonth);
  
  // If first conversion is after target day, start from next month
  if (currentDate < firstConversion) {
    currentDate.setMonth(currentDate.getMonth() + 1);
  }
  
  while (currentDate <= lastConversion) {
    dates.push(new Date(currentDate));
    const nextDate = new Date(currentDate);
    nextDate.setMonth(nextDate.getMonth() + 1);
    currentDate.setTime(nextDate.getTime());
  }
  
  return dates;
}

/**
 * Simulate what would have happened if the user followed a monthly discipline rule
 * 
 * The Monthly Discipline Rule:
 * - Convert a fixed percentage of stablecoin balance once per month
 * - Convert on the same day each month (determined from actual patterns)
 * - Use historical exchange rates for cost calculations
 */
export function simulateDisciplineRule(
  conversions: ConversionEvent[],
  currentStablecoinBalance: number,
  targetCurrency: string = 'USD'
): SimulationResult {
  // Need at least 2 conversions to establish a pattern
  if (conversions.length < 2) {
    return {
      simulatedConversions: [],
      conversionPercentage: 0,
      targetDayOfMonth: 1,
      totalSimulatedAmount: 0,
      averageSimulatedAmount: 0,
    };
  }
  
  // Sort conversions by timestamp (oldest first)
  const sortedConversions = [...conversions].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  
  const firstConversion = new Date(sortedConversions[0].timestamp);
  const lastConversion = new Date(sortedConversions[sortedConversions.length - 1].timestamp);
  
  // Determine parameters from actual behavior
  const conversionPercentage = calculateConversionPercentage(sortedConversions, currentStablecoinBalance);
  const targetDayOfMonth = determineTargetDayOfMonth(sortedConversions);
  
  // Generate monthly conversion dates
  const monthlyDates = generateMonthlyConversionDates(
    firstConversion,
    lastConversion,
    targetDayOfMonth
  );
  
  // Generate simulated conversions
  const simulatedConversions: SimulatedConversion[] = [];
  let totalSimulatedAmount = 0;
  
  for (const date of monthlyDates) {
    const amountToConvert = currentStablecoinBalance * conversionPercentage;
    const priceAtConversion = getExchangeRateAtTimestamp(date.toISOString(), targetCurrency);
    
    simulatedConversions.push({
      timestamp: date.toISOString(),
      amount: amountToConvert,
      priceAtConversion,
      convertedTo: targetCurrency,
    });
    
    totalSimulatedAmount += amountToConvert;
  }
  
  return {
    simulatedConversions,
    conversionPercentage,
    targetDayOfMonth,
    totalSimulatedAmount,
    averageSimulatedAmount: monthlyDates.length > 0 
      ? totalSimulatedAmount / monthlyDates.length 
      : 0,
  };
}

/**
 * Get detailed comparison between actual and simulated conversions
 */
export function getDetailedSimulationComparison(
  actualConversions: ConversionEvent[],
  simulatedConversions: SimulatedConversion[],
  _targetCurrency: string
): {
  actualCount: number;
  simulatedCount: number;
  actualTotal: number;
  simulatedTotal: number;
  frequencyDifference: number;
} {
  const actualTotal = actualConversions.reduce((sum, c) => sum + c.amount, 0);
  const simulatedTotal = simulatedConversions.reduce((sum, c) => sum + c.amount, 0);
  
  // Calculate average days between actual conversions
  let actualAvgDays = 0;
  if (actualConversions.length > 1) {
    let totalDays = 0;
    for (let i = 1; i < actualConversions.length; i++) {
      const prev = new Date(actualConversions[i - 1].timestamp);
      const curr = new Date(actualConversions[i].timestamp);
      totalDays += (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    }
    actualAvgDays = totalDays / (actualConversions.length - 1);
  }
  
  // Monthly = ~30 days
  const frequencyDifference = Math.abs(actualAvgDays - 30);
  
  return {
    actualCount: actualConversions.length,
    simulatedCount: simulatedConversions.length,
    actualTotal,
    simulatedTotal,
    frequencyDifference,
  };
}
