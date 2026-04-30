import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('divergenceSignals');

export type DivergenceDirection = 'positive' | 'negative' | 'neutral';
export type DivergenceAcceleration = 'accelerating' | 'decelerating' | 'stable';
export type LeadershipStatus = 'leading' | 'synchronized' | 'lagging';

export interface DivergencePoint {
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
  alertCount: number;
  acceleratingCount: number;
  directionalBiasCount: number;
  leadingOracle: string | null;
  maxAcceleration: number;
  alertThreshold: number;
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

function getSymbolCategory(symbol: string): 'stablecoin' | 'major' | 'alt' | 'micro' {
  const stablecoins = ['USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'USDP', 'FRAX', 'LUSD', 'PYUSD'];
  const majors = ['BTC', 'ETH', 'WBTC', 'WETH'];
  const upper = symbol.toUpperCase();
  if (stablecoins.some((s) => upper.includes(s))) return 'stablecoin';
  if (majors.some((s) => upper.includes(s))) return 'major';
  return 'alt';
}

function getDeviationAlertThreshold(symbol?: string): number {
  if (!symbol) return 1;
  const category = getSymbolCategory(symbol);
  switch (category) {
    case 'stablecoin':
      return 0.1;
    case 'major':
      return 0.8;
    case 'alt':
      return 1.5;
    case 'micro':
      return 3.0;
    default:
      return 1;
  }
}
const SIGNIFICANT_CHANGE_THRESHOLD = 0.01;
const DIRECTIONAL_BIAS_MIN_CONSECUTIVE = 3;
const LEADING_LAG_THRESHOLD = 1;
const SYNCHRONIZED_LAG_THRESHOLD = 5;

export function getConsensusPrice(prices: number[]): number {
  try {
    if (!prices || prices.length === 0) return 0;
    const sorted = [...prices].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
  } catch (error) {
    logger.error(
      'Failed to calculate consensus price',
      error instanceof Error ? error : new Error(String(error))
    );
    return 0;
  }
}

export function calculateAcceleration(deviations: number[]): {
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
    logger.error(
      'Failed to calculate acceleration',
      error instanceof Error ? error : new Error(String(error))
    );
    return { value: 0, status: 'stable' };
  }
}

export function detectDirectionalBias(directions: DivergenceDirection[]): {
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
    logger.error(
      'Failed to detect directional bias',
      error instanceof Error ? error : new Error(String(error))
    );
    return { isBias: false, count: 0 };
  }
}

export function calculateDivergenceTimeSeries(
  priceHistoryMap: Map<string, PriceHistoryEntry[]>,
  priceData: PriceData[]
): DivergenceTimeSeries[] {
  try {
    if (!priceHistoryMap || priceHistoryMap.size === 0) {
      return [];
    }

    const results: DivergenceTimeSeries[] = [];

    for (const [provider, entries] of priceHistoryMap) {
      if (!entries || entries.length === 0) continue;

      const sortedEntries = [...entries].sort((a, b) => a.timestamp - b.timestamp);
      const points: DivergencePoint[] = [];
      const deviations: number[] = [];
      const directions: DivergenceDirection[] = [];

      for (const entry of sortedEntries) {
        const otherPrices: number[] = [];
        for (const [otherProvider, otherEntries] of priceHistoryMap) {
          if (otherProvider === provider) continue;
          const closestEntry = otherEntries
            .filter((e) => e.success)
            .sort(
              (a, b) =>
                Math.abs(a.timestamp - entry.timestamp) - Math.abs(b.timestamp - entry.timestamp)
            )[0];
          if (closestEntry) {
            otherPrices.push(closestEntry.price);
          }
        }

        const currentPrice = entry.price;
        const consensusPrice = getConsensusPrice(
          otherPrices.length > 0 ? [...otherPrices, currentPrice] : [currentPrice]
        );

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
    logger.error(
      'Failed to calculate divergence time series',
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}

export function calculateOracleLeadership(
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

    for (const [provider, entries] of providerEntries) {
      let changeCount = 0;
      for (let i = 1; i < entries.length; i++) {
        const prevPrice = entries[i - 1].price;
        const currPrice = entries[i].price;
        if (prevPrice > 0) {
          const changePercent = Math.abs(((currPrice - prevPrice) / prevPrice) * 100);
          if (changePercent > SIGNIFICANT_CHANGE_THRESHOLD) {
            changeCount++;
          }
        }
      }
      totalUpdates.set(provider, changeCount);
    }

    const TIME_WINDOW = 10000;

    for (const event of allEvents) {
      const windowStart = event.timestamp - TIME_WINDOW;
      const windowEnd = event.timestamp + TIME_WINDOW;

      const providersInWindow: Array<{ provider: string; timestamp: number }> = [];
      for (const [provider, entries] of providerEntries) {
        const matchingEntry = entries.find(
          (e) => e.timestamp >= windowStart && e.timestamp <= windowEnd
        );
        if (matchingEntry) {
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
    logger.error(
      'Failed to calculate oracle leadership',
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}

export function calculateDivergenceMatrix(priceData: PriceData[]): DivergencePair[][] {
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
    logger.error(
      'Failed to calculate divergence matrix',
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}

export function calculateDivergenceSignals(
  priceData: PriceData[],
  priceHistoryMap: Map<string, { price: number; timestamp: number; success: boolean }[]>,
  symbol?: string
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

    const timeSeries = calculateDivergenceTimeSeries(historyMap, priceData);
    const leadership = calculateOracleLeadership(historyMap);
    const divergenceMatrix = calculateDivergenceMatrix(priceData);

    const acceleratingCount = timeSeries.filter((ts) => ts.acceleration === 'accelerating').length;

    const directionalBiasCount = timeSeries.filter((ts) => ts.isDirectionalBias).length;

    const alertThreshold = getDeviationAlertThreshold(symbol);
    const alertCount = timeSeries.filter(
      (ts) =>
        Math.abs(ts.currentDeviation) > alertThreshold ||
        ts.acceleration === 'accelerating' ||
        ts.isDirectionalBias
    ).length;

    const leadingOracle = leadership.find((l) => l.status === 'leading')?.provider ?? null;

    const maxAcceleration = timeSeries.reduce(
      (max, ts) => Math.max(max, Math.abs(ts.accelerationValue)),
      0
    );

    logger.info(
      `Divergence signals calculated. Alerts: ${alertCount}, Accelerating: ${acceleratingCount}, Directional bias: ${directionalBiasCount}`
    );

    return {
      timeSeries,
      leadership,
      divergenceMatrix,
      alertCount,
      acceleratingCount,
      directionalBiasCount,
      leadingOracle,
      maxAcceleration: Number(maxAcceleration.toFixed(4)),
      alertThreshold,
    };
  } catch (error) {
    logger.error(
      'Failed to calculate divergence signals',
      error instanceof Error ? error : new Error(String(error))
    );
    return getEmptyResult();
  }
}

function getEmptyResult(): DivergenceSignalResult {
  return {
    timeSeries: [],
    leadership: [],
    divergenceMatrix: [],
    alertCount: 0,
    acceleratingCount: 0,
    directionalBiasCount: 0,
    leadingOracle: null,
    maxAcceleration: 0,
    alertThreshold: 1,
  };
}
