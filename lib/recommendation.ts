import { CostResult } from './costCalculator';
import { ScoreResult } from './disciplineScore';

/**
 * Result of recommendation generation
 */
export interface RecommendationResult {
  /** One-sentence recommendation */
  recommendation: string;
}

/**
 * Determine the primary issue based on score components
 */
function getPrimaryIssue(components: ScoreResult['components']): 'frequency' | 'consistency' | 'timing' | 'none' {
  const scores = [
    { type: 'frequency' as const, score: components.frequencyScore },
    { type: 'consistency' as const, score: components.consistencyScore },
    { type: 'timing' as const, score: components.timingScore },
  ];
  
  // Find the lowest scoring component
  const lowest = scores.reduce((min, current) => 
    current.score < min.score ? current : min
  );
  
  if (lowest.score < 40) {
    return lowest.type;
  }
  return 'none';
}

/**
 * Generate recommendation based on cost/savings and discipline score
 */
export function generateRecommendation(
  costResult: CostResult,
  scoreResult: ScoreResult
): RecommendationResult {
  const { costOrSavedAmount, currency, costType, conversionCount } = costResult;
  const { score, components } = scoreResult;
  
  // Handle insufficient data case
  if (conversionCount < 2) {
    return {
      recommendation: 'You need at least 2 conversions to receive a personalized recommendation. Keep tracking your wallet activity.',
    };
  }
  
  // Check if user is already disciplined
  if (score >= 80 && costType === 'saved' && costOrSavedAmount < 10) {
    return {
      recommendation: "You're already following excellent conversion habits! Keep up the disciplined approach to maintain your savings.",
    };
  }
  
  // Check for losses and provide specific advice
  if (costType === 'lost' && costOrSavedAmount > 5) {
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(costOrSavedAmount);
    
    const primaryIssue = getPrimaryIssue(components);
    
    if (primaryIssue === 'frequency') {
      return {
        recommendation: `You convert too frequently (${conversionCount} times), costing you approximately ${formattedAmount}. Following a monthly discipline rule would reduce these losses.`,
      };
    }
    
    if (primaryIssue === 'consistency') {
      return {
        recommendation: `Your conversion amounts vary too much, resulting in losses of about ${formattedAmount}. Converting a fixed percentage monthly would improve your results.`,
      };
    }
    
    if (primaryIssue === 'timing') {
      return {
        recommendation: `Your conversion timing is irregular, costing you approximately ${formattedAmount}. Converting on a consistent day each month would reduce these losses.`,
      };
    }
    
    return {
      recommendation: `Your conversion habits could be more disciplined. Following a monthly rule would have saved you approximately ${formattedAmount}.`,
    };
  }
  
  // Check for savings (user is doing better than discipline would have)
  if (costType === 'saved' && costOrSavedAmount > 5) {
    const formattedAmount = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(costOrSavedAmount);
    
    return {
      recommendation: `Great job! Your conversion strategy is actually saving you money compared to a strict monthly rule - approximately ${formattedAmount} in this period.`,
    };
  }
  
  // Minor losses or small amounts
  if (costOrSavedAmount > 0 && costOrSavedAmount <= 5) {
    return {
      recommendation: 'Your conversion habits are reasonably good. Minor adjustments to timing or amount consistency could marginally improve results.',
    };
  }
  
  // Very small savings
  if (costOrSavedAmount > 0) {
    return {
      recommendation: 'Your disciplined approach is working well. Keep maintaining your consistent conversion schedule to maximize savings.',
    };
  }
  
  // Neutral case
  return {
    recommendation: 'Your conversion behavior is roughly equivalent to following a disciplined monthly rule. Consider experimenting with timing to potentially improve results.',
  };
}

/**
 * Generate a detailed recommendation with actionable advice
 */
export function getDetailedRecommendation(
  costResult: CostResult,
  scoreResult: ScoreResult
): RecommendationResult & {
  priority: 'high' | 'medium' | 'low';
  actionableTips: string[];
} {
  const base = generateRecommendation(costResult, scoreResult);
  const { components } = scoreResult;
  
  const tips: string[] = [];
  let priority: 'high' | 'medium' | 'low' = 'low';
  
  // Generate actionable tips based on lowest scoring component
  const primaryIssue = getPrimaryIssue(components);
  
  if (primaryIssue === 'frequency' && components.frequencyScore < 50) {
    tips.push('Set a calendar reminder for the same day each month');
    tips.push('Consider automating conversions through a smart contract or recurring payment');
    priority = 'high';
  }
  
  if (primaryIssue === 'consistency' && components.consistencyScore < 50) {
    tips.push('Calculate your average monthly expenses and convert that fixed amount');
    tips.push('Use 50% of your stablecoin balance as a simple rule of thumb');
    priority = priority === 'high' ? 'high' : 'medium';
  }
  
  if (primaryIssue === 'timing' && components.timingScore < 50) {
    tips.push('Choose a specific date (e.g., 1st of month) and stick to it');
    tips.push('Avoid converting during high-volatility periods');
    priority = priority === 'high' ? 'high' : 'medium';
  }
  
  return {
    ...base,
    priority,
    actionableTips: tips.length > 0 ? tips : ['Your discipline is good! Keep up the consistent approach.'],
  };
}
