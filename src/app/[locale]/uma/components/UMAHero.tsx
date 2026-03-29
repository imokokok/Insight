'use client';

import { useMemo, useState, useEffect } from 'react';

import {
  TrendingUp,
  TrendingDown,
  Activity,
  Globe,
  Database,
  Wallet,
  Zap,
  Shield,
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
  TrendingUp as TrendingUpIcon,
  ArrowRight,
  Users,
  CheckCircle,
} from 'lucide-react';

import { OptimizedImage } from '@/components/performance/OptimizedImage';
import { LiveStatusBar } from '@/components/ui';
import { DataFreshnessIndicator } from '@/components/ui/DataFreshnessIndicator';
import { useTranslations } from '@/i18n';
import { type OracleConfig } from '@/lib/config/oracles';
import { type PriceData } from '@/types/oracle';
import { useUMARealtime } from '@/hooks/useUMARealtime';

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

interface StatItem {
  title: string;
  value: string;
  change?: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  subtitle?: string;
  sparklineData?: number[];
}

function OOOverviewCard({ themeColor }: { themeColor: string }) {
  const t = useTranslations();

  const advantages = [
    {
      icon: <Zap className="w-4 h-4" />,
      title: '高效快速',
      description: '无争议情况下2小时完成验证',
    },
    {
      icon: <Shield className="w-4 h-4" />,
      title: '安全可靠',
      description: '经济激励确保验证者诚实',
    },
    {
      icon: <Users className="w-4 h-4" />,
      title: '去中心化',
      description: '任何人可参与验证和投票',
    },
  ];

  return (
    <div className="p-4 rounded-xl bg-gradient-to-br from-gray-50 to-white border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${themeColor}15` }}
          >
            <Zap className="w-4 h-4" style={{ color: themeColor }} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">乐观预言机机制</h3>
            <p className="text-xs text-gray-500">Optimistic Oracle</p>
          </div>
        </div>
        <a
          href="#optimistic-oracle-flow"
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg hover:bg-gray-100 transition-colors"
          style={{ color: themeColor }}
        >
          <span>了解更多</span>
          <ArrowRight className="w-3 h-3" />
        </a>
      </div>

      <p className="text-xs text-gray-600 mb-3">
        默认信任验证者答案，仅在争议时投票裁决，大幅提升效率降低成本。
      </p>

      <div className="space-y-2">
        {advantages.map((advantage, index) => (
          <div key={index} className="flex items-center gap-2">
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${themeColor}10` }}
            >
              <div style={{ color: themeColor }} className="w-3.5 h-3.5">
                {advantage.icon}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-medium text-gray-900">{advantage.title}</span>
              <span className="text-xs text-gray-500 ml-1">· {advantage.description}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RealtimePriceDisplay({
  price,
  change24h,
  themeColor,
  isRealtimeConnected,
}: {
  price: number;
  change24h: number;
  themeColor: string;
  isRealtimeConnected: boolean;
}) {
  const [displayPrice, setDisplayPrice] = useState(price);
  const [priceDirection, setPriceDirection] = useState<'up' | 'down' | null>(null);
  const [showPulse, setShowPulse] = useState(false);

  useEffect(() => {
    if (price !== displayPrice) {
      setPriceDirection(price > displayPrice ? 'up' : 'down');
      setShowPulse(true);
      setDisplayPrice(price);

      const timer = setTimeout(() => {
        setShowPulse(false);
        setPriceDirection(null);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [price, displayPrice]);

  const isPositive = change24h >= 0;

  return (
    <div className="relative">
      <div className="flex items-baseline gap-2">
        <span
          className={`text-2xl font-bold tracking-tight transition-colors duration-300 ${
            priceDirection === 'up'
              ? 'text-emerald-600'
              : priceDirection === 'down'
                ? 'text-red-600'
                : 'text-gray-900'
          }`}
        >
          ${displayPrice.toFixed(2)}
        </span>
        <span
          className={`text-sm font-medium flex items-center gap-0.5 ${
            isPositive ? 'text-emerald-600' : 'text-red-600'
          }`}
        >
          {isPositive ? (
            <TrendingUp className="w-3.5 h-3.5" />
          ) : (
            <TrendingDown className="w-3.5 h-3.5" />
          )}
          {isPositive ? '+' : ''}
          {change24h.toFixed(2)}%
        </span>
      </div>

      {showPulse && (
        <div
          className={`absolute -inset-1 rounded-lg opacity-20 ${
            priceDirection === 'up' ? 'bg-emerald-500' : 'bg-red-500'
          }`}
          style={{
            animation: 'pulse 1s ease-out',
          }}
        />
      )}

      {isRealtimeConnected && (
        <div className="flex items-center gap-1 mt-1">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-xs text-gray-500">实时更新中</span>
        </div>
      )}
    </div>
  );
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
  const chartData = useMemo(() => {
    if (historicalData.length >= 20) {
      return historicalData.slice(-20).map((d) => d.price);
    }
    // 生成基于当前价格的模拟数据
    const basePrice = currentPrice?.price || 4.5;
    return Array.from({ length: 20 }, (_, i) => basePrice * (1 + ((i % 7) - 3) * 0.015));
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
          <span>24H 走势</span>
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
        <span>24h前</span>
        <span>现在</span>
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
}: {
  networkStats?: {
    avgResponseTime: number;
    nodeUptime: number;
    dataFeeds: number;
  };
  healthScore: number;
  chains: string[];
  themeColor: string;
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
      return { label: '中', color: 'text-yellow-600', bg: 'bg-yellow-500', width: '50%' };
    const { avgResponseTime } = networkStats;
    if (avgResponseTime < 150)
      return { label: '低', color: 'text-emerald-600', bg: 'bg-emerald-500', width: '30%' };
    if (avgResponseTime < 300)
      return { label: '中', color: 'text-yellow-600', bg: 'bg-yellow-500', width: '50%' };
    return { label: '高', color: 'text-red-600', bg: 'bg-red-500', width: '80%' };
  }, [networkStats]);

  // 只显示前3个链
  const displayChains = chains.slice(0, 3);
  const remainingCount = Math.max(0, chains.length - 3);

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 py-3 border-t border-gray-100">
      {/* 网络健康度 - 进度条+数字紧凑形式 */}
      <div className="flex items-center gap-2 min-w-[120px]">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Activity className="w-3.5 h-3.5" />
          <span>健康度</span>
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
              <span>Gas</span>
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
            <span className="text-xs text-gray-500">响应</span>
            <span className="text-xs font-medium text-gray-900">
              {networkStats.avgResponseTime}ms
            </span>
          </div>

          {/* 节点在线率 */}
          <div className="flex items-center gap-1">
            <Server className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-xs text-gray-500">在线</span>
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
          <span>支持</span>
        </div>
        <div className="flex items-center gap-1.5">
          {/* 链数量 */}
          <span className="text-xs font-semibold" style={{ color: themeColor }}>
            {chains.length}+ 链
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

// 快速操作组件
function QuickActions({ themeColor }: { themeColor: string }) {
  const actions = [
    { icon: <Bell className="w-3.5 h-3.5" />, label: '价格提醒' },
    { icon: <Plus className="w-3.5 h-3.5" />, label: '添加监控' },
    { icon: <FileText className="w-3.5 h-3.5" />, label: 'API文档' },
    { icon: <Layers className="w-3.5 h-3.5" />, label: '切换网络' },
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
  const defaultUpdates = [
    { type: 'price' as const, text: '价格更新: $4.52 (+2.3%)', time: '2分钟前' },
    { type: 'node' as const, text: '新节点加入: 0x7a8b...3c4d', time: '5分钟前' },
    { type: 'feed' as const, text: '数据喂价更新', time: '8分钟前' },
    { type: 'system' as const, text: '系统维护完成', time: '15分钟前' },
  ];

  return (
    <div className="bg-gray-50 border-t border-gray-200 py-2 px-4">
      <div className="max-w-[1600px] mx-auto flex items-center gap-4 overflow-hidden">
        <span className="text-xs font-medium text-gray-500 flex-shrink-0">最新动态:</span>
        <div className="flex-1 overflow-hidden">
          <div className="flex items-center gap-6 animate-marquee whitespace-nowrap">
            {defaultUpdates.map((update, index) => (
              <div key={index} className="flex items-center gap-2 text-xs">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    update.type === 'price'
                      ? 'bg-blue-500'
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

export function UMAHero({
  config,
  price,
  historicalData,
  networkStats,
  isLoading: _isLoading,
  isError,
  isRefreshing,
  lastUpdated,
  onRefresh,
  onExport,
}: UMAHeroProps) {
  const t = useTranslations();

  const themeColor = config.themeColor || '#dc2626';

  const realtime = useUMARealtime({
    enablePrices: true,
    enableNetwork: true,
    enableDisputes: false,
    enableValidators: false,
    enableRequests: false,
  });

  const isRealtimeConnected = realtime.isConnected;
  const realtimePrice = realtime.price.priceData;
  const realtimeLastUpdate = realtime.price.lastUpdate;

  const currentPrice = realtimePrice?.price ?? price?.price ?? config.marketData.change24hValue ?? 4.5;
  const priceChange24h = realtimePrice?.change24h ?? config.marketData.change24h ?? 0;
  const isPositive = priceChange24h >= 0;
  const marketCap = config.marketData.marketCap ?? 0;

  const effectiveLastUpdate = realtimeLastUpdate ?? lastUpdated;

  const priceSparkline = useMemo(() => {
    if (historicalData.length > 0) {
      return historicalData.slice(-24).map((d) => d.price);
    }
    return Array.from({ length: 24 }, (_, i) => currentPrice * (1 + ((i % 5) - 2) * 0.02));
  }, [historicalData, currentPrice]);

  const primaryStats: StatItem[] = [
    {
      title: 'UMA 价格',
      value: `$${currentPrice.toFixed(2)}`,
      change: `${isPositive ? '+' : ''}${priceChange24h.toFixed(2)}%`,
      changeType: isPositive ? 'positive' : 'negative',
      icon: <Activity className="w-4 h-4" />,
      subtitle: '24h',
      sparklineData: priceSparkline,
    },
    {
      title: 'TVS',
      value: marketCap > 0 ? `$${(marketCap / 1e6).toFixed(1)}M` : '$250M+',
      change: '+8.5%',
      changeType: 'positive',
      icon: <Wallet className="w-4 h-4" />,
      subtitle: '30天',
    },
    {
      title: '活跃验证者',
      value: `${config.networkData?.activeNodes?.toLocaleString() ?? '120+'}`,
      change: '+12%',
      changeType: 'positive',
      icon: <Shield className="w-4 h-4" />,
      subtitle: '本月',
    },
    {
      title: '数据喂价',
      value: `${networkStats?.dataFeeds ?? config.networkData?.dataFeeds ?? 85}+`,
      change: '+5',
      changeType: 'positive',
      icon: <Database className="w-4 h-4" />,
      subtitle: '本周',
    },
    {
      title: '争议解决率',
      value: '98.5%',
      change: '+0.3%',
      changeType: 'positive',
      icon: <Gavel className="w-4 h-4" />,
      subtitle: '24h',
    },
  ];

  const secondaryStats: StatItem[] = [
    {
      title: '支持链数',
      value: `${config.supportedChains?.length ?? 8}+`,
      change: '0%',
      changeType: 'neutral',
      icon: <Link2 className="w-3.5 h-3.5" />,
    },
    {
      title: '质押量',
      value: `${((config.marketData?.circulatingSupply ?? 6.5e7) / 1e6).toFixed(1)}M`,
      change: '+5.2%',
      changeType: 'positive',
      icon: <Database className="w-3.5 h-3.5" />,
    },
    {
      title: '平均响应',
      value: `${networkStats?.avgResponseTime ?? config.networkData?.avgResponseTime ?? 200}ms`,
      change: '-10%',
      changeType: 'positive',
      icon: <Clock className="w-3.5 h-3.5" />,
    },
    {
      title: '节点在线率',
      value: `${networkStats?.nodeUptime ?? config.networkData?.nodeUptime ?? 99.5}%`,
      change: '+0.1%',
      changeType: 'positive',
      icon: <Server className="w-3.5 h-3.5" />,
    },
  ];

  const healthScore = useMemo(() => {
    const uptime = networkStats?.nodeUptime ?? config.networkData?.nodeUptime ?? 99.5;
    const responseTime =
      networkStats?.avgResponseTime ?? config.networkData?.avgResponseTime ?? 200;
    const feeds = networkStats?.dataFeeds ?? config.networkData?.dataFeeds ?? 85;

    const uptimeScore = uptime * 0.4;
    const responseScore = Math.max(0, 100 - responseTime / 5) * 0.3;
    const feedScore = Math.min(100, feeds / 2) * 0.3;
    return Math.round(uptimeScore + responseScore + feedScore);
  }, [networkStats, config]);

  const connectionStatus = isRealtimeConnected ? 'connected' : realtime.isConnecting ? 'connecting' : realtime.isReconnecting ? 'reconnecting' : 'disconnected';

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-3">
            <LiveStatusBar
              isConnected={!isError}
              latency={networkStats?.avgResponseTime || 245}
              lastUpdate={lastUpdated || undefined}
            />
            <DataFreshnessIndicator
              lastUpdate={effectiveLastUpdate}
              connectionStatus={connectionStatus}
              onRefresh={onRefresh}
              isRefreshing={isRefreshing}
              showConnectionStatus={true}
              showCountdown={true}
              showManualRefresh={true}
              compact={true}
            />
          </div>
          <QuickActions themeColor={themeColor} />
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
                src="/logos/oracles/uma.svg"
                alt="UMA"
                width={28}
                height={28}
                priority
                className="w-7 h-7"
              />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">UMA</h1>
              <p className="text-xs text-gray-500">{t('uma.subtitle')}</p>
            </div>
          </div>

          <div className="hidden lg:block">
            <ActionButtons
              onRefresh={onRefresh}
              onExport={onExport}
              isRefreshing={isRefreshing}
              themeColor={themeColor}
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
              chains={
                config.supportedChains ?? [
                  'Ethereum',
                  'Polygon',
                  'Arbitrum',
                  'Optimism',
                  'Base',
                  'Avalanche',
                ]
              }
              themeColor={themeColor}
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
              />
            </div>

            <OOOverviewCard themeColor={themeColor} />

            <div className="p-3 rounded-xl bg-gray-50/50 border border-gray-100 flex-1">
              <MiniPriceChart
                historicalData={historicalData}
                currentPrice={price}
                themeColor={themeColor}
              />
            </div>

            <div className="p-3 rounded-xl bg-gray-50/50 border border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-500">实时价格</span>
                <DataFreshnessIndicator
                  lastUpdate={realtimeLastUpdate}
                  connectionStatus={connectionStatus}
                  compact={true}
                  showConnectionStatus={false}
                />
              </div>
              <RealtimePriceDisplay
                price={currentPrice}
                change24h={priceChange24h}
                themeColor={themeColor}
                isRealtimeConnected={isRealtimeConnected}
              />
            </div>
          </div>
        </div>
      </div>

      <LatestUpdates />
    </div>
  );
}

export default UMAHero;
