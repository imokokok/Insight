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
  Users,
  RefreshCw,
  ExternalLink,
  Clock,
  Server,
  TrendingUp as TrendingUpIcon,
} from 'lucide-react';

import { LiveStatusBar, OptimizedImage } from '@/components/ui';
import { useTranslations } from '@/i18n';
import { type OracleConfig } from '@/lib/config/oracles';
import { type PriceData } from '@/types/oracle';

export interface PythHeroProps {
  config: OracleConfig;
  price: PriceData | null;
  historicalData: PriceData[];
  networkStats?: {
    avgResponseTime: number;
    nodeUptime: number;
    dataFeeds: number;
  } | null;
  publishers?: unknown[];
  validators?: unknown[];
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
    // 生成模拟数据
    const basePrice = currentPrice?.price || 100;
    return Array.from({ length: 20 }, (_, i) => basePrice * (1 + (Math.random() - 0.5) * 0.1));
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

// 操作按钮组件
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
  const tUI = useTranslations('ui');

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

// 整合的信息区 - 链上指标、网络健康度、多链支持整合为紧凑形式
function UnifiedInfoSection({
  networkStats,
  healthScore,
  chains,
  themeColor,
}: {
  networkStats?: {
    avgResponseTime: number;
    nodeUptime: number;
    dataFeeds: number;
  } | null;
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
    if (!networkStats)
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

  // 只显示前3个链
  const displayChains = chains.slice(0, 3);
  const remainingCount = Math.max(0, chains.length - 3);

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 py-3 border-t border-gray-100">
      {/* 网络健康度 - 进度条+数字紧凑形式 */}
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

      {/* 分隔符 */}
      <div className="hidden sm:block w-px h-4 bg-gray-200" />

      {/* 链上指标 - 紧凑展示 */}
      {networkStats && (
        <div className="flex items-center gap-3">
          {/* Gas 费水平 */}
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

          {/* 响应时间 */}
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-500">{t('metrics.response')}</span>
            <span className="text-xs font-medium text-gray-900">
              {networkStats.avgResponseTime}ms
            </span>
          </div>

          {/* 节点在线率 */}
          <div className="flex items-center gap-1">
            <Server className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-500">{t('metrics.online')}</span>
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
          <span>{t('metrics.support')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* 链数量 */}
          <span className="text-xs font-semibold" style={{ color: themeColor }}>
            {chains.length}+ {t('metrics.chains')}
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
  const tPyth = useTranslations('pyth');

  // 使用 config.themeColor 获取主题色
  const themeColor = config.themeColor;

  const currentPrice = price?.price ?? config.marketData.change24hValue ?? 0;
  const priceChange24h = config.marketData.change24h ?? 0;
  const isPositive = priceChange24h >= 0;

  // 生成价格走势数据
  const priceSparkline = useMemo(() => {
    if (historicalData.length > 0) {
      return historicalData.slice(-24).map((d) => d.price);
    }
    return Array.from({ length: 24 }, (_, i) => currentPrice * (1 + (Math.random() - 0.5) * 0.1));
  }, [historicalData, currentPrice]);

  const tMetrics = useTranslations('ui.oracleMetrics');

  // 核心统计指标 - 5个
  const primaryStats: StatItem[] = [
    {
      title: tMetrics('pythPrice'),
      value: `$${currentPrice.toFixed(4)}`,
      change: `${isPositive ? '+' : ''}${priceChange24h.toFixed(2)}%`,
      changeType: isPositive ? 'positive' : 'negative',
      icon: <Activity className="w-4 h-4" />,
      subtitle: tMetrics('subtitle24h'),
      sparklineData: priceSparkline,
    },
    {
      title: tMetrics('tvs'),
      value: `$${(config.marketData.marketCap / 1e6).toFixed(1)}M`,
      change: '+8.5%',
      changeType: 'positive',
      icon: <Wallet className="w-4 h-4" />,
      subtitle: tMetrics('subtitle24h'),
    },
    {
      title: tMetrics('activeValidators'),
      value: `${publishers?.length ?? 95}`,
      change: '+12',
      changeType: 'positive',
      icon: <Users className="w-4 h-4" />,
      subtitle: tPyth('hero.thisMonth'),
    },
    {
      title: tMetrics('dataFeeds'),
      value: `${networkStats?.dataFeeds ?? 450}+`,
      change: '+15%',
      changeType: 'positive',
      icon: <Database className="w-4 h-4" />,
      subtitle: tMetrics('subtitle24h'),
    },
    {
      title: tMetrics('nodeCount'),
      value: `${validators?.length ?? 85}`,
      change: '+5',
      changeType: 'positive',
      icon: <Shield className="w-4 h-4" />,
      subtitle: tPyth('hero.thisMonth'),
    },
  ];

  // 网络健康度评分
  const healthScore = useMemo(() => {
    const uptimeScore = (networkStats?.nodeUptime ?? 99.9) * 0.4;
    const responseScore = Math.max(0, 100 - (networkStats?.avgResponseTime ?? 200) / 5) * 0.3;
    const feedScore = Math.min(100, (networkStats?.dataFeeds ?? 450) / 5) * 0.3;
    return Math.round(uptimeScore + responseScore + feedScore);
  }, [networkStats]);

  return (
    <div className="bg-white border-b border-gray-200">
      {/* 顶部状态栏 */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <LiveStatusBar
            isConnected={!isError}
            latency={networkStats?.avgResponseTime ?? 200}
            lastUpdate={lastUpdated || undefined}
          />
        </div>
      </div>

      {/* 主要内容区 - 桌面端左右分栏布局 */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* 头部信息 - Logo、标题、操作按钮、数据新鲜度 */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
          {/* 左侧：Logo + 标题 */}
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)` }}
            >
              <OptimizedImage
                src="/logos/oracles/pyth.svg"
                alt="Pyth"
                width={28}
                height={28}
                priority
                className="w-7 h-7"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{t('pyth.title')}</h1>
              <p className="text-xs text-gray-500">{t('pyth.subtitle')}</p>
            </div>
          </div>

          {/* 右侧：操作按钮（桌面端显示在标题右侧） */}
          <div className="hidden lg:block">
            <ActionButtons
              onRefresh={onRefresh}
              onExport={onExport}
              isRefreshing={isRefreshing}
              themeColor={themeColor}
            />
          </div>
        </div>

        {/* 桌面端左右分栏布局 */}
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* 左侧区域（70%）- 核心指标 */}
          <div className="flex-1 lg:w-[70%] lg:flex-none">
            <EnhancedCoreStats stats={primaryStats} themeColor={themeColor} />

            {/* 整合信息区 */}
            <UnifiedInfoSection
              networkStats={networkStats}
              healthScore={healthScore}
              chains={config.supportedChains}
              themeColor={themeColor}
            />
          </div>

          {/* 分隔线（仅桌面端显示） */}
          <div className="hidden lg:block w-px bg-gray-200 self-stretch" />

          {/* 右侧区域（30%）- 迷你图表 + 操作按钮 */}
          <div className="lg:w-[30%] flex flex-col gap-3">
            {/* 操作按钮（平板/移动端显示在右侧区域顶部） */}
            <div className="lg:hidden">
              <ActionButtons
                onRefresh={onRefresh}
                onExport={onExport}
                isRefreshing={isRefreshing}
                themeColor={themeColor}
              />
            </div>

            {/* 迷你价格图表 */}
            <div className="p-3 rounded-xl bg-gray-50/50 border border-gray-100 flex-1">
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

export default PythHero;
