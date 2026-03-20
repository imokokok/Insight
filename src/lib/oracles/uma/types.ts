import { chartColors } from '@/lib/config/colors';

export type DisputeType = 'price' | 'state' | 'liquidation' | 'other';

export interface DisputeTypeConfig {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
}

export const DISPUTE_TYPE_LABELS: Record<DisputeType, string> = {
  price: 'uma.disputeTypes.price',
  state: 'uma.disputeTypes.state',
  liquidation: 'uma.disputeTypes.liquidation',
  other: 'uma.disputeTypes.other',
};

export const DISPUTE_TYPE_STYLES: Record<
  DisputeType,
  { color: string; bgColor: string; borderColor: string; hoverBgColor: string }
> = {
  price: {
    color: 'text-primary-700',
    bgColor: 'bg-primary-50',
    borderColor: 'border-primary-200',
    hoverBgColor: 'hover:bg-primary-100',
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

export const DISPUTE_TYPE_CHART_COLORS: Record<DisputeType, string> = {
  price: chartColors.umaRequestType.price,
  state: chartColors.umaRequestType.state,
  liquidation: chartColors.umaRequestType.liquidation,
  other: chartColors.umaRequestType.other,
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
  stakeAmount: number;
  rewardAmount: number;
  totalValue: number;
}

export interface DisputeAmountDistributionStats {
  avgStakeAmount: number;
  avgRewardAmount: number;
  avgTotalValue: number;
  medianStakeAmount: number;
  medianRewardAmount: number;
  totalStakeAmount: number;
  totalRewardAmount: number;
  amountRanges: {
    range: string;
    min: number;
    max: number;
    count: number;
    avgReward: number;
    roi: number;
  }[];
  efficiency: {
    avgRewardToStakeRatio: number;
    avgRoi: number;
    highEfficiencyCount: number;
    lowEfficiencyCount: number;
  };
  amountTrends: {
    date: string;
    avgStake: number;
    avgReward: number;
    totalValue: number;
    disputeCount: number;
  }[];
}

export interface UMANetworkStats {
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

export type EarningsSourceType = 'base' | 'dispute' | 'other';

export const EARNINGS_SOURCE_LABELS: Record<EarningsSourceType, string> = {
  base: 'uma.rewardTypes.base',
  dispute: 'uma.rewardTypes.dispute',
  other: 'uma.rewardTypes.other',
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
  efficiency: {
    earningsPerStaked: number;
    roi: number;
    yieldEfficiency: number;
    comparisonToNetwork: number;
  };
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
