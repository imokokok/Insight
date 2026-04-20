import { createLogger } from '@/lib/utils/logger';
import { type Blockchain } from '@/types/oracle';

const logger = createLogger('CrossChainComparison');

export interface CrossChainComparisonResult {
  chain: string;
  price: number;
  timestamp: number;
  deviation: number;
  latency: number;
  status: 'online' | 'degraded' | 'offline';
}

export interface ChainPriceInfo {
  chain: Blockchain;
  price: number;
  timestamp: number;
}

function classifyChainStatus(
  deviation: number,
  dataAgeSeconds: number
): 'online' | 'degraded' | 'offline' {
  const ONLINE = { maxAgeSeconds: 60, maxDeviation: 0.5 };
  const DEGRADED = { maxAgeSeconds: 300, maxDeviation: 1.0 };

  if (dataAgeSeconds <= ONLINE.maxAgeSeconds && Math.abs(deviation) < ONLINE.maxDeviation) {
    return 'online';
  }
  if (dataAgeSeconds <= DEGRADED.maxAgeSeconds && Math.abs(deviation) < DEGRADED.maxDeviation) {
    return 'degraded';
  }
  return 'offline';
}

function calculateMedian(prices: number[]): number {
  if (prices.length === 0) return 0;
  const sorted = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function calculateDeviationFromMedian(price: number, median: number): number {
  if (median === 0) {
    logger.warn('Cannot calculate deviation: median price is zero');
    if (price === 0) return 0;
    return price > 0 ? Infinity : -Infinity;
  }
  return ((price - median) / median) * 100;
}

export function buildCrossChainComparisonFromPrices(
  chainPrices: ChainPriceInfo[]
): CrossChainComparisonResult[] {
  if (chainPrices.length === 0) return [];

  const validPrices = chainPrices.filter((p) => p.price > 0);
  const prices = validPrices.map((p) => p.price);
  const median = calculateMedian(prices);
  const nowSeconds = Date.now() / 1000;

  return chainPrices.map((chainPrice) => {
    if (chainPrice.price <= 0) {
      return {
        chain: chainPrice.chain,
        price: 0,
        timestamp: 0,
        deviation: 0,
        latency: Infinity,
        status: 'offline' as const,
      };
    }

    const deviation = calculateDeviationFromMedian(chainPrice.price, median);
    const dataAgeSeconds =
      chainPrice.timestamp > 0 ? nowSeconds - chainPrice.timestamp / 1000 : Infinity;

    return {
      chain: chainPrice.chain,
      price: chainPrice.price,
      timestamp: chainPrice.timestamp,
      deviation,
      latency: dataAgeSeconds,
      status: classifyChainStatus(deviation, dataAgeSeconds),
    };
  });
}
