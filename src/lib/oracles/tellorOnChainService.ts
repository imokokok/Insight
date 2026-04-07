import { encodeFunctionData as viemEncodeFunctionData } from 'viem';

import {
  TELLOR_ORACLE_ABI,
  getTellorOracleAddress,
  getTellorPriceQuery,
  getTellorRPCConfig,
} from './tellorDataSources';

export interface TellorPriceData {
  symbol: string;
  price: number;
  decimals: number;
  timestamp: number;
  queryId: string;
  chainId: number;
}

export interface TellorReporterData {
  reporter: string;
  stakeAmount: bigint;
  rewardAmount: bigint;
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

// 编码函数调用
function encodeGetCurrentValue(queryId: string): `0x${string}` {
  return viemEncodeFunctionData({
    abi: TELLOR_ORACLE_ABI,
    functionName: 'getCurrentValue',
    args: [queryId as `0x${string}`],
  });
}

function encodeGetNewValueCount(queryId: string): `0x${string}` {
  return viemEncodeFunctionData({
    abi: TELLOR_ORACLE_ABI,
    functionName: 'getNewValueCountbyQueryId',
    args: [queryId as `0x${string}`],
  });
}

function encodeGetTimestampByIndex(queryId: string, index: number): `0x${string}` {
  return viemEncodeFunctionData({
    abi: TELLOR_ORACLE_ABI,
    functionName: 'getTimestampbyQueryIdandIndex',
    args: [queryId as `0x${string}`, BigInt(index)],
  });
}

function encodeRetrieveData(queryId: string, timestamp: bigint): `0x${string}` {
  return viemEncodeFunctionData({
    abi: TELLOR_ORACLE_ABI,
    functionName: 'retrieveData',
    args: [queryId as `0x${string}`, timestamp],
  });
}

// 解码函数
function decodeUint256(data: string): bigint {
  const cleanData = data.startsWith('0x') ? data.slice(2) : data;
  if (!cleanData || cleanData === '0x') {
    return BigInt(0);
  }
  return BigInt('0x' + cleanData);
}

function decodeBytes(data: string): string {
  const cleanData = data.startsWith('0x') ? data.slice(2) : data;
  if (!cleanData || cleanData.length < 64) {
    return '0x';
  }
  // 跳过偏移量 (32 bytes) 和长度 (32 bytes)
  const length = parseInt(cleanData.slice(64, 128), 16);
  const bytesData = cleanData.slice(128, 128 + length * 2);
  return '0x' + bytesData;
}

function decodeGetCurrentValue(data: string): { value: string; timestamp: bigint } {
  const cleanData = data.startsWith('0x') ? data.slice(2) : data;

  // 解析返回值: (bytes memory _value, uint256 _timestamp)
  // bytes 是动态类型，需要特殊处理
  const offset = parseInt(cleanData.slice(0, 64), 16) * 2; // 偏移量 (in hex chars)
  const timestamp = BigInt('0x' + cleanData.slice(64, 128));

  // 解析 bytes 数据
  const bytesLength = parseInt(cleanData.slice(offset, offset + 64), 16);
  const value = '0x' + cleanData.slice(offset + 64, offset + 64 + bytesLength * 2);

  return { value, timestamp };
}

// 从 bytes 解码价格 (Tellor 使用 ABI 编码的 uint256)
function decodePriceFromBytes(bytesData: string): number {
  try {
    const cleanData = bytesData.startsWith('0x') ? bytesData.slice(2) : bytesData;
    if (!cleanData || cleanData.length < 64) {
      return 0;
    }
    // Tellor 价格数据通常是 18 位小数的 uint256
    const rawValue = BigInt('0x' + cleanData.slice(0, 64));
    return Number(rawValue) / 1e18;
  } catch {
    return 0;
  }
}

export class TellorOnChainService {
  private requestId = 0;
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map();
  private cacheTTL = 60000; // 60 秒缓存
  private endpointHealth: Record<string, boolean> = {};
  private currentEndpointIndex: Record<number, number> = {};

  private async rpcCallWithFallback<T>(
    chainId: number,
    method: string,
    params: unknown[]
  ): Promise<T> {
    const config = getTellorRPCConfig(chainId);
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

  async getPrice(symbol: string, chainId: number = 1): Promise<TellorPriceData> {
    const cacheKey = `price-${symbol}-${chainId}`;
    const cached = this.getCached<TellorPriceData>(cacheKey);
    if (cached) return cached;

    const oracleAddress = getTellorOracleAddress(chainId);
    if (!oracleAddress) {
      throw new Error(`Tellor oracle not deployed on chain ${chainId}`);
    }

    const priceQuery = getTellorPriceQuery(symbol);
    if (!priceQuery) {
      throw new Error(`Price query not found for ${symbol}`);
    }

    try {
      // 调用 getCurrentValue 获取当前价格
      const currentValueData = await this.ethCall(
        chainId,
        oracleAddress,
        encodeGetCurrentValue(priceQuery.queryId)
      );

      const decoded = decodeGetCurrentValue(currentValueData);

      if (decoded.timestamp === BigInt(0)) {
        throw new Error(`No data available for ${symbol} on chain ${chainId}`);
      }

      const price = decodePriceFromBytes(decoded.value);

      if (price === 0) {
        throw new Error(`Invalid price data for ${symbol}`);
      }

      const result: TellorPriceData = {
        symbol: symbol.toUpperCase(),
        price,
        decimals: 18,
        timestamp: Number(decoded.timestamp) * 1000,
        queryId: priceQuery.queryId,
        chainId,
      };

      this.setCache(cacheKey, result);
      return result;
    } catch (error) {
      console.error(`[TellorOnChainService] Failed to fetch price for ${symbol}:`, error);
      throw error;
    }
  }

  async getHistoricalValues(
    symbol: string,
    chainId: number = 1,
    count: number = 10
  ): Promise<TellorPriceData[]> {
    const oracleAddress = getTellorOracleAddress(chainId);
    if (!oracleAddress) {
      throw new Error(`Tellor oracle not deployed on chain ${chainId}`);
    }

    const priceQuery = getTellorPriceQuery(symbol);
    if (!priceQuery) {
      throw new Error(`Price query not found for ${symbol}`);
    }

    try {
      // 获取该 queryId 的新值数量
      const countData = await this.ethCall(
        chainId,
        oracleAddress,
        encodeGetNewValueCount(priceQuery.queryId)
      );
      const valueCount = Number(decodeUint256(countData));

      if (valueCount === 0) {
        return [];
      }

      // 获取最近的历史数据
      const results: TellorPriceData[] = [];
      const startIndex = Math.max(0, valueCount - count);

      for (let i = startIndex; i < valueCount; i++) {
        try {
          // 获取时间戳
          const timestampData = await this.ethCall(
            chainId,
            oracleAddress,
            encodeGetTimestampByIndex(priceQuery.queryId, i)
          );
          const timestamp = decodeUint256(timestampData);

          if (timestamp === BigInt(0)) continue;

          // 获取数据
          const dataResult = await this.ethCall(
            chainId,
            oracleAddress,
            encodeRetrieveData(priceQuery.queryId, timestamp)
          );
          const value = decodeBytes(dataResult);
          const price = decodePriceFromBytes(value);

          if (price > 0) {
            results.push({
              symbol: symbol.toUpperCase(),
              price,
              decimals: 18,
              timestamp: Number(timestamp) * 1000,
              queryId: priceQuery.queryId,
              chainId,
            });
          }
        } catch (error) {
          console.warn(`Failed to fetch historical value at index ${i}:`, error);
        }
      }

      return results;
    } catch (error) {
      console.error(
        `[TellorOnChainService] Failed to fetch historical prices for ${symbol}:`,
        error
      );
      throw error;
    }
  }

  async getPrices(symbols: string[], chainId: number = 1): Promise<TellorPriceData[]> {
    const promises = symbols.map((symbol) =>
      this.getPrice(symbol, chainId).catch((error) => {
        console.warn(`Failed to fetch price for ${symbol}:`, error);
        return null;
      })
    );

    const results = await Promise.all(promises);
    return results.filter((result): result is TellorPriceData => result !== null);
  }

  getSupportedSymbols(): string[] {
    return ['BTC', 'ETH', 'LINK', 'TRB', 'USDC', 'USDT', 'DAI'];
  }

  isPriceQuerySupported(symbol: string): boolean {
    return getTellorPriceQuery(symbol) !== null;
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
    const config = getTellorRPCConfig(chainId);
    const endpoints = config?.endpoints || [];
    return {
      current: this.currentEndpointIndex[chainId] || 0,
      total: endpoints.length,
      health: this.endpointHealth,
    };
  }
}

export const tellorOnChainService = new TellorOnChainService();
