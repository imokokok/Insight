import { BaseOracleClient, UNIFIED_BASE_PRICES, OracleClientConfig } from './base';
import { PriceData, OracleProvider, Blockchain } from '@/lib/types/oracle';

export type DisputeType = 'price' | 'state' | 'liquidation' | 'other';

export const DisputeTypeLabels: Record<DisputeType, string> = {
  price: '价格争议',
  state: '状态争议',
  liquidation: '清算争议',
  other: '其他争议',
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
      disputes.push({
        id: `dispute-${i + 1}`,
        timestamp: now - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000),
        status: isResolved ? 'resolved' : Math.random() > 0.5 ? 'active' : 'rejected',
        reward: Math.floor(Math.random() * 5000) + 1000,
        resolutionTime: isResolved ? Math.floor(Math.random() * 48) + 1 : undefined,
        type: disputeTypes[Math.floor(Math.random() * disputeTypes.length)],
        transactionHash: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`,
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
}
