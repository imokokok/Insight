import { BaseOracleClient } from './base';
import { PriceData, OracleProvider, Blockchain } from '@/lib/types/oracle';

const BASE_PRICES: Record<string, number> = {
  BTC: 68050,
  ETH: 3505,
  SOL: 180.5,
  API3: 2.8,
  USDC: 1,
};

export class API3Client extends BaseOracleClient {
  name = OracleProvider.API3;
  supportedChains = [Blockchain.ETHEREUM, Blockchain.ARBITRUM, Blockchain.POLYGON];

  async getPrice(symbol: string, chain?: Blockchain): Promise<PriceData> {
    try {
      const basePrice = BASE_PRICES[symbol.toUpperCase()] || 100;
      return this.generateMockPrice(symbol, basePrice, chain);
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch price from API3',
        'API3_ERROR'
      );
    }
  }

  async getHistoricalPrices(
    symbol: string,
    chain?: Blockchain,
    period: number = 24
  ): Promise<PriceData[]> {
    try {
      const basePrice = BASE_PRICES[symbol.toUpperCase()] || 100;
      return this.generateMockHistoricalPrices(symbol, basePrice, chain, period);
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch historical prices from API3',
        'API3_HISTORICAL_ERROR'
      );
    }
  }
}
