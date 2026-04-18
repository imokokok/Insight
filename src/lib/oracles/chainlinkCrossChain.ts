import { BLOCKCHAIN_TO_CHAIN_ID } from '@/lib/oracles/constants/chainMapping';
import { createLogger } from '@/lib/utils/logger';
import { type Blockchain } from '@/types/oracle';

import {
  type CrossChainComparisonResult,
  classifyChainStatus,
  calculateMedian,
  calculateDeviationFromMedian,
} from './crossChainComparison';
import { getChainlinkPriceFeed } from './services/chainlinkDataSources';
import { chainlinkOnChainService } from './services/chainlinkOnChainService';
import { withOracleRetry, ORACLE_RETRY_PRESETS } from './utils/retry';

const logger = createLogger('ChainlinkCrossChainComparison');

interface ChainlinkChainPriceData {
  chain: Blockchain;
  chainId: number;
  price: number;
  updatedAt: number;
  success: boolean;
}

async function fetchChainlinkChainPrice(
  symbol: string,
  chain: Blockchain,
  chainId: number
): Promise<ChainlinkChainPriceData> {
  try {
    const feed = getChainlinkPriceFeed(symbol, chainId);
    if (!feed) {
      return {
        chain,
        chainId,
        price: 0,
        updatedAt: 0,
        success: false,
      };
    }

    const data = await chainlinkOnChainService.getPrice(symbol, chainId);

    if (!data || !data.price || data.price <= 0) {
      return {
        chain,
        chainId,
        price: 0,
        updatedAt: 0,
        success: false,
      };
    }

    return {
      chain,
      chainId,
      price: data.price,
      updatedAt: data.timestamp,
      success: true,
    };
  } catch (error) {
    logger.error(
      `Failed to fetch Chainlink price for ${symbol} on ${chain}`,
      error instanceof Error ? error : new Error(String(error)),
      { symbol, chain, chainId }
    );
    return {
      chain,
      chainId,
      price: 0,
      updatedAt: 0,
      success: false,
    };
  }
}

export async function getChainlinkCrossChainComparison(
  symbol: string,
  chains: Blockchain[]
): Promise<CrossChainComparisonResult[]> {
  return withOracleRetry(
    async () => {
      const chainEntries = chains
        .map((chain) => ({
          chain,
          chainId: BLOCKCHAIN_TO_CHAIN_ID[chain],
        }))
        .filter(
          (entry): entry is { chain: Blockchain; chainId: number } =>
            entry.chainId !== undefined && entry.chainId > 0
        );

      const chainPriceResults = await Promise.all(
        chainEntries.map((entry) => fetchChainlinkChainPrice(symbol, entry.chain, entry.chainId))
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
        const dataAgeSeconds = result.updatedAt > 0 ? (nowMs - result.updatedAt) / 1000 : Infinity;

        return {
          chain: result.chain,
          price: result.price,
          timestamp: result.updatedAt,
          deviation,
          latency: dataAgeSeconds,
          status: classifyChainStatus(deviation, dataAgeSeconds),
        };
      });

      return results;
    },
    'getChainlinkCrossChainComparison',
    ORACLE_RETRY_PRESETS.standard
  );
}
