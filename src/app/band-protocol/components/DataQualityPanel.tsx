'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

// ==================== 类型定义 ====================

type ExchangeName = 'Binance' | 'Coinbase' | 'Osmosis' | 'Kraken';

type DeviationStatus = 'normal' | 'warning' | 'critical';

interface ExchangePriceData {
  name: ExchangeName;
  price: number;
  deviationPercent: number;
  deviationAmount: number;
  status: DeviationStatus;
}

interface LatencyDistribution {
  range: string;
  count: number;
  color: string;
}

interface AnomalyType {
  type: string;
  count: number;
  percentage: number;
  color: string;
}

interface AnomalyData {
  totalAnomalies: number;
  anomalyRate: number;
  types: AnomalyType[];
}

interface ConsistencyScore {
  score: number;
  rating: string;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
}

interface QualityData {
  bandPrice: number;
  exchangePrices: ExchangePriceData[];
  latencyDistribution: LatencyDistribution[];
  anomalyData: AnomalyData;
  consistencyScore: ConsistencyScore;
  lastUpdated: Date;
}

// ==================== 模拟数据 ====================

const mockQualityData: QualityData = {
  bandPrice: 1.245,
  exchangePrices: [
    {
      name: 'Binance',
      price: 1.248,
      deviationPercent: 0.24,
      deviationAmount: 0.003,
      status: 'normal',
    },
    {
      name: 'Coinbase',
      price: 1.242,
      deviationPercent: 0.24,
      deviationAmount: 0.003,
      status: 'normal',
    },
    {
      name: 'Osmosis',
      price: 1.256,
      deviationPercent: 0.88,
      deviationAmount: 0.011,
      status: 'warning',
    },
    {
      name: 'Kraken',
      price: 1.238,
      deviationPercent: 0.56,
      deviationAmount: 0.007,
      status: 'warning',
    },
  ],
  latencyDistribution: [
    { range: '<100ms', count: 2156, color: '#8b5cf6' },
    { range: '100-300ms', count: 1623, color: '#a78bfa' },
    { range: '300-500ms', count: 487, color: '#c4b5fd' },
    { range: '500-1000ms', count: 198, color: '#f59e0b' },
    { range: '>1000ms', count: 67, color: '#ef4444' },
  ],
  anomalyData: {
    totalAnomalies: 18,
    anomalyRate: 0.35,
    types: [
      { type: '价格跳跃', count: 9, percentage: 50.0, color: '#ef4444' },
      { type: '延迟过高', count: 6, percentage: 33.3, color: '#f59e0b' },
      { type: '数据缺失', count: 3, percentage: 16.7, color: '#8b5cf6' },
    ],
  },
  consistencyScore: {
    score: 89,
    rating: '优秀',
    trend: 'up',
    trendValue: 1.8,
  },
  lastUpdated: new Date(),
};

// ==================== 工具函数 ====================

const getStatusConfig = (status: DeviationStatus) => {
  switch (status) {
    case 'normal':
      return {
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-500',
        barColor: 'bg-emerald-500',
        label: '正常',
        progressColor: '#10b981',
      };
    case 'warning':
      return {
        color: 'text-amber-600',
        bgColor: 'bg-amber-500',
        barColor: 'bg-amber-500',
        label: '警告',
        progressColor: '#f59e0b',
      };
    case 'critical':
      return {
        color: 'text-red-600',
        bgColor: 'bg-red-500',
        barColor: 'bg-red-500',
        label: '异常',
        progressColor: '#ef4444',
      };
  }
};

const getRatingConfig = (score: number) => {
  if (score >= 90) {
    return {
      rating: '优秀',
      color: 'text-emerald-600',
      bgColor: 'from-emerald-500 to-emerald-600',
      strokeColor: '#10b981',
    };
  } else if (score >= 75) {
    return {
      rating: '良好',
      color: 'text-violet-600',
      bgColor: 'from-violet-500 to-violet-600',
      strokeColor: '#8b5cf6',
    };
  } else if (score >= 60) {
    return {
      rating: '一般',
      color: 'text-amber-600',
      bgColor: 'from-amber-500 to-amber-600',
      strokeColor: '#f59e0b',
    };
  } else {
    return {
      rating: '较差',
      color: 'text-red-600',
      bgColor: 'from-red-500 to-red-600',
      strokeColor: '#ef4444',
    };
  }
};

// ==================== 子组件 ====================

// 1. 价格偏差监控表格
function PriceDeviationTable({ data }: { data: ExchangePriceData[] }) {
  return (
    <div className="bg-white border border-purple-200 rounded-xl overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-purple-100 bg-gradient-to-r from-purple-50 to-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-purple-900">价格偏差监控</h3>
            <p className="text-xs text-purple-600 mt-0.5">与 Band Protocol 预言机价格对比</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-xs text-gray-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              正常
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-600">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              警告
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-600">
              <span className="w-2 h-2 rounded-full bg-red-500"></span>
              异常
            </span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-purple-50/50">
              <th className="px-5 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">
                交易所
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium text-purple-700 uppercase tracking-wider">
                价格 (USD)
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium text-purple-700 uppercase tracking-wider">
                偏差百分比
              </th>
              <th className="px-5 py-3 text-right text-xs font-medium text-purple-700 uppercase tracking-wider">
                偏差金额
              </th>
              <th className="px-5 py-3 text-center text-xs font-medium text-purple-700 uppercase tracking-wider">
                状态
              </th>
              <th className="px-5 py-3 text-left text-xs font-medium text-purple-700 uppercase tracking-wider">
                可视化
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-purple-100">
            {data.map((exchange) => {
              const statusConfig = getStatusConfig(exchange.status);
              const progressWidth = Math.min((exchange.deviationPercent / 1) * 100, 100);

              return (
                <tr
                  key={exchange.name}
                  className="hover:bg-purple-50/30 transition-colors duration-200"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-100 to-purple-200 flex items-center justify-center">
                        <span className="text-sm font-bold text-purple-700">
                          {exchange.name.charAt(0)}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{exchange.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="text-sm font-mono text-gray-900">
                      ${exchange.price.toFixed(3)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className={`text-sm font-mono ${statusConfig.color}`}>
                      {exchange.deviationPercent > 0 ? '+' : ''}
                      {exchange.deviationPercent.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <span className="text-sm font-mono text-gray-700">
                      ${exchange.deviationAmount.toFixed(3)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.color} bg-purple-50`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${statusConfig.bgColor} mr-1.5`}
                      ></span>
                      {statusConfig.label}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-purple-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${statusConfig.barColor}`}
                          style={{ width: `${progressWidth}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500 w-8">{progressWidth.toFixed(0)}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 2. 数据一致性评分组件（仪表盘）
function ConsistencyScoreGauge({ scoreData }: { scoreData: ConsistencyScore }) {
  const ratingConfig = getRatingConfig(scoreData.score);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (scoreData.score / 100) * circumference;

  return (
    <div className="bg-white border border-purple-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-purple-900">数据一致性评分</h3>
          <p className="text-xs text-purple-600 mt-0.5">基于多维度质量指标</p>
        </div>
        <div className="p-2 bg-purple-100 rounded-lg">
          <svg
            className="w-5 h-5 text-purple-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      </div>

      <div className="flex flex-col items-center">
        {/* 仪表盘 */}
        <div className="relative w-40 h-40">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* 背景圆环 */}
            <circle cx="50" cy="50" r="45" fill="none" stroke="#f3e8ff" strokeWidth="8" />
            {/* 进度圆环 */}
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={ratingConfig.strokeColor}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          {/* 中心内容 */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-purple-900">{scoreData.score}</span>
            <span className="text-xs text-purple-600">/ 100</span>
          </div>
        </div>

        {/* 评级标签 */}
        <div className="mt-4 flex items-center gap-3">
          <span
            className={`px-4 py-1.5 rounded-full text-sm font-semibold text-white bg-gradient-to-r ${ratingConfig.bgColor}`}
          >
            {scoreData.rating}
          </span>
          <div
            className={`flex items-center gap-1 text-sm ${
              scoreData.trend === 'up'
                ? 'text-emerald-600'
                : scoreData.trend === 'down'
                  ? 'text-red-600'
                  : 'text-purple-600'
            }`}
          >
            {scoreData.trend === 'up' && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 10l7-7m0 0l7 7m-7-7v18"
                />
              </svg>
            )}
            {scoreData.trend === 'down' && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            )}
            {scoreData.trend === 'stable' && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
              </svg>
            )}
            <span>
              {scoreData.trend === 'up' ? '+' : ''}
              {scoreData.trendValue}%
            </span>
          </div>
        </div>

        {/* 评分维度 */}
        <div className="mt-5 w-full space-y-2">
          {[
            { label: '价格准确性', value: 94 },
            { label: '数据及时性', value: 88 },
            { label: '来源多样性', value: 86 },
            { label: '异常检测', value: 90 },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <span className="text-xs text-purple-700 w-20">{item.label}</span>
              <div className="flex-1 h-1.5 bg-purple-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-violet-500 rounded-full"
                  style={{ width: `${item.value}%` }}
                ></div>
              </div>
              <span className="text-xs text-purple-700 w-8 text-right">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// 延迟分布 Tooltip 组件
interface LatencyTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: LatencyDistribution }>;
  data: LatencyDistribution[];
}

function LatencyTooltip({ active, payload, data }: LatencyTooltipProps) {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    const total = data.reduce((sum, d) => sum + d.count, 0);
    const percentage = ((item.count / total) * 100).toFixed(1);
    return (
      <div className="bg-white border border-purple-200 rounded-lg p-3 shadow-xl">
        <p className="text-sm font-medium text-purple-900">{item.range}</p>
        <p className="text-xs text-purple-600 mt-1">
          数量: <span className="text-purple-900">{item.count.toLocaleString()}</span>
        </p>
        <p className="text-xs text-purple-600">
          占比: <span className="text-purple-900">{percentage}%</span>
        </p>
      </div>
    );
  }
  return null;
}

// 3. 更新延迟分布图表
function LatencyDistributionChart({ data }: { data: LatencyDistribution[] }) {
  return (
    <div className="bg-white border border-purple-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-purple-900">更新延迟分布</h3>
          <p className="text-xs text-purple-600 mt-0.5">数据更新响应时间统计</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-purple-600">
          <span>样本总数:</span>
          <span className="text-purple-900 font-mono">
            {data.reduce((sum, d) => sum + d.count, 0).toLocaleString()}
          </span>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f3e8ff" vertical={false} />
            <XAxis
              dataKey="range"
              tick={{ fill: '#7c3aed', fontSize: 11 }}
              axisLine={{ stroke: '#ddd6fe' }}
              tickLine={{ stroke: '#ddd6fe' }}
            />
            <YAxis
              tick={{ fill: '#7c3aed', fontSize: 11 }}
              axisLine={{ stroke: '#ddd6fe' }}
              tickLine={{ stroke: '#ddd6fe' }}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <Tooltip content={<LatencyTooltip data={data} />} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 图例 */}
      <div className="flex flex-wrap items-center justify-center gap-4 mt-4 pt-4 border-t border-purple-100">
        {data.map((item) => (
          <div key={item.range} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: item.color }}></span>
            <span className="text-xs text-purple-700">{item.range}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// 4. 异常值检测指示器
function AnomalyDetectionIndicator({ data }: { data: AnomalyData }) {
  return (
    <div className="bg-white border border-purple-200 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-purple-900">异常值检测</h3>
          <p className="text-xs text-purple-600 mt-0.5">最近24小时异常统计</p>
        </div>
        <div className="p-2 bg-purple-100 rounded-lg">
          <svg
            className="w-5 h-5 text-purple-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
      </div>

      {/* 异常统计概览 */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 text-center">
          <p className="text-xs text-purple-600 mb-1">异常值总数</p>
          <p className="text-2xl font-bold text-purple-900">{data.totalAnomalies}</p>
          <p className="text-xs text-purple-500 mt-1">最近24小时</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 text-center">
          <p className="text-xs text-purple-600 mb-1">异常率</p>
          <p className="text-2xl font-bold text-purple-900">{data.anomalyRate}%</p>
          <p className="text-xs text-purple-500 mt-1">占总数据量</p>
        </div>
      </div>

      {/* 异常类型分布 */}
      <div className="space-y-3">
        <p className="text-xs font-medium text-purple-700 uppercase tracking-wider">异常类型分布</p>
        {data.types.map((type) => (
          <div key={type.type} className="flex items-center gap-3">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-purple-800">{type.type}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-purple-900">{type.count}</span>
                  <span className="text-xs text-purple-500">({type.percentage}%)</span>
                </div>
              </div>
              <div className="h-2 bg-purple-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${type.percentage}%`,
                    backgroundColor: type.color,
                  }}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 底部提示 */}
      <div className="mt-5 pt-4 border-t border-purple-100">
        <div className="flex items-center gap-2 text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              data.anomalyRate < 1
                ? 'bg-emerald-500'
                : data.anomalyRate < 5
                  ? 'bg-amber-500'
                  : 'bg-red-500'
            }`}
          ></span>
          <span className="text-purple-700">
            系统状态:
            <span
              className={`ml-1 font-medium ${
                data.anomalyRate < 1
                  ? 'text-emerald-600'
                  : data.anomalyRate < 5
                    ? 'text-amber-600'
                    : 'text-red-600'
              }`}
            >
              {data.anomalyRate < 1 ? '正常' : data.anomalyRate < 5 ? '需关注' : '警告'}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

// ==================== 主组件 ====================

export function DataQualityPanel() {
  const [qualityData, setQualityData] = useState<QualityData>(mockQualityData);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 模拟数据更新
  const simulateDataUpdate = useCallback(() => {
    setQualityData((prev) => {
      const fluctuation = () => (Math.random() - 0.5) * 0.02;

      // 更新交易所价格
      const updatedExchanges = prev.exchangePrices.map((exchange) => {
        const priceChange = exchange.price * fluctuation();
        const newPrice = Math.max(0, exchange.price + priceChange);
        const deviationPercent = ((newPrice - prev.bandPrice) / prev.bandPrice) * 100;
        const deviationAmount = newPrice - prev.bandPrice;

        let status: DeviationStatus = 'normal';
        if (Math.abs(deviationPercent) > 0.5) status = 'critical';
        else if (Math.abs(deviationPercent) > 0.1) status = 'warning';

        return {
          ...exchange,
          price: newPrice,
          deviationPercent: Math.abs(deviationPercent),
          deviationAmount: Math.abs(deviationAmount),
          status,
        };
      });

      // 更新评分
      const scoreChange = (Math.random() - 0.5) * 2;
      const newScore = Math.min(100, Math.max(0, prev.consistencyScore.score + scoreChange));

      return {
        ...prev,
        exchangePrices: updatedExchanges,
        consistencyScore: {
          ...prev.consistencyScore,
          score: Math.round(newScore),
          trend: scoreChange > 0 ? 'up' : scoreChange < 0 ? 'down' : 'stable',
          trendValue: Math.abs(scoreChange),
        },
        lastUpdated: new Date(),
      };
    });
    setLastUpdated(new Date());
  }, []);

  // 定时更新数据
  useEffect(() => {
    intervalRef.current = setInterval(simulateDataUpdate, 30000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [simulateDataUpdate]);

  return (
    <div className="space-y-6">
      {/* 顶部：Band Protocol 参考价格 */}
      <div className="bg-white border border-purple-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
              <svg className="w-6 h-6 text-white" viewBox="0 0 32 32" fill="currentColor">
                <path d="M16 0L2.5 8v16L16 32l13.5-8V8L16 0zM16 4l10 5.5v11L16 26l-10-5.5v-11L16 4z" />
                <path d="M16 8l-6 3.5v7L16 22l6-3.5v-7L16 8z" />
              </svg>
            </div>
            <div>
              <p className="text-purple-600 text-xs uppercase tracking-wider">
                Band Protocol 参考价格
              </p>
              <p className="text-2xl font-bold text-purple-900">
                ${qualityData.bandPrice.toFixed(3)}
              </p>
              <p className="text-xs text-purple-500">
                最后更新: {lastUpdated.toLocaleTimeString('zh-CN')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-purple-600">数据点总数</p>
              <p className="text-lg font-semibold text-purple-900">4,531</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-purple-600">监控交易所</p>
              <p className="text-lg font-semibold text-purple-900">4</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-purple-600">平均偏差</p>
              <p className="text-lg font-semibold text-emerald-600">0.48%</p>
            </div>
          </div>
        </div>
      </div>

      {/* 价格偏差监控表格 */}
      <PriceDeviationTable data={qualityData.exchangePrices} />

      {/* 中间区域：评分、延迟分布、异常检测 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 数据一致性评分 */}
        <ConsistencyScoreGauge scoreData={qualityData.consistencyScore} />

        {/* 更新延迟分布 */}
        <LatencyDistributionChart data={qualityData.latencyDistribution} />

        {/* 异常值检测 */}
        <AnomalyDetectionIndicator data={qualityData.anomalyData} />
      </div>
    </div>
  );
}
