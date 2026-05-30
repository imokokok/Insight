import { ORACLE_EXPECTED_INTERVALS } from '@/lib/constants';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('stabilityScore');

export type StabilityLevel = 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
type DecayTrend = 'improving' | 'stable' | 'declining' | 'rapidly_declining';

interface StabilityComponents {
  priceConsistency: number;
  updateFrequencyConsistency: number;
  confidenceStability: number;
  dataCompleteness: number;
}

export interface StabilityScore {
  provider: string;
  score: number;
  level: StabilityLevel;
  components: StabilityComponents;
  trend: DecayTrend;
  decayRate: number;
  estimatedTimeToCritical: number | null;
}

export interface StabilityHistoryPoint {
  timestamp: number;
  score: number;
  priceConsistency: number;
  updateFrequencyConsistency: number;
  confidenceStability: number;
  dataCompleteness: number;
}

export interface StabilityResult {
  scores: StabilityScore[];
  history: StabilityHistoryPoint[];
  decliningCount: number;
  rapidlyDecliningCount: number;
  averageScore: number;
  averageLevel: StabilityLevel;
  worstProvider: string | null;
  worstScore: number;
}

const COMPONENT_WEIGHTS = {
  priceConsistency: 0.3,
  updateFrequencyConsistency: 0.25,
  confidenceStability: 0.25,
  dataCompleteness: 0.2,
};

const MAX_HISTORY_POINTS = 100;

const stabilityHistoryMap = new Map<string, StabilityHistoryPoint[]>();

export function resetStabilityHistory(): void {
  stabilityHistoryMap.clear();
}

function getStabilityLevel(score: number): StabilityLevel {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 60) return 'fair';
  if (score >= 40) return 'poor';
  return 'critical';
}

function calculateLinearRegressionSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;

  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return 0;

  return (n * sumXY - sumX * sumY) / denominator;
}

function calculatePriceConsistency(prices: number[]): number {
  try {
    if (!prices || prices.length < 2) {
      return 50;
    }

    const pctChanges: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      if (prices[i - 1] !== 0) {
        pctChanges.push((prices[i] - prices[i - 1]) / Math.abs(prices[i - 1]));
      }
    }

    if (pctChanges.length === 0) {
      return 50;
    }

    const mean = pctChanges.reduce((sum, v) => sum + v, 0) / pctChanges.length;
    const variance =
      pctChanges.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / pctChanges.length;
    const deviationVolatility = Math.sqrt(variance);

    if (deviationVolatility === 0) {
      return 100;
    }

    return 100 * (1 - Math.min(deviationVolatility * 10, 1));
  } catch (error) {
    logger.error(
      'Failed to calculate price consistency',
      error instanceof Error ? error : new Error(String(error))
    );
    return 50;
  }
}

function calculateUpdateFrequencyConsistency(timestamps: number[]): number {
  try {
    if (!timestamps || timestamps.length <= 1) {
      return 50;
    }

    const intervals: number[] = [];
    for (let i = 1; i < timestamps.length; i++) {
      intervals.push(timestamps[i] - timestamps[i - 1]);
    }

    if (intervals.length === 0) {
      return 50;
    }

    const mean = intervals.reduce((sum, v) => sum + v, 0) / intervals.length;

    if (mean === 0) {
      return 100;
    }

    const variance =
      intervals.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    const cv = stdDev / mean;

    return 100 * (1 - Math.min(cv, 1));
  } catch (error) {
    logger.error(
      'Failed to calculate update frequency consistency',
      error instanceof Error ? error : new Error(String(error))
    );
    return 50;
  }
}

function calculateConfidenceStability(confidences: number[]): number {
  try {
    if (!confidences || confidences.length === 0) {
      return 80;
    }

    if (confidences.length < 2) {
      return 80;
    }

    const changeRates: number[] = [];
    for (let i = 1; i < confidences.length; i++) {
      changeRates.push(Math.abs(confidences[i] - confidences[i - 1]));
    }

    const avgAbsChangeRate = changeRates.reduce((sum, v) => sum + v, 0) / changeRates.length;

    return 100 * (1 - Math.min(avgAbsChangeRate * 5, 1));
  } catch (error) {
    logger.error(
      'Failed to calculate confidence stability',
      error instanceof Error ? error : new Error(String(error))
    );
    return 80;
  }
}

function calculateDataCompleteness(
  timestamps: number[],
  expectedInterval: number,
  timeWindow: number
): number {
  try {
    if (!expectedInterval || expectedInterval <= 0) {
      return 80;
    }

    if (!timestamps || timestamps.length === 0) {
      return 0;
    }

    if (timeWindow <= 0) {
      return 80;
    }

    const expectedCount = timeWindow / 1000 / expectedInterval;
    const actualCount = timestamps.length;

    return 100 * Math.min(actualCount / expectedCount, 1);
  } catch (error) {
    logger.error(
      'Failed to calculate data completeness',
      error instanceof Error ? error : new Error(String(error))
    );
    return 80;
  }
}

function calculateStabilityScore(
  provider: string,
  prices: number[],
  timestamps: number[],
  confidences: number[],
  expectedInterval: number
): StabilityScore {
  try {
    const priceConsistency = calculatePriceConsistency(prices);
    const updateFrequencyConsistency = calculateUpdateFrequencyConsistency(timestamps);
    const confidenceStability = calculateConfidenceStability(confidences);

    const timeWindow =
      timestamps.length >= 2 ? timestamps[timestamps.length - 1] - timestamps[0] : 0;
    const dataCompleteness = calculateDataCompleteness(timestamps, expectedInterval, timeWindow);

    const components: StabilityComponents = {
      priceConsistency: Math.round(priceConsistency),
      updateFrequencyConsistency: Math.round(updateFrequencyConsistency),
      confidenceStability: Math.round(confidenceStability),
      dataCompleteness: Math.round(dataCompleteness),
    };

    const score = Math.round(
      priceConsistency * COMPONENT_WEIGHTS.priceConsistency +
        updateFrequencyConsistency * COMPONENT_WEIGHTS.updateFrequencyConsistency +
        confidenceStability * COMPONENT_WEIGHTS.confidenceStability +
        dataCompleteness * COMPONENT_WEIGHTS.dataCompleteness
    );

    const level = getStabilityLevel(score);

    const history = stabilityHistoryMap.get(provider) ?? [];
    const trend = history.length >= 3 ? detectDecayTrend(history.map((h) => h.score)) : 'stable';

    const decayRate =
      history.length >= 2 ? calculateLinearRegressionSlope(history.map((h) => h.score)) : 0;

    const estimatedTimeToCritical = estimateTimeToCritical(
      score,
      decayRate,
      expectedInterval > 0 ? expectedInterval : 1
    );

    return {
      provider,
      score,
      level,
      components,
      trend,
      decayRate: Number(decayRate.toFixed(4)),
      estimatedTimeToCritical,
    };
  } catch (error) {
    logger.error(
      'Failed to calculate stability score',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      provider,
      score: 0,
      level: 'critical',
      components: {
        priceConsistency: 0,
        updateFrequencyConsistency: 0,
        confidenceStability: 0,
        dataCompleteness: 0,
      },
      trend: 'stable',
      decayRate: 0,
      estimatedTimeToCritical: null,
    };
  }
}

function detectDecayTrend(recentScores: number[]): DecayTrend {
  try {
    if (!recentScores || recentScores.length < 2) {
      return 'stable';
    }

    const slope = calculateLinearRegressionSlope(recentScores);

    if (slope < -2) return 'rapidly_declining';
    if (slope < -0.5) return 'declining';
    if (slope < 0.5) return 'stable';
    return 'improving';
  } catch (error) {
    logger.error(
      'Failed to detect decay trend',
      error instanceof Error ? error : new Error(String(error))
    );
    return 'stable';
  }
}

function estimateTimeToCritical(
  currentScore: number,
  decayRate: number,
  updateInterval: number
): number | null {
  try {
    if (decayRate >= 0) {
      return null;
    }

    if (currentScore <= 40) {
      return 0;
    }

    const updatesToCritical = (currentScore - 40) / Math.abs(decayRate);
    const timeInSeconds = updatesToCritical * updateInterval;

    return Math.round(timeInSeconds);
  } catch (error) {
    logger.error(
      'Failed to estimate time to critical',
      error instanceof Error ? error : new Error(String(error))
    );
    return null;
  }
}

export function calculateStability(
  priceData: string[],
  priceHistoryMap: Map<
    string,
    { price: number; timestamp: number; success: boolean; confidence?: number }[]
  >,
  currentTime?: number
): StabilityResult {
  const now = currentTime ?? Date.now();
  try {
    const currentProviders = new Set(priceData);
    for (const key of stabilityHistoryMap.keys()) {
      if (!currentProviders.has(key)) {
        stabilityHistoryMap.delete(key);
      }
    }

    const scores: StabilityScore[] = [];
    const allHistory: StabilityHistoryPoint[] = [];
    let decliningCount = 0;
    let rapidlyDecliningCount = 0;
    let worstProvider: string | null = null;
    let worstScore = 101;

    for (const provider of priceData) {
      const history = priceHistoryMap.get(provider);
      if (!history || history.length < 5) {
        continue;
      }

      const validHistory = history.filter((h) => h.success);
      if (validHistory.length < 5) {
        continue;
      }

      const prices = validHistory.map((h) => h.price);
      const timestamps = validHistory.map((h) => h.timestamp);
      const confidences = validHistory
        .map((h) => h.confidence)
        .filter((c): c is number => c !== undefined);

      const expectedInterval = ORACLE_EXPECTED_INTERVALS[provider.toLowerCase()] ?? 60;

      const stabilityScore = calculateStabilityScore(
        provider,
        prices,
        timestamps,
        confidences,
        expectedInterval
      );

      const historyPoint: StabilityHistoryPoint = {
        timestamp: now,
        score: stabilityScore.score,
        priceConsistency: stabilityScore.components.priceConsistency,
        updateFrequencyConsistency: stabilityScore.components.updateFrequencyConsistency,
        confidenceStability: stabilityScore.components.confidenceStability,
        dataCompleteness: stabilityScore.components.dataCompleteness,
      };

      const existingHistory = stabilityHistoryMap.get(provider) ?? [];
      existingHistory.push(historyPoint);
      if (existingHistory.length > MAX_HISTORY_POINTS) {
        existingHistory.splice(0, existingHistory.length - MAX_HISTORY_POINTS);
      }
      stabilityHistoryMap.set(provider, existingHistory);

      allHistory.push(historyPoint);
      scores.push(stabilityScore);

      if (stabilityScore.trend === 'declining') {
        decliningCount++;
      }
      if (stabilityScore.trend === 'rapidly_declining') {
        rapidlyDecliningCount++;
        decliningCount++;
      }

      if (stabilityScore.score < worstScore) {
        worstScore = stabilityScore.score;
        worstProvider = provider;
      }
    }

    const averageScore =
      scores.length > 0
        ? Math.round(scores.reduce((sum, s) => sum + s.score, 0) / scores.length)
        : 0;

    const averageLevel = getStabilityLevel(averageScore);

    logger.info(
      `Stability calculated. Providers: ${scores.length}, Avg score: ${averageScore}, Declining: ${decliningCount}`
    );

    return {
      scores,
      history: allHistory,
      decliningCount,
      rapidlyDecliningCount,
      averageScore,
      averageLevel,
      worstProvider,
      worstScore: worstScore === 101 ? 0 : worstScore,
    };
  } catch (error) {
    logger.error(
      'Failed to calculate stability',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      scores: [],
      history: [],
      decliningCount: 0,
      rapidlyDecliningCount: 0,
      averageScore: 0,
      averageLevel: 'critical',
      worstProvider: null,
      worstScore: 0,
    };
  }
}
