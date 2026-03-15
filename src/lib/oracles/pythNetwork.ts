import { BaseOracleClient, OracleClientConfig } from './base';
import { UNIFIED_BASE_PRICES } from '@/lib/config/basePrices';
import { PriceData, OracleProvider, Blockchain, ConfidenceInterval } from '@/types/oracle';

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
  ];

  constructor(config?: OracleClientConfig) {
    super(config);
  }

  private generateConfidenceInterval(price: number, symbol: string): ConfidenceInterval {
    const baseSpread = SPREAD_PERCENTAGES[symbol.toUpperCase()] || 0.05;
    const randomFactor = 0.8 + Math.random() * 0.4;
    const spreadPercentage = baseSpread * randomFactor;

    const halfSpread = price * (spreadPercentage / 100 / 2);

    return {
      bid: Number((price - halfSpread).toFixed(4)),
      ask: Number((price + halfSpread).toFixed(4)),
      widthPercentage: Number(spreadPercentage.toFixed(4)),
    };
  }

  async getPrice(symbol: string, chain?: Blockchain): Promise<PriceData> {
    try {
      const basePrice = UNIFIED_BASE_PRICES[symbol.toUpperCase()] || 100;

      const priceData = await this.fetchPriceWithDatabase(symbol, chain, () => {
        const mockPrice = this.generateMockPrice(symbol, basePrice, chain);
        const confidenceInterval = this.generateConfidenceInterval(mockPrice.price, symbol);
        return {
          ...mockPrice,
          confidenceInterval,
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
      const basePrice = UNIFIED_BASE_PRICES[symbol.toUpperCase()] || 100;

      return this.fetchHistoricalPricesWithDatabase(symbol, chain, period, () =>
        this.generateMockHistoricalPrices(symbol, basePrice, chain, period)
      );
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch historical prices from Pyth',
        'PYTH_HISTORICAL_ERROR'
      );
    }
  }
}
