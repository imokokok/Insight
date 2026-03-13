import React from 'react';
import { BaseOracleClient, UNIFIED_BASE_PRICES, OracleClientConfig } from './base';
import { PriceData, OracleProvider, Blockchain } from '@/lib/types/oracle';

export type DisputeType = 'price' | 'state' | 'liquidation' | 'other';

export interface DisputeTypeConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
}

// SVG 图标组件 - 价格争议（价格标签/货币符号）
export const PriceDisputeIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
  </svg>
);

// SVG 图标组件 - 状态争议（文档/状态指示器）
export const StateDisputeIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <path d="M9 13h6" />
    <path d="M9 17h3" />
    <circle cx="17" cy="15" r="3" />
    <path d="M17 13.5v3" />
    <path d="M15.5 15h3" />
  </svg>
);

// SVG 图标组件 - 清算争议（警告/清算）
export const LiquidationDisputeIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
    <path d="M7 12l5-5 5 5" />
    <path d="M7 16l5-5 5 5" opacity="0.5" />
  </svg>
);

// SVG 图标组件 - 其他争议（通用/问号）
export const OtherDisputeIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
    <path d="M8 8l-2 2M16 8l2 2" opacity="0.3" />
  </svg>
);

export const DisputeTypeLabels: Record<DisputeType, string> = {
  price: '价格争议',
  state: '状态争议',
  liquidation: '清算争议',
  other: '其他争议',
};

// 争议类型样式配置
export const DisputeTypeStyles: Record<
  DisputeType,
  { color: string; bgColor: string; borderColor: string; hoverBgColor: string }
> = {
  price: {
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    hoverBgColor: 'hover:bg-blue-100',
  },
  state: {
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    hoverBgColor: 'hover:bg-emerald-100',
  },
  liquidation: {
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    hoverBgColor: 'hover:bg-amber-100',
  },
  other: {
    color: 'text-slate-700',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    hoverBgColor: 'hover:bg-slate-100',
  },
};

// 争议类型图表颜色配置
export const DisputeTypeChartColors: Record<DisputeType, string> = {
  price: '#3b82f6', // blue-500
  state: '#10b981', // emerald-500
  liquidation: '#f59e0b', // amber-500
  other: '#64748b', // slate-500
};

export interface ValidatorData {
  id: string;
  name: string;
  type: 'institution' | 'independent' | 'community';
  region: string;
  responseTime: number;
  successRate: number;
  reputation: number;
  staked: number;
  earnings: number;
  address: string;
}

export interface DisputeData {
  id: string;
  timestamp: number;
  status: 'active' | 'resolved' | 'rejected';
  reward: number;
  resolutionTime?: number;
  type: DisputeType;
  transactionHash: string;
  // 金额相关字段
  stakeAmount: number; // 质押金额
  rewardAmount: number; // 实际奖励金额
  totalValue: number; // 争议总价值
}

// 争议金额分布统计
export interface DisputeAmountDistributionStats {
  avgStakeAmount: number; // 平均质押金额
  avgRewardAmount: number; // 平均奖励金额
  avgTotalValue: number; // 平均争议总价值
  medianStakeAmount: number; // 质押金额中位数
  medianRewardAmount: number; // 奖励金额中位数
  totalStakeAmount: number; // 总质押金额
  totalRewardAmount: number; // 总奖励金额
  // 金额区间分布
  amountRanges: {
    range: string;
    min: number;
    max: number;
    count: number;
    avgReward: number;
    roi: number;
  }[];
  // 奖励效率指标
  efficiency: {
    avgRewardToStakeRatio: number; // 平均奖励/质押比例
    avgRoi: number; // 平均 ROI (%)
    highEfficiencyCount: number; // 高效争议数量 (ROI > 50%)
    lowEfficiencyCount: number; // 低效争议数量 (ROI < 10%)
  };
  // 金额趋势数据
  amountTrends: {
    date: string;
    avgStake: number;
    avgReward: number;
    totalValue: number;
    disputeCount: number;
  }[];
}

export interface UMAMetworkStats {
  activeValidators: number;
  validatorUptime: number;
  avgResponseTime: number;
  updateFrequency: number;
  totalStaked: number;
  dataSources: number;
  totalDisputes: number;
  disputeSuccessRate: number;
  avgResolutionTime: number;
  activeDisputes: number;
}

export interface VerificationActivity {
  hourly: number[];
  total: number;
  peakHour: number;
  avgPerHour: number;
  peakRequests: number;
}

export interface ValidatorPerformanceHeatmapData {
  validatorId: string;
  validatorName: string;
  hourlyData: {
    hour: number;
    responseTime: number;
    successRate: number;
  }[];
}

export interface ValidatorPerformanceHeatmapDataByDay {
  validatorId: string;
  validatorName: string;
  dailyData: {
    date: string;
    dayIndex: number;
    avgResponseTime: number;
    avgSuccessRate: number;
  }[];
}

export type TimeRange = '24H' | '7D';

export interface DisputeEfficiencyStats {
  avgResolutionTime: number;
  medianResolutionTime: number;
  stdDeviation: number;
  successRateTrend: {
    date: string;
    rate: number;
  }[];
  resolutionTimeDistribution: {
    range: string;
    count: number;
  }[];
}

export interface DataQualityScore {
  overallScore: number;
  networkHealth: {
    score: number;
    trend: 'up' | 'down' | 'stable';
  };
  dataIntegrity: {
    score: number;
    trend: 'up' | 'down' | 'stable';
  };
  responseTime: {
    score: number;
    trend: 'up' | 'down' | 'stable';
  };
  validatorActivity: {
    score: number;
    trend: 'up' | 'down' | 'stable';
  };
}

export interface ValidatorHistoryData {
  date: string;
  successRate: number;
  responseTime: number;
  reputation: number;
}

export interface StakingCalculation {
  dailyReward: number;
  monthlyReward: number;
  yearlyReward: number;
  apr: number;
}

// ============================================
// 收益归因分析数据模型
// ============================================

export type EarningsSourceType = 'base' | 'dispute' | 'other';

export const EarningsSourceLabels: Record<EarningsSourceType, string> = {
  base: '基础奖励',
  dispute: '争议奖励',
  other: '其他奖励',
};

export interface EarningsSourceBreakdown {
  type: EarningsSourceType;
  amount: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
}

export interface ValidatorEarningsAttribution {
  validatorId: string;
  validatorName: string;
  totalEarnings: number;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  sources: EarningsSourceBreakdown[];
  // 单位质押收益效率指标
  efficiency: {
    earningsPerStaked: number; // 每单位质押收益
    roi: number; // 投资回报率 (%)
    yieldEfficiency: number; // 收益效率指数 (0-100)
    comparisonToNetwork: number; // 相对于网络平均水平 (%)
  };
  // 历史趋势
  history: {
    date: string;
    total: number;
    base: number;
    dispute: number;
    other: number;
  }[];
}

export interface NetworkEarningsAttribution {
  totalNetworkEarnings: number;
  averageEarningsPerValidator: number;
  networkEfficiency: {
    avgEarningsPerStaked: number;
    avgRoi: number;
    avgYieldEfficiency: number;
  };
  sourceDistribution: {
    base: number;
    dispute: number;
    other: number;
  };
  topPerformers: {
    validatorId: string;
    validatorName: string;
    earningsPerStaked: number;
    efficiencyRank: number;
  }[];
}

export class UMAClient extends BaseOracleClient {
  name = OracleProvider.UMA;
  supportedChains = [Blockchain.ETHEREUM, Blockchain.POLYGON];

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
        error instanceof Error ? error.message : 'Failed to fetch price from UMA',
        'UMA_ERROR'
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
        error instanceof Error ? error.message : 'Failed to fetch historical prices from UMA',
        'UMA_HISTORICAL_ERROR'
      );
    }
  }

  async getValidators(): Promise<ValidatorData[]> {
    const validators: ValidatorData[] = [
      {
        id: '1',
        name: 'UMA Foundation',
        type: 'institution',
        region: 'North America',
        responseTime: 110,
        successRate: 99.9,
        reputation: 98,
        staked: 680000,
        earnings: 12500,
        address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
      },
      {
        id: '2',
        name: 'Risk Labs',
        type: 'institution',
        region: 'Europe',
        responseTime: 120,
        successRate: 99.8,
        reputation: 95,
        staked: 500000,
        earnings: 9800,
        address: '0x8ba1f109551bD432803012645Hac136c82C3e8C9',
      },
      {
        id: '3',
        name: 'SuperUMAn',
        type: 'community',
        region: 'Asia',
        responseTime: 135,
        successRate: 99.5,
        reputation: 92,
        staked: 420000,
        earnings: 8200,
        address: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      },
      {
        id: '4',
        name: 'Across Validator',
        type: 'institution',
        region: 'North America',
        responseTime: 125,
        successRate: 99.7,
        reputation: 94,
        staked: 380000,
        earnings: 7500,
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      },
      {
        id: '5',
        name: 'Polymarket Node',
        type: 'institution',
        region: 'Europe',
        responseTime: 140,
        successRate: 99.4,
        reputation: 90,
        staked: 320000,
        earnings: 6400,
        address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
      },
      {
        id: '6',
        name: 'Independent Validator A',
        type: 'independent',
        region: 'Asia',
        responseTime: 150,
        successRate: 99.2,
        reputation: 88,
        staked: 280000,
        earnings: 5600,
        address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      },
      {
        id: '7',
        name: 'Independent Validator B',
        type: 'independent',
        region: 'North America',
        responseTime: 145,
        successRate: 99.3,
        reputation: 89,
        staked: 260000,
        earnings: 5200,
        address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
      },
      {
        id: '8',
        name: 'Community Node 1',
        type: 'community',
        region: 'Europe',
        responseTime: 160,
        successRate: 99.0,
        reputation: 85,
        staked: 220000,
        earnings: 4400,
        address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
      },
      {
        id: '9',
        name: 'Community Node 2',
        type: 'community',
        region: 'Asia',
        responseTime: 155,
        successRate: 99.1,
        reputation: 86,
        staked: 200000,
        earnings: 4000,
        address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
      },
      {
        id: '10',
        name: 'Independent Validator C',
        type: 'independent',
        region: 'Other',
        responseTime: 165,
        successRate: 98.9,
        reputation: 84,
        staked: 180000,
        earnings: 3600,
        address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
      },
    ];
    return validators;
  }

  async getDisputes(): Promise<DisputeData[]> {
    const disputes: DisputeData[] = [];
    const now = Date.now();
    const disputeTypes: DisputeType[] = ['price', 'state', 'liquidation', 'other'];

    for (let i = 0; i < 50; i++) {
      const isResolved = Math.random() > 0.3;
      // 生成金额数据
      const stakeAmount = Math.floor(Math.random() * 50000) + 5000; // 5,000 - 55,000
      const rewardMultiplier = isResolved ? 0.8 + Math.random() * 1.5 : 0; // 已解决的争议有奖励
      const rewardAmount = Math.floor(stakeAmount * rewardMultiplier);
      const totalValue = stakeAmount + rewardAmount + Math.floor(Math.random() * 10000);

      disputes.push({
        id: `dispute-${i + 1}`,
        timestamp: now - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000),
        status: isResolved ? 'resolved' : Math.random() > 0.5 ? 'active' : 'rejected',
        reward: Math.floor(Math.random() * 5000) + 1000,
        resolutionTime: isResolved ? Math.floor(Math.random() * 48) + 1 : undefined,
        type: disputeTypes[Math.floor(Math.random() * disputeTypes.length)],
        transactionHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
        stakeAmount,
        rewardAmount,
        totalValue,
      });
    }

    return disputes.sort((a, b) => b.timestamp - a.timestamp);
  }

  async getNetworkStats(): Promise<UMAMetworkStats> {
    return {
      activeValidators: 850,
      validatorUptime: 99.5,
      avgResponseTime: 180,
      updateFrequency: 60,
      totalStaked: 25000000,
      dataSources: 320,
      totalDisputes: 1250,
      disputeSuccessRate: 78,
      avgResolutionTime: 4.2,
      activeDisputes: 23,
    };
  }

  async getVerificationActivity(): Promise<VerificationActivity> {
    const hourly = [
      3200, 2800, 2500, 2200, 1900, 2100, 2800, 4200, 5800, 7200, 8500, 9200, 8800, 8400, 7900,
      8200, 8600, 9100, 8800, 7600, 6500, 5200, 4100, 3500,
    ];

    const total = hourly.reduce((a, b) => a + b, 0);
    const peakRequests = Math.max(...hourly);
    const peakHour = hourly.indexOf(peakRequests);

    return {
      hourly,
      total,
      peakHour,
      avgPerHour: Math.round(total / 24),
      peakRequests,
    };
  }

  async getDisputeTrends(): Promise<{ date: string; filed: number; resolved: number }[]> {
    const trends = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      trends.push({
        date: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
        filed: Math.floor(Math.random() * 20) + 10,
        resolved: Math.floor(Math.random() * 15) + 8,
      });
    }

    return trends;
  }

  async getEarningsTrends(): Promise<{ day: string; daily: number; cumulative: number }[]> {
    const trends = [];
    let cumulative = 0;
    const now = new Date();

    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const daily = Math.floor(Math.random() * 500) + 300;
      cumulative += daily;
      trends.push({
        day: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
        daily,
        cumulative,
      });
    }

    return trends;
  }

  async getValidatorPerformanceHeatmap(): Promise<ValidatorPerformanceHeatmapData[]> {
    const validators = await this.getValidators();
    const heatmapData: ValidatorPerformanceHeatmapData[] = [];

    for (const validator of validators.slice(0, 8)) {
      const hourlyData = [];
      for (let hour = 0; hour < 24; hour++) {
        const baseResponseTime = validator.responseTime;
        const variation = Math.sin((hour / 24) * Math.PI * 2) * 20 + Math.random() * 10 - 5;
        const responseTime = Math.max(50, baseResponseTime + variation);

        const baseSuccessRate = validator.successRate;
        const successVariation =
          Math.cos((hour / 24) * Math.PI * 2) * 0.3 + Math.random() * 0.2 - 0.1;
        const successRate = Math.min(100, Math.max(95, baseSuccessRate + successVariation));

        hourlyData.push({
          hour,
          responseTime: Math.round(responseTime),
          successRate: parseFloat(successRate.toFixed(2)),
        });
      }

      heatmapData.push({
        validatorId: validator.id,
        validatorName: validator.name,
        hourlyData,
      });
    }

    return heatmapData;
  }

  async getValidatorPerformanceHeatmapByDays(
    days: number = 7
  ): Promise<ValidatorPerformanceHeatmapDataByDay[]> {
    const validators = await this.getValidators();
    const heatmapData: ValidatorPerformanceHeatmapDataByDay[] = [];
    const now = new Date();

    for (const validator of validators.slice(0, 8)) {
      const dailyData = [];

      for (let dayIndex = 0; dayIndex < days; dayIndex++) {
        const date = new Date(now);
        date.setDate(date.getDate() - (days - 1 - dayIndex));
        const dateStr = date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });

        const baseResponseTime = validator.responseTime;
        const dayVariation = Math.sin((dayIndex / days) * Math.PI) * 15 + Math.random() * 10 - 5;
        const avgResponseTime = Math.max(50, baseResponseTime + dayVariation);

        const baseSuccessRate = validator.successRate;
        const successVariation =
          Math.cos((dayIndex / days) * Math.PI) * 0.2 + Math.random() * 0.15 - 0.075;
        const avgSuccessRate = Math.min(100, Math.max(95, baseSuccessRate + successVariation));

        dailyData.push({
          date: dateStr,
          dayIndex,
          avgResponseTime: Math.round(avgResponseTime),
          avgSuccessRate: parseFloat(avgSuccessRate.toFixed(2)),
        });
      }

      heatmapData.push({
        validatorId: validator.id,
        validatorName: validator.name,
        dailyData,
      });
    }

    return heatmapData;
  }

  async getDisputeEfficiencyStats(): Promise<DisputeEfficiencyStats> {
    const disputes = await this.getDisputes();
    const resolvedDisputes = disputes.filter((d) => d.status === 'resolved' && d.resolutionTime);

    const resolutionTimes = resolvedDisputes.map((d) => d.resolutionTime!);

    const avgResolutionTime =
      resolutionTimes.length > 0
        ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
        : 0;

    const sortedTimes = [...resolutionTimes].sort((a, b) => a - b);
    const medianResolutionTime =
      sortedTimes.length > 0 ? sortedTimes[Math.floor(sortedTimes.length / 2)] : 0;

    const variance =
      resolutionTimes.length > 0
        ? resolutionTimes.reduce((sum, time) => sum + Math.pow(time - avgResolutionTime, 2), 0) /
          resolutionTimes.length
        : 0;
    const stdDeviation = Math.sqrt(variance);

    const successRateTrend = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      successRateTrend.push({
        date: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
        rate: 70 + Math.random() * 20,
      });
    }

    const distribution = { '0-2h': 0, '2-6h': 0, '6-12h': 0, '12-24h': 0, '24-48h': 0, '48h+': 0 };
    for (const time of resolutionTimes) {
      if (time <= 2) distribution['0-2h']++;
      else if (time <= 6) distribution['2-6h']++;
      else if (time <= 12) distribution['6-12h']++;
      else if (time <= 24) distribution['12-24h']++;
      else if (time <= 48) distribution['24-48h']++;
      else distribution['48h+']++;
    }

    const resolutionTimeDistribution = [
      { range: '0-2h', count: distribution['0-2h'] },
      { range: '2-6h', count: distribution['2-6h'] },
      { range: '6-12h', count: distribution['6-12h'] },
      { range: '12-24h', count: distribution['12-24h'] },
      { range: '24-48h', count: distribution['24-48h'] },
      { range: '48h+', count: distribution['48h+'] },
    ];

    return {
      avgResolutionTime,
      medianResolutionTime,
      stdDeviation,
      successRateTrend,
      resolutionTimeDistribution,
    };
  }

  async getDataQualityScore(): Promise<DataQualityScore> {
    const networkStats = await this.getNetworkStats();

    const networkHealthScore = Math.min(
      100,
      (networkStats.validatorUptime / 100) * 50 +
        (networkStats.activeValidators / 1000) * 25 +
        (networkStats.disputeSuccessRate / 100) * 25
    );

    const dataIntegrityScore = 85 + Math.random() * 10;

    const responseTimeScore = Math.max(0, 100 - (networkStats.avgResponseTime - 100) / 2);

    const validatorActivityScore = Math.min(
      100,
      (networkStats.activeValidators / 850) * 70 + (networkStats.totalStaked / 30000000) * 30
    );

    const overallScore =
      networkHealthScore * 0.3 +
      dataIntegrityScore * 0.25 +
      responseTimeScore * 0.25 +
      validatorActivityScore * 0.2;

    const getTrend = (): 'up' | 'down' | 'stable' => {
      const rand = Math.random();
      return rand > 0.6 ? 'up' : rand > 0.3 ? 'stable' : 'down';
    };

    return {
      overallScore: parseFloat(overallScore.toFixed(1)),
      networkHealth: {
        score: parseFloat(networkHealthScore.toFixed(1)),
        trend: getTrend(),
      },
      dataIntegrity: {
        score: parseFloat(dataIntegrityScore.toFixed(1)),
        trend: getTrend(),
      },
      responseTime: {
        score: parseFloat(responseTimeScore.toFixed(1)),
        trend: getTrend(),
      },
      validatorActivity: {
        score: parseFloat(validatorActivityScore.toFixed(1)),
        trend: getTrend(),
      },
    };
  }

  async getValidatorHistory(
    validatorId: string,
    days: number = 30
  ): Promise<ValidatorHistoryData[]> {
    const validators = await this.getValidators();
    const validator = validators.find((v) => v.id === validatorId);

    const baseSuccessRate = validator?.successRate ?? 99.0;
    const baseResponseTime = validator?.responseTime ?? 150;
    const baseReputation = validator?.reputation ?? 85;

    const history: ValidatorHistoryData[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });

      const trendFactor = Math.sin(((days - i) / days) * Math.PI) * 2;
      const randomVariation = (Math.random() - 0.5) * 2;

      const successRate = Math.min(
        100,
        Math.max(95, baseSuccessRate + trendFactor + randomVariation)
      );

      const responseTimeVariation =
        Math.cos(((days - i) / days) * Math.PI) * 20 + (Math.random() - 0.5) * 30;
      const responseTime = Math.max(50, Math.round(baseResponseTime + responseTimeVariation));

      const reputationTrend = ((days - i) / days) * 3;
      const reputationVariation = (Math.random() - 0.5) * 4;
      const reputation = Math.min(
        100,
        Math.max(70, Math.round(baseReputation + reputationTrend + reputationVariation))
      );

      history.push({
        date: dateStr,
        successRate: parseFloat(successRate.toFixed(2)),
        responseTime,
        reputation,
      });
    }

    return history;
  }

  async calculateStakingRewards(
    amount: number,
    validatorType: 'institution' | 'independent' | 'community',
    disputeFrequency: 'low' | 'medium' | 'high'
  ): Promise<StakingCalculation> {
    const baseAprMap = {
      institution: 0.08,
      independent: 0.1,
      community: 0.12,
    };

    const disputeBonusMap = {
      low: 0,
      medium: 0.02,
      high: 0.05,
    };

    const baseApr = baseAprMap[validatorType];
    const disputeBonus = disputeBonusMap[disputeFrequency];
    const totalApr = baseApr + disputeBonus;

    const yearlyReward = amount * totalApr;
    const monthlyReward = yearlyReward / 12;
    const dailyReward = yearlyReward / 365;

    return {
      dailyReward: parseFloat(dailyReward.toFixed(4)),
      monthlyReward: parseFloat(monthlyReward.toFixed(2)),
      yearlyReward: parseFloat(yearlyReward.toFixed(2)),
      apr: parseFloat((totalApr * 100).toFixed(2)),
    };
  }

  async getDisputesWithType(): Promise<DisputeData[]> {
    return this.getDisputes();
  }

  // ============================================
  // 收益归因分析方法
  // ============================================

  /**
   * 获取验证者收益归因分析
   * @param validatorId 验证者ID
   * @param period 时间周期
   */
  async getValidatorEarningsAttribution(
    validatorId: string,
    period: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'monthly'
  ): Promise<ValidatorEarningsAttribution> {
    const validators = await this.getValidators();
    const validator = validators.find((v) => v.id === validatorId);

    if (!validator) {
      throw new Error(`Validator not found: ${validatorId}`);
    }

    // 计算周期乘数
    const periodMultiplier = {
      daily: 1 / 30,
      weekly: 7 / 30,
      monthly: 1,
      yearly: 12,
    }[period];

    const totalEarnings = validator.earnings * periodMultiplier;

    // 模拟收益来源分布
    const baseRatio = 0.6 + Math.random() * 0.15; // 60-75% 基础奖励
    const disputeRatio = 0.15 + Math.random() * 0.15; // 15-30% 争议奖励
    const otherRatio = 1 - baseRatio - disputeRatio; // 剩余为其他奖励

    const baseAmount = totalEarnings * baseRatio;
    const disputeAmount = totalEarnings * disputeRatio;
    const otherAmount = totalEarnings * otherRatio;

    const sources: EarningsSourceBreakdown[] = [
      {
        type: 'base',
        amount: baseAmount,
        percentage: baseRatio * 100,
        trend: Math.random() > 0.4 ? 'up' : Math.random() > 0.5 ? 'stable' : 'down',
        trendValue: parseFloat((Math.random() * 10 - 3).toFixed(2)),
      },
      {
        type: 'dispute',
        amount: disputeAmount,
        percentage: disputeRatio * 100,
        trend: Math.random() > 0.5 ? 'up' : Math.random() > 0.5 ? 'stable' : 'down',
        trendValue: parseFloat((Math.random() * 15 - 5).toFixed(2)),
      },
      {
        type: 'other',
        amount: otherAmount,
        percentage: otherRatio * 100,
        trend: Math.random() > 0.6 ? 'stable' : Math.random() > 0.5 ? 'up' : 'down',
        trendValue: parseFloat((Math.random() * 8 - 4).toFixed(2)),
      },
    ];

    // 计算效率指标
    const earningsPerStaked = totalEarnings / validator.staked;
    const roi = (totalEarnings / validator.staked) * 100 * (period === 'yearly' ? 1 : period === 'monthly' ? 12 : period === 'weekly' ? 52 : 365);
    const yieldEfficiency = Math.min(100, (earningsPerStaked / 0.02) * 100); // 以2%为基准

    // 计算相对于网络平均水平
    const networkAvgEarningsPerStaked =
      validators.reduce((sum, v) => sum + v.earnings / v.staked, 0) / validators.length;
    const comparisonToNetwork = ((earningsPerStaked - networkAvgEarningsPerStaked) / networkAvgEarningsPerStaked) * 100;

    // 生成历史数据
    const history: ValidatorEarningsAttribution['history'] = [];
    const days = period === 'daily' ? 1 : period === 'weekly' ? 7 : period === 'monthly' ? 30 : 365;
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);

      const dailyBase = (baseAmount / days) * (0.9 + Math.random() * 0.2);
      const dailyDispute = (disputeAmount / days) * (0.5 + Math.random() * 1.5);
      const dailyOther = (otherAmount / days) * (0.8 + Math.random() * 0.4);

      history.push({
        date: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
        total: dailyBase + dailyDispute + dailyOther,
        base: dailyBase,
        dispute: dailyDispute,
        other: dailyOther,
      });
    }

    return {
      validatorId,
      validatorName: validator.name,
      totalEarnings,
      period,
      sources,
      efficiency: {
        earningsPerStaked: parseFloat(earningsPerStaked.toFixed(6)),
        roi: parseFloat(roi.toFixed(2)),
        yieldEfficiency: parseFloat(yieldEfficiency.toFixed(2)),
        comparisonToNetwork: parseFloat(comparisonToNetwork.toFixed(2)),
      },
      history,
    };
  }

  /**
   * 获取网络整体收益归因统计
   */
  async getNetworkEarningsAttribution(): Promise<NetworkEarningsAttribution> {
    const validators = await this.getValidators();

    const totalNetworkEarnings = validators.reduce((sum, v) => sum + v.earnings, 0);
    const averageEarningsPerValidator = totalNetworkEarnings / validators.length;

    // 计算网络平均效率指标
    const totalStaked = validators.reduce((sum, v) => sum + v.staked, 0);
    const avgEarningsPerStaked = totalNetworkEarnings / totalStaked;
    const avgRoi = (averageEarningsPerValidator / (totalStaked / validators.length)) * 12 * 100;
    const avgYieldEfficiency = Math.min(100, (avgEarningsPerStaked / 0.02) * 100);

    // 计算整体收益来源分布
    const baseRatio = 0.65;
    const disputeRatio = 0.22;
    const otherRatio = 0.13;

    // 获取效率排名靠前的验证者
    const performers = validators
      .map((v) => ({
        validatorId: v.id,
        validatorName: v.name,
        earningsPerStaked: v.earnings / v.staked,
      }))
      .sort((a, b) => b.earningsPerStaked - a.earningsPerStaked)
      .slice(0, 5)
      .map((p, index) => ({
        ...p,
        earningsPerStaked: parseFloat(p.earningsPerStaked.toFixed(6)),
        efficiencyRank: index + 1,
      }));

    return {
      totalNetworkEarnings,
      averageEarningsPerValidator,
      networkEfficiency: {
        avgEarningsPerStaked: parseFloat(avgEarningsPerStaked.toFixed(6)),
        avgRoi: parseFloat(avgRoi.toFixed(2)),
        avgYieldEfficiency: parseFloat(avgYieldEfficiency.toFixed(2)),
      },
      sourceDistribution: {
        base: baseRatio * 100,
        dispute: disputeRatio * 100,
        other: otherRatio * 100,
      },
      topPerformers: performers,
    };
  }

  /**
   * 批量获取多个验证者的收益归因
   */
  async getValidatorsEarningsAttribution(
    validatorIds?: string[],
    period: 'daily' | 'weekly' | 'monthly' | 'yearly' = 'monthly'
  ): Promise<ValidatorEarningsAttribution[]> {
    const validators = await this.getValidators();
    const targetIds = validatorIds || validators.map((v) => v.id);

    const attributions = await Promise.all(
      targetIds.map((id) => this.getValidatorEarningsAttribution(id, period))
    );

    return attributions;
  }

  // ============================================
  // 争议金额分布分析方法
  // ============================================

  /**
   * 获取争议金额分布统计
   */
  async getDisputeAmountDistributionStats(): Promise<DisputeAmountDistributionStats> {
    const disputes = await this.getDisputes();
    const resolvedDisputes = disputes.filter((d) => d.status === 'resolved');

    if (disputes.length === 0) {
      return {
        avgStakeAmount: 0,
        avgRewardAmount: 0,
        avgTotalValue: 0,
        medianStakeAmount: 0,
        medianRewardAmount: 0,
        totalStakeAmount: 0,
        totalRewardAmount: 0,
        amountRanges: [],
        efficiency: {
          avgRewardToStakeRatio: 0,
          avgRoi: 0,
          highEfficiencyCount: 0,
          lowEfficiencyCount: 0,
        },
        amountTrends: [],
      };
    }

    // 计算基础统计
    const stakeAmounts = disputes.map((d) => d.stakeAmount);
    const rewardAmounts = resolvedDisputes.map((d) => d.rewardAmount);
    const totalValues = disputes.map((d) => d.totalValue);

    const avgStakeAmount = stakeAmounts.reduce((a, b) => a + b, 0) / stakeAmounts.length;
    const avgRewardAmount = rewardAmounts.length > 0 ? rewardAmounts.reduce((a, b) => a + b, 0) / rewardAmounts.length : 0;
    const avgTotalValue = totalValues.reduce((a, b) => a + b, 0) / totalValues.length;

    const sortedStakes = [...stakeAmounts].sort((a, b) => a - b);
    const sortedRewards = [...rewardAmounts].sort((a, b) => a - b);
    const medianStakeAmount = sortedStakes[Math.floor(sortedStakes.length / 2)];
    const medianRewardAmount = sortedRewards.length > 0 ? sortedRewards[Math.floor(sortedRewards.length / 2)] : 0;

    const totalStakeAmount = stakeAmounts.reduce((a, b) => a + b, 0);
    const totalRewardAmount = rewardAmounts.reduce((a, b) => a + b, 0);

    // 金额区间分布
    const ranges = [
      { min: 0, max: 10000, label: '<10K' },
      { min: 10000, max: 20000, label: '10K-20K' },
      { min: 20000, max: 30000, label: '20K-30K' },
      { min: 30000, max: 40000, label: '30K-40K' },
      { min: 40000, max: 50000, label: '40K-50K' },
      { min: 50000, max: Infinity, label: '50K+' },
    ];

    const amountRanges = ranges.map((range) => {
      const rangeDisputes = disputes.filter(
        (d) => d.stakeAmount >= range.min && d.stakeAmount < range.max
      );
      const rangeResolved = rangeDisputes.filter((d) => d.status === 'resolved');
      const avgReward =
        rangeResolved.length > 0
          ? rangeResolved.reduce((sum, d) => sum + d.rewardAmount, 0) / rangeResolved.length
          : 0;
      const totalStake = rangeDisputes.reduce((sum, d) => sum + d.stakeAmount, 0);
      const totalReward = rangeResolved.reduce((sum, d) => sum + d.rewardAmount, 0);
      const roi = totalStake > 0 ? (totalReward / totalStake) * 100 : 0;

      return {
        range: range.label,
        min: range.min,
        max: range.max,
        count: rangeDisputes.length,
        avgReward,
        roi,
      };
    });

    // 奖励效率指标
    const rewardToStakeRatios = resolvedDisputes.map((d) =>
      d.stakeAmount > 0 ? d.rewardAmount / d.stakeAmount : 0
    );
    const avgRewardToStakeRatio =
      rewardToStakeRatios.length > 0
        ? rewardToStakeRatios.reduce((a, b) => a + b, 0) / rewardToStakeRatios.length
        : 0;
    const avgRoi = avgRewardToStakeRatio * 100;

    const highEfficiencyCount = resolvedDisputes.filter((d) => {
      const roi = d.stakeAmount > 0 ? (d.rewardAmount / d.stakeAmount) * 100 : 0;
      return roi > 50;
    }).length;

    const lowEfficiencyCount = resolvedDisputes.filter((d) => {
      const roi = d.stakeAmount > 0 ? (d.rewardAmount / d.stakeAmount) * 100 : 0;
      return roi < 10;
    }).length;

    // 金额趋势数据 (最近14天)
    const amountTrends: DisputeAmountDistributionStats['amountTrends'] = [];
    const now = new Date();

    for (let i = 13; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });

      const dayDisputes = disputes.filter((d) => {
        const disputeDate = new Date(d.timestamp);
        return (
          disputeDate.getDate() === date.getDate() &&
          disputeDate.getMonth() === date.getMonth()
        );
      });

      const dayResolved = dayDisputes.filter((d) => d.status === 'resolved');

      amountTrends.push({
        date: dateStr,
        avgStake:
          dayDisputes.length > 0
            ? dayDisputes.reduce((sum, d) => sum + d.stakeAmount, 0) / dayDisputes.length
            : 0,
        avgReward:
          dayResolved.length > 0
            ? dayResolved.reduce((sum, d) => sum + d.rewardAmount, 0) / dayResolved.length
            : 0,
        totalValue: dayDisputes.reduce((sum, d) => sum + d.totalValue, 0),
        disputeCount: dayDisputes.length,
      });
    }

    return {
      avgStakeAmount: parseFloat(avgStakeAmount.toFixed(2)),
      avgRewardAmount: parseFloat(avgRewardAmount.toFixed(2)),
      avgTotalValue: parseFloat(avgTotalValue.toFixed(2)),
      medianStakeAmount,
      medianRewardAmount,
      totalStakeAmount,
      totalRewardAmount,
      amountRanges,
      efficiency: {
        avgRewardToStakeRatio: parseFloat(avgRewardToStakeRatio.toFixed(4)),
        avgRoi: parseFloat(avgRoi.toFixed(2)),
        highEfficiencyCount,
        lowEfficiencyCount,
      },
      amountTrends,
    };
  }
}
