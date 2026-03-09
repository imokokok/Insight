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
  LineChart,
  Line,
} from 'recharts';

// ==================== 类型定义 ====================

/** 核心特性数据类型 */
interface CoreFeature {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  stats: {
    label: string;
    value: string;
    subValue?: string;
  };
  color: string;
  bgGradient: string;
}

/** 延迟数据点类型 */
interface LatencyDataPoint {
  time: string;
  pyth: number;
  chainlink: number;
  other: number;
}

/** 更新频率数据点类型 */
interface UpdateFrequencyDataPoint {
  category: string;
  pyth: number;
  industry: number;
}

// ==================== 模拟数据 ====================

const mockFeaturesData = {
  // 延迟对比数据（毫秒）
  latencyHistory: [
    { time: '00:00', pyth: 320, chainlink: 850, other: 1200 },
    { time: '04:00', pyth: 280, chainlink: 820, other: 1150 },
    { time: '08:00', pyth: 350, chainlink: 900, other: 1300 },
    { time: '12:00', pyth: 310, chainlink: 880, other: 1250 },
    { time: '16:00', pyth: 290, chainlink: 840, other: 1180 },
    { time: '20:00', pyth: 330, chainlink: 860, other: 1220 },
    { time: '24:00', pyth: 300, chainlink: 830, other: 1190 },
  ] as LatencyDataPoint[],

  // 更新频率对比数据
  updateFrequency: [
    { category: 'Crypto', pyth: 400, industry: 60000 },
    { category: 'FX', pyth: 300, industry: 300000 },
    { category: 'Equities', pyth: 350, industry: 60000 },
    { category: 'Commodities', pyth: 450, industry: 300000 },
  ] as UpdateFrequencyDataPoint[],

  // 数据新鲜度分布
  freshnessDistribution: [
    { range: '<100ms', count: 45, percentage: 45 },
    { range: '100-200ms', count: 35, percentage: 35 },
    { range: '200-300ms', count: 15, percentage: 15 },
    { range: '300-400ms', count: 4, percentage: 4 },
    { range: '>400ms', count: 1, percentage: 1 },
  ],

  // 第一方数据源统计
  firstPartyStats: {
    totalPublishers: 95,
    institutionalPublishers: 42,
    tradingFirms: 31,
    exchanges: 22,
    avgConfidence: 99.7,
    dataIntegrity: 99.99,
  },
};

// ==================== 工具函数 ====================

/**
 * 格式化毫秒为可读格式
 */
function formatLatency(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * 格式化更新频率
 */
function formatFrequency(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(0)}s`;
  return `${(ms / 60000).toFixed(0)}min`;
}

// ==================== 子组件 ====================

/**
 * 特性卡片组件
 */
function FeatureCard({ feature }: { feature: CoreFeature }) {
  return (
    <div
      className={`relative overflow-hidden rounded-xl p-5 ${feature.bgGradient} border border-opacity-20`}
      style={{ borderColor: feature.color }}
    >
      {/* 背景装饰 */}
      <div
        className="absolute top-0 right-0 w-32 h-32 opacity-10 rounded-full -translate-y-1/2 translate-x-1/2"
        style={{ backgroundColor: feature.color }}
      />

      <div className="relative z-10">
        {/* 图标和标题 */}
        <div className="flex items-start gap-4 mb-4">
          <div
            className="p-3 rounded-xl"
            style={{ backgroundColor: `${feature.color}20`, color: feature.color }}
          >
            {feature.icon}
          </div>
          <div className="flex-1">
            <h3 className="text-gray-900 font-semibold text-lg">{feature.title}</h3>
            <p className="text-gray-600 text-sm mt-1">{feature.description}</p>
          </div>
        </div>

        {/* 统计数据 */}
        <div className="bg-white/60 backdrop-blur-sm rounded-lg p-3">
          <p className="text-gray-500 text-xs">{feature.stats.label}</p>
          <p className="text-gray-900 font-bold text-xl">{feature.stats.value}</p>
          {feature.stats.subValue && (
            <p className="text-gray-500 text-xs mt-0.5">{feature.stats.subValue}</p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * 延迟对比图表组件
 */
function LatencyComparisonChart({ data }: { data: LatencyDataPoint[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-gray-900 text-sm font-semibold">Latency Comparison</h3>
          <p className="text-gray-500 text-xs mt-0.5">Data update latency over time</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-purple-500" />
            <span className="text-gray-600">Pyth</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-gray-600">Chainlink</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-gray-400" />
            <span className="text-gray-600">Others</span>
          </div>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="time"
              stroke="#9ca3af"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              stroke="#9ca3af"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              tickFormatter={(value) => `${value}ms`}
              width={50}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '12px',
              }}
              formatter={(value) => [`${value}ms`, '']}
            />
            <Line
              type="monotone"
              dataKey="pyth"
              stroke="#8b5cf6"
              strokeWidth={3}
              dot={{ r: 4, fill: '#8b5cf6' }}
              activeDot={{ r: 6 }}
              name="Pyth"
            />
            <Line
              type="monotone"
              dataKey="chainlink"
              stroke="#3b82f6"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ r: 3, fill: '#3b82f6' }}
              name="Chainlink"
            />
            <Line
              type="monotone"
              dataKey="other"
              stroke="#9ca3af"
              strokeWidth={2}
              strokeDasharray="3 3"
              dot={{ r: 3, fill: '#9ca3af' }}
              name="Others"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 关键指标 */}
      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
        <div className="text-center">
          <p className="text-xs text-gray-500">Pyth Avg</p>
          <p className="text-lg font-bold text-purple-600">
            {formatLatency(Math.round(data.reduce((sum, d) => sum + d.pyth, 0) / data.length))}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">Chainlink Avg</p>
          <p className="text-lg font-bold text-blue-600">
            {formatLatency(Math.round(data.reduce((sum, d) => sum + d.chainlink, 0) / data.length))}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">Speed Advantage</p>
          <p className="text-lg font-bold text-green-600">
            {(
              ((data.reduce((sum, d) => sum + d.chainlink, 0) / data.length -
                data.reduce((sum, d) => sum + d.pyth, 0) / data.length) /
                (data.reduce((sum, d) => sum + d.chainlink, 0) / data.length)) *
              100
            ).toFixed(0)}
            %
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * 更新频率对比图表组件
 */
function UpdateFrequencyChart({ data }: { data: UpdateFrequencyDataPoint[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-gray-900 text-sm font-semibold">Update Frequency</h3>
          <p className="text-gray-500 text-xs mt-0.5">Milliseconds per update by asset class</p>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
            <XAxis
              dataKey="category"
              stroke="#9ca3af"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              stroke="#9ca3af"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              tickFormatter={(value) => formatFrequency(value)}
              width={60}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '12px',
              }}
              formatter={(value) => [formatFrequency(Number(value)), '']}
            />
            <Bar dataKey="pyth" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Pyth" />
            <Bar dataKey="industry" fill="#e5e7eb" radius={[4, 4, 0, 0]} name="Industry Avg" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* 性能倍数 */}
      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-gray-100">
        {data.map((item) => {
          const multiplier = item.industry / item.pyth;
          return (
            <div key={item.category} className="text-center">
              <p className="text-xs text-gray-500">{item.category}</p>
              <p className="text-lg font-bold text-purple-600">{multiplier.toFixed(0)}x faster</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 数据新鲜度分布组件
 */
function FreshnessDistribution({
  data,
}: {
  data: { range: string; count: number; percentage: number }[];
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-gray-900 text-sm font-semibold">Data Freshness Distribution</h3>
          <p className="text-gray-500 text-xs mt-0.5">Update latency distribution</p>
        </div>
      </div>

      <div className="space-y-3">
        {data.map((item) => (
          <div key={item.range}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600">{item.range}</span>
              <span className="text-gray-900 font-medium">{item.percentage}%</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                style={{ width: `${item.percentage}%` }}
              />
            </div>
            <p className="text-gray-400 text-xs mt-0.5">{item.count} price feeds</p>
          </div>
        ))}
      </div>

      {/* 统计摘要 */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">80% of updates within</span>
          <span className="text-lg font-bold text-purple-600">200ms</span>
        </div>
      </div>
    </div>
  );
}

/**
 * 第一方数据源统计组件
 */
function FirstPartyStats({ stats }: { stats: typeof mockFeaturesData.firstPartyStats }) {
  return (
    <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl p-5 text-white">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-white/20 rounded-lg">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-lg">First-Party Data</h3>
          <p className="text-purple-200 text-xs">Direct from institutional sources</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/10 rounded-lg p-3">
          <p className="text-purple-200 text-xs">Total Publishers</p>
          <p className="text-2xl font-bold">{stats.totalPublishers}</p>
        </div>
        <div className="bg-white/10 rounded-lg p-3">
          <p className="text-purple-200 text-xs">Institutional</p>
          <p className="text-2xl font-bold">{stats.institutionalPublishers}</p>
        </div>
        <div className="bg-white/10 rounded-lg p-3">
          <p className="text-purple-200 text-xs">Trading Firms</p>
          <p className="text-2xl font-bold">{stats.tradingFirms}</p>
        </div>
        <div className="bg-white/10 rounded-lg p-3">
          <p className="text-purple-200 text-xs">Exchanges</p>
          <p className="text-2xl font-bold">{stats.exchanges}</p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-white/20">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-purple-200 text-xs">Avg Confidence Score</p>
            <p className="text-xl font-bold">{stats.avgConfidence}%</p>
          </div>
          <div className="text-right">
            <p className="text-purple-200 text-xs">Data Integrity</p>
            <p className="text-xl font-bold">{stats.dataIntegrity}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== 主组件 ====================

/**
 * Pyth Network 核心特性展示面板组件
 *
 * 功能特性：
 * - 第一方数据优势展示
 * - 低延迟性能对比（300-400ms）
 * - 高频率更新展示
 * - 实时数据可视化
 * - 与行业标准的对比
 */
export function CoreFeaturesPanel() {
  const [featuresData, setFeaturesData] = useState(mockFeaturesData);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 模拟数据更新
   */
  const simulateDataUpdate = useCallback(() => {
    setFeaturesData((prev) => {
      // 轻微波动延迟数据
      const fluctuation = () => (Math.random() - 0.5) * 0.1; // ±5% 波动

      const newLatencyHistory = prev.latencyHistory.map((item) => ({
        ...item,
        pyth: Math.max(200, Math.min(400, Math.round(item.pyth * (1 + fluctuation())))),
        chainlink: Math.max(700, Math.min(1000, Math.round(item.chainlink * (1 + fluctuation())))),
        other: Math.max(1000, Math.min(1500, Math.round(item.other * (1 + fluctuation())))),
      }));

      return {
        ...prev,
        latencyHistory: newLatencyHistory,
      };
    });
    setLastUpdated(new Date());
  }, []);

  // 定时更新数据（每30秒）
  useEffect(() => {
    intervalRef.current = setInterval(simulateDataUpdate, 30000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [simulateDataUpdate]);

  // 核心特性配置
  const coreFeatures: CoreFeature[] = [
    {
      id: 'first-party',
      title: 'First-Party Data',
      description:
        'Direct data from 95+ institutional publishers including trading firms and exchanges',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      ),
      stats: {
        label: 'Institutional Publishers',
        value: '95+',
        subValue: 'Including 42 institutional firms',
      },
      color: '#8b5cf6',
      bgGradient: 'bg-gradient-to-br from-purple-50 to-purple-100',
    },
    {
      id: 'low-latency',
      title: 'Low Latency',
      description: 'Industry-leading 300-400ms update latency, 2-3x faster than competitors',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
      stats: {
        label: 'Average Latency',
        value: '300-400ms',
        subValue: '65% faster than industry avg',
      },
      color: '#10b981',
      bgGradient: 'bg-gradient-to-br from-emerald-50 to-emerald-100',
    },
    {
      id: 'high-frequency',
      title: 'High Frequency',
      description: 'Sub-second updates for all asset classes, 150x more frequent than alternatives',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      stats: {
        label: 'Update Frequency',
        value: '<400ms',
        subValue: '150x faster than Chainlink',
      },
      color: '#f59e0b',
      bgGradient: 'bg-gradient-to-br from-amber-50 to-amber-100',
    },
    {
      id: 'multi-chain',
      title: 'Multi-Chain',
      description: 'Native support for 50+ blockchains including Solana, Ethereum, and L2s',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
          />
        </svg>
      ),
      stats: {
        label: 'Supported Chains',
        value: '50+',
        subValue: 'Including all major L1s and L2s',
      },
      color: '#3b82f6',
      bgGradient: 'bg-gradient-to-br from-blue-50 to-blue-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* 核心特性卡片网格 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {coreFeatures.map((feature) => (
          <FeatureCard key={feature.id} feature={feature} />
        ))}
      </div>

      {/* 性能对比图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LatencyComparisonChart data={featuresData.latencyHistory} />
        <UpdateFrequencyChart data={featuresData.updateFrequency} />
      </div>

      {/* 数据新鲜度和第一方数据源 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <FreshnessDistribution data={featuresData.freshnessDistribution} />
        </div>
        <FirstPartyStats stats={featuresData.firstPartyStats} />
      </div>

      {/* 最后更新时间 */}
      <div className="text-right">
        <p className="text-xs text-gray-500">Last updated: {lastUpdated.toLocaleTimeString()}</p>
      </div>
    </div>
  );
}

export default CoreFeaturesPanel;
