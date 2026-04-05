'use client';

import { useMemo } from 'react';

import {
  TrendingUp,
  Activity,
  Database,
  Wallet,
  Zap,
  Shield,
  Clock,
  Server,
  BarChart3,
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

import { type NetworkStats } from '../types';

interface ChainlinkHeroProps {
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

export function ChainlinkHero({
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
}: ChainlinkHeroProps) {
  const t = useTranslations('chainlink');
  const tUi = useTranslations('ui');
  const tMetrics = useTranslations('ui.oracleMetrics');
  const themeColor = '#375bd2'; // Chainlink 主题色

  const currentPrice = price?.price ?? config.marketData.change24hValue ?? 0;
  const priceChange24h = config.marketData.change24h ?? 0;
  const isPositive = priceChange24h >= 0;

  // 生成价格走势数据 - 使用伪随机种子确保稳定性
  const priceSparkline = useMemo(() => {
    if (historicalData.length > 0) {
      return historicalData.slice(-24).map((d) => d.price);
    }
    return Array.from({ length: 24 }, (_, index) => {
      const seed = index * 0.1;
      return currentPrice * (1 + Math.sin(seed) * 0.5 * 0.1);
    });
  }, [historicalData, currentPrice]);

  // 核心统计指标 - 增加到5个
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
      subtitle: t('timeRange.30d'),
    },
    {
      title: tMetrics('activeValidators'),
      value: `${config.networkData.activeNodes.toLocaleString()}`,
      change: '+5.2%',
      changeType: 'positive',
      icon: <Database className="w-4 h-4" />,
      subtitle: t('timeRange.thisMonth'),
    },
    {
      title: tMetrics('dataFeeds'),
      value: `${config.networkData.dataFeeds.toLocaleString()}`,
      change: '+8.3%',
      changeType: 'positive',
      icon: <Zap className="w-4 h-4" />,
      subtitle: t('timeRange.thisMonth'),
    },
    {
      title: tMetrics('stakingAmount'),
      value: `${(config.marketData.circulatingSupply / 1e6).toFixed(1)}M`,
      change: '+3.7%',
      changeType: 'positive',
      icon: <Wallet className="w-4 h-4" />,
      subtitle: t('timeRange.30d'),
    },
  ];

  // 次要统计指标 - 整合为1行
  const secondaryStats: StatItem[] = [
    {
      title: tMetrics('avgResponse'),
      value: `${config.networkData.avgResponseTime}ms`,
      change: '-15%',
      changeType: 'positive',
      icon: <Clock className="w-3.5 h-3.5" />,
    },
    {
      title: tMetrics('successRate'),
      value: `${config.networkData.nodeUptime}%`,
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
      value: '45ms',
      change: '-8%',
      changeType: 'positive',
      icon: <Server className="w-3.5 h-3.5" />,
    },
  ];

  // 网络健康度评分
  const healthScore = useMemo(() => {
    const uptimeScore = config.networkData.nodeUptime * 0.4;
    const responseScore = Math.max(0, 100 - config.networkData.avgResponseTime / 5) * 0.3;
    const feedScore = Math.min(100, config.networkData.dataFeeds / 10) * 0.3;
    return Math.round(uptimeScore + responseScore + feedScore);
  }, [config]);

  return (
    <div className="bg-white border-b border-gray-200">
      {/* 顶部状态栏 */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <LiveStatusBar
            isConnected={!isError}
            latency={245}
            lastUpdate={lastUpdated || undefined}
          />
        </div>
      </div>

      {/* 主要内容区 - 桌面端左右分栏布局 */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* 头部信息 - Logo、标题、数据新鲜度 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)` }}
            >
              <OptimizedImage
                src="/logos/oracles/chainlink.svg"
                alt="Chainlink"
                width={28}
                height={28}
                priority
                className="w-7 h-7"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Chainlink</h1>
              <p className="text-xs text-gray-500">{t('subtitle')}</p>
            </div>
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
              networkStats={config.networkData}
              healthScore={healthScore}
              chains={config.supportedChains}
              themeColor={themeColor}
              labels={{
                healthScore: tUi('health.healthScore'),
                gas: tUi('metrics.gas'),
                response: tUi('metrics.response'),
                online: tUi('metrics.online'),
                support: tUi('metrics.support'),
                chains: tUi('metrics.chains'),
                gasLow: tUi('health.low'),
                gasMedium: tUi('health.medium'),
                gasHigh: tUi('health.high'),
              }}
            />
          </div>

          {/* 分隔线（仅桌面端显示） */}
          <div className="hidden lg:block w-px bg-gray-200 self-stretch" />

          {/* 右侧区域（30%）- 迷你图表 + 操作按钮 */}
          <div className="lg:w-[30%] flex flex-col gap-3">
            {/* 操作按钮 */}
            <ActionButtons
              onRefresh={onRefresh}
              onExport={onExport}
              isRefreshing={isRefreshing}
              themeColor={themeColor}
            />

            {/* 迷你价格图表 */}
            <div className="p-3 rounded-xl bg-gray-50/50 border border-gray-100 flex-1 min-h-[120px]">
              <MiniPriceChart
                historicalData={historicalData}
                currentPrice={price}
                themeColor={themeColor}
                labels={{
                  trend24h: tUi('metrics.trend24h'),
                  before24h: tUi('metrics.before24h'),
                  now: tUi('metrics.now'),
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
