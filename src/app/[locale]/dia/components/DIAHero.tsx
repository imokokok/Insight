'use client';

import { useState, useEffect, useMemo } from 'react';
import { useTranslations } from '@/i18n';
import { OracleConfig } from '@/lib/config/oracles';
import { PriceData } from '@/types/oracle';
import { LiveStatusBar } from '@/components/ui';
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
  ChevronRight,
  ExternalLink,
  Plus,
} from 'lucide-react';

export interface DIAHeroProps {
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
}

// 迷你走势图组件
function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 60;
    const y = 20 - ((value - min) / range) * 20;
    return `${x},${y}`;
  }).join(' ');

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

// 统计卡片组件
function StatCard({ title, value, change, changeType, icon, subtitle, sparklineData }: StatCardProps) {
  const isPositive = changeType === 'positive';
  const isNegative = changeType === 'negative';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-md">
            {icon}
          </div>
          <span className="text-xs text-gray-500">{title}</span>
        </div>
        {sparklineData && (
          <Sparkline data={sparklineData} positive={isPositive} />
        )}
      </div>
      <div className="mt-2">
        <div className="text-xl font-bold text-gray-900">{value}</div>
        <div className="flex items-center gap-2 mt-1">
          {change && (
            <span className={`text-xs font-medium flex items-center gap-0.5 ${
              isPositive ? 'text-emerald-600' : isNegative ? 'text-red-600' : 'text-gray-500'
            }`}>
              {isPositive && <TrendingUp className="w-3 h-3" />}
              {isNegative && <TrendingDown className="w-3 h-3" />}
              {change}
            </span>
          )}
          {subtitle && <span className="text-xs text-gray-400">{subtitle}</span>}
        </div>
      </div>
    </div>
  );
}

// 网络健康度组件
function NetworkHealthScore({ score }: { score: number }) {
  const getColor = () => {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getBgColor = () => {
    if (score >= 90) return 'bg-emerald-100';
    if (score >= 70) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500">网络健康度</span>
        <span className={`text-lg font-bold ${getColor()}`}>{score}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${getBgColor()}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="flex items-center gap-3 mt-2 text-xs">
        <span className="flex items-center gap-1 text-emerald-600">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          数据喂价
        </span>
        <span className="flex items-center gap-1 text-emerald-600">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          数据源
        </span>
        <span className="flex items-center gap-1 text-yellow-600">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
          跨链桥
        </span>
      </div>
    </div>
  );
}

// 链上指标组件
function OnChainMetrics({ config }: { config: OracleConfig }) {
  const gasLevel = useMemo(() => {
    const latency = config.networkData.avgResponseTime;
    if (latency < 150) return { label: '低', color: 'text-emerald-600', bg: 'bg-emerald-100' };
    if (latency < 300) return { label: '中', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { label: '高', color: 'text-red-600', bg: 'bg-red-100' };
  }, [config]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <h4 className="text-xs font-medium text-gray-700 mb-3">链上实时指标</h4>
      <div className="space-y-3">
        {/* Gas 费水平 */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">Gas 费水平</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${gasLevel.bg} ${gasLevel.color}`}>
            {gasLevel.label}
          </span>
        </div>

        {/* 响应时间分布 */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-500">响应时间分布</span>
            <span className="text-xs text-gray-700">{config.networkData.avgResponseTime}ms</span>
          </div>
          <div className="flex gap-1 h-4">
            <div className="flex-1 bg-emerald-400 rounded-sm" style={{ width: '60%' }} />
            <div className="flex-1 bg-yellow-400 rounded-sm" style={{ width: '30%' }} />
            <div className="flex-1 bg-red-400 rounded-sm" style={{ width: '10%' }} />
          </div>
        </div>

        {/* 数据更新频率 */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">每秒更新</span>
          <span className="text-xs font-mono text-indigo-600">~85 次</span>
        </div>
      </div>
    </div>
  );
}

// 多链支持组件
function MultiChainSupport({ chains }: { chains: string[] }) {
  const [showAll, setShowAll] = useState(false);
  const displayChains = showAll ? chains : chains.slice(0, 6);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500">多链支持</span>
        <span className="text-xs text-indigo-600 font-medium">{chains.length}+ 链</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {displayChains.map((chain, index) => (
          <span
            key={index}
            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md border border-gray-200"
          >
            {chain}
          </span>
        ))}
        {!showAll && chains.length > 6 && (
          <button
            onClick={() => setShowAll(true)}
            className="px-2 py-1 text-indigo-600 text-xs hover:bg-indigo-50 rounded-md transition-colors"
          >
            +{chains.length - 6}
          </button>
        )}
      </div>
    </div>
  );
}

// 快速操作组件
function QuickActions() {
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
function LatestUpdates() {
  const updates = [
    { type: 'price', text: 'DIA 价格更新: $1.28 (+3.2%)', time: '2分钟前' },
    { type: 'source', text: '新数据源接入: CoinGecko Pro API', time: '5分钟前' },
    { type: 'feed', text: 'ETH/USD 数据喂价更新', time: '8分钟前' },
    { type: 'nft', text: 'NFT 数据支持: Bored Ape Yacht Club', time: '12分钟前' },
  ];

  return (
    <div className="bg-gray-50 border-t border-gray-200 py-2 px-4">
      <div className="max-w-[1600px] mx-auto flex items-center gap-4 overflow-hidden">
        <span className="text-xs font-medium text-gray-500 flex-shrink-0">最新动态:</span>
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-6 animate-marquee whitespace-nowrap">
            {updates.map((update, index) => (
              <div key={index} className="flex items-center gap-2 text-xs">
                <span className={`w-1.5 h-1.5 rounded-full ${
                  update.type === 'price' ? 'bg-blue-500' :
                  update.type === 'source' ? 'bg-emerald-500' :
                  update.type === 'feed' ? 'bg-purple-500' : 'bg-pink-500'
                }`} />
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

export function DIAHero({
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
}: DIAHeroProps) {
  const t = useTranslations();

  const currentPrice = price?.price ?? config.marketData.change24hValue ?? 0;
  const priceChange24h = config.marketData.change24h ?? 0;
  const isPositive = priceChange24h >= 0;

  // 生成价格走势数据（实际应从 historicalData 计算）
  const priceSparkline = useMemo(() => {
    if (historicalData.length > 0) {
      return historicalData.slice(-24).map(d => d.price);
    }
    // 模拟数据
    return Array.from({ length: 24 }, (_, i) => currentPrice * (1 + (Math.random() - 0.5) * 0.1));
  }, [historicalData, currentPrice]);

  // 8个统计指标
  const stats: StatCardProps[] = [
    {
      title: 'DIA 价格',
      value: `$${currentPrice.toFixed(2)}`,
      change: `${isPositive ? '+' : ''}${priceChange24h.toFixed(2)}%`,
      changeType: isPositive ? 'positive' : 'negative',
      icon: <Activity className="w-4 h-4" />,
      subtitle: '24h 变化',
      sparklineData: priceSparkline,
    },
    {
      title: '市值',
      value: `$${(config.marketData.marketCap / 1e6).toFixed(1)}M`,
      change: '+5.2%',
      changeType: 'positive',
      icon: <Wallet className="w-4 h-4" />,
      subtitle: '24h 变化',
    },
    {
      title: '活跃数据源',
      value: '100+',
      change: '+8%',
      changeType: 'positive',
      icon: <Database className="w-4 h-4" />,
      subtitle: 'Data providers',
    },
    {
      title: '数据喂价数量',
      value: `${config.networkData.dataFeeds.toLocaleString()}`,
      change: '+12%',
      changeType: 'positive',
      icon: <Zap className="w-4 h-4" />,
      subtitle: 'Active feeds',
    },
    {
      title: 'NFT 数据支持',
      value: '50+',
      change: '+15%',
      changeType: 'positive',
      icon: <Layers className="w-4 h-4" />,
      subtitle: 'NFT collections',
    },
    {
      title: '支持链数',
      value: `${config.supportedChains.length}+`,
      change: '+1',
      changeType: 'positive',
      icon: <Globe className="w-4 h-4" />,
      subtitle: 'Blockchains',
    },
    {
      title: '平均响应时间',
      value: `${config.networkData.avgResponseTime}ms`,
      change: '-10%',
      changeType: 'positive',
      icon: <RefreshCw className="w-4 h-4" />,
      subtitle: '优于行业平均',
    },
    {
      title: '网络正常运行时间',
      value: `${networkStats?.nodeUptime ?? config.networkData.nodeUptime}%`,
      change: '+0.1%',
      changeType: 'positive',
      icon: <Shield className="w-4 h-4" />,
      subtitle: '30天统计',
    },
  ];

  // 网络健康度评分（模拟计算）
  const healthScore = useMemo(() => {
    const uptimeScore = config.networkData.nodeUptime * 0.4;
    const responseScore = Math.max(0, 100 - config.networkData.avgResponseTime / 5) * 0.3;
    const feedScore = Math.min(100, config.networkData.dataFeeds / 5) * 0.3;
    return Math.round(uptimeScore + responseScore + feedScore);
  }, [config]);

  // 获取主题色类名
  const getThemeColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      indigo: 'bg-indigo-600',
      blue: 'bg-blue-600',
      purple: 'bg-purple-600',
      red: 'bg-red-600',
      green: 'bg-green-600',
      yellow: 'bg-yellow-600',
      cyan: 'bg-cyan-600',
      amber: 'bg-amber-600',
      pink: 'bg-pink-600',
      violet: 'bg-violet-600',
    };
    return colorMap[color] || 'bg-indigo-600';
  };

  const themeColorClass = getThemeColorClass(config.themeColor);

  return (
    <div className="bg-white border-b border-gray-200">
      {/* 顶部状态栏 */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <LiveStatusBar
            isConnected={!isError}
            latency={config.networkData.latency}
            lastUpdate={lastUpdated || undefined}
          />
          <QuickActions />
        </div>
      </div>

      {/* 主要内容区 */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* 头部信息 */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className={`w-14 h-14 bg-gradient-to-br ${themeColorClass} to-indigo-800 rounded-xl flex items-center justify-center shadow-lg`}>
              <img
                src="/logos/oracles/dia.svg"
                alt="DIA"
                className="w-8 h-8"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">DIA</h1>
              <p className="text-sm text-gray-500">开源的跨链数据预言机平台</p>
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
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              {t('common.export')}
            </button>
          </div>
        </div>

        {/* 统计卡片网格 - 8个指标 */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-4">
          {stats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>

        {/* 中间信息区 - 链上指标、网络健康度、多链支持 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <OnChainMetrics config={config} />
          <NetworkHealthScore score={healthScore} />
          <MultiChainSupport chains={config.supportedChains} />
        </div>
      </div>

      {/* 最新动态滚动条 */}
      <LatestUpdates />
    </div>
  );
}

export default DIAHero;
