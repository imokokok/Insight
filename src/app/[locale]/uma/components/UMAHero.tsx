'use client';

import { useMemo } from 'react';

import { Activity, Globe, Database, Wallet, Shield, Clock, Server } from 'lucide-react';

import {
  EnhancedCoreStats,
  CompactMetricsRow,
  ActionButtons,
  MiniPriceChart,
  UnifiedInfoSection,
  type StatItem,
} from '@/components/oracle/shared/HeroComponents';
import { LiveStatusBar } from '@/components/ui';
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

  const currentPrice = realtimePrice?.price ?? price?.price ?? 0;
  const priceChange24h = realtimePrice?.change24h ?? price?.change24hPercent ?? 0;
  const isPositive = priceChange24h >= 0;
  const marketCap = config.marketData.marketCap ?? 0;

  const effectiveLastUpdate = realtimeLastUpdate ?? lastUpdated;

  const priceSparkline = useMemo(() => {
    if (historicalData.length > 0) {
      return historicalData.slice(-24).map((d) => d.price);
    }
    return [];
  }, [historicalData]);

  const primaryStats: StatItem[] = [
    {
      title: t('uma.hero.umaPrice'),
      value: currentPrice > 0 ? `$${currentPrice.toFixed(2)}` : '-',
      change: currentPrice > 0 ? `${isPositive ? '+' : ''}${priceChange24h.toFixed(2)}%` : '-',
      changeType: isPositive ? 'positive' : 'negative',
      icon: <Activity className="w-4 h-4" />,
      subtitle: '24h',
      sparklineData: priceSparkline,
    },
    {
      title: t('uma.hero.tvs'),
      value: marketCap > 0 ? `$${(marketCap / 1e6).toFixed(1)}M` : '-',
      change: '-',
      changeType: 'neutral',
      icon: <Wallet className="w-4 h-4" />,
      subtitle: '30d',
    },
    {
      title: t('uma.hero.activeValidators'),
      value: config.networkData?.activeNodes?.toLocaleString() ?? '-',
      change: '-',
      changeType: 'neutral',
      icon: <Shield className="w-4 h-4" />,
      subtitle: t('uma.staking.delegation.month'),
    },
    {
      title: t('uma.hero.dataFeeds'),
      value: networkStats?.dataFeeds?.toString() ?? '-',
      change: '-',
      changeType: 'neutral',
      icon: <Database className="w-4 h-4" />,
      subtitle: t('uma.education.continuousLearning'),
    },
    {
      title: t('uma.hero.disputeResolutionRate'),
      value: '-',
      change: '-',
      changeType: 'neutral',
      icon: <Activity className="w-4 h-4" />,
      subtitle: '24h',
    },
  ];

  const secondaryStats: StatItem[] = [
    {
      title: t('uma.hero.supportedChainsCount'),
      value: `${config.supportedChains?.length ?? '-'}`,
      change: '-',
      changeType: 'neutral',
      icon: <Globe className="w-3.5 h-3.5" />,
    },
    {
      title: t('uma.hero.stakingAmount'),
      value: config.marketData?.circulatingSupply
        ? `${(config.marketData.circulatingSupply / 1e6).toFixed(1)}M`
        : '-',
      change: '-',
      changeType: 'neutral',
      icon: <Database className="w-3.5 h-3.5" />,
    },
    {
      title: t('uma.hero.avgResponse'),
      value: networkStats?.avgResponseTime ? `${networkStats.avgResponseTime}ms` : '-',
      change: '-',
      changeType: 'neutral',
      icon: <Clock className="w-3.5 h-3.5" />,
    },
    {
      title: t('uma.hero.nodeUptime'),
      value: networkStats?.nodeUptime ? `${networkStats.nodeUptime}%` : '-',
      change: '-',
      changeType: 'neutral',
      icon: <Server className="w-3.5 h-3.5" />,
    },
  ];

  const healthScore = useMemo(() => {
    const uptime = networkStats?.nodeUptime ?? 0;
    const responseTime = networkStats?.avgResponseTime ?? 0;
    const feeds = networkStats?.dataFeeds ?? 0;

    if (uptime === 0 && responseTime === 0 && feeds === 0) return 0;

    const uptimeScore = uptime * 0.4;
    const responseScore = Math.max(0, 100 - responseTime / 5) * 0.3;
    const feedScore = Math.min(100, feeds / 2) * 0.3;
    return Math.round(uptimeScore + responseScore + feedScore);
  }, [networkStats]);

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
              latency={networkStats?.avgResponseTime}
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
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)` }}
            >
              <span className="text-white font-bold text-lg">U</span>
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
              chains={config.supportedChains ?? []}
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

export default UMAHero;
