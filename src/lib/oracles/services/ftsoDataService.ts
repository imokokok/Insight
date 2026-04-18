import { encodeFunctionData, decodeFunctionResult } from 'viem';

import { createLogger } from '@/lib/utils/logger';

import {
  FLARE_RPC_ENDPOINTS,
  FTSOV2_ADDRESS,
  FTSOV2_ABI,
  FLARE_CACHE_TTL,
  FLARE_REQUEST_TIMEOUT,
  FLARE_STALE_DATA_THRESHOLD,
  FLARE_SYMBOL_TO_FEED_ID,
  FLARE_CONTRACT_REGISTRY,
  REGISTRY_ABI,
} from '../constants/flareConstants';
import { withOracleRetry, ORACLE_RETRY_PRESETS } from '../utils/retry';

import type { OracleCacheEntry } from '../base';

const logger = createLogger('FtsoDataService');

export interface FtsoPriceData {
  symbol: string;
  price: number;
  decimals: number;
  timestamp: number;
  feedId: string;
  network: string;
  dataAge: number;
}

export interface FtsoFeedData {
  value: bigint;
  decimals: number;
  timestamp: number;
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

export class FtsoApiError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode?: number,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'FtsoApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class FtsoDataService {
  private cache: Map<string, OracleCacheEntry<unknown>> = new Map();
  private static instance: FtsoDataService | null = null;
  private requestId = 0;
  private endpointHealth: Record<string, boolean> = {};
  private currentEndpointIndex: Record<string, number> = {};
  private endpointFailureTime: Record<string, number> = {};
  private endpointRecoveryTime = 60000;
  private resolvedFtsoV2Address: Record<string, `0x${string}`> = {};

  private constructor() {
    logger.info('FtsoDataService initialized');
  }

  static getInstance(): FtsoDataService {
    if (!FtsoDataService.instance) {
      FtsoDataService.instance = new FtsoDataService();
    }
    return FtsoDataService.instance;
  }

  private isEndpointHealthy(network: string, index: number): boolean {
    const key = `${network}-${index}`;
    const health = this.endpointHealth[key];

    if (health === false) {
      const lastFail = this.endpointFailureTime[key];
      if (lastFail && Date.now() - lastFail > this.endpointRecoveryTime) {
        this.endpointHealth[key] = true;
        delete this.endpointFailureTime[key];
        logger.debug(`Endpoint ${key} recovered`, { network, index });
        return true;
      }
      return false;
    }
    return true;
  }

  private async rpcCallWithFallback<T>(
    network: string,
    method: string,
    params: unknown[],
    signal?: AbortSignal
  ): Promise<T> {
    const endpoints = FLARE_RPC_ENDPOINTS[network] || FLARE_RPC_ENDPOINTS.flare;
    if (!endpoints || endpoints.length === 0) {
      throw new FtsoApiError('No RPC endpoints available', 'NO_ENDPOINTS');
    }

    if (signal?.aborted) {
      throw new FtsoApiError('Request aborted before fetch', 'ABORT_ERROR');
    }

    const startIndex = this.currentEndpointIndex[network] || 0;
    let lastError: Error | null = null;

    for (let i = 0; i < endpoints.length; i++) {
      if (signal?.aborted) {
        throw new FtsoApiError('Request aborted', 'ABORT_ERROR');
      }

      const endpointIndex = (startIndex + i) % endpoints.length;
      const endpoint = endpoints[endpointIndex];

      if (!this.isEndpointHealthy(network, endpointIndex)) {
        continue;
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FLARE_REQUEST_TIMEOUT);

      if (signal) {
        signal.addEventListener('abort', () => controller.abort(), { once: true });
      }

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
          throw new FtsoApiError(
            `RPC call failed: ${response.status}`,
            'RPC_ERROR',
            response.status
          );
        }

        const result: RPCResponse<T> = await response.json();

        if (result.error) {
          throw new FtsoApiError(
            `RPC error: ${result.error.message}`,
            'RPC_ERROR',
            result.error.code
          );
        }

        this.currentEndpointIndex[network] = endpointIndex;
        this.endpointHealth[`${network}-${endpointIndex}`] = true;
        delete this.endpointFailureTime[`${network}-${endpointIndex}`];

        return result.result as T;
      } catch (error) {
        clearTimeout(timeoutId);
        lastError = error instanceof Error ? error : new Error(String(error));
        const key = `${network}-${endpointIndex}`;
        this.endpointHealth[key] = false;
        this.endpointFailureTime[key] = Date.now();

        if (error instanceof Error && error.name === 'AbortError') {
          if (signal?.aborted) {
            throw new FtsoApiError('Request aborted', 'ABORT_ERROR');
          }
          logger.warn(`RPC endpoint ${endpoint} timed out after ${FLARE_REQUEST_TIMEOUT}ms`, {
            network,
            endpoint,
            method,
          });
        } else {
          logger.warn(`RPC endpoint ${endpoint} failed, trying next`, {
            network,
            endpoint,
            error: lastError.message,
          });
        }
      }
    }

    throw lastError || new FtsoApiError('All RPC endpoints failed', 'ALL_ENDPOINTS_FAILED');
  }

  private async ethCall(
    network: string,
    to: `0x${string}`,
    data: `0x${string}`,
    signal?: AbortSignal
  ): Promise<string> {
    return this.rpcCallWithFallback<string>(network, 'eth_call', [{ to, data }, 'latest'], signal);
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key) as OracleCacheEntry<T> | undefined;
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  private setCache<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  private async resolveFtsoV2Address(network: string): Promise<`0x${string}`> {
    const cached = this.resolvedFtsoV2Address[network];
    if (cached) {
      return cached;
    }

    const hardcoded = FTSOV2_ADDRESS[network];
    if (!hardcoded) {
      throw new FtsoApiError(
        `FTSO V2 address not configured for network '${network}'`,
        'ADDRESS_NOT_CONFIGURED',
        undefined,
        { network }
      );
    }

    try {
      const registryAddress = FLARE_CONTRACT_REGISTRY as `0x${string}`;
      const data = encodeFunctionData({
        abi: REGISTRY_ABI,
        functionName: 'getContractAddressByName',
        args: ['FtsoV2'],
      });

      const result = await this.ethCall(network, registryAddress, data);
      const address = `0x${result.slice(26)}` as `0x${string}`;

      if (address !== '0x' && address.length === 42) {
        this.resolvedFtsoV2Address[network] = address;
        logger.info(`Resolved FtsoV2 address for ${network}: ${address}`);
        return address;
      }
    } catch (error) {
      logger.warn(
        `Failed to resolve FtsoV2 address from registry for ${network}, using hardcoded fallback`,
        {
          network,
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }

    this.resolvedFtsoV2Address[network] = hardcoded;
    return hardcoded;
  }

  getFeedId(symbol: string): string | null {
    const upperSymbol = symbol.toUpperCase();
    return FLARE_SYMBOL_TO_FEED_ID[upperSymbol] || null;
  }

  private decodeFeedResult(result: string): FtsoFeedData {
    const cleanResult = result.startsWith('0x') ? result : `0x${result}`;

    if (!cleanResult || cleanResult.length < 66) {
      throw new FtsoApiError('Invalid feed result length', 'INVALID_RESULT');
    }

    try {
      const decoded = decodeFunctionResult({
        abi: FTSOV2_ABI,
        functionName: 'getFeedById',
        data: cleanResult as `0x${string}`,
      });

      const value = BigInt(decoded[0]);
      const decimalsRaw = Number(decoded[1]);
      const decimals = decimalsRaw > 127 ? decimalsRaw - 256 : decimalsRaw;
      const timestamp = Number(decoded[2]);

      return { value, decimals, timestamp };
    } catch (error) {
      throw new FtsoApiError(
        `Failed to decode feed result: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DECODE_ERROR'
      );
    }
  }

  private calculatePrice(value: bigint, decimals: number): number {
    const absDecimals = Math.abs(decimals);
    return Number(value) / Math.pow(10, absDecimals);
  }

  async fetchPrice(
    symbol: string,
    network: string = 'flare',
    signal?: AbortSignal
  ): Promise<FtsoPriceData> {
    const cacheKey = `price:${symbol}:${network}`;
    const cached = this.getFromCache<FtsoPriceData>(cacheKey);
    if (cached) return cached;

    const feedId = this.getFeedId(symbol);
    if (!feedId) {
      throw new FtsoApiError(
        `Symbol '${symbol}' not found in Flare feed registry`,
        'SYMBOL_NOT_FOUND',
        undefined,
        { symbol, network }
      );
    }

    const ftsoV2Address = await this.resolveFtsoV2Address(network);
    if (!ftsoV2Address) {
      throw new FtsoApiError(
        `FTSO V2 address not configured for network '${network}'`,
        'ADDRESS_NOT_CONFIGURED',
        undefined,
        { network }
      );
    }

    try {
      const result = await withOracleRetry(
        async () => {
          if (signal?.aborted) {
            throw new FtsoApiError('Request was aborted', 'ABORT_ERROR');
          }

          const data = encodeFunctionData({
            abi: FTSOV2_ABI,
            functionName: 'getFeedById',
            args: [feedId as `0x${string}`],
          });

          return await this.ethCall(network, ftsoV2Address, data, signal);
        },
        'ftso:fetchPrice',
        ORACLE_RETRY_PRESETS.standard
      );

      const feedData = this.decodeFeedResult(result);
      const price = this.calculatePrice(feedData.value, feedData.decimals);
      const dataAge = Math.floor(Date.now() / 1000) - feedData.timestamp;

      if (price <= 0) {
        throw new FtsoApiError(
          `Invalid price for ${symbol}: ${price}`,
          'INVALID_PRICE',
          undefined,
          { symbol, network, rawValue: feedData.value.toString() }
        );
      }

      if (dataAge > FLARE_STALE_DATA_THRESHOLD) {
        logger.warn(`Stale data for ${symbol}`, {
          symbol,
          network,
          dataAge,
          threshold: FLARE_STALE_DATA_THRESHOLD,
        });
      }

      const priceData: FtsoPriceData = {
        symbol: symbol.toUpperCase(),
        price,
        decimals: feedData.decimals,
        timestamp: feedData.timestamp * 1000,
        feedId,
        network,
        dataAge,
      };

      this.setCache(cacheKey, priceData, FLARE_CACHE_TTL.PRICE);
      return priceData;
    } catch (error) {
      if (error instanceof FtsoApiError) {
        throw error;
      }
      throw new FtsoApiError(
        `Failed to fetch price for ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'FETCH_ERROR',
        undefined,
        { symbol, network, feedId }
      );
    }
  }

  async fetchPrices(
    symbols: string[],
    network: string = 'flare',
    signal?: AbortSignal
  ): Promise<FtsoPriceData[]> {
    const promises = symbols.map((symbol) =>
      this.fetchPrice(symbol, network, signal).catch((error) => {
        logger.warn(`Failed to fetch price for ${symbol}`, {
          error: error instanceof Error ? error.message : String(error),
        });
        return null;
      })
    );

    const results = await Promise.all(promises);
    return results.filter((result): result is FtsoPriceData => result !== null);
  }

  clearCache(): void {
    this.cache.clear();
    logger.info('Cache cleared');
  }
}

export function getFtsoDataService(): FtsoDataService {
  return FtsoDataService.getInstance();
}
