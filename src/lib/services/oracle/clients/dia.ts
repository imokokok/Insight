import { BaseOracleClient } from '@/lib/oracles/base';
import type { OracleClientConfig } from '@/lib/oracles/base';
import { getDIADataService } from '@/lib/oracles/diaDataService';
import { diaSymbols } from '@/lib/oracles/supportedSymbols';
import { binanceMarketService } from '@/lib/services/marketData/binanceMarketService';
import { OracleProvider, Blockchain } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';

export class DIAClient extends BaseOracleClient {
  name = OracleProvider.DIA;
  supportedChains = [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.POLYGON,
    Blockchain.AVALANCHE,
    Blockchain.BNB_CHAIN,
    Blockchain.BASE,
  ];

  defaultUpdateIntervalMinutes = 5;

  constructor(config?: OracleClientConfig) {
    super(config);
  }

  /**
   * 获取代币价格
   * 当查询 DIA 代币价格时，直接使用 Binance API
   * 其他代币使用 DIA 数据服务
   */
  async getPrice(symbol: string, chain?: Blockchain): Promise<PriceData> {
    try {
      const upperSymbol = symbol.toUpperCase();

      if (upperSymbol === 'DIA') {
        const marketData = await binanceMarketService.getTokenMarketData(symbol);
        if (marketData) {
          return {
            provider: OracleProvider.DIA,
            symbol: upperSymbol,
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
        console.error(
          '[DIA] Failed to fetch DIA token price from Binance API: no market data returned'
        );
        throw this.createError(
          'Failed to fetch DIA token price from Binance API. Binance returned no market data.',
          'BINANCE_NO_DATA'
        );
      }

      const diaService = getDIADataService();

      const livePrice = await diaService.getAssetPrice(symbol, chain);

      if (livePrice) {
        return livePrice;
      }

      throw this.createError(
        `No price data available for ${symbol} from DIA. Real data source returned no results.`,
        'NO_DATA_AVAILABLE'
      );
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch price from DIA',
        'DIA_ERROR'
      );
    }
  }

  async getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    period: number = 24
  ): Promise<PriceData[]> {
    try {
      const diaService = getDIADataService();

      const liveHistoricalPrices = await diaService.getHistoricalPrices(symbol, chain, period);

      if (liveHistoricalPrices && liveHistoricalPrices.length > 0) {
        return liveHistoricalPrices;
      }

      throw this.createError(
        `No historical price data available for ${symbol} from DIA. Real data source returned no results.`,
        'NO_DATA_AVAILABLE'
      );
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch historical prices from DIA',
        'DIA_HISTORICAL_ERROR'
      );
    }
  }

  getSupportedSymbols(): string[] {
    return [...diaSymbols];
  }

  isSymbolSupported(symbol: string, chain?: Blockchain): boolean {
    const isSymbolInList = diaSymbols.includes(symbol.toUpperCase() as (typeof diaSymbols)[number]);
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
