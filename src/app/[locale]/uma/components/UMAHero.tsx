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
  Clock,
  Bell,
  FileText,
  Layers,
  RefreshCw,
  ExternalLink,
  Plus,
  Gavel,
  Link2,
  Server,
  TrendingUp as TrendingUpIcon,
  Users,
  CheckCircle,
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
import { DataFreshnessIndicator } from '@/components/ui/DataFreshnessIndicator';
import { useUMARealtime } from '@/hooks/realtime';
import { useTranslations } from '@/i18n';
import { type OracleConfig } from '@/lib/config/oracles';
import { type PriceData } from '@/types/oracle';

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

function DataSourceBadge({
  isRealtime,
  isCached,
  t,
}: {
  isRealtime: boolean;
  isCached: boolean;
  t: ReturnType<typeof useTranslations>;
}) {
  const getStatusConfig = () => {
    if (isRealtime) {
      return {
        label: t('uma.market.dataSourceRealtime'),
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        dot: 'bg-emerald-500',
        animate: true,
      };
    }
    if (isCached) {
      return {
        label: t('uma.market.dataSourceCached'),
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        dot: 'bg-amber-500',
        animate: false,
      };
    }
    return {
      label: t('uma.market.dataSourceSimulated'),
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      dot: 'bg-blue-500',
      animate: false,
    };
  };

  const config = getStatusConfig();

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.color}`}
    >
      <span className="relative flex h-2 w-2">
        {config.animate && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.dot} opacity-75`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dot}`} />
      </span>
      <span>
        {t('uma.market.dataSourceLabel')}: {config.label}
      </span>
    </div>
  );
}

function QuickActions({
  themeColor,
  t,
}: {
  themeColor: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const actions = [
    { icon: <Bell className="w-3.5 h-3.5" />, label: t('uma.hero.priceAlert') },
    { icon: <Plus className="w-3.5 h-3.5" />, label: t('uma.hero.addMonitor') },
    { icon: <FileText className="w-3.5 h-3.5" />, label: t('uma.hero.apiDocs') },
    { icon: <Layers className="w-3.5 h-3.5" />, label: t('uma.hero.switchNetwork') },
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

function LatestUpdates({ t }: { t: ReturnType<typeof useTranslations> }) {
  const defaultUpdates = [
    { type: 'price' as const, text: t('uma.hero.priceUpdate'), time: `2${t('uma.hero.hoursAgo')}` },
    {
      type: 'node' as const,
      text: t('uma.hero.newNodeJoined'),
      time: `5${t('uma.hero.hoursAgo')}`,
    },
    {
      type: 'feed' as const,
      text: t('uma.hero.dataFeedUpdate'),
      time: `8${t('uma.hero.hoursAgo')}`,
    },
    {
      type: 'system' as const,
      text: t('uma.hero.systemMaintenanceComplete'),
      time: `15${t('uma.hero.hoursAgo')}`,
    },
  ];

  return (
    <div className="bg-gray-50 border-t border-gray-200 py-2 px-4">
      <div className="max-w-[1600px] mx-auto flex items-center gap-4 overflow-hidden">
        <span className="text-xs font-medium text-gray-500 flex-shrink-0">
          {t('uma.hero.latestUpdates')}:
        </span>
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-6 animate-marquee whitespace-nowrap">
            {defaultUpdates.map((update, index) => (
              <div key={index} className="flex items-center gap-2 text-xs">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    update.type === 'price'
                      ? 'bg-blue-500'
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

export function UMAHero({
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
}: UMAHeroProps) {
  const t = useTranslations();

  const themeColor = config.themeColor || '#dc2626';

  const realtime = useUMARealtime({
    enablePrices: true,
    enableNetwork: true,
    enableDisputes: false,
    enableValidators: false,
    enableRequests: false,
  });

  const isRealtimeConnected = realtime.isConnected;
  const realtimePrice = realtime.price.priceData;
  const realtimeLastUpdate = realtime.price.lastUpdate;

  const currentPrice =
    realtimePrice?.price ?? price?.price ?? config.marketData.change24hValue ?? 4.5;
  const priceChange24h = realtimePrice?.change24h ?? config.marketData.change24h ?? 0;
  const isPositive = priceChange24h >= 0;
  const marketCap = config.marketData.marketCap ?? 0;

  const effectiveLastUpdate = realtimeLastUpdate ?? lastUpdated;

  const priceSparkline = useMemo(() => {
    if (historicalData.length > 0) {
      return historicalData.slice(-24).map((d) => d.price);
    }
    return Array.from({ length: 24 }, (_, i) => currentPrice * (1 + ((i % 5) - 2) * 0.02));
  }, [historicalData, currentPrice]);

  const primaryStats: StatItem[] = [
    {
      title: t('uma.hero.umaPrice'),
      value: `$${currentPrice.toFixed(2)}`,
      change: `${isPositive ? '+' : ''}${priceChange24h.toFixed(2)}%`,
      changeType: isPositive ? 'positive' : 'negative',
      icon: <Activity className="w-4 h-4" />,
      subtitle: '24h',
      sparklineData: priceSparkline,
    },
    {
      title: t('uma.hero.tvs'),
      value: marketCap > 0 ? `$${(marketCap / 1e6).toFixed(1)}M` : '$250M+',
      change: '+8.5%',
      changeType: 'positive',
      icon: <Wallet className="w-4 h-4" />,
      subtitle: '30d',
    },
    {
      title: t('uma.hero.activeValidators'),
      value: `${config.networkData?.activeNodes?.toLocaleString() ?? '120+'}`,
      change: '+12%',
      changeType: 'positive',
      icon: <Shield className="w-4 h-4" />,
      subtitle: t('uma.staking.delegation.month'),
    },
    {
      title: t('uma.hero.dataFeeds'),
      value: `${networkStats?.dataFeeds ?? config.networkData?.dataFeeds ?? 85}+`,
      change: '+5',
      changeType: 'positive',
      icon: <Database className="w-4 h-4" />,
      subtitle: t('uma.education.continuousLearning'),
    },
    {
      title: t('uma.hero.disputeResolutionRate'),
      value: '98.5%',
      change: '+0.3%',
      changeType: 'positive',
      icon: <Gavel className="w-4 h-4" />,
      subtitle: '24h',
    },
  ];

  const secondaryStats: StatItem[] = [
    {
      title: t('uma.hero.supportedChainsCount'),
      value: `${config.supportedChains?.length ?? 8}+`,
      change: '0%',
      changeType: 'neutral',
      icon: <Link2 className="w-3.5 h-3.5" />,
    },
    {
      title: t('uma.hero.stakingAmount'),
      value: `${((config.marketData?.circulatingSupply ?? 6.5e7) / 1e6).toFixed(1)}M`,
      change: '+5.2%',
      changeType: 'positive',
      icon: <Database className="w-3.5 h-3.5" />,
    },
    {
      title: t('uma.hero.avgResponse'),
      value: `${networkStats?.avgResponseTime ?? config.networkData?.avgResponseTime ?? 200}ms`,
      change: '-10%',
      changeType: 'positive',
      icon: <Clock className="w-3.5 h-3.5" />,
    },
    {
      title: t('uma.hero.nodeUptime'),
      value: `${networkStats?.nodeUptime ?? config.networkData?.nodeUptime ?? 99.5}%`,
      change: '+0.1%',
      changeType: 'positive',
      icon: <Server className="w-3.5 h-3.5" />,
    },
  ];

  const healthScore = useMemo(() => {
    const uptime = networkStats?.nodeUptime ?? config.networkData?.nodeUptime ?? 99.5;
    const responseTime =
      networkStats?.avgResponseTime ?? config.networkData?.avgResponseTime ?? 200;
    const feeds = networkStats?.dataFeeds ?? config.networkData?.dataFeeds ?? 85;

    const uptimeScore = uptime * 0.4;
    const responseScore = Math.max(0, 100 - responseTime / 5) * 0.3;
    const feedScore = Math.min(100, feeds / 2) * 0.3;
    return Math.round(uptimeScore + responseScore + feedScore);
  }, [networkStats, config]);

  const connectionStatus = isRealtimeConnected
    ? 'connected'
    : realtime.isConnecting
      ? 'connecting'
      : realtime.isReconnecting
        ? 'reconnecting'
        : 'disconnected';

  const miniPriceChartLabels = {
    trend24h: t('uma.hero.trend24h'),
    before24h: `24h${t('uma.hero.hoursAgo')}`,
    now: t('uma.hero.now'),
  };

  const unifiedInfoLabels = {
    healthScore: t('uma.hero.healthScore'),
    gas: t('uma.hero.gas'),
    response: t('uma.hero.response'),
    online: t('uma.hero.online'),
    support: t('uma.hero.supported'),
    chains: t('uma.hero.chains'),
    gasLow: t('uma.staking.low'),
    gasMedium: t('uma.staking.medium'),
    gasHigh: t('uma.staking.high'),
  };

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-3">
            <LiveStatusBar
              isConnected={!isError}
              latency={networkStats?.avgResponseTime || 245}
              lastUpdate={lastUpdated || undefined}
            />
            <DataFreshnessIndicator
              lastUpdate={effectiveLastUpdate}
              connectionStatus={connectionStatus}
              onRefresh={onRefresh}
              isRefreshing={isRefreshing}
              showConnectionStatus={true}
              showCountdown={true}
              showManualRefresh={true}
              compact={true}
            />
            <DataSourceBadge
              isRealtime={isRealtimeConnected}
              isCached={!!lastUpdated && !isRealtimeConnected}
              t={t}
            />
          </div>
          <QuickActions themeColor={themeColor} t={t} />
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
                src="/logos/oracles/uma.svg"
                alt="UMA"
                width={28}
                height={28}
                priority
                className="w-7 h-7"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">UMA</h1>
              <p className="text-xs text-gray-500">{t('uma.subtitle')}</p>
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
              chains={
                config.supportedChains ?? [
                  'Ethereum',
                  'Polygon',
                  'Arbitrum',
                  'Optimism',
                  'Base',
                  'Avalanche',
                ]
              }
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

      <LatestUpdates t={t} />
    </div>
  );
}

export default UMAHero;
