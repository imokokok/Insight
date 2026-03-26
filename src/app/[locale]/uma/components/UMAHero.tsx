'use client';

import { useState, useMemo } from 'react';
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
  Scale,
  Clock,
  Bell,
  FileText,
  Layers,
  RefreshCw,
  ExternalLink,
  Plus,
  Gavel,
  Link2,
  Server,
} from 'lucide-react';

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

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  subtitle?: string;
  sparklineData?: number[];
  themeColor: string;
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
function StatCard({ title, value, change, changeType, icon, subtitle, sparklineData, themeColor }: StatCardProps) {
  const isPositive = changeType === 'positive';
  const isNegative = changeType === 'negative';

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div 
            className="p-1.5 rounded-md"
            style={{ backgroundColor: `${themeColor}20`, color: themeColor }}
          >
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
function NetworkHealthScore({ score, themeColor }: { score: number; themeColor: string }) {
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
          乐观预言机
        </span>
        <span className="flex items-center gap-1 text-emerald-600">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          验证者网络
        </span>
        <span className="flex items-center gap-1 text-yellow-600">
          <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
          争议解决
        </span>
      </div>
    </div>
  );
}

// 链上指标组件
function OnChainMetrics({ 
  avgResponseTime, 
  nodeUptime, 
  dataFeeds 
}: { 
  avgResponseTime: number; 
  nodeUptime: number;
  dataFeeds: number;
}) {
  const gasLevel = useMemo(() => {
    if (avgResponseTime < 150) return { label: '低', color: 'text-emerald-600', bg: 'bg-emerald-100' };
    if (avgResponseTime < 300) return { label: '中', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { label: '高', color: 'text-red-600', bg: 'bg-red-100' };
  }, [avgResponseTime]);

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
            <span className="text-xs text-gray-700">{avgResponseTime}ms</span>
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
          <span className="text-xs font-mono text-red-600">~{Math.round(dataFeeds / 100)} 次</span>
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
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-500">多链支持</span>
        <span 
          className="text-xs font-medium"
          style={{ color: themeColor }}
        >
          {chains.length}+ 链
        </span>
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
            className="px-2 py-1 text-xs hover:bg-red-50 rounded-md transition-colors"
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
function LatestUpdates() {
  const updates = [
    { type: 'price', text: 'UMA 价格更新: $3.85 (+1.8%)', time: '2分钟前' },
    { type: 'node', text: '新验证者加入: 0x9c2d...8f1a (欧洲地区)', time: '5分钟前' },
    { type: 'feed', text: '乐观预言机请求处理: 1,234 次', time: '8分钟前' },
    { type: 'system', text: '争议解决机制升级完成', time: '15分钟前' },
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
                  update.type === 'price' ? 'bg-red-500' :
                  update.type === 'node' ? 'bg-emerald-500' :
                  update.type === 'feed' ? 'bg-purple-500' : 'bg-gray-500'
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

export function UMAHero({
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
}: UMAHeroProps) {
  const t = useTranslations();

  // 使用 config.themeColor 获取主题色，默认为红色
  const themeColor = config.themeColor || '#ef4444';

  const currentPrice = price?.price ?? config.marketData.change24hValue ?? 0;
  const priceChange24h = config.marketData.change24h ?? 0;
  const isPositive = priceChange24h >= 0;
  const marketCap = config.marketData.marketCap ?? 0;

  // 生成价格走势数据
  const priceSparkline = useMemo(() => {
    if (historicalData.length > 0) {
      return historicalData.slice(-24).map(d => d.price);
    }
    return Array.from({ length: 24 }, (_, i) => currentPrice * (1 + (Math.random() - 0.5) * 0.1));
  }, [historicalData, currentPrice]);

  // 8个统计指标
  const stats: StatCardProps[] = [
    {
      title: 'UMA 价格',
      value: `$${currentPrice.toFixed(2)}`,
      change: `${isPositive ? '+' : ''}${priceChange24h.toFixed(2)}%`,
      changeType: isPositive ? 'positive' : 'negative',
      icon: <Activity className="w-4 h-4" />,
      subtitle: '24h 变化',
      sparklineData: priceSparkline,
      themeColor,
    },
    {
      title: '市值',
      value: marketCap > 0 ? `$${(marketCap / 1e6).toFixed(1)}M` : '$250M+',
      change: '+8.5%',
      changeType: 'positive',
      icon: <Wallet className="w-4 h-4" />,
      subtitle: '30天增长',
      themeColor,
    },
    {
      title: '活跃验证者',
      value: `${config.networkData?.activeNodes?.toLocaleString() ?? '100+'}`,
      change: '+12%',
      changeType: 'positive',
      icon: <Shield className="w-4 h-4" />,
      subtitle: '本月新增 15 个',
      themeColor,
    },
    {
      title: '争议解决',
      value: '2,456',
      change: '+5.2%',
      changeType: 'positive',
      icon: <Gavel className="w-4 h-4" />,
      subtitle: '成功率 98.5%',
      themeColor,
    },
    {
      title: '支持链数',
      value: `${config.supportedChains?.length ?? 8}+`,
      change: '0%',
      changeType: 'neutral',
      icon: <Link2 className="w-4 h-4" />,
      subtitle: 'EVM 兼容链',
      themeColor,
    },
    {
      title: '数据源',
      value: `${config.networkData?.dataFeeds?.toLocaleString() ?? '50+'}`,
      change: '+15%',
      changeType: 'positive',
      icon: <Database className="w-4 h-4" />,
      subtitle: '本周新增 8 个',
      themeColor,
    },
    {
      title: '平均响应',
      value: `${networkStats?.avgResponseTime ?? config.networkData?.avgResponseTime ?? 200}ms`,
      change: '-10%',
      changeType: 'positive',
      icon: <Clock className="w-4 h-4" />,
      subtitle: '优于行业平均',
      themeColor,
    },
    {
      title: '验证者运行时间',
      value: `${networkStats?.nodeUptime ?? config.networkData?.nodeUptime ?? 99.9}%`,
      change: '+0.1%',
      changeType: 'positive',
      icon: <Server className="w-4 h-4" />,
      subtitle: '24h 统计',
      themeColor,
    },
  ];

  // 网络健康度评分（模拟计算）
  const healthScore = useMemo(() => {
    const uptime = networkStats?.nodeUptime ?? config.networkData?.nodeUptime ?? 99.9;
    const responseTime = networkStats?.avgResponseTime ?? config.networkData?.avgResponseTime ?? 200;
    const feeds = networkStats?.dataFeeds ?? config.networkData?.dataFeeds ?? 50;
    
    const uptimeScore = uptime * 0.4;
    const responseScore = Math.max(0, 100 - responseTime / 5) * 0.3;
    const feedScore = Math.min(100, feeds / 2) * 0.3;
    return Math.round(uptimeScore + responseScore + feedScore);
  }, [networkStats, config]);

  return (
    <div className="bg-white border-b border-gray-200">
      {/* 顶部状态栏 */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <LiveStatusBar
            isConnected={!isError}
            latency={networkStats?.avgResponseTime || 245}
            lastUpdate={lastUpdated || undefined}
          />
          <QuickActions themeColor={themeColor} />
        </div>
      </div>

      {/* 主要内容区 */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
        {/* 头部信息 */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div 
              className="w-14 h-14 rounded-xl flex items-center justify-center shadow-lg"
              style={{ backgroundColor: themeColor }}
            >
              <img
                src="/logos/oracles/uma.svg"
                alt="UMA"
                className="w-8 h-8"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">UMA</h1>
              <p className="text-sm text-gray-500">{t('uma.subtitle')}</p>
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
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg hover:opacity-90 transition-colors"
              style={{ backgroundColor: themeColor }}
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
          <OnChainMetrics 
            avgResponseTime={networkStats?.avgResponseTime ?? config.networkData?.avgResponseTime ?? 200}
            nodeUptime={networkStats?.nodeUptime ?? config.networkData?.nodeUptime ?? 99.9}
            dataFeeds={networkStats?.dataFeeds ?? config.networkData?.dataFeeds ?? 50}
          />
          <NetworkHealthScore score={healthScore} themeColor={themeColor} />
          <MultiChainSupport chains={config.supportedChains ?? ['Ethereum', 'Polygon', 'Arbitrum', 'Optimism', 'Base', 'Avalanche']} themeColor={themeColor} />
        </div>
      </div>

      {/* 最新动态滚动条 */}
      <LatestUpdates />
    </div>
  );
}

export default UMAHero;
