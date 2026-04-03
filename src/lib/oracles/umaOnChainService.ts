import { encodeFunctionData as viemEncodeFunctionData } from 'viem';

import {
  getOptimisticOracleV3Address,
  getVotingTokenAddress,
  getUMARPCConfig,
  OPTIMISTIC_ORACLE_V3_ABI,
  UMA_TOKEN_ABI,
} from './umaDataSources';

export interface UMATokenData {
  totalSupply: bigint;
  symbol: string;
  name: string;
  decimals: number;
  priceUsd?: string;
  priceChange24hPercent?: string;
}

export interface UMAAssertionData {
  assertionId: string;
  asserter: string;
  assertionTime: number;
  settlementResolution: boolean;
  bond: bigint;
  expirationTime: number;
  settlementTime: number;
  settled: boolean;
  domainId: string;
  identifier: string;
}

export interface UMANetworkStats {
  totalAssertions: number;
  activeAssertions: number;
  settledAssertions: number;
  totalBonded: bigint;
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

type AbiItem = {
  name: string;
  type: string;
  inputs?: readonly { name: string; type: string; indexed?: boolean }[];
  outputs?: readonly { name: string; type: string }[];
  stateMutability?: string;
};

type Abi = AbiItem[];

function encodeFunctionCall(
  abi: readonly AbiItem[],
  functionName: string,
  args?: unknown[]
): `0x${string}` {
  return viemEncodeFunctionData({
    abi: abi as unknown as Abi,
    functionName,
    args,
  });
}

function decodeUint256(data: string): bigint {
  const cleanData = data.startsWith('0x') ? data.slice(2) : data;
  if (!cleanData || cleanData === '0x') {
    return BigInt(0);
  }
  return BigInt('0x' + cleanData);
}

function decodeDecimals(data: string): number {
  const cleanData = data.startsWith('0x') ? data.slice(2) : data;
  return parseInt(cleanData, 16);
}

function decodeString(data: string): string {
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

export class UMAOnChainService {
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
    const config = getUMARPCConfig(chainId);
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

  async getTokenData(chainId: number = 1): Promise<UMATokenData> {
    const cacheKey = `token-${chainId}`;
    const cached = this.getCached<UMATokenData>(cacheKey);
    if (cached) return cached;

    const tokenAddress = getVotingTokenAddress(chainId);
    if (!tokenAddress) {
      throw new Error(`Voting token not found for chain ${chainId}`);
    }

    try {
      const [totalSupplyData, decimalsData, symbolData, nameData] = await Promise.all([
        this.ethCall(chainId, tokenAddress, encodeFunctionCall(UMA_TOKEN_ABI, 'totalSupply')),
        this.ethCall(chainId, tokenAddress, encodeFunctionCall(UMA_TOKEN_ABI, 'decimals')),
        this.ethCall(chainId, tokenAddress, encodeFunctionCall(UMA_TOKEN_ABI, 'symbol')),
        this.ethCall(chainId, tokenAddress, encodeFunctionCall(UMA_TOKEN_ABI, 'name')),
      ]);

      const totalSupply = decodeUint256(totalSupplyData);
      const decimals = decodeDecimals(decimalsData);
      const symbol = decodeString(symbolData);
      const name = decodeString(nameData);

      const result: UMATokenData = {
        totalSupply,
        symbol,
        name,
        decimals,
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error('[UMAOnChainService] Failed to fetch token data:', error);
      throw error;
    }
  }

  async getCurrentTime(chainId: number = 1): Promise<number> {
    const cacheKey = `time-${chainId}`;
    const cached = this.getCached<number>(cacheKey);
    if (cached) return cached;

    const ooAddress = getOptimisticOracleV3Address(chainId);
    if (!ooAddress) {
      throw new Error(`Optimistic Oracle V3 not found for chain ${chainId}`);
    }

    try {
      const timeData = await this.ethCall(
        chainId,
        ooAddress,
        encodeFunctionCall(OPTIMISTIC_ORACLE_V3_ABI, 'getCurrentTime')
      );

      const time = Number(decodeUint256(timeData));
      this.setCache(cacheKey, time);
      return time;
    } catch (error) {
      console.error('[UMAOnChainService] Failed to fetch current time:', error);
      throw error;
    }
  }

  async getCachedOracle(chainId: number = 1): Promise<string> {
    const cacheKey = `cachedOracle-${chainId}`;
    const cached = this.getCached<string>(cacheKey);
    if (cached) return cached;

    const ooAddress = getOptimisticOracleV3Address(chainId);
    if (!ooAddress) {
      throw new Error(`Optimistic Oracle V3 not found for chain ${chainId}`);
    }

    try {
      const oracleData = await this.ethCall(
        chainId,
        ooAddress,
        encodeFunctionCall(OPTIMISTIC_ORACLE_V3_ABI, 'cachedOracle')
      );

      const address = '0x' + oracleData.slice(-40);
      this.setCache(cacheKey, address);
      return address;
    } catch (error) {
      console.error('[UMAOnChainService] Failed to fetch cached oracle:', error);
      throw error;
    }
  }

  async getAssertion(assertionId: string, chainId: number = 1): Promise<UMAAssertionData | null> {
    const cacheKey = `assertion-${assertionId}-${chainId}`;
    const cached = this.getCached<UMAAssertionData>(cacheKey);
    if (cached) return cached;

    const ooAddress = getOptimisticOracleV3Address(chainId);
    if (!ooAddress) {
      throw new Error(`Optimistic Oracle V3 not found for chain ${chainId}`);
    }

    try {
      const assertionData = await this.ethCall(
        chainId,
        ooAddress,
        encodeFunctionCall(OPTIMISTIC_ORACLE_V3_ABI, 'getAssertion', [assertionId as `0x${string}`])
      );

      if (!assertionData || assertionData === '0x') {
        return null;
      }

      // Decode assertion data (simplified decoding)
      const decoded = this.decodeAssertion(assertionData);
      this.setCache(cacheKey, decoded);
      return decoded;
    } catch (error) {
      console.error(`[UMAOnChainService] Failed to fetch assertion ${assertionId}:`, error);
      throw error;
    }
  }

  private decodeAssertion(data: string): UMAAssertionData {
    // Simplified decoding - in production, use proper ABI decoding
    const cleanData = data.startsWith('0x') ? data.slice(2) : data;

    // This is a simplified decoder - real implementation would properly decode the tuple
    return {
      assertionId: '0x' + cleanData.slice(0, 64),
      asserter: '0x' + cleanData.slice(64, 128).slice(-40),
      assertionTime: Number(decodeUint256('0x' + cleanData.slice(128, 192))),
      settlementResolution: cleanData.slice(192, 256).endsWith('1'),
      bond: decodeUint256('0x' + cleanData.slice(256, 320)),
      expirationTime: Number(decodeUint256('0x' + cleanData.slice(320, 384))),
      settlementTime: Number(decodeUint256('0x' + cleanData.slice(384, 448))),
      settled: cleanData.slice(448, 512).endsWith('1'),
      domainId: '0x' + cleanData.slice(512, 576),
      identifier: '0x' + cleanData.slice(576, 640),
    };
  }

  async getNetworkStats(chainId: number = 1): Promise<UMANetworkStats> {
    try {
      const currentTime = await this.getCurrentTime(chainId);

      // Note: In a real implementation, you would query events or a subgraph
      // to get actual assertion counts. This is a simplified version.
      return {
        totalAssertions: 0,
        activeAssertions: 0,
        settledAssertions: 0,
        totalBonded: BigInt(0),
        lastUpdateTimestamp: currentTime,
      };
    } catch (error) {
      console.error('[UMAOnChainService] Failed to fetch network stats:', error);
      throw error;
    }
  }

  getSupportedChainIds(): number[] {
    return [1, 137, 42161, 10, 8453];
  }

  isSupported(chainId: number): boolean {
    return this.getSupportedChainIds().includes(chainId);
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
    const config = getUMARPCConfig(chainId);
    const endpoints = config?.endpoints || [];
    return {
      current: this.currentEndpointIndex[chainId] || 0,
      total: endpoints.length,
      health: this.endpointHealth,
    };
  }
}

export const umaOnChainService = new UMAOnChainService();
