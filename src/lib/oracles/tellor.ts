import { BaseOracleClient, OracleClientConfig } from './base';
import { UNIFIED_BASE_PRICES } from '@/lib/config/basePrices';
import { PriceData, OracleProvider, Blockchain } from '@/types/oracle';

export interface PriceStreamPoint {
  timestamp: number;
  price: number;
  volume: number;
  change: number;
  changePercent: number;
  source: string;
}

export interface MarketDepthLevel {
  price: number;
  bidVolume: number;
  askVolume: number;
  bidCount: number;
  askCount: number;
}

export interface MarketDepth {
  symbol: string;
  timestamp: number;
  levels: MarketDepthLevel[];
  totalBidVolume: number;
  totalAskVolume: number;
  spread: number;
  spreadPercent: number;
}

export interface MultiChainPrice {
  chain: Blockchain;
  price: number;
  timestamp: number;
  confidence: number;
  latency: number;
}

export interface MultiChainAggregation {
  symbol: string;
  aggregatedPrice: number;
  consensusMethod: string;
  chainPrices: MultiChainPrice[];
  priceDeviation: number;
  maxDeviation: number;
  lastUpdated: number;
}

export interface TellorNetworkStats {
  activeNodes: number;
  nodeUptime: number;
  avgResponseTime: number;
  updateFrequency: number;
  totalStaked: number;
  dataFeeds: number;
  hourlyActivity: number[];
  status: 'online' | 'warning' | 'offline';
  latency: number;
  stakingTokenSymbol: string;
}

export interface Reporter {
  id: string;
  address: string;
  stakedAmount: number;
  totalReports: number;
  successfulReports: number;
  successRate: number;
  lastReportTime: number;
  rewardsEarned: number;
  status: 'active' | 'inactive' | 'slashed';
}

export interface ReporterStats {
  totalReporters: number;
  activeReporters: number;
  totalStaked: number;
  avgStakePerReporter: number;
  totalReports24h: number;
  avgRewardsPerReporter: number;
  reporters: Reporter[];
  stakeDistribution: {
    range: string;
    count: number;
    percentage: number;
  }[];
  activityTrend: {
    timestamp: number;
    newReports: number;
    activeReporters: number;
  }[];
}

export interface RiskMetrics {
  dataQualityScore: number;
  priceDeviation: {
    current: number;
    avg24h: number;
    max24h: number;
  };
  stakingRisk: {
    concentrationRisk: number;
    slashRisk: number;
    rewardStability: number;
  };
  networkRisk: {
    uptimeRisk: number;
    latencyRisk: number;
    updateFrequencyRisk: number;
  };
  overallRiskLevel: 'low' | 'medium' | 'high';
  riskTrend: {
    timestamp: number;
    score: number;
  }[];
  alerts: {
    type: 'info' | 'warning' | 'critical';
    message: string;
    timestamp: number;
  }[];
}

export class TellorClient extends BaseOracleClient {
  name = OracleProvider.TELLOR;
  supportedChains = [
    Blockchain.ETHEREUM,
    Blockchain.ARBITRUM,
    Blockchain.OPTIMISM,
    Blockchain.POLYGON,
    Blockchain.BASE,
    Blockchain.AVALANCHE,
  ];

  constructor(config?: OracleClientConfig) {
    super(config);
  }

  async getPrice(symbol: string, chain?: Blockchain): Promise<PriceData> {
    try {
      const basePrice = UNIFIED_BASE_PRICES[symbol.toUpperCase()] || 100;

      return this.fetchPriceWithDatabase(symbol, chain, () =>
        this.generateMockPrice(symbol, basePrice, chain)
      );
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch price from Tellor',
        'TELLOR_ERROR'
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
        error instanceof Error ? error.message : 'Failed to fetch historical prices from Tellor',
        'TELLOR_HISTORICAL_ERROR'
      );
    }
  }

  async getPriceStream(symbol: string, limit: number = 50): Promise<PriceStreamPoint[]> {
    const basePrice = UNIFIED_BASE_PRICES[symbol.toUpperCase()] || 100;
    const stream: PriceStreamPoint[] = [];
    const now = Date.now();
    const interval = 1000;

    let currentPrice = basePrice;

    for (let i = limit; i >= 0; i--) {
      const timestamp = now - i * interval;
      const randomChange = (Math.random() - 0.5) * 0.002;
      currentPrice = currentPrice * (1 + randomChange);
      const change = randomChange * currentPrice;
      const changePercent = randomChange * 100;

      stream.push({
        timestamp,
        price: Number(currentPrice.toFixed(4)),
        volume: Math.floor(Math.random() * 1000) + 100,
        change: Number(change.toFixed(4)),
        changePercent: Number(changePercent.toFixed(4)),
        source: ['Tellor Node A', 'Tellor Node B', 'Tellor Node C'][Math.floor(Math.random() * 3)],
      });
    }

    return stream;
  }

  async getMarketDepth(symbol: string): Promise<MarketDepth> {
    const basePrice = UNIFIED_BASE_PRICES[symbol.toUpperCase()] || 100;
    const levels: MarketDepthLevel[] = [];
    const levelCount = 10;

    let totalBidVolume = 0;
    let totalAskVolume = 0;

    for (let i = 0; i < levelCount; i++) {
      const priceOffset = (i + 1) * 0.001 * basePrice;
      const bidPrice = basePrice - priceOffset;
      const askPrice = basePrice + priceOffset;

      const bidVolume = Math.floor(Math.random() * 500) + 100;
      const askVolume = Math.floor(Math.random() * 500) + 100;

      totalBidVolume += bidVolume;
      totalAskVolume += askVolume;

      levels.push({
        price: Number(bidPrice.toFixed(4)),
        bidVolume,
        askVolume: 0,
        bidCount: Math.floor(Math.random() * 20) + 5,
        askCount: 0,
      });

      levels.push({
        price: Number(askPrice.toFixed(4)),
        bidVolume: 0,
        askVolume,
        bidCount: 0,
        askCount: Math.floor(Math.random() * 20) + 5,
      });
    }

    levels.sort((a, b) => b.price - a.price);

    const spread = levels[0].price - levels[levels.length - 1].price;
    const spreadPercent = (spread / basePrice) * 100;

    return {
      symbol,
      timestamp: Date.now(),
      levels,
      totalBidVolume,
      totalAskVolume,
      spread: Number(spread.toFixed(4)),
      spreadPercent: Number(spreadPercent.toFixed(4)),
    };
  }

  async getMultiChainAggregation(symbol: string): Promise<MultiChainAggregation> {
    const basePrice = UNIFIED_BASE_PRICES[symbol.toUpperCase()] || 100;
    const now = Date.now();

    const chainPrices: MultiChainPrice[] = [
      {
        chain: Blockchain.ETHEREUM,
        price: basePrice * (1 + (Math.random() - 0.5) * 0.001),
        timestamp: now,
        confidence: 0.98,
        latency: 120,
      },
      {
        chain: Blockchain.ARBITRUM,
        price: basePrice * (1 + (Math.random() - 0.5) * 0.0015),
        timestamp: now - 50,
        confidence: 0.97,
        latency: 80,
      },
      {
        chain: Blockchain.OPTIMISM,
        price: basePrice * (1 + (Math.random() - 0.5) * 0.0012),
        timestamp: now - 100,
        confidence: 0.96,
        latency: 90,
      },
      {
        chain: Blockchain.POLYGON,
        price: basePrice * (1 + (Math.random() - 0.5) * 0.0018),
        timestamp: now - 150,
        confidence: 0.95,
        latency: 110,
      },
      {
        chain: Blockchain.BASE,
        price: basePrice * (1 + (Math.random() - 0.5) * 0.0013),
        timestamp: now - 80,
        confidence: 0.96,
        latency: 85,
      },
      {
        chain: Blockchain.AVALANCHE,
        price: basePrice * (1 + (Math.random() - 0.5) * 0.002),
        timestamp: now - 200,
        confidence: 0.94,
        latency: 130,
      },
    ];

    const prices = chainPrices.map((cp) => cp.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

    const priceDeviation = ((maxPrice - minPrice) / avgPrice) * 100;
    const maxDeviation = Math.max(
      ...chainPrices.map((cp) => Math.abs((cp.price - avgPrice) / avgPrice) * 100)
    );

    return {
      symbol,
      aggregatedPrice: Number(avgPrice.toFixed(4)),
      consensusMethod: 'Weighted Average by Confidence',
      chainPrices,
      priceDeviation: Number(priceDeviation.toFixed(4)),
      maxDeviation: Number(maxDeviation.toFixed(4)),
      lastUpdated: now,
    };
  }

  async getNetworkStats(): Promise<TellorNetworkStats> {
    return {
      activeNodes: 72,
      nodeUptime: 99.9,
      avgResponseTime: 95,
      updateFrequency: 30,
      totalStaked: 20000000,
      dataFeeds: 350,
      hourlyActivity: [
        2400, 2200, 2000, 1800, 1600, 1800, 2200, 3200, 4400, 5600, 6800, 7600, 7200, 6800, 6400,
        6600, 7000, 7400, 6800, 5600, 4400, 3400, 2800, 2600,
      ],
      status: 'online',
      latency: 95,
      stakingTokenSymbol: 'TRB',
    };
  }

  async getLiquidityMetrics(): Promise<{
    totalLiquidity: number;
    avgSlippage: number;
    topPairs: { pair: string; liquidity: number; volume24h: number }[];
  }> {
    return {
      totalLiquidity: 850000000,
      avgSlippage: 0.12,
      topPairs: [
        { pair: 'ETH/USDC', liquidity: 250000000, volume24h: 150000000 },
        { pair: 'BTC/USDC', liquidity: 180000000, volume24h: 120000000 },
        { pair: 'ETH/USDT', liquidity: 120000000, volume24h: 80000000 },
        { pair: 'LINK/ETH', liquidity: 85000000, volume24h: 45000000 },
        { pair: 'UNI/ETH', liquidity: 65000000, volume24h: 35000000 },
      ],
    };
  }

  async getStakingData(): Promise<{
    totalStaked: number;
    stakingApr: number;
    stakerCount: number;
    rewardPool: number;
  }> {
    return {
      totalStaked: 20000000,
      stakingApr: 10.2,
      stakerCount: 3200,
      rewardPool: 750000,
    };
  }

  async getReporterStats(): Promise<ReporterStats> {
    const reporters: Reporter[] = Array.from({ length: 20 }, (_, i) => {
      const totalReports = Math.floor(Math.random() * 5000) + 100;
      const successRate = Number((0.95 + Math.random() * 0.04).toFixed(4));
      return {
        id: `reporter-${i + 1}`,
        address: `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
        stakedAmount: Math.floor(Math.random() * 100000) + 10000,
        totalReports,
        successfulReports: Math.floor(totalReports * successRate),
        successRate,
        lastReportTime: Date.now() - Math.floor(Math.random() * 86400000),
        rewardsEarned: Math.floor(Math.random() * 50000) + 1000,
        status: (Math.random() > 0.9 ? 'inactive' : 'active') as 'active' | 'inactive' | 'slashed',
      };
    });

    const totalStaked = reporters.reduce((sum, r) => sum + r.stakedAmount, 0);
    const activeReporters = reporters.filter(r => r.status === 'active').length;
    const totalReports24h = reporters.reduce((sum, r) => sum + Math.floor(r.totalReports * 0.1), 0);

    const stakeRanges = [
      { min: 0, max: 10000, label: '< 10K TRB' },
      { min: 10000, max: 50000, label: '10K - 50K TRB' },
      { min: 50000, max: 100000, label: '50K - 100K TRB' },
      { min: 100000, max: Infinity, label: '> 100K TRB' },
    ];

    const stakeDistribution = stakeRanges.map(range => {
      const count = reporters.filter(r => r.stakedAmount >= range.min && r.stakedAmount < range.max).length;
      return {
        range: range.label,
        count,
        percentage: Number(((count / reporters.length) * 100).toFixed(2)),
      };
    });

    const activityTrend = Array.from({ length: 24 }, (_, i) => ({
      timestamp: Date.now() - (23 - i) * 3600000,
      newReports: Math.floor(Math.random() * 100) + 50,
      activeReporters: Math.floor(activeReporters * (0.8 + Math.random() * 0.2)),
    }));

    return {
      totalReporters: reporters.length,
      activeReporters,
      totalStaked,
      avgStakePerReporter: Math.floor(totalStaked / reporters.length),
      totalReports24h,
      avgRewardsPerReporter: Math.floor(reporters.reduce((sum, r) => sum + r.rewardsEarned, 0) / reporters.length),
      reporters: reporters.sort((a, b) => b.stakedAmount - a.stakedAmount).slice(0, 10),
      stakeDistribution,
      activityTrend,
    };
  }

  async getRiskMetrics(): Promise<RiskMetrics> {
    const now = Date.now();
    const riskTrend = Array.from({ length: 24 }, (_, i) => ({
      timestamp: now - (23 - i) * 3600000,
      score: Number((75 + Math.random() * 20).toFixed(2)),
    }));

    const currentScore = riskTrend[riskTrend.length - 1].score;
    const avg24h = riskTrend.reduce((sum, r) => sum + r.score, 0) / riskTrend.length;

    return {
      dataQualityScore: Number((85 + Math.random() * 10).toFixed(2)),
      priceDeviation: {
        current: Number((0.1 + Math.random() * 0.3).toFixed(4)),
        avg24h: Number((0.15 + Math.random() * 0.2).toFixed(4)),
        max24h: Number((0.5 + Math.random() * 0.5).toFixed(4)),
      },
      stakingRisk: {
        concentrationRisk: Number((30 + Math.random() * 20).toFixed(2)),
        slashRisk: Number((5 + Math.random() * 5).toFixed(2)),
        rewardStability: Number((80 + Math.random() * 15).toFixed(2)),
      },
      networkRisk: {
        uptimeRisk: Number((2 + Math.random() * 3).toFixed(2)),
        latencyRisk: Number((10 + Math.random() * 10).toFixed(2)),
        updateFrequencyRisk: Number((5 + Math.random() * 5).toFixed(2)),
      },
      overallRiskLevel: currentScore > 85 ? 'low' : currentScore > 70 ? 'medium' : 'high',
      riskTrend,
      alerts: [
        {
          type: 'info',
          message: 'Network operating normally with 99.9% uptime',
          timestamp: now - 3600000,
        },
        {
          type: 'warning',
          message: 'Price deviation slightly elevated on Polygon chain',
          timestamp: now - 7200000,
        },
        {
          type: 'info',
          message: 'New reporter joined the network',
          timestamp: now - 10800000,
        },
      ],
    };
  }
}
