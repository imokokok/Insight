'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';

// ==================== 类型定义 ====================

/** 发布者类型数据类型 */
type PublisherType = {
  type: string;
  count: number;
  percentage: number;
  color: string;
  description: string;
};

/** 地理分布数据类型 */
type GeoDistribution = {
  region: string;
  count: number;
  percentage: number;
  color: string;
  flag: string;
};

/** 发布者性能数据类型 */
type PublisherPerformance = {
  rank: number;
  name: string;
  type: string;
  region: string;
  uptime: number;
  avgLatency: number;
  updateCount: number;
  reputation: number;
};

/** 历史趋势数据点类型 */
type TrendDataPoint = {
  date: string;
  publishers: number;
  avgLatency: number;
  totalUpdates: number;
};

// ==================== 模拟数据 ====================

const mockPublisherData = {
  // 发布者类型分布
  publisherTypes: [
    {
      type: 'Market Makers',
      count: 32,
      percentage: 33.7,
      color: '#8b5cf6',
      description: 'Leading trading firms providing liquidity',
    },
    {
      type: 'Exchanges',
      count: 22,
      percentage: 23.2,
      color: '#3b82f6',
      description: 'Centralized and decentralized exchanges',
    },
    {
      type: 'Trading Firms',
      count: 28,
      percentage: 29.5,
      color: '#10b981',
      description: 'Proprietary trading companies',
    },
    {
      type: 'Institutional',
      count: 13,
      percentage: 13.7,
      color: '#f59e0b',
      description: 'Banks and financial institutions',
    },
  ] as PublisherType[],

  // 地理分布数据
  geoDistribution: [
    { region: 'North America', count: 38, percentage: 40.0, color: '#8b5cf6', flag: '🇺🇸' },
    { region: 'Europe', count: 26, percentage: 27.4, color: '#3b82f6', flag: '🇪🇺' },
    { region: 'Asia Pacific', count: 22, percentage: 23.2, color: '#10b981', flag: '🇯🇵' },
    { region: 'Others', count: 9, percentage: 9.5, color: '#f59e0b', flag: '🌍' },
  ] as GeoDistribution[],

  // Top 10 发布者性能排行榜
  topPublishers: [
    {
      rank: 1,
      name: 'Jane Street',
      type: 'Market Maker',
      region: 'North America',
      uptime: 99.99,
      avgLatency: 245,
      updateCount: 12500000,
      reputation: 99.8,
    },
    {
      rank: 2,
      name: 'Jump Crypto',
      type: 'Trading Firm',
      region: 'North America',
      uptime: 99.98,
      avgLatency: 267,
      updateCount: 11800000,
      reputation: 99.7,
    },
    {
      rank: 3,
      name: 'Wintermute',
      type: 'Market Maker',
      region: 'Europe',
      uptime: 99.97,
      avgLatency: 289,
      updateCount: 11200000,
      reputation: 99.5,
    },
    {
      rank: 4,
      name: 'DRW',
      type: 'Trading Firm',
      region: 'North America',
      uptime: 99.96,
      avgLatency: 312,
      updateCount: 10800000,
      reputation: 99.4,
    },
    {
      rank: 5,
      name: 'Binance',
      type: 'Exchange',
      region: 'Asia Pacific',
      uptime: 99.95,
      avgLatency: 334,
      updateCount: 10500000,
      reputation: 99.3,
    },
    {
      rank: 6,
      name: 'Coinbase',
      type: 'Exchange',
      region: 'North America',
      uptime: 99.94,
      avgLatency: 356,
      updateCount: 10200000,
      reputation: 99.2,
    },
    {
      rank: 7,
      name: 'Cumberland',
      type: 'Market Maker',
      region: 'North America',
      uptime: 99.93,
      avgLatency: 378,
      updateCount: 9800000,
      reputation: 99.1,
    },
    {
      rank: 8,
      name: 'Alameda Research',
      type: 'Trading Firm',
      region: 'Asia Pacific',
      uptime: 99.92,
      avgLatency: 401,
      updateCount: 9500000,
      reputation: 99.0,
    },
    {
      rank: 9,
      name: 'Galaxy Digital',
      type: 'Institutional',
      region: 'North America',
      uptime: 99.91,
      avgLatency: 423,
      updateCount: 9200000,
      reputation: 98.9,
    },
    {
      rank: 10,
      name: 'FTX (Historical)',
      type: 'Exchange',
      region: 'Asia Pacific',
      uptime: 99.90,
      avgLatency: 445,
      updateCount: 8900000,
      reputation: 98.8,
    },
  ] as PublisherPerformance[],

  // 30天趋势数据
  trendHistory: [
    { date: 'Day 1', publishers: 89, avgLatency: 320, totalUpdates: 8500000 },
    { date: 'Day 2', publishers: 89, avgLatency: 318, totalUpdates: 8650000 },
    { date: 'Day 3', publishers: 90, avgLatency: 315, totalUpdates: 8720000 },
    { date: 'Day 4', publishers: 90, avgLatency: 319, totalUpdates: 8680000 },
    { date: 'Day 5', publishers: 91, avgLatency: 312, totalUpdates: 8800000 },
    { date: 'Day 6', publishers: 91, avgLatency: 310, totalUpdates: 8950000 },
    { date: 'Day 7', publishers: 92, avgLatency: 308, totalUpdates: 9100000 },
    { date: 'Day 8', publishers: 92, avgLatency: 305, totalUpdates: 9250000 },
    { date: 'Day 9', publishers: 93, avgLatency: 303, totalUpdates: 9400000 },
    { date: 'Day 10', publishers: 93, avgLatency: 301, totalUpdates: 9550000 },
    { date: 'Day 11', publishers: 94, avgLatency: 299, totalUpdates: 9700000 },
    { date: 'Day 12', publishers: 94, avgLatency: 297, totalUpdates: 9850000 },
    { date: 'Day 13', publishers: 95, avgLatency: 295, totalUpdates: 10000000 },
    { date: 'Day 14', publishers: 95, avgLatency: 293, totalUpdates: 10150000 },
    { date: 'Day 15', publishers: 95, avgLatency: 291, totalUpdates: 10300000 },
    { date: 'Day 16', publishers: 95, avgLatency: 289, totalUpdates: 10450000 },
    { date: 'Day 17', publishers: 95, avgLatency: 287, totalUpdates: 10600000 },
    { date: 'Day 18', publishers: 95, avgLatency: 285, totalUpdates: 10750000 },
    { date: 'Day 19', publishers: 95, avgLatency: 283, totalUpdates: 10900000 },
    { date: 'Day 20', publishers: 95, avgLatency: 281, totalUpdates: 11050000 },
    { date: 'Day 21', publishers: 95, avgLatency: 279, totalUpdates: 11200000 },
    { date: 'Day 22', publishers: 95, avgLatency: 277, totalUpdates: 11350000 },
    { date: 'Day 23', publishers: 95, avgLatency: 275, totalUpdates: 11500000 },
    { date: 'Day 24', publishers: 95, avgLatency: 273, totalUpdates: 11650000 },
    { date: 'Day 25', publishers: 95, avgLatency: 271, totalUpdates: 11800000 },
    { date: 'Day 26', publishers: 95, avgLatency: 269, totalUpdates: 11950000 },
    { date: 'Day 27', publishers: 95, avgLatency: 267, totalUpdates: 12100000 },
    { date: 'Day 28', publishers: 95, avgLatency: 265, totalUpdates: 12250000 },
    { date: 'Day 29', publishers: 95, avgLatency: 263, totalUpdates: 12400000 },
    { date: 'Day 30', publishers: 95, avgLatency: 261, totalUpdates: 12550000 },
  ] as TrendDataPoint[],
};

// ==================== 工具函数 ====================

/**
 * 获取延迟颜色
 */
function getLatencyColor(ms: number): string {
  if (ms < 300) return 'text-emerald-600';
  if (ms < 400) return 'text-amber-600';
  return 'text-rose-600';
}

/**
 * 获取延迟背景色
 */
function getLatencyBgColor(ms: number): string {
  if (ms < 300) return 'bg-emerald-500';
  if (ms < 400) return 'bg-amber-500';
  return 'bg-rose-500';
}

/**
 * 格式化数字
 */
function formatNumber(num: number): string {
  return num.toLocaleString('en-US', { maximumFractionDigits: 1 });
}

/**
 * 格式化大数字
 */
function formatLargeNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

// ==================== 子组件 ====================

/**
 * 发布者类型 Tooltip 组件
 */
function PublisherTypeTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: PublisherType }>;
}) {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-xl">
        <p className="text-gray-900 font-semibold">{item.type}</p>
        <p className="text-gray-700 text-sm">{item.count} publishers</p>
        <p className="text-gray-600 text-sm">{item.percentage}%</p>
        <p className="text-gray-500 text-xs mt-1">{item.description}</p>
      </div>
    );
  }
  return null;
}

/**
 * 发布者类型饼图组件
 */
function PublisherTypeChart({ data }: { data: PublisherType[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const onPieEnter = (_: unknown, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(null);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-gray-900 text-sm font-semibold">Publisher Types</h3>
          <p className="text-gray-500 text-xs mt-0.5">Distribution by organization type</p>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="count"
              onMouseEnter={onPieEnter}
              onMouseLeave={onPieLeave}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  stroke={activeIndex === index ? '#fff' : 'transparent'}
                  strokeWidth={activeIndex === index ? 2 : 0}
                />
              ))}
            </Pie>
            <Tooltip content={<PublisherTypeTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* 图例 */}
      <div className="space-y-2 mt-4">
        {data.map((item) => (
          <div key={item.type} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <div>
                <span className="text-gray-700 text-xs font-medium">{item.type}</span>
                <p className="text-gray-400 text-xs">{item.description}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-gray-900 text-xs font-medium">{item.count}</span>
              <span className="text-gray-500 text-xs ml-1">({item.percentage}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 地理分布 Tooltip 组件
 */
function GeoTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: GeoDistribution }>;
}) {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-xl">
        <p className="text-gray-900 font-semibold">
          {item.flag} {item.region}
        </p>
        <p className="text-gray-700 text-sm">{item.count} publishers</p>
        <p className="text-gray-600 text-sm">{item.percentage}%</p>
      </div>
    );
  }
  return null;
}

/**
 * 地理分布饼图组件
 */
function GeoDistributionChart({ data }: { data: GeoDistribution[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const onPieEnter = (_: unknown, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(null);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-gray-900 text-sm font-semibold">Geographic Distribution</h3>
          <p className="text-gray-500 text-xs mt-0.5">Publisher distribution by region</p>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={90}
              paddingAngle={2}
              dataKey="count"
              onMouseEnter={onPieEnter}
              onMouseLeave={onPieLeave}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  stroke={activeIndex === index ? '#fff' : 'transparent'}
                  strokeWidth={activeIndex === index ? 2 : 0}
                />
              ))}
            </Pie>
            <Tooltip content={<GeoTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* 图例 */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        {data.map((item) => (
          <div key={item.region} className="flex items-center gap-2">
            <span className="text-lg">{item.flag}</span>
            <div className="flex-1 min-w-0">
              <p className="text-gray-700 text-xs truncate">{item.region}</p>
              <p className="text-gray-500 text-xs">
                {item.count} ({item.percentage}%)
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 发布者性能排行榜组件
 */
function PublisherPerformanceTable({ data }: { data: PublisherPerformance[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-gray-900 text-sm font-semibold">Top 10 Publishers</h3>
          <p className="text-gray-500 text-xs mt-0.5">Performance ranking by reputation</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-2 text-xs font-medium text-gray-600 uppercase tracking-wider">
                Rank
              </th>
              <th className="text-left py-3 px-2 text-xs font-medium text-gray-600 uppercase tracking-wider">
                Publisher
              </th>
              <th className="text-left py-3 px-2 text-xs font-medium text-gray-600 uppercase tracking-wider">
                Type
              </th>
              <th className="text-left py-3 px-2 text-xs font-medium text-gray-600 uppercase tracking-wider">
                Latency
              </th>
              <th className="text-left py-3 px-2 text-xs font-medium text-gray-600 uppercase tracking-wider">
                Uptime
              </th>
              <th className="text-left py-3 px-2 text-xs font-medium text-gray-600 uppercase tracking-wider">
                Reputation
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((publisher) => (
              <tr
                key={publisher.rank}
                className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-200"
              >
                <td className="py-3 px-2">
                  <span
                    className={`text-sm font-bold ${
                      publisher.rank <= 3 ? 'text-amber-500' : 'text-gray-600'
                    }`}
                  >
                    #{publisher.rank}
                  </span>
                </td>
                <td className="py-3 px-2">
                  <div>
                    <span className="text-sm text-gray-900 font-medium">{publisher.name}</span>
                    <p className="text-gray-400 text-xs">{publisher.region}</p>
                  </div>
                </td>
                <td className="py-3 px-2">
                  <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                    {publisher.type}
                  </span>
                </td>
                <td className="py-3 px-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${getLatencyBgColor(publisher.avgLatency)}`}
                    />
                    <span className={`text-sm ${getLatencyColor(publisher.avgLatency)}`}>
                      {publisher.avgLatency}ms
                    </span>
                  </div>
                </td>
                <td className="py-3 px-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden max-w-20">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: `${publisher.uptime}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-700 min-w-[3rem]">{publisher.uptime}%</span>
                  </div>
                </td>
                <td className="py-3 px-2">
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="text-sm text-gray-900 font-medium">{publisher.reputation}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * 趋势分析图表组件
 */
function TrendAnalysisChart({ data }: { data: TrendDataPoint[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-gray-900 text-sm font-semibold">30-Day Trends</h3>
          <p className="text-gray-500 text-xs mt-0.5">Publisher growth and performance trends</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-purple-500" />
            <span className="text-gray-600">Publishers</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-gray-600">Avg Latency</span>
          </div>
        </div>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              stroke="#9ca3af"
              tick={{ fontSize: 10, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              interval={4}
            />
            <YAxis
              yAxisId="left"
              stroke="#9ca3af"
              tick={{ fontSize: 10, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              domain={['dataMin - 2', 'dataMax + 2']}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#9ca3af"
              tick={{ fontSize: 10, fill: '#6b7280' }}
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
            />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="publishers"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#8b5cf6' }}
              name="Publishers"
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="avgLatency"
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{ r: 4, fill: '#10b981' }}
              name="Avg Latency"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* 统计摘要 */}
      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
        <div className="text-center">
          <p className="text-xs text-gray-500">Publisher Growth</p>
          <p className="text-lg font-bold text-purple-600">
            +{data[data.length - 1].publishers - data[0].publishers}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">Latency Improvement</p>
          <p className="text-lg font-bold text-emerald-600">
            -{(((data[0].avgLatency - data[data.length - 1].avgLatency) / data[0].avgLatency) * 100).toFixed(1)}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">Total Updates</p>
          <p className="text-lg font-bold text-blue-600">
            {formatLargeNumber(data[data.length - 1].totalUpdates)}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * 统计卡片组件
 */
function StatCard({
  title,
  value,
  subValue,
  icon,
  trend,
  trendDirection,
}: {
  title: string;
  value: string;
  subValue?: string;
  icon: React.ReactNode;
  trend?: number;
  trendDirection?: 'up' | 'down' | 'neutral';
}) {
  const trendColor =
    trendDirection === 'up'
      ? 'text-emerald-600'
      : trendDirection === 'down'
        ? 'text-rose-600'
        : 'text-gray-600';

  const trendIcon = trendDirection === 'up' ? '↑' : trendDirection === 'down' ? '↓' : '→';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition-colors duration-200">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-600 text-xs uppercase tracking-wider mb-2">{title}</p>
          <p className="text-gray-900 text-xl font-bold">{value}</p>
          {subValue && <p className="text-gray-500 text-xs mt-1">{subValue}</p>}
          {trend !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trendColor}`}>
              <span>{trendIcon}</span>
              <span>
                {trend > 0 ? '+' : ''}
                {trend}%
              </span>
              <span className="text-gray-500 ml-1">vs last month</span>
            </div>
          )}
        </div>
        <div className="p-2.5 bg-purple-50 rounded-lg text-purple-600">{icon}</div>
      </div>
    </div>
  );
}

// ==================== 主组件 ====================

/**
 * Pyth Network 数据发布者分析面板组件
 *
 * 功能特性：
 * - 发布者类型分布（做市商、交易所、交易公司、机构）
 * - 地理分布可视化
 * - 发布者性能排行榜
 * - 历史趋势分析
 * - 实时数据更新
 */
export function PublisherAnalyticsPanel() {
  const [publisherData, setPublisherData] = useState(mockPublisherData);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * 模拟数据更新
   */
  const simulateDataUpdate = useCallback(() => {
    setPublisherData((prev) => {
      // 轻微波动数据
      const fluctuation = () => (Math.random() - 0.5) * 0.02;

      // 更新趋势数据
      const newTrendHistory = prev.trendHistory.map((item) => ({
        ...item,
        avgLatency: Math.max(200, Math.min(400, Math.round(item.avgLatency * (1 + fluctuation())))),
        totalUpdates: Math.floor(item.totalUpdates * (1 + Math.random() * 0.01)),
      }));

      return {
        ...prev,
        trendHistory: newTrendHistory,
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

  // 统计数据
  const totalPublishers = publisherData.publisherTypes.reduce((sum, item) => sum + item.count, 0);
  const avgLatency = Math.round(
    publisherData.topPublishers.reduce((sum, p) => sum + p.avgLatency, 0) /
      publisherData.topPublishers.length
  );
  const avgUptime = (
    publisherData.topPublishers.reduce((sum, p) => sum + p.uptime, 0) /
    publisherData.topPublishers.length
  ).toFixed(2);

  const stats = [
    {
      title: 'Total Publishers',
      value: totalPublishers.toString(),
      subValue: 'Across 4 categories',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
          />
        </svg>
      ),
      trend: 5.2,
      trendDirection: 'up' as const,
    },
    {
      title: 'Avg Latency',
      value: `${avgLatency}ms`,
      subValue: 'Network average',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
      trend: -8.5,
      trendDirection: 'down' as const,
    },
    {
      title: 'Avg Uptime',
      value: `${avgUptime}%`,
      subValue: 'Top 10 publishers',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      trend: 0.1,
      trendDirection: 'up' as const,
    },
    {
      title: 'Market Makers',
      value: publisherData.publisherTypes[0].count.toString(),
      subValue: `${publisherData.publisherTypes[0].percentage}% of network`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      trend: 3.8,
      trendDirection: 'up' as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      {/* 图表区域 - 发布者类型和地理分布 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PublisherTypeChart data={publisherData.publisherTypes} />
        <GeoDistributionChart data={publisherData.geoDistribution} />
      </div>

      {/* 趋势分析图表 */}
      <TrendAnalysisChart data={publisherData.trendHistory} />

      {/* 发布者性能排行榜 */}
      <PublisherPerformanceTable data={publisherData.topPublishers} />

      {/* 最后更新时间 */}
      <div className="text-right">
        <p className="text-xs text-gray-500">Last updated: {lastUpdated.toLocaleTimeString()}</p>
      </div>
    </div>
  );
}

export default PublisherAnalyticsPanel;
