import { getSymbolCategory } from '@/lib/constants';
import { createLogger, normalizeError } from '@/lib/utils/logger';
import {
  calculateMean,
  calculateMedian,
  calculateStandardDeviationFromVariance,
  calculateVariance,
} from '@/lib/utils/statistics';

const logger = createLogger('consensusPrice');

export type ConsensusMethod = 'median' | 'trimmed_mean' | 'weighted_median' | 'iqr_filtered';

type ConsensusConfidenceLevel = 'high' | 'medium' | 'low' | 'very_low';

export interface ConsensusPriceInput {
  provider: string;
  price: number;
  timestamp: number;
  ingestionTimestamp?: number;
  /** Oracle-true age in seconds (preferred over ingestionTimestamp for freshness).
   *  When present and old, the freshness guard may exclude the participant. */
  dataAgeSeconds?: number;
  confidence?: number;
  confidenceInterval?: {
    bid: number;
    ask: number;
    widthPercentage: number;
  };
}

/**
 * Consensus freshness guard. A participant is treated as *effectively stale*
 * (and excluded from the price aggregate) only when BOTH its oracle-true age is
 * >= this AND its price diverges from the fresh consensus median by more than
 * {@link FRESHNESS_STALE_DIVERGENCE_PCT}.
 *
 * Old age ALONE (e.g. API3 communal dAPIs report a 7-120d-old `updatedAt` while
 * serving a current price) is a timestamp-source anomaly, NOT dead data, and
 * must stay in the consensus — otherwise we would drop a provider's fresh price
 * over a lying timestamp. This is the same consensus-aware principle used by the
 * pre-trade 7-day hard backstop, applied at the consensus layer so a stuck/wrong
 * feed cannot pollute the aggregate (the B-audit [HIGH]: "陈旧一致价拉偏 consensus").
 */
export const FRESHNESS_STALE_AGE_SECONDS = 3600;
export const FRESHNESS_STALE_DIVERGENCE_PCT = 2.0;

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

interface ConsensusHistoryPoint {
  timestamp: number;
  price: number;
  confidence: number;
  agreement: number;
  method: ConsensusMethod;
  participantCount: number;
}

const MAX_HISTORY_POINTS = 100;
const MAX_HISTORY_ENTRIES = 1000;
const HISTORY_TTL_MS = 10 * 60 * 1000; // 10 minutes

const consensusHistoryMap = new Map<string, ConsensusHistoryPoint[]>();

export function resetConsensusHistory(): void {
  consensusHistoryMap.clear();
}

function getHistoryEntry(key: string): ConsensusHistoryPoint[] | undefined {
  const history = consensusHistoryMap.get(key);
  if (!history || history.length === 0) return undefined;

  const now = Date.now();
  const filtered = history.filter((point) => now - point.timestamp <= HISTORY_TTL_MS);

  if (filtered.length === 0) {
    consensusHistoryMap.delete(key);
    return undefined;
  }

  if (filtered.length !== history.length) {
    consensusHistoryMap.set(key, filtered);
  }

  return filtered;
}

function setHistoryEntry(key: string, value: ConsensusHistoryPoint[]): void {
  const now = Date.now();
  const filtered = value.filter((point) => now - point.timestamp <= HISTORY_TTL_MS);

  if (filtered.length === 0) {
    consensusHistoryMap.delete(key);
    return;
  }

  consensusHistoryMap.set(key, filtered);
  enforceHistoryCapacity();
}

function enforceHistoryCapacity(): void {
  if (consensusHistoryMap.size <= MAX_HISTORY_ENTRIES) return;

  const entries = Array.from(consensusHistoryMap.entries());
  entries.sort((a, b) => {
    const aLast = a[1].length > 0 ? a[1][a[1].length - 1].timestamp : 0;
    const bLast = b[1].length > 0 ? b[1][b[1].length - 1].timestamp : 0;
    return aLast - bLast;
  });

  const toRemove = consensusHistoryMap.size - MAX_HISTORY_ENTRIES;
  for (let i = 0; i < toRemove; i++) {
    consensusHistoryMap.delete(entries[i][0]);
  }
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

/**
 * Robust outlier gate (3+ sources): median + MAD instead of mean + sample σ.
 *
 * WHY NOT MEAN + σ: under a SAMPLE standard deviation (÷ n-1) a single point's
 * z-score is mathematically capped at (n-1)/√n. For n ≤ 8 that cap sits below
 * the former 2.5 threshold (n=6 → 2.041, n=8 → 2.475), so the old gate could
 * never fire at the participant counts this system actually observes. A
 * contaminated provider always survived detection and went on to poison
 * maxDeviationPct / agreement while the consensus price itself stayed correct.
 *
 * WHY NOT PURE MAD: when providers agree tightly, MAD collapses toward zero and
 * trivial spread (e.g. 0.017% on USDT) yields an enormous modified z-score,
 * flagging healthy providers. Requiring BOTH statistical significance AND a
 * materially large absolute deviation keeps the gate honest — measured on live
 * data this cuts false exclusions from 10 providers to 3 with identical verdict
 * corrections.
 */
const OUTLIER_MAD_Z_THRESHOLD = 3.5;
const OUTLIER_MIN_ABS_DEVIATION_PCT = 1.0;
/** Scales MAD to a σ-equivalent for normally distributed data. */
const MAD_CONSISTENCY_CONSTANT = 0.6745;
/**
 * COLLUSION GUARD. MAD is anchored on the median, which a colluding majority
 * controls: if most providers were manipulated together, the honest minority
 * would score as outliers and be discarded, silently building consensus on the
 * corrupted majority. Capping exclusions ensures a majority can never be
 * dropped — at most a third of participants, and never below two survivors.
 */
const MAX_OUTLIER_EXCLUSION_RATIO = 1 / 3;

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
  const medianPrice = calculateMedian(prices);
  const mad = calculateMedian(prices.map((p) => Math.abs(p - medianPrice)));

  if (mad === 0) {
    return { valid: inputs, outliers: [] };
  }

  const scored = inputs.map((input) => ({
    input,
    zScore: (MAD_CONSISTENCY_CONSTANT * Math.abs(input.price - medianPrice)) / mad,
    absDeviationPct:
      medianPrice > 0 ? (Math.abs(input.price - medianPrice) / medianPrice) * 100 : 0,
  }));

  const candidates = scored
    .filter(
      (c) => c.zScore > OUTLIER_MAD_Z_THRESHOLD && c.absDeviationPct > OUTLIER_MIN_ABS_DEVIATION_PCT
    )
    .sort((a, b) => b.zScore - a.zScore);

  if (candidates.length === 0) {
    return { valid: inputs, outliers: [] };
  }

  const maxExclusions = Math.min(
    Math.floor(inputs.length * MAX_OUTLIER_EXCLUSION_RATIO),
    inputs.length - 2
  );
  const excluded = candidates.slice(0, Math.max(0, maxExclusions));

  if (excluded.length === 0) {
    return { valid: inputs, outliers: [] };
  }

  const excludedSet = new Set(excluded.map((c) => c.input));
  const outliers = excluded.map((c) => c.input);
  const valid = inputs.filter((i) => !excludedSet.has(i));

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

  const history = getHistoryEntry(context.historyKey);
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
      const history = getHistoryEntry(context.historyKey);
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

/**
 * Sensitivity multiplier for the coefficient of variation in agreement scoring.
 * Higher values make agreement drop faster as price dispersion increases.
 */
const AGREEMENT_CV_SENSITIVITY = 10;

/**
 * Cross-provider agreement from a price set, as a 0-1 score (higher = more
 * agreement). Exported for the Oracle Watch historical backfill so its
 * agreement matches the live consensus engine exactly.
 * @param prices Non-empty array of provider prices.
 */
export function calculateAgreement(prices: number[]): number {
  if (prices.length < 2) return 1;
  const mean = calculateMean(prices);
  if (mean === 0) return 0;
  const stdDev = calculateStandardDeviationFromVariance(calculateVariance(prices, mean));
  const cv = stdDev / mean;
  return Math.max(0, Math.min(1, 1 - cv * AGREEMENT_CV_SENSITIVITY));
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

const CONFIDENCE_LEVELS: ReadonlyArray<{ min: number; level: ConsensusConfidenceLevel }> = [
  { min: 0.8, level: 'high' },
  { min: 0.6, level: 'medium' },
  { min: 0.4, level: 'low' },
];

function getConfidenceLevel(confidence: number): ConsensusConfidenceLevel {
  for (const { min, level } of CONFIDENCE_LEVELS) {
    if (confidence >= min) return level;
  }
  return 'very_low';
}

/**
 * True only when the participant is BOTH old (oracle-true age >=
 * {@link FRESHNESS_STALE_AGE_SECONDS}) AND its price diverges from the fresh
 * consensus median by more than {@link FRESHNESS_STALE_DIVERGENCE_PCT}. A stale
 * timestamp with a price still in consensus is a timestamp-source anomaly and
 * returns false (kept in the aggregate). Unknown age or fresh age returns false.
 */
function isEffectivelyStale(input: ConsensusPriceInput, refMedian: number): boolean {
  const age = input.dataAgeSeconds;
  if (age === undefined || age === null) return false;
  if (age < FRESHNESS_STALE_AGE_SECONDS) return false;
  if (refMedian <= 0 || input.price <= 0) return false;
  const deviation = (Math.abs(input.price - refMedian) / refMedian) * 100;
  return deviation > FRESHNESS_STALE_DIVERGENCE_PCT;
}

function computeMethod(
  method: ConsensusMethod,
  validInputs: ConsensusPriceInput[],
  symbol?: string,
  currentTime: number = Date.now()
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
        // Oracle-true age when available; fall back to timestamp-based age.
        // (Previously used ingestionTimestamp, which live fetches set to now() —
        // blinding the weight so stale/API3 data got full weight. Same bad-clock
        // bug B3 fixed in the pre-trade path.)
        const ageSeconds = input.dataAgeSeconds ?? (currentTime - input.timestamp) / 1000;
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
  symbol?: string,
  currentTime: number = Date.now()
): Record<ConsensusMethod, number> {
  return {
    median: computeMethod('median', validInputs, symbol, currentTime),
    trimmed_mean: computeMethod('trimmed_mean', validInputs, symbol, currentTime),
    weighted_median: computeMethod('weighted_median', validInputs, symbol, currentTime),
    iqr_filtered: computeMethod('iqr_filtered', validInputs, symbol, currentTime),
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
  symbol?: string,
  currentTime: number = Date.now()
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

    // Freshness guard (consensus-aware): exclude participants that are BOTH old
    // and price-divergent from the fresh consensus — genuinely dead/wrong data.
    // A stale timestamp whose price still agrees (API3-style timestamp anomaly)
    // is NOT excluded, so we never drop a provider's fresh price over a lying
    // timestamp. When excluding would leave < 2 fresh participants we fall back
    // to `valid` (can't safely drop sources), so participantCount (coverage)
    // is always preserved.
    const refMedian = calculateMedian(valid.map((i) => i.price));
    const stale = valid.filter((i) => isEffectivelyStale(i, refMedian));
    const fresh = valid.filter((i) => !stale.includes(i));
    const useFresh = fresh.length >= 2;
    const priceInputs = useFresh ? fresh : valid;
    const freshnessExcluded = useFresh ? stale : [];

    const consensusPrice = computeMethod(activeMethod, priceInputs, symbol);

    const validPrices = priceInputs.map((i) => i.price);
    const agreement = calculateAgreement(validPrices);
    let confidence = calculateConsensusConfidence(
      valid.length,
      agreement,
      outliers.length + freshnessExcluded.length
    );

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

    const excludedProviders = [
      ...outliers.map((o) => o.provider),
      ...freshnessExcluded.map((o) => o.provider),
    ];

    return {
      price: consensusPrice,
      method: activeMethod,
      confidenceLevel,
      confidence,
      agreement,
      participantCount: valid.length,
      excludedCount: excludedProviders.length,
      excludedProviders,
      priceRange,
      methodResults: computeAllMethods(priceInputs, symbol, currentTime),
      recommendedMethod,
    };
  } catch (error) {
    logger.error('Failed to calculate consensus price', normalizeError(error));
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
  const history = getHistoryEntry(key) ?? [];
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
  setHistoryEntry(key, history);
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
