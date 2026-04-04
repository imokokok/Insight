import { binanceMarketService } from '@/lib/services/marketData/binanceMarketService';
import { OracleProvider, Blockchain } from '@/types/oracle';
import type { PriceData, ConfidenceInterval } from '@/types/oracle';

import { BaseOracleClient } from './base';
import { getPythDataService } from './pythDataService';
import { pythSymbols } from './supportedSymbols';

import type { OracleClientConfig } from './base';

const SPREAD_PERCENTAGES: Record<string, number> = {
  BTC: 0.02,
  ETH: 0.03,
  SOL: 0.05,
  PYTH: 0.1,
  USDC: 0.01,
};

export class PythClient extends BaseOracleClient {
  name = OracleProvider.PYTH;
  supportedChains = [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.OPTIMISM,
    Blockchain.POLYGON,
    Blockchain.SOLANA,
    Blockchain.AVALANCHE,
    Blockchain.BNB_CHAIN,
    Blockchain.APTOS,
    Blockchain.SUI,
  ];

  defaultUpdateIntervalMinutes = 1;
  private pythDataService = getPythDataService();

  constructor(config?: OracleClientConfig) {
    super(config);
  }

  private generateConfidenceInterval(price: number, symbol: string): ConfidenceInterval {
    if (!symbol) {
      return {
        bid: price * 0.995,
        ask: price * 1.005,
        widthPercentage: 0.5,
      };
    }
    const baseSpread = SPREAD_PERCENTAGES[symbol.toUpperCase()] || 0.05;
    // 使用固定因子代替随机数
    const fixedFactor = 1.0;
    const spreadPercentage = baseSpread * fixedFactor;

    const halfSpread = price * (spreadPercentage / 100 / 2);

    return {
      bid: Number((price - halfSpread).toFixed(4)),
      ask: Number((price + halfSpread).toFixed(4)),
      widthPercentage: Number(spreadPercentage.toFixed(4)),
    };
  }

  /**
   * 获取代币价格
   * 当查询 PYTH 代币价格时，直接使用 Binance API
   * 其他代币使用 Pyth 预言机 API
   */
  async getPrice(symbol: string, chain?: Blockchain): Promise<PriceData> {
    try {
      if (!symbol) {
        throw this.createError('Symbol is required', 'INVALID_SYMBOL');
      }

      const upperSymbol = symbol.toUpperCase();

      // 当查询自己预言机的代币 (PYTH) 时，直接使用 Binance API
      if (upperSymbol === 'PYTH') {
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
      }

      const realPrice = await this.pythDataService.getLatestPrice(symbol);
      if (realPrice) {
        if (!realPrice.confidenceInterval) {
          realPrice.confidenceInterval = this.generateConfidenceInterval(realPrice.price, symbol);
        }
        return {
          ...realPrice,
          chain,
          source: 'pyth-hermes-api',
        };
      }

      throw this.createError(
        `No price data available for ${symbol} from Pyth. Real data source returned no results.`,
        'NO_DATA_AVAILABLE'
      );
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch price from Pyth',
        'PYTH_ERROR'
      );
    }
  }

  async getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    period: number = 24
  ): Promise<PriceData[]> {
    try {
      if (!symbol) {
        throw this.createError('Symbol is required', 'INVALID_SYMBOL');
      }

      // 方案2: 使用新的批量历史数据获取方法
      const historicalPrices = await this.pythDataService.getHistoricalPrices(symbol, period, 60);

      if (historicalPrices.length >= 12) {
        console.log(
          `[PythClient] Using Pyth real historical data for ${symbol}, got ${historicalPrices.length} points`
        );
        // 添加 chain 和 source 信息
        return historicalPrices
          .map((price) => ({
            ...price,
            chain,
            source: 'pyth-hermes-api',
          }))
          .sort((a, b) => a.timestamp - b.timestamp);
      }

      // 如果 Pyth 数据不足，尝试使用 Binance 作为备选
      console.log(
        `[PythClient] Pyth historical data insufficient for ${symbol}, trying Binance...`
      );
      const { coinGeckoMarketService } =
        await import('@/lib/services/marketData/coinGeckoMarketService');
      const days = Math.ceil(period / 24);
      const binancePrices = await coinGeckoMarketService.getHistoricalPrices(symbol, days);

      if (binancePrices && binancePrices.length > 0) {
        console.log(
          `[PythClient] Using Binance real historical data for ${symbol}, got ${binancePrices.length} points`
        );
        return binancePrices.map((point) => ({
          provider: this.name,
          chain: chain || Blockchain.ETHEREUM,
          symbol,
          price: point.price,
          timestamp: point.timestamp,
          decimals: 8,
          confidence: 0.95,
          change24h: 0,
          change24hPercent: 0,
          source: 'binance-api',
        }));
      }

      // 回退到空数据
      console.warn(`[PythClient] No historical data available for ${symbol}`);
      return [];
    } catch (error) {
      console.error(`[PythClient] Failed to fetch historical prices for ${symbol}:`, error);

      // 出错时返回空数据
      return [];
    }
  }

  getSupportedSymbols(): string[] {
    return [...pythSymbols];
  }

  isSymbolSupported(symbol: string, chain?: Blockchain): boolean {
    const isSymbolInList = pythSymbols.includes(
      symbol.toUpperCase() as (typeof pythSymbols)[number]
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
