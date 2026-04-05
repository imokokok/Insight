'use client';

import { useMemo } from 'react';

import {
  TrendingUp,
  TrendingDown,
  Activity,
  Globe,
  Database,
  Wallet,
  Zap,
  Shield,
  Bell,
  FileText,
  RefreshCw,
  ExternalLink,
  Plus,
  Clock,
  Coins,
  Server,
  BarChart3,
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

function QuickActions({ themeColor: _themeColor }: { themeColor: string }) {
  const t = useTranslations();

  const actions = [
    {
      icon: <ExternalLink className="w-3.5 h-3.5" />,
      label: t('band.bandProtocol.quickActions.blockExplorer'),
      href: 'https://cosmoscan.io/',
      isExternal: true,
    },
    {
      icon: <FileText className="w-3.5 h-3.5" />,
      label: t('band.bandProtocol.quickActions.apiDocs'),
      href: 'https://docs.bandchain.org/',
      isExternal: true,
    },
    {
      icon: <Bell className="w-3.5 h-3.5" />,
      label: t('band.bandProtocol.quickActions.priceAlert'),
      href: '#',
    },
    {
      icon: <Plus className="w-3.5 h-3.5" />,
      label: t('band.bandProtocol.quickActions.addMonitor'),
      href: '#',
    },
  ];

  return (
    <div className="flex flex-wrap gap-1.5">
      {actions.map((action, index) =>
        action.isExternal ? (
          <a
            key={index}
            href={action.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded text-[11px] text-gray-700 hover:border-gray-300 hover:shadow-sm transition-all"
          >
            {action.icon}
            <span>{action.label}</span>
          </a>
        ) : (
          <button
            key={index}
            className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded text-[11px] text-gray-700 hover:border-gray-300 hover:shadow-sm transition-all"
          >
            {action.icon}
            <span>{action.label}</span>
          </button>
        )
      )}
    </div>
  );
}

function LatestUpdates() {
  const t = useTranslations();

  const updates = [
    {
      type: 'price',
      text: t('band.bandProtocol.hero.updates.priceUpdate', { price: '1.24', change: '+3.2%' }),
      time: t('band.bandProtocol.hero.updates.minutesAgo', { count: 2 }),
    },
    {
      type: 'validator',
      text: t('band.bandProtocol.hero.updates.newValidator', {
        moniker: 'BandVal...8x9y',
        region: 'Asia-Pacific',
      }),
      time: t('band.bandProtocol.hero.updates.minutesAgo', { count: 5 }),
    },
    {
      type: 'feed',
      text: t('band.bandProtocol.hero.updates.feedUpdate', { symbol: 'BTC/USD' }),
      time: t('band.bandProtocol.hero.updates.minutesAgo', { count: 8 }),
    },
    {
      type: 'system',
      text: t('band.bandProtocol.hero.updates.blockHeight', { height: '12,458,923' }),
      time: t('band.bandProtocol.hero.updates.justNow'),
    },
  ];

  return (
    <div className="bg-gray-50 border-t border-gray-200 py-2 px-4">
      <div className="max-w-[1600px] mx-auto flex items-center gap-4 overflow-hidden">
        <span className="text-xs font-medium text-gray-500 flex-shrink-0">
          {t('band.bandProtocol.hero.latestUpdates')}
        </span>
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-6 animate-marquee whitespace-nowrap">
            {updates.map((update, index) => (
              <div key={index} className="flex items-center gap-2 text-xs">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    update.type === 'price'
                      ? 'bg-purple-500'
                      : update.type === 'validator'
                        ? 'bg-emerald-500'
                        : update.type === 'feed'
                          ? 'bg-violet-500'
                          : 'bg-gray-500'
                  }`}
                />
                <span className="text-gray-700">{update.text}</span>
                <span className="text-gray-400">{update.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
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
  const t = useTranslations();

  const themeColor = config.themeColor || '#7c3aed';

  const currentPrice = price?.price ?? config.marketData.change24hValue ?? 0;
  const priceChange24h = config.marketData.change24h ?? 0;
  const isPositive = priceChange24h >= 0;

  const priceSparkline = useMemo(() => {
    if (historicalData.length > 0) {
      return historicalData.slice(-24).map((d) => d.price);
    }
    return Array.from({ length: 24 }, (_, i) => {
      const seed = (i * 9301 + 49297) % 233280;
      const random = seed / 233280;
      return currentPrice * (1 + (random - 0.5) * 0.1);
    });
  }, [historicalData, currentPrice]);

  const bandMetrics = config.networkData.bandProtocolMetrics;
  const activeValidators = validators?.activeValidators ?? bandMetrics?.activeValidators ?? 70;
  const totalValidators = validators?.totalValidators ?? bandMetrics?.totalValidators ?? 100;
  const stakingRate = bandMetrics?.stakingRate ?? 51.5;

  const tMetrics = useTranslations('ui.oracleMetrics');

  const primaryStats: StatItem[] = [
    {
      title: tMetrics('bandPrice'),
      value: `$${currentPrice.toFixed(2)}`,
      change: `${isPositive ? '+' : ''}${priceChange24h.toFixed(2)}%`,
      changeType: isPositive ? 'positive' : 'negative',
      icon: <Activity className="w-4 h-4" />,
      subtitle: tMetrics('subtitle24h'),
      sparklineData: priceSparkline,
    },
    {
      title: tMetrics('marketCap'),
      value: `$${(config.marketData.marketCap / 1e6).toFixed(1)}M`,
      change: `${isPositive ? '+' : ''}${priceChange24h.toFixed(2)}%`,
      changeType: isPositive ? 'positive' : 'negative',
      icon: <Coins className="w-4 h-4" />,
      subtitle: tMetrics('subtitleFDV'),
    },
    {
      title: tMetrics('activeValidators'),
      value: `${activeValidators}`,
      change: '+2%',
      changeType: 'positive',
      icon: <Shield className="w-4 h-4" />,
      subtitle: tMetrics('totalValidators', { count: totalValidators }),
    },
    {
      title: tMetrics('dataFeeds'),
      value: `${config.networkData.dataFeeds.toLocaleString()}+`,
      change: '+8%',
      changeType: 'positive',
      icon: <Zap className="w-4 h-4" />,
      subtitle: tMetrics('subtitle24h'),
    },
    {
      title: tMetrics('stakingRatio'),
      value: `${stakingRate.toFixed(1)}%`,
      change: '+1.2%',
      changeType: 'positive',
      icon: <Wallet className="w-4 h-4" />,
      subtitle: tMetrics('stakingAPY'),
    },
  ];

  const secondaryStats: StatItem[] = [
    {
      title: tMetrics('supportedChains'),
      value: `${config.supportedChains.length}+`,
      change: tMetrics('multiChain'),
      changeType: 'neutral',
      icon: <Globe className="w-4 h-4" />,
    },
    {
      title: tMetrics('avgBlockTime'),
      value: `${bandMetrics?.blockTime ?? 2.8}s`,
      change: '-5%',
      changeType: 'positive',
      icon: <Clock className="w-4 h-4" />,
    },
    {
      title: tMetrics('crossChainBridge'),
      value: `${crossChainStats?.activeBridges ?? 8}+`,
      change: '+12%',
      changeType: 'positive',
      icon: <Database className="w-4 h-4" />,
    },
    {
      title: tMetrics('apiCalls'),
      value: `${(config.networkData.updateFrequency / 1000).toFixed(1)}K`,
      change: '+15%',
      changeType: 'positive',
      icon: <BarChart3 className="w-4 h-4" />,
    },
  ];

  const healthScore = useMemo(() => {
    const uptimeScore = (networkStats?.nodeUptime ?? 99.9) * 0.4;
    const validatorScore =
      totalValidators > 0 ? (activeValidators / totalValidators) * 100 * 0.3 : 30;
    const feedScore = Math.min(100, (config.networkData.dataFeeds || 0) / 10) * 0.3;
    const score = Math.round(uptimeScore + validatorScore + feedScore);
    return isNaN(score) ? 85 : score;
  }, [networkStats, activeValidators, totalValidators, config.networkData.dataFeeds]);

  const miniPriceChartLabels = {
    trend24h: t('band.bandProtocol.hero.trend24h'),
    before24h: t('band.bandProtocol.hero.ago24h'),
    now: t('band.bandProtocol.hero.now'),
  };

  const unifiedInfoLabels = {
    healthScore: t('band.bandProtocol.hero.health'),
    gas: t('band.bandProtocol.hero.gas'),
    response: t('band.bandProtocol.hero.response'),
    online: t('band.bandProtocol.hero.online'),
    support: t('band.bandProtocol.hero.support'),
    chains: t('band.bandProtocol.hero.chains'),
    gasLow: t('band.bandProtocol.hero.gasLevel.low'),
    gasMedium: t('band.bandProtocol.hero.gasLevel.medium'),
    gasHigh: t('band.bandProtocol.hero.gasLevel.high'),
  };

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <LiveStatusBar
            isConnected={!isError}
            latency={networkStats?.avgResponseTime ?? 180}
            lastUpdate={lastUpdated || undefined}
          />
          <QuickActions themeColor={themeColor} />
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
                src="/logos/oracles/band.svg"
                alt="Band Protocol"
                width={28}
                height={28}
                priority
                className="w-7 h-7"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{t('band.band-protocol.title')}</h1>
              <p className="text-xs text-gray-500">{t('band.bandProtocol.subtitle')}</p>
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
                currentPrice={price}
                themeColor={themeColor}
                labels={miniPriceChartLabels}
              />
            </div>
          </div>
        </div>
      </div>

      <LatestUpdates />
    </div>
  );
}

export default BandProtocolHero;
