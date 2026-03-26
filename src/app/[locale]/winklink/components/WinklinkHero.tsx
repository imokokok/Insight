'use client';

import { OracleHero, StatItem } from '@/components/oracle/data-display/OracleHero';
import { OracleConfig } from '@/lib/config/oracles';
import { PriceData } from '@/types/oracle';
import { TrendingUp, TrendingDown, Activity, Globe, Database, Wallet } from 'lucide-react';

interface WinklinkHeroProps {
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

export default function WinklinkHero({
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
}: WinklinkHeroProps) {
  const currentPrice = price?.price ?? config.marketData.change24hValue ?? 0;
  const priceChange24h = config.marketData.change24h ?? 0;
  const isPositive = priceChange24h >= 0;

  // 生成价格 sparkline 数据
  const sparklineData = historicalData.length > 0
    ? historicalData.slice(-20).map(d => d.price)
    : undefined;

  const stats: StatItem[] = [
    {
      title: 'WIN Price',
      value: `$${currentPrice.toFixed(6)}`,
      change: `${isPositive ? '+' : ''}${priceChange24h.toFixed(2)}%`,
      changeType: isPositive ? 'positive' : 'negative',
      icon: isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />,
      sparklineData,
    },
    {
      title: '24h Change',
      value: `${isPositive ? '+' : ''}${priceChange24h.toFixed(2)}%`,
      changeType: isPositive ? 'positive' : 'negative',
      icon: <Activity className="w-4 h-4" />,
    },
    {
      title: 'Gaming Data Feeds',
      value: '20+',
      changeType: 'neutral',
      icon: <Database className="w-4 h-4" />,
    },
    {
      title: 'TRON Ecosystem Partners',
      value: '50+',
      changeType: 'neutral',
      icon: <Globe className="w-4 h-4" />,
    },
    {
      title: 'Supported Chains',
      value: `${config.supportedChains.length}`,
      changeType: 'neutral',
      icon: <Globe className="w-4 h-4" />,
    },
    {
      title: 'Data Feeds',
      value: `${config.networkData.dataFeeds}`,
      changeType: 'neutral',
      icon: <Database className="w-4 h-4" />,
    },
    {
      title: 'Network Uptime',
      value: `${networkStats?.nodeUptime ?? config.networkData.nodeUptime}%`,
      changeType: 'positive',
      icon: <Activity className="w-4 h-4" />,
    },
    {
      title: 'Staking Rewards',
      value: '12%',
      changeType: 'positive',
      icon: <Wallet className="w-4 h-4" />,
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
      themeColor="#ef4444"
    />
  );
}
