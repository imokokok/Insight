import { UNIFIED_BASE_PRICES } from '@/lib/config/basePrices';
import { OracleProvider, Blockchain } from '@/types/oracle';
import type { PriceData } from '@/types/oracle';

import { BaseOracleClient } from './base';

import type { OracleClientConfig } from './base';

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

export interface EcosystemProtocol {
  id: string;
  name: string;
  category: 'lending' | 'dex' | 'derivatives' | 'yield' | 'insurance' | 'other';
  tvl: number;
  dataFeeds: string[];
  logo?: string;
  website?: string;
  integrationDate: number;
}

export interface EcosystemStats {
  totalProtocols: number;
  totalTvl: number;
  protocolsByCategory: {
    category: string;
    count: number;
    tvl: number;
  }[];
  topProtocols: EcosystemProtocol[];
  monthlyGrowth: {
    timestamp: number;
    protocolCount: number;
    totalTvl: number;
  }[];
  dataFeedUsage: {
    feedId: string;
    feedName: string;
    usageCount: number;
    protocols: string[];
  }[];
}

export interface Dispute {
  id: string;
  reporterId: string;
  reporterAddress: string;
  disputedValue: number;
  proposedValue: number;
  stakeAmount: number;
  status: 'open' | 'resolved' | 'rejected';
  outcome?: 'reporter_won' | 'disputer_won';
  createdAt: number;
  resolvedAt?: number;
  votesForReporter: number;
  votesForDisputer: number;
  reward?: number;
}

export interface DisputeStats {
  totalDisputes: number;
  openDisputes: number;
  resolvedDisputes: number;
  successRate: number;
  avgResolutionTime: number;
  totalRewardsDistributed: number;
  totalSlashed: number;
  recentDisputes: Dispute[];
  disputeTrend: {
    timestamp: number;
    opened: number;
    resolved: number;
  }[];
}

export interface StakingCalculation {
  stakeAmount: number;
  duration: number;
  isActiveReporter: boolean;
  disputeParticipation: number;
  estimatedApr: number;
  estimatedReward: number;
  disputeBonus: number;
  totalEstimatedReturn: number;
  roi: number;
}

export interface TellorNetworkHealth {
  overallHealth: number;
  reporterDistribution: {
    region: string;
    count: number;
    percentage: number;
  }[];
  updateFrequencyHeatmap: {
    hour: number;
    day: number;
    intensity: number;
  }[];
  chainActivity: {
    chain: Blockchain;
    updates24h: number;
    avgLatency: number;
    healthScore: number;
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
    const activeReporters = reporters.filter((r) => r.status === 'active').length;
    const totalReports24h = reporters.reduce((sum, r) => sum + Math.floor(r.totalReports * 0.1), 0);

    const stakeRanges = [
      { min: 0, max: 10000, label: '< 10K TRB' },
      { min: 10000, max: 50000, label: '10K - 50K TRB' },
      { min: 50000, max: 100000, label: '50K - 100K TRB' },
      { min: 100000, max: Infinity, label: '> 100K TRB' },
    ];

    const stakeDistribution = stakeRanges.map((range) => {
      const count = reporters.filter(
        (r) => r.stakedAmount >= range.min && r.stakedAmount < range.max
      ).length;
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
      avgRewardsPerReporter: Math.floor(
        reporters.reduce((sum, r) => sum + r.rewardsEarned, 0) / reporters.length
      ),
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
    const _avg24h = riskTrend.reduce((sum, r) => sum + r.score, 0) / riskTrend.length;

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

  async getEcosystemStats(): Promise<EcosystemStats> {
    const protocols: EcosystemProtocol[] = [
      {
        id: '1',
        name: 'Aave',
        category: 'lending',
        tvl: 8500000000,
        dataFeeds: ['ETH/USD', 'BTC/USD', 'LINK/USD'],
        integrationDate: Date.now() - 86400000 * 365,
      },
      {
        id: '2',
        name: 'Compound',
        category: 'lending',
        tvl: 4200000000,
        dataFeeds: ['ETH/USD', 'USDC/USD', 'DAI/USD'],
        integrationDate: Date.now() - 86400000 * 300,
      },
      {
        id: '3',
        name: 'Synthetix',
        category: 'derivatives',
        tvl: 2800000000,
        dataFeeds: ['ETH/USD', 'BTC/USD', 'SNX/USD'],
        integrationDate: Date.now() - 86400000 * 280,
      },
      {
        id: '4',
        name: 'Liquity',
        category: 'lending',
        tvl: 1200000000,
        dataFeeds: ['ETH/USD'],
        integrationDate: Date.now() - 86400000 * 250,
      },
      {
        id: '5',
        name: 'Alchemix',
        category: 'yield',
        tvl: 450000000,
        dataFeeds: ['ETH/USD', 'DAI/USD'],
        integrationDate: Date.now() - 86400000 * 200,
      },
      {
        id: '6',
        name: 'Ribbon Finance',
        category: 'derivatives',
        tvl: 380000000,
        dataFeeds: ['ETH/USD', 'BTC/USD'],
        integrationDate: Date.now() - 86400000 * 180,
      },
      {
        id: '7',
        name: 'Nexus Mutual',
        category: 'insurance',
        tvl: 320000000,
        dataFeeds: ['ETH/USD', 'NXM/USD'],
        integrationDate: Date.now() - 86400000 * 150,
      },
      {
        id: '8',
        name: 'Uniswap V3',
        category: 'dex',
        tvl: 2100000000,
        dataFeeds: ['ETH/USD', 'UNI/USD'],
        integrationDate: Date.now() - 86400000 * 400,
      },
    ];

    const categories = ['lending', 'dex', 'derivatives', 'yield', 'insurance', 'other'];
    const protocolsByCategory = categories
      .map((cat) => {
        const catProtocols = protocols.filter((p) => p.category === cat);
        return {
          category: cat,
          count: catProtocols.length,
          tvl: catProtocols.reduce((sum, p) => sum + p.tvl, 0),
        };
      })
      .filter((c) => c.count > 0);

    const monthlyGrowth = Array.from({ length: 12 }, (_, i) => ({
      timestamp: Date.now() - (11 - i) * 30 * 86400000,
      protocolCount: Math.floor(5 + i * 0.5),
      totalTvl: 10000000000 + i * 500000000 + Math.random() * 1000000000,
    }));

    const dataFeedUsage = [
      {
        feedId: '1',
        feedName: 'ETH/USD',
        usageCount: 45,
        protocols: ['Aave', 'Compound', 'Synthetix'],
      },
      {
        feedId: '2',
        feedName: 'BTC/USD',
        usageCount: 32,
        protocols: ['Aave', 'Synthetix', 'Ribbon'],
      },
      { feedId: '3', feedName: 'LINK/USD', usageCount: 28, protocols: ['Aave', 'Nexus Mutual'] },
      { feedId: '4', feedName: 'DAI/USD', usageCount: 25, protocols: ['Compound', 'Alchemix'] },
      { feedId: '5', feedName: 'USDC/USD', usageCount: 22, protocols: ['Compound', 'Uniswap'] },
    ];

    return {
      totalProtocols: protocols.length,
      totalTvl: protocols.reduce((sum, p) => sum + p.tvl, 0),
      protocolsByCategory,
      topProtocols: protocols.slice(0, 6),
      monthlyGrowth,
      dataFeedUsage,
    };
  }

  async getDisputeStats(): Promise<DisputeStats> {
    const disputes: Dispute[] = Array.from({ length: 15 }, (_, i) => {
      const status = Math.random() > 0.3 ? 'resolved' : 'open';
      const createdAt = Date.now() - Math.floor(Math.random() * 30 * 86400000);
      return {
        id: `dispute-${i + 1}`,
        reporterId: `reporter-${Math.floor(Math.random() * 20) + 1}`,
        reporterAddress: `0x${Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
        disputedValue: Number((2000 + Math.random() * 500).toFixed(2)),
        proposedValue: Number((2000 + Math.random() * 500).toFixed(2)),
        stakeAmount: Math.floor(Math.random() * 50000) + 10000,
        status: status as 'open' | 'resolved' | 'rejected',
        outcome:
          status === 'resolved'
            ? Math.random() > 0.4
              ? 'reporter_won'
              : 'disputer_won'
            : undefined,
        createdAt,
        resolvedAt:
          status === 'resolved' ? createdAt + Math.floor(Math.random() * 7 * 86400000) : undefined,
        votesForReporter: Math.floor(Math.random() * 50) + 10,
        votesForDisputer: Math.floor(Math.random() * 50) + 10,
        reward: status === 'resolved' ? Math.floor(Math.random() * 10000) + 1000 : undefined,
      };
    });

    const resolvedDisputes = disputes.filter((d) => d.status === 'resolved');
    const successRate =
      resolvedDisputes.length > 0
        ? resolvedDisputes.filter((d) => d.outcome === 'disputer_won').length /
          resolvedDisputes.length
        : 0;

    const avgResolutionTime =
      resolvedDisputes.length > 0
        ? resolvedDisputes.reduce((sum, d) => sum + ((d.resolvedAt || 0) - d.createdAt), 0) /
          resolvedDisputes.length /
          86400000
        : 0;

    const disputeTrend = Array.from({ length: 30 }, (_, i) => ({
      timestamp: Date.now() - (29 - i) * 86400000,
      opened: Math.floor(Math.random() * 3),
      resolved: Math.floor(Math.random() * 2),
    }));

    return {
      totalDisputes: disputes.length,
      openDisputes: disputes.filter((d) => d.status === 'open').length,
      resolvedDisputes: resolvedDisputes.length,
      successRate: Number((successRate * 100).toFixed(2)),
      avgResolutionTime: Number(avgResolutionTime.toFixed(1)),
      totalRewardsDistributed: resolvedDisputes.reduce((sum, d) => sum + (d.reward || 0), 0),
      totalSlashed: resolvedDisputes
        .filter((d) => d.outcome === 'disputer_won')
        .reduce((sum, d) => sum + d.stakeAmount * 0.1, 0),
      recentDisputes: disputes.slice(0, 10),
      disputeTrend,
    };
  }

  calculateStaking(params: {
    stakeAmount: number;
    duration: number;
    isActiveReporter: boolean;
    disputeParticipation: number;
  }): StakingCalculation {
    const baseApr = 10.2;
    const reporterBonus = params.isActiveReporter ? 5 : 0;
    const disputeBonus = params.disputeParticipation * 2;
    const estimatedApr = baseApr + reporterBonus + disputeBonus;

    const estimatedReward = (params.stakeAmount * estimatedApr * params.duration) / (365 * 100);
    const disputeBonusReward = (params.stakeAmount * disputeBonus * params.duration) / (365 * 100);
    const totalEstimatedReturn = estimatedReward;
    const roi = (totalEstimatedReturn / params.stakeAmount) * 100;

    return {
      stakeAmount: params.stakeAmount,
      duration: params.duration,
      isActiveReporter: params.isActiveReporter,
      disputeParticipation: params.disputeParticipation,
      estimatedApr: Number(estimatedApr.toFixed(2)),
      estimatedReward: Number(estimatedReward.toFixed(2)),
      disputeBonus: Number(disputeBonusReward.toFixed(2)),
      totalEstimatedReturn: Number(totalEstimatedReturn.toFixed(2)),
      roi: Number(roi.toFixed(2)),
    };
  }

  async getNetworkHealth(): Promise<TellorNetworkHealth> {
    const regions = ['North America', 'Europe', 'Asia Pacific', 'South America', 'Africa'];
    const reporterDistribution = regions.map((region) => {
      const count = Math.floor(Math.random() * 20) + 5;
      return {
        region,
        count,
        percentage: 0,
      };
    });
    const totalReporters = reporterDistribution.reduce((sum, r) => sum + r.count, 0);
    reporterDistribution.forEach((r) => {
      r.percentage = Number(((r.count / totalReporters) * 100).toFixed(1));
    });

    const updateFrequencyHeatmap = Array.from({ length: 168 }, (_, i) => ({
      hour: i % 24,
      day: Math.floor(i / 24),
      intensity: Math.random(),
    }));

    const chainActivity = this.supportedChains.map((chain) => ({
      chain,
      updates24h: Math.floor(Math.random() * 5000) + 1000,
      avgLatency: Math.floor(Math.random() * 100) + 50,
      healthScore: Math.floor(Math.random() * 20) + 80,
    }));

    return {
      overallHealth: 92,
      reporterDistribution,
      updateFrequencyHeatmap,
      chainActivity,
    };
  }
}
