'use client';

import { useMemo } from 'react';
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
  Layers,
} from 'lucide-react';

export interface BandProtocolHeroProps {
  config: OracleConfig;
  price: PriceData | null;
  historicalData: PriceData[];
  networkStats?: {
    avgResponseTime: number;
    nodeUptime: number;
    dataFeeds: number;
  };
  validators?: {
    totalValidators: number;
    activeValidators: number;
    averageUptime: number;
  };
  crossChainStats?: {
    supportedChains: string[];
    bridgeVolume24h: number;
    activeBridges: number;
  };
  isLoading: boolean;
  isError: boolean;
  isRefreshing: boolean;
  lastUpdated: Date | null;
  onRefresh: () => void;
  onExport: () => void;
}

export function BandProtocolHero({
  config,
  price,
  historicalData,
  networkStats,
  validators,
  crossChainStats,
  isLoading,
  isError,
  isRefreshing,
  lastUpdated,
  onRefresh,
  onExport,
}: BandProtocolHeroProps) {
  const currentPrice = price?.price ?? config.marketData.change24hValue ?? 0;
  const priceChange24h = config.marketData.change24h ?? 0;
  const isPositive = priceChange24h >= 0;

  // 生成价格 sparkline 数据
  const priceSparklineData = useMemo(() => {
    if (!historicalData || historicalData.length < 2) {
      return [currentPrice, currentPrice * (1 + priceChange24h / 100)];
    }
    return historicalData.map((d) => d.price);
  }, [historicalData, currentPrice, priceChange24h]);

  // 构建 8 个统计指标
  const stats: StatItem[] = useMemo(() => {
    return [
      {
        title: 'BAND Price',
        value: `$${currentPrice.toFixed(2)}`,
        change: `${isPositive ? '+' : ''}${priceChange24h.toFixed(2)}%`,
        changeType: isPositive ? 'positive' : 'negative',
        icon: <Activity className="w-4 h-4" />,
        sparklineData: priceSparklineData,
      },
      {
        title: '24h Change',
        value: `${isPositive ? '+' : ''}${priceChange24h.toFixed(2)}%`,
        change: isPositive ? '↑ Bullish' : '↓ Bearish',
        changeType: isPositive ? 'positive' : 'negative',
        icon: isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />,
      },
      {
        title: 'Active Validators',
        value: `${config.networkData.bandProtocolMetrics?.activeValidators || validators?.activeValidators || 70}+`,
        change: '+2%',
        changeType: 'positive',
        icon: <Shield className="w-4 h-4" />,
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
        value: `${config.networkData.dataFeeds.toLocaleString()}+`,
        change: '+8%',
        changeType: 'positive',
        icon: <Database className="w-4 h-4" />,
      },
      {
        title: 'Staking Ratio',
        value: `${config.networkData.bandProtocolMetrics?.stakingRate?.toFixed(1) || '51.5'}%`,
        change: '+1.2%',
        changeType: 'positive',
        icon: <Zap className="w-4 h-4" />,
      },
      {
        title: 'Network Uptime',
        value: `${networkStats?.nodeUptime?.toFixed(2) || '99.9'}%`,
        change: 'Stable',
        changeType: 'positive',
        icon: <Activity className="w-4 h-4" />,
      },
      {
        title: 'Cross-chain Bridges',
        value: `${crossChainStats?.supportedChains?.length || config.supportedChains.length}+`,
        change: 'Active',
        changeType: 'positive',
        icon: <Layers className="w-4 h-4" />,
      },
    ];
  }, [
    currentPrice,
    priceChange24h,
    isPositive,
    priceSparklineData,
    config.networkData.bandProtocolMetrics,
    config.networkData.dataFeeds,
    config.supportedChains,
    validators?.activeValidators,
    networkStats?.nodeUptime,
    crossChainStats?.supportedChains,
  ]);

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
      themeColor="#9333ea"
    />
  );
}

export default BandProtocolHero;
