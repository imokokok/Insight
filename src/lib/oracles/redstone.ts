import { BaseOracleClient, OracleClientConfig } from './base';
import { UNIFIED_BASE_PRICES } from '@/lib/config/basePrices';
import { PriceData, OracleProvider, Blockchain, ConfidenceInterval } from '@/types/oracle';

const SPREAD_PERCENTAGES: Record<string, number> = {
  BTC: 0.02,
  ETH: 0.03,
  SOL: 0.05,
  REDSTONE: 0.08,
  USDC: 0.01,
};

export interface RedStoneProviderInfo {
  id: string;
  name: string;
  reputation: number;
  dataPoints: number;
  lastUpdate: number;
}

export interface RedStoneMetrics {
  modularFee: number;
  dataFreshnessScore: number;
  providerCount: number;
  avgProviderReputation: number;
}

export class RedStoneClient extends BaseOracleClient {
  name = OracleProvider.REDSTONE;
  supportedChains = [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.OPTIMISM,
    Blockchain.POLYGON,
    Blockchain.AVALANCHE,
    Blockchain.BASE,
    Blockchain.BNB_CHAIN,
    Blockchain.FANTOM,
    Blockchain.LINEA,
    Blockchain.MANTLE,
    Blockchain.SCROLL,
    Blockchain.ZKSYNC,
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
        error instanceof Error ? error.message : 'Failed to fetch price from RedStone',
        'REDSTONE_ERROR'
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
        error instanceof Error ? error.message : 'Failed to fetch historical prices from RedStone',
        'REDSTONE_HISTORICAL_ERROR'
      );
    }
  }

  async getRedStoneMetrics(): Promise<RedStoneMetrics> {
    return {
      modularFee: 0.0001 + Math.random() * 0.0002,
      dataFreshnessScore: 95 + Math.random() * 4,
      providerCount: 15 + Math.floor(Math.random() * 10),
      avgProviderReputation: 0.85 + Math.random() * 0.1,
    };
  }

  async getDataProviders(): Promise<RedStoneProviderInfo[]> {
    const providers: RedStoneProviderInfo[] = [
      {
        id: 'provider-1',
        name: 'RedStone Core',
        reputation: 0.98,
        dataPoints: 1500000,
        lastUpdate: Date.now(),
      },
      {
        id: 'provider-2',
        name: 'Data Provider A',
        reputation: 0.95,
        dataPoints: 890000,
        lastUpdate: Date.now() - 5000,
      },
      {
        id: 'provider-3',
        name: 'Data Provider B',
        reputation: 0.92,
        dataPoints: 650000,
        lastUpdate: Date.now() - 12000,
      },
      {
        id: 'provider-4',
        name: 'Data Provider C',
        reputation: 0.89,
        dataPoints: 420000,
        lastUpdate: Date.now() - 18000,
      },
    ];
    return providers;
  }
}
