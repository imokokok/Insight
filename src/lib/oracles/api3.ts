import { BaseOracleClient } from './base';
import type { OracleClientConfig } from './base';
import { UNIFIED_BASE_PRICES } from '@/lib/config/basePrices';
import { OracleProvider, Blockchain } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';
import type { GasFeeData } from '@/components/oracle/data-display/GasFeeComparison';
import type { QualityDataPoint } from '@/components/oracle/charts/DataQualityTrend';
import type { OHLCVDataPoint } from '@/lib/indicators';

export interface DAPIPriceDeviation {
  symbol: string;
  dapiPrice: number;
  marketPrice: number;
  deviation: number;
  trend: 'expanding' | 'shrinking' | 'stable';
  status: 'normal' | 'warning' | 'critical';
}

export interface DataSourceInfo {
  id: string;
  name: string;
  type: 'exchange' | 'traditional_finance' | 'other';
  credibilityScore: number;
  accuracy: number;
  responseSpeed: number;
  availability: number;
  airnodeAddress: string;
  dapiContract: string;
  chain: string;
}

export interface CoveragePoolEvent {
  id: string;
  type: 'claim' | 'parameter_change' | 'reward_distribution';
  timestamp: Date;
  amount?: number;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  txHash: string;
  description: string;
}

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

export interface DAPICoverage {
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
  dapiCoverage: DAPICoverage;
  advantages: {
    noMiddlemen: boolean;
    sourceTransparency: boolean;
    responseTime: number;
  };
}

export class API3Client extends BaseOracleClient {
  name = OracleProvider.API3;
  supportedChains = [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.POLYGON,
    Blockchain.AVALANCHE,
    Blockchain.BNB_CHAIN,
    Blockchain.BASE,
  ];

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
      if (!symbol) {
        throw this.createError('Symbol is required', 'INVALID_SYMBOL');
      }
      const basePrice = UNIFIED_BASE_PRICES[symbol.toUpperCase()] || 100;

      return this.fetchHistoricalPricesWithDatabase(symbol, chain, period, () =>
        this.generateMockHistoricalPrices(symbol, basePrice, chain, period)
      );
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch historical prices from API3',
        'API3_HISTORICAL_ERROR'
      );
    }
  }

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

  async getDapiCoverage(): Promise<DAPICoverage> {
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

  async getLatencyDistribution(): Promise<number[]> {
    const samples: number[] = [];
    const baseLatency = 180;
    for (let i = 0; i < 100; i++) {
      const variance = (Math.random() - 0.5) * 200;
      const spike = Math.random() > 0.95 ? Math.random() * 150 : 0;
      samples.push(Math.max(50, Math.round(baseLatency + variance + spike)));
    }
    return samples;
  }

  async getDataQualityMetrics(): Promise<{
    freshness: { lastUpdated: Date; updateInterval: number };
    completeness: { successCount: number; totalCount: number };
    reliability: { historicalAccuracy: number; responseSuccessRate: number; uptime: number };
  }> {
    return {
      freshness: {
        lastUpdated: new Date(),
        updateInterval: 60,
      },
      completeness: {
        successCount: 168,
        totalCount: 168,
      },
      reliability: {
        historicalAccuracy: 99.7,
        responseSuccessRate: 99.9,
        uptime: 99.7,
      },
    };
  }

  async getDapiPriceDeviations(): Promise<DAPIPriceDeviation[]> {
    return [
      {
        symbol: 'BTC/USD',
        dapiPrice: 68050.25,
        marketPrice: 68120.5,
        deviation: 0.1,
        trend: 'shrinking',
        status: 'normal',
      },
      {
        symbol: 'ETH/USD',
        dapiPrice: 3505.8,
        marketPrice: 3498.2,
        deviation: 0.22,
        trend: 'stable',
        status: 'normal',
      },
      {
        symbol: 'SOL/USD',
        dapiPrice: 180.45,
        marketPrice: 182.3,
        deviation: 1.02,
        trend: 'expanding',
        status: 'warning',
      },
      {
        symbol: 'API3/USD',
        dapiPrice: 2.82,
        marketPrice: 2.78,
        deviation: 1.44,
        trend: 'shrinking',
        status: 'normal',
      },
      {
        symbol: 'AVAX/USD',
        dapiPrice: 42.15,
        marketPrice: 42.8,
        deviation: 1.52,
        trend: 'expanding',
        status: 'warning',
      },
      {
        symbol: 'MATIC/USD',
        dapiPrice: 0.582,
        marketPrice: 0.5795,
        deviation: 0.43,
        trend: 'stable',
        status: 'normal',
      },
      {
        symbol: 'LINK/USD',
        dapiPrice: 18.45,
        marketPrice: 18.72,
        deviation: 1.44,
        trend: 'expanding',
        status: 'warning',
      },
      {
        symbol: 'DOT/USD',
        dapiPrice: 8.25,
        marketPrice: 8.18,
        deviation: 0.86,
        trend: 'shrinking',
        status: 'normal',
      },
      {
        symbol: 'ATOM/USD',
        dapiPrice: 11.82,
        marketPrice: 11.95,
        deviation: 1.09,
        trend: 'stable',
        status: 'normal',
      },
      {
        symbol: 'UNI/USD',
        dapiPrice: 9.45,
        marketPrice: 9.12,
        deviation: 3.62,
        trend: 'expanding',
        status: 'critical',
      },
    ];
  }

  async getDataSourceTraceability(): Promise<DataSourceInfo[]> {
    return [
      {
        id: 'src-001',
        name: 'Binance Oracle',
        type: 'exchange',
        credibilityScore: 95,
        accuracy: 99.8,
        responseSpeed: 120,
        availability: 99.9,
        airnodeAddress: '0x1a2B3c4D5e6F7g8H9i0J1k2L3m4N5o6P7q8R9s0T',
        dapiContract: '0xa1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8s9T0',
        chain: 'Ethereum',
      },
      {
        id: 'src-002',
        name: 'Coinbase Prime',
        type: 'exchange',
        credibilityScore: 98,
        accuracy: 99.9,
        responseSpeed: 95,
        availability: 99.95,
        airnodeAddress: '0x2b3C4d5E6f7G8h9I0j1K2l3M4n5O6p7Q8r9S0t1U',
        dapiContract: '0xb2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0U1',
        chain: 'Arbitrum',
      },
      {
        id: 'src-003',
        name: 'Bloomberg Terminal',
        type: 'traditional_finance',
        credibilityScore: 99,
        accuracy: 99.95,
        responseSpeed: 50,
        availability: 99.99,
        airnodeAddress: '0x3c4D5e6F7g8H9i0J1k2L3m4N5o6P7q8R9s0T1u2V',
        dapiContract: '0xc3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8s9T0u1V2',
        chain: 'Ethereum',
      },
      {
        id: 'src-004',
        name: 'Reuters FX',
        type: 'traditional_finance',
        credibilityScore: 98,
        accuracy: 99.92,
        responseSpeed: 65,
        availability: 99.98,
        airnodeAddress: '0x4d5E6f7G8h9I0j1K2l3M4n5O6p7Q8r9S0t1U2v3W',
        dapiContract: '0xd4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0U1v2W3',
        chain: 'Polygon',
      },
      {
        id: 'src-005',
        name: 'Kraken Exchange',
        type: 'exchange',
        credibilityScore: 94,
        accuracy: 99.7,
        responseSpeed: 140,
        availability: 99.85,
        airnodeAddress: '0x5e6F7g8H9i0J1k2L3m4N5o6P7q8R9s0T1u2V3w4X',
        dapiContract: '0xe5F6g7H8i9J0k1L2m3N4o5P6q7R8s9T0u1V2w3X4',
        chain: 'Ethereum',
      },
      {
        id: 'src-006',
        name: 'Goldman Sachs API',
        type: 'traditional_finance',
        credibilityScore: 97,
        accuracy: 99.88,
        responseSpeed: 80,
        availability: 99.92,
        airnodeAddress: '0x6f7G8h9I0j1K2l3M4n5O6p7Q8r9S0t1U2v3W4x5Y',
        dapiContract: '0xf6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0U1v2W3x4Y5',
        chain: 'Arbitrum',
      },
    ];
  }

  async getCoveragePoolEvents(): Promise<CoveragePoolEvent[]> {
    const events: CoveragePoolEvent[] = [];
    const baseTime = Date.now();

    events.push({
      id: 'evt-001',
      type: 'reward_distribution',
      timestamp: new Date(baseTime - 3600000),
      amount: 12500,
      status: 'completed',
      txHash: '0xabc123def456789012345678901234567890abcdef1234567890abcdef123456',
      description: 'Weekly staking rewards distributed to coverage pool stakers',
    });

    events.push({
      id: 'evt-002',
      type: 'claim',
      timestamp: new Date(baseTime - 86400000),
      amount: 50000,
      status: 'approved',
      txHash: '0xdef456abc789012345678901234567890abcdef1234567890abcdef123456789',
      description: 'Price deviation claim for BTC/USD feed on Arbitrum',
    });

    events.push({
      id: 'evt-003',
      type: 'parameter_change',
      timestamp: new Date(baseTime - 172800000),
      status: 'completed',
      txHash: '0x123abc456def78901234567890123456789abcdef1234567890abcdef123456',
      description: 'Coverage ratio threshold updated from 0.30 to 0.34',
    });

    events.push({
      id: 'evt-004',
      type: 'reward_distribution',
      timestamp: new Date(baseTime - 259200000),
      amount: 11800,
      status: 'completed',
      txHash: '0x456def789abc012345678901234567890abcdef1234567890abcdef123456789',
      description: 'Weekly staking rewards distributed to coverage pool stakers',
    });

    events.push({
      id: 'evt-005',
      type: 'claim',
      timestamp: new Date(baseTime - 345600000),
      amount: 25000,
      status: 'rejected',
      txHash: '0x789abc012def345678901234567890abcdef1234567890abcdef123456789012',
      description: 'Invalid claim for ETH/USD feed - deviation within acceptable range',
    });

    events.push({
      id: 'evt-006',
      type: 'parameter_change',
      timestamp: new Date(baseTime - 432000000),
      status: 'completed',
      txHash: '0xabc012345def678901234567890abcdef1234567890abcdef123456789012345',
      description: 'Staking APR adjusted from 11.8% to 12.5%',
    });

    events.push({
      id: 'evt-007',
      type: 'claim',
      timestamp: new Date(baseTime - 518400000),
      amount: 75000,
      status: 'completed',
      txHash: '0xdef789012abc345678901234567890abcdef1234567890abcdef123456789012',
      description: 'Major claim for SOL/USD feed manipulation incident',
    });

    events.push({
      id: 'evt-008',
      type: 'reward_distribution',
      timestamp: new Date(baseTime - 604800000),
      amount: 11200,
      status: 'completed',
      txHash: '0x012345def789abc678901234567890abcdef1234567890abcdef123456789012',
      description: 'Weekly staking rewards distributed to coverage pool stakers',
    });

    events.push({
      id: 'evt-009',
      type: 'parameter_change',
      timestamp: new Date(baseTime - 691200000),
      status: 'completed',
      txHash: '0x345678def012abc901234567890abcdef1234567890abcdef123456789012345',
      description: 'Claim review period extended from 24h to 48h',
    });

    events.push({
      id: 'evt-010',
      type: 'claim',
      timestamp: new Date(baseTime - 777600000),
      amount: 15000,
      status: 'pending',
      txHash: '0x678901def234abc5678901234567890abcdef1234567890abcdef123456789012',
      description: 'Pending claim for LINK/USD feed latency issue',
    });

    events.push({
      id: 'evt-011',
      type: 'reward_distribution',
      timestamp: new Date(baseTime - 864000000),
      amount: 10500,
      status: 'completed',
      txHash: '0x901234def567abc8901234567890abcdef1234567890abcdef123456789012345',
      description: 'Weekly staking rewards distributed to coverage pool stakers',
    });

    events.push({
      id: 'evt-012',
      type: 'parameter_change',
      timestamp: new Date(baseTime - 950400000),
      status: 'completed',
      txHash: '0x234567def890abc1234567890abcdef1234567890abcdef123456789012345678',
      description: 'Minimum stake amount reduced from 1000 to 500 API3',
    });

    events.push({
      id: 'evt-013',
      type: 'claim',
      timestamp: new Date(baseTime - 1036800000),
      amount: 35000,
      status: 'approved',
      txHash: '0x567890def123abc45678901234567890abcdef1234567890abcdef123456789012',
      description: 'Approved claim for MATIC/USD feed during network congestion',
    });

    events.push({
      id: 'evt-014',
      type: 'reward_distribution',
      timestamp: new Date(baseTime - 1123200000),
      amount: 9800,
      status: 'completed',
      txHash: '0x890123def456abc78901234567890abcdef1234567890abcdef123456789012345',
      description: 'Weekly staking rewards distributed to coverage pool stakers',
    });

    events.push({
      id: 'evt-015',
      type: 'parameter_change',
      timestamp: new Date(baseTime - 1209600000),
      status: 'completed',
      txHash: '0x123456def789abc01234567890abcdef1234567890abcdef123456789012345678',
      description: 'Coverage pool collateralization target increased to 150%',
    });

    return events;
  }

  async getGasFeeData(): Promise<GasFeeData[]> {
    return [
      {
        chain: 'Ethereum',
        chainId: 1,
        updateFee: 0.85,
        verificationFee: 0.12,
        currency: 'USD',
      },
      {
        chain: 'Arbitrum',
        chainId: 42161,
        updateFee: 0.12,
        verificationFee: 0.02,
        currency: 'USD',
      },
      {
        chain: 'Polygon',
        chainId: 137,
        updateFee: 0.05,
        verificationFee: 0.01,
        currency: 'USD',
      },
      {
        chain: 'Optimism',
        chainId: 10,
        updateFee: 0.08,
        verificationFee: 0.015,
        currency: 'USD',
      },
      {
        chain: 'Base',
        chainId: 8453,
        updateFee: 0.06,
        verificationFee: 0.012,
        currency: 'USD',
      },
      {
        chain: 'Avalanche',
        chainId: 43114,
        updateFee: 0.04,
        verificationFee: 0.008,
        currency: 'USD',
      },
    ];
  }

  async getOHLCPrices(
    symbol: string,
    chain?: Blockchain,
    period: number = 30
  ): Promise<OHLCVDataPoint[]> {
    if (!symbol) {
      throw this.createError('Symbol is required', 'INVALID_SYMBOL');
    }
    const basePrice = UNIFIED_BASE_PRICES[symbol.toUpperCase()] || 100;
    const prices: OHLCVDataPoint[] = [];
    const now = Date.now();
    const interval = 24 * 60 * 60 * 1000; // 1 day

    for (let i = period; i >= 0; i--) {
      const timestamp = now - i * interval;
      const randomChange = (Math.random() - 0.5) * 0.05;
      const price = basePrice * (1 + randomChange);
      const volatility = basePrice * 0.02;

      // 确保 high >= low
      const highOffset = volatility * Math.random();
      const lowOffset = volatility * Math.random();
      const high = price + Math.max(highOffset, lowOffset);
      const low = price - Math.max(highOffset, lowOffset);

      prices.push({
        timestamp,
        price,
        high,
        low,
        close: price,
      });
    }

    return prices;
  }

  async getQualityHistory(): Promise<QualityDataPoint[]> {
    const history: QualityDataPoint[] = [];
    const now = Date.now();
    const interval = 60 * 60 * 1000; // 1 hour

    for (let i = 24; i >= 0; i--) {
      const timestamp = now - i * interval;
      const baseLatency = 180;
      const latencyVariance = (Math.random() - 0.5) * 100;

      history.push({
        timestamp,
        updateLatency: Math.max(50, Math.round(baseLatency + latencyVariance)),
        deviationFromMedian: (Math.random() - 0.5) * 0.5,
        isOutlier: Math.random() > 0.95,
        isStale: Math.random() > 0.98,
        heartbeatCompliance: 0.95 + Math.random() * 0.05,
      });
    }

    return history;
  }

  async getCrossOracleComparison(): Promise<
    {
      oracle: OracleProvider;
      responseTime: number;
      accuracy: number;
      availability: number;
      costEfficiency: number;
      updateFrequency: number;
    }[]
  > {
    return [
      {
        oracle: OracleProvider.API3,
        responseTime: 180,
        accuracy: 99.7,
        availability: 99.7,
        costEfficiency: 85,
        updateFrequency: 60,
      },
      {
        oracle: OracleProvider.CHAINLINK,
        responseTime: 220,
        accuracy: 99.8,
        availability: 99.9,
        costEfficiency: 70,
        updateFrequency: 3600,
      },
      {
        oracle: OracleProvider.PYTH,
        responseTime: 150,
        accuracy: 99.6,
        availability: 99.5,
        costEfficiency: 90,
        updateFrequency: 60,
      },
      {
        oracle: OracleProvider.BAND_PROTOCOL,
        responseTime: 250,
        accuracy: 99.4,
        availability: 99.2,
        costEfficiency: 75,
        updateFrequency: 1800,
      },
      {
        oracle: OracleProvider.UMA,
        responseTime: 300,
        accuracy: 99.5,
        availability: 98.8,
        costEfficiency: 80,
        updateFrequency: 7200,
      },
    ];
  }
}
