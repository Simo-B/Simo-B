import { ConversionEvent } from './types';

/**
 * Result of discipline score calculation
 */
export interface ScoreResult {
  /** Score from 0-100 */
  score: number;
  /** Detailed explanation of the score */
  explanation: string;
  /** Individual component scores */
  components: {
    frequencyScore: number;
    consistencyScore: number;
    timingScore: number;
  };
}

/**
 * Calculate how close the conversion frequency is to monthly (30 days)
 * 
 * Scoring:
 * - 100 points: exactly 30 days average (±2 days)
 * - 75 points: 25-35 days average
 * - 50 points: 20-40 days average  
 * - 25 points: 15-45 days average
 * - 0 points: very irregular (< 15 or > 45 days)
 */
function calculateFrequencyScore(conversions: ConversionEvent[]): number {
  if (conversions.length < 2) {
    return 0; // Not enough data
  }
  
  // Calculate average days between conversions
  let totalDays = 0;
  for (let i = 1; i < conversions.length; i++) {
    const prev = new Date(conversions[i - 1].timestamp);
    const curr = new Date(conversions[i].timestamp);
    totalDays += (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
  }
  const avgDays = totalDays / (conversions.length - 1);
  
  // Score based on deviation from 30 days
  const deviation = Math.abs(avgDays - 30);
  
  if (deviation <= 2) return 100;
  if (deviation <= 5) return 85;
  if (deviation <= 10) return 70;
  if (deviation <= 15) return 50;
  if (deviation <= 20) return 30;
  return 15;
}

/**
 * Calculate consistency of conversion amounts
 * 
 * Scoring:
 * - 100 points: very consistent (CV < 10%)
 * - 75 points: consistent (CV 10-25%)
 * - 50 points: somewhat consistent (CV 25-40%)
 * - 25 points: inconsistent (CV 40-60%)
 * - 0 points: very inconsistent (CV > 60%)
 */
function calculateConsistencyScore(conversions: ConversionEvent[]): number {
  if (conversions.length < 2) {
    return 0; // Not enough data
  }
  
  const amounts = conversions.map(c => c.amount);
  const mean = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
  
  if (mean === 0) return 0;
  
  const variance = amounts.reduce((sum, a) => sum + Math.pow(a - mean, 2), 0) / amounts.length;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = stdDev / mean;
  
  // Score based on coefficient of variation (lower is better)
  const cv = coefficientOfVariation;
  
  if (cv < 0.10) return 100; // Very consistent
  if (cv < 0.25) return 75;  // Consistent
  if (cv < 0.40) return 50;  // Somewhat consistent
  if (cv < 0.60) return 25;  // Inconsistent
  return 10;                 // Very inconsistent
}

/**
 * Calculate timing regularity (same day each month)
 * 
 * Scoring:
 * - 100 points: all conversions on same day (±1 day)
 * - 75 points: mostly same day (±3 days)
 * - 50 points: somewhat regular (±5 days)
 * - 25 points: somewhat random
 * - 0 points: completely random
 */
function calculateTimingScore(conversions: ConversionEvent[]): number {
  if (conversions.length < 2) {
    return 0; // Not enough data
  }
  
  // Extract days of month from all conversions
  const daysOfMonth = conversions.map(c => new Date(c.timestamp).getDate());
  
  // Calculate the most common day
  const dayCounts: Record<number, number> = {};
  for (const day of daysOfMonth) {
    dayCounts[day] = (dayCounts[day] || 0) + 1;
  }
  
  const mostCommonDay = Object.entries(dayCounts).reduce(
    (max, [day, count]) => count > max.count ? { day: parseInt(day), count } : max,
    { day: daysOfMonth[0], count: 0 }
  ).day;
  
  // Calculate what percentage of conversions are on/near the most common day
  const tolerance = 3; // ±3 days
  let onTarget = 0;
  
  for (const day of daysOfMonth) {
    const diff = Math.abs(day - mostCommonDay);
    // Handle month boundaries (e.g., 1st vs 31st)
    const normalizedDiff = Math.min(diff, 31 - diff);
    if (normalizedDiff <= tolerance) {
      onTarget++;
    }
  }
  
  const percentageOnTarget = onTarget / conversions.length;
  
  // Score based on percentage on target day
  if (percentageOnTarget >= 0.9) return 100;
  if (percentageOnTarget >= 0.75) return 80;
  if (percentageOnTarget >= 0.6) return 60;
  if (percentageOnTarget >= 0.4) return 40;
  if (percentageOnTarget >= 0.25) return 20;
  return 10;
}

/**
 * Generate human-readable explanation of the score
 */
function generateExplanation(
  frequencyScore: number,
  consistencyScore: number,
  timingScore: number,
  _conversions: ConversionEvent[]
): string {
  const parts: string[] = [];
  
  // Frequency explanation
  if (frequencyScore >= 80) {
    parts.push('Your conversion frequency is excellent, closely matching a monthly pattern.');
  } else if (frequencyScore >= 50) {
    parts.push('Your conversion frequency is reasonably consistent but could be more regular.');
  } else if (frequencyScore >= 25) {
    parts.push('Your conversion frequency is irregular. Consider establishing a monthly habit.');
  } else {
    parts.push('Your conversion frequency is very erratic. A consistent monthly schedule would help.');
  }
  
  // Consistency explanation
  if (consistencyScore >= 80) {
    parts.push('Conversion amounts are very consistent.');
  } else if (consistencyScore >= 50) {
    parts.push('Conversion amounts vary somewhat but follow a pattern.');
  } else if (consistencyScore >= 25) {
    parts.push('Conversion amounts are inconsistent. Consider setting a fixed percentage.');
  } else {
    parts.push('Conversion amounts vary significantly. A fixed percentage would improve discipline.');
  }
  
  // Timing explanation
  if (timingScore >= 80) {
    parts.push('You convert on very consistent dates each month.');
  } else if (timingScore >= 50) {
    parts.push('Your conversion timing is somewhat predictable.');
  } else if (timingScore >= 25) {
    parts.push('Conversion timing is unpredictable. Pick a specific day each month.');
  } else {
    parts.push('Conversion timing appears random. Choose a fixed date for conversions.');
  }
  
  return parts.join(' ');
}

/**
 * Calculate overall discipline score (0-100)
 * 
 * Weighted formula:
 * - Frequency Score: 40% (how close to monthly)
 * - Consistency Score: 30% (amount consistency)
 * - Timing Score: 30% (same day each month)
 */
export function calculateDisciplineScore(conversions: ConversionEvent[]): ScoreResult {
  if (conversions.length < 2) {
    return {
      score: 0,
      explanation: 'Insufficient conversion data to calculate a meaningful score. At least 2 conversions are required.',
      components: {
        frequencyScore: 0,
        consistencyScore: 0,
        timingScore: 0,
      },
    };
  }
  
  // Calculate individual component scores
  const frequencyScore = calculateFrequencyScore(conversions);
  const consistencyScore = calculateConsistencyScore(conversions);
  const timingScore = calculateTimingScore(conversions);
  
  // Weighted average
  const weights = {
    frequency: 0.4,
    consistency: 0.3,
    timing: 0.3,
  };
  
  const overallScore = Math.round(
    frequencyScore * weights.frequency +
    consistencyScore * weights.consistency +
    timingScore * weights.timing
  );
  
  return {
    score: overallScore,
    explanation: generateExplanation(frequencyScore, consistencyScore, timingScore, conversions),
    components: {
      frequencyScore,
      consistencyScore,
      timingScore,
    },
  };
}

/**
 * Get category label for a score
 */
export function getScoreCategory(score: number): {
  label: string;
  color: string;
} {
  if (score >= 80) {
    return { label: 'Excellent', color: 'green' };
  } else if (score >= 60) {
    return { label: 'Good', color: 'blue' };
  } else if (score >= 40) {
    return { label: 'Fair', color: 'yellow' };
  } else if (score >= 20) {
    return { label: 'Poor', color: 'orange' };
  } else {
    return { label: 'Needs Work', color: 'red' };
  }
}
