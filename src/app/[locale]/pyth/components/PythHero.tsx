'use client';

import { OracleHero, StatItem } from '@/components/oracle/data-display/OracleHero';
import { OracleConfig } from '@/lib/config/oracles';
import { PriceData } from '@/types/oracle';
import { useTranslations } from '@/i18n';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Database,
  Globe,
  Activity,
  Zap,
  Shield,
} from 'lucide-react';

export interface PythHeroProps {
  config: OracleConfig;
  price: PriceData | null;
  historicalData: PriceData[];
  networkStats?: {
    avgResponseTime: number;
    nodeUptime: number;
    dataFeeds: number;
  };
  publishers?: unknown[];
  validators?: unknown[];
  isLoading: boolean;
  isError: boolean;
  isRefreshing: boolean;
  lastUpdated: Date | null;
  onRefresh: () => void;
  onExport: () => void;
}

export function PythHero({
  config,
  price,
  historicalData,
  networkStats,
  publishers,
  validators,
  isLoading,
  isError,
  isRefreshing,
  lastUpdated,
  onRefresh,
  onExport,
}: PythHeroProps) {
  const t = useTranslations();

  const currentPrice = price?.price ?? config.marketData.change24hValue ?? 0;
  const priceChange24h = config.marketData.change24h ?? 0;
  const isPositive = priceChange24h >= 0;

  // 生成价格 sparkline 数据
  const sparklineData = historicalData.length > 0
    ? historicalData.slice(-20).map(d => d.price)
    : undefined;

  const stats: StatItem[] = [
    {
      title: t('pyth.stats.pythPrice'),
      value: `$${currentPrice.toFixed(2)}`,
      change: `${isPositive ? '+' : ''}${priceChange24h.toFixed(2)}%`,
      changeType: isPositive ? 'positive' : 'negative',
      icon: isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />,
      sparklineData,
    },
    {
      title: t('pyth.stats.change24h'),
      value: `${isPositive ? '+' : ''}${priceChange24h.toFixed(2)}%`,
      change: '24h',
      changeType: isPositive ? 'positive' : 'negative',
      icon: isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />,
    },
    {
      title: t('pyth.stats.publisherCount'),
      value: `${publishers?.length ?? 90}+`,
      change: '+8%',
      changeType: 'positive',
      icon: <Users className="w-4 h-4" />,
    },
    {
      title: t('pyth.stats.dataFeeds'),
      value: `${networkStats?.dataFeeds ?? 500}+`,
      change: '+12%',
      changeType: 'positive',
      icon: <Database className="w-4 h-4" />,
    },
    {
      title: t('pyth.stats.crossChainSupport'),
      value: `${config.supportedChains.length}+`,
      change: '0%',
      changeType: 'neutral',
      icon: <Globe className="w-4 h-4" />,
    },
    {
      title: t('pyth.stats.networkUptime'),
      value: `${networkStats?.nodeUptime ?? 99.9}%`,
      change: '+0.05%',
      changeType: 'positive',
      icon: <Activity className="w-4 h-4" />,
    },
    {
      title: t('pyth.stats.avgResponseTime'),
      value: `${networkStats?.avgResponseTime ?? 245}ms`,
      change: '-12ms',
      changeType: 'positive',
      icon: <Zap className="w-4 h-4" />,
    },
    {
      title: t('pyth.stats.validatorCount'),
      value: `${validators?.length ?? 50}+`,
      change: '+5%',
      changeType: 'positive',
      icon: <Shield className="w-4 h-4" />,
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
      themeColor="#7c3aed"
    />
  );
}

export default PythHero;
