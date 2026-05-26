import { getSymbolCategory } from '@/lib/constants';
import { createLogger } from '@/lib/utils/logger';
import {
  calculateMean,
  calculateMedian,
  calculateStandardDeviationFromVariance,
  calculateVariance,
  calculateZScore,
} from '@/lib/utils/statistics';

const logger = createLogger('consensusPrice');

export type ConsensusMethod = 'median' | 'trimmed_mean' | 'weighted_median' | 'iqr_filtered';

export type ConsensusConfidenceLevel = 'high' | 'medium' | 'low' | 'very_low';

export interface ConsensusPriceInput {
  provider: string;
  price: number;
  timestamp: number;
  confidence?: number;
  confidenceInterval?: {
    bid: number;
    ask: number;
    widthPercentage: number;
  };
}

export interface ConsensusResult {
  price: number;
  method: ConsensusMethod;
  confidenceLevel: ConsensusConfidenceLevel;
  confidence: number;
  agreement: number;
  participantCount: number;
  excludedCount: number;
  excludedProviders: string[];
  priceRange: { min: number; max: number };
  methodResults: Record<ConsensusMethod, number>;
  recommendedMethod: ConsensusMethod;
}

export interface ConsensusHistoryPoint {
  timestamp: number;
  price: number;
  confidence: number;
  agreement: number;
  method: ConsensusMethod;
  participantCount: number;
}

const MAX_HISTORY_POINTS = 100;

const consensusHistoryMap = new Map<string, ConsensusHistoryPoint[]>();

export function resetConsensusHistory(): void {
  consensusHistoryMap.clear();
}

const DEVIATION_THRESHOLDS: Record<string, number> = {
  stablecoin: 0.005,
  major: 0.05,
  alt: 0.15,
  micro: 0.3,
};

const HISTORY_DEVIATION_MULTIPLIER = 3;

function getDeviationThreshold(category: string): number {
  return DEVIATION_THRESHOLDS[category] ?? DEVIATION_THRESHOLDS.alt;
}

function getRecommendedMethod(category: 'stablecoin' | 'major' | 'alt' | 'micro'): ConsensusMethod {
  switch (category) {
    case 'stablecoin':
      return 'iqr_filtered';
    case 'major':
      return 'weighted_median';
    case 'alt':
      return 'trimmed_mean';
    case 'micro':
      return 'median';
  }
}

function medianMethod(prices: number[]): number {
  return calculateMedian(prices);
}

function trimmedMeanMethod(prices: number[], trimRatio: number = 0.25): number {
  if (prices.length < 3) return calculateMean(prices);
  const sorted = [...prices].sort((a, b) => a - b);
  const trimCount = Math.max(1, Math.floor(sorted.length * trimRatio));
  if (trimCount * 2 >= sorted.length) return calculateMedian(prices);
  const trimmed = sorted.slice(trimCount, sorted.length - trimCount);
  return calculateMean(trimmed);
}

function weightedMedianMethod(
  inputs: ConsensusPriceInput[],
  getWeight: (input: ConsensusPriceInput) => number
): number {
  if (inputs.length === 0) return 0;
  if (inputs.length === 1) return inputs[0].price;

  const weighted = inputs
    .map((input) => ({ price: input.price, weight: getWeight(input) }))
    .sort((a, b) => a.price - b.price);

  const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
  if (totalWeight === 0) return calculateMedian(inputs.map((i) => i.price));

  const halfWeight = totalWeight / 2;
  let cumulativeWeight = 0;

  for (const item of weighted) {
    cumulativeWeight += item.weight;
    if (cumulativeWeight >= halfWeight) {
      return item.price;
    }
  }

  return weighted[weighted.length - 1].price;
}

function iqrFilteredMethod(inputs: ConsensusPriceInput[], symbol?: string): number {
  if (inputs.length < 3) {
    const prices = inputs.map((i) => i.price);
    if (inputs.length <= 1) return calculateMedian(prices);
    const [priceA, priceB] = prices.sort((a, b) => a - b);
    const ref = priceB > 0 ? priceB : 1;
    const deviation = (priceB - priceA) / ref;
    const category = symbol ? getSymbolCategory(symbol) : 'alt';
    const threshold = getDeviationThreshold(category);
    if (deviation <= threshold) {
      return (priceA + priceB) / 2;
    }
    const confA = inputs.find((i) => i.price === priceA)?.confidence ?? 0.5;
    const confB = inputs.find((i) => i.price === priceB)?.confidence ?? 0.5;
    return confA >= confB ? priceA : priceB;
  }

  const prices = inputs.map((i) => i.price).sort((a, b) => a - b);
  const q1Index = Math.floor(prices.length * 0.25);
  const q3Index = Math.floor(prices.length * 0.75);
  const q1 = prices[q1Index];
  const q3 = prices[q3Index];
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  const filtered = inputs.filter((input) => input.price >= lowerBound && input.price <= upperBound);

  if (filtered.length === 0) return calculateMedian(prices);

  return calculateMedian(filtered.map((i) => i.price));
}

interface DetectOutliersContext {
  symbol?: string;
  historyKey?: string;
}

function detectOutliers(
  inputs: ConsensusPriceInput[],
  context?: DetectOutliersContext
): {
  valid: ConsensusPriceInput[];
  outliers: ConsensusPriceInput[];
} {
  if (inputs.length === 0) {
    return { valid: [], outliers: [] };
  }

  if (inputs.length === 1) {
    const input = inputs[0];
    const isOutlier = checkSingleSourceOutlier(input, context);
    return isOutlier ? { valid: [], outliers: [input] } : { valid: [input], outliers: [] };
  }

  if (inputs.length === 2) {
    return detectDualSourceOutliers(inputs, context);
  }

  const prices = inputs.map((i) => i.price);
  const mean = calculateMean(prices);
  const stdDev = calculateStandardDeviationFromVariance(calculateVariance(prices, mean));

  if (stdDev === 0) {
    return { valid: inputs, outliers: [] };
  }

  const outlierThreshold = 2.5;

  const valid: ConsensusPriceInput[] = [];
  const outliers: ConsensusPriceInput[] = [];

  for (const input of inputs) {
    const zScore = Math.abs(calculateZScore(input.price, mean, stdDev) ?? 0);
    if (zScore > outlierThreshold) {
      outliers.push(input);
    } else {
      valid.push(input);
    }
  }

  if (valid.length === 0) {
    return { valid: inputs, outliers: [] };
  }

  return { valid, outliers };
}

function checkSingleSourceOutlier(
  input: ConsensusPriceInput,
  context?: DetectOutliersContext
): boolean {
  if (!context?.historyKey) return false;

  const history = consensusHistoryMap.get(context.historyKey);
  if (!history || history.length < 3) return false;

  const recentPrices = history.slice(-10).map((h) => h.price);
  const histMean = calculateMean(recentPrices);
  if (histMean === 0) return false;

  const category = context.symbol ? getSymbolCategory(context.symbol) : 'alt';
  const threshold = getDeviationThreshold(category) * HISTORY_DEVIATION_MULTIPLIER;
  const deviation = Math.abs(input.price - histMean) / histMean;

  return deviation > threshold;
}

function detectDualSourceOutliers(
  inputs: ConsensusPriceInput[],
  context?: DetectOutliersContext
): { valid: ConsensusPriceInput[]; outliers: ConsensusPriceInput[] } {
  const [a, b] = inputs;
  const referencePrice = Math.max(a.price, b.price);
  const deviation = referencePrice > 0 ? Math.abs(a.price - b.price) / referencePrice : 0;

  const category = context?.symbol ? getSymbolCategory(context.symbol) : 'alt';
  const threshold = getDeviationThreshold(category);

  if (deviation <= threshold) {
    return { valid: inputs, outliers: [] };
  }

  const confA = a.confidence ?? 0.5;
  const confB = b.confidence ?? 0.5;
  const ciWidthA = a.confidenceInterval?.widthPercentage ?? Infinity;
  const ciWidthB = b.confidenceInterval?.widthPercentage ?? Infinity;

  const scoreA = confA * 0.6 + (1 - Math.min(ciWidthA, 100) / 100) * 0.4;
  const scoreB = confB * 0.6 + (1 - Math.min(ciWidthB, 100) / 100) * 0.4;

  const scoreDiff = Math.abs(scoreA - scoreB);
  if (scoreDiff < 0.15) {
    if (context?.historyKey) {
      const history = consensusHistoryMap.get(context.historyKey);
      if (history && history.length >= 3) {
        const recentPrices = history.slice(-10).map((h) => h.price);
        const histMean = calculateMean(recentPrices);
        if (histMean > 0) {
          const histDevA = Math.abs(a.price - histMean) / histMean;
          const histDevB = Math.abs(b.price - histMean) / histMean;
          if (Math.abs(histDevA - histDevB) > threshold) {
            const outlier = histDevA > histDevB ? a : b;
            const validSource = histDevA > histDevB ? b : a;
            return { valid: [validSource], outliers: [outlier] };
          }
        }
      }
    }
    return { valid: inputs, outliers: [] };
  }

  const outlier = scoreA < scoreB ? a : b;
  const valid = scoreA < scoreB ? b : a;

  return { valid: [valid], outliers: [outlier] };
}

function calculateAgreement(prices: number[]): number {
  if (prices.length < 2) return 1;
  const mean = calculateMean(prices);
  if (mean === 0) return 0;
  const stdDev = calculateStandardDeviationFromVariance(calculateVariance(prices, mean));
  const cv = stdDev / mean;
  return Math.max(0, Math.min(1, 1 - cv * 10));
}

function calculateConsensusConfidence(
  participantCount: number,
  agreement: number,
  excludedCount: number
): number {
  const participantScore = Math.min(1, participantCount / 5);
  const exclusionPenalty = Math.min(0.3, excludedCount * 0.1);
  return Math.max(
    0,
    Math.min(1, participantScore * 0.4 + agreement * 0.4 + (1 - exclusionPenalty) * 0.2)
  );
}

function getConfidenceLevel(confidence: number): ConsensusConfidenceLevel {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.6) return 'medium';
  if (confidence >= 0.4) return 'low';
  return 'very_low';
}

function computeMethod(
  method: ConsensusMethod,
  validInputs: ConsensusPriceInput[],
  symbol?: string
): number {
  const prices = validInputs.map((i) => i.price);
  switch (method) {
    case 'median':
      return medianMethod(prices);
    case 'trimmed_mean':
      return trimmedMeanMethod(prices);
    case 'weighted_median':
      return weightedMedianMethod(validInputs, (input) => {
        const confidenceWeight = input.confidence ?? 0.8;
        const ageSeconds = Math.abs(Date.now() - input.timestamp) / 1000;
        const freshnessWeight = Math.max(0.5, Math.exp(-ageSeconds / 600));
        const ciWidth = input.confidenceInterval?.widthPercentage ?? 10;
        const ciWeight = Math.max(0.1, 1 - ciWidth / 20);
        return confidenceWeight * 0.4 + freshnessWeight * 0.35 + ciWeight * 0.25;
      });
    case 'iqr_filtered':
      return iqrFilteredMethod(validInputs, symbol);
  }
}

function computeAllMethods(
  validInputs: ConsensusPriceInput[],
  symbol?: string
): Record<ConsensusMethod, number> {
  return {
    median: computeMethod('median', validInputs, symbol),
    trimmed_mean: computeMethod('trimmed_mean', validInputs, symbol),
    weighted_median: computeMethod('weighted_median', validInputs, symbol),
    iqr_filtered: computeMethod('iqr_filtered', validInputs, symbol),
  };
}

const EMPTY_METHOD_RESULTS: Record<ConsensusMethod, number> = {
  median: 0,
  trimmed_mean: 0,
  weighted_median: 0,
  iqr_filtered: 0,
};

export function calculateConsensusPrice(
  inputs: ConsensusPriceInput[],
  method?: ConsensusMethod,
  symbol?: string
): ConsensusResult {
  try {
    const validInputs = inputs.filter((i) => i.price > 0 && Number.isFinite(i.price));
    if (validInputs.length === 0) {
      return {
        price: 0,
        method: method ?? 'median',
        confidenceLevel: 'very_low',
        confidence: 0,
        agreement: 0,
        participantCount: 0,
        excludedCount: 0,
        excludedProviders: [],
        priceRange: { min: 0, max: 0 },
        methodResults: { ...EMPTY_METHOD_RESULTS },
        recommendedMethod: 'median',
      };
    }

    const historyKey = symbol ?? 'default';
    const { valid, outliers } = detectOutliers(validInputs, { symbol, historyKey });
    const category = symbol ? getSymbolCategory(symbol) : 'alt';
    const recommendedMethod = getRecommendedMethod(category);
    const activeMethod = method ?? recommendedMethod;

    const consensusPrice = computeMethod(activeMethod, valid, symbol);

    const validPrices = valid.map((i) => i.price);
    const agreement = calculateAgreement(validPrices);
    let confidence = calculateConsensusConfidence(valid.length, agreement, outliers.length);

    if (validInputs.length <= 2 && valid.length < validInputs.length) {
      confidence = Math.min(confidence, 0.39);
    } else if (validInputs.length <= 2) {
      confidence = Math.min(confidence, 0.59);
    }

    const confidenceLevel = getConfidenceLevel(confidence);

    const priceRange = {
      min: Math.min(...validPrices),
      max: Math.max(...validPrices),
    };

    const excludedProviders = outliers.map((o) => o.provider);

    return {
      price: consensusPrice,
      method: activeMethod,
      confidenceLevel,
      confidence,
      agreement,
      participantCount: valid.length,
      excludedCount: outliers.length,
      excludedProviders,
      priceRange,
      methodResults: computeAllMethods(valid, symbol),
      recommendedMethod,
    };
  } catch (error) {
    logger.error(
      'Failed to calculate consensus price',
      error instanceof Error ? error : new Error(String(error))
    );
    const prices = inputs.map((i) => i.price).filter((p) => p > 0);
    return {
      price: prices.length > 0 ? calculateMedian(prices) : 0,
      method: method ?? 'median',
      confidenceLevel: 'very_low',
      confidence: 0,
      agreement: 0,
      participantCount: inputs.length,
      excludedCount: 0,
      excludedProviders: [],
      priceRange: { min: 0, max: 0 },
      methodResults: { ...EMPTY_METHOD_RESULTS },
      recommendedMethod: 'median',
    };
  }
}

export function recordConsensusHistory(key: string, result: ConsensusResult): void {
  const history = consensusHistoryMap.get(key) ?? [];
  const point: ConsensusHistoryPoint = {
    timestamp: Date.now(),
    price: result.price,
    confidence: result.confidence,
    agreement: result.agreement,
    method: result.method,
    participantCount: result.participantCount,
  };
  history.push(point);
  if (history.length > MAX_HISTORY_POINTS) {
    history.shift();
  }
  consensusHistoryMap.set(key, history);
}

export function getConsensusHistory(key: string): ConsensusHistoryPoint[] {
  return consensusHistoryMap.get(key) ?? [];
}

export function getConsensusMethodLabel(method: ConsensusMethod): string {
  const labels: Record<ConsensusMethod, string> = {
    median: 'Median',
    trimmed_mean: 'Trimmed Mean',
    weighted_median: 'Weighted Median',
    iqr_filtered: 'IQR Filtered',
  };
  return labels[method];
}

export function getConsensusMethodDescription(method: ConsensusMethod): string {
  const descriptions: Record<ConsensusMethod, string> = {
    median: 'Middle value of sorted prices, robust against extreme outliers',
    trimmed_mean: 'Mean after removing top and bottom 25%, balanced accuracy',
    weighted_median: 'Median weighted by confidence, freshness and interval stability',
    iqr_filtered: 'Removes IQR outliers then takes median, best for stablecoins',
  };
  return descriptions[method];
}
