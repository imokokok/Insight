import { BaseOracleClient } from '@/lib/oracles/base';
import type { OracleClientConfig } from '@/lib/oracles/base';
import { tellorSymbols } from '@/lib/oracles/supportedSymbols';
import { binanceMarketService } from '@/lib/services/marketData/binanceMarketService';
import { OracleProvider, Blockchain } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';

export class TellorClient extends BaseOracleClient {
  name = OracleProvider.TELLOR;
  supportedChains = [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.OPTIMISM,
    Blockchain.POLYGON,
    Blockchain.BASE,
    Blockchain.AVALANCHE,
  ];

  defaultUpdateIntervalMinutes = 15;

  constructor(config?: OracleClientConfig) {
    super(config);
  }

  /**
   * 获取代币价格
   * 使用 Binance API 获取价格数据
   */
  async getPrice(symbol: string, chain?: Blockchain): Promise<PriceData> {
    const upperSymbol = symbol.toUpperCase();

    try {
      const marketData = await binanceMarketService.getTokenMarketData(symbol);
      if (marketData) {
        return {
          provider: this.name,
          symbol: upperSymbol,
          price: marketData.currentPrice,
          timestamp: new Date(marketData.lastUpdated).getTime(),
          decimals: 8,
          confidence: 0.95,
          change24h: marketData.priceChange24h,
          change24hPercent: marketData.priceChangePercentage24h,
          chain,
          source: 'binance-api',
        };
      }
    } catch (error) {
      console.error(`[TellorClient] Failed to fetch price from Binance:`, error);
    }

    throw this.createError(
      `Failed to fetch price for ${upperSymbol}: No data available`,
      'NO_DATA_AVAILABLE'
    );
  }

  async getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    period: number = 24
  ): Promise<PriceData[]> {
    try {
      const { coinGeckoMarketService } =
        await import('@/lib/services/marketData/coinGeckoMarketService');
      const days = Math.ceil(period / 24);
      const prices = await coinGeckoMarketService.getHistoricalPrices(symbol, days);

      if (prices && prices.length > 0) {
        return prices.map((point) => ({
          provider: this.name,
          chain: chain || Blockchain.ETHEREUM,
          symbol,
          price: point.price,
          timestamp: point.timestamp,
          decimals: 8,
          confidence: 0.95,
          source: 'binance-api',
        }));
      }

      return [];
    } catch (error) {
      console.error(`[TellorClient] Failed to fetch historical prices for ${symbol}:`, error);
      return [];
    }
  }

  getSupportedSymbols(): string[] {
    return [...tellorSymbols];
  }

  isSymbolSupported(symbol: string, chain?: Blockchain): boolean {
    const isSymbolInList = tellorSymbols.includes(
      symbol.toUpperCase() as (typeof tellorSymbols)[number]
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
