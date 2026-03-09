import { BaseOracleClient } from './base';
import { PriceData, OracleProvider, Blockchain } from '@/lib/types/oracle';

const BASE_PRICES: Record<string, number> = {
  BTC: 68050,
  ETH: 3505,
  SOL: 180.5,
  API3: 2.8,
  USDC: 1,
};

// Airnode 网络统计
export interface AirnodeNetworkStats {
  activeAirnodes: number;
  nodeUptime: number;
  avgResponseTime: number;
  dapiUpdateFrequency: number;
  totalStaked: number;
  dataFeeds: number;
  hourlyActivity: number[];
  status: 'online' | 'warning' | 'offline';
  lastUpdated: Date;
  latency: number;
}

// dAPI 覆盖数据
export interface DapiCoverage {
  totalDapis: number;
  byAssetType: {
    crypto: number;
    forex: number;
    commodities: number;
    stocks: number;
  };
  byChain: {
    ethereum: number;
    arbitrum: number;
    polygon: number;
  };
  updateFrequency: {
    high: number;
    medium: number;
    low: number;
  };
}

// 质押和保险池数据
export interface StakingData {
  totalStaked: number;
  stakingApr: number;
  stakerCount: number;
  coveragePool: {
    totalValue: number;
    coverageRatio: number;
    historicalPayouts: number;
  };
}

// 第一方预言机数据
export interface FirstPartyOracleData {
  airnodeDeployments: {
    total: number;
    byRegion: {
      northAmerica: number;
      europe: number;
      asia: number;
      others: number;
    };
    byChain: {
      ethereum: number;
      arbitrum: number;
      polygon: number;
    };
    byProviderType: {
      exchanges: number;
      traditionalFinance: number;
      others: number;
    };
  };
  dapiCoverage: DapiCoverage;
  advantages: {
    noMiddlemen: boolean;
    sourceTransparency: boolean;
    responseTime: number;
  };
}

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

  // 获取 Airnode 网络统计
  async getAirnodeNetworkStats(): Promise<AirnodeNetworkStats> {
    return {
      activeAirnodes: 156,
      nodeUptime: 99.7,
      avgResponseTime: 180,
      dapiUpdateFrequency: 60,
      totalStaked: 25000000,
      dataFeeds: 168,
      hourlyActivity: [
        1200, 1100, 950, 800, 750, 900, 1400, 2100, 2800, 3200, 3500, 3800, 3600, 3400, 3100, 3300,
        3500, 3700, 3400, 2900, 2400, 1900, 1500, 1300,
      ],
      status: 'online',
      lastUpdated: new Date(),
      latency: 85,
    };
  }

  // 获取 dAPI 覆盖数据
  async getDapiCoverage(): Promise<DapiCoverage> {
    return {
      totalDapis: 168,
      byAssetType: {
        crypto: 120,
        forex: 28,
        commodities: 12,
        stocks: 8,
      },
      byChain: {
        ethereum: 89,
        arbitrum: 45,
        polygon: 34,
      },
      updateFrequency: {
        high: 45,
        medium: 78,
        low: 45,
      },
    };
  }

  // 获取质押和保险池数据
  async getStakingData(): Promise<StakingData> {
    return {
      totalStaked: 25000000,
      stakingApr: 12.5,
      stakerCount: 3240,
      coveragePool: {
        totalValue: 8500000,
        coverageRatio: 0.34,
        historicalPayouts: 125000,
      },
    };
  }

  // 获取第一方预言机数据
  async getFirstPartyOracleData(): Promise<FirstPartyOracleData> {
    return {
      airnodeDeployments: {
        total: 156,
        byRegion: {
          northAmerica: 58,
          europe: 47,
          asia: 38,
          others: 13,
        },
        byChain: {
          ethereum: 89,
          arbitrum: 45,
          polygon: 22,
        },
        byProviderType: {
          exchanges: 68,
          traditionalFinance: 52,
          others: 36,
        },
      },
      dapiCoverage: await this.getDapiCoverage(),
      advantages: {
        noMiddlemen: true,
        sourceTransparency: true,
        responseTime: 180,
      },
    };
  }
}
