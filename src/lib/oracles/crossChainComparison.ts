import { getSymbolCategory } from '@/lib/constants';
import { createLogger } from '@/lib/utils/logger';
import { calculateMedian } from '@/lib/utils/statistics';
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

interface StatusThresholds {
  maxAgeSecondsOnline: number;
  maxAgeSecondsDegraded: number;
  maxDeviationOnline: number;
  maxDeviationDegraded: number;
}

const STATUS_THRESHOLDS_BY_CATEGORY: Record<string, StatusThresholds> = {
  stablecoin: {
    maxAgeSecondsOnline: 60,
    maxAgeSecondsDegraded: 300,
    maxDeviationOnline: 0.1,
    maxDeviationDegraded: 0.3,
  },
  major: {
    maxAgeSecondsOnline: 60,
    maxAgeSecondsDegraded: 300,
    maxDeviationOnline: 0.5,
    maxDeviationDegraded: 1.5,
  },
  alt: {
    maxAgeSecondsOnline: 90,
    maxAgeSecondsDegraded: 300,
    maxDeviationOnline: 1.0,
    maxDeviationDegraded: 3.0,
  },
  micro: {
    maxAgeSecondsOnline: 120,
    maxAgeSecondsDegraded: 600,
    maxDeviationOnline: 2.0,
    maxDeviationDegraded: 5.0,
  },
};

function classifyChainStatus(
  deviation: number,
  dataAgeSeconds: number,
  symbol?: string
): 'online' | 'degraded' | 'offline' {
  const category = symbol ? getSymbolCategory(symbol) : 'alt';
  const thresholds = STATUS_THRESHOLDS_BY_CATEGORY[category] ?? STATUS_THRESHOLDS_BY_CATEGORY.alt;

  if (
    dataAgeSeconds <= thresholds.maxAgeSecondsOnline &&
    Math.abs(deviation) < thresholds.maxDeviationOnline
  ) {
    return 'online';
  }
  if (
    dataAgeSeconds <= thresholds.maxAgeSecondsDegraded &&
    Math.abs(deviation) < thresholds.maxDeviationDegraded
  ) {
    return 'degraded';
  }
  return 'offline';
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
  chainPrices: ChainPriceInfo[],
  symbol?: string
): CrossChainComparisonResult[] {
  if (chainPrices.length === 0) return [];

  const validPrices = chainPrices.filter((p) => p.price > 0);

  if (validPrices.length === 0) {
    return chainPrices.map((chainPrice) => ({
      chain: chainPrice.chain,
      price: 0,
      timestamp: 0,
      deviation: 0,
      latency: Infinity,
      status: 'offline' as const,
    }));
  }

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
      status: classifyChainStatus(deviation, dataAgeSeconds, symbol),
    };
  });
}
