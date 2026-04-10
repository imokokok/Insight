import { FEATURE_FLAGS } from '@/lib/config/serverEnv';
import { BaseOracleClient } from '@/lib/oracles/base';
import type { OracleClientConfig } from '@/lib/oracles/base';
import { winklinkSymbols } from '@/lib/oracles/supportedSymbols';
import { getWINkLinkRealDataService } from '@/lib/oracles/winklinkRealDataService';
import { binanceMarketService } from '@/lib/services/marketData/binanceMarketService';
import { createLogger } from '@/lib/utils/logger';
import { OracleProvider, Blockchain } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';

const logger = createLogger('WINkLinkClient');

// 是否使用真实数据
const USE_REAL_DATA = FEATURE_FLAGS.useRealWinklinkData;

export class WINkLinkClient extends BaseOracleClient {
  name = OracleProvider.WINKLINK;
  supportedChains = [Blockchain.TRON];

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

        // 如果启用了真实数据但获取失败，抛出明确错误
        throw this.createError(
          `Failed to fetch price from WINkLink contract for ${symbol}. ` +
            `Please check: 1) TRON RPC connection, 2) Contract address validity, 3) Symbol support.`,
          'NO_DATA_AVAILABLE',
          { retryable: true }
        );
      }

      return this.fetchPriceWithDatabase(symbol, chain);
    } catch (error) {
      // 如果是我们已经格式化的错误，直接抛出
      if (error && typeof error === 'object' && 'code' in error) {
        throw error;
      }
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
      // 使用 WINkLink 真实数据服务获取历史价格
      const realDataService = getWINkLinkRealDataService();
      const historicalPrices = await realDataService.getHistoricalPrices(symbol, period);

      if (!historicalPrices || historicalPrices.length === 0) {
        logger.info(`No historical price data available for ${symbol}`);
        return [];
      }

      logger.info(
        `Successfully fetched ${historicalPrices.length} historical prices for ${symbol} from WINkLink network`
      );

      const targetChain = chain || Blockchain.TRON;
      const basePrice = historicalPrices[0].price;

      return historicalPrices.map((point, index) => {
        const change24hPercent = index === 0 ? 0 : ((point.price - basePrice) / basePrice) * 100;
        const change24h = index === 0 ? 0 : point.price - basePrice;

        return {
          provider: OracleProvider.WINKLINK,
          chain: targetChain,
          symbol: symbol.toUpperCase(),
          price: point.price,
          timestamp: point.timestamp,
          decimals: 8,
          confidence: 0.95,
          change24h: Number(change24h.toFixed(4)),
          change24hPercent: Number(change24hPercent.toFixed(2)),
          source: 'winklink-contract',
        };
      });
    } catch (error) {
      logger.error(
        `Failed to fetch historical prices for ${symbol}: ${error instanceof Error ? error.message : String(error)}`
      );
      return [];
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
