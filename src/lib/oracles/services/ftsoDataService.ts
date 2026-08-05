import { encodeFunctionData, decodeFunctionResult } from 'viem';

import { createLogger } from '@/lib/utils/logger';

import { OracleCache, createSingleton } from '../base';
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
  getFlareFeedIdAsync,
} from '../constants/flareConstants';
import { bigIntToPrice } from '../utils/oracleDataUtils';
import { withOracleRetry, ORACLE_RETRY_PRESETS } from '../utils/retry';
import { RpcClientWithFallback } from '../utils/rpcClientWithFallback';

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

interface FtsoFeedData {
  value: bigint;
  decimals: number;
  timestamp: number;
}

class FtsoApiError extends Error {
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

class FtsoDataService {
  private rpcClient = new RpcClientWithFallback({
    requestTimeout: FLARE_REQUEST_TIMEOUT,
    contextLabel: 'ftso',
  });
  private cache = new OracleCache();
  private resolvedFtsoV2Address: Record<string, `0x${string}`> = {};

  constructor() {
    logger.info('FtsoDataService initialized');
  }

  private async ethCall(
    network: string,
    to: `0x${string}`,
    data: `0x${string}`,
    signal?: AbortSignal
  ): Promise<string> {
    const endpoints = FLARE_RPC_ENDPOINTS[network] || FLARE_RPC_ENDPOINTS.flare;
    return this.rpcClient.ethCall(network, endpoints, to, data, signal);
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

  async getFeedIdAsync(symbol: string, network: string): Promise<string | null> {
    return getFlareFeedIdAsync(symbol, network);
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
    return bigIntToPrice(value, absDecimals);
  }

  async fetchPrice(
    symbol: string,
    network: string = 'flare',
    signal?: AbortSignal
  ): Promise<FtsoPriceData> {
    const cacheKey = `price:${symbol}:${network}`;
    const cached = this.cache.get<FtsoPriceData>(cacheKey);
    if (cached) return cached;

    const feedId = await this.getFeedIdAsync(symbol, network);
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
        // Flare uses RpcClientWithFallback which iterates multiple endpoints
        // (10s per endpoint). The standard 15s timeout can't accommodate a
        // full endpoint iteration when endpoints are slow. 30s gives one
        // full iteration.
        { ...ORACLE_RETRY_PRESETS.standard, timeout: 30000 },
        signal
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

      this.cache.set(cacheKey, priceData, FLARE_CACHE_TTL.PRICE);
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

  clearCache(): void {
    this.cache.clear();
    logger.info('Cache cleared');
  }
}

export type { FtsoDataService };

export const getFtsoDataService = createSingleton(() => new FtsoDataService());
