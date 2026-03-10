import { BaseOracleClient } from './base';
import { PriceData, OracleProvider, Blockchain, ConfidenceInterval } from '@/lib/types/oracle';

const BASE_PRICES: Record<string, number> = {
  BTC: 67950,
  ETH: 3495,
  SOL: 179.5,
  PYTH: 1.2,
  USDC: 1,
};

const SPREAD_PERCENTAGES: Record<string, number> = {
  BTC: 0.02,
  ETH: 0.03,
  SOL: 0.05,
  PYTH: 0.1,
  USDC: 0.01,
};

export class PythNetworkClient extends BaseOracleClient {
  name = OracleProvider.PYTH_NETWORK;
  supportedChains = [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.OPTIMISM,
    Blockchain.POLYGON,
    Blockchain.SOLANA,
  ];

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
      const basePrice = BASE_PRICES[symbol.toUpperCase()] || 100;
      const priceData = this.generateMockPrice(symbol, basePrice, chain);
      const confidenceInterval = this.generateConfidenceInterval(priceData.price, symbol);

      return {
        ...priceData,
        confidenceInterval,
      };
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch price from Pyth Network',
        'PYTH_NETWORK_ERROR'
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
        error instanceof Error
          ? error.message
          : 'Failed to fetch historical prices from Pyth Network',
        'PYTH_NETWORK_HISTORICAL_ERROR'
      );
    }
  }
}
