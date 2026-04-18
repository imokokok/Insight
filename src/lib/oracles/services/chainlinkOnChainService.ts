import { encodeFunctionData as viemEncodeFunctionData } from 'viem';

import { createLogger } from '@/lib/utils/logger';

import {
  CHAINLINK_AGGREGATOR_ABI,
  CHAINLINK_TOKEN_ABI,
  getChainlinkPriceFeed,
  getChainlinkContracts,
  getChainlinkRPCConfig,
  getSupportedSymbols,
} from './chainlinkDataSources';

const logger = createLogger('ChainlinkOnChainService');

export interface ChainlinkPriceData {
  symbol: string;
  price: number;
  decimals: number;
  timestamp: number;
  roundId: bigint;
  answeredInRound: bigint;
  chainId: number;
  // Feed 元数据
  description?: string;
  version?: bigint;
  startedAt?: number;
}

interface ChainlinkTokenData {
  totalSupply: bigint;
  symbol: string;
  name: string;
}

interface ChainlinkNetworkStats {
  totalFeeds: number;
  activeChains: number;
  lastUpdateTimestamp: number;
}

interface RPCResponse<T> {
  jsonrpc: '2.0';
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

function encodeAggregatorCall(
  functionName: 'latestRoundData' | 'decimals' | 'description' | 'version'
): `0x${string}` {
  return viemEncodeFunctionData({
    abi: CHAINLINK_AGGREGATOR_ABI,
    functionName,
  });
}

function encodeTokenCall(_functionName: 'totalSupply'): `0x${string}` {
  return viemEncodeFunctionData({
    abi: CHAINLINK_TOKEN_ABI,
    functionName: 'totalSupply',
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

function decodeDecimals(data: string): number {
  const cleanData = data.startsWith('0x') ? data.slice(2) : data;
  if (!cleanData || cleanData.length === 0) {
    return 8;
  }
  try {
    const parsed = parseInt(cleanData, 16);
    return isNaN(parsed) ? 8 : parsed;
  } catch {
    logger.error('Failed to decode decimals', undefined, { data });
    return 8;
  }
}

class ChainlinkOnChainService {
  private requestId = 0;
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map();
  private cacheTTL = 30000;
  private endpointHealth: Record<string, boolean> = {};
  private currentEndpointIndex: Record<number, number> = {};
  private requestTimeout = 10000;
  private endpointFailureTime: Record<string, number> = {};
  private endpointRecoveryTime = 60000;

  private isEndpointHealthy(chainId: number, index: number): boolean {
    const key = `${chainId}-${index}`;
    const health = this.endpointHealth[key];

    if (health === false) {
      const lastFail = this.endpointFailureTime[key];
      if (lastFail && Date.now() - lastFail > this.endpointRecoveryTime) {
        this.endpointHealth[key] = true;
        delete this.endpointFailureTime[key];
        logger.debug(`Endpoint ${key} recovered`, { chainId, index });
        return true;
      }
      return false;
    }
    return true;
  }

  private async rpcCallWithFallback<T>(
    chainId: number,
    method: string,
    params: unknown[],
    signal?: AbortSignal
  ): Promise<T> {
    const config = getChainlinkRPCConfig(chainId);
    if (!config) {
      throw new Error(`No RPC config for chain ${chainId}`);
    }

    const endpoints = config.endpoints;
    if (!endpoints || endpoints.length === 0) {
      throw new Error(`No RPC endpoints for chain ${chainId}`);
    }

    if (signal?.aborted) {
      throw new Error(`Request aborted for chain ${chainId}`);
    }

    const startIndex = this.currentEndpointIndex[chainId] || 0;
    let lastError: Error | null = null;

    for (let i = 0; i < endpoints.length; i++) {
      if (signal?.aborted) {
        throw new Error(`Request aborted for chain ${chainId}`);
      }

      const endpointIndex = (startIndex + i) % endpoints.length;
      const endpoint = endpoints[endpointIndex];

      if (!this.isEndpointHealthy(chainId, endpointIndex)) {
        continue;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.requestTimeout);

      if (signal) {
        signal.addEventListener('abort', () => controller.abort(), { once: true });
      }

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: ++this.requestId,
            method,
            params,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`RPC call failed: ${response.status}`);
        }

        const result: RPCResponse<T> = await response.json();

        if (result.error) {
          throw new Error(`RPC error: ${result.error.message}`);
        }

        this.currentEndpointIndex[chainId] = endpointIndex;
        this.endpointHealth[`${chainId}-${endpointIndex}`] = true;
        delete this.endpointFailureTime[`${chainId}-${endpointIndex}`];

        return result.result as T;
      } catch (error) {
        clearTimeout(timeoutId);
        lastError = error instanceof Error ? error : new Error(String(error));
        const key = `${chainId}-${endpointIndex}`;
        this.endpointHealth[key] = false;
        this.endpointFailureTime[key] = Date.now();

        if (error instanceof Error && (error.name === 'AbortError' || signal?.aborted)) {
          if (signal?.aborted) {
            throw new Error(`Request aborted for chain ${chainId}`);
          }
          logger.warn(`RPC endpoint ${endpoint} timed out after ${this.requestTimeout}ms`, {
            chainId,
            endpoint,
            method,
          });
        } else {
          logger.warn(`RPC endpoint ${endpoint} failed, trying next`, {
            chainId,
            endpoint,
            error: lastError.message,
          });
        }
      }
    }

    throw lastError || new Error(`All RPC endpoints failed for chain ${chainId}`);
  }

  private async ethCall(
    chainId: number,
    to: `0x${string}`,
    data: `0x${string}`,
    signal?: AbortSignal
  ): Promise<string> {
    return this.rpcCallWithFallback<string>(chainId, 'eth_call', [{ to, data }, 'latest'], signal);
  }

  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data as T;
    }
    return null;
  }

  private setCache(key: string, data: unknown): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  async getPrice(
    symbol: string,
    chainId: number = 1,
    signal?: AbortSignal
  ): Promise<ChainlinkPriceData | null> {
    const cacheKey = `price-${symbol}-${chainId}`;
    const cached = this.getCached<ChainlinkPriceData>(cacheKey);
    if (cached) return cached;

    const feed = getChainlinkPriceFeed(symbol, chainId);
    if (!feed) {
      throw new Error(`Price feed not found for ${symbol} on chain ${chainId}`);
    }

    try {
      const [roundData, decimalsData, descriptionData, versionData] = await Promise.all([
        this.ethCall(chainId, feed.address, encodeAggregatorCall('latestRoundData'), signal),
        this.ethCall(chainId, feed.address, encodeAggregatorCall('decimals'), signal),
        this.ethCall(chainId, feed.address, encodeAggregatorCall('description'), signal),
        this.ethCall(chainId, feed.address, encodeAggregatorCall('version'), signal),
      ]);

      const decoded = decodeLatestRoundData(roundData);
      const decimals = decodeDecimals(decimalsData);

      const rawStr = decoded.answer.toString();
      let price: number;
      if (rawStr.length > decimals) {
        const intPart = rawStr.slice(0, rawStr.length - decimals) || '0';
        const decPart = rawStr.slice(rawStr.length - decimals);
        price = parseFloat(`${intPart}.${decPart}`);
      } else {
        const paddedDec = rawStr.padStart(decimals, '0');
        price = parseFloat(`0.${paddedDec}`);
      }

      if (price <= 0) {
        logger.warn('Invalid price from Chainlink contract', {
          symbol: feed.symbol,
          price,
          rawAnswer: decoded.answer.toString(),
          decimals,
        });
        return null;
      }

      const result: ChainlinkPriceData = {
        symbol: feed.symbol,
        price,
        decimals,
        timestamp: Number(decoded.updatedAt) * 1000,
        roundId: decoded.roundId,
        answeredInRound: decoded.answeredInRound,
        chainId,
        description: this.decodeString(descriptionData),
        version: decodeUint256(versionData),
        startedAt: Number(decoded.startedAt) * 1000,
      };

      this.setCache(cacheKey, result);
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

  async getPrices(symbols: string[], chainId: number = 1): Promise<ChainlinkPriceData[]> {
    const promises = symbols.map((symbol) =>
      this.getPrice(symbol, chainId).catch((error) => {
        logger.warn(`Failed to fetch price for ${symbol}`, {
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      })
    );

    const results = await Promise.all(promises);
    return results.filter((result): result is ChainlinkPriceData => result !== null);
  }

  async getTokenData(chainId: number = 1): Promise<ChainlinkTokenData> {
    const cacheKey = `token-${chainId}`;
    const cached = this.getCached<ChainlinkTokenData>(cacheKey);
    if (cached) return cached;

    const contracts = getChainlinkContracts(chainId);
    if (!contracts) {
      throw new Error(`Contracts not found for chain ${chainId}`);
    }

    try {
      const totalSupplyData = await this.ethCall(
        chainId,
        contracts.linkToken,
        encodeTokenCall('totalSupply')
      );
      const totalSupply = decodeUint256(totalSupplyData);

      const result: ChainlinkTokenData = {
        totalSupply,
        symbol: 'LINK',
        name: 'Chainlink',
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      logger.error('Failed to fetch token data', error instanceof Error ? error : undefined);
      throw error;
    }
  }

  async getFeedMetadata(
    symbol: string,
    chainId: number = 1
  ): Promise<{
    decimals: number;
    description: string;
    version: bigint;
  }> {
    const feed = getChainlinkPriceFeed(symbol, chainId);
    if (!feed) {
      throw new Error(`Price feed not found for ${symbol} on chain ${chainId}`);
    }

    try {
      const [decimalsData, descriptionData, versionData] = await Promise.all([
        this.ethCall(chainId, feed.address, encodeAggregatorCall('decimals')),
        this.ethCall(chainId, feed.address, encodeAggregatorCall('description')),
        this.ethCall(chainId, feed.address, encodeAggregatorCall('version')),
      ]);

      return {
        decimals: decodeDecimals(decimalsData),
        description: this.decodeString(descriptionData),
        version: decodeUint256(versionData),
      };
    } catch (error) {
      logger.error(
        `Failed to fetch metadata for ${symbol}`,
        error instanceof Error ? error : undefined
      );
      throw error;
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
    const supportedChains = [1, 42161, 137, 8453, 43114, 56, 10, 250];

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
  }

  resetEndpointHealth(): void {
    this.endpointHealth = {};
  }

  getEndpointStatus(chainId: number): {
    current: number;
    total: number;
    health: Record<string, boolean>;
  } {
    const config = getChainlinkRPCConfig(chainId);
    const endpoints = config?.endpoints || [];
    return {
      current: this.currentEndpointIndex[chainId] || 0,
      total: endpoints.length,
      health: this.endpointHealth,
    };
  }
}

export const chainlinkOnChainService = new ChainlinkOnChainService();
