import { UNIFIED_BASE_PRICES } from '@/lib/config/basePrices';
import { OracleProvider, Blockchain } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';

import { BaseOracleClient } from './base';

import type { OracleClientConfig } from './base';

export interface ChainlinkNetworkStats {
  activeNodes: number;
  dataFeeds: number;
  nodeUptime: number;
  avgResponseTime: number;
  latency: number;
  totalValueSecured?: number;
  updateFrequency?: number;
}

export class ChainlinkClient extends BaseOracleClient {
  name = OracleProvider.CHAINLINK;
  supportedChains = [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.OPTIMISM,
    Blockchain.POLYGON,
    Blockchain.AVALANCHE,
    Blockchain.BNB_CHAIN,
    Blockchain.BASE,
    Blockchain.SOLANA,
  ];

  defaultUpdateIntervalMinutes = 60;

  constructor(config?: OracleClientConfig) {
    super(config);
  }

  async getPrice(symbol: string, chain?: Blockchain): Promise<PriceData> {
    try {
      if (!symbol) {
        throw this.createError('Symbol is required', 'INVALID_SYMBOL');
      }
      const basePrice = UNIFIED_BASE_PRICES[symbol.toUpperCase()] || 100;

      return this.fetchPriceWithDatabase(symbol, chain, () =>
        this.generateMockPrice(symbol, basePrice, chain)
      );
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch price from Chainlink',
        'CHAINLINK_ERROR'
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
      const basePrice = UNIFIED_BASE_PRICES[symbol.toUpperCase()] || 100;

      return this.fetchHistoricalPricesWithDatabase(symbol, chain, period, () =>
        this.generateMockHistoricalPrices(symbol, basePrice, chain, period)
      );
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch historical prices from Chainlink',
        'CHAINLINK_HISTORICAL_ERROR'
      );
    }
  }

  async getNetworkStats(): Promise<ChainlinkNetworkStats> {
    try {
      const activeNodes = 1800 + Math.floor(Math.random() * 100);
      const dataFeeds = 1200 + Math.floor(Math.random() * 80);

      return {
        activeNodes,
        dataFeeds,
        nodeUptime: 99.9,
        avgResponseTime: 200 + Math.floor(Math.random() * 100),
        latency: 100 + Math.floor(Math.random() * 50),
        totalValueSecured: 75_000_000_000 + Math.random() * 5_000_000_000,
        updateFrequency: 60,
      };
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch network stats',
        'NETWORK_STATS_ERROR'
      );
    }
  }
}
