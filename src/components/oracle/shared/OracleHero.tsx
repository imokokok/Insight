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
  Clock,
  Server,
  BarChart3,
  TrendingUp as TrendingUpIcon,
} from 'lucide-react';

import { OptimizedImage } from '@/components/performance/OptimizedImage';
import { LiveStatusBar } from '@/components/ui';
import { useTranslations } from '@/i18n';
import { type OracleConfig } from '@/lib/config/oracles';
import { type PriceData } from '@/types/oracle';

import { type ContentViewNetworkStats } from './OracleContentView';

export type NetworkStats = Partial<ContentViewNetworkStats>;

export interface OracleHeroProps {
  config: OracleConfig;
  price: PriceData | null;
  historicalData: PriceData[];
  networkStats?: NetworkStats | null;
  isLoading: boolean;
  isError: boolean;
  isRefreshing: boolean;
  lastUpdated: Date | null;
  onRefresh: () => void;
  onExport: () => void;
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
        <linearGradient
          id={`gradient-hero-${positive ? 'up' : 'down'}`}
          x1="0"
          y1="0"
          x2="0"
          y2="1"
        >
          <stop offset="0%" stopColor={positive ? '#10b981' : '#ef4444'} stopOpacity="0.3" />
          <stop offset="100%" stopColor={positive ? '#10b981' : '#ef4444'} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${height} ${points} ${width},${height}`}
        fill={`url(#gradient-hero-${positive ? 'up' : 'down'})`}
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

function EnhancedCoreStats({ stats, themeColor }: { stats: StatItem[]; themeColor: string }) {
  const displayStats = stats.slice(0, 5);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
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

function MiniPriceChart({
  historicalData,
  currentPrice,
  themeColor,
}: {
  historicalData: PriceData[];
  currentPrice: PriceData | null;
  themeColor: string;
}) {
  const t = useTranslations('ui');

  const chartData = useMemo(() => {
    if (historicalData.length >= 20) {
      return historicalData.slice(-20).map((d) => d.price);
    }
    const basePrice = currentPrice?.price || 100;
    return Array.from({ length: 20 }, (_, index) => {
      const seed = index * 0.1;
      return basePrice * (1 + Math.sin(seed) * 0.5 * 0.1);
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
          <span>{t('metrics.trend24h')}</span>
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
        <span>{t('metrics.before24h')}</span>
        <span>{t('metrics.now')}</span>
      </div>
    </div>
  );
}

function ActionButtons({
  onRefresh,
  onExport,
  isRefreshing,
  themeColor,
}: {
  onRefresh: () => void;
  onExport: () => void;
  isRefreshing: boolean;
  themeColor: string;
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
      <button
        onClick={onExport}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white rounded-lg hover:opacity-90 transition-all shadow-sm"
        style={{ backgroundColor: themeColor }}
      >
        <ExternalLink className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{t('common.export')}</span>
      </button>
    </div>
  );
}

function CompactMetricsRow({ stats }: { stats: StatItem[] }) {
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

function UnifiedInfoSection({
  networkStats,
  healthScore,
  chains,
  themeColor,
}: {
  networkStats?: NetworkStats | null;
  healthScore: number;
  chains: string[];
  themeColor: string;
}) {
  const t = useTranslations('ui');

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
    if (!networkStats?.avgResponseTime)
      return {
        label: t('health.medium'),
        color: 'text-yellow-600',
        bg: 'bg-yellow-500',
        width: '50%',
      };
    const { avgResponseTime } = networkStats;
    if (avgResponseTime < 150)
      return {
        label: t('health.low'),
        color: 'text-emerald-600',
        bg: 'bg-emerald-500',
        width: '30%',
      };
    if (avgResponseTime < 300)
      return {
        label: t('health.medium'),
        color: 'text-yellow-600',
        bg: 'bg-yellow-500',
        width: '50%',
      };
    return { label: t('health.high'), color: 'text-red-600', bg: 'bg-red-500', width: '80%' };
  }, [networkStats, t]);

  const displayChains = chains.slice(0, 3);
  const remainingCount = Math.max(0, chains.length - 3);

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 py-3 border-t border-gray-100">
      <div className="flex items-center gap-2 min-w-[120px]">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Activity className="w-3.5 h-3.5" />
          <span>{t('health.healthScore')}</span>
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

      <div className="hidden sm:block w-px h-4 bg-gray-200" />

      {networkStats && (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Zap className="w-3.5 h-3.5" />
              <span>{t('metrics.gas')}</span>
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

          {networkStats.avgResponseTime && (
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-500">{t('metrics.response')}</span>
              <span className="text-xs font-medium text-gray-900">
                {networkStats.avgResponseTime}ms
              </span>
            </div>
          )}

          {networkStats.nodeUptime && (
            <div className="flex items-center gap-1">
              <Server className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-500">{t('metrics.online')}</span>
              <span className="text-xs font-medium text-gray-900">{networkStats.nodeUptime}%</span>
            </div>
          )}
        </div>
      )}

      <div className="hidden sm:block w-px h-4 bg-gray-200" />

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Globe className="w-3.5 h-3.5" />
          <span>{t('metrics.support')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold" style={{ color: themeColor }}>
            {chains.length}+ {t('metrics.chains')}
          </span>
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

function getIconSrc(provider: string): string | null {
  const iconMap: Record<string, string> = {
    chainlink: '/logos/oracles/chainlink.svg',
    pyth: '/logos/oracles/pyth.svg',
    'band-protocol': '/logos/oracles/band.svg',
    uma: '/logos/oracles/uma.svg',
    api3: '/logos/oracles/api3.svg',
    redstone: '/logos/oracles/redstone.svg',
    dia: '/logos/oracles/dia.svg',
    tellor: '/logos/oracles/tellor.svg',
    chronicle: '/logos/oracles/chronicle.svg',
    winklink: '/logos/oracles/winklink.svg',
  };
  return iconMap[provider] || null;
}

export function OracleHero({
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
}: OracleHeroProps) {
  const t = useTranslations();
  const themeColor = config.themeColor;

  const currentPrice = price?.price ?? config.marketData.change24hValue ?? 0;
  const priceChange24h = config.marketData.change24h ?? 0;
  const isPositive = priceChange24h >= 0;

  const priceSparkline = useMemo(() => {
    if (historicalData.length > 0) {
      return historicalData.slice(-24).map((d) => d.price);
    }
    return Array.from({ length: 24 }, (_, index) => {
      const seed = index * 0.1;
      return currentPrice * (1 + Math.sin(seed) * 0.5 * 0.1);
    });
  }, [historicalData, currentPrice]);

  const tMetrics = useTranslations('ui.oracleMetrics');

  const primaryStats: StatItem[] = [
    {
      title: tMetrics('linkPrice'),
      value: `$${currentPrice.toFixed(2)}`,
      change: `${isPositive ? '+' : ''}${priceChange24h.toFixed(2)}%`,
      changeType: isPositive ? 'positive' : 'negative',
      icon: <Activity className="w-4 h-4" />,
      subtitle: tMetrics('subtitle24h'),
      sparklineData: priceSparkline,
    },
    {
      title: tMetrics('tvs'),
      value: `$${(config.marketData.marketCap / 1e9).toFixed(1)}B`,
      change: '+12.5%',
      changeType: 'positive',
      icon: <Shield className="w-4 h-4" />,
      subtitle: '30天',
    },
    {
      title: tMetrics('activeValidators'),
      value: `${(networkStats?.activeNodes ?? config.networkData.activeNodes).toLocaleString()}`,
      change: '+5.2%',
      changeType: 'positive',
      icon: <Database className="w-4 h-4" />,
      subtitle: '本月',
    },
    {
      title: tMetrics('dataFeeds'),
      value: `${(networkStats?.dataFeeds ?? config.networkData.dataFeeds).toLocaleString()}`,
      change: '+8.3%',
      changeType: 'positive',
      icon: <Zap className="w-4 h-4" />,
      subtitle: '本月',
    },
    {
      title: tMetrics('stakingAmount'),
      value: `${(config.marketData.circulatingSupply / 1e6).toFixed(1)}M`,
      change: '+3.7%',
      changeType: 'positive',
      icon: <Wallet className="w-4 h-4" />,
      subtitle: '30天',
    },
  ];

  const secondaryStats: StatItem[] = [
    {
      title: tMetrics('avgResponse'),
      value: `${networkStats?.avgResponseTime ?? config.networkData.avgResponseTime}ms`,
      change: '-15%',
      changeType: 'positive',
      icon: <Clock className="w-3.5 h-3.5" />,
    },
    {
      title: tMetrics('successRate'),
      value: `${networkStats?.nodeUptime ?? config.networkData.nodeUptime}%`,
      change: '+0.1%',
      changeType: 'positive',
      icon: <TrendingUp className="w-3.5 h-3.5" />,
    },
    {
      title: tMetrics('dataUpdate'),
      value: '24.5K',
      change: '+18%',
      changeType: 'positive',
      icon: <BarChart3 className="w-3.5 h-3.5" />,
    },
    {
      title: tMetrics('networkLatency'),
      value: `${networkStats?.latency ?? config.networkData.latency ?? 45}ms`,
      change: '-8%',
      changeType: 'positive',
      icon: <Server className="w-3.5 h-3.5" />,
    },
  ];

  const healthScore = useMemo(() => {
    const uptime = networkStats?.nodeUptime ?? config.networkData.nodeUptime;
    const responseTime = networkStats?.avgResponseTime ?? config.networkData.avgResponseTime;
    const feeds = networkStats?.dataFeeds ?? config.networkData.dataFeeds;

    const uptimeScore = uptime * 0.4;
    const responseScore = Math.max(0, 100 - responseTime / 5) * 0.3;
    const feedScore = Math.min(100, feeds / 10) * 0.3;
    return Math.round(uptimeScore + responseScore + feedScore);
  }, [config, networkStats]);

  const iconSrc = getIconSrc(config.provider);

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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)` }}
            >
              {iconSrc ? (
                <OptimizedImage
                  src={iconSrc}
                  alt={config.name}
                  width={28}
                  height={28}
                  priority
                  className="w-7 h-7"
                />
              ) : (
                <span className="text-white text-lg font-bold">
                  {config.name.slice(0, 2).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{config.name}</h1>
              <p className="text-xs text-gray-500">{config.description}</p>
            </div>
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
            <div className="p-3 rounded-xl bg-gray-50/50 border border-gray-100 flex-1 min-h-[120px]">
              <MiniPriceChart
                historicalData={historicalData}
                currentPrice={price}
                themeColor={themeColor}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OracleHero;
