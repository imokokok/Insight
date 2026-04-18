import { createLogger } from '@/lib/utils/logger';
import { type Blockchain } from '@/types/oracle';

import {
  type CrossChainComparisonResult,
  classifyChainStatus,
  calculateMedian,
  calculateDeviationFromMedian,
} from './crossChainComparison';
import { api3NetworkService } from './services/api3NetworkService';
import { withOracleRetry, ORACLE_RETRY_PRESETS } from './utils/retry';

const logger = createLogger('API3CrossChainComparison');

interface Api3ChainPriceData {
  chain: Blockchain;
  price: number;
  timestamp: number;
  success: boolean;
}

async function fetchApi3ChainPrice(symbol: string, chain: Blockchain): Promise<Api3ChainPriceData> {
  try {
    const data = await api3NetworkService.getPrice(symbol, chain);

    if (!data || !data.price || data.price <= 0) {
      return {
        chain,
        price: 0,
        timestamp: 0,
        success: false,
      };
    }

    return {
      chain,
      price: data.price,
      timestamp: data.timestamp,
      success: true,
    };
  } catch (error) {
    logger.error(
      `Failed to fetch API3 price for ${symbol} on ${chain}`,
      error instanceof Error ? error : new Error(String(error)),
      { symbol, chain }
    );
    return {
      chain,
      price: 0,
      timestamp: 0,
      success: false,
    };
  }
}

export async function getApi3CrossChainComparison(
  symbol: string,
  chains: Blockchain[]
): Promise<CrossChainComparisonResult[]> {
  return withOracleRetry(
    async () => {
      const supportedChains = api3NetworkService.getSupportedChains();
      const filteredChains = chains.filter((chain) => supportedChains.includes(chain));

      const chainPriceResults = await Promise.all(
        filteredChains.map((chain) => fetchApi3ChainPrice(symbol, chain))
      );

      const successfulResults = chainPriceResults.filter((r) => r.success && r.price > 0);
      const prices = successfulResults.map((r) => r.price);
      const median = calculateMedian(prices);

      const nowMs = Date.now();

      const results: CrossChainComparisonResult[] = chainPriceResults.map((result) => {
        if (!result.success || result.price <= 0) {
          return {
            chain: result.chain,
            price: 0,
            timestamp: 0,
            deviation: 0,
            latency: Infinity,
            status: 'offline' as const,
          };
        }

        const deviation = calculateDeviationFromMedian(result.price, median);
        const dataAgeSeconds = result.timestamp > 0 ? (nowMs - result.timestamp) / 1000 : Infinity;

        return {
          chain: result.chain,
          price: result.price,
          timestamp: result.timestamp,
          deviation,
          latency: dataAgeSeconds,
          status: classifyChainStatus(deviation, dataAgeSeconds),
        };
      });

      return results;
    },
    'getApi3CrossChainComparison',
    ORACLE_RETRY_PRESETS.standard
  );
}
