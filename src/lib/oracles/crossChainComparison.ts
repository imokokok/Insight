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

export interface ChainPriceInfo {
  chain: Blockchain;
  price: number;
  timestamp: number;
}

interface CrossChainComparisonService {
  comparePricesAcrossChains(
    provider: OracleProvider,
    symbol: string,
    chains: Blockchain[]
  ): Promise<CrossChainComparisonResult[]>;
}

export function classifyChainStatus(
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

export function calculateMedian(prices: number[]): number {
  if (prices.length === 0) return 0;
  const sorted = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function calculateDeviationFromMedian(price: number, median: number): number {
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
