import { BaseOracleClient } from '@/lib/oracles/base';
import type { OracleClientConfig } from '@/lib/oracles/base';
import { diaSymbols } from '@/lib/oracles/constants/supportedSymbols';
import { getDIADataService } from '@/lib/oracles/services/diaDataService';
import { binanceMarketService } from '@/lib/services/marketData/binanceMarketService';
import { createLogger } from '@/lib/utils/logger';
import { OracleProvider, Blockchain } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';

const logger = createLogger('DIAClient');

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
  async getPrice(
    symbol: string,
    chain?: Blockchain,
    _options?: { signal?: AbortSignal }
  ): Promise<PriceData> {
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
        logger.error('Failed to fetch DIA token price from Binance API: no market data returned');
        throw this.createError(
          'Failed to fetch DIA token price from Binance API. Binance returned no market data.',
          'BINANCE_NO_DATA'
        );
      }

      logger.info(`Fetching price for ${upperSymbol}`, { chain: chain || 'default' });

      const diaService = getDIADataService();

      const livePrice = await diaService.getAssetPrice(symbol, chain);

      if (livePrice) {
        logger.info(`Successfully fetched price for ${upperSymbol}`, { price: livePrice.price });
        return livePrice;
      }

      logger.error(`No price data available for ${upperSymbol}`);
      throw this.createError(
        `No price data available for ${symbol} from DIA. Real data source returned no results.`,
        'NO_DATA_AVAILABLE'
      );
    } catch (error) {
      logger.error(
        `Error fetching price for ${symbol}: ${error instanceof Error ? error.message : String(error)}`
      );
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch price from DIA',
        'DIA_ERROR'
      );
    }
  }

  async getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    period: number = 24,
    _options?: { signal?: AbortSignal }
  ): Promise<PriceData[]> {
    try {
      // 统一使用 Binance API 获取历史价格数据（与其他预言机保持一致）
      const historicalPrices = await binanceMarketService.getHistoricalPricesByHours(
        symbol,
        period
      );

      if (!historicalPrices || historicalPrices.length === 0) {
        logger.warn(`No historical data available for ${symbol}`, { symbol });
        return [];
      }

      logger.info(`Using Binance historical data for ${symbol}`, {
        symbol,
        points: historicalPrices.length,
        period,
      });

      const targetChain = chain || Blockchain.ETHEREUM;
      const basePrice = historicalPrices[0].price;

      return historicalPrices.map((point, index) => {
        const change24hPercent = index === 0 ? 0 : ((point.price - basePrice) / basePrice) * 100;
        const change24h = index === 0 ? 0 : point.price - basePrice;

        return {
          provider: OracleProvider.DIA,
          chain: targetChain,
          symbol: symbol.toUpperCase(),
          price: point.price,
          timestamp: point.timestamp,
          decimals: 8,
          confidence: 0.95,
          change24h: Number(change24h.toFixed(4)),
          change24hPercent: Number(change24hPercent.toFixed(2)),
          source: 'binance-api',
        };
      });
    } catch (error) {
      logger.error(
        `Failed to fetch historical prices for ${symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return [];
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
