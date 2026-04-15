import { BaseOracleClient } from '@/lib/oracles/base';
import type { OracleClientConfig } from '@/lib/oracles/base';
import { API3_AVAILABLE_PAIRS } from '@/lib/oracles/constants/supportedSymbols';
import { api3NetworkService } from '@/lib/oracles/services/api3NetworkService';
import { binanceMarketService } from '@/lib/services/marketData/binanceMarketService';
import { createLogger } from '@/lib/utils/logger';
import type { PriceData } from '@/types/oracle';
import { OracleProvider, Blockchain, OracleError } from '@/types/oracle';

const logger = createLogger('API3Client');

export class API3Client extends BaseOracleClient {
  name = OracleProvider.API3;
  supportedChains = [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.POLYGON,
    Blockchain.AVALANCHE,
    Blockchain.BNB_CHAIN,
    Blockchain.BASE,
    Blockchain.OPTIMISM,
  ];

  defaultUpdateIntervalMinutes = 1;
  private dataCache: Map<string, { data: unknown; timestamp: number }> = new Map();
  private cacheTTL = 60000;
  private useRealData: boolean;

  constructor(config?: OracleClientConfig & { useRealData?: boolean }) {
    super(config);
    this.useRealData = config?.useRealData ?? true;
  }

  private getCached<T>(key: string): T | null {
    const cached = this.dataCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data as T;
    }
    return null;
  }

  private setCache(key: string, data: unknown): void {
    this.dataCache.set(key, { data, timestamp: Date.now() });
  }

  private async fetchData<T>(dataFn: () => Promise<T>, cacheKey?: string): Promise<T> {
    if (cacheKey) {
      const cached = this.getCached<T>(cacheKey);
      if (cached) return cached;
    }

    try {
      const data = await dataFn();
      if (cacheKey) this.setCache(cacheKey, data);
      return data;
    } catch (error) {
      logger.warn('Data fetch failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getPrice(
    symbol: string,
    chain?: Blockchain,
    _options?: { signal?: AbortSignal }
  ): Promise<PriceData> {
    if (!symbol) {
      throw this.createError('Symbol is required', 'INVALID_SYMBOL');
    }

    const targetChain = chain || Blockchain.ETHEREUM;

    try {
      const api3Data = await api3NetworkService.getPrice(symbol, targetChain);

      if (!api3Data) {
        throw this.createError(
          `Price data not available for symbol: ${symbol} on ${targetChain}. The dAPI may not be activated or the symbol is not supported by API3.`,
          'API3_PRICE_NOT_AVAILABLE'
        );
      }

      if (!api3Data.price || api3Data.price <= 0) {
        throw this.createError(
          `Invalid price (0) for symbol: ${symbol} on ${targetChain}. The dAPI may not be activated or the proxy address is incorrect.`,
          'API3_PRICE_NOT_AVAILABLE'
        );
      }

      return {
        provider: OracleProvider.API3,
        symbol: symbol.toUpperCase(),
        price: api3Data.price,
        timestamp: api3Data.timestamp,
        decimals: api3Data.decimals,
        confidence: api3Data.confidence,
        chain: targetChain,
        source: api3Data.source,
        dataSource: 'real',
        dapiName: api3Data.dapiName,
        proxyAddress: api3Data.proxyAddress,
        dataAge: api3Data.dataAge,
      };
    } catch (error) {
      if (error instanceof OracleError) throw error;
      logger.error(
        `Failed to fetch price for ${symbol}: ${error instanceof Error ? error.message : String(error)}`
      );
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch price from API3 oracle network',
        'API3_PRICE_ERROR'
      );
    }
  }

  async getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    period: number = 24,
    _options?: { signal?: AbortSignal }
  ): Promise<PriceData[]> {
    if (!symbol) {
      throw this.createError('Symbol is required', 'INVALID_SYMBOL');
    }

    const targetChain = chain || Blockchain.ETHEREUM;

    try {
      const historicalPrices = await binanceMarketService.getHistoricalPricesByHours(
        symbol,
        period
      );

      if (!historicalPrices || historicalPrices.length === 0) {
        throw this.createError(
          `Historical price data not available for symbol: ${symbol}. Please check if the symbol is supported.`,
          'API3_HISTORICAL_PRICES_NOT_AVAILABLE'
        );
      }

      const latestPrice = historicalPrices[historicalPrices.length - 1].price;

      return historicalPrices.map((point) => {
        const change24h = latestPrice - point.price;
        const change24hPercent =
          point.price > 0 ? ((latestPrice - point.price) / point.price) * 100 : 0;

        return {
          provider: OracleProvider.API3,
          symbol: symbol.toUpperCase(),
          price: point.price,
          timestamp: point.timestamp,
          decimals: 8,
          confidence: 0.98,
          change24h: Number(change24h.toFixed(4)),
          change24hPercent: Number(change24hPercent.toFixed(2)),
          chain: targetChain,
          source: 'binance-api',
          dataSource: 'real',
        };
      });
    } catch (error) {
      if (error instanceof OracleError) throw error;
      logger.error(
        `Failed to fetch historical prices for ${symbol}: ${error instanceof Error ? error.message : String(error)}`
      );
      throw this.createError(
        error instanceof Error
          ? error.message
          : 'Failed to fetch historical prices from API3 oracle network',
        'API3_HISTORICAL_PRICES_ERROR'
      );
    }
  }

  getSupportedSymbols(): string[] {
    // 返回所有API3支持的币种（去重）
    const allSymbols = new Set<string>();
    Object.values(API3_AVAILABLE_PAIRS).forEach((symbols) => {
      symbols.forEach((symbol) => allSymbols.add(symbol));
    });
    return Array.from(allSymbols);
  }

  getSupportedSymbolsForChain(chain: Blockchain): string[] {
    const chainKey = chain.toLowerCase();
    return API3_AVAILABLE_PAIRS[chainKey] || [];
  }

  isSymbolSupported(symbol: string, chain?: Blockchain): boolean {
    const upperSymbol = symbol.toUpperCase();

    if (chain !== undefined) {
      const chainKey = chain.toLowerCase();
      const chainSymbols = API3_AVAILABLE_PAIRS[chainKey];
      if (!chainSymbols) return false;
      return chainSymbols.includes(upperSymbol);
    }

    // 如果没有指定链，检查该币种是否在任何链上支持
    return Object.values(API3_AVAILABLE_PAIRS).some((symbols) => symbols.includes(upperSymbol));
  }

  getSupportedChainsForSymbol(symbol: string): Blockchain[] {
    const upperSymbol = symbol.toUpperCase();
    const supportedChains: Blockchain[] = [];

    for (const [chain, symbols] of Object.entries(API3_AVAILABLE_PAIRS)) {
      if (symbols.includes(upperSymbol)) {
        // 将字符串链名转换为Blockchain枚举
        const blockchain = this.supportedChains.find(
          (c) => c.toLowerCase() === chain.toLowerCase()
        );
        if (blockchain) {
          supportedChains.push(blockchain);
        }
      }
    }

    return supportedChains;
  }
}
