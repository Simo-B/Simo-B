import { ConversionEvent } from './types';
import { SimulatedConversion, simulateDisciplineRule } from './disciplineRule';

/**
 * Result of cost calculation
 */
export interface CostResult {
  /** Amount saved (positive) or lost (negative) */
  costOrSavedAmount: number;
  /** Currency code (EUR or USD) */
  currency: string;
  /** Type of result: saved (positive) or lost (negative) */
  costType: 'saved' | 'lost';
  /** Breakdown of actual costs */
  actualCost: number;
  /** Breakdown of simulated costs */
  simulatedCost: number;
  /** Number of conversions analyzed */
  conversionCount: number;
}

/**
 * Estimate exchange rate for an actual conversion
 * In production, this would fetch historical prices from APIs
 */
function estimateExchangeRate(timestamp: string, targetCurrency: string): number {
  const date = new Date(timestamp);
  const baseDate = new Date('2024-01-01');
  const daysSinceBase = Math.floor((date.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
  
  // Add some realistic variation based on date
  // USDC typically stays close to $1.00 with small fluctuations
  const baseUsd = 1.0;
  const fluctuation = Math.sin(daysSinceBase * 0.1) * 0.002 + (Math.random() - 0.5) * 0.001;
  const usdRate = baseUsd + fluctuation;
  
  // EUR typically slightly less than USD
  const eurToUsd = 0.92 + Math.sin(daysSinceBase * 0.05) * 0.02;
  const eurRate = usdRate * eurToUsd;
  
  return targetCurrency.toUpperCase() === 'EUR' ? eurRate : usdRate;
}

/**
 * Calculate the cost of actual conversions vs simulated discipline rule
 * 
 * The formula: (simulated_cost - actual_cost) = savings
 * - Positive result = user saved money by following discipline rule
 * - Negative result = user lost money compared to discipline rule
 */
export function calculateCostSavings(
  actualConversions: ConversionEvent[],
  currentStablecoinBalance: number,
  targetCurrency: string
): CostResult {
  // Need at least 2 conversions for meaningful comparison
  if (actualConversions.length < 2) {
    return {
      costOrSavedAmount: 0,
      currency: targetCurrency,
      costType: 'saved',
      actualCost: 0,
      simulatedCost: 0,
      conversionCount: actualConversions.length,
    };
  }
  
  // Simulate what discipline rule would have done
  const simulation = simulateDisciplineRule(
    actualConversions,
    currentStablecoinBalance,
    targetCurrency
  );
  
  // Calculate actual cost (what user actually got for their conversions)
  let actualTotalInTargetCurrency = 0;
  for (const conversion of actualConversions) {
    const rate = estimateExchangeRate(conversion.timestamp, targetCurrency);
    actualTotalInTargetCurrency += conversion.amount * rate;
  }
  
  // Calculate simulated cost (what discipline rule would have yielded)
  let simulatedTotalInTargetCurrency = 0;
  for (const simConv of simulation.simulatedConversions) {
    simulatedTotalInTargetCurrency += simConv.amount * simConv.priceAtConversion;
  }
  
  // The cost is the amount spent (stablecoin converted), not what was received
  // We want to see how much VALUE was obtained
  // Higher value = better outcome
  // So savings = simulated_value - actual_value
  
  // If simulated got more value = user lost by not following discipline
  // If simulated got less value = user saved by their actual behavior
  
  const actualValueObtained = actualTotalInTargetCurrency;
  const simulatedValueObtained = simulatedTotalInTargetCurrency;
  
  // Calculate savings: positive means discipline would have saved money
  // negative means actual behavior saved money (discipline would have been worse)
  // const savings = simulatedValueObtained - actualValueObtained;
  
  // For cost calculation: actual_cost = what you paid, simulated_cost = what you'd pay
  // We compare the exchange rates at conversion times
  let actualRateSum = 0;
  for (const conversion of actualConversions) {
    const rate = estimateExchangeRate(conversion.timestamp, targetCurrency);
    actualRateSum += rate;
  }
  const avgActualRate = actualConversions.length > 0 
    ? actualRateSum / actualConversions.length 
    : 1;
  
  let simulatedRateSum = 0;
  for (const simConv of simulation.simulatedConversions) {
    simulatedRateSum += simConv.priceAtConversion;
  }
  const avgSimulatedRate = simulation.simulatedConversions.length > 0
    ? simulatedRateSum / simulation.simulatedConversions.length
    : 1;
  
  // Calculate total conversion amount for cost basis
  const totalActualAmount = actualConversions.reduce((sum, c) => sum + c.amount, 0);
  const totalSimulatedAmount = simulation.totalSimulatedAmount;
  
  // Cost = amount * (1 - rate) since we want to minimize loss from $1 peg
  // USDC should be worth $1, so cost = amount * (1 - actualRate)
  const actualCostBasis = totalActualAmount * (1 - avgActualRate);
  const simulatedCostBasis = totalSimulatedAmount * (1 - avgSimulatedRate);
  
  // Savings = simulatedCost - actualCost
  // Positive = discipline saves money
  // Negative = discipline costs more
  const costOrSavedAmount = simulatedCostBasis - actualCostBasis;
  
  return {
    costOrSavedAmount: Math.abs(costOrSavedAmount),
    currency: targetCurrency,
    costType: costOrSavedAmount >= 0 ? 'saved' : 'lost',
    actualCost: Math.abs(actualCostBasis),
    simulatedCost: Math.abs(simulatedCostBasis),
    conversionCount: actualConversions.length,
  };
}

/**
 * Calculate detailed breakdown of cost differences
 */
export function getCostBreakdown(
  actualConversions: ConversionEvent[],
  simulatedConversions: SimulatedConversion[],
  targetCurrency: string
): {
  actualConversionsWithRates: Array<{
    timestamp: string;
    amount: number;
    rate: number;
    valueInTarget: number;
  }>;
  simulatedConversionsWithRates: Array<{
    timestamp: string;
    amount: number;
    rate: number;
    valueInTarget: number;
  }>;
  totalActualValue: number;
  totalSimulatedValue: number;
  difference: number;
} {
  const actualWithRates = actualConversions.map(c => ({
    timestamp: c.timestamp,
    amount: c.amount,
    rate: estimateExchangeRate(c.timestamp, targetCurrency),
    valueInTarget: c.amount * estimateExchangeRate(c.timestamp, targetCurrency),
  }));
  
  const simulatedWithRates = simulatedConversions.map(c => ({
    timestamp: c.timestamp,
    amount: c.amount,
    rate: c.priceAtConversion,
    valueInTarget: c.amount * c.priceAtConversion,
  }));
  
  const totalActualValue = actualWithRates.reduce((sum, a) => sum + a.valueInTarget, 0);
  const totalSimulatedValue = simulatedWithRates.reduce((sum, s) => sum + s.valueInTarget, 0);
  
  return {
    actualConversionsWithRates: actualWithRates,
    simulatedConversionsWithRates: simulatedWithRates,
    totalActualValue,
    totalSimulatedValue,
    difference: totalSimulatedValue - totalActualValue,
  };
}
