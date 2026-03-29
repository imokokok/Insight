import type {
  DisputeType,
  ValidatorData,
  UMANetworkStats,
} from './types';

export class SeededRandom {
  private seed: number;

  constructor(seed: number = Date.now()) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  int(min: number, max: number): number {
    return Math.floor(this.range(min, max));
  }

  pick<T>(array: T[]): T {
    return array[this.int(0, array.length)];
  }

  boolean(probability: number = 0.5): boolean {
    return this.next() < probability;
  }
}

export function shouldUseMockData(): boolean {
  if (typeof process === 'undefined') return true;
  if (process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true') return true;
  if (process.env.NODE_ENV === 'development') return true;
  return false;
}

export const UMA_MOCK_CONFIG = {
  seed: 12345,

  validators: (): ValidatorData[] => [
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
  ],

  networkStats: (): UMANetworkStats => ({
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
  }),

  verificationActivity: {
    hourly: [
      3200, 2800, 2500, 2200, 1900, 2100, 2800, 4200, 5800, 7200, 8500, 9200, 8800, 8400, 7900,
      8200, 8600, 9100, 8800, 7600, 6500, 5200, 4100, 3500,
    ],
  },

  disputeTypes: (): DisputeType[] => ['price', 'state', 'liquidation', 'other'],
};

export function generateMockDisputes(seed: number = UMA_MOCK_CONFIG.seed): import('./types').DisputeData[] {
  const rng = new SeededRandom(seed);
  const disputes: import('./types').DisputeData[] = [];
  const now = Date.now();
  const disputeTypes = UMA_MOCK_CONFIG.disputeTypes();

  for (let i = 0; i < 50; i++) {
    const isResolved = rng.boolean(0.7);
    const stakeAmount = rng.int(5000, 55000);
    const rewardMultiplier = isResolved ? rng.range(0.8, 2.3) : 0;
    const rewardAmount = Math.floor(stakeAmount * rewardMultiplier);
    const totalValue = stakeAmount + rewardAmount + rng.int(0, 10000);

    disputes.push({
      id: `dispute-${i + 1}`,
      timestamp: now - rng.int(0, 30 * 24 * 60 * 60 * 1000),
      status: isResolved ? 'resolved' : rng.boolean(0.5) ? 'active' : 'rejected',
      reward: rng.int(1000, 6000),
      resolutionTime: isResolved ? rng.int(1, 49) : undefined,
      type: rng.pick(disputeTypes),
      transactionHash: `0x${Array.from({ length: 64 }, () => rng.int(0, 16).toString(16)).join('')}`,
      stakeAmount,
      rewardAmount,
      totalValue,
    });
  }

  return disputes.sort((a, b) => b.timestamp - a.timestamp);
}

export function generateMockTrend<T extends string>(
  seed: number,
  days: number,
  generateValue: (rng: SeededRandom, dayIndex: number) => number,
  formatDate: (date: Date) => string,
  valueKey: string
): Array<{ date: string; [key: string]: number | string }> {
  const rng = new SeededRandom(seed);
  const trends = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    trends.push({
      date: formatDate(date),
      [valueKey]: generateValue(rng, days - 1 - i),
    });
  }

  return trends;
}

export function generateMockEarningsTrends(seed: number = UMA_MOCK_CONFIG.seed): { day: string; daily: number; cumulative: number }[] {
  const rng = new SeededRandom(seed);
  const trends: { day: string; daily: number; cumulative: number }[] = [];
  let cumulative = 0;
  const now = new Date();

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const daily = rng.int(300, 800);
    cumulative += daily;
    trends.push({
      day: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
      daily,
      cumulative,
    });
  }

  return trends;
}

export function generateMockDisputeTrends(seed: number = UMA_MOCK_CONFIG.seed): { date: string; filed: number; resolved: number }[] {
  const rng = new SeededRandom(seed);
  const trends = [];
  const now = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    trends.push({
      date: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
      filed: rng.int(10, 30),
      resolved: rng.int(8, 23),
    });
  }

  return trends;
}
