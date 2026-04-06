import { FEATURE_FLAGS } from '@/lib/config/serverEnv';
import { BaseOracleClient } from '@/lib/oracles/base';
import type { OracleClientConfig } from '@/lib/oracles/base';
import { winklinkSymbols } from '@/lib/oracles/supportedSymbols';
import { getWINkLinkRealDataService } from '@/lib/oracles/winklinkRealDataService';
import { binanceMarketService } from '@/lib/services/marketData/binanceMarketService';
import { OracleProvider, Blockchain } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';

// 是否使用真实数据
const USE_REAL_DATA = FEATURE_FLAGS.useRealWinklinkData;

export class WINkLinkClient extends BaseOracleClient {
  name = OracleProvider.WINKLINK;
  supportedChains = [Blockchain.TRON, Blockchain.BNB_CHAIN];

  defaultUpdateIntervalMinutes = 60;

  constructor(config?: OracleClientConfig) {
    super(config);
  }

  private getBaseSymbol(symbol: string): string {
    // 提取基础 symbol，例如 "WIN/USD" -> "WIN"
    return symbol.toUpperCase().split('/')[0];
  }

  /**
   * 获取代币价格
   * 当查询 WIN 代币价格时，直接使用 Binance API，不尝试调用 WINkLink 合约
   * 其他代币按照现有逻辑执行
   */
  async getPrice(symbol: string, chain?: Blockchain): Promise<PriceData> {
    try {
      const upperSymbol = symbol.toUpperCase();

      // 当查询自己预言机的代币 (WIN) 时，直接使用 Binance API
      if (upperSymbol === 'WIN') {
        const marketData = await binanceMarketService.getTokenMarketData(symbol);
        if (marketData) {
          return {
            provider: OracleProvider.WINKLINK,
            symbol: upperSymbol,
            price: marketData.currentPrice,
            timestamp: new Date(marketData.lastUpdated).getTime(),
            decimals: 8,
            confidence: 0.95,
            change24h: marketData.priceChange24h,
            change24hPercent: marketData.priceChangePercentage24h,
            chain: chain || Blockchain.TRON,
            source: 'binance-api',
          };
        }
      }

      // 如果启用真实数据，尝试从 WINkLink 合约获取
      if (USE_REAL_DATA) {
        const realDataService = getWINkLinkRealDataService();
        const realPrice = await realDataService.getPriceFromContract(symbol);

        if (realPrice) {
          return realPrice;
        }
      }

      return this.fetchPriceWithDatabase(symbol, chain);
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch price from WINkLink',
        'WINKLINK_ERROR'
      );
    }
  }

  async getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    period: number = 24
  ): Promise<PriceData[]> {
    try {
      return this.fetchHistoricalPricesWithDatabase(symbol, chain, period);
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch historical prices from WINkLink',
        'WINKLINK_HISTORICAL_ERROR'
      );
    }
  }

  getSupportedSymbols(): string[] {
    return [...winklinkSymbols];
  }

  isSymbolSupported(symbol: string, chain?: Blockchain): boolean {
    const isSymbolInList = winklinkSymbols.includes(
      symbol.toUpperCase() as (typeof winklinkSymbols)[number]
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
