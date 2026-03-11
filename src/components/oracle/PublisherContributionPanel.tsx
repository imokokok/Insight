'use client';

import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { Publisher } from '@/lib/types/oracle';
import { DashboardCard } from './DashboardCard';

interface PublisherContributionPanelProps {
  publishers: Publisher[];
}

interface ContributionData {
  id: string;
  name: string;
  weight: number;
  weightPercentage: number;
  reliabilityScore: number;
  latency: number;
  status: Publisher['status'];
  color: string;
}

const COLORS = [
  '#6366f1',
  '#8b5cf6',
  '#a855f7',
  '#d946ef',
  '#ec4899',
  '#f43f5e',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
];

function calculateContributionWeight(publisher: Publisher): number {
  const reliabilityFactor = publisher.reliabilityScore / 100;
  const latencyFactor = Math.max(0, 1 - publisher.latency / 200);
  const statusFactor =
    publisher.status === 'active' ? 1 : publisher.status === 'degraded' ? 0.7 : 0.3;
  const accuracyFactor = (publisher.accuracy ?? 95) / 100;

  return reliabilityFactor * 0.4 + latencyFactor * 0.2 + statusFactor * 0.2 + accuracyFactor * 0.2;
}

function formatTimeSince(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function PublisherContributionPanel({ publishers }: PublisherContributionPanelProps) {
  const contributionData: ContributionData[] = useMemo(() => {
    const weights = publishers.map((p) => ({
      publisher: p,
      rawWeight: calculateContributionWeight(p),
    }));

    const totalWeight = weights.reduce((sum, w) => sum + w.rawWeight, 0);

    return weights.map((w, index) => ({
      id: w.publisher.id,
      name: w.publisher.name,
      weight: w.rawWeight,
      weightPercentage: totalWeight > 0 ? (w.rawWeight / totalWeight) * 100 : 0,
      reliabilityScore: w.publisher.reliabilityScore,
      latency: w.publisher.latency,
      status: w.publisher.status,
      color: COLORS[index % COLORS.length],
    }));
  }, [publishers]);

  const sortedByWeight = useMemo(
    () => [...contributionData].sort((a, b) => b.weightPercentage - a.weightPercentage),
    [contributionData]
  );

  const topContributor = sortedByWeight[0];

  const pieData = contributionData.map((d) => ({
    name: d.name,
    value: d.weightPercentage,
    color: d.color,
  }));

  const barData = sortedByWeight.map((d) => ({
    name: d.name,
    weight: d.weightPercentage,
    reliability: d.reliabilityScore,
    latency: d.latency,
    color: d.color,
  }));

  const totalWeight = contributionData.reduce((sum, d) => sum + d.weightPercentage, 0);
  const avgReliability =
    publishers.reduce((sum, p) => sum + p.reliabilityScore, 0) / publishers.length;
  const avgLatency = publishers.reduce((sum, p) => sum + p.latency, 0) / publishers.length;

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; payload: { color: string } }>;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold text-gray-900">{payload[0].name}</p>
          <p className="text-sm text-gray-600">
            贡献权重:{' '}
            <span className="font-medium text-purple-600">{payload[0].value.toFixed(2)}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-white/20 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold">Publisher Contribution Analysis</h3>
            <p className="text-sm text-white/80">聚合价格贡献权重分布</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-white/70 text-sm">Total Publishers</p>
            <p className="text-2xl font-bold">{publishers.length}</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-white/70 text-sm">Avg Reliability</p>
            <p className="text-2xl font-bold">{avgReliability.toFixed(1)}%</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-white/70 text-sm">Avg Latency</p>
            <p className="text-2xl font-bold">{avgLatency.toFixed(0)}ms</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard title="贡献权重分布">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(1)}%`}
                  labelLine={{ stroke: '#9ca3af', strokeWidth: 1 }}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  formatter={(value) => <span className="text-gray-700 text-sm">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>

        <DashboardCard title="权重对比条形图">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} layout="vertical" margin={{ left: 60, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                <YAxis dataKey="name" type="category" width={50} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value) => [`${Number(value).toFixed(2)}%`, '贡献权重']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                />
                <Bar dataKey="weight" radius={[0, 4, 4, 0]}>
                  {barData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </DashboardCard>
      </div>

      <DashboardCard title="贡献权重详情">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Rank</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                  Publisher
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                  Weight %
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                  Reliability
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                  Latency
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedByWeight.map((publisher, index) => (
                <tr
                  key={publisher.id}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    publisher.id === topContributor?.id
                      ? 'bg-purple-50 border-l-4 border-l-purple-500'
                      : ''
                  }`}
                >
                  <td className="py-3 px-4">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0
                          ? 'bg-yellow-400 text-yellow-900'
                          : index === 1
                            ? 'bg-gray-300 text-gray-700'
                            : index === 2
                              ? 'bg-amber-600 text-white'
                              : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {index + 1}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-semibold text-xs"
                        style={{ backgroundColor: publisher.color }}
                      >
                        {publisher.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-medium text-gray-900">{publisher.name}</span>
                        {publisher.id === topContributor?.id && (
                          <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                            Top Contributor
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${publisher.weightPercentage}%`,
                            backgroundColor: publisher.color,
                          }}
                        />
                      </div>
                      <span className="font-semibold text-gray-900 min-w-[60px] text-right">
                        {publisher.weightPercentage.toFixed(2)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`font-medium ${
                        publisher.reliabilityScore >= 98
                          ? 'text-green-600'
                          : publisher.reliabilityScore >= 95
                            ? 'text-blue-600'
                            : 'text-yellow-600'
                      }`}
                    >
                      {publisher.reliabilityScore.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`font-medium ${
                        publisher.latency < 50
                          ? 'text-green-600'
                          : publisher.latency < 80
                            ? 'text-blue-600'
                            : 'text-yellow-600'
                      }`}
                    >
                      {publisher.latency}ms
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        publisher.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : publisher.status === 'degraded'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {publisher.status.charAt(0).toUpperCase() + publisher.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardCard>

      <DashboardCard title="权重计算说明">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <span className="font-semibold text-gray-900">可靠性分数</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">40%</p>
            <p className="text-sm text-gray-600 mt-1">基于历史可靠性评分</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <span className="font-semibold text-gray-900">延迟因子</span>
            </div>
            <p className="text-2xl font-bold text-green-600">20%</p>
            <p className="text-sm text-gray-600 mt-1">响应速度权重</p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <span className="font-semibold text-gray-900">状态因子</span>
            </div>
            <p className="text-2xl font-bold text-purple-600">20%</p>
            <p className="text-sm text-gray-600 mt-1">当前运行状态</p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <span className="font-semibold text-gray-900">准确度因子</span>
            </div>
            <p className="text-2xl font-bold text-orange-600">20%</p>
            <p className="text-sm text-gray-600 mt-1">价格准确度评分</p>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
