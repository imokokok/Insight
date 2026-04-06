import { BaseOracleClient } from '@/lib/oracles/base';
import type { OracleClientConfig } from '@/lib/oracles/base';
import { api3Symbols } from '@/lib/oracles/supportedSymbols';
import { binanceMarketService } from '@/lib/services/marketData/binanceMarketService';
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

    try {
      // 使用 Binance 市场数据服务获取真实价格
      const marketData = await binanceMarketService.getTokenMarketData(symbol);

      if (marketData) {
        return {
          provider: OracleProvider.API3,
          symbol: marketData.symbol.toUpperCase(),
          price: marketData.currentPrice,
          timestamp: new Date(marketData.lastUpdated).getTime(),
          decimals: 8,
          confidence: 0.95,
          change24h: marketData.priceChange24h,
          change24hPercent: marketData.priceChangePercentage24h,
          chain: chain || Blockchain.ETHEREUM,
          source: 'binance-api',
        };
      }

      throw this.createError(
        `Price data not available for symbol: ${symbol}`,
        'API3_PRICE_NOT_AVAILABLE'
      );
    } catch (error) {
      console.error(`[API3Client] Failed to fetch price for ${symbol}:`, error);
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch price',
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

    try {
      // 使用 Binance 市场数据服务获取真实历史价格
      const days = Math.ceil(period / 24);
      const historicalPrices = await binanceMarketService.getHistoricalPrices(symbol, days);

      if (historicalPrices && historicalPrices.length > 0) {
        return historicalPrices.map((point) => ({
          provider: OracleProvider.API3,
          symbol: symbol.toUpperCase(),
          price: point.price,
          timestamp: point.timestamp,
          decimals: 8,
          confidence: 0.95,
          change24h: 0,
          change24hPercent: 0,
          chain: chain || Blockchain.ETHEREUM,
          source: 'binance-api',
        }));
      }

      throw this.createError(
        `Historical price data not available for symbol: ${symbol}`,
        'API3_HISTORICAL_PRICES_NOT_AVAILABLE'
      );
    } catch (error) {
      console.error(`[API3Client] Failed to fetch historical prices for ${symbol}:`, error);
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch historical prices',
        'API3_HISTORICAL_PRICES_ERROR'
      );
    }
  }

  getSupportedSymbols(): string[] {
    return [...api3Symbols];
  }

  isSymbolSupported(symbol: string, chain?: Blockchain): boolean {
    const isSymbolInList = api3Symbols.includes(
      symbol.toUpperCase() as (typeof api3Symbols)[number]
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
}
