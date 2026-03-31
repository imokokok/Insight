'use client';

import { useState, useMemo, useEffect } from 'react';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

import { DashboardCard } from '@/components/oracle/data-display/DashboardCard';
import { chartColors, semanticColors, baseColors } from '@/lib/config/colors';
import { cn } from '@/lib/utils';

interface ConfidenceIntervalChartProps {
  price: number;
  confidenceInterval: {
    bid: number;
    ask: number;
    widthPercentage: number;
  };
  historicalConfidence?: number[];
  showTrend?: boolean;
  height?: number;
  themeColor?: string;
  className?: string;
}

interface HistoricalDataPoint {
  index: number;
  confidence: number;
  timestamp: string;
}

function calculateConfidenceScore(widthPercentage: number): number {
  const score = Math.max(0, Math.min(100, 100 - widthPercentage * 10));
  return Math.round(score);
}

function getConfidenceLevel(score: number): { label: string; color: string; bgColor: string } {
  if (score >= 80) {
    return { label: '高置信度', color: 'text-emerald-600', bgColor: 'bg-emerald-500' };
  }
  if (score >= 60) {
    return { label: '中等置信度', color: 'text-blue-600', bgColor: 'bg-blue-500' };
  }
  if (score >= 40) {
    return { label: '较低置信度', color: 'text-amber-600', bgColor: 'bg-amber-500' };
  }
  return { label: '低置信度', color: 'text-red-600', bgColor: 'bg-red-500' };
}

function ConfidenceBar({
  bid,
  ask,
  price,
  themeColor,
}: {
  bid: number;
  ask: number;
  price: number;
  themeColor: string;
}) {
  const spread = ask - bid;
  const pricePosition = ((price - bid) / spread) * 100;
  const clampedPosition = Math.max(0, Math.min(100, pricePosition));

  const bidWidth = clampedPosition;
  const askWidth = 100 - clampedPosition;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-gray-500 dark:text-gray-400">Bid</span>
          <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
            ${bid.toFixed(4)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-mono font-semibold text-red-600 dark:text-red-400">
            ${ask.toFixed(4)}
          </span>
          <span className="text-gray-500 dark:text-gray-400">Ask</span>
          <div className="w-2 h-2 rounded-full bg-red-500" />
        </div>
      </div>

      <div className="relative h-10 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
        <div className="absolute inset-0 flex">
          <div
            className="relative transition-all duration-500 ease-out"
            style={{ width: `${bidWidth}%` }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(90deg, rgba(16, 185, 129, 0.2) 0%, rgba(16, 185, 129, 0.4) 100%)`,
              }}
            />
            <div className="absolute inset-y-0 right-0 w-px bg-emerald-300 dark:bg-emerald-600" />
          </div>

          <div
            className="relative flex items-center justify-center transition-all duration-500 ease-out"
            style={{ width: `${100 - bidWidth - askWidth > 0 ? 100 - bidWidth - askWidth : 2}%` }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(90deg, rgba(59, 130, 246, 0.1) 0%, ${themeColor}20 50%, rgba(239, 68, 68, 0.1) 100%)`,
              }}
            />
          </div>

          <div
            className="relative transition-all duration-500 ease-out"
            style={{ width: `${askWidth}%` }}
          >
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(90deg, rgba(239, 68, 68, 0.4) 0%, rgba(239, 68, 68, 0.2) 100%)`,
              }}
            />
            <div className="absolute inset-y-0 left-0 w-px bg-red-300 dark:bg-red-600" />
          </div>
        </div>

        <div
          className="absolute top-0 bottom-0 w-0.5 transition-all duration-500 ease-out z-10"
          style={{ left: `${clampedPosition}%`, transform: 'translateX(-50%)' }}
        >
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 shadow-lg"
            style={{ backgroundColor: themeColor }}
          />
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded text-[10px] font-bold text-white shadow-md whitespace-nowrap"
            style={{ backgroundColor: themeColor }}
          >
            ${price.toFixed(2)}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-200 dark:bg-gray-700" />
      </div>

      <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
        <span>Spread: ${spread.toFixed(4)}</span>
        <span>Width: {((spread / price) * 100).toFixed(4)}%</span>
      </div>
    </div>
  );
}

function ConfidenceScoreBar({ score, themeColor }: { score: number; themeColor: string }) {
  const level = getConfidenceLevel(score);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">置信度评分</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${level.color} bg-opacity-10`}>
            {level.label}
          </span>
        </div>
        <span className="text-2xl font-bold" style={{ color: themeColor }}>
          {score}
        </span>
      </div>

      <div className="relative h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${score}%`,
            background: `linear-gradient(90deg, ${themeColor}80 0%, ${themeColor} 100%)`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
        </div>

        <div className="absolute inset-0 flex">
          <div className="w-2/5 border-r border-gray-200 dark:border-gray-700" />
          <div className="w-1/5 border-r border-gray-200 dark:border-gray-700" />
          <div className="flex-1" />
        </div>
      </div>

      <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500">
        <span>0</span>
        <span>25</span>
        <span>50</span>
        <span>75</span>
        <span>100</span>
      </div>
    </div>
  );
}

interface TrendTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: HistoricalDataPoint }>;
  label?: string;
}

function TrendTooltip({ active, payload }: TrendTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;

  return (
    <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">时间点 {data.index}</p>
      <p className="text-sm font-bold text-gray-900 dark:text-white">
        置信度: <span className="text-purple-600 dark:text-purple-400">{data.confidence}</span>
      </p>
    </div>
  );
}

function HistoricalTrendChart({
  data,
  height,
  themeColor,
}: {
  data: HistoricalDataPoint[];
  height: number;
  themeColor: string;
}) {
  const avgConfidence = useMemo(() => {
    if (data.length === 0) return 0;
    return Math.round(data.reduce((sum, d) => sum + d.confidence, 0) / data.length);
  }, [data]);

  const trend = useMemo(() => {
    if (data.length < 2) return 'neutral';
    const recent = data.slice(-5);
    const older = data.slice(-10, -5);
    if (older.length === 0) return 'neutral';
    const recentAvg = recent.reduce((s, d) => s + d.confidence, 0) / recent.length;
    const olderAvg = older.reduce((s, d) => s + d.confidence, 0) / older.length;
    if (recentAvg > olderAvg + 2) return 'up';
    if (recentAvg < olderAvg - 2) return 'down';
    return 'neutral';
  }, [data]);

  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
  const trendColor =
    trend === 'up'
      ? 'text-emerald-600 dark:text-emerald-400'
      : trend === 'down'
        ? 'text-red-600 dark:text-red-400'
        : 'text-gray-500 dark:text-gray-400';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">历史置信度趋势</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">平均: {avgConfidence}</span>
          <span className={`text-sm font-bold ${trendColor}`}>{trendIcon}</span>
        </div>
      </div>

      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={themeColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={themeColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={chartColors.recharts.grid}
              vertical={false}
            />
            <XAxis
              dataKey="index"
              stroke={chartColors.recharts.axis}
              tick={{ fontSize: 10, fill: chartColors.recharts.tick }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[0, 100]}
              stroke={chartColors.recharts.axis}
              tick={{ fontSize: 10, fill: chartColors.recharts.tick }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}`}
            />
            <RechartsTooltip content={<TrendTooltip />} />
            <Area
              type="monotone"
              dataKey="confidence"
              stroke={themeColor}
              strokeWidth={2}
              fill="url(#confidenceGradient)"
              animationDuration={800}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ConfidenceIntervalChart({
  price,
  confidenceInterval,
  historicalConfidence = [],
  showTrend = true,
  height = 120,
  themeColor = chartColors.oracle.pyth,
  className,
}: ConfidenceIntervalChartProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const confidenceScore = useMemo(
    () => calculateConfidenceScore(confidenceInterval.widthPercentage),
    [confidenceInterval.widthPercentage]
  );

  useEffect(() => {
    const duration = 1000;
    const startTime = Date.now();
    const startValue = animatedScore;
    const endValue = confidenceScore;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(startValue + (endValue - startValue) * easeOut));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [confidenceScore]);

  const historicalData = useMemo((): HistoricalDataPoint[] => {
    if (historicalConfidence.length === 0) {
      return Array.from({ length: 20 }, (_, i) => ({
        index: i + 1,
        confidence: Math.round(confidenceScore + (Math.random() - 0.5) * 20),
        timestamp: `T-${20 - i}`,
      }));
    }
    return historicalConfidence.map((conf, i) => ({
      index: i + 1,
      confidence: conf,
      timestamp: `T-${historicalConfidence.length - i}`,
    }));
  }, [historicalConfidence, confidenceScore]);

  return (
    <DashboardCard
      title="置信区间可视化"
      className={cn('overflow-hidden', className)}
      headerAction={
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: themeColor }}
          />
          <span className="text-xs text-gray-500 dark:text-gray-400">Pyth Oracle</span>
        </div>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">当前价格</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white font-mono">
              ${price.toFixed(2)}
            </p>
          </div>
          <div className="text-center border-x border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">区间宽度</p>
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400 font-mono">
              {confidenceInterval.widthPercentage.toFixed(2)}%
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Spread</p>
            <p className="text-lg font-bold text-purple-600 dark:text-purple-400 font-mono">
              ${(confidenceInterval.ask - confidenceInterval.bid).toFixed(4)}
            </p>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            价格区间分布
          </h4>
          <ConfidenceBar
            bid={confidenceInterval.bid}
            ask={confidenceInterval.ask}
            price={price}
            themeColor={themeColor}
          />
        </div>

        <div>
          <ConfidenceScoreBar score={animatedScore} themeColor={themeColor} />
        </div>

        {showTrend && (
          <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
            <HistoricalTrendChart data={historicalData} height={height} themeColor={themeColor} />
          </div>
        )}

        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-100 dark:border-purple-800">
          <div className="flex items-start gap-2">
            <svg
              className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h5 className="text-sm font-medium text-purple-900 dark:text-purple-200 mb-1">
                关于 Pyth 置信区间
              </h5>
              <p className="text-xs text-purple-700 dark:text-purple-300">
                Pyth
                预言机提供置信区间来表示价格的不确定性。区间越窄表示价格越确定，越宽表示波动性越大或数据源分歧越大。
                置信度评分基于区间宽度计算，分数越高表示价格数据越可靠。
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}

export default ConfidenceIntervalChart;
