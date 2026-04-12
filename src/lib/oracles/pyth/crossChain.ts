import { type HermesClient } from '@pythnetwork/hermes-client';

import { createLogger } from '@/lib/utils/logger';

import { PYTH_PRICE_FEED_IDS, HERMES_API_URL, normalizeSymbol } from '../pythConstants';
import { withOracleRetry, ORACLE_RETRY_PRESETS } from '../utils/retry';

import { parsePythPrice } from './pythParser';
import { isPythPriceRaw } from './types';

import type { CrossChainPriceData, CrossChainResult } from './types';

const logger = createLogger('PythCrossChain');

interface ChainConfig {
  id: string;
  name: string;
  endpoint: string;
}

// 链状态判定阈值配置
const CHAIN_STATUS_THRESHOLDS = {
  // 在线状态：延迟 < 200ms 且偏差 < 0.5%
  ONLINE: { maxLatency: 200, maxDeviation: 0.5 },
  // 降级状态：延迟 < 500ms 且偏差 < 1%
  DEGRADED: { maxLatency: 500, maxDeviation: 1.0 },
  // 离线状态：其他情况
  OFFLINE: { latency: 999 },
} as const;

// 请求超时配置
const REQUEST_TIMEOUT_MS = 5000;

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
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      const latency = Date.now() - chainStartTime;

      if (!response.ok) {
        logger.warn(`Chain ${chain.name} returned non-OK response`, {
          chain: chain.id,
          status: response.status,
          statusText: response.statusText,
        });
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

        // 使用配置常量判断链状态
        const status: 'online' | 'degraded' | 'offline' =
          latency < CHAIN_STATUS_THRESHOLDS.ONLINE.maxLatency &&
          Math.abs(deviation) < CHAIN_STATUS_THRESHOLDS.ONLINE.maxDeviation
            ? 'online'
            : latency < CHAIN_STATUS_THRESHOLDS.DEGRADED.maxLatency &&
                Math.abs(deviation) < CHAIN_STATUS_THRESHOLDS.DEGRADED.maxDeviation
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
        logger.warn(`Chain ${chain.name} returned invalid price data format`, {
          chain: chain.id,
          parsed: parsed ? 'exists' : 'null',
        });
        results.push({
          chain: chain.id,
          price: basePrice,
          deviation: 0,
          latency,
          status: 'degraded',
          lastUpdate: new Date(),
        });
      }
    } catch (error) {
      logger.error(
        `Failed to fetch data from chain ${chain.name}`,
        error instanceof Error ? error : new Error(String(error)),
        {
          chain: chain.id,
          priceId,
          basePrice,
        }
      );
      results.push({
        chain: chain.id,
        price: basePrice,
        deviation: 0,
        latency: CHAIN_STATUS_THRESHOLDS.OFFLINE.latency,
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
  const result = await withOracleRetry(
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
    'getCrossChainPrices',
    ORACLE_RETRY_PRESETS.standard
  );

  return result;
}
