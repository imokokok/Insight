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

export interface RedStoneHeroProps {
  config: OracleConfig;
  price: PriceData | null;
  historicalData: PriceData[];
  networkStats?: {
    avgResponseTime: number;
    nodeUptime: number;
    dataFeeds: number;
  };
  isLoading: boolean;
  isError: boolean;
  isRefreshing: boolean;
  lastUpdated: Date | null;
  onRefresh: () => void;
  onExport: () => void;
}

export function RedStoneHero({
  config,
  price,
  historicalData,
  networkStats,
  isLoading,
  isError,
  isRefreshing,
  lastUpdated,
  onRefresh,
  onExport,
}: RedStoneHeroProps) {
  // 生成价格走势图数据
  const sparklineData = historicalData.length > 0
    ? historicalData.slice(-20).map(d => d.price)
    : undefined;

  // 计算24小时变化
  const priceChange24h = config.marketData.change24h ?? 0;
  const isPositive = priceChange24h >= 0;

  const stats: StatItem[] = [
    {
      title: 'RedStone Price',
      value: price?.price ? `$${price.price.toFixed(2)}` : '$0.00',
      change: `${isPositive ? '+' : ''}${priceChange24h.toFixed(2)}%`,
      changeType: isPositive ? 'positive' : 'negative',
      icon: <Activity className="w-4 h-4" />,
      sparklineData,
    },
    {
      title: '24h Change',
      value: `${isPositive ? '+' : ''}${priceChange24h.toFixed(2)}%`,
      change: isPositive ? '↑ Trending Up' : '↓ Trending Down',
      changeType: isPositive ? 'positive' : 'negative',
      icon: isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />,
    },
    {
      title: 'Data Providers',
      value: '100+',
      change: '+12',
      changeType: 'positive',
      icon: <Database className="w-4 h-4" />,
      subtitle: 'Active providers',
    },
    {
      title: 'Supported Chains',
      value: `${config.supportedChains.length}+`,
      change: '+2',
      changeType: 'positive',
      icon: <Globe className="w-4 h-4" />,
      subtitle: 'Multi-chain',
    },
    {
      title: 'Data Streams',
      value: '1,000+',
      change: '+50',
      changeType: 'positive',
      icon: <Zap className="w-4 h-4" />,
      subtitle: 'Real-time feeds',
    },
    {
      title: 'Cross-chain Bridges',
      value: '15+',
      change: '+3',
      changeType: 'positive',
      icon: <Wallet className="w-4 h-4" />,
      subtitle: 'Bridge integrations',
    },
    {
      title: 'Network Uptime',
      value: `${networkStats?.nodeUptime ?? config.networkData.nodeUptime}%`,
      change: '+0.1%',
      changeType: 'positive',
      icon: <Shield className="w-4 h-4" />,
      subtitle: 'Last 30 days',
    },
    {
      title: 'Avg Latency',
      value: `${networkStats?.avgResponseTime ?? config.networkData.avgResponseTime}ms`,
      change: '-15ms',
      changeType: 'positive',
      icon: <Activity className="w-4 h-4" />,
      subtitle: 'Response time',
    },
  ];

  return (
    <OracleHero
      config={config}
      price={price}
      historicalData={historicalData}
      stats={stats}
      networkStats={networkStats}
      isLoading={isLoading}
      isError={isError}
      isRefreshing={isRefreshing}
      lastUpdated={lastUpdated}
      onRefresh={onRefresh}
      onExport={onExport}
      themeColor="#dc2626"
    />
  );
}

export default RedStoneHero;
