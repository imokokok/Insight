'use client';

import { useState, useEffect } from 'react';

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
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  LineChart,
  Line,
  Tooltip as RechartsTooltip,
} from 'recharts';

import { Icon } from '@/components/ui';
import { useLocale } from '@/i18n';
import { isChineseLocale } from '@/i18n/routing';
import { chartColors, baseColors, semanticColors } from '@/lib/config/colors';
import { type TooltipProps } from '@/types/ui/recharts';

interface ChartDataPoint {
  time: string;
  value: number;
  fullTime?: string;
}

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
  title: {
    en: string;
    zh: string;
  };
  value: string;
  change?: string;
  isPositive?: boolean;
  icon: React.ElementType;
  size: 'large' | 'medium' | 'small';
  chart?: 'area' | 'line';
  chartData?: ChartDataPoint[];
  hasLiveIndicator?: boolean;
  alert?: {
    type: 'info' | 'warning' | 'success';
    message: {
      en: string;
      zh: string;
    };
  };
  description?: {
    en: string;
    zh: string;
  };
}

const metrics: MetricCard[] = [
  {
    id: 'tvs',
    title: { en: 'Total Value Secured', zh: '保障总价值' },
    value: '$42.1B',
    change: '+12.5%',
    isPositive: true,
    icon: Shield,
    size: 'large',
    chart: 'area',
    chartData: tvsData,
    hasLiveIndicator: true,
    description: {
      en: 'Total asset value secured by the platform, including DeFi protocols, stablecoins, and other on-chain assets',
      zh: '平台保障的总资产价值，包括DeFi协议、稳定币和其他链上资产',
    },
  },
  {
    id: 'oracles',
    title: { en: 'Active Oracles', zh: '活跃预言机' },
    value: '5',
    change: '+1',
    isPositive: true,
    icon: Activity,
    size: 'medium',
    hasLiveIndicator: true,
    alert: {
      type: 'success',
      message: { en: 'All oracles operating normally', zh: '所有预言机运行正常' },
    },
    description: {
      en: 'Current active decentralized oracle network nodes',
      zh: '当前活跃的去中心化预言机网络节点数量',
    },
  },
  {
    id: 'sources',
    title: { en: 'Data Sources', zh: '数据源' },
    value: '1200+',
    change: '+8.2%',
    isPositive: true,
    icon: Globe,
    size: 'medium',
    chart: 'line',
    chartData: sourcesData,
    hasLiveIndicator: true,
    description: {
      en: 'Number of aggregated data providers and exchanges',
      zh: '聚合的数据提供商和交易所数量',
    },
  },
  {
    id: 'updates',
    title: { en: 'Daily Updates', zh: '日更新次数' },
    value: '2.4M',
    icon: Zap,
    size: 'small',
    hasLiveIndicator: true,
    alert: {
      type: 'info',
      message: { en: 'Update frequency increased by 15%', zh: '更新频率提升 15%' },
    },
    description: {
      en: 'Daily price updates and data push total count',
      zh: '每日价格更新和数据推送总次数',
    },
  },
  {
    id: 'latency',
    title: { en: 'Avg Latency', zh: '平均延迟' },
    value: '245ms',
    change: '-15ms',
    isPositive: true,
    icon: Clock,
    size: 'small',
    hasLiveIndicator: true,
    description: {
      en: 'Average time from data generation to on-chain confirmation',
      zh: '从数据生成到链上确认的平均时间',
    },
  },
  {
    id: 'accuracy',
    title: { en: 'Accuracy Rate', zh: '准确率' },
    value: '99.97%',
    icon: BarChart3,
    size: 'medium',
    hasLiveIndicator: true,
    alert: {
      type: 'success',
      message: { en: 'Zero failures in the past 30 days', zh: '过去30天零故障' },
    },
    description: {
      en: 'Data accuracy and system availability percentage',
      zh: '数据准确性和系统可用性百分比',
    },
  },
];

function PulseIndicator({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-2 w-2',
    md: 'h-2.5 w-2.5',
    lg: 'h-3 w-3',
  };

  return (
    <span className={`relative flex ${sizeClasses[size]}`}>
      <span
        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
        style={{ backgroundColor: semanticColors.success.main }}
      ></span>
      <span
        className="relative inline-flex rounded-full h-full w-full"
        style={{ backgroundColor: semanticColors.success.main }}
      ></span>
    </span>
  );
}

function LiveIndicator() {
  const locale = useLocale();

  return (
    <div
      className="absolute top-4 right-4 flex items-center gap-1 px-2 py-0.5"
      style={{
        backgroundColor: semanticColors.success.light,
        border: `1px solid ${semanticColors.success.light}`,
      }}
    >
      <PulseIndicator size="sm" />
      <span
        className="text-[10px] font-semibold uppercase tracking-wider"
        style={{ color: semanticColors.success.text }}
      >
        {isChineseLocale(locale) ? '实时' : 'LIVE'}
      </span>
    </div>
  );
}

function AlertBadge({ type, message }: { type: 'info' | 'warning' | 'success'; message: string }) {
  const styles = {
    info: {
      bg: semanticColors.info.light,
      border: semanticColors.info.light,
      text: semanticColors.info.text,
    },
    warning: {
      bg: semanticColors.warning.light,
      border: semanticColors.warning.light,
      text: semanticColors.warning.text,
    },
    success: {
      bg: semanticColors.success.light,
      border: semanticColors.success.light,
      text: semanticColors.success.text,
    },
  };

  return (
    <div
      className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium mt-2"
      style={{
        backgroundColor: styles[type].bg,
        border: `1px solid ${styles[type].border}`,
        color: styles[type].text,
      }}
    >
      <AlertCircle className="w-3 h-3" />
      <span>{message}</span>
    </div>
  );
}

function ChartTooltip({ active, payload, label }: TooltipProps<ChartDataPoint>) {
  if (active && payload && payload.length) {
    return (
      <div
        className="bg-white border px-3 py-2 rounded-lg"
        style={{ borderColor: baseColors.gray[200] }}
      >
        <p className="text-xs mb-1" style={{ color: baseColors.gray[500] }}>
          {payload[0]?.payload?.fullTime || label}
        </p>
        <p className="text-sm font-semibold" style={{ color: baseColors.gray[900] }}>
          {typeof payload[0].value === 'number'
            ? payload[0].value.toLocaleString(undefined, { maximumFractionDigits: 2 })
            : payload[0].value}
        </p>
      </div>
    );
  }
  return null;
}

function MiniLiveTicker() {
  const locale = useLocale();
  const [isPaused, setIsPaused] = useState(false);
  const [hoveredTicker, setHoveredTicker] = useState<string | null>(null);

  return (
    <div
      className="mt-4 overflow-hidden border bg-white rounded-lg"
      style={{ borderColor: baseColors.gray[200] }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div
        className="flex items-center gap-2 px-3 py-2 border-b"
        style={{ backgroundColor: baseColors.gray[50], borderColor: baseColors.gray[200] }}
      >
        <PulseIndicator size="sm" />
        <span className="text-xs font-semibold" style={{ color: baseColors.gray[700] }}>
          {isChineseLocale(locale) ? '实时价格监控' : 'Live Price Monitor'}
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
                flex-shrink-0 flex items-center gap-2 px-3 py-2 border transition-colors duration-200 cursor-pointer rounded-md
              `}
              style={{
                backgroundColor:
                  hoveredTicker === `${item.symbol}-${index}` ? baseColors.gray[50] : 'white',
                borderColor:
                  hoveredTicker === `${item.symbol}-${index}`
                    ? baseColors.gray[300]
                    : baseColors.gray[200],
              }}
              onMouseEnter={() => setHoveredTicker(`${item.symbol}-${index}`)}
              onMouseLeave={() => setHoveredTicker(null)}
            >
              <span className="text-xs font-bold" style={{ color: baseColors.gray[800] }}>
                {item.symbol}
              </span>
              <div className="flex flex-col items-end">
                <span className="text-xs font-semibold" style={{ color: baseColors.gray[900] }}>
                  {item.price}
                </span>
                <span
                  className="text-[10px] font-medium"
                  style={{
                    color: item.isPositive
                      ? semanticColors.success.main
                      : semanticColors.danger.main,
                  }}
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

function InfoTooltip({ content }: { content: string }) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-flex">
      <Info
        className="w-3.5 h-3.5 cursor-help transition-colors"
        style={{ color: baseColors.gray[400] }}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
      />
      {isVisible && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2.5 text-white text-[11px] z-50"
          style={{ backgroundColor: baseColors.gray[900] }}
        >
          {content}
          <div
            className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent"
            style={{ borderTopColor: baseColors.gray[900] }}
          ></div>
        </div>
      )}
    </div>
  );
}

export default function BentoMetricsGrid() {
  const locale = useLocale();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [animatedValues, setAnimatedValues] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

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

  const langCode = isChineseLocale(locale) ? 'zh-CN' : 'en-US';

  const renderChart = (card: MetricCard) => {
    if (!card.chart || !card.chartData) return null;

    if (card.chart === 'area') {
      return (
        <div className="h-20 mt-3 w-full">
          <ResponsiveContainer width="100%" height={80}>
            <AreaChart data={card.chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`gradient-${card.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColors.chart.blue} stopOpacity={0.1} />
                  <stop offset="100%" stopColor={chartColors.chart.blue} stopOpacity={0} />
                </linearGradient>
              </defs>
              <RechartsTooltip
                content={<ChartTooltip />}
                cursor={{ stroke: chartColors.chart.blue, strokeWidth: 1, strokeDasharray: '3 3' }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={chartColors.chart.blue}
                strokeWidth={2}
                fill={`url(#gradient-${card.id})`}
                isAnimationActive={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: baseColors.gray[50] }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      );
    }

    return (
      <div className="h-16 mt-3 w-full">
        <ResponsiveContainer width="100%" height={64}>
          <LineChart data={card.chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <RechartsTooltip
              content={<ChartTooltip />}
              cursor={{ stroke: chartColors.chart.blue, strokeWidth: 1, strokeDasharray: '3 3' }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={chartColors.chart.blue}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 2, stroke: baseColors.gray[50] }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <section className="py-16 bg-slate-50 border-y border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 xl:px-20">
        <div className="text-center mb-12">
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 mb-4"
            style={{
              backgroundColor: baseColors.gray[100],
              border: `1px solid ${baseColors.gray[200]}`,
            }}
          >
            <BarChart3 className="w-4 h-4" style={{ color: baseColors.gray[600] }} />
            <span className="text-sm font-semibold" style={{ color: baseColors.gray[700] }}>
              {isChineseLocale(locale) ? '平台指标' : 'Platform Metrics'}
            </span>
          </div>
          <h2
            className="text-3xl sm:text-4xl font-bold mb-3"
            style={{ color: baseColors.gray[900] }}
          >
            {isChineseLocale(locale) ? '核心数据指标' : 'Key Metrics'}
          </h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: baseColors.gray[600] }}>
            {isChineseLocale(locale)
              ? '实时监控平台核心指标，全面了解预言机生态健康状况'
              : 'Real-time monitoring of core platform metrics for comprehensive oracle ecosystem health'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-fr">
          {metrics.map((card) => {
            const Icon = card.icon;
            const isHovered = hoveredCard === card.id;
            const isAnimating = animatedValues[card.id];

            return (
              <div
                key={card.id}
                className={`
                  relative bg-white border transition-colors duration-200 cursor-pointer
                  ${card.size === 'large' ? 'sm:col-span-2 sm:row-span-2' : ''}
                  ${card.size === 'medium' ? 'sm:col-span-1' : ''}
                  ${card.size === 'small' ? 'sm:col-span-1' : ''}
                `}
                style={{
                  borderColor: isAnimating
                    ? semanticColors.success.main
                    : isHovered
                      ? baseColors.gray[400]
                      : baseColors.gray[200],
                }}
                onMouseEnter={() => setHoveredCard(card.id)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                {card.hasLiveIndicator && <LiveIndicator />}

                <div className="p-5 h-full flex flex-col">
                  <div className="flex items-start justify-between mb-3">
                    <div className="p-2" style={{ backgroundColor: baseColors.gray[100] }}>
                      <Icon
                        className="w-4 h-4 sm:w-5 sm:h-5"
                        style={{ color: baseColors.gray[600] }}
                      />
                    </div>
                    {card.change && (
                      <div
                        className="flex items-center gap-1 px-2 py-0.5 text-[10px] sm:text-xs font-semibold border rounded"
                        style={{
                          backgroundColor: card.isPositive
                            ? semanticColors.success.light
                            : semanticColors.danger.light,
                          color: card.isPositive
                            ? semanticColors.success.text
                            : semanticColors.danger.text,
                          borderColor: card.isPositive
                            ? semanticColors.success.light
                            : semanticColors.danger.light,
                        }}
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

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div
                        className="text-xs sm:text-sm font-medium truncate"
                        style={{ color: baseColors.gray[600] }}
                      >
                        {isChineseLocale(locale) ? card.title.zh : card.title.en}
                      </div>
                      {card.description && (
                        <InfoTooltip
                          content={
                            isChineseLocale(locale) ? card.description.zh : card.description.en
                          }
                        />
                      )}
                    </div>
                    <div
                      className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1"
                      style={{
                        color: isAnimating ? semanticColors.success.main : baseColors.gray[900],
                      }}
                    >
                      {card.value}
                    </div>

                    {card.alert && (
                      <AlertBadge
                        type={card.alert.type}
                        message={
                          isChineseLocale(locale) ? card.alert.message.zh : card.alert.message.en
                        }
                      />
                    )}
                  </div>

                  {card.chart && renderChart(card)}

                  {card.id === 'tvs' && <MiniLiveTicker />}

                  {card.hasLiveIndicator && (
                    <div
                      className="mt-3 flex items-center gap-1.5 text-[10px] sm:text-[11px] font-medium"
                      style={{ color: baseColors.gray[500] }}
                    >
                      <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                      <span>
                        {isChineseLocale(locale) ? '更新于' : 'Updated'}{' '}
                        {currentTime.toLocaleTimeString(langCode, {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}
                      </span>
                    </div>
                  )}

                  <div
                    className="absolute bottom-3 right-3 p-2 opacity-0 transition-opacity duration-200"
                    style={{
                      backgroundColor: baseColors.gray[100],
                      border: `1px solid ${baseColors.gray[200]}`,
                      opacity: isHovered ? 1 : 0,
                    }}
                  >
                    <ArrowUpRight
                      className="w-3.5 h-3.5 sm:w-4 sm:h-4"
                      style={{ color: baseColors.gray[600] }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: isChineseLocale(locale) ? '支持网络' : 'Networks', value: '15+' },
            { label: isChineseLocale(locale) ? '合作伙伴' : 'Partners', value: '200+' },
            { label: isChineseLocale(locale) ? 'API 调用/天' : 'API Calls/Day', value: '50M+' },
            { label: isChineseLocale(locale) ? '正常运行时间' : 'Uptime', value: '99.99%' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="text-center p-4 border bg-white rounded-lg"
              style={{ borderColor: baseColors.gray[200] }}
            >
              <div
                className="text-xl sm:text-2xl font-bold"
                style={{ color: baseColors.gray[900] }}
              >
                {stat.value}
              </div>
              <div className="text-xs mt-0.5" style={{ color: baseColors.gray[500] }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
