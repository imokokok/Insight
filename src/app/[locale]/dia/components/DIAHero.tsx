'use client';

import { OracleHero, StatItem } from '@/components/oracle/data-display/OracleHero';
import { OracleConfig } from '@/lib/config/oracles';
import { PriceData } from '@/types/oracle';
import { TrendingUp, TrendingDown, Activity, Globe, Database, Wallet, Zap, Shield } from 'lucide-react';

export interface DIAHeroProps {
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

export function DIAHero({
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
}: DIAHeroProps) {
  // 生成价格 sparkline 数据
  const priceSparklineData = historicalData.length > 0
    ? historicalData.slice(-20).map(d => d.price)
    : [];

  // 计算 24h 变化
  const currentPrice = price?.price ?? config.marketData.change24hValue ?? 0;
  const priceChange24h = config.marketData.change24h ?? 0;
  const isPositive = priceChange24h >= 0;

  // 构建 8 个统计项
  const stats: StatItem[] = [
    {
      title: 'DIA Price',
      value: `$${currentPrice.toFixed(2)}`,
      change: `${isPositive ? '+' : ''}${priceChange24h.toFixed(2)}%`,
      changeType: isPositive ? 'positive' : 'negative',
      icon: <Activity className="w-4 h-4" />,
      sparklineData: priceSparklineData,
    },
    {
      title: '24h Change',
      value: `${isPositive ? '+' : ''}${priceChange24h.toFixed(2)}%`,
      change: isPositive ? '↑ Trending' : '↓ Trending',
      changeType: isPositive ? 'positive' : 'negative',
      icon: isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />,
    },
    {
      title: 'Active Data Sources',
      value: '100+',
      change: '+5%',
      changeType: 'positive',
      icon: <Database className="w-4 h-4" />,
      subtitle: 'Data providers',
    },
    {
      title: 'Supported Chains',
      value: String(config.supportedChains.length),
      change: '+1',
      changeType: 'positive',
      icon: <Globe className="w-4 h-4" />,
      subtitle: 'Blockchains',
    },
    {
      title: 'Data Feeds',
      value: String(config.networkData.dataFeeds),
      change: '+12%',
      changeType: 'positive',
      icon: <Zap className="w-4 h-4" />,
      subtitle: 'Active feeds',
    },
    {
      title: 'NFT Data Sources',
      value: '50+',
      change: '+8%',
      changeType: 'positive',
      icon: <Wallet className="w-4 h-4" />,
      subtitle: 'NFT collections',
    },
    {
      title: 'Network Uptime',
      value: `${networkStats?.nodeUptime ?? config.networkData.nodeUptime}%`,
      change: 'Stable',
      changeType: 'positive',
      icon: <Shield className="w-4 h-4" />,
      subtitle: 'Last 30 days',
    },
    {
      title: 'Staking Rewards',
      value: '8.5%',
      change: 'APR',
      changeType: 'positive',
      icon: <TrendingUp className="w-4 h-4" />,
      subtitle: 'Annual yield',
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
      themeColor="#ea580c"
    />
  );
}

export default DIAHero;
