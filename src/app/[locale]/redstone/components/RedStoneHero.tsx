'use client';

import { useMemo } from 'react';

import {
  Activity,
  Globe,
  Database,
  Wallet,
  Zap,
  Bell,
  FileText,
  Layers,
  Plus,
  Clock,
  Server,
  TrendingUp,
  Lock,
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

export interface RedStoneHeroProps {
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

// 快速操作组件
function QuickActions() {
  const t = useTranslations();

  const actions = [
    {
      icon: <Bell className="w-3.5 h-3.5" />,
      label: t('redstone.hero.quickActions.priceAlert'),
      href: '#',
    },
    {
      icon: <Plus className="w-3.5 h-3.5" />,
      label: t('redstone.hero.quickActions.addMonitor'),
      href: '#',
    },
    {
      icon: <FileText className="w-3.5 h-3.5" />,
      label: t('redstone.hero.quickActions.apiDocs'),
      href: '#',
    },
    {
      icon: <Layers className="w-3.5 h-3.5" />,
      label: t('redstone.hero.quickActions.switchNetwork'),
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

// 最新动态滚动条
function LatestUpdates() {
  const t = useTranslations();

  const updates = [
    {
      type: 'price',
      text: t('redstone.hero.updates.price'),
      time: t('redstone.hero.timeAgo.1minAgo'),
    },
    {
      type: 'provider',
      text: t('redstone.hero.updates.provider'),
      time: t('redstone.hero.timeAgo.3minAgo'),
    },
    {
      type: 'feed',
      text: t('redstone.hero.updates.feed'),
      time: t('redstone.hero.timeAgo.5minAgo'),
    },
    {
      type: 'bridge',
      text: t('redstone.hero.updates.bridge'),
      time: t('redstone.hero.timeAgo.12minAgo'),
    },
  ];

  return (
    <div className="bg-gray-50 border-t border-gray-200 py-2 px-4">
      <div className="max-w-[1600px] mx-auto flex items-center gap-4 overflow-hidden">
        <span className="text-xs font-medium text-gray-500 flex-shrink-0">
          {t('redstone.hero.latestUpdates')}
        </span>
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-6 animate-marquee whitespace-nowrap">
            {updates.map((update, index) => (
              <div key={index} className="flex items-center gap-2 text-xs">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    update.type === 'price'
                      ? 'bg-red-500'
                      : update.type === 'provider'
                        ? 'bg-emerald-500'
                        : update.type === 'feed'
                          ? 'bg-purple-500'
                          : 'bg-blue-500'
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

export function RedStoneHero({
  config,
  price,
  historicalData,
  networkStats,
  isError,
  isRefreshing,
  lastUpdated,
  onRefresh,
  onExport,
}: RedStoneHeroProps) {
  const t = useTranslations();

  // 使用 config.themeColor 获取主题色，RedStone 使用 #ef4444
  const themeColor = '#ef4444';

  const currentPrice = price?.price ?? config.marketData.change24hValue ?? 0;
  const priceChange24h = config.marketData.change24h ?? 0;
  const isPositive = priceChange24h >= 0;

  // 生成价格走势数据
  const priceSparkline = useMemo(() => {
    if (historicalData.length > 0) {
      return historicalData.slice(-24).map((d) => d.price);
    }
    return [];
  }, [historicalData]);

  // 核心统计指标 - 增加到5个关键指标
  const primaryStats: StatItem[] = [
    {
      title: t('redstone.hero.stats.price'),
      value: `$${currentPrice.toFixed(2)}`,
      change: `${isPositive ? '+' : ''}${priceChange24h.toFixed(2)}%`,
      changeType: isPositive ? 'positive' : 'negative',
      icon: <Activity className="w-4 h-4" />,
      subtitle: t('redstone.hero.periods.24h'),
      sparklineData: priceSparkline,
    },
    {
      title: t('redstone.hero.stats.tvs'),
      value: `$${(config.marketData.marketCap / 1e6).toFixed(1)}M`,
      change: '+8.3%',
      changeType: 'positive',
      icon: <Wallet className="w-4 h-4" />,
      subtitle: t('redstone.hero.periods.30days'),
    },
    {
      title: t('redstone.hero.stats.dataFeeds'),
      value: `${networkStats?.dataFeeds ?? config.networkData.dataFeeds}+`,
      change: '+50',
      changeType: 'positive',
      icon: <Zap className="w-4 h-4" />,
      subtitle: t('redstone.hero.periods.thisWeek'),
    },
    {
      title: t('redstone.hero.stats.providers'),
      value: '100+',
      change: '+12',
      changeType: 'positive',
      icon: <Database className="w-4 h-4" />,
      subtitle: t('redstone.hero.periods.thisMonth'),
    },
    {
      title: t('redstone.hero.stats.staked'),
      value: '$45.2M',
      change: '+5.7%',
      changeType: 'positive',
      icon: <Lock className="w-4 h-4" />,
      subtitle: t('redstone.hero.periods.24h'),
    },
  ];

  // 次要统计指标 - 整合为紧凑行
  const secondaryStats: StatItem[] = [
    {
      title: t('redstone.hero.stats.supportedChains'),
      value: `${config.supportedChains.length}+`,
      change: '+2',
      changeType: 'positive',
      icon: <Globe className="w-4 h-4" />,
    },
    {
      title: t('redstone.hero.stats.nodes'),
      value: '150+',
      change: '+8',
      changeType: 'positive',
      icon: <Server className="w-4 h-4" />,
    },
    {
      title: t('redstone.hero.stats.responseTime'),
      value: `${networkStats?.avgResponseTime ?? config.networkData.avgResponseTime}ms`,
      change: '-15ms',
      changeType: 'positive',
      icon: <Clock className="w-4 h-4" />,
    },
    {
      title: t('redstone.hero.stats.uptime'),
      value: `${networkStats?.nodeUptime ?? config.networkData.nodeUptime}%`,
      change: '+0.1%',
      changeType: 'positive',
      icon: <TrendingUp className="w-4 h-4" />,
    },
  ];

  // 网络健康度评分
  const healthScore = useMemo(() => {
    const uptimeScore = (networkStats?.nodeUptime ?? config.networkData.nodeUptime) * 0.4;
    const responseScore =
      Math.max(0, 100 - (networkStats?.avgResponseTime ?? config.networkData.avgResponseTime) / 5) *
      0.3;
    const feedScore =
      Math.min(100, (networkStats?.dataFeeds ?? config.networkData.dataFeeds) / 10) * 0.3;
    return Math.round(uptimeScore + responseScore + feedScore);
  }, [config, networkStats]);

  return (
    <div className="bg-white border-b border-gray-200">
      {/* 顶部状态栏 */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <LiveStatusBar
            isConnected={!isError}
            latency={networkStats?.avgResponseTime ?? config.networkData.avgResponseTime}
            lastUpdate={lastUpdated || undefined}
          />
          <QuickActions />
        </div>
      </div>

      {/* 主要内容区 - 桌面端左右分栏布局 */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* 头部信息 - Logo、标题 */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
          {/* 左侧：Logo + 标题 */}
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)` }}
            >
              <OptimizedImage
                src="/logos/oracles/redstone.svg"
                alt="RedStone"
                width={28}
                height={28}
                priority
                className="w-7 h-7"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{t('redstone.hero.title')}</h1>
              <p className="text-xs text-gray-500">{t('redstone.hero.subtitle')}</p>
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

            {/* 次要指标行 */}
            <CompactMetricsRow stats={secondaryStats} />

            {/* 整合信息区 */}
            <UnifiedInfoSection
              networkStats={networkStats}
              healthScore={healthScore}
              chains={config.supportedChains}
              themeColor={themeColor}
              labels={{
                healthScore: t('redstone.hero.health'),
                gas: t('redstone.hero.gas'),
                response: t('redstone.hero.response'),
                online: t('redstone.hero.online'),
                support: t('redstone.hero.supported'),
                chains: t('redstone.hero.chains'),
                gasLow: t('redstone.hero.gasLevel.low'),
                gasMedium: t('redstone.hero.gasLevel.medium'),
                gasHigh: t('redstone.hero.gasLevel.high'),
              }}
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
                labels={{
                  trend24h: t('redstone.hero.priceTrend24h'),
                  before24h: t('redstone.hero.timeAgo.24hAgo'),
                  now: t('redstone.hero.timeAgo.now'),
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 最新动态滚动条 */}
      <LatestUpdates />
    </div>
  );
}

export default RedStoneHero;
