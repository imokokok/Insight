'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Shield,
  Globe,
  Zap,
  ArrowUpRight,
  BarChart3,
  Clock,
  AlertCircle,
  Info,
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, LineChart, Line, Tooltip } from 'recharts';
import { TooltipProps } from '@/types/ui/recharts';
import { chartColors, semanticColors } from '@/lib/config/colors';

interface ChartDataPoint {
  time: string;
  value: number;
  fullTime?: string;
}

// Enhanced trend data with timestamps for better tooltips
const generateTrendData = (baseValue: number, points: number, variance: number) => {
  return Array.from({ length: points }, (_, i) => ({
    time: new Date(Date.now() - (points - i) * 60000).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }),
    value: baseValue + Math.random() * variance - variance / 2 + i * baseValue * 0.01,
    fullTime: new Date(Date.now() - (points - i) * 60000).toLocaleString(),
  }));
};

const tvsData = generateTrendData(42.1, 12, 2);
const sourcesData = generateTrendData(1200, 12, 100);

const liveTickerData = [
  { symbol: 'BTC/USD', price: '$67,245.32', change: '+2.34%', isPositive: true, volume: '24.5B' },
  { symbol: 'ETH/USD', price: '$3,456.78', change: '+1.56%', isPositive: true, volume: '12.3B' },
  { symbol: 'LINK/USD', price: '$14.23', change: '-0.45%', isPositive: false, volume: '456M' },
  { symbol: 'SOL/USD', price: '$145.67', change: '+3.21%', isPositive: true, volume: '2.1B' },
  { symbol: 'AVAX/USD', price: '$28.45', change: '+0.89%', isPositive: true, volume: '678M' },
  { symbol: 'MATIC/USD', price: '$0.56', change: '-1.23%', isPositive: false, volume: '234M' },
];

interface MetricCard {
  id: string;
  title: string;
  value: string;
  subtitle: string;
  change?: string;
  isPositive?: boolean;
  icon: React.ElementType;
  size: 'large' | 'medium' | 'small';
  chart?: 'area' | 'line';
  chartData?: ChartDataPoint[];
  color: string;
  hasLiveIndicator?: boolean;
  alert?: {
    type: 'info' | 'warning' | 'success';
    message: string;
  };
  description?: string;
}

const metrics: MetricCard[] = [
  {
    id: 'tvs',
    title: 'Total Value Secured',
    value: '$42.1B',
    subtitle: '保障总价值',
    change: '+12.5%',
    isPositive: true,
    icon: Shield,
    size: 'large',
    chart: 'area',
    chartData: tvsData,
    color: 'blue',
    hasLiveIndicator: true,
    description: '平台保障的总资产价值，包括DeFi协议、稳定币和其他链上资产',
  },
  {
    id: 'oracles',
    title: 'Active Oracles',
    value: '5',
    subtitle: '活跃预言机',
    change: '+1',
    isPositive: true,
    icon: Activity,
    size: 'medium',
    color: 'indigo',
    hasLiveIndicator: true,
    alert: { type: 'success', message: '所有预言机运行正常' },
    description: '当前活跃的去中心化预言机网络节点数量',
  },
  {
    id: 'sources',
    title: 'Data Sources',
    value: '1200+',
    subtitle: '数据源',
    change: '+8.2%',
    isPositive: true,
    icon: Globe,
    size: 'medium',
    chart: 'line',
    chartData: sourcesData,
    color: 'violet',
    hasLiveIndicator: true,
    description: '聚合的数据提供商和交易所数量',
  },
  {
    id: 'updates',
    title: 'Daily Updates',
    value: '2.4M',
    subtitle: '日更新次数',
    icon: Zap,
    size: 'small',
    color: 'amber',
    hasLiveIndicator: true,
    alert: { type: 'info', message: '更新频率提升 15%' },
    description: '每日价格更新和数据推送总次数',
  },
  {
    id: 'latency',
    title: 'Avg Latency',
    value: '245ms',
    subtitle: '平均延迟',
    change: '-15ms',
    isPositive: true,
    icon: Clock,
    size: 'small',
    color: 'emerald',
    hasLiveIndicator: true,
    description: '从数据生成到链上确认的平均时间',
  },
  {
    id: 'accuracy',
    title: 'Accuracy Rate',
    value: '99.97%',
    subtitle: '准确率',
    icon: BarChart3,
    size: 'small',
    color: 'cyan',
    hasLiveIndicator: true,
    alert: { type: 'success', message: '过去30天零故障' },
    description: '数据准确性和系统可用性百分比',
  },
];

// Professional color scheme with better contrast
const colorMap: Record<
  string,
  {
    bg: string;
    border: string;
    text: string;
    gradient: string;
    chart: string;
    chartFill: string;
    lightBg: string;
  }
> = {
  blue: {
    bg: 'bg-blue-50/80',
    border: 'border-blue-200/60',
    text: 'text-blue-700',
    gradient: 'from-blue-500/10 to-blue-600/5',
    chart: chartColors.chart.blue,
    chartFill: chartColors.chart.blueLight,
    lightBg: 'bg-blue-500/5',
  },
  indigo: {
    bg: 'bg-indigo-50/80',
    border: 'border-indigo-200/60',
    text: 'text-indigo-700',
    gradient: 'from-indigo-500/10 to-indigo-600/5',
    chart: chartColors.chart.indigo,
    chartFill: chartColors.chart.indigoLight,
    lightBg: 'bg-indigo-500/5',
  },
  violet: {
    bg: 'bg-violet-50/80',
    border: 'border-violet-200/60',
    text: 'text-violet-700',
    gradient: 'from-violet-500/10 to-violet-600/5',
    chart: chartColors.chart.violet,
    chartFill: chartColors.chart.violetLight,
    lightBg: 'bg-violet-500/5',
  },
  amber: {
    bg: 'bg-amber-50/80',
    border: 'border-amber-200/60',
    text: 'text-amber-700',
    gradient: 'from-amber-500/10 to-amber-600/5',
    chart: chartColors.chart.amber,
    chartFill: chartColors.chart.amberLight,
    lightBg: 'bg-amber-500/5',
  },
  emerald: {
    bg: 'bg-emerald-50/80',
    border: 'border-emerald-200/60',
    text: 'text-emerald-700',
    gradient: 'from-emerald-500/10 to-emerald-600/5',
    chart: chartColors.chart.emerald,
    chartFill: chartColors.chart.emeraldLight,
    lightBg: 'bg-emerald-500/5',
  },
  cyan: {
    bg: 'bg-cyan-50/80',
    border: 'border-cyan-200/60',
    text: 'text-cyan-700',
    gradient: 'from-cyan-500/10 to-cyan-600/5',
    chart: chartColors.chart.cyan,
    chartFill: chartColors.chart.cyanLight,
    lightBg: 'bg-cyan-500/5',
  },
};

// Enhanced pulse animation component
function PulseIndicator({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3 w-3',
  };

  return (
    <span className={`relative flex ${sizeClasses[size]}`}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
      <span className="relative inline-flex rounded-full h-full w-full bg-emerald-500"></span>
    </span>
  );
}

// Enhanced Live Indicator Badge
function LiveIndicator() {
  const { locale } = useI18n();

  return (
    <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50/90 backdrop-blur-sm border border-emerald-200/60 rounded-full shadow-sm">
      <PulseIndicator size="sm" />
      <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider">
        {locale === 'zh-CN' ? '实时' : 'LIVE'}
      </span>
    </div>
  );
}

// Alert Badge Component
function AlertBadge({ type, message }: { type: 'info' | 'warning' | 'success'; message: string }) {
  const styles = {
    info: 'bg-blue-50/80 border-blue-200/60 text-blue-700',
    warning: 'bg-amber-50/80 border-amber-200/60 text-amber-700',
    success: 'bg-emerald-50/80 border-emerald-200/60 text-emerald-700',
  };

  return (
    <div
      className={`flex items-center gap-1.5 px-2 py-1 rounded-md border ${styles[type]} text-[10px] font-medium mt-2`}
    >
      <AlertCircle className="w-3 h-3" />
      <span>{message}</span>
    </div>
  );
}

// Custom Tooltip for Charts
function ChartTooltip({ active, payload, label }: TooltipProps<ChartDataPoint>) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-sm border border-gray-200/60 rounded-lg shadow-lg px-3 py-2">
        <p className="text-xs text-gray-500 mb-1">{payload[0]?.payload?.fullTime || label}</p>
        <p className="text-sm font-semibold text-gray-900">
          {typeof payload[0].value === 'number'
            ? payload[0].value.toLocaleString(undefined, { maximumFractionDigits: 2 })
            : payload[0].value}
        </p>
      </div>
    );
  }
  return null;
}

// Enhanced Mini Live Ticker Component
function MiniLiveTicker() {
  const { locale } = useI18n();
  const [isPaused, setIsPaused] = useState(false);
  const [hoveredTicker, setHoveredTicker] = useState<string | null>(null);

  return (
    <div
      className="mt-5 overflow-hidden rounded-xl bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-sm"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100/80 bg-gray-50/50">
        <PulseIndicator size="sm" />
        <span className="text-xs font-semibold text-gray-700">
          {locale === 'zh-CN' ? '实时价格监控' : 'Live Price Monitor'}
        </span>
      </div>
      <div className="relative py-2">
        <div
          className="flex gap-2 px-3"
          style={{
            animation: isPaused ? 'none' : 'miniTickerScroll 25s linear infinite',
          }}
        >
          {[...liveTickerData, ...liveTickerData, ...liveTickerData].map((item, index) => (
            <div
              key={`${item.symbol}-${index}`}
              className={`
                flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 cursor-pointer
                ${
                  hoveredTicker === `${item.symbol}-${index}`
                    ? 'bg-white shadow-md border-gray-200 scale-105'
                    : 'bg-white/60 border-gray-100/80'
                }
              `}
              onMouseEnter={() => setHoveredTicker(`${item.symbol}-${index}`)}
              onMouseLeave={() => setHoveredTicker(null)}
            >
              <span className="text-xs font-bold text-gray-800">{item.symbol}</span>
              <div className="flex flex-col items-end">
                <span className="text-xs font-semibold text-gray-900">{item.price}</span>
                <span
                  className={`text-[10px] font-medium ${item.isPositive ? 'text-emerald-600' : 'text-rose-600'}`}
                >
                  {item.isPositive ? '+' : ''}
                  {item.change}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <style jsx>{`
        @keyframes miniTickerScroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-33.33%);
          }
        }
      `}</style>
    </div>
  );
}

// Info Tooltip Component
function InfoTooltip({ content }: { content: string }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-flex">
      <Info
        className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 cursor-help transition-colors"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      />
      {isVisible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2.5 bg-gray-900 text-white text-[11px] rounded-lg shadow-xl z-50">
          {content}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
        </div>
      )}
    </div>
  );
}

export default function BentoMetricsGrid() {
  const { t, locale } = useI18n();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [animatedValues, setAnimatedValues] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Simulate value updates for visual feedback
  useEffect(() => {
    const interval = setInterval(() => {
      const randomCard = metrics[Math.floor(Math.random() * metrics.length)];
      setAnimatedValues((prev) => ({ ...prev, [randomCard.id]: true }));
      setTimeout(() => {
        setAnimatedValues((prev) => ({ ...prev, [randomCard.id]: false }));
      }, 1000);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const langCode = locale === 'zh-CN' ? 'zh-CN' : 'en-US';

  const renderChart = (card: MetricCard) => {
    if (!card.chart || !card.chartData) return null;
    const colors = colorMap[card.color];

    if (card.chart === 'area') {
      return (
        <div className="h-24 mt-4 w-full">
          <ResponsiveContainer width="100%" height={96}>
            <AreaChart data={card.chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`gradient-${card.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors.chartFill} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={colors.chartFill} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ stroke: colors.chart, strokeWidth: 1, strokeDasharray: '3 3' }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={colors.chart}
                strokeWidth={2}
                fill={`url(#gradient-${card.id})`}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      );
    }

    return (
      <div className="h-16 mt-4 w-full">
        <ResponsiveContainer width="100%" height={64}>
          <LineChart data={card.chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: colors.chart, strokeWidth: 1, strokeDasharray: '3 3' }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={colors.chart}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: '#fff' }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <section className="py-20 bg-gradient-to-b from-white to-gray-50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 xl:px-20">
        {/* Section Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50/80 border border-blue-100 rounded-full mb-5 shadow-sm">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-semibold text-blue-700">
              {locale === 'zh-CN' ? '平台指标' : 'Platform Metrics'}
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 tracking-tight">
            {locale === 'zh-CN' ? '核心数据指标' : 'Key Metrics'}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            {locale === 'zh-CN'
              ? '实时监控平台核心指标，全面了解预言机生态健康状况'
              : 'Real-time monitoring of core platform metrics for comprehensive oracle ecosystem health'}
          </p>
        </div>

        {/* Bento Grid - Improved responsive layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5 auto-rows-fr">
          {metrics.map((card, index) => {
            const Icon = card.icon;
            const colors = colorMap[card.color];
            const isHovered = hoveredCard === card.id;
            const isAnimating = animatedValues[card.id];

            return (
              <div
                key={card.id}
                className={`
                  relative group rounded-xl sm:rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden
                  ${card.size === 'large' ? 'sm:col-span-2 sm:row-span-2' : ''}
                  ${card.size === 'medium' ? 'sm:col-span-1' : ''}
                  ${colors.bg} ${colors.border}
                  ${isHovered ? 'shadow-xl shadow-gray-200/50 scale-[1.02] border-opacity-80' : 'shadow-sm shadow-gray-100/50'}
                  ${isAnimating ? 'ring-2 ring-emerald-400/30' : ''}
                `}
                style={{ animationDelay: `${index * 50}ms` }}
                onMouseEnter={() => setHoveredCard(card.id)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                {/* Live Indicator */}
                {card.hasLiveIndicator && <LiveIndicator />}

                {/* Background gradient on hover */}
                <div
                  className={`
                  absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500
                `}
                />

                {/* Subtle pattern overlay */}
                <div className="absolute inset-0 opacity-[0.02] bg-[radial-gradient(circle_at_1px_1px,gray_1px,transparent_0)] bg-[length:20px_20px]" />

                <div className="relative p-4 sm:p-5 lg:p-6 h-full flex flex-col">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div
                      className={`
                      p-2 sm:p-3 rounded-lg sm:rounded-xl bg-white/90 backdrop-blur-sm shadow-sm border border-gray-100/50
                      group-hover:shadow-md group-hover:scale-105 transition-all duration-300
                    `}
                    >
                      <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${colors.text}`} />
                    </div>
                    {card.change && (
                      <div
                        className={`
                        flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-semibold shadow-sm
                        ${
                          card.isPositive
                            ? 'bg-emerald-100/80 text-emerald-700 border border-emerald-200/50'
                            : 'bg-rose-100/80 text-rose-700 border border-rose-200/50'
                        }
                        transition-transform duration-300 ${isHovered ? 'scale-105' : ''}
                      `}
                      >
                        {card.isPositive ? (
                          <TrendingUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        ) : (
                          <TrendingDown className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        )}
                        {card.change}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="text-xs sm:text-sm font-medium text-gray-600 truncate">{card.title}</div>
                      {card.description && <InfoTooltip content={card.description} />}
                    </div>
                    <div
                      className={`
                      text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-gray-900 mb-1 tracking-tight
                      transition-all duration-300 ${isAnimating ? 'text-emerald-600 scale-105' : ''}
                    `}
                    >
                      {card.value}
                    </div>
                    <div className="text-[10px] sm:text-xs text-gray-500 font-medium">{card.subtitle}</div>

                    {/* Alert Badge */}
                    {card.alert && (
                      <AlertBadge type={card.alert.type} message={card.alert.message} />
                    )}
                  </div>

                  {/* Chart */}
                  {card.chart && renderChart(card)}

                  {/* Mini Live Ticker for TVS card */}
                  {card.id === 'tvs' && <MiniLiveTicker />}

                  {/* Last updated time for live cards */}
                  {card.hasLiveIndicator && (
                    <div className="mt-3 sm:mt-4 flex items-center gap-1.5 text-[10px] sm:text-[11px] text-gray-500 font-medium">
                      <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      <span>
                        {locale === 'zh-CN' ? '更新于' : 'Updated'}{' '}
                        {currentTime.toLocaleTimeString(langCode, {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>
                  )}

                  {/* Arrow indicator */}
                  <div
                    className={`
                    absolute bottom-4 right-4 sm:bottom-5 sm:right-5 p-2 sm:p-2.5 rounded-full bg-white/80 backdrop-blur-sm border border-gray-100/50 shadow-sm
                    opacity-0 group-hover:opacity-100 transition-all duration-300
                    transform translate-x-3 group-hover:translate-x-0 group-hover:scale-110
                  `}
                  >
                    <ArrowUpRight className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${colors.text}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Stats Row */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: locale === 'zh-CN' ? '支持网络' : 'Networks', value: '15+' },
            { label: locale === 'zh-CN' ? '合作伙伴' : 'Partners', value: '200+' },
            { label: locale === 'zh-CN' ? 'API 调用/天' : 'API Calls/Day', value: '50M+' },
            { label: locale === 'zh-CN' ? '正常运行时间' : 'Uptime', value: '99.99%' },
          ].map((stat, index) => (
            <div
              key={stat.label}
              className="text-center p-4 rounded-xl bg-white/60 border border-gray-200/50 backdrop-blur-sm"
            >
              <div className="text-xl sm:text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
