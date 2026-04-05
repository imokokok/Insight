'use client';

import { useMemo } from 'react';

import {
  Activity,
  Globe,
  Database,
  Wallet,
  Zap,
  Shield,
  Clock,
  Server,
  TrendingUp,
} from 'lucide-react';

import {
  SparklineMemo,
  EnhancedCoreStats,
  CompactMetricsRow,
  ActionButtons,
  MiniPriceChart,
  UnifiedInfoSection,
  type StatItem,
} from '@/components/oracle/shared/HeroComponents';
import { LiveStatusBar, OptimizedImage } from '@/components/ui';
import { useTranslations } from '@/i18n';
import { type OracleConfig } from '@/lib/config/oracles';
import { type PriceData } from '@/types/oracle';

export interface DIAHeroProps {
  config: OracleConfig;
  price: PriceData | null;
  historicalData: PriceData[];
  networkStats?: {
    avgResponseTime: number;
    nodeUptime: number;
    dataFeeds: number;
  } | null;
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
  const t = useTranslations();

  const themeColor = config.themeColor;

  const currentPrice = price?.price ?? config.marketData.change24hValue ?? 0;
  const priceChange24h = config.marketData.change24h ?? 0;
  const isPositive = priceChange24h >= 0;

  const priceSparkline = useMemo(() => {
    if (historicalData.length > 0) {
      return historicalData.slice(-24).map((d) => d.price);
    }
    // Return empty array when no historical data available
    return [];
  }, [historicalData]);

  const formatStakedValue = (value: number): string => {
    if (value >= 1e6) {
      return `${(value / 1e6).toFixed(1)}M`;
    }
    if (value >= 1e3) {
      return `${(value / 1e3).toFixed(1)}K`;
    }
    return value.toString();
  };

  const activeDataSources = config.networkData.activeNodes;
  const totalStaked = config.networkData.totalStaked;

  const primaryStats: StatItem[] = [
    {
      title: `${t('dia.title')} ${t('dia.hero.price')}`,
      value: `$${currentPrice.toFixed(4)}`,
      change: `${isPositive ? '+' : ''}${priceChange24h.toFixed(2)}%`,
      changeType: isPositive ? 'positive' : 'negative',
      icon: <Activity className="w-5 h-5" />,
      subtitle: t('dia.hero.change24h'),
      sparklineData: priceSparkline,
    },
    {
      title: t('dia.stats.marketCap'),
      value: `$${(config.marketData.marketCap / 1e6).toFixed(1)}M`,
      change: config.marketData.change24h
        ? `${config.marketData.change24h >= 0 ? '+' : ''}${config.marketData.change24h.toFixed(1)}%`
        : undefined,
      changeType: (config.marketData.change24h ?? 0) >= 0 ? 'positive' : 'negative',
      icon: <Wallet className="w-5 h-5" />,
      subtitle: config.marketData.change24h ? t('dia.hero.change24h') : undefined,
    },
    {
      title: t('dia.stats.activeDataSources'),
      value: activeDataSources ? `${activeDataSources}+` : '--',
      icon: <Database className="w-5 h-5" />,
      subtitle: t('dia.hero.dataProviders'),
      changeType: 'neutral' as const,
    },
    {
      title: t('dia.stats.dataFeeds'),
      value: `${networkStats?.dataFeeds ?? config.networkData.dataFeeds}`,
      icon: <Zap className="w-5 h-5" />,
      changeType: 'neutral',
    },
    {
      title: t('dia.hero.stakedAmount'),
      value: totalStaked ? formatStakedValue(totalStaked) : '--',
      icon: <Shield className="w-5 h-5" />,
      subtitle: config.networkData.stakingTokenSymbol
        ? `${t('dia.hero.stakingToken')}: ${config.networkData.stakingTokenSymbol}`
        : undefined,
      changeType: 'neutral',
    },
  ];

  const secondaryStats: StatItem[] = [
    {
      title: t('dia.hero.supportedChains'),
      value: `${config.supportedChains.length}+`,
      icon: <Globe className="w-4 h-4" />,
      changeType: 'neutral',
    },
    {
      title: t('dia.stats.avgResponseTime'),
      value: `${networkStats?.avgResponseTime ?? config.networkData.avgResponseTime}ms`,
      icon: <Clock className="w-4 h-4" />,
      changeType: 'neutral',
    },
    {
      title: t('dia.stats.nodeUptime'),
      value: `${networkStats?.nodeUptime ?? config.networkData.nodeUptime}%`,
      icon: <Server className="w-4 h-4" />,
      changeType: 'neutral',
    },
    {
      title: t('dia.volume24h'),
      value: config.marketData.volume24h
        ? `$${(config.marketData.volume24h / 1e6).toFixed(1)}M`
        : '--',
      icon: <TrendingUp className="w-4 h-4" />,
      changeType: 'neutral',
    },
  ];

  const healthScore = useMemo(() => {
    const uptimeScore = (networkStats?.nodeUptime ?? config.networkData.nodeUptime) * 0.4;
    const responseScore =
      Math.max(0, 100 - (networkStats?.avgResponseTime ?? config.networkData.avgResponseTime) / 5) *
      0.3;
    const feedScore =
      Math.min(100, (networkStats?.dataFeeds ?? config.networkData.dataFeeds) / 5) * 0.3;
    return Math.round(uptimeScore + responseScore + feedScore);
  }, [config, networkStats]);

  const miniPriceChartLabels = useMemo(
    () => ({
      trend24h: t('dia.hero.24hTrend'),
      before24h: t('dia.hero.24hAgo'),
      now: t('dia.hero.now'),
    }),
    [t]
  );

  const unifiedInfoLabels = useMemo(
    () => ({
      healthScore: t('dia.hero.healthScore'),
      gas: t('dia.hero.gas'),
      response: t('dia.hero.response'),
      online: t('dia.hero.online'),
      support: t('dia.hero.support'),
      chains: t('dia.hero.chains'),
      gasLow: t('dia.hero.gasLevel.low'),
      gasMedium: t('dia.hero.gasLevel.medium'),
      gasHigh: t('dia.hero.gasLevel.high'),
    }),
    [t]
  );

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <LiveStatusBar
            isConnected={!isError}
            latency={networkStats?.avgResponseTime ?? config.networkData.avgResponseTime}
            lastUpdate={lastUpdated || undefined}
          />
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)` }}
            >
              <OptimizedImage
                src="/logos/oracles/dia.svg"
                alt="DIA"
                width={28}
                height={28}
                priority
                className="w-7 h-7"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{t('dia.title')}</h1>
              <p className="text-xs text-gray-500">{t('dia.subtitle')}</p>
            </div>
          </div>

          <div className="hidden lg:block">
            <ActionButtons
              onRefresh={onRefresh}
              onExport={onExport}
              isRefreshing={isRefreshing}
              themeColor={themeColor}
            />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          <div className="flex-1 lg:w-[70%] lg:flex-none">
            <EnhancedCoreStats stats={primaryStats} themeColor={themeColor} />

            <CompactMetricsRow stats={secondaryStats} />

            <UnifiedInfoSection
              networkStats={networkStats ?? undefined}
              healthScore={healthScore}
              chains={config.supportedChains}
              themeColor={themeColor}
              labels={unifiedInfoLabels}
            />
          </div>

          <div className="hidden lg:block w-px bg-gray-200 self-stretch" />

          <div className="lg:w-[30%] flex flex-col gap-3">
            <div className="lg:hidden">
              <ActionButtons
                onRefresh={onRefresh}
                onExport={onExport}
                isRefreshing={isRefreshing}
                themeColor={themeColor}
              />
            </div>

            <div className="p-3 rounded-xl bg-gray-50/50 border border-gray-100 flex-1">
              <MiniPriceChart
                historicalData={historicalData}
                currentPrice={price}
                themeColor={themeColor}
                labels={miniPriceChartLabels}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DIAHero;
