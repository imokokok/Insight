import { getProviderDefaults } from '@/lib/oracles/utils/performanceMetricsConfig';
import { createLogger } from '@/lib/utils/logger';
import { type OracleProvider, ORACLE_PROVIDER_VALUES } from '@/types/oracle/enums';

const logger = createLogger('marketData:performanceMetrics');

const DISPLAY_NAME_MAP: Record<string, OracleProvider> = {
  Chainlink: 'chainlink' as OracleProvider,
  'Pyth Network': 'pyth' as OracleProvider,
  API3: 'api3' as OracleProvider,
  UMA: 'api3' as OracleProvider,
  RedStone: 'redstone' as OracleProvider,
  Switchboard: 'chainlink' as OracleProvider,
  DIA: 'dia' as OracleProvider,
  Flux: 'flare' as OracleProvider,
};

function resolveProvider(oracleName: string): OracleProvider | null {
  const lower = oracleName.toLowerCase();
  if (ORACLE_PROVIDER_VALUES.includes(lower as OracleProvider)) {
    return lower as OracleProvider;
  }
  return DISPLAY_NAME_MAP[oracleName] || null;
}

export interface OraclePerformanceMetrics {
  oracleName: string;
  avgLatency: number;
  accuracy: number;
  updateFrequency: number;
  lastCalculated: Date;
  sampleSize: number;
}

export interface PriceDataPoint {
  oracle: string;
  asset: string;
  price: number;
  timestamp: number;
  blockNumber?: number;
  confidence?: number;
}

export interface ReferencePricePoint {
  asset: string;
  price: number;
  timestamp: number;
  source: string;
}

class PerformanceMetricsCalculator {
  private priceHistory: Map<string, PriceDataPoint[]> = new Map();
  private referencePrices: Map<string, ReferencePricePoint[]> = new Map();
  private readonly maxHistorySize = 10000;
  private readonly calculationWindow = 24 * 60 * 60 * 1000;

  addPriceData(point: PriceDataPoint): void {
    const key = `${point.oracle}-${point.asset}`;
    if (!this.priceHistory.has(key)) {
      this.priceHistory.set(key, []);
    }
    const history = this.priceHistory.get(key)!;
    history.push(point);

    if (history.length > this.maxHistorySize) {
      history.shift();
    }
  }

  addReferencePrice(point: ReferencePricePoint): void {
    const key = point.asset;
    if (!this.referencePrices.has(key)) {
      this.referencePrices.set(key, []);
    }
    const history = this.referencePrices.get(key)!;
    history.push(point);

    if (history.length > this.maxHistorySize) {
      history.shift();
    }
  }

  private getRelevantData(oracleName: string, asset?: string): PriceDataPoint[] {
    if (asset) {
      const key = `${oracleName}-${asset}`;
      return this.priceHistory.get(key) || [];
    }
    const result: PriceDataPoint[] = [];
    for (const [key, data] of this.priceHistory) {
      if (key.startsWith(`${oracleName}-`)) {
        result.push(...data);
      }
    }
    return result;
  }

  calculateLatency(oracleName: string, asset?: string): number {
    try {
      const recentData = this.getRelevantData(oracleName, asset).filter(
        (p) => p.timestamp >= Date.now() - this.calculationWindow
      );

      if (recentData.length < 2) {
        return this.getDefaultLatency(oracleName);
      }

      const sortedData = recentData.sort((a, b) => a.timestamp - b.timestamp);
      const latencies: number[] = [];

      for (let i = 1; i < sortedData.length; i++) {
        const timeDiff = sortedData[i].timestamp - sortedData[i - 1].timestamp;
        if (timeDiff > 0 && timeDiff < 300000) {
          latencies.push(timeDiff);
        }
      }

      if (latencies.length === 0) {
        return this.getDefaultLatency(oracleName);
      }

      const avgLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
      return Math.round(avgLatency);
    } catch (error) {
      logger.error(`Error calculating latency for ${oracleName}`, error as Error);
      return this.getDefaultLatency(oracleName);
    }
  }

  calculateAccuracy(oracleName: string, asset?: string): number {
    try {
      const recentOracleData = this.getRelevantData(oracleName, asset).filter(
        (p) => p.timestamp >= Date.now() - this.calculationWindow
      );

      if (recentOracleData.length === 0) {
        return this.getDefaultAccuracy(oracleName);
      }

      const deviations: number[] = [];

      for (const oraclePoint of recentOracleData) {
        const refData = this.referencePrices.get(oraclePoint.asset);
        if (!refData || refData.length === 0) continue;

        const closestRef = refData.reduce((closest, current) => {
          const currentDiff = Math.abs(current.timestamp - oraclePoint.timestamp);
          const closestDiff = Math.abs(closest.timestamp - oraclePoint.timestamp);
          return currentDiff < closestDiff ? current : closest;
        });

        const timeDiff = Math.abs(closestRef.timestamp - oraclePoint.timestamp);
        if (timeDiff > 60000) continue;

        if (closestRef.price === 0) continue;
        const deviation = Math.abs(oraclePoint.price - closestRef.price) / closestRef.price;
        deviations.push(deviation);
      }

      if (deviations.length === 0) {
        return this.getDefaultAccuracy(oracleName);
      }

      const robustAccuracy = this.calculateRobustAccuracy(deviations);
      return Math.min(99.99, Math.round(robustAccuracy * 100) / 100);
    } catch (error) {
      logger.error(`Error calculating accuracy for ${oracleName}`, error as Error);
      return this.getDefaultAccuracy(oracleName);
    }
  }

  private calculateRobustAccuracy(deviations: number[]): number {
    if (deviations.length === 0) return 0;

    const sorted = [...deviations].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;

    const absoluteDeviations = sorted.map((d) => Math.abs(d - median));
    const sortedAbsDev = [...absoluteDeviations].sort((a, b) => a - b);
    const madMid = Math.floor(sortedAbsDev.length / 2);
    const mad =
      sortedAbsDev.length % 2 !== 0
        ? sortedAbsDev[madMid]
        : (sortedAbsDev[madMid - 1] + sortedAbsDev[madMid]) / 2;

    const MAD_SCALE_FACTOR = 1.4826;
    const scaledMad = mad * MAD_SCALE_FACTOR;
    const threshold = 3 * scaledMad;
    const filteredDeviations = deviations.filter((d) => Math.abs(d - median) <= threshold);

    const finalDeviations =
      filteredDeviations.length >= deviations.length * 0.5 ? filteredDeviations : deviations;

    let weightedSum = 0;
    let weightSum = 0;

    for (const deviation of finalDeviations) {
      const weight = 1 / (1 + deviation * 10);
      weightedSum += deviation * weight;
      weightSum += weight;
    }

    const weightedAvgDeviation = weightSum > 0 ? weightedSum / weightSum : 0;
    return Math.max(0, 100 - weightedAvgDeviation * 100);
  }

  calculateUpdateFrequency(oracleName: string, asset?: string): number {
    try {
      const recentData = this.getRelevantData(oracleName, asset).filter(
        (p) => p.timestamp >= Date.now() - this.calculationWindow
      );

      if (recentData.length < 2) {
        return this.getDefaultUpdateFrequency(oracleName);
      }

      const sortedData = recentData.sort((a, b) => a.timestamp - b.timestamp);
      const timeSpan = sortedData[sortedData.length - 1].timestamp - sortedData[0].timestamp;
      const updateCount = sortedData.length - 1;

      if (timeSpan <= 0 || updateCount <= 0) {
        return this.getDefaultUpdateFrequency(oracleName);
      }

      const avgFrequency = timeSpan / updateCount / 1000;
      return Math.round(avgFrequency);
    } catch (error) {
      logger.error(`Error calculating update frequency for ${oracleName}`, error as Error);
      return this.getDefaultUpdateFrequency(oracleName);
    }
  }

  calculateAllMetrics(oracleName: string, asset?: string): OraclePerformanceMetrics {
    return {
      oracleName,
      avgLatency: this.calculateLatency(oracleName, asset),
      accuracy: this.calculateAccuracy(oracleName, asset),
      updateFrequency: this.calculateUpdateFrequency(oracleName, asset),
      lastCalculated: new Date(),
      sampleSize: this.getSampleSize(oracleName, asset),
    };
  }

  private getSampleSize(oracleName: string, asset?: string): number {
    if (asset) {
      const key = `${oracleName}-${asset}`;
      return this.priceHistory.get(key)?.length || 0;
    }

    let total = 0;
    for (const [key, data] of this.priceHistory) {
      if (key.startsWith(`${oracleName}-`)) {
        total += data.length;
      }
    }
    return total;
  }

  private getDefaultLatency(oracleName: string): number {
    const provider = resolveProvider(oracleName);
    if (provider) {
      return getProviderDefaults(provider).responseTime;
    }
    return 600;
  }

  private getDefaultAccuracy(oracleName: string): number {
    const provider = resolveProvider(oracleName);
    if (provider) {
      return getProviderDefaults(provider).accuracy;
    }
    return 98.0;
  }

  private getDefaultUpdateFrequency(oracleName: string): number {
    const provider = resolveProvider(oracleName);
    if (provider) {
      return getProviderDefaults(provider).updateFrequency;
    }
    return 3600;
  }

  clearOldData(maxAge: number = 7 * 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAge;

    for (const [key, data] of this.priceHistory) {
      const filtered = data.filter((p) => p.timestamp >= cutoff);
      if (filtered.length === 0) {
        this.priceHistory.delete(key);
      } else {
        this.priceHistory.set(key, filtered);
      }
    }

    for (const [key, data] of this.referencePrices) {
      const filtered = data.filter((p) => p.timestamp >= cutoff);
      if (filtered.length === 0) {
        this.referencePrices.delete(key);
      } else {
        this.referencePrices.set(key, filtered);
      }
    }

    logger.info('Cleared old performance metrics data');
  }

  getStats(): { priceDataPoints: number; referenceDataPoints: number } {
    let priceDataPoints = 0;
    for (const data of this.priceHistory.values()) {
      priceDataPoints += data.length;
    }

    let referenceDataPoints = 0;
    for (const data of this.referencePrices.values()) {
      referenceDataPoints += data.length;
    }

    return { priceDataPoints, referenceDataPoints };
  }
}

export const performanceMetricsCalculator = new PerformanceMetricsCalculator();

export function calculateMetricsFromPriceData(
  oraclePrices: PriceDataPoint[],
  referencePrices: ReferencePricePoint[]
): { latency: number; accuracy: number; updateFrequency: number } {
  if (oraclePrices.length < 2 || referencePrices.length < 1) {
    return { latency: 0, accuracy: 0, updateFrequency: 0 };
  }

  const sortedOraclePrices = oraclePrices.sort((a, b) => a.timestamp - b.timestamp);

  const latencies: number[] = [];
  for (let i = 1; i < sortedOraclePrices.length; i++) {
    const diff = sortedOraclePrices[i].timestamp - sortedOraclePrices[i - 1].timestamp;
    if (diff > 0 && diff < 300000) {
      latencies.push(diff);
    }
  }
  const avgLatency =
    latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;

  const timeSpan =
    sortedOraclePrices[sortedOraclePrices.length - 1].timestamp - sortedOraclePrices[0].timestamp;
  const updateFrequency = timeSpan > 0 ? timeSpan / (sortedOraclePrices.length - 1) / 1000 : 0;

  let totalDeviation = 0;
  let validComparisons = 0;

  for (const oraclePoint of sortedOraclePrices) {
    const closestRef = referencePrices.reduce((closest, current) => {
      const currentDiff = Math.abs(current.timestamp - oraclePoint.timestamp);
      const closestDiff = Math.abs(closest.timestamp - oraclePoint.timestamp);
      return currentDiff < closestDiff ? current : closest;
    });

    const timeDiff = Math.abs(closestRef.timestamp - oraclePoint.timestamp);
    if (timeDiff <= 60000 && closestRef.price !== 0) {
      const deviation = Math.abs(oraclePoint.price - closestRef.price) / closestRef.price;
      totalDeviation += deviation;
      validComparisons++;
    }
  }

  const accuracy =
    validComparisons > 0 ? Math.max(0, 100 - (totalDeviation / validComparisons) * 100) : 0;

  return {
    latency: Math.round(avgLatency),
    accuracy: Math.min(99.99, Math.round(accuracy * 100) / 100),
    updateFrequency: Math.round(updateFrequency),
  };
}
