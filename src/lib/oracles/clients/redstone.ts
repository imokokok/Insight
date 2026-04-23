import { RedStoneApiError, type RedStoneErrorCode } from '@/lib/errors';
import { BaseOracleClient, OracleCache } from '@/lib/oracles/base';
import type { OracleClientConfig } from '@/lib/oracles/base';
import { SPREAD_PERCENTAGES, REDSTONE_API_BASE } from '@/lib/oracles/constants/redstoneConstants';
import { redstoneSymbols } from '@/lib/oracles/constants/supportedSymbols';
import { withOracleRetry, ORACLE_RETRY_PRESETS } from '@/lib/oracles/utils/retry';
import { createLogger } from '@/lib/utils/logger';
import { toMilliseconds } from '@/lib/utils/timestamp';
import {
  OracleProvider,
  Blockchain,
  type OracleErrorCode,
  type PriceData,
  type ConfidenceInterval,
} from '@/types/oracle';

const logger = createLogger('RedStoneClient');

const REDSTONE_CACHE_TTL = {
  PRICE: 10000,
};

interface RedStonePriceResponse {
  symbol: string;
  value: number;
  timestamp: number;
  provider?: string;
  permawireTx?: string;
  source?: {
    value: number;
    timestamp: number;
  }[];
  change24h?: number;
  change24hPercent?: number;
}

export class RedStoneClient extends BaseOracleClient {
  name = OracleProvider.REDSTONE;
  supportedChains = [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.OPTIMISM,
    Blockchain.POLYGON,
    Blockchain.AVALANCHE,
    Blockchain.BASE,
    Blockchain.BNB_CHAIN,
    Blockchain.FANTOM,
    Blockchain.LINEA,
    Blockchain.MANTLE,
    Blockchain.SCROLL,
    Blockchain.ZKSYNC,
  ];

  defaultUpdateIntervalMinutes = 10;
  protected historicalPriceConfidence = 0.97;
  private cache = new OracleCache();

  constructor(config?: OracleClientConfig) {
    super(config);
    this.cache.startCleanupInterval();
  }

  private generateConfidenceInterval(price: number, symbol: string): ConfidenceInterval {
    const baseSpread = SPREAD_PERCENTAGES[symbol.toUpperCase()] || 0.05;
    const minute = Math.floor(Date.now() / 60000);
    const hash = ((minute * 2654435761) % 1000) / 1000;
    const deterministicFactor = 0.8 + hash * 0.4;
    const spreadPercentage = baseSpread * deterministicFactor;

    const halfSpread = price * (spreadPercentage / 100 / 2);

    return {
      bid: Number((price - halfSpread).toFixed(4)),
      ask: Number((price + halfSpread).toFixed(4)),
      widthPercentage: Number(spreadPercentage.toFixed(4)),
    };
  }

  private classifyError(error: unknown): RedStoneErrorCode {
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
        return 'PARSE_ERROR';
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
            const response = await fetch(
              `${REDSTONE_API_BASE}/prices?symbol=${symbol.toUpperCase()}&provider=redstone-rapid`,
              {
                method: 'GET',
                headers: {
                  Accept: 'application/json',
                },
                signal,
              }
            );

            if (!response.ok) {
              const errorCode = this.classifyErrorFromStatus(response.status);
              throw new RedStoneApiError(
                `HTTP ${response.status}: ${response.statusText}`,
                errorCode,
                { symbol, attemptCount }
              );
            }

            let data: RedStonePriceResponse[];
            try {
              data = await response.json();
            } catch {
              throw new RedStoneApiError('Failed to parse API response as JSON', 'PARSE_ERROR', {
                symbol,
                attemptCount,
              });
            }

            if (!Array.isArray(data) || data.length === 0) {
              return null;
            }

            const priceData = data[0];
            return this.parsePriceResponse(priceData, symbol);
          } catch (error) {
            if (error instanceof RedStoneApiError) {
              throw error;
            }
            const errorCode = this.classifyError(error);
            throw new RedStoneApiError(
              `Failed to fetch price: ${error instanceof Error ? error.message : 'Unknown error'}`,
              errorCode,
              { symbol, attemptCount },
              error instanceof Error ? error : undefined
            );
          }
        },
        'fetchRealPrice',
        ORACLE_RETRY_PRESETS.standard,
        signal
      );

      if (result) {
        this.cache.set(cacheKey, result, REDSTONE_CACHE_TTL.PRICE);
      }

      return result;
    } catch (error) {
      if (error instanceof RedStoneApiError) {
        throw error;
      }
      throw new RedStoneApiError(
        `Failed to fetch price for ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`,
        this.classifyError(error),
        { symbol, attemptCount },
        error instanceof Error ? error : undefined
      );
    }
  }

  private classifyErrorFromStatus(status: number): RedStoneErrorCode {
    switch (status) {
      case 429:
        return 'RATE_LIMIT_ERROR';
      case 504:
        return 'TIMEOUT_ERROR';
      case 503:
        return 'NETWORK_ERROR';
      default:
        return 'FETCH_ERROR';
    }
  }

  private parsePriceResponse(response: RedStonePriceResponse, symbol: string): PriceData {
    const price = response.value;
    const timestamp = toMilliseconds(response.timestamp);
    const confidenceInterval = this.generateConfidenceInterval(price, symbol);

    return {
      provider: this.name,
      symbol: symbol.toUpperCase(),
      price,
      timestamp,
      decimals: 8,
      confidence: 0.97,
      confidenceSource: 'estimated',
      confidenceInterval,
      change24h: response.change24h ?? 0,
      change24hPercent: response.change24hPercent ?? 0,
      source: response.provider,
    };
  }

  async getPrice(
    symbol: string,
    chain?: Blockchain,
    options?: { signal?: AbortSignal }
  ): Promise<PriceData> {
    if (!symbol) {
      throw this.createError('Symbol is required', 'INVALID_SYMBOL');
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
        `No price data available for ${symbol} from RedStone API`,
        'FETCH_ERROR'
      );
    } catch (error) {
      if (error instanceof RedStoneApiError) {
        throw this.createError(error.message, error.code as OracleErrorCode);
      }
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch price from RedStone',
        'REDSTONE_ERROR'
      );
    }
  }

  clearCache(): void {
    this.cache.clear();
    this.cache.startCleanupInterval();
  }

  getSupportedSymbols(): string[] {
    return [...redstoneSymbols];
  }

  isSymbolSupported(symbol: string, chain?: Blockchain): boolean {
    const isSymbolInList = redstoneSymbols.includes(
      symbol.toUpperCase() as (typeof redstoneSymbols)[number]
    );
    if (!isSymbolInList) {
      return false;
    }
    if (chain !== undefined) {
      return this.supportedChains.includes(chain);
    }
    return true;
  }

  getSupportedChainsForSymbol(symbol: string): Blockchain[] {
    if (!this.isSymbolSupported(symbol)) {
      return [];
    }
    return this.supportedChains;
  }

  async getTokenOnChainData(symbol: string): Promise<RedStoneTokenOnChainData | null> {
    const cacheKey = `onchain-data:${symbol.toUpperCase()}`;
    const cached = this.cache.get<RedStoneTokenOnChainData>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const priceData = await this.fetchRealPrice(symbol);
      if (!priceData) {
        return null;
      }

      const now = Date.now();
      const dataAge = priceData.timestamp ? Math.round((now - priceData.timestamp) / 1000) : null;

      const onChainData: RedStoneTokenOnChainData = {
        symbol: symbol.toUpperCase(),
        price: priceData.price,
        decimals: priceData.decimals || 8,
        bid: priceData.confidenceInterval?.bid || null,
        ask: priceData.confidenceInterval?.ask || null,
        spreadPercentage: priceData.confidenceInterval?.widthPercentage || null,
        supportedChainsCount: this.supportedChains.length,
        updateIntervalMinutes: this.defaultUpdateIntervalMinutes,
        provider: priceData.source || 'redstone-rapid',
        dataAge,
        lastUpdated: priceData.timestamp,
      };

      this.cache.set(cacheKey, onChainData, 60000);
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

export interface RedStoneTokenOnChainData {
  symbol: string;
  price: number;
  decimals: number;
  bid: number | null;
  ask: number | null;
  spreadPercentage: number | null;
  supportedChainsCount: number;
  updateIntervalMinutes: number;
  provider: string;
  dataAge: number | null;
  lastUpdated: number;
}
