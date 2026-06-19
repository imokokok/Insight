import { encodeFunctionData as viemEncodeFunctionData } from 'viem';

import { createLogger } from '@/lib/utils/logger';

import { OracleCache } from '../base';
import { stringToPrice } from '../utils/oracleDataUtils';
import { RpcClientWithFallback } from '../utils/rpcClientWithFallback';

import {
  CHAINLINK_AGGREGATOR_ABI,
  getChainlinkPriceFeed,
  getChainlinkRPCConfig,
  getSupportedSymbols,
} from './chainlinkDataSources';

const logger = createLogger('ChainlinkOnChainService');

export interface ChainlinkPriceData {
  symbol: string;
  price: number;
  decimals: number;
  decimalsIsFallback: boolean;
  timestamp: number;
  roundId: bigint;
  answeredInRound: bigint;
  chainId: number;
  description?: string;
  version?: bigint;
  startedAt?: number;
}

function encodeAggregatorCall(
  functionName: 'latestRoundData' | 'decimals' | 'description' | 'version'
): `0x${string}` {
  return viemEncodeFunctionData({
    abi: CHAINLINK_AGGREGATOR_ABI,
    functionName,
  });
}

function decodeUint256(data: string): bigint {
  const cleanData = data.startsWith('0x') ? data.slice(2) : data;
  if (!cleanData || cleanData === '0x' || cleanData.length < 1) {
    return BigInt(0);
  }
  try {
    return BigInt('0x' + cleanData);
  } catch {
    logger.error('Failed to decode uint256', undefined, { data });
    return BigInt(0);
  }
}

const LATEST_ROUND_DATA_LENGTH = 320;

function decodeLatestRoundData(data: string): {
  roundId: bigint;
  answer: bigint;
  startedAt: bigint;
  updatedAt: bigint;
  answeredInRound: bigint;
} {
  const cleanData = data.startsWith('0x') ? data.slice(2) : data;

  if (!cleanData || cleanData.length < LATEST_ROUND_DATA_LENGTH) {
    logger.error('Invalid round data length', undefined, {
      actualLength: cleanData?.length || 0,
      expectedLength: LATEST_ROUND_DATA_LENGTH,
    });
    return {
      roundId: BigInt(0),
      answer: BigInt(0),
      startedAt: BigInt(0),
      updatedAt: BigInt(0),
      answeredInRound: BigInt(0),
    };
  }

  try {
    const roundId = BigInt('0x' + cleanData.slice(0, 64));
    const answer = BigInt('0x' + cleanData.slice(64, 128));
    const startedAt = BigInt('0x' + cleanData.slice(128, 192));
    const updatedAt = BigInt('0x' + cleanData.slice(192, 256));
    const answeredInRound = BigInt('0x' + cleanData.slice(256, 320));

    return {
      roundId,
      answer,
      startedAt,
      updatedAt,
      answeredInRound,
    };
  } catch (error) {
    logger.error('Failed to decode latest round data', error instanceof Error ? error : undefined);
    return {
      roundId: BigInt(0),
      answer: BigInt(0),
      startedAt: BigInt(0),
      updatedAt: BigInt(0),
      answeredInRound: BigInt(0),
    };
  }
}

function decodeDecimals(data: string): { decimals: number; isFallback: boolean } {
  const cleanData = data.startsWith('0x') ? data.slice(2) : data;
  if (!cleanData || cleanData.length === 0) {
    return { decimals: 8, isFallback: true };
  }
  try {
    const parsed = parseInt(cleanData, 16);
    return isNaN(parsed)
      ? { decimals: 8, isFallback: true }
      : { decimals: parsed, isFallback: false };
  } catch {
    logger.error('Failed to decode decimals', undefined, { data });
    return { decimals: 8, isFallback: true };
  }
}

interface FeedMetadata {
  decimals: number;
  decimalsIsFallback: boolean;
  description: string;
  version: bigint;
}

class ChainlinkOnChainService {
  private rpcClient = new RpcClientWithFallback({ contextLabel: 'chainlink' });
  private cache = new OracleCache();
  private cacheTTL = 30000;
  private metadataCache: Map<string, FeedMetadata> = new Map();

  private async ethCall(
    chainId: number,
    to: `0x${string}`,
    data: `0x${string}`,
    signal?: AbortSignal
  ): Promise<string> {
    const config = getChainlinkRPCConfig(chainId);
    if (!config) {
      throw new Error(`No RPC config for chain ${chainId}`);
    }
    return this.rpcClient.ethCall(String(chainId), config.endpoints, to, data, signal);
  }

  private isValidChainlinkPriceData(data: unknown): data is ChainlinkPriceData {
    if (!data || typeof data !== 'object') return false;
    const d = data as Partial<ChainlinkPriceData>;
    return (
      typeof d.symbol === 'string' &&
      typeof d.price === 'number' &&
      d.price > 0 &&
      typeof d.decimals === 'number' &&
      typeof d.timestamp === 'number' &&
      typeof d.roundId !== 'undefined' &&
      typeof d.answeredInRound !== 'undefined'
    );
  }

  private async getOrFetchMetadata(
    symbol: string,
    chainId: number,
    feedAddress: `0x${string}`,
    signal?: AbortSignal
  ): Promise<FeedMetadata> {
    const metaKey = `meta-${symbol}-${chainId}`;
    const cached = this.metadataCache.get(metaKey);
    if (cached) return cached;

    const [decimalsData, descriptionData, versionData] = await Promise.all([
      this.ethCall(chainId, feedAddress, encodeAggregatorCall('decimals'), signal),
      this.ethCall(chainId, feedAddress, encodeAggregatorCall('description'), signal),
      this.ethCall(chainId, feedAddress, encodeAggregatorCall('version'), signal),
    ]);

    const decimalsResult = decodeDecimals(decimalsData);
    const metadata: FeedMetadata = {
      decimals: decimalsResult.decimals,
      decimalsIsFallback: decimalsResult.isFallback,
      description: this.decodeString(descriptionData),
      version: decodeUint256(versionData),
    };

    if (!decimalsResult.isFallback) {
      this.metadataCache.set(metaKey, metadata);
    }

    return metadata;
  }

  async getPrice(
    symbol: string,
    chainId: number = 1,
    signal?: AbortSignal
  ): Promise<ChainlinkPriceData | null> {
    const cacheKey = `price-${symbol}-${chainId}`;
    const cached = this.cache.get<ChainlinkPriceData>(cacheKey);
    if (cached && this.isValidChainlinkPriceData(cached)) {
      logger.debug('Returning cached Chainlink price data', {
        symbol,
        chainId,
        roundId: cached.roundId?.toString(),
      });
      return cached;
    } else if (cached) {
      logger.warn('Cached Chainlink price data is invalid, fetching fresh data', {
        symbol,
        chainId,
      });
      this.cache.delete(cacheKey);
    }

    const feed = getChainlinkPriceFeed(symbol, chainId);
    if (!feed) {
      throw new Error(`Price feed not found for ${symbol} on chain ${chainId}`);
    }

    try {
      const [roundData, metadata] = await Promise.all([
        this.ethCall(chainId, feed.address, encodeAggregatorCall('latestRoundData'), signal),
        this.getOrFetchMetadata(symbol, chainId, feed.address, signal),
      ]);

      logger.debug('Raw RPC responses received', {
        symbol,
        chainId,
        roundDataLength: roundData?.length || 0,
        metadataCached: this.metadataCache.has(`meta-${symbol}-${chainId}`),
      });

      const decoded = decodeLatestRoundData(roundData);

      logger.debug('Decoded round data', {
        symbol,
        roundId: decoded.roundId?.toString(),
        answer: decoded.answer?.toString(),
        startedAt: decoded.startedAt?.toString(),
        updatedAt: decoded.updatedAt?.toString(),
        answeredInRound: decoded.answeredInRound?.toString(),
        decimals: metadata.decimals,
      });

      const rawStr = decoded.answer.toString();
      const price = stringToPrice(rawStr, metadata.decimals);

      if (price <= 0) {
        logger.warn('Invalid price from Chainlink contract', {
          symbol: feed.symbol,
          price,
          rawAnswer: decoded.answer.toString(),
          decimals: metadata.decimals,
        });
        return null;
      }

      if (decoded.updatedAt === BigInt(0)) {
        logger.warn('Chainlink price never updated', {
          symbol: feed.symbol,
          roundId: decoded.roundId?.toString(),
        });
        return null;
      }

      if (decoded.answeredInRound < decoded.roundId) {
        logger.warn('Chainlink price is stale - answeredInRound < roundId', {
          symbol: feed.symbol,
          roundId: decoded.roundId?.toString(),
          answeredInRound: decoded.answeredInRound?.toString(),
        });
        return null;
      }

      const STALE_PRICE_THRESHOLD_SECONDS = 3600;
      const priceAge = Math.floor(Date.now() / 1000) - Number(decoded.updatedAt);
      if (priceAge > STALE_PRICE_THRESHOLD_SECONDS) {
        logger.warn('Chainlink price is stale', {
          symbol: feed.symbol,
          priceAge,
          threshold: STALE_PRICE_THRESHOLD_SECONDS,
          roundId: decoded.roundId?.toString(),
        });
      }

      const result: ChainlinkPriceData = {
        symbol: feed.symbol,
        price,
        decimals: metadata.decimals,
        decimalsIsFallback: metadata.decimalsIsFallback,
        timestamp: Number(decoded.updatedAt) * 1000,
        roundId: decoded.roundId,
        answeredInRound: decoded.answeredInRound,
        chainId,
        description: metadata.description,
        version: metadata.version,
        startedAt: Number(decoded.startedAt) * 1000,
      };

      logger.info('Successfully fetched Chainlink price', {
        symbol: result.symbol,
        price: result.price,
        roundId: result.roundId?.toString(),
        answeredInRound: result.answeredInRound?.toString(),
        chainId: result.chainId,
      });

      this.cache.set(cacheKey, result, this.cacheTTL);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const rpcConfig = getChainlinkRPCConfig(chainId);
      const endpointStatus = this.getEndpointStatus(chainId);
      logger.error(
        `Failed to fetch price for ${symbol}`,
        error instanceof Error ? error : undefined,
        {
          errorMessage,
          symbol,
          chainId,
          feedAddress: feed?.address,
          availableEndpoints: rpcConfig?.endpoints?.length || 0,
          endpointStatus,
        }
      );
      throw new Error(`Failed to fetch price for ${symbol} on chain ${chainId}: ${errorMessage}`);
    }
  }

  private decodeString(data: string): string {
    const cleanData = data.startsWith('0x') ? data.slice(2) : data;
    const length = parseInt(cleanData.slice(64, 128), 16);
    const stringData = cleanData.slice(128, 128 + length * 2);

    let result = '';
    for (let i = 0; i < stringData.length; i += 2) {
      const charCode = parseInt(stringData.slice(i, i + 2), 16);
      if (charCode === 0) break;
      result += String.fromCharCode(charCode);
    }
    return result;
  }

  getSupportedSymbols(): string[] {
    return getSupportedSymbols();
  }

  getSupportedChainIds(symbol: string): number[] {
    const chainIds: number[] = [];
    const supportedChains = [1, 42161, 137, 8453, 43114, 56, 10];

    for (const chainId of supportedChains) {
      if (getChainlinkPriceFeed(symbol, chainId)) {
        chainIds.push(chainId);
      }
    }

    return chainIds;
  }

  isPriceFeedSupported(symbol: string, chainId: number): boolean {
    return getChainlinkPriceFeed(symbol, chainId) !== null;
  }

  clearCache(): void {
    this.cache.clear();
    this.metadataCache.clear();
  }

  resetEndpointHealth(): void {
    this.rpcClient = new RpcClientWithFallback({ contextLabel: 'chainlink' });
  }

  getEndpointStatus(chainId: number): {
    current: number;
    total: number;
    health: Record<string, boolean>;
  } {
    const config = getChainlinkRPCConfig(chainId);
    const endpoints = config?.endpoints || [];
    return {
      current: 0,
      total: endpoints.length,
      health: {},
    };
  }
}

export const chainlinkOnChainService = new ChainlinkOnChainService();
