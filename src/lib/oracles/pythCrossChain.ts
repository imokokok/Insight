import { createLogger } from '@/lib/utils/logger';
import { type Blockchain } from '@/types/oracle';

import { PYTH_PRICE_FEED_IDS, HERMES_API_URL, normalizeSymbol } from './constants/pythConstants';
import {
  type CrossChainComparisonResult,
  classifyChainStatus,
  calculateMedian,
  calculateDeviationFromMedian,
} from './crossChainComparison';
import { withOracleRetry, ORACLE_RETRY_PRESETS } from './utils/retry';

const logger = createLogger('PythCrossChainComparison');

interface PythChainConfig {
  id: string;
  name: string;
  blockchain: Blockchain;
  endpoint: string;
}

const REQUEST_TIMEOUT_MS = 5000;

const CHAIN_CONFIGS: PythChainConfig[] = [
  { id: 'solana', name: 'Solana', blockchain: 'solana' as Blockchain, endpoint: HERMES_API_URL },
  {
    id: 'ethereum',
    name: 'Ethereum',
    blockchain: 'ethereum' as Blockchain,
    endpoint: HERMES_API_URL,
  },
  {
    id: 'arbitrum',
    name: 'Arbitrum',
    blockchain: 'arbitrum' as Blockchain,
    endpoint: HERMES_API_URL,
  },
  {
    id: 'optimism',
    name: 'Optimism',
    blockchain: 'optimism' as Blockchain,
    endpoint: HERMES_API_URL,
  },
  { id: 'polygon', name: 'Polygon', blockchain: 'polygon' as Blockchain, endpoint: HERMES_API_URL },
  { id: 'base', name: 'Base', blockchain: 'base' as Blockchain, endpoint: HERMES_API_URL },
  {
    id: 'avalanche',
    name: 'Avalanche',
    blockchain: 'avalanche' as Blockchain,
    endpoint: HERMES_API_URL,
  },
  { id: 'bsc', name: 'BNB Chain', blockchain: 'bnb-chain' as Blockchain, endpoint: HERMES_API_URL },
];

interface PythChainPriceData {
  chain: string;
  blockchain: Blockchain;
  price: number;
  publishTime: number;
  success: boolean;
}

async function fetchPythChainPrice(
  priceId: string,
  chainConfig: PythChainConfig
): Promise<PythChainPriceData> {
  try {
    const response = await fetch(
      `${chainConfig.endpoint}/api/latest_price_updates?ids[]=${priceId}`,
      {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      }
    );

    if (!response.ok) {
      logger.warn(`Chain ${chainConfig.name} returned non-OK response`, {
        chain: chainConfig.id,
        status: response.status,
      });
      return {
        chain: chainConfig.id,
        blockchain: chainConfig.blockchain,
        price: 0,
        publishTime: 0,
        success: false,
      };
    }

    const data = await response.json();
    const parsed = data.parsed?.[0];

    if (parsed?.price) {
      const priceValue =
        typeof parsed.price.price === 'string'
          ? parseInt(parsed.price.price, 10)
          : parsed.price.price;
      const exponent = parsed.price.expo ?? -8;
      const price = priceValue * Math.pow(10, exponent);
      const publishTime = parsed.price.publish_time ?? 0;

      return {
        chain: chainConfig.id,
        blockchain: chainConfig.blockchain,
        price,
        publishTime,
        success: true,
      };
    }

    logger.warn(`Chain ${chainConfig.name} returned invalid price data format`, {
      chain: chainConfig.id,
    });
    return {
      chain: chainConfig.id,
      blockchain: chainConfig.blockchain,
      price: 0,
      publishTime: 0,
      success: false,
    };
  } catch (error) {
    logger.error(
      `Failed to fetch Pyth data from chain ${chainConfig.name}`,
      error instanceof Error ? error : new Error(String(error)),
      { chain: chainConfig.id, priceId }
    );
    return {
      chain: chainConfig.id,
      blockchain: chainConfig.blockchain,
      price: 0,
      publishTime: 0,
      success: false,
    };
  }
}

export async function getPythCrossChainComparison(
  symbol: string,
  chains: Blockchain[]
): Promise<CrossChainComparisonResult[]> {
  return withOracleRetry(
    async () => {
      const pythSymbol = normalizeSymbol(symbol);
      const priceId = PYTH_PRICE_FEED_IDS[pythSymbol];

      if (!priceId) {
        throw new Error(`No price feed ID found for symbol: ${symbol}`);
      }

      const filteredConfigs = CHAIN_CONFIGS.filter((c) => chains.includes(c.blockchain));

      const chainPriceResults = await Promise.all(
        filteredConfigs.map((config) => fetchPythChainPrice(priceId, config))
      );

      const successfulResults = chainPriceResults.filter((r) => r.success && r.price > 0);
      const prices = successfulResults.map((r) => r.price);
      const median = calculateMedian(prices);

      const nowSeconds = Date.now() / 1000;

      const results: CrossChainComparisonResult[] = chainPriceResults.map((result) => {
        if (!result.success || result.price <= 0) {
          return {
            chain: result.blockchain,
            price: 0,
            timestamp: 0,
            deviation: 0,
            latency: Infinity,
            status: 'offline' as const,
          };
        }

        const deviation = calculateDeviationFromMedian(result.price, median);
        const dataAgeSeconds = result.publishTime > 0 ? nowSeconds - result.publishTime : Infinity;

        return {
          chain: result.blockchain,
          price: result.price,
          timestamp: result.publishTime * 1000,
          deviation,
          latency: dataAgeSeconds,
          status: classifyChainStatus(deviation, dataAgeSeconds),
        };
      });

      return results;
    },
    'getPythCrossChainComparison',
    ORACLE_RETRY_PRESETS.standard
  );
}
