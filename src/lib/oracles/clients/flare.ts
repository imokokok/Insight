import { OracleProviderError } from '@/lib/errors';
import { BaseOracleClient, OracleCache } from '@/lib/oracles/base';
import type { OracleClientConfig } from '@/lib/oracles/base';
import {
  flareSymbols,
  FLARE_CACHE_TTL,
  FTSOV2_ADDRESS,
  isFlareSymbolSupportedAsync,
} from '@/lib/oracles/constants/flareConstants';
import {
  getFtsoDataService,
  type FtsoDataService,
  type FtsoPriceData,
} from '@/lib/oracles/services/ftsoDataService';
import { withOracleRetry, ORACLE_RETRY_PRESETS } from '@/lib/oracles/utils/retry';
import { buildEvmVerification } from '@/lib/oracles/utils/verificationUtils';
import { createLogger } from '@/lib/utils/logger';
import { toMilliseconds } from '@/lib/utils/timestamp';
import {
  OracleProvider,
  Blockchain,
  type OracleErrorCode,
  type PriceData,
  type ConfidenceInterval,
  type FlareTokenOnChainData,
} from '@/types/oracle';

const logger = createLogger('FlareClient');

export type { FlareTokenOnChainData };

export class FlareClient extends BaseOracleClient {
  name = OracleProvider.FLARE;
  supportedChains = [Blockchain.FLARE];
  supportedSymbolsList = flareSymbols;

  defaultUpdateIntervalMinutes = 1.5;
  private cache = new OracleCache();
  private ftsoService: FtsoDataService;

  constructor(config?: OracleClientConfig) {
    super(config);
    this.ftsoService = getFtsoDataService();
    this.cache.startCleanupInterval();
  }

  private generateConfidenceInterval(price: number, _symbol: string): ConfidenceInterval {
    const baseSpread = 0.05;
    const spreadPercentage = baseSpread;
    const halfSpread = price * (spreadPercentage / 100 / 2);

    return {
      bid: Number((price - halfSpread).toFixed(4)),
      ask: Number((price + halfSpread).toFixed(4)),
      widthPercentage: Number(spreadPercentage.toFixed(4)),
    };
  }

  private classifyError(error: unknown): OracleErrorCode {
    if (error instanceof Error) {
      if (error.message.includes('HTTP 429') || error.message.includes('rate limit')) {
        return 'RATE_LIMIT_ERROR';
      }
      if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        return 'TIMEOUT_ERROR';
      }
      if (
        error.message.includes('network') ||
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('ENOTFOUND')
      ) {
        return 'NETWORK_ERROR';
      }
      if (error.message.includes('parse') || error.message.includes('JSON')) {
        return 'INVALID_RESPONSE';
      }
      if (error.message.includes('not found') || error.message.includes('SYMBOL_NOT_FOUND')) {
        return 'SYMBOL_NOT_SUPPORTED';
      }
    }
    return 'FETCH_ERROR';
  }

  private async fetchRealPrice(symbol: string, signal?: AbortSignal): Promise<PriceData | null> {
    const cacheKey = `price:${symbol}`;
    const cached = this.cache.get<PriceData>(cacheKey);
    if (cached) {
      return cached;
    }

    let attemptCount = 0;

    try {
      const result = await withOracleRetry(
        async () => {
          attemptCount++;
          try {
            const ftsoData = await this.ftsoService.fetchPrice(symbol, 'flare', signal);
            return this.parseFtsoResponse(ftsoData);
          } catch (error) {
            const errorCode = this.classifyError(error);
            throw new OracleProviderError(
              `Failed to fetch price: ${error instanceof Error ? error.message : 'Unknown error'}`,
              'flare',
              errorCode === 'SYMBOL_NOT_SUPPORTED'
                ? 'FEED_NOT_FOUND'
                : errorCode === 'INVALID_RESPONSE'
                  ? 'INVALID_FEED_ID'
                  : errorCode === 'STALE_DATA'
                    ? 'STALE_PRICE'
                    : 'FTSO_RPC_ERROR',
              { symbol, attemptCount }
            );
          }
        },
        'fetchRealPrice',
        ORACLE_RETRY_PRESETS.standard,
        signal
      );

      if (result) {
        this.cache.set(cacheKey, result, FLARE_CACHE_TTL.PRICE);
      }

      return result;
    } catch (error) {
      if (error instanceof OracleProviderError) {
        throw error;
      }
      const errorCode = this.classifyError(error);
      throw new OracleProviderError(
        `Failed to fetch price for ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'flare',
        errorCode === 'RATE_LIMIT_ERROR' ||
          errorCode === 'TIMEOUT_ERROR' ||
          errorCode === 'NETWORK_ERROR'
          ? 'CONTRACT_CALL_FAILED'
          : 'FTSO_RPC_ERROR',
        { symbol, attemptCount },
        error instanceof Error ? error : undefined
      );
    }
  }

  private parseFtsoResponse(ftsoData: FtsoPriceData): PriceData {
    const price = ftsoData.price;
    const timestamp = toMilliseconds(ftsoData.timestamp);
    const confidenceInterval = this.generateConfidenceInterval(price, ftsoData.symbol);

    const dataAgeSeconds = Math.floor(Date.now() / 1000) - ftsoData.timestamp;
    const freshnessScore = Math.max(0, 1 - dataAgeSeconds / 180);
    const dynamicConfidence = Math.min(0.99, 0.9 + freshnessScore * 0.09);

    return {
      provider: this.name,
      symbol: ftsoData.symbol.toUpperCase(),
      price,
      timestamp,
      decimals: ftsoData.decimals,
      confidence: dynamicConfidence,
      confidenceSource: 'calculated',
      confidenceInterval,
      change24h: 0,
      change24hPercent: 0,
      source: 'ftso-v2-on-chain',
      ingestionTimestamp: Date.now(),
      verification: buildEvmVerification(FTSOV2_ADDRESS.flare, 14, 'getFeedById'),
    };
  }

  async getPrice(
    symbol: string,
    chain?: Blockchain,
    options?: { signal?: AbortSignal }
  ): Promise<PriceData> {
    this.validateGetPriceParams(symbol, options);

    const isSupported = await isFlareSymbolSupportedAsync(symbol);
    if (!isSupported) {
      throw this.createUnsupportedSymbolError(symbol.toUpperCase(), chain);
    }

    try {
      const realPrice = await this.fetchRealPrice(symbol, options?.signal);

      if (realPrice) {
        return {
          ...realPrice,
          chain,
        };
      }

      throw this.createError(
        `No price data available for ${symbol} from Flare FTSO`,
        'NO_DATA_AVAILABLE'
      );
    } catch (error) {
      this.handleGetPriceError(error, 'Flare', 'FETCH_ERROR');
    }
  }

  clearCache(): void {
    this.cache.stopCleanupInterval();
    this.cache.clear();
    this.cache.startCleanupInterval();
    this.ftsoService.clearCache();
  }

  override destroy(): void {
    this.cache.destroy();
  }

  async getTokenOnChainData(symbol: string): Promise<FlareTokenOnChainData | null> {
    const cacheKey = `onchain-data:${symbol.toUpperCase()}`;
    const cached = this.cache.get<FlareTokenOnChainData>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const ftsoData = await this.ftsoService.fetchPrice(symbol, 'flare');
      if (!ftsoData) {
        return null;
      }

      const dataAge = ftsoData.dataAge;

      const onChainData: FlareTokenOnChainData = {
        symbol: ftsoData.symbol.toUpperCase(),
        price: ftsoData.price,
        decimals: ftsoData.decimals,
        feedId: ftsoData.feedId,
        dataAge,
        lastUpdated: ftsoData.timestamp,
        network: ftsoData.network,
        provider: 'ftso-v2-on-chain',
      };

      this.cache.set(cacheKey, onChainData, FLARE_CACHE_TTL.PRICE);
      return onChainData;
    } catch (error) {
      logger.error(
        `Failed to get on-chain data for ${symbol}`,
        error instanceof Error ? error : new Error(String(error))
      );
      return null;
    }
  }
}
