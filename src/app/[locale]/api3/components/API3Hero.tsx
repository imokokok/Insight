'use client';

import { OracleHero, StatItem } from '@/components/oracle/common/OracleHero';
import { OracleConfig } from '@/lib/config/oracles';
import { PriceData } from '@/types/oracle';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Globe,
  Database,
  Wallet,
  Zap,
  Shield,
} from 'lucide-react';

interface AirnodeStats {
  activeAirnodes: number;
  nodeUptime: number;
  avgResponseTime: number;
}

interface DapiCoverage {
  totalDapis: number;
}

interface Staking {
  stakingApr: number;
}

export interface API3HeroProps {
  config: OracleConfig;
  price: PriceData | null;
  historicalData: PriceData[];
  airnodeStats?: AirnodeStats;
  dapiCoverage?: DapiCoverage;
  staking?: Staking;
  isLoading: boolean;
  isError: boolean;
  isRefreshing: boolean;
  lastUpdated: Date | null;
  onRefresh: () => void;
  onExport: () => void;
}

export function API3Hero({
  config,
  price,
  historicalData,
  airnodeStats,
  dapiCoverage,
  staking,
  isLoading,
  isError,
  isRefreshing,
  lastUpdated,
  onRefresh,
  onExport,
}: API3HeroProps) {
  const currentPrice = price?.price ?? config.marketData.change24hValue ?? 0;
  const priceChange24h = config.marketData.change24h ?? 0;
  const isPositive = priceChange24h >= 0;

  // 生成价格 sparkline 数据
  const sparklineData = historicalData.length > 0
    ? historicalData.map(d => d.price)
    : undefined;

  // 创建 8 个统计项
  const stats: StatItem[] = [
    // 1. API3 价格
    {
      title: 'API3 Price',
      value: `$${currentPrice.toFixed(2)}`,
      change: `${isPositive ? '+' : ''}${priceChange24h.toFixed(2)}%`,
      changeType: isPositive ? 'positive' : 'negative',
      icon: <TrendingUp className="w-4 h-4" />,
      sparklineData,
    },
    // 2. 24h 变化
    {
      title: '24h Change',
      value: `${isPositive ? '+' : ''}${priceChange24h.toFixed(2)}%`,
      change: isPositive ? '↑ Bullish' : '↓ Bearish',
      changeType: isPositive ? 'positive' : 'negative',
      icon: isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />,
    },
    // 3. Active Airnodes
    {
      title: 'Active Airnodes',
      value: `${airnodeStats?.activeAirnodes ?? 50}+`,
      change: '+3%',
      changeType: 'positive',
      icon: <Activity className="w-4 h-4" />,
    },
    // 4. dAPI feeds
    {
      title: 'dAPI Feeds',
      value: `${dapiCoverage?.totalDapis ?? 150}+`,
      change: '+8%',
      changeType: 'positive',
      icon: <Database className="w-4 h-4" />,
    },
    // 5. Staking APR
    {
      title: 'Staking APR',
      value: `${staking?.stakingApr ?? 12.5}%`,
      change: '+2.1%',
      changeType: 'positive',
      icon: <Wallet className="w-4 h-4" />,
    },
    // 6. Network uptime
    {
      title: 'Network Uptime',
      value: `${airnodeStats?.nodeUptime ?? 99.8}%`,
      change: '+0.1%',
      changeType: 'positive',
      icon: <Shield className="w-4 h-4" />,
    },
    // 7. Supported chains
    {
      title: 'Supported Chains',
      value: `${config.supportedChains.length}+`,
      change: '+2',
      changeType: 'positive',
      icon: <Globe className="w-4 h-4" />,
    },
    // 8. Average response time
    {
      title: 'Avg Response Time',
      value: `${airnodeStats?.avgResponseTime ?? 200}ms`,
      change: '-5ms',
      changeType: 'positive',
      icon: <Zap className="w-4 h-4" />,
    },
  ];

  return (
    <OracleHero
      config={config}
      price={price}
      historicalData={historicalData}
      stats={stats}
      networkStats={{
        avgResponseTime: airnodeStats?.avgResponseTime ?? 200,
        nodeUptime: airnodeStats?.nodeUptime ?? 99.8,
        dataFeeds: dapiCoverage?.totalDapis ?? 150,
      }}
      isLoading={isLoading}
      isError={isError}
      isRefreshing={isRefreshing}
      lastUpdated={lastUpdated}
      onRefresh={onRefresh}
      onExport={onExport}
      themeColor="#059669"
    />
  );
}

export default API3Hero;
