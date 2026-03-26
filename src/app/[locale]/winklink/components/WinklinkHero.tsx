'use client';

import { useState, useMemo } from 'react';

import {
  TrendingUp,
  TrendingDown,
  Activity,
  Globe,
  Database,
  Wallet,
  Zap,
  Shield,
  Bell,
  FileText,
  Layers,
  RefreshCw,
  ExternalLink,
  Plus,
  Gamepad2,
  Cpu,
  Clock,
} from 'lucide-react';

import { LiveStatusBar } from '@/components/ui';
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
  onRefresh: () => void;
  onExport: () => void;
}

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  subtitle?: string;
  sparklineData?: number[];
  themeColor?: string;
  isPrimary?: boolean;
}

// 迷你走势图组件
function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 60;
      const y = 20 - ((value - min) / range) * 20;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <svg width="60" height="24" className="ml-auto">
      <polyline
        fill="none"
        stroke={positive ? '#10b981' : '#ef4444'}
        strokeWidth="2"
        points={points}
      />
    </svg>
  );
}

// 核心统计卡片组件
function PrimaryStatCard({
  title,
  value,
  change,
  changeType,
  icon,
  subtitle,
  sparklineData,
  themeColor,
}: StatCardProps) {
  const isPositive = changeType === 'positive';
  const isNegative = changeType === 'negative';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div
            className="p-2 rounded-lg"
            style={{ backgroundColor: `${themeColor}15`, color: themeColor }}
          >
            {icon}
          </div>
          <span className="text-sm text-gray-500">{title}</span>
        </div>
        {sparklineData && <Sparkline data={sparklineData} positive={isPositive} />}
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="flex items-center gap-2 mt-1">
          {change && (
            <span
              className={`text-sm font-medium flex items-center gap-0.5 ${
                isPositive ? 'text-emerald-600' : isNegative ? 'text-red-600' : 'text-gray-500'
              }`}
            >
              {isPositive && <TrendingUp className="w-3.5 h-3.5" />}
              {isNegative && <TrendingDown className="w-3.5 h-3.5" />}
              {change}
            </span>
          )}
          {subtitle && <span className="text-xs text-gray-400">{subtitle}</span>}
        </div>
      </div>
    </div>
  );
}

// 次要统计卡片组件
function SecondaryStatCard({
  title,
  value,
  change,
  changeType,
  icon,
  subtitle,
}: Omit<StatCardProps, 'sparklineData' | 'themeColor' | 'isPrimary'>) {
  const isPositive = changeType === 'positive';
  const isNegative = changeType === 'negative';

  return (
    <div className="bg-gray-50/50 border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-white text-gray-500 rounded-md border border-gray-200">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 truncate">{title}</span>
            {change && (
              <span
                className={`text-xs font-medium flex items-center gap-0.5 ${
                  isPositive ? 'text-emerald-600' : isNegative ? 'text-red-600' : 'text-gray-500'
                }`}
              >
                {isPositive && <TrendingUp className="w-3 h-3" />}
                {isNegative && <TrendingDown className="w-3 h-3" />}
                {change}
              </span>
            )}
          </div>
          <div className="text-lg font-semibold text-gray-900">{value}</div>
          {subtitle && <span className="text-xs text-gray-400">{subtitle}</span>}
        </div>
      </div>
    </div>
  );
}

// 网络健康度组件
function NetworkHealthScore({ score, themeColor }: { score: number; themeColor: string }) {
  const getColor = () => {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getBgColor = () => {
    if (score >= 90) return 'bg-emerald-500';
    if (score >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-700">网络健康度</span>
        <span className={`text-2xl font-bold ${getColor()}`}>{score}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className={`h-2.5 rounded-full transition-all ${getBgColor()}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="flex items-center gap-4 mt-3 text-xs">
        <span className="flex items-center gap-1.5 text-emerald-600">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          数据喂价
        </span>
        <span className="flex items-center gap-1.5 text-emerald-600">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          TRON网络
        </span>
        <span className="flex items-center gap-1.5 text-yellow-600">
          <span className="w-2 h-2 rounded-full bg-yellow-500" />
          游戏数据
        </span>
      </div>
    </div>
  );
}

// 链上指标组件
function OnChainMetrics({
  avgResponseTime,
  dataFeeds,
  themeColor,
}: {
  avgResponseTime: number;
  dataFeeds: number;
  themeColor: string;
}) {
  const gasLevel = useMemo(() => {
    if (avgResponseTime < 150)
      return { label: '低', color: 'text-emerald-600', bg: 'bg-emerald-100' };
    if (avgResponseTime < 300)
      return { label: '中', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { label: '高', color: 'text-red-600', bg: 'bg-red-100' };
  }, [avgResponseTime]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <h4 className="text-sm font-medium text-gray-700 mb-4">链上实时指标</h4>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">Gas 费水平</span>
          <span
            className={`text-xs font-medium px-2.5 py-1 rounded-full ${gasLevel.bg} ${gasLevel.color}`}
          >
            {gasLevel.label}
          </span>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">响应时间分布</span>
            <span className="text-sm font-medium text-gray-700">{avgResponseTime}ms</span>
          </div>
          <div className="flex gap-1 h-5">
            <div className="flex-1 bg-emerald-400 rounded-sm" style={{ width: '60%' }} />
            <div className="flex-1 bg-yellow-400 rounded-sm" style={{ width: '30%' }} />
            <div className="flex-1 bg-red-400 rounded-sm" style={{ width: '10%' }} />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">每秒更新</span>
          <span className="text-sm font-mono font-medium" style={{ color: themeColor }}>
            ~{Math.round(dataFeeds / 10)} 次
          </span>
        </div>
      </div>
    </div>
  );
}

// 多链支持组件
function MultiChainSupport({ chains, themeColor }: { chains: string[]; themeColor: string }) {
  const [showAll, setShowAll] = useState(false);
  const displayChains = showAll ? chains : chains.slice(0, 6);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-700">多链支持</span>
        <span className="text-sm font-medium" style={{ color: themeColor }}>
          {chains.length}+ 链
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {displayChains.map((chain, index) => (
          <span
            key={index}
            className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-md border border-gray-200 hover:bg-gray-200 transition-colors"
          >
            {chain}
          </span>
        ))}
        {!showAll && chains.length > 6 && (
          <button
            onClick={() => setShowAll(true)}
            className="px-2.5 py-1 text-xs hover:bg-gray-100 rounded-md transition-colors border border-transparent"
            style={{ color: themeColor }}
          >
            +{chains.length - 6}
          </button>
        )}
      </div>
    </div>
  );
}

// 快速操作组件
function QuickActions({ themeColor }: { themeColor: string }) {
  const actions = [
    { icon: <Bell className="w-4 h-4" />, label: '价格提醒', href: '#' },
    { icon: <Plus className="w-4 h-4" />, label: '添加监控', href: '#' },
    { icon: <FileText className="w-4 h-4" />, label: 'API文档', href: '#' },
    { icon: <Layers className="w-4 h-4" />, label: '切换网络', href: '#' },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action, index) => (
        <button
          key={index}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-md text-xs text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
        >
          {action.icon}
          <span>{action.label}</span>
        </button>
      ))}
    </div>
  );
}

// 最新动态滚动条
function LatestUpdates({ themeColor }: { themeColor: string }) {
  const updates = [
    { type: 'price', text: 'WIN 价格更新: $0.00012 (+5.2%)', time: '2分钟前' },
    { type: 'node', text: '新节点加入: TRON生态 (亚太地区)', time: '5分钟前' },
    { type: 'feed', text: '游戏数据喂价更新: WIN/TRX', time: '8分钟前' },
    { type: 'system', text: 'TRON网络同步完成', time: '15分钟前' },
  ];

  return (
    <div className="bg-gray-50 border-t border-gray-200 py-2 px-4">
      <div className="max-w-[1600px] mx-auto flex items-center gap-4 overflow-hidden">
        <span className="text-xs font-medium text-gray-500 flex-shrink-0">最新动态:</span>
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
  isLoading,
  isError,
  isRefreshing,
  lastUpdated,
  onRefresh,
  onExport,
}: WinklinkHeroProps) {
  const t = useTranslations();

  // 使用 config.themeColor 获取主题色
  const themeColor = config.themeColor || '#ec4899';

  const currentPrice = price?.price ?? config.marketData.change24hValue ?? 0;
  const priceChange24h = config.marketData.change24h ?? 0;
  const isPositive = priceChange24h >= 0;

  // 生成价格走势数据
  const priceSparkline = useMemo(() => {
    if (historicalData.length > 0) {
      return historicalData.slice(-24).map((d) => d.price);
    }
    // 模拟数据
    return Array.from({ length: 24 }, (_, i) => currentPrice * (1 + (Math.random() - 0.5) * 0.1));
  }, [historicalData, currentPrice]);

  // 核心统计指标 (Primary stats)
  const primaryStats: StatCardProps[] = [
    {
      title: 'WINKLINK Price',
      value: `$${currentPrice.toFixed(6)}`,
      change: `${isPositive ? '+' : ''}${priceChange24h.toFixed(2)}%`,
      changeType: isPositive ? 'positive' : 'negative',
      icon: <Activity className="w-5 h-5" />,
      subtitle: '24h 变化',
      sparklineData: priceSparkline,
    },
    {
      title: 'Market Cap',
      value: `$${(config.marketData.marketCap / 1e6).toFixed(1)}M`,
      change: '+8.3%',
      changeType: 'positive',
      icon: <Shield className="w-5 h-5" />,
      subtitle: '30天增长',
    },
    {
      title: 'TRON Integration',
      value: '85%',
      change: '+2.1%',
      changeType: 'positive',
      icon: <Globe className="w-5 h-5" />,
      subtitle: '本月提升',
    },
    {
      title: 'Gaming Data Feeds',
      value: '20+',
      change: '+15%',
      changeType: 'positive',
      icon: <Gamepad2 className="w-5 h-5" />,
      subtitle: '本周新增 3 个',
    },
  ];

  // 次要统计指标 (Secondary stats)
  const secondaryStats: Omit<StatCardProps, 'sparklineData' | 'themeColor' | 'isPrimary'>[] = [
    {
      title: 'Supported Chains',
      value: `${config.supportedChains.length}+`,
      change: '0%',
      changeType: 'neutral',
      icon: <Database className="w-4 h-4" />,
      subtitle: '主流链覆盖',
    },
    {
      title: 'Staking Amount',
      value: `${(config.marketData.circulatingSupply / 1e6).toFixed(0)}M`,
      change: '+5.7%',
      changeType: 'positive',
      icon: <Wallet className="w-4 h-4" />,
      subtitle: `APR 12%`,
    },
    {
      title: 'Avg Response Time',
      value: `${config.networkData.avgResponseTime}ms`,
      change: '-8%',
      changeType: 'positive',
      icon: <Clock className="w-4 h-4" />,
      subtitle: '优于行业平均',
    },
    {
      title: 'Network Uptime',
      value: `${config.networkData.nodeUptime}%`,
      change: '+0.02%',
      changeType: 'positive',
      icon: <Cpu className="w-4 h-4" />,
      subtitle: '24h 统计',
    },
  ];

  // 网络健康度评分（模拟计算）
  const healthScore = useMemo(() => {
    const uptimeScore = config.networkData.nodeUptime * 0.4;
    const responseScore = Math.max(0, 100 - config.networkData.avgResponseTime / 5) * 0.3;
    const feedScore = Math.min(100, config.networkData.dataFeeds / 2) * 0.3;
    return Math.round(uptimeScore + responseScore + feedScore);
  }, [config]);

  return (
    <div className="bg-white border-b border-gray-200">
      {/* 顶部状态栏 */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <LiveStatusBar
            isConnected={!isError}
            latency={networkStats?.avgResponseTime || config.networkData.avgResponseTime}
            lastUpdate={lastUpdated || undefined}
          />
          <QuickActions themeColor={themeColor} />
        </div>
      </div>

      {/* 主要内容区 */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {/* 头部信息 */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg"
              style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}dd)` }}
            >
              <img src="/logos/oracles/winklink.svg" alt="WINkLink" className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">WINkLink</h1>
              <p className="text-sm text-gray-500">{t('winklink.subtitle')}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {t('common.refresh')}
            </button>
            <button
              onClick={onExport}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg hover:opacity-90 transition-colors shadow-sm"
              style={{ backgroundColor: themeColor }}
            >
              <ExternalLink className="w-4 h-4" />
              {t('common.export')}
            </button>
          </div>
        </div>

        {/* 核心统计指标 - 4列布局 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {primaryStats.map((stat, index) => (
            <PrimaryStatCard key={index} {...stat} themeColor={themeColor} />
          ))}
        </div>

        {/* 次要统计指标 - 4列紧凑布局 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3 mb-5">
          {secondaryStats.map((stat, index) => (
            <SecondaryStatCard key={index} {...stat} />
          ))}
        </div>

        {/* 中间信息区 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <OnChainMetrics
            avgResponseTime={networkStats?.avgResponseTime ?? config.networkData.avgResponseTime}
            dataFeeds={networkStats?.dataFeeds ?? config.networkData.dataFeeds}
            themeColor={themeColor}
          />
          <NetworkHealthScore score={healthScore} themeColor={themeColor} />
          <MultiChainSupport chains={config.supportedChains} themeColor={themeColor} />
        </div>
      </div>

      {/* 最新动态滚动条 */}
      <LatestUpdates themeColor={themeColor} />
    </div>
  );
}
