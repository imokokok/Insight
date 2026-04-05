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
  RefreshCw,
  ExternalLink,
  Server,
} from 'lucide-react';

import { API3AlertBadgeCompact, API3AlertStatusIndicator } from '@/components/oracle/alerts';
import { QuickAccessPanel } from '@/components/oracle/data-display/QuickAccessPanel';
import {
  EnhancedDataExport,
  type ExportableData,
} from '@/components/oracle/forms/EnhancedDataExport';
import {
  EnhancedCoreStats,
  CompactMetricsRow,
  MiniPriceChart,
  UnifiedInfoSection,
  type StatItem,
} from '@/components/oracle/shared/HeroComponents';
import { LiveStatusBar, OptimizedImage } from '@/components/ui';
import { useTranslations } from '@/i18n';
import type { OracleConfig } from '@/lib/config/oracles';
import type { PriceData } from '@/types/oracle';

interface AirnodeStats {
  activeAirnodes: number;
  nodeUptime: number;
  avgResponseTime: number;
}

interface DapiCoverage {
  totalDapis: number;
}

interface Staking {
  stakingApr: number;
}

export interface API3HeroProps {
  config: OracleConfig;
  price: PriceData | null;
  historicalData: PriceData[];
  airnodeStats?: AirnodeStats;
  dapiCoverage?: DapiCoverage;
  staking?: Staking;
  isLoading: boolean;
  isError: boolean;
  isRefreshing: boolean;
  lastUpdated: Date | null;
  onRefresh: () => void;
  onExport: () => void;
  alertUnreadCount?: number;
  alertCriticalCount?: number;
  alertWarningCount?: number;
  onAlertClick?: () => void;
}

function API3ActionButtons({
  onRefresh,
  onExport,
  isRefreshing,
  themeColor,
  exportData,
}: {
  onRefresh: () => void;
  onExport: () => void;
  isRefreshing: boolean;
  themeColor: string;
  exportData?: ExportableData[];
}) {
  const t = useTranslations();

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 transition-all"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
        <span className="hidden sm:inline">{t('common.refresh')}</span>
      </button>
      {exportData && exportData.length > 0 ? (
        <EnhancedDataExport
          data={exportData}
          filename="api3_data"
          supportedFormats={['csv', 'json']}
        />
      ) : (
        <button
          onClick={onExport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg hover:opacity-90 transition-all shadow-sm"
          style={{ backgroundColor: themeColor }}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{t('common.export')}</span>
        </button>
      )}
    </div>
  );
}

export function API3Hero({
  config,
  price,
  historicalData,
  airnodeStats,
  dapiCoverage,
  staking,
  isError,
  isRefreshing,
  lastUpdated,
  onRefresh,
  onExport,
  alertUnreadCount = 0,
  alertCriticalCount = 0,
  alertWarningCount = 0,
  onAlertClick,
}: API3HeroProps) {
  const t = useTranslations();
  const themeColor = config.themeColor;

  const currentPrice = price?.price ?? config.marketData.change24hValue ?? 0;
  const priceChange24h = config.marketData.change24h ?? 0;
  const isPositive = priceChange24h >= 0;

  // 生成价格走势数据
  const priceSparkline = useMemo(() => {
    if (historicalData.length > 0) {
      return historicalData.slice(-24).map((d) => d.price);
    }
    // 使用伪随机生成稳定的数据模式
    return Array.from({ length: 24 }, (_, i) => {
      const seed = (i * 9301 + 49297) % 233280;
      const random = seed / 233280;
      return currentPrice * (1 + (random - 0.5) * 0.1);
    });
  }, [historicalData, currentPrice]);

  // 核心统计指标 - 增加到5个

  const primaryStats: StatItem[] = useMemo(
    () => [
      {
        title: t('api3.hero.api3Price'),
        value: `$${currentPrice.toFixed(2)}`,
        change: `${isPositive ? '+' : ''}${priceChange24h.toFixed(2)}%`,
        changeType: isPositive ? 'positive' : 'negative',
        icon: <Activity className="w-4 h-4" />,
        subtitle: '24h',
        sparklineData: priceSparkline,
      },
      {
        title: t('api3.hero.tvs'),
        value: `$${(config.marketData.marketCap / 1e6).toFixed(1)}M`,
        change: '+5.2%',
        changeType: 'positive',
        icon: <Wallet className="w-4 h-4" />,
        subtitle: t('api3.hero.subtitle7d'),
      },
      {
        title: t('api3.hero.airnodeCount'),
        value: `${airnodeStats?.activeAirnodes ?? config.networkData.activeNodes}+`,
        change: '+3%',
        changeType: 'positive',
        icon: <Server className="w-4 h-4" />,
        subtitle: t('api3.hero.subtitleThisMonth'),
      },
      {
        title: t('api3.hero.dapiCoverage'),
        value: `${dapiCoverage?.totalDapis ?? config.networkData.dataFeeds}+`,
        change: '+8%',
        changeType: 'positive',
        icon: <Database className="w-4 h-4" />,
        subtitle: t('api3.hero.subtitleThisMonth'),
      },
      {
        title: t('api3.hero.stakingApr'),
        value: `${staking?.stakingApr ?? 12.5}%`,
        change: '+2.1%',
        changeType: 'positive',
        icon: <TrendingUp className="w-4 h-4" />,
        subtitle: t('api3.hero.subtitleAnnual'),
      },
    ],
    [
      t,
      currentPrice,
      isPositive,
      priceChange24h,
      priceSparkline,
      config,
      airnodeStats,
      dapiCoverage,
      staking,
    ]
  );

  // 次要统计指标
  const secondaryStats: StatItem[] = useMemo(
    () => [
      {
        title: t('api3.hero.supportedChainsCount'),
        value: `${config.supportedChains.length}+`,
        change: '+2',
        changeType: 'positive',
        icon: <Globe className="w-4 h-4" />,
      },
      {
        title: t('api3.hero.networkUptime'),
        value: `${airnodeStats?.nodeUptime ?? config.networkData.nodeUptime}%`,
        change: '+0.1%',
        changeType: 'positive',
        icon: <Shield className="w-4 h-4" />,
      },
      {
        title: t('api3.hero.responseTime'),
        value: `${airnodeStats?.avgResponseTime ?? config.networkData.avgResponseTime}ms`,
        change: '-5%',
        changeType: 'positive',
        icon: <Zap className="w-4 h-4" />,
      },
      {
        title: t('api3.hero.dataFeeds'),
        value: `${config.networkData.dataFeeds}+`,
        change: '+12',
        changeType: 'positive',
        icon: <Database className="w-4 h-4" />,
      },
    ],
    [t, config, airnodeStats]
  );

  // 网络健康度评分
  const healthScore = useMemo(() => {
    const uptimeScore = (airnodeStats?.nodeUptime ?? config.networkData.nodeUptime) * 0.4;
    const responseScore =
      Math.max(0, 100 - (airnodeStats?.avgResponseTime ?? config.networkData.avgResponseTime) / 5) *
      0.3;
    const feedScore =
      Math.min(100, (dapiCoverage?.totalDapis ?? config.networkData.dataFeeds) / 2) * 0.3;
    return Math.round(uptimeScore + responseScore + feedScore);
  }, [config, airnodeStats, dapiCoverage]);

  // 网络统计数据
  const networkStats = useMemo(
    () => ({
      avgResponseTime: airnodeStats?.avgResponseTime ?? config.networkData.avgResponseTime,
      nodeUptime: airnodeStats?.nodeUptime ?? config.networkData.nodeUptime,
      dataFeeds: dapiCoverage?.totalDapis ?? config.networkData.dataFeeds,
    }),
    [airnodeStats, dapiCoverage, config]
  );

  const exportData: ExportableData[] = useMemo(() => {
    return primaryStats.map((stat) => ({
      title: stat.title,
      value: stat.value,
      change: stat.change || '',
      changeType: stat.changeType,
    }));
  }, [primaryStats]);

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-3">
            <LiveStatusBar
              isConnected={!isError}
              latency={airnodeStats?.avgResponseTime ?? config.networkData.avgResponseTime}
              lastUpdate={lastUpdated || undefined}
            />
            <API3AlertStatusIndicator
              criticalCount={alertCriticalCount}
              warningCount={alertWarningCount}
            />
          </div>
          <API3AlertBadgeCompact
            unreadCount={alertUnreadCount}
            criticalCount={alertCriticalCount}
            warningCount={alertWarningCount}
            onClick={onAlertClick}
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
                src="/logos/oracles/api3.svg"
                alt="API3"
                width={28}
                height={28}
                priority
                className="w-7 h-7"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{t('api3.hero.title')}</h1>
              <p className="text-xs text-gray-500">{t('api3.hero.subtitle')}</p>
            </div>
          </div>

          <div className="hidden lg:block">
            <API3ActionButtons
              onRefresh={onRefresh}
              onExport={onExport}
              isRefreshing={isRefreshing}
              themeColor={themeColor}
              exportData={exportData}
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
              labels={{
                healthScore: t('api3.hero.healthScore'),
                gas: t('api3.hero.gas'),
                response: t('api3.hero.response'),
                online: t('api3.hero.online'),
                support: t('api3.hero.supportedChains'),
                chains: t('api3.hero.chains'),
                gasLow: t('api3.hero.gasLow'),
                gasMedium: t('api3.hero.gasMedium'),
                gasHigh: t('api3.hero.gasHigh'),
              }}
            />
          </div>

          <div className="hidden lg:block w-px bg-gray-200 self-stretch" />

          <div className="lg:w-[30%] flex flex-col gap-3">
            <div className="lg:hidden">
              <API3ActionButtons
                onRefresh={onRefresh}
                onExport={onExport}
                isRefreshing={isRefreshing}
                themeColor={themeColor}
                exportData={exportData}
              />
            </div>

            <div className="p-3 rounded-xl bg-gray-50/50 border border-gray-100 flex-1">
              <MiniPriceChart
                historicalData={historicalData}
                currentPrice={price}
                themeColor={themeColor}
                labels={{
                  trend24h: t('api3.hero.priceTrend24h'),
                  before24h: t('api3.hero.hoursAgo'),
                  now: t('api3.hero.now'),
                }}
              />
            </div>

            <QuickAccessPanel defaultCollapsed />
          </div>
        </div>
      </div>
    </div>
  );
}

export default API3Hero;
