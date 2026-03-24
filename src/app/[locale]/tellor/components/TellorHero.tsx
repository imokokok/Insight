'use client';

import { OracleHero, StatItem } from '@/components/oracle/common/OracleHero';
import { OracleConfig } from '@/lib/config/oracles';
import { PriceData } from '@/types/oracle';
import { TrendingUp, TrendingDown, Activity, Globe, Database, Wallet, Zap, Shield } from 'lucide-react';

export interface TellorHeroProps {
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

export function TellorHero({
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
}: TellorHeroProps) {
  const currentPrice = price?.price ?? config.marketData.change24hValue ?? 0;
  const priceChange24h = config.marketData.change24h ?? 0;
  const isPositive = priceChange24h >= 0;

  // 生成价格 sparkline 数据
  const sparklineData = historicalData.length > 0
    ? historicalData.slice(-20).map(d => d.price)
    : undefined;

  const stats: StatItem[] = [
    {
      title: 'TRB Price',
      value: `$${currentPrice.toFixed(2)}`,
      change: `${isPositive ? '+' : ''}${priceChange24h.toFixed(2)}%`,
      changeType: isPositive ? 'positive' : 'negative',
      icon: <TrendingUp className="w-4 h-4" />,
      sparklineData,
    },
    {
      title: '24h Change',
      value: `${isPositive ? '+' : ''}${priceChange24h.toFixed(2)}%`,
      change: isPositive ? 'Bullish' : 'Bearish',
      changeType: isPositive ? 'positive' : 'negative',
      icon: <TrendingDown className="w-4 h-4" />,
    },
    {
      title: 'Active Reporters',
      value: '50+',
      change: '+3%',
      changeType: 'positive',
      icon: <Activity className="w-4 h-4" />,
      subtitle: 'Decentralized',
    },
    {
      title: 'Supported Chains',
      value: `${config.supportedChains.length}+`,
      change: 'Multi-chain',
      changeType: 'neutral',
      icon: <Globe className="w-4 h-4" />,
    },
    {
      title: 'Data Feeds',
      value: `${config.networkData.dataFeeds}+`,
      change: '+8%',
      changeType: 'positive',
      icon: <Database className="w-4 h-4" />,
    },
    {
      title: 'Staking APY',
      value: '15%',
      change: 'High Yield',
      changeType: 'positive',
      icon: <Wallet className="w-4 h-4" />,
      subtitle: 'TRB Rewards',
    },
    {
      title: 'Network Uptime',
      value: `${(networkStats?.nodeUptime ?? config.networkData.nodeUptime).toFixed(2)}%`,
      change: 'Reliable',
      changeType: 'positive',
      icon: <Zap className="w-4 h-4" />,
    },
    {
      title: 'Dispute Resolution',
      value: '99.5%',
      change: 'Fair',
      changeType: 'positive',
      icon: <Shield className="w-4 h-4" />,
      subtitle: 'Dispute Rate',
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
      themeColor="#0891b2"
    />
  );
}

export default TellorHero;
