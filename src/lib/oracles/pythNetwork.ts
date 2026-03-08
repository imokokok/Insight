import { BaseOracleClient } from './base';
import { PriceData, OracleProvider, Blockchain } from '@/lib/types/oracle';

const BASE_PRICES: Record<string, number> = {
  BTC: 67950,
  ETH: 3495,
  SOL: 179.5,
  PYTH: 1.2,
  USDC: 1,
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

  async getPrice(symbol: string, chain?: Blockchain): Promise<PriceData> {
    try {
      const basePrice = BASE_PRICES[symbol.toUpperCase()] || 100;
      return this.generateMockPrice(symbol, basePrice, chain);
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
