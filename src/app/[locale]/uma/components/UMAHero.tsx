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
  Shield,
  Zap,
  Wallet,
} from 'lucide-react';

export interface UMAHeroProps {
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

export function UMAHero({
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
}: UMAHeroProps) {
  const currentPrice = price?.price ?? config.marketData.change24hValue ?? 0;
  const priceChange24h = config.marketData.change24h ?? 0;
  const isPositive = priceChange24h >= 0;

  // 生成价格 sparkline 数据
  const priceSparklineData = historicalData.length > 0
    ? historicalData.map((d) => d.price)
    : Array(20).fill(currentPrice).map((p, i) => p * (1 + (Math.random() - 0.5) * 0.02));

  const stats: StatItem[] = [
    {
      title: 'UMA Price',
      value: `$${currentPrice.toFixed(2)}`,
      change: `${isPositive ? '+' : ''}${priceChange24h.toFixed(2)}%`,
      changeType: isPositive ? 'positive' : 'negative',
      icon: <TrendingUp className="w-4 h-4" />,
      sparklineData: priceSparklineData,
    },
    {
      title: '24h Change',
      value: `${isPositive ? '+' : ''}${priceChange24h.toFixed(2)}%`,
      change: isPositive ? '↑' : '↓',
      changeType: isPositive ? 'positive' : 'negative',
      icon: <Activity className="w-4 h-4" />,
    },
    {
      title: 'Active Validators',
      value: '100+',
      change: '+5%',
      changeType: 'positive',
      icon: <Shield className="w-4 h-4" />,
    },
    {
      title: 'Supported Chains',
      value: `${config.supportedChains.length}`,
      change: '0%',
      changeType: 'neutral',
      icon: <Globe className="w-4 h-4" />,
    },
    {
      title: 'Optimistic Oracle Requests',
      value: '10,000+',
      change: '+12%',
      changeType: 'positive',
      icon: <Database className="w-4 h-4" />,
    },
    {
      title: 'Dispute Resolution Rate',
      value: '98%',
      change: '+2%',
      changeType: 'positive',
      icon: <Zap className="w-4 h-4" />,
    },
    {
      title: 'Network Uptime',
      value: `${networkStats?.nodeUptime ?? config.networkData.nodeUptime}%`,
      change: '0%',
      changeType: 'neutral',
      icon: <Activity className="w-4 h-4" />,
    },
    {
      title: 'TVS',
      value: '$500M+',
      change: '+8%',
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
      themeColor="#db2777"
    />
  );
}

export default UMAHero;
