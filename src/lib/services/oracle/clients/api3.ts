import { BaseOracleClient } from '@/lib/oracles/base';
import type { OracleClientConfig } from '@/lib/oracles/base';
import { api3Symbols, API3_AVAILABLE_PAIRS } from '@/lib/oracles/supportedSymbols';
import { api3NetworkService } from '@/lib/services/oracle/api3NetworkService';
import type { PriceData } from '@/types/oracle';
import { OracleProvider, Blockchain } from '@/types/oracle';

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

  constructor(config?: OracleClientConfig) {
    super(config);
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
      console.warn('Data fetch failed:', error);
      throw error;
    }
  }

  async getPrice(symbol: string, chain?: Blockchain): Promise<PriceData> {
    if (!symbol) {
      throw this.createError('Symbol is required', 'INVALID_SYMBOL');
    }

    const targetChain = chain || Blockchain.ETHEREUM;

    try {
      // 从API3预言机网络获取价格
      const api3Data = await api3NetworkService.getPrice(symbol, targetChain);

      if (!api3Data) {
        throw this.createError(
          `Price data not available for symbol: ${symbol} on ${targetChain}. The dAPI may not be activated or the symbol is not supported by API3.`,
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
      };
    } catch (error) {
      console.error(`[API3Client] Failed to fetch price for ${symbol}:`, error);

      // 如果是我们主动抛出的错误，直接抛出
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'API3_PRICE_NOT_AVAILABLE'
      ) {
        throw error;
      }

      // 其他错误包装后抛出
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch price from API3 oracle network',
        'API3_PRICE_ERROR'
      );
    }
  }

  async getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    period: number = 24
  ): Promise<PriceData[]> {
    if (!symbol) {
      throw this.createError('Symbol is required', 'INVALID_SYMBOL');
    }

    const targetChain = chain || Blockchain.ETHEREUM;

    try {
      // 从API3网络服务获取历史价格
      const historicalPrices = await api3NetworkService.getHistoricalPrices(
        symbol,
        targetChain,
        period
      );

      if (!historicalPrices || historicalPrices.length === 0) {
        throw this.createError(
          `Historical price data not available for symbol: ${symbol} on ${targetChain}. The dAPI may not be activated or the symbol is not supported by API3.`,
          'API3_HISTORICAL_PRICES_NOT_AVAILABLE'
        );
      }

      return historicalPrices.map((point) => ({
        provider: OracleProvider.API3,
        symbol: symbol.toUpperCase(),
        price: point.price,
        timestamp: point.timestamp,
        decimals: 18,
        confidence: 0.98,
        change24h: 0,
        change24hPercent: 0,
        chain: targetChain,
        source: point.source,
        dataSource: 'real',
      }));
    } catch (error) {
      console.error(`[API3Client] Failed to fetch historical prices for ${symbol}:`, error);

      // 如果是我们主动抛出的错误，直接抛出
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'API3_HISTORICAL_PRICES_NOT_AVAILABLE'
      ) {
        throw error;
      }

      // 其他错误包装后抛出
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
