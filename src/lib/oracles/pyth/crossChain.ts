import { type HermesClient } from '@pythnetwork/hermes-client';

import { createLogger } from '@/lib/utils/logger';

import {
  PYTH_PRICE_FEED_IDS,
  HERMES_API_URL,
  normalizeSymbol,
  DEFAULT_RETRY_CONFIG,
} from '../pythConstants';

import { parsePythPrice } from './pythParser';
import { withRetry } from './retry';
import { isPythPriceRaw } from './types';

import type { CrossChainPriceData, CrossChainResult, PythPriceRaw } from './types';

const logger = createLogger('PythCrossChain');

interface ChainConfig {
  id: string;
  name: string;
  endpoint: string;
}

const CHAIN_CONFIGS: ChainConfig[] = [
  { id: 'solana', name: 'Solana', endpoint: HERMES_API_URL },
  { id: 'ethereum', name: 'Ethereum', endpoint: HERMES_API_URL },
  { id: 'arbitrum', name: 'Arbitrum', endpoint: HERMES_API_URL },
  { id: 'optimism', name: 'Optimism', endpoint: HERMES_API_URL },
  { id: 'polygon', name: 'Polygon', endpoint: HERMES_API_URL },
  { id: 'base', name: 'Base', endpoint: HERMES_API_URL },
  { id: 'avalanche', name: 'Avalanche', endpoint: HERMES_API_URL },
  { id: 'bsc', name: 'BNB Chain', endpoint: HERMES_API_URL },
];

export async function fetchChainSpecificData(
  priceId: string,
  basePrice: number
): Promise<CrossChainPriceData[]> {
  const results: CrossChainPriceData[] = [];

  for (const chain of CHAIN_CONFIGS) {
    try {
      const chainStartTime = Date.now();
      const response = await fetch(`${chain.endpoint}/api/latest_price_updates?ids[]=${priceId}`, {
        signal: AbortSignal.timeout(5000),
      });

      const latency = Date.now() - chainStartTime;

      if (!response.ok) {
        results.push({
          chain: chain.id,
          price: basePrice,
          deviation: 0,
          latency,
          status: 'degraded',
          lastUpdate: new Date(),
        });
        continue;
      }

      const data = await response.json();
      const parsed = data.parsed?.[0];

      if (parsed?.price && isPythPriceRaw(parsed.price)) {
        const priceValue =
          typeof parsed.price.price === 'string'
            ? parseInt(parsed.price.price, 10)
            : parsed.price.price;
        const exponent = parsed.price.expo ?? -8;
        const price = priceValue * Math.pow(10, exponent);
        const deviation = basePrice > 0 ? ((price - basePrice) / basePrice) * 100 : 0;

        const status: 'online' | 'degraded' | 'offline' =
          latency < 200 && Math.abs(deviation) < 0.5
            ? 'online'
            : latency < 500 && Math.abs(deviation) < 1
              ? 'degraded'
              : 'offline';

        results.push({
          chain: chain.id,
          price,
          deviation,
          latency,
          status,
          lastUpdate: new Date((parsed.price.publish_time ?? Date.now() / 1000) * 1000),
        });
      } else {
        results.push({
          chain: chain.id,
          price: basePrice,
          deviation: 0,
          latency,
          status: 'degraded',
          lastUpdate: new Date(),
        });
      }
    } catch (_error) {
      results.push({
        chain: chain.id,
        price: basePrice,
        deviation: 0,
        latency: 999,
        status: 'offline',
        lastUpdate: new Date(),
      });
    }
  }

  return results;
}

export async function getCrossChainPrices(
  hermesClient: HermesClient,
  symbol: string
): Promise<CrossChainResult> {
  const result = await withRetry(
    async () => {
      const pythSymbol = normalizeSymbol(symbol);
      const priceId = PYTH_PRICE_FEED_IDS[pythSymbol];

      if (!priceId) {
        throw new Error(`No price feed ID found for symbol: ${symbol}`);
      }

      const priceUpdates = await hermesClient.getLatestPriceUpdates([priceId]);

      if (!priceUpdates.parsed || priceUpdates.parsed.length === 0) {
        throw new Error(`No price data available for cross-chain: ${symbol}`);
      }

      const parsed = priceUpdates.parsed[0];
      if (!parsed || !parsed.price || !isPythPriceRaw(parsed.price)) {
        throw new Error(`Invalid price data format for ${symbol}`);
      }

      const basePriceData = parsePythPrice(parsed.price, symbol);
      const basePrice = basePriceData.price;
      const timestamp = basePriceData.timestamp;

      const chainData = await fetchChainSpecificData(priceId, basePrice);

      return {
        data: chainData,
        basePrice,
        timestamp,
      };
    },
    DEFAULT_RETRY_CONFIG,
    'getCrossChainPrices'
  );

  return result;
}
