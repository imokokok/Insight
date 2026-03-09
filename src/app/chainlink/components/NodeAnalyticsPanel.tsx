'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

// ==================== 类型定义 ====================

// 地理分布数据类型
type GeoDistribution = {
  region: string;
  count: number;
  percentage: number;
  color: string;
};

// 节点类型数据类型
type NodeType = {
  type: string;
  count: number;
  percentage: number;
  color: string;
};

// 节点性能数据类型
type NodePerformance = {
  rank: number;
  name: string;
  responseTime: number;
  successRate: number;
  reputation: number;
};

// 收益历史数据类型
type EarningsHistory = {
  date: string;
  earnings: number;
  apr: number;
};

// ==================== 模拟数据 ====================

const mockNodeData = {
  // 地理分布数据
  geoDistribution: [
    { region: 'North America', count: 648, percentage: 35.2, color: '#3B82F6' },
    { region: 'Europe', count: 462, percentage: 25.1, color: '#10B981' },
    { region: 'Asia', count: 425, percentage: 23.1, color: '#F59E0B' },
    { region: 'South America', count: 148, percentage: 8.0, color: '#EF4444' },
    { region: 'Oceania', count: 92, percentage: 5.0, color: '#8B5CF6' },
    { region: 'Africa', count: 67, percentage: 3.6, color: '#EC4899' },
  ] as GeoDistribution[],

  // 节点类型数据
  nodeTypes: [
    { type: 'Data Provider', count: 738, percentage: 40.1, color: '#3B82F6' },
    { type: 'Validator', count: 554, percentage: 30.1, color: '#10B981' },
    { type: 'Backup', count: 369, percentage: 20.0, color: '#F59E0B' },
    { type: 'Other', count: 181, percentage: 9.8, color: '#6B7280' },
  ] as NodeType[],

  // Top 10 节点性能数据
  topNodes: [
    { rank: 1, name: 'Chainlink Labs #1', responseTime: 145, successRate: 99.98, reputation: 98.5 },
    { rank: 2, name: 'Everstake', responseTime: 178, successRate: 99.95, reputation: 97.8 },
    { rank: 3, name: 'Figment', responseTime: 156, successRate: 99.92, reputation: 97.2 },
    { rank: 4, name: 'Certus One', responseTime: 189, successRate: 99.89, reputation: 96.5 },
    { rank: 5, name: 'Staked', responseTime: 234, successRate: 99.85, reputation: 95.8 },
    { rank: 6, name: 'Blockdaemon', responseTime: 267, successRate: 99.82, reputation: 95.2 },
    { rank: 7, name: 'Coinbase Cloud', responseTime: 198, successRate: 99.78, reputation: 94.5 },
    { rank: 8, name: 'T-Systems', responseTime: 312, successRate: 99.75, reputation: 93.8 },
    { rank: 9, name: 'LinkPool', responseTime: 289, successRate: 99.71, reputation: 93.2 },
    { rank: 10, name: 'Simply VC', responseTime: 356, successRate: 99.68, reputation: 92.5 },
  ] as NodePerformance[],

  // 30天收益历史数据
  earningsHistory: [
    { date: 'Day 1', earnings: 12.5, apr: 4.12 },
    { date: 'Day 2', earnings: 13.2, apr: 4.15 },
    { date: 'Day 3', earnings: 11.8, apr: 4.08 },
    { date: 'Day 4', earnings: 14.1, apr: 4.22 },
    { date: 'Day 5', earnings: 13.5, apr: 4.18 },
    { date: 'Day 6', earnings: 12.9, apr: 4.14 },
    { date: 'Day 7', earnings: 15.2, apr: 4.28 },
    { date: 'Day 8', earnings: 14.8, apr: 4.25 },
    { date: 'Day 9', earnings: 13.6, apr: 4.19 },
    { date: 'Day 10', earnings: 12.4, apr: 4.11 },
    { date: 'Day 11', earnings: 13.8, apr: 4.17 },
    { date: 'Day 12', earnings: 14.5, apr: 4.21 },
    { date: 'Day 13', earnings: 15.1, apr: 4.26 },
    { date: 'Day 14', earnings: 14.2, apr: 4.2 },
    { date: 'Day 15', earnings: 13.7, apr: 4.16 },
    { date: 'Day 16', earnings: 14.9, apr: 4.24 },
    { date: 'Day 17', earnings: 15.5, apr: 4.3 },
    { date: 'Day 18', earnings: 14.3, apr: 4.22 },
    { date: 'Day 19', earnings: 13.9, apr: 4.18 },
    { date: 'Day 20', earnings: 14.6, apr: 4.23 },
    { date: 'Day 21', earnings: 15.3, apr: 4.27 },
    { date: 'Day 22', earnings: 14.7, apr: 4.24 },
    { date: 'Day 23', earnings: 13.4, apr: 4.15 },
    { date: 'Day 24', earnings: 12.8, apr: 4.1 },
    { date: 'Day 25', earnings: 14.0, apr: 4.19 },
    { date: 'Day 26', earnings: 15.6, apr: 4.32 },
    { date: 'Day 27', earnings: 15.2, apr: 4.29 },
    { date: 'Day 28', earnings: 14.4, apr: 4.23 },
    { date: 'Day 29', earnings: 13.8, apr: 4.18 },
    { date: 'Day 30', earnings: 14.8, apr: 4.25 },
  ] as EarningsHistory[],
};

// ==================== 工具函数 ====================

// 获取响应时间颜色
function getResponseTimeColor(ms: number): string {
  if (ms < 200) return 'text-emerald-600';
  if (ms < 500) return 'text-amber-600';
  return 'text-rose-600';
}

// 获取响应时间背景色
function getResponseTimeBgColor(ms: number): string {
  if (ms < 200) return 'bg-emerald-500';
  if (ms < 500) return 'bg-amber-500';
  return 'bg-rose-500';
}

// 格式化数字
function formatNumber(num: number): string {
  return num.toLocaleString('en-US', { maximumFractionDigits: 1 });
}

// ==================== 子组件 ====================

// 地理分布 Tooltip 组件
interface GeoTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: GeoDistribution }>;
}

function GeoTooltip({ active, payload }: GeoTooltipProps) {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-xl">
        <p className="text-gray-900 font-semibold">{item.region}</p>
        <p className="text-gray-700 text-sm">{item.count.toLocaleString()} nodes</p>
        <p className="text-gray-600 text-sm">{item.percentage}%</p>
      </div>
    );
  }
  return null;
}

// 地理分布饼图组件
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
          <p className="text-gray-500 text-xs mt-0.5">Node distribution by region</p>
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
            <Tooltip content={<GeoTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* 图例和统计 */}
      <div className="grid grid-cols-2 gap-2 mt-4">
        {data.map((item) => (
          <div key={item.region} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
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

// 节点类型 Tooltip 组件
interface NodeTypeTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: NodeType }>;
}

function NodeTypeTooltip({ active, payload }: NodeTypeTooltipProps) {
  if (active && payload && payload.length) {
    const item = payload[0].payload;
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-xl">
        <p className="text-gray-900 font-semibold">{item.type}</p>
        <p className="text-gray-700 text-sm">{item.count.toLocaleString()} nodes</p>
        <p className="text-gray-600 text-sm">{item.percentage}%</p>
      </div>
    );
  }
  return null;
}

// 节点类型饼图组件
function NodeTypeChart({ data }: { data: NodeType[] }) {
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
          <h3 className="text-gray-900 text-sm font-semibold">Node Types</h3>
          <p className="text-gray-500 text-xs mt-0.5">Distribution by node function</p>
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
            <Tooltip content={<NodeTypeTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* 图例 */}
      <div className="space-y-2 mt-4">
        {data.map((item) => (
          <div key={item.type} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-gray-700 text-xs">{item.type}</span>
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

// 节点性能排行榜组件
function NodePerformanceTable({ data }: { data: NodePerformance[] }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-gray-900 text-sm font-semibold">Top 10 Nodes</h3>
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
                Node Name
              </th>
              <th className="text-left py-3 px-2 text-xs font-medium text-gray-600 uppercase tracking-wider">
                Response
              </th>
              <th className="text-left py-3 px-2 text-xs font-medium text-gray-600 uppercase tracking-wider">
                Success Rate
              </th>
              <th className="text-left py-3 px-2 text-xs font-medium text-gray-600 uppercase tracking-wider">
                Reputation
              </th>
            </tr>
          </thead>
          <tbody>
            {data.map((node) => (
              <tr
                key={node.rank}
                className="border-b border-gray-200 hover:bg-gray-50 transition-colors duration-200"
              >
                <td className="py-3 px-2">
                  <span
                    className={`text-sm font-bold ${
                      node.rank <= 3 ? 'text-amber-500' : 'text-gray-600'
                    }`}
                  >
                    #{node.rank}
                  </span>
                </td>
                <td className="py-3 px-2">
                  <span className="text-sm text-gray-900 font-medium">{node.name}</span>
                </td>
                <td className="py-3 px-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${getResponseTimeBgColor(node.responseTime)}`}
                    />
                    <span className={`text-sm ${getResponseTimeColor(node.responseTime)}`}>
                      {node.responseTime}ms
                    </span>
                  </div>
                </td>
                <td className="py-3 px-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden max-w-20">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${node.successRate}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-700 min-w-[3rem]">{node.successRate}%</span>
                  </div>
                </td>
                <td className="py-3 px-2">
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="text-sm text-gray-900 font-medium">{node.reputation}</span>
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

// 节点收益 Tooltip 组件
interface EarningsTooltipProps {
  active?: boolean;
  payload?: Array<{ color: string; name: string; value: number }>;
  label?: string;
}

function EarningsTooltip({ active, payload, label }: EarningsTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-xl">
        <p className="text-gray-600 text-xs mb-2">{label}</p>
        {payload.map((entry, idx) => (
          <p key={idx} className="text-sm" style={{ color: entry.color }}>
            {entry.name}:{' '}
            {entry.name === 'Daily Earnings' ? `${entry.value} LINK` : `${entry.value}%`}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

// 节点收益分析图表组件
function NodeEarningsChart({ data }: { data: EarningsHistory[] }) {
  // 计算平均收益
  const avgEarnings = data.reduce((sum, item) => sum + item.earnings, 0) / data.length;
  const avgApr = data.reduce((sum, item) => sum + item.apr, 0) / data.length;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-gray-900 text-sm font-semibold">Node Earnings Analysis</h3>
          <p className="text-gray-500 text-xs mt-0.5">30-day earnings and APR trends</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-gray-500">Avg Daily</p>
            <p className="text-sm font-semibold text-blue-600">{formatNumber(avgEarnings)} LINK</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Avg APR</p>
            <p className="text-sm font-semibold text-emerald-600">{formatNumber(avgApr)}%</p>
          </div>
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="date"
              stroke="#6b7280"
              tick={{ fill: '#6b7280', fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              interval={4}
            />
            <YAxis
              yAxisId="left"
              stroke="#6b7280"
              tick={{ fill: '#6b7280', fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              label={{
                value: 'Earnings (LINK)',
                angle: -90,
                position: 'insideLeft',
                fill: '#6b7280',
                fontSize: 10,
              }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              stroke="#6b7280"
              tick={{ fill: '#6b7280', fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              domain={['dataMin - 0.1', 'dataMax + 0.1']}
              label={{
                value: 'APR (%)',
                angle: 90,
                position: 'insideRight',
                fill: '#6b7280',
                fontSize: 10,
              }}
            />
            <Tooltip content={<EarningsTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '10px' }} iconType="circle" />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="earnings"
              name="Daily Earnings"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#3B82F6' }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="apr"
              name="APR"
              stroke="#10B981"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: '#10B981' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// 统计卡片组件
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
        <div className="p-2.5 bg-gray-100 rounded-lg text-gray-600">{icon}</div>
      </div>
    </div>
  );
}

// ==================== 主组件 ====================

export function NodeAnalyticsPanel() {
  const [nodeData, setNodeData] = useState(mockNodeData);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 模拟数据更新
  const simulateDataUpdate = useCallback(() => {
    setNodeData((prev) => {
      // 轻微波动数据
      const fluctuation = () => (Math.random() - 0.5) * 0.02;

      // 更新收益历史数据
      const newEarningsHistory = prev.earningsHistory.map((item) => ({
        ...item,
        earnings: Math.max(10, item.earnings * (1 + fluctuation())),
        apr: Math.max(3.5, Math.min(5, item.apr * (1 + fluctuation()))),
      }));

      return {
        ...prev,
        earningsHistory: newEarningsHistory,
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
  const totalNodes = nodeData.geoDistribution.reduce((sum, item) => sum + item.count, 0);
  const avgResponseTime = Math.round(
    nodeData.topNodes.reduce((sum, node) => sum + node.responseTime, 0) / nodeData.topNodes.length
  );
  const avgSuccessRate = (
    nodeData.topNodes.reduce((sum, node) => sum + node.successRate, 0) / nodeData.topNodes.length
  ).toFixed(2);

  const stats = [
    {
      title: 'Total Active Nodes',
      value: totalNodes.toLocaleString(),
      subValue: 'Across 6 regions',
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
      title: 'Avg Response Time',
      value: `${avgResponseTime}ms`,
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
      trend: -2.1,
      trendDirection: 'down' as const,
    },
    {
      title: 'Avg Success Rate',
      value: `${avgSuccessRate}%`,
      subValue: 'Top 10 nodes',
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
      trend: 0.3,
      trendDirection: 'up' as const,
    },
    {
      title: 'Data Providers',
      value: nodeData.nodeTypes[0].count.toLocaleString(),
      subValue: `${nodeData.nodeTypes[0].percentage}% of network`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
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

      {/* 图表区域 - 地理分布和节点类型 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GeoDistributionChart data={nodeData.geoDistribution} />
        <NodeTypeChart data={nodeData.nodeTypes} />
      </div>

      {/* 收益分析图表 */}
      <NodeEarningsChart data={nodeData.earningsHistory} />

      {/* 节点性能排行榜 */}
      <NodePerformanceTable data={nodeData.topNodes} />

      {/* 最后更新时间 */}
      <div className="text-right">
        <p className="text-xs text-gray-500">Last updated: {lastUpdated.toLocaleTimeString()}</p>
      </div>
    </div>
  );
}
