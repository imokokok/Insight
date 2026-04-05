'use client';

import { useState, useMemo } from 'react';

import {
  TrendingUp,
  TrendingDown,
  Activity,
  Globe,
  Database,
  Shield,
  Zap,
  Wallet,
  RefreshCw,
  ExternalLink,
  Award,
  Clock,
  Server,
  TrendingUp as TrendingUpIcon,
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

import { type NetworkStats } from '../types';

export interface ChronicleHeroProps {
  config: OracleConfig;
  price: PriceData | null | undefined;
  historicalData: PriceData[];
  networkStats?: {
    avgResponseTime: number;
    nodeUptime: number;
    dataFeeds: number;
    activeValidators?: number;
  };
  isLoading: boolean;
  isError: boolean;
  isRefreshing: boolean;
  lastUpdated: Date | null;

  onRefresh: () => void;
  onExport: () => void;
}

function deterministicVariation(index: number, seed: number, amplitude: number): number {
  const x = index * 0.5 + seed;
  return Math.sin(x) * amplitude + Math.cos(x * 0.7) * amplitude * 0.5;
}

export function ChronicleHero({
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
}: ChronicleHeroProps) {
  const t = useTranslations();
  const themeColor = config.themeColor;

  const currentPrice = price?.price ?? config.marketData.change24hValue ?? 0;
  const priceChange24h = config.marketData.change24h ?? 0;
  const isPositive = priceChange24h >= 0;

  const priceSparkline = useMemo(() => {
    if (historicalData.length > 0) {
      return historicalData.slice(-24).map((d) => d.price);
    }
    return Array.from(
      { length: 24 },
      (_, i) => currentPrice * (1 + deterministicVariation(i, 1, 0.05))
    );
  }, [historicalData, currentPrice]);

  const marketCapSparkline = useMemo(() => {
    const baseMarketCap = config.marketData.marketCap / 1e6;
    return Array.from(
      { length: 24 },
      (_, i) => baseMarketCap * (1 + deterministicVariation(i, 2, 0.025))
    );
  }, [config.marketData.marketCap]);

  const validatorSparkline = useMemo(() => {
    const baseValidators = networkStats?.activeValidators ?? 45;
    return Array.from(
      { length: 24 },
      (_, i) => baseValidators + Math.floor(Math.abs(deterministicVariation(i, 3, 2.5)))
    );
  }, [networkStats?.activeValidators]);

  const dataFeedSparkline = useMemo(() => {
    const baseFeeds = networkStats?.dataFeeds ?? config.networkData.dataFeeds;
    return Array.from(
      { length: 24 },
      (_, i) => baseFeeds + Math.floor(Math.abs(deterministicVariation(i, 4, 1.5)))
    );
  }, [networkStats?.dataFeeds, config.networkData.dataFeeds]);

  const stakingSparkline = useMemo(() => {
    const baseStaking = config.marketData.circulatingSupply / 1e6;
    return Array.from(
      { length: 24 },
      (_, i) => baseStaking * (1 + deterministicVariation(i, 5, 0.015))
    );
  }, [config.marketData.circulatingSupply]);

  const primaryStats: StatItem[] = [
    {
      title: t('chronicle.hero.price'),
      value: `$${currentPrice.toFixed(2)}`,
      change: `${isPositive ? '+' : ''}${priceChange24h.toFixed(2)}%`,
      changeType: isPositive ? 'positive' : 'negative',
      icon: <Activity className="w-4 h-4" />,
      subtitle: '24h',
      sparklineData: priceSparkline,
    },
    {
      title: t('chronicle.hero.tvs'),
      value: `$${(config.marketData.marketCap / 1e6).toFixed(1)}M`,
      change: '+5.2%',
      changeType: 'positive',
      icon: <Wallet className="w-4 h-4" />,
      subtitle: '7d',
      sparklineData: marketCapSparkline,
    },
    {
      title: t('chronicle.hero.validators'),
      value: `${networkStats?.activeValidators ?? config.networkData.activeNodes}+`,
      change: '+3',
      changeType: 'positive',
      icon: <Shield className="w-4 h-4" />,
      subtitle: t('chronicle.stats.thisMonth'),
      sparklineData: validatorSparkline,
    },
    {
      title: t('chronicle.hero.dataFeeds'),
      value: `${networkStats?.dataFeeds ?? config.networkData.dataFeeds}`,
      change: '+12',
      changeType: 'positive',
      icon: <Database className="w-4 h-4" />,
      subtitle: t('chronicle.stats.thisWeek'),
      sparklineData: dataFeedSparkline,
    },
    {
      title: t('chronicle.hero.staking'),
      value: `${(config.marketData.circulatingSupply / 1e6).toFixed(1)}M`,
      change: '+3.7%',
      changeType: 'positive',
      icon: <Zap className="w-4 h-4" />,
      subtitle: '7d',
      sparklineData: stakingSparkline,
    },
  ];

  const secondaryStats: StatItem[] = [
    {
      title: t('chronicle.hero.supportedChains'),
      value: `${config.supportedChains.length}+`,
      change: undefined,
      changeType: 'neutral',
      icon: <Globe className="w-3.5 h-3.5" />,
    },
    {
      title: t('chronicle.hero.avgResponse'),
      value: `${config.networkData.avgResponseTime}ms`,
      change: '-15%',
      changeType: 'positive',
      icon: <Clock className="w-3.5 h-3.5" />,
    },
    {
      title: t('chronicle.hero.uptime'),
      value: `${networkStats?.nodeUptime ?? config.networkData.nodeUptime}%`,
      change: '+0.02%',
      changeType: 'positive',
      icon: <Award className="w-3.5 h-3.5" />,
    },
    {
      title: t('chronicle.hero.nodes'),
      value: `${config.networkData.activeNodes}`,
      change: '+2',
      changeType: 'positive',
      icon: <Server className="w-3.5 h-3.5" />,
    },
  ];

  const healthScore = useMemo(() => {
    const uptimeScore = config.networkData.nodeUptime * 0.4;
    const responseScore = Math.max(0, 100 - config.networkData.avgResponseTime / 5) * 0.3;
    const feedScore = Math.min(100, config.networkData.dataFeeds / 10) * 0.3;
    return Math.round(uptimeScore + responseScore + feedScore);
  }, [config]);

  const miniPriceChartLabels = {
    trend24h: t('chronicle.hero.trend24h'),
    before24h: t('chronicle.hero.24hAgo'),
    now: t('chronicle.hero.now'),
  };

  const unifiedInfoLabels = {
    healthScore: t('chronicle.hero.health'),
    gas: t('chronicle.hero.gas'),
    response: t('chronicle.hero.response'),
    online: t('chronicle.hero.online'),
    support: t('chronicle.hero.support'),
    chains: t('chronicle.hero.supportedChains'),
    gasLow: t('chronicle.securityLevel.low'),
    gasMedium: t('chronicle.securityLevel.medium'),
    gasHigh: t('chronicle.securityLevel.high'),
  };

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
                src="/logos/oracles/chronicle.svg"
                alt="Chronicle"
                width={28}
                height={28}
                priority
                className="w-7 h-7"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Chronicle</h1>
              <p className="text-xs text-gray-500">{t('chronicle.subtitle')}</p>
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
              networkStats={networkStats}
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
                currentPrice={price ?? null}
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

export default ChronicleHero;
