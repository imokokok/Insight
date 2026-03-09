import { BaseOracleClient } from './base';
import { PriceData, OracleProvider, Blockchain } from '@/lib/types/oracle';

const BASE_PRICES: Record<string, number> = {
  BTC: 68100,
  ETH: 3520,
  SOL: 182,
  UMA: 8.5,
  USDC: 1,
};

// 验证者数据类型
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
}

// 争议数据类型
export interface DisputeData {
  id: string;
  timestamp: number;
  status: 'active' | 'resolved' | 'rejected';
  reward: number;
  resolutionTime?: number;
}

// 网络统计数据类型
export interface NetworkStats {
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

// 验证活动数据
export interface VerificationActivity {
  hourly: number[];
  total: number;
  peakHour: number;
  avgPerHour: number;
  peakRequests: number;
}

export class UMAClient extends BaseOracleClient {
  name = OracleProvider.UMA;
  supportedChains = [Blockchain.ETHEREUM, Blockchain.POLYGON];

  async getPrice(symbol: string, chain?: Blockchain): Promise<PriceData> {
    try {
      const basePrice = BASE_PRICES[symbol.toUpperCase()] || 100;
      return this.generateMockPrice(symbol, basePrice, chain);
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
      const basePrice = BASE_PRICES[symbol.toUpperCase()] || 100;
      return this.generateMockHistoricalPrices(symbol, basePrice, chain, period);
    } catch (error) {
      throw this.createError(
        error instanceof Error ? error.message : 'Failed to fetch historical prices from UMA',
        'UMA_HISTORICAL_ERROR'
      );
    }
  }

  // 获取验证者列表
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
      },
    ];
    return validators;
  }

  // 获取争议数据
  async getDisputes(): Promise<DisputeData[]> {
    const disputes: DisputeData[] = [];
    const now = Date.now();
    
    // 生成模拟争议数据
    for (let i = 0; i < 50; i++) {
      const isResolved = Math.random() > 0.3;
      disputes.push({
        id: `dispute-${i + 1}`,
        timestamp: now - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000),
        status: isResolved ? 'resolved' : Math.random() > 0.5 ? 'active' : 'rejected',
        reward: Math.floor(Math.random() * 5000) + 1000,
        resolutionTime: isResolved ? Math.floor(Math.random() * 48) + 1 : undefined,
      });
    }
    
    return disputes.sort((a, b) => b.timestamp - a.timestamp);
  }

  // 获取网络统计
  async getNetworkStats(): Promise<NetworkStats> {
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

  // 获取验证活动数据
  async getVerificationActivity(): Promise<VerificationActivity> {
    const hourly = [
      3200, 2800, 2500, 2200, 1900, 2100, 2800, 4200, 5800, 7200, 8500, 9200,
      8800, 8400, 7900, 8200, 8600, 9100, 8800, 7600, 6500, 5200, 4100, 3500,
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

  // 获取争议趋势数据
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

  // 获取收益趋势数据
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
}
