'use client';

import { useMemo, useCallback } from 'react';

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
  Clock,
  TrendingUp as TrendingUpIcon,
} from 'lucide-react';

import { API3AlertBadgeCompact, API3AlertStatusIndicator } from '@/components/oracle/alerts';
import { QuickAccessPanel } from '@/components/oracle/data-display/QuickAccessPanel';
import { EnhancedDataExport, type ExportableData } from '@/components/oracle/forms/EnhancedDataExport';
import { OptimizedImage } from '@/components/performance/OptimizedImage';
import { LiveStatusBar } from '@/components/ui';
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

interface StatItem {
  title: string;
  value: string;
  change?: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  subtitle?: string;
  sparklineData?: number[];
}

// 迷你走势图组件
function Sparkline({
  data,
  positive,
  width = 60,
  height = 24,
}: {
  data: number[];
  positive: boolean;
  width?: number;
  height?: number;
}) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * height * 0.8 - height * 0.1;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible">
      <defs>
        <linearGradient id={`gradient-${positive ? 'up' : 'down'}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={positive ? '#10b981' : '#ef4444'} stopOpacity="0.3" />
          <stop offset="100%" stopColor={positive ? '#10b981' : '#ef4444'} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill={`url(#gradient-${positive ? 'up' : 'down'})`}
      />
      <polyline
        fill="none"
        stroke={positive ? '#10b981' : '#ef4444'}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

// 增强版核心统计组件 - 5个指标，响应式网格布局
function EnhancedCoreStats({ stats, themeColor }: { stats: StatItem[]; themeColor: string }) {
  // 取前5个指标
  const displayStats = stats.slice(0, 5);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      {displayStats.map((stat, index) => {
        const isPositive = stat.changeType === 'positive';
        const isNegative = stat.changeType === 'negative';

        return (
          <div
            key={index}
            className="relative p-3 rounded-xl bg-gray-50/50 border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all group"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="p-2 rounded-lg" style={{ backgroundColor: `${themeColor}15` }}>
                <div style={{ color: themeColor }} className="w-4 h-4">
                  {stat.icon}
                </div>
              </div>
              {stat.sparklineData && (
                <div className="opacity-60 group-hover:opacity-100 transition-opacity">
                  <Sparkline
                    data={stat.sparklineData}
                    positive={isPositive}
                    width={50}
                    height={20}
                  />
                </div>
              )}
            </div>
            <div className="text-xs text-gray-500 mb-1">{stat.title}</div>
            <div className="text-lg font-bold text-gray-900 tracking-tight">{stat.value}</div>
            {stat.change && (
              <div className="flex items-center gap-1 mt-1">
                <span
                  className={`text-xs font-medium flex items-center gap-0.5 ${
                    isPositive ? 'text-emerald-600' : isNegative ? 'text-red-600' : 'text-gray-500'
                  }`}
                >
                  {isPositive && <TrendingUp className="w-3 h-3" />}
                  {isNegative && <TrendingDown className="w-3 h-3" />}
                  {stat.change}
                </span>
                {stat.subtitle && (
                  <span className="text-[10px] text-gray-400">{stat.subtitle}</span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// 右侧迷你价格图表组件
function MiniPriceChart({
  historicalData,
  currentPrice,
  themeColor,
  t,
}: {
  historicalData: PriceData[];
  currentPrice: PriceData | null;
  themeColor: string;
  t: (key: string) => string;
}) {
  const chartData = useMemo(() => {
    if (historicalData.length >= 20) {
      return historicalData.slice(-20).map((d) => d.price);
    }
    // 生成模拟数据 - 使用伪随机确保稳定性
    const basePrice = currentPrice?.price || 100;
    return Array.from({ length: 20 }, (_, i) => {
      const seed = (i * 9301 + 49297) % 233280;
      const random = seed / 233280;
      return basePrice * (1 + (random - 0.5) * 0.1);
    });
  }, [historicalData, currentPrice]);

  const priceChange = useMemo(() => {
    if (chartData.length < 2) return 0;
    return ((chartData[chartData.length - 1] - chartData[0]) / chartData[0]) * 100;
  }, [chartData]);

  const isPositive = priceChange >= 0;

  if (!chartData.length) return null;

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <TrendingUpIcon className="w-3.5 h-3.5" />
          <span>{t('api3.hero.priceTrend24h')}</span>
        </div>
        <span className={`text-xs font-medium ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
          {isPositive ? '+' : ''}
          {priceChange.toFixed(2)}%
        </span>
      </div>
      <div className="flex-1 min-h-[80px] flex items-end">
        <Sparkline data={chartData} positive={isPositive} width={180} height={70} />
      </div>
      <div className="flex justify-between mt-2 text-[10px] text-gray-400">
        <span>{t('api3.hero.hoursAgo')}</span>
        <span>{t('api3.hero.now')}</span>
      </div>
    </div>
  );
}

// 操作按钮组件
function ActionButtons({
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

// 整合的次要指标行 - 4个指标在一行展示，纯文本+图标，无卡片背景，用分隔符区分
function CompactMetricsRow({ stats }: { stats: StatItem[] }) {
  // 只取前4个次要指标
  const displayStats = stats.slice(0, 4);

  return (
    <div className="flex flex-wrap items-center gap-y-2 py-2">
      {displayStats.map((stat, index) => {
        const isPositive = stat.changeType === 'positive';
        const isNegative = stat.changeType === 'negative';
        const isLast = index === displayStats.length - 1;

        return (
          <div key={index} className="flex items-center">
            <div className="flex items-center gap-1.5 px-3 first:pl-0">
              <div className="text-gray-400">{stat.icon}</div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500">{stat.title}</span>
                <span className="text-xs font-semibold text-gray-900">{stat.value}</span>
                {stat.change && (
                  <span
                    className={`text-[10px] font-medium flex items-center gap-0.5 ${
                      isPositive
                        ? 'text-emerald-600'
                        : isNegative
                          ? 'text-red-600'
                          : 'text-gray-500'
                    }`}
                  >
                    {isPositive && <TrendingUp className="w-2.5 h-2.5" />}
                    {isNegative && <TrendingDown className="w-2.5 h-2.5" />}
                    {stat.change}
                  </span>
                )}
              </div>
            </div>
            {!isLast && <div className="w-px h-3 bg-gray-200" />}
          </div>
        );
      })}
    </div>
  );
}

// 整合的信息区 - 链上指标、网络健康度、多链支持整合为紧凑形式
function UnifiedInfoSection({
  networkStats,
  healthScore,
  chains,
  themeColor,
  t,
}: {
  networkStats?: {
    avgResponseTime: number;
    nodeUptime: number;
    dataFeeds: number;
  };
  healthScore: number;
  chains: string[];
  themeColor: string;
  t: (key: string) => string;
}) {
  const getHealthColor = () => {
    if (healthScore >= 90) return 'text-emerald-600';
    if (healthScore >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthBgColor = () => {
    if (healthScore >= 90) return 'bg-emerald-500';
    if (healthScore >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const gasLevel = useMemo(() => {
    if (!networkStats)
      return { label: t('api3.hero.gasMedium'), color: 'text-yellow-600', bg: 'bg-yellow-500', width: '50%' };
    const { avgResponseTime } = networkStats;
    if (avgResponseTime < 150)
      return { label: t('api3.hero.gasLow'), color: 'text-emerald-600', bg: 'bg-emerald-500', width: '30%' };
    if (avgResponseTime < 300)
      return { label: t('api3.hero.gasMedium'), color: 'text-yellow-600', bg: 'bg-yellow-500', width: '50%' };
    return { label: t('api3.hero.gasHigh'), color: 'text-red-600', bg: 'bg-red-500', width: '80%' };
  }, [networkStats, t]);

  // 只显示前3个链
  const displayChains = chains.slice(0, 3);
  const remainingCount = Math.max(0, chains.length - 3);

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 py-3 border-t border-gray-100">
      {/* 网络健康度 - 进度条+数字紧凑形式 */}
      <div className="flex items-center gap-2 min-w-[120px]">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Activity className="w-3.5 h-3.5" />
          <span>{t('api3.hero.healthScore')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-12 h-1 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${getHealthBgColor()}`}
              style={{ width: `${healthScore}%` }}
            />
          </div>
          <span className={`text-xs font-semibold ${getHealthColor()}`}>{healthScore}</span>
        </div>
      </div>

      {/* 分隔符 */}
      <div className="hidden sm:block w-px h-4 bg-gray-200" />

      {/* 链上指标 - 紧凑展示 */}
      {networkStats && (
        <div className="flex items-center gap-3">
          {/* Gas 费水平 */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Zap className="w-3.5 h-3.5" />
              <span>{t('api3.hero.gas')}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${gasLevel.bg}`}
                  style={{ width: gasLevel.width }}
                />
              </div>
              <span className={`text-[10px] font-medium ${gasLevel.color}`}>{gasLevel.label}</span>
            </div>
          </div>

          {/* 响应时间 */}
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-500">{t('api3.hero.response')}</span>
            <span className="text-xs font-medium text-gray-900">
              {networkStats.avgResponseTime}ms
            </span>
          </div>

          {/* 节点在线率 */}
          <div className="flex items-center gap-1">
            <Server className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-500">{t('api3.hero.online')}</span>
            <span className="text-xs font-medium text-gray-900">{networkStats.nodeUptime}%</span>
          </div>
        </div>
      )}

      {/* 分隔符 */}
      <div className="hidden sm:block w-px h-4 bg-gray-200" />

      {/* 多链支持 - 只显示链数量+前3个链图标 */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Globe className="w-3.5 h-3.5" />
          <span>{t('api3.hero.supportedChains')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* 链数量 */}
          <span className="text-xs font-semibold" style={{ color: themeColor }}>
            {chains.length}+ {t('api3.hero.chains')}
          </span>
          {/* 前3个链图标 */}
          <div className="flex -space-x-1">
            {displayChains.map((chain, index) => (
              <div
                key={index}
                className="w-5 h-5 rounded-full bg-gray-100 border border-white flex items-center justify-center text-[8px] font-medium text-gray-600"
                title={chain}
              >
                {chain.slice(0, 2).toUpperCase()}
              </div>
            ))}
          </div>
          {remainingCount > 0 && (
            <span className="text-[10px] text-gray-400">+{remainingCount}</span>
          )}
        </div>
      </div>
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
  const primaryStats: StatItem[] = [
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
  ];

  // 次要统计指标
  const secondaryStats: StatItem[] = [
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
  ];

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
            <ActionButtons
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
              t={t}
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
                exportData={exportData}
              />
            </div>

            <div className="p-3 rounded-xl bg-gray-50/50 border border-gray-100 flex-1">
              <MiniPriceChart
                historicalData={historicalData}
                currentPrice={price}
                themeColor={themeColor}
                t={t}
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
