import { encodeFunctionData as viemEncodeFunctionData } from 'viem';

import {
  CHAINLINK_AGGREGATOR_ABI,
  CHAINLINK_TOKEN_ABI,
  getChainlinkPriceFeed,
  getChainlinkContracts,
  getChainlinkRPCConfig,
  type ChainlinkPriceFeed,
} from './chainlinkDataSources';

export interface ChainlinkPriceData {
  symbol: string;
  price: number;
  decimals: number;
  timestamp: number;
  roundId: bigint;
  answeredInRound: bigint;
  chainId: number;
}

export interface ChainlinkTokenData {
  totalSupply: bigint;
  symbol: string;
  name: string;
}

export interface ChainlinkNetworkStats {
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

function encodeTokenCall(
  functionName: 'totalSupply',
  args?: readonly [`0x${string}`]
): `0x${string}` {
  if (functionName === 'totalSupply') {
    return viemEncodeFunctionData({
      abi: CHAINLINK_TOKEN_ABI,
      functionName: 'totalSupply',
    });
  }
  return viemEncodeFunctionData({
    abi: CHAINLINK_TOKEN_ABI,
    functionName: 'totalSupply',
  });
}

function decodeUint256(data: string): bigint {
  const cleanData = data.startsWith('0x') ? data.slice(2) : data;
  if (!cleanData || cleanData === '0x') {
    return BigInt(0);
  }
  return BigInt('0x' + cleanData);
}

function decodeLatestRoundData(data: string): {
  roundId: bigint;
  answer: bigint;
  startedAt: bigint;
  updatedAt: bigint;
  answeredInRound: bigint;
} {
  const cleanData = data.startsWith('0x') ? data.slice(2) : data;

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
}

function decodeDecimals(data: string): number {
  const cleanData = data.startsWith('0x') ? data.slice(2) : data;
  return parseInt(cleanData, 16);
}

export class ChainlinkOnChainService {
  private requestId = 0;
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map();
  private cacheTTL = 30000;
  private endpointHealth: Record<string, boolean> = {};
  private currentEndpointIndex: Record<number, number> = {};

  private async rpcCallWithFallback<T>(
    chainId: number,
    method: string,
    params: unknown[]
  ): Promise<T> {
    const config = getChainlinkRPCConfig(chainId);
    if (!config) {
      throw new Error(`No RPC config for chain ${chainId}`);
    }

    const endpoints = config.endpoints;
    if (!endpoints || endpoints.length === 0) {
      throw new Error(`No RPC endpoints for chain ${chainId}`);
    }

    const startIndex = this.currentEndpointIndex[chainId] || 0;
    let lastError: Error | null = null;

    for (let i = 0; i < endpoints.length; i++) {
      const endpointIndex = (startIndex + i) % endpoints.length;
      const endpoint = endpoints[endpointIndex];

      if (this.endpointHealth[`${chainId}-${endpointIndex}`] === false) {
        continue;
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
        });

        if (!response.ok) {
          throw new Error(`RPC call failed: ${response.status}`);
        }

        const result: RPCResponse<T> = await response.json();

        if (result.error) {
          throw new Error(`RPC error: ${result.error.message}`);
        }

        this.currentEndpointIndex[chainId] = endpointIndex;
        this.endpointHealth[`${chainId}-${endpointIndex}`] = true;

        return result.result as T;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.endpointHealth[`${chainId}-${endpointIndex}`] = false;
        console.warn(`RPC endpoint ${endpoint} failed, trying next:`, error);
      }
    }

    throw lastError || new Error(`All RPC endpoints failed for chain ${chainId}`);
  }

  private async ethCall(chainId: number, to: `0x${string}`, data: `0x${string}`): Promise<string> {
    return this.rpcCallWithFallback<string>(chainId, 'eth_call', [{ to, data }, 'latest']);
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

  async getPrice(symbol: string, chainId: number = 1): Promise<ChainlinkPriceData> {
    const cacheKey = `price-${symbol}-${chainId}`;
    const cached = this.getCached<ChainlinkPriceData>(cacheKey);
    if (cached) return cached;

    const feed = getChainlinkPriceFeed(symbol, chainId);
    if (!feed) {
      throw new Error(`Price feed not found for ${symbol} on chain ${chainId}`);
    }

    try {
      const roundData = await this.ethCall(
        chainId,
        feed.address,
        encodeAggregatorCall('latestRoundData')
      );

      const decoded = decodeLatestRoundData(roundData);

      const price = Number(decoded.answer) / Math.pow(10, feed.decimals);

      const result: ChainlinkPriceData = {
        symbol: feed.symbol,
        price,
        decimals: feed.decimals,
        timestamp: Number(decoded.updatedAt) * 1000,
        roundId: decoded.roundId,
        answeredInRound: decoded.answeredInRound,
        chainId,
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error(`[ChainlinkOnChainService] Failed to fetch price for ${symbol}:`, error);
      throw error;
    }
  }

  async getPrices(symbols: string[], chainId: number = 1): Promise<ChainlinkPriceData[]> {
    const promises = symbols.map((symbol) =>
      this.getPrice(symbol, chainId).catch((error) => {
        console.warn(`Failed to fetch price for ${symbol}:`, error);
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
      console.error('[ChainlinkOnChainService] Failed to fetch token data:', error);
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
      console.error(`[ChainlinkOnChainService] Failed to fetch metadata for ${symbol}:`, error);
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
    return ['ETH', 'BTC', 'LINK', 'USDC', 'USDT', 'DAI', 'MATIC', 'AVAX', 'BNB'];
  }

  getSupportedChainIds(symbol: string): number[] {
    const feed = getChainlinkPriceFeed(symbol, 1);
    if (!feed) return [];

    const chainIds: number[] = [];
    const supportedChains = [1, 42161, 137, 8453, 43114, 56];

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
