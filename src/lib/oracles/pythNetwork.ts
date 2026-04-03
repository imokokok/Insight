import { UNIFIED_BASE_PRICES } from '@/lib/config/basePrices';
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

  async getPrice(symbol: string, chain?: Blockchain): Promise<PriceData> {
    try {
      if (!symbol) {
        throw this.createError('Symbol is required', 'INVALID_SYMBOL');
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

      const basePrice = UNIFIED_BASE_PRICES[symbol.toUpperCase()] || 100;
      const priceData = await this.fetchPriceWithDatabase(symbol, chain, () => {
        const mockPrice = this.generateMockPrice(symbol, basePrice, chain);
        const confidenceInterval = this.generateConfidenceInterval(mockPrice.price, symbol);
        return {
          ...mockPrice,
          confidenceInterval,
          source: 'mock-fallback',
        };
      });

      if (!priceData.confidenceInterval) {
        const confidenceInterval = this.generateConfidenceInterval(priceData.price, symbol);
        return {
          ...priceData,
          confidenceInterval,
        };
      }

      return priceData;
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
        console.log(`[PythClient] Using Pyth real historical data for ${symbol}, got ${historicalPrices.length} points`);
        // 添加 chain 和 source 信息
        return historicalPrices.map(price => ({
          ...price,
          chain,
          source: 'pyth-hermes-api',
        })).sort((a, b) => a.timestamp - b.timestamp);
      }

      // 如果 Pyth 数据不足，尝试使用 Binance 作为备选
      console.log(`[PythClient] Pyth historical data insufficient for ${symbol}, trying Binance...`);
      const { coinGeckoMarketService } = await import('@/lib/services/marketData/coinGeckoMarketService');
      const days = Math.ceil(period / 24);
      const binancePrices = await coinGeckoMarketService.getHistoricalPrices(symbol, days);

      if (binancePrices && binancePrices.length > 0) {
        console.log(`[PythClient] Using Binance real historical data for ${symbol}, got ${binancePrices.length} points`);
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

      // 回退到模拟数据
      console.warn(`[PythClient] Falling back to mock historical data for ${symbol}`);
      const basePrice = UNIFIED_BASE_PRICES[symbol.toUpperCase()] || 100;
      return this.fetchHistoricalPricesWithDatabase(symbol, chain, period, () =>
        this.generateMockHistoricalPrices(symbol, basePrice, chain, period).map(p => ({
          ...p,
          source: 'mock-fallback',
        }))
      );
    } catch (error) {
      console.error(`[PythClient] Failed to fetch historical prices for ${symbol}:`, error);
      
      // 出错时回退到模拟数据
      const basePrice = UNIFIED_BASE_PRICES[symbol.toUpperCase()] || 100;
      return this.fetchHistoricalPricesWithDatabase(symbol, chain, period, () =>
        this.generateMockHistoricalPrices(symbol, basePrice, chain, period).map(p => ({
          ...p,
          source: 'mock-fallback',
        }))
      );
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
