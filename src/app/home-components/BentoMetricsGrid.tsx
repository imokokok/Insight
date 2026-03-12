'use client';

import { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { 
  TrendingUp, 
  Activity, 
  Shield, 
  Globe, 
  Zap,
  ArrowUpRight,
  BarChart3,
  Clock
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';

const trendData = [
  { value: 4000 },
  { value: 3000 },
  { value: 5000 },
  { value: 4500 },
  { value: 6000 },
  { value: 5500 },
  { value: 7000 },
];

const tvsData = [
  { value: 35 },
  { value: 36 },
  { value: 38 },
  { value: 39 },
  { value: 40 },
  { value: 41 },
  { value: 42.1 },
];

const liveTickerData = [
  { symbol: 'BTC/USD', price: '$67,245.32', change: '+2.34%', isPositive: true },
  { symbol: 'ETH/USD', price: '$3,456.78', change: '+1.56%', isPositive: true },
  { symbol: 'LINK/USD', price: '$14.23', change: '-0.45%', isPositive: false },
  { symbol: 'SOL/USD', price: '$145.67', change: '+3.21%', isPositive: true },
  { symbol: 'AVAX/USD', price: '$28.45', change: '+0.89%', isPositive: true },
  { symbol: 'MATIC/USD', price: '$0.56', change: '-1.23%', isPositive: false },
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
  chartData?: any[];
  color: string;
  hasLiveIndicator?: boolean;
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
    chartData: trendData,
    color: 'violet',
    hasLiveIndicator: true,
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
  },
];

const colorMap: Record<string, { bg: string; border: string; text: string; gradient: string }> = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', gradient: 'from-blue-500 to-blue-600' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-600', gradient: 'from-indigo-500 to-indigo-600' },
  violet: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-600', gradient: 'from-violet-500 to-violet-600' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-600', gradient: 'from-amber-500 to-amber-600' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600', gradient: 'from-emerald-500 to-emerald-600' },
  cyan: { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-600', gradient: 'from-cyan-500 to-cyan-600' },
};

// Mini Live Ticker Component
function MiniLiveTicker() {
  const { language } = useI18n();
  const [isPaused, setIsPaused] = useState(false);

  return (
    <div 
      className="mt-4 overflow-hidden rounded-xl bg-white/60 backdrop-blur-sm border border-gray-200/50"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
        <div className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
        </div>
        <span className="text-xs font-medium text-gray-600">
          {language === 'zh' ? '实时价格' : 'Live Prices'}
        </span>
      </div>
      <div className="relative py-2">
        <div 
          className="flex gap-3 px-3"
          style={{
            animation: isPaused ? 'none' : 'miniTickerScroll 20s linear infinite',
          }}
        >
          {[...liveTickerData, ...liveTickerData].map((item, index) => (
            <div
              key={`${item.symbol}-${index}`}
              className="flex-shrink-0 flex items-center gap-2 px-2 py-1.5 bg-white/80 rounded-lg border border-gray-100"
            >
              <span className="text-xs font-semibold text-gray-700">{item.symbol}</span>
              <span className={`text-xs font-medium ${item.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {item.change}
              </span>
            </div>
          ))}
        </div>
      </div>
      <style jsx>{`
        @keyframes miniTickerScroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

// Live Indicator Badge
function LiveIndicator() {
  const { language } = useI18n();
  
  return (
    <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 bg-green-50 border border-green-200 rounded-full">
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
      </span>
      <span className="text-[10px] font-medium text-green-700 uppercase tracking-wide">
        {language === 'zh' ? '实时' : 'Live'}
      </span>
    </div>
  );
}

export default function BentoMetricsGrid() {
  const { t, language } = useI18n();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const renderChart = (card: MetricCard) => {
    if (!card.chart || !card.chartData) return null;

    if (card.chart === 'area') {
      return (
        <div className="h-24 mt-4 w-full min-h-[96px]">
          <ResponsiveContainer width="100%" height={96}>
            <AreaChart data={card.chartData}>
              <defs>
                <linearGradient id={`gradient-${card.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#3b82f6" 
                strokeWidth={2}
                fill={`url(#gradient-${card.id})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      );
    }

    return (
      <div className="h-16 mt-4 w-full min-h-[64px]">
        <ResponsiveContainer width="100%" height={64}>
          <LineChart data={card.chartData}>
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#8b5cf6" 
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 xl:px-20">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-100 rounded-full mb-4">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-600">
              {language === 'zh' ? '平台指标' : 'Platform Metrics'}
            </span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {language === 'zh' ? '核心数据指标' : 'Key Metrics'}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {language === 'zh' 
              ? '实时监控平台核心指标，全面了解预言机生态健康状况' 
              : 'Real-time monitoring of core platform metrics'}
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 auto-rows-fr">
          {metrics.map((card) => {
            const Icon = card.icon;
            const colors = colorMap[card.color];
            const isHovered = hoveredCard === card.id;

            return (
              <div
                key={card.id}
                className={`
                  relative group rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden
                  ${card.size === 'large' ? 'md:col-span-2 md:row-span-2' : ''}
                  ${card.size === 'medium' ? 'md:col-span-1' : ''}
                  ${colors.bg} ${colors.border}
                  ${isHovered ? 'shadow-xl scale-[1.02]' : 'shadow-sm'}
                `}
                onMouseEnter={() => setHoveredCard(card.id)}
                onMouseLeave={() => setHoveredCard(null)}
              >
                {/* Live Indicator */}
                {card.hasLiveIndicator && <LiveIndicator />}

                {/* Background gradient on hover */}
                <div className={`
                  absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300
                `} />

                <div className="relative p-6 h-full flex flex-col">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className={`
                      p-3 rounded-xl bg-white/80 backdrop-blur-sm shadow-sm
                      group-hover:shadow-md transition-shadow
                    `}>
                      <Icon className={`w-5 h-5 ${colors.text}`} />
                    </div>
                    {card.change && (
                      <div className={`
                        flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                        ${card.isPositive 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-red-100 text-red-700'
                        }
                      `}>
                        {card.isPositive ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingUp className="w-3 h-3 rotate-180" />
                        )}
                        {card.change}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="text-sm text-gray-500 mb-1">{card.title}</div>
                    <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-1">
                      {card.value}
                    </div>
                    <div className="text-xs text-gray-400">{card.subtitle}</div>
                  </div>

                  {/* Chart */}
                  {card.chart && renderChart(card)}

                  {/* Mini Live Ticker for TVS card */}
                  {card.id === 'tvs' && <MiniLiveTicker />}

                  {/* Last updated time for live cards */}
                  {card.hasLiveIndicator && (
                    <div className="mt-3 flex items-center gap-1.5 text-[10px] text-gray-400">
                      <Clock className="w-3 h-3" />
                      <span>
                        {language === 'zh' ? '更新于' : 'Updated'} {currentTime.toLocaleTimeString(language === 'zh' ? 'zh-CN' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                  )}

                  {/* Arrow indicator */}
                  <div className={`
                    absolute bottom-4 right-4 p-2 rounded-full bg-white/50
                    opacity-0 group-hover:opacity-100 transition-all duration-300
                    transform translate-x-2 group-hover:translate-x-0
                  `}>
                    <ArrowUpRight className={`w-4 h-4 ${colors.text}`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
