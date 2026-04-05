'use client';

import { useMemo } from 'react';

import {
  Activity,
  Globe,
  Database,
  Wallet,
  Shield,
  Bell,
  FileText,
  Layers,
  Gamepad2,
  Cpu,
  Clock,
  Server,
  Plus,
} from 'lucide-react';

import {
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
  dataStates?: Record<string, { isLoading: boolean; isError: boolean; lastUpdated: Date | null }>;
  failedDataSources?: string[];
  loadingDataSources?: string[];

  onRefresh: () => void;
  onExport: () => void;
}

function QuickActions({ themeColor: _themeColor }: { themeColor: string }) {
  const t = useTranslations();

  const actions = [
    { icon: <Bell className="w-3.5 h-3.5" />, label: t('winklink.hero.priceAlert'), href: '#' },
    { icon: <Plus className="w-3.5 h-3.5" />, label: t('winklink.hero.addMonitor'), href: '#' },
    { icon: <FileText className="w-3.5 h-3.5" />, label: t('winklink.hero.apiDocs'), href: '#' },
    {
      icon: <Layers className="w-3.5 h-3.5" />,
      label: t('winklink.hero.switchNetwork'),
      href: '#',
    },
  ];

  return (
    <div className="flex flex-wrap gap-1.5">
      {actions.map((action, index) => (
        <button
          key={index}
          className="flex items-center gap-1 px-2 py-1 bg-white border border-gray-200 rounded text-[11px] text-gray-700 hover:border-gray-300 hover:shadow-sm transition-all"
        >
          {action.icon}
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  );
}

function LatestUpdates({ themeColor: _themeColor }: { themeColor: string }) {
  const t = useTranslations();

  const updates = [
    {
      type: 'price',
      text: t('winklink.hero.updatePrice'),
      time: t('winklink.hero.minutesAgo', { count: 2 }),
    },
    {
      type: 'node',
      text: t('winklink.hero.updateNode'),
      time: t('winklink.hero.minutesAgo', { count: 5 }),
    },
    {
      type: 'feed',
      text: t('winklink.hero.updateFeed'),
      time: t('winklink.hero.minutesAgo', { count: 8 }),
    },
    {
      type: 'system',
      text: t('winklink.hero.updateSystem'),
      time: t('winklink.hero.minutesAgo', { count: 15 }),
    },
  ];

  return (
    <div className="bg-gray-50 border-t border-gray-200 py-2 px-4">
      <div className="max-w-[1600px] mx-auto flex items-center gap-4 overflow-hidden">
        <span className="text-xs font-medium text-gray-500 flex-shrink-0">
          {t('winklink.hero.latestUpdates')}:
        </span>
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-6 animate-marquee whitespace-nowrap">
            {updates.map((update, index) => (
              <div key={index} className="flex items-center gap-2 text-xs">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    update.type === 'price'
                      ? 'bg-pink-500'
                      : update.type === 'node'
                        ? 'bg-emerald-500'
                        : update.type === 'feed'
                          ? 'bg-purple-500'
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

export default function WinklinkHero({
  config,
  price,
  historicalData,
  networkStats,
  isLoading: _isLoading,
  isError,
  isRefreshing,
  lastUpdated,
  onRefresh,
  onExport,
  dataStates,
  failedDataSources = [],
  loadingDataSources = [],
}: WinklinkHeroProps) {
  const t = useTranslations();

  const themeColor = config.themeColor || '#ec4899';

  const currentPrice = price?.price ?? config.marketData.change24hValue ?? 0;
  const priceChange24h = config.marketData.change24h ?? 0;
  const isPositive = priceChange24h >= 0;

  const sourceLabels: Record<string, string> = {
    price: t('winklink.hero.sourcePrice'),
    historical: t('winklink.hero.sourceHistorical'),
    tron: 'TRON',
    staking: t('winklink.hero.sourceStaking'),
    gaming: t('winklink.hero.sourceGaming'),
    network: t('winklink.hero.sourceNetwork'),
    risk: t('winklink.hero.sourceRisk'),
  };

  const formatLastUpdated = (date: Date | null) => {
    if (!date) return t('winklink.hero.unknown');
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return t('winklink.hero.justNow');
    if (diffMins < 60) return t('winklink.hero.minutesAgo', { count: diffMins });
    const diffHours = Math.floor(diffMins / 60);
    return t('winklink.hero.hoursAgo', { count: diffHours });
  };

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

  const primaryStats: StatItem[] = [
    {
      title: t('winklink.hero.winklinkPrice'),
      value: `$${currentPrice.toFixed(6)}`,
      change: `${isPositive ? '+' : ''}${priceChange24h.toFixed(2)}%`,
      changeType: isPositive ? 'positive' : 'negative',
      icon: <Activity className="w-4 h-4" />,
      subtitle: t('winklink.hero.change24h'),
      sparklineData: priceSparkline,
    },
    {
      title: t('winklink.hero.marketCap'),
      value: `$${(config.marketData.marketCap / 1e6).toFixed(1)}M`,
      change: '+8.3%',
      changeType: 'positive',
      icon: <Shield className="w-4 h-4" />,
      subtitle: t('winklink.hero.growth30d'),
    },
    {
      title: t('winklink.hero.gamingDataFeeds'),
      value: '20+',
      change: '+15%',
      changeType: 'positive',
      icon: <Gamepad2 className="w-4 h-4" />,
      subtitle: t('winklink.hero.addedThisWeek'),
    },
    {
      title: t('winklink.hero.supportedChains'),
      value: `${config.supportedChains.length}+`,
      change: '0%',
      changeType: 'neutral',
      icon: <Database className="w-4 h-4" />,
    },
    {
      title: t('winklink.hero.stakingAmount'),
      value: `${(config.marketData.circulatingSupply / 1e6).toFixed(0)}M`,
      change: '+5.7%',
      changeType: 'positive',
      icon: <Wallet className="w-4 h-4" />,
      subtitle: t('winklink.hero.totalStaked'),
    },
  ];

  const secondaryStats: StatItem[] = [
    {
      title: t('winklink.hero.avgResponseTime'),
      value: `${config.networkData.avgResponseTime}ms`,
      change: '-8%',
      changeType: 'positive',
      icon: <Clock className="w-4 h-4" />,
    },
    {
      title: t('winklink.hero.networkUptime'),
      value: `${config.networkData.nodeUptime}%`,
      change: '+0.02%',
      changeType: 'positive',
      icon: <Cpu className="w-4 h-4" />,
    },
    {
      title: t('winklink.hero.dataFeeds'),
      value: `${config.networkData.dataFeeds}+`,
      change: '+12%',
      changeType: 'positive',
      icon: <Globe className="w-4 h-4" />,
    },
    {
      title: t('winklink.hero.nodeCount'),
      value: '50+',
      change: '+5%',
      changeType: 'positive',
      icon: <Server className="w-4 h-4" />,
    },
  ];

  const healthScore = useMemo(() => {
    const uptimeScore = config.networkData.nodeUptime * 0.4;
    const responseScore = Math.max(0, 100 - config.networkData.avgResponseTime / 5) * 0.3;
    const feedScore = Math.min(100, config.networkData.dataFeeds / 2) * 0.3;
    return Math.round(uptimeScore + responseScore + feedScore);
  }, [config]);

  const miniPriceChartLabels = {
    trend24h: t('winklink.hero.priceTrend24h'),
    before24h: t('winklink.hero.hoursAgo24'),
    now: t('winklink.hero.now'),
  };

  const unifiedInfoLabels = {
    healthScore: t('winklink.hero.health'),
    gas: t('winklink.hero.gas'),
    response: t('winklink.hero.response'),
    online: t('winklink.hero.online'),
    support: t('winklink.hero.support'),
    chains: t('winklink.hero.chains'),
    gasLow: t('winklink.hero.gasLow'),
    gasMedium: t('winklink.hero.gasMedium'),
    gasHigh: t('winklink.hero.gasHigh'),
  };

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <LiveStatusBar
            isConnected={!isError}
            latency={networkStats?.avgResponseTime || config.networkData.avgResponseTime}
            lastUpdate={lastUpdated || undefined}
          />
          <QuickActions themeColor={themeColor} />
        </div>
        {dataStates && (
          <div className="flex items-center gap-2 flex-wrap">
            {Object.keys(dataStates).map((source) => {
              const state = dataStates[source];
              const isFailed = failedDataSources.includes(source);
              const isLoadingNow = loadingDataSources.includes(source);

              return (
                <div
                  key={source}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] ${
                    isFailed
                      ? 'bg-red-50 text-red-600'
                      : isLoadingNow
                        ? 'bg-blue-50 text-blue-600'
                        : 'bg-gray-50 text-gray-500'
                  }`}
                >
                  {isFailed ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                  ) : isLoadingNow ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  ) : (
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  )}
                  <span>{sourceLabels[source] || source}</span>
                  {state.lastUpdated && !isFailed && (
                    <span className="text-[8px] opacity-60">
                      ({formatLastUpdated(state.lastUpdated)})
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)` }}
          >
            <OptimizedImage
              src="/logos/oracles/winklink.svg"
              alt="WINkLink"
              width={28}
              height={28}
              priority
              className="w-7 h-7"
            />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">WINkLink</h1>
            <p className="text-xs text-gray-500">{t('winklink.subtitle')}</p>
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
            <ActionButtons
              onRefresh={onRefresh}
              onExport={onExport}
              isRefreshing={isRefreshing}
              themeColor={themeColor}
            />

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

      <LatestUpdates themeColor={themeColor} />
    </div>
  );
}
