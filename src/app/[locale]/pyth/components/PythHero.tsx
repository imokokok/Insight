'use client';

import { useMemo } from 'react';

import { Activity, Database, Wallet, Shield, Users } from 'lucide-react';

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
  const tUI = useTranslations('ui');

  const themeColor = config.themeColor;

  const currentPrice = price?.price ?? config.marketData.change24hValue ?? 0;
  const priceChange24h = config.marketData.change24h ?? 0;
  const isPositive = priceChange24h >= 0;

  // 生成价格走势数据
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
              networkStats={networkStats ?? undefined}
              healthScore={healthScore}
              chains={config.supportedChains}
              themeColor={themeColor}
              labels={{
                healthScore: tUI('health.healthScore'),
                gas: tUI('metrics.gas'),
                response: tUI('metrics.response'),
                online: tUI('metrics.online'),
                support: tUI('metrics.support'),
                chains: tUI('metrics.chains'),
                gasLow: tUI('health.low'),
                gasMedium: tUI('health.medium'),
                gasHigh: tUI('health.high'),
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
                  trend24h: tUI('metrics.trend24h'),
                  before24h: tUI('metrics.before24h'),
                  now: tUI('metrics.now'),
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PythHero;
