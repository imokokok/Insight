import { createLogger } from '@/lib/utils/logger';
import { OracleProvider, type Blockchain } from '@/types/oracle';

import { getApi3CrossChainComparison } from './api3CrossChain';
import { getChainlinkCrossChainComparison } from './chainlinkCrossChain';
import { getPythCrossChainComparison } from './pythCrossChain';

const logger = createLogger('CrossChainComparison');

export interface CrossChainComparisonResult {
  chain: string;
  price: number;
  timestamp: number;
  deviation: number;
  latency: number;
  status: 'online' | 'degraded' | 'offline';
}

export interface CrossChainComparisonService {
  comparePricesAcrossChains(
    provider: OracleProvider,
    symbol: string,
    chains: Blockchain[]
  ): Promise<CrossChainComparisonResult[]>;
}

export const DATA_FRESHNESS_THRESHOLDS = {
  ONLINE: { maxAgeSeconds: 60, maxDeviation: 0.5 },
  DEGRADED: { maxAgeSeconds: 300, maxDeviation: 1.0 },
  OFFLINE: { maxAgeSeconds: Infinity, maxDeviation: Infinity },
} as const;

export function classifyChainStatus(
  deviation: number,
  dataAgeSeconds: number
): 'online' | 'degraded' | 'offline' {
  if (
    dataAgeSeconds <= DATA_FRESHNESS_THRESHOLDS.ONLINE.maxAgeSeconds &&
    Math.abs(deviation) < DATA_FRESHNESS_THRESHOLDS.ONLINE.maxDeviation
  ) {
    return 'online';
  }
  if (
    dataAgeSeconds <= DATA_FRESHNESS_THRESHOLDS.DEGRADED.maxAgeSeconds &&
    Math.abs(deviation) < DATA_FRESHNESS_THRESHOLDS.DEGRADED.maxDeviation
  ) {
    return 'degraded';
  }
  return 'offline';
}

export function calculateMedian(prices: number[]): number {
  if (prices.length === 0) return 0;
  const sorted = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function calculateDeviationFromMedian(price: number, median: number): number {
  if (median === 0) return 0;
  return ((price - median) / median) * 100;
}

export async function comparePricesAcrossChains(
  provider: OracleProvider,
  symbol: string,
  chains: Blockchain[]
): Promise<CrossChainComparisonResult[]> {
  try {
    let results: CrossChainComparisonResult[];

    switch (provider) {
      case OracleProvider.PYTH:
        results = await getPythCrossChainComparison(symbol, chains);
        break;
      case OracleProvider.CHAINLINK:
        results = await getChainlinkCrossChainComparison(symbol, chains);
        break;
      case OracleProvider.API3:
        results = await getApi3CrossChainComparison(symbol, chains);
        break;
      default:
        logger.warn(`Cross-chain comparison not supported for provider: ${provider}`);
        return [];
    }

    return results;
  } catch (error) {
    logger.error(
      `Failed to compare prices across chains for ${provider}/${symbol}`,
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}
