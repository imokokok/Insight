import { createLogger, normalizeError } from '@/lib/utils/logger';

import {
  calculateConsensusPrice as computeConsensus,
  type ConsensusPriceInput,
} from './consensusPrice';

const logger = createLogger('divergenceSignals');

export type DivergenceDirection = 'positive' | 'negative' | 'neutral';
export type DivergenceAcceleration = 'accelerating' | 'decelerating' | 'stable';
export type LeadershipStatus = 'leading' | 'synchronized' | 'lagging';

interface DivergencePoint {
  timestamp: number;
  deviationPercent: number;
  direction: DivergenceDirection;
  price: number;
  consensusPrice: number;
}

export interface DivergenceTimeSeries {
  provider: string;
  points: DivergencePoint[];
  currentDeviation: number;
  currentDirection: DivergenceDirection;
  acceleration: DivergenceAcceleration;
  accelerationValue: number;
  isDirectionalBias: boolean;
  directionalBiasCount: number;
  maxDeviation: number;
  avgDeviation: number;
}

export interface OracleLeadership {
  provider: string;
  status: LeadershipStatus;
  lagSeconds: number;
  avgLagSeconds: number;
  firstResponseCount: number;
  totalUpdates: number;
}

export interface DivergencePair {
  providerA: string;
  providerB: string;
  deviationPercent: number;
  timestamp: number;
}

export interface DivergenceSignalResult {
  timeSeries: DivergenceTimeSeries[];
  leadership: OracleLeadership[];
  divergenceMatrix: DivergencePair[][];
  acceleratingCount: number;
  directionalBiasCount: number;
  leadingOracle: string | null;
  maxAcceleration: number;
}

interface PriceData {
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

interface PriceHistoryEntry {
  price: number;
  timestamp: number;
  success: boolean;
}

const ACCELERATION_THRESHOLD = 0.1;

const SIGNIFICANT_CHANGE_THRESHOLD = 0.01;
const DIRECTIONAL_BIAS_MIN_CONSECUTIVE = 3;
const LEADING_LAG_THRESHOLD = 1;
const SYNCHRONIZED_LAG_THRESHOLD = 5;

function getConsensusPrice(prices: number[]): number {
  try {
    if (!prices || prices.length === 0) return 0;
    const inputs: ConsensusPriceInput[] = prices.map((price, i) => ({
      provider: `oracle_${i}`,
      price,
      timestamp: Date.now(),
    }));
    const result = computeConsensus(inputs, 'median');
    return result.price;
  } catch (error) {
    logger.error('Failed to calculate consensus price', normalizeError(error));
    const sorted = [...prices].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  }
}

function calculateAcceleration(deviations: number[]): {
  value: number;
  status: DivergenceAcceleration;
} {
  try {
    if (!deviations || deviations.length < 3) {
      return { value: 0, status: 'stable' };
    }

    const firstDiffs: number[] = [];
    for (let i = 1; i < deviations.length; i++) {
      firstDiffs.push(deviations[i] - deviations[i - 1]);
    }

    const secondDiffs: number[] = [];
    for (let i = 1; i < firstDiffs.length; i++) {
      secondDiffs.push(firstDiffs[i] - firstDiffs[i - 1]);
    }

    if (secondDiffs.length === 0) {
      return { value: 0, status: 'stable' };
    }

    const avgSecondDiff = secondDiffs.reduce((sum, d) => sum + d, 0) / secondDiffs.length;

    let status: DivergenceAcceleration;
    if (avgSecondDiff > ACCELERATION_THRESHOLD) {
      status = 'accelerating';
    } else if (avgSecondDiff < -ACCELERATION_THRESHOLD) {
      status = 'decelerating';
    } else {
      status = 'stable';
    }

    return { value: Number(avgSecondDiff.toFixed(4)), status };
  } catch (error) {
    logger.error('Failed to calculate acceleration', normalizeError(error));
    return { value: 0, status: 'stable' };
  }
}

function detectDirectionalBias(directions: DivergenceDirection[]): {
  isBias: boolean;
  count: number;
} {
  try {
    if (!directions || directions.length === 0) {
      return { isBias: false, count: 0 };
    }

    const nonNeutral = directions.filter((d) => d !== 'neutral');
    if (nonNeutral.length === 0) {
      return { isBias: false, count: 0 };
    }

    let maxConsecutive = 1;
    let currentConsecutive = 1;
    let currentDirection = nonNeutral[0];

    for (let i = 1; i < nonNeutral.length; i++) {
      if (nonNeutral[i] === currentDirection) {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 1;
        currentDirection = nonNeutral[i];
      }
    }

    return {
      isBias: maxConsecutive >= DIRECTIONAL_BIAS_MIN_CONSECUTIVE,
      count: maxConsecutive,
    };
  } catch (error) {
    logger.error('Failed to detect directional bias', normalizeError(error));
    return { isBias: false, count: 0 };
  }
}

function findClosestByTimestamp(
  sortedEntries: PriceHistoryEntry[],
  targetTimestamp: number
): PriceHistoryEntry | undefined {
  if (sortedEntries.length === 0) return undefined;

  // `low` is the first entry with timestamp >= targetTimestamp.
  const low = lowerBoundByTimestamp(sortedEntries, targetTimestamp);

  // `low` can equal `sortedEntries.length` when the target is past every entry,
  // in which case the last entry is the closest. Guard against an undefined
  // `curr` (and undefined timestamps in the data) to avoid a TypeError.
  if (low >= sortedEntries.length) return sortedEntries[sortedEntries.length - 1];
  if (low === 0) return sortedEntries[0];

  const prev = sortedEntries[low - 1];
  const curr = sortedEntries[low];

  if (
    curr &&
    Number.isFinite(curr.timestamp) &&
    Math.abs(curr.timestamp - targetTimestamp) < Math.abs(prev.timestamp - targetTimestamp)
  ) {
    return curr;
  }
  return prev;
}

/**
 * Returns the index of the first entry whose timestamp is >= `targetTimestamp`
 * (i.e. std::lower_bound). Returns `entries.length` if no such entry exists.
 * The input MUST be sorted ascending by timestamp.
 */
function lowerBoundByTimestamp(
  sortedEntries: readonly PriceHistoryEntry[],
  targetTimestamp: number
): number {
  let low = 0;
  let high = sortedEntries.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (sortedEntries[mid].timestamp < targetTimestamp) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }
  return low;
}

function calculateDivergenceTimeSeries(
  priceHistoryMap: Map<string, PriceHistoryEntry[]>
): DivergenceTimeSeries[] {
  try {
    if (!priceHistoryMap || priceHistoryMap.size === 0) {
      return [];
    }

    // Pre-sort each provider's valid entries by timestamp for binary search.
    // Entries without a finite timestamp are dropped — they can't participate
    // in the closest-match search and would otherwise crash findClosestByTimestamp.
    const sortedValidMap = new Map<string, PriceHistoryEntry[]>();
    for (const [provider, entries] of priceHistoryMap) {
      const valid = (entries ?? [])
        .filter((e) => e.success && Number.isFinite(e.timestamp))
        .sort((a, b) => a.timestamp - b.timestamp);
      sortedValidMap.set(provider, valid);
    }

    const results: DivergenceTimeSeries[] = [];

    for (const [provider, entries] of priceHistoryMap) {
      if (!entries || entries.length === 0) continue;

      const sortedEntries = [...entries]
        .filter((e) => e.success && Number.isFinite(e.timestamp))
        .sort((a, b) => a.timestamp - b.timestamp);
      const points: DivergencePoint[] = [];
      const deviations: number[] = [];
      const directions: DivergenceDirection[] = [];

      for (const entry of sortedEntries) {
        const otherPrices: number[] = [];
        for (const [otherProvider, otherValidEntries] of sortedValidMap) {
          if (otherProvider === provider) continue;
          const closestEntry = findClosestByTimestamp(otherValidEntries, entry.timestamp);
          if (closestEntry) {
            otherPrices.push(closestEntry.price);
          }
        }

        const currentPrice = entry.price;
        if (otherPrices.length < 2) continue;

        const consensusPrice = getConsensusPrice(otherPrices);

        if (consensusPrice === 0) continue;

        const deviationPercent = ((currentPrice - consensusPrice) / consensusPrice) * 100;
        const direction: DivergenceDirection =
          deviationPercent > 0.01 ? 'positive' : deviationPercent < -0.01 ? 'negative' : 'neutral';

        points.push({
          timestamp: entry.timestamp,
          deviationPercent: Number(deviationPercent.toFixed(4)),
          direction,
          price: currentPrice,
          consensusPrice,
        });

        deviations.push(deviationPercent);
        directions.push(direction);
      }

      if (points.length === 0) continue;

      const { value: accelerationValue, status: acceleration } = calculateAcceleration(deviations);
      const { isBias: isDirectionalBias, count: directionalBiasCount } =
        detectDirectionalBias(directions);

      const currentDeviation = deviations[deviations.length - 1] ?? 0;
      const currentDirection = directions[directions.length - 1] ?? 'neutral';
      const maxDeviation = Math.max(...deviations.map(Math.abs));
      const avgDeviation = deviations.reduce((sum, d) => sum + Math.abs(d), 0) / deviations.length;

      results.push({
        provider,
        points,
        currentDeviation: Number(currentDeviation.toFixed(4)),
        currentDirection,
        acceleration,
        accelerationValue,
        isDirectionalBias,
        directionalBiasCount,
        maxDeviation: Number(maxDeviation.toFixed(4)),
        avgDeviation: Number(avgDeviation.toFixed(4)),
      });
    }

    logger.debug(`Calculated divergence time series for ${results.length} providers`);
    return results;
  } catch (error) {
    logger.error('Failed to calculate divergence time series', normalizeError(error));
    return [];
  }
}

function calculateOracleLeadership(
  priceHistoryMap: Map<string, PriceHistoryEntry[]>
): OracleLeadership[] {
  try {
    if (!priceHistoryMap || priceHistoryMap.size === 0) {
      return [];
    }

    const providers = Array.from(priceHistoryMap.keys());
    if (providers.length === 0) return [];

    const providerEntries = new Map<string, PriceHistoryEntry[]>();
    for (const [provider, entries] of priceHistoryMap) {
      const validEntries = entries
        .filter((e) => e.success)
        .sort((a, b) => a.timestamp - b.timestamp);
      providerEntries.set(provider, validEntries);
    }

    const changeEvents: Array<{
      timestamp: number;
      provider: string;
    }>[] = [];

    for (const [provider, entries] of providerEntries) {
      const events: Array<{ timestamp: number; provider: string }> = [];
      for (let i = 1; i < entries.length; i++) {
        const prevPrice = entries[i - 1].price;
        const currPrice = entries[i].price;
        if (prevPrice > 0) {
          const changePercent = Math.abs(((currPrice - prevPrice) / prevPrice) * 100);
          if (changePercent > SIGNIFICANT_CHANGE_THRESHOLD) {
            events.push({ timestamp: entries[i].timestamp, provider });
          }
        }
      }
      changeEvents.push(events);
    }

    const allEvents = changeEvents.flat().sort((a, b) => a.timestamp - b.timestamp);

    const firstResponseCounts = new Map<string, number>();
    const lagRecords = new Map<string, number[]>();
    const totalUpdates = new Map<string, number>();

    for (const provider of providers) {
      firstResponseCounts.set(provider, 0);
      lagRecords.set(provider, []);
      totalUpdates.set(provider, 0);
    }

    for (const events of changeEvents) {
      if (events.length > 0) {
        totalUpdates.set(events[0].provider, events.length);
      }
    }

    const TIME_WINDOW = 10000;

    for (const event of allEvents) {
      const windowStart = event.timestamp - TIME_WINDOW;
      const windowEnd = event.timestamp + TIME_WINDOW;

      const providersInWindow: Array<{ provider: string; timestamp: number }> = [];
      for (const [provider, entries] of providerEntries) {
        // `entries` is sorted ascending by timestamp (see filter+sort above),
        // so the first array-order match equals the first entry whose
        // timestamp is >= windowStart. Binary search drops the per-event cost
        // from O(E_p) to O(log E_p) with identical selection semantics.
        const matchIndex = lowerBoundByTimestamp(entries, windowStart);
        const matchingEntry = entries[matchIndex];
        if (matchingEntry && matchingEntry.timestamp <= windowEnd) {
          providersInWindow.push({ provider, timestamp: matchingEntry.timestamp });
        }
      }

      if (providersInWindow.length <= 1) continue;

      providersInWindow.sort((a, b) => a.timestamp - b.timestamp);
      const firstTimestamp = providersInWindow[0].timestamp;

      firstResponseCounts.set(
        providersInWindow[0].provider,
        (firstResponseCounts.get(providersInWindow[0].provider) ?? 0) + 1
      );

      for (const pw of providersInWindow) {
        const lag = (pw.timestamp - firstTimestamp) / 1000;
        lagRecords.get(pw.provider)?.push(lag);
      }
    }

    const results: OracleLeadership[] = providers.map((provider) => {
      const lags = lagRecords.get(provider) ?? [];
      const avgLagSeconds = lags.length > 0 ? lags.reduce((s, l) => s + l, 0) / lags.length : 0;
      const lagSeconds = lags.length > 0 ? lags[lags.length - 1] : 0;

      let status: LeadershipStatus;
      if (avgLagSeconds < LEADING_LAG_THRESHOLD) {
        status = 'leading';
      } else if (avgLagSeconds < SYNCHRONIZED_LAG_THRESHOLD) {
        status = 'synchronized';
      } else {
        status = 'lagging';
      }

      return {
        provider,
        status,
        lagSeconds: Number(lagSeconds.toFixed(2)),
        avgLagSeconds: Number(avgLagSeconds.toFixed(2)),
        firstResponseCount: firstResponseCounts.get(provider) ?? 0,
        totalUpdates: totalUpdates.get(provider) ?? 0,
      };
    });

    logger.debug(`Calculated oracle leadership for ${results.length} providers`);
    return results;
  } catch (error) {
    logger.error('Failed to calculate oracle leadership', normalizeError(error));
    return [];
  }
}

function calculateDivergenceMatrix(priceData: PriceData[]): DivergencePair[][] {
  try {
    if (!priceData || priceData.length === 0) {
      return [];
    }

    const seen = new Set<string>();
    const uniqueData = priceData.filter((p) => {
      const key = p.provider.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const n = uniqueData.length;
    const matrix: DivergencePair[][] = Array(n)
      .fill(null)
      .map(() => Array(n).fill(null));

    const now = Date.now();

    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === j) {
          matrix[i][j] = {
            providerA: uniqueData[i].provider,
            providerB: uniqueData[j].provider,
            deviationPercent: 0,
            timestamp: now,
          };
        } else {
          const priceA = uniqueData[i].price;
          const priceB = uniqueData[j].price;
          const avgPrice = (priceA + priceB) / 2;
          const deviationPercent = avgPrice > 0 ? ((priceA - priceB) / avgPrice) * 100 : 0;

          matrix[i][j] = {
            providerA: uniqueData[i].provider,
            providerB: uniqueData[j].provider,
            deviationPercent: Number(deviationPercent.toFixed(4)),
            timestamp: Math.min(uniqueData[i].timestamp, uniqueData[j].timestamp),
          };
        }
      }
    }

    logger.debug(`Calculated divergence matrix for ${n} providers`);
    return matrix;
  } catch (error) {
    logger.error('Failed to calculate divergence matrix', normalizeError(error));
    return [];
  }
}

export function calculateDivergenceSignals(
  priceData: PriceData[],
  priceHistoryMap: Map<string, { price: number; timestamp: number; success: boolean }[]>
): DivergenceSignalResult {
  try {
    if (!priceData || priceData.length === 0) {
      return getEmptyResult();
    }

    const historyMap = new Map<string, PriceHistoryEntry[]>();
    for (const [provider, entries] of priceHistoryMap) {
      historyMap.set(
        provider,
        entries.map((e) => ({
          price: e.price,
          timestamp: e.timestamp,
          success: e.success,
        }))
      );
    }

    const timeSeries = calculateDivergenceTimeSeries(historyMap);
    const leadership = calculateOracleLeadership(historyMap);
    const divergenceMatrix = calculateDivergenceMatrix(priceData);

    const acceleratingCount = timeSeries.filter((ts) => ts.acceleration === 'accelerating').length;

    const directionalBiasCount = timeSeries.filter((ts) => ts.isDirectionalBias).length;

    const leadingOracle = leadership.find((l) => l.status === 'leading')?.provider ?? null;

    const maxAcceleration = timeSeries.reduce(
      (max, ts) => Math.max(max, Math.abs(ts.accelerationValue)),
      0
    );

    logger.info(
      `Divergence signals calculated. Accelerating: ${acceleratingCount}, Directional bias: ${directionalBiasCount}`
    );

    return {
      timeSeries,
      leadership,
      divergenceMatrix,
      acceleratingCount,
      directionalBiasCount,
      leadingOracle,
      maxAcceleration: Number(maxAcceleration.toFixed(4)),
    };
  } catch (error) {
    logger.error('Failed to calculate divergence signals', normalizeError(error));
    return getEmptyResult();
  }
}

function getEmptyResult(): DivergenceSignalResult {
  return {
    timeSeries: [],
    leadership: [],
    divergenceMatrix: [],
    acceleratingCount: 0,
    directionalBiasCount: 0,
    leadingOracle: null,
    maxAcceleration: 0,
  };
}
