'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { DashboardCard } from './DashboardCard';

interface PublisherData {
  name: string;
  weight: number;
  submissions: number;
  reliability: number;
  status: 'active' | 'degraded' | 'inactive';
}

interface ConcentrationMetrics {
  diversityScore: number;
  herfindahlIndex: number;
  topPublisherWeight: number;
  singleFailureImpact: 'low' | 'medium' | 'high';
}

function generateMockPublishers(): PublisherData[] {
  return [
    { name: 'Publisher A', weight: 35, submissions: 1250, reliability: 99.2, status: 'active' },
    { name: 'Publisher B', weight: 25, submissions: 890, reliability: 98.5, status: 'active' },
    { name: 'Publisher C', weight: 20, submissions: 720, reliability: 97.8, status: 'active' },
    { name: 'Publisher D', weight: 12, submissions: 430, reliability: 96.5, status: 'active' },
    { name: 'Publisher E', weight: 5, submissions: 180, reliability: 94.2, status: 'degraded' },
    { name: 'Publisher F', weight: 3, submissions: 110, reliability: 92.0, status: 'active' },
  ];
}

function calculateConcentrationMetrics(publishers: PublisherData[]): ConcentrationMetrics {
  const herfindahlIndex = publishers.reduce((sum, p) => sum + Math.pow(p.weight, 2), 0);
  const topPublisherWeight = Math.max(...publishers.map((p) => p.weight));
  
  let diversityScore = 100;
  if (herfindahlIndex > 2500) {
    diversityScore = Math.max(0, 100 - (herfindahlIndex - 1000) / 25);
  } else if (herfindahlIndex > 1500) {
    diversityScore = Math.max(50, 100 - (herfindahlIndex - 1000) / 30);
  }

  let singleFailureImpact: 'low' | 'medium' | 'high' = 'low';
  if (topPublisherWeight >= 40) {
    singleFailureImpact = 'high';
  } else if (topPublisherWeight >= 25) {
    singleFailureImpact = 'medium';
  }

  return {
    diversityScore: Math.round(diversityScore),
    herfindahlIndex: Math.round(herfindahlIndex),
    topPublisherWeight,
    singleFailureImpact,
  };
}

const COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6b7280'];

function getDiversityLevel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: '优秀', color: 'text-green-600' };
  if (score >= 60) return { label: '良好', color: 'text-blue-600' };
  if (score >= 40) return { label: '一般', color: 'text-yellow-600' };
  return { label: '较差', color: 'text-red-600' };
}

function getImpactLevel(impact: 'low' | 'medium' | 'high'): { label: string; color: string; bgColor: string } {
  switch (impact) {
    case 'low':
      return { label: '低', color: 'text-green-600', bgColor: 'bg-green-100' };
    case 'medium':
      return { label: '中等', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    case 'high':
      return { label: '高', color: 'text-red-600', bgColor: 'bg-red-100' };
  }
}

export function ConcentrationRisk() {
  const publishers = useMemo(() => generateMockPublishers(), []);
  const metrics = useMemo(() => calculateConcentrationMetrics(publishers), [publishers]);
  const diversityLevel = getDiversityLevel(metrics.diversityScore);
  const impactLevel = getImpactLevel(metrics.singleFailureImpact);

  const pieData = publishers.map((p) => ({
    name: p.name,
    value: p.weight,
  }));

  return (
    <DashboardCard title="数据源集中度风险分析">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-medium text-gray-700">Publisher 权重分布</h4>
            </div>
            <div style={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}%`}
                    labelLine={{ stroke: '#9ca3af', strokeWidth: 1 }}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value}%`, '权重']}
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">数据源多样性评分</span>
                <span className={`text-sm font-medium ${diversityLevel.color}`}>{diversityLevel.label}</span>
              </div>
              <div className="flex items-end gap-2">
                <span className={`text-3xl font-bold ${diversityLevel.color}`}>{metrics.diversityScore}</span>
                <span className="text-sm text-gray-500 mb-1">/100</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div
                  className={`h-2 rounded-full ${
                    metrics.diversityScore >= 80
                      ? 'bg-green-500'
                      : metrics.diversityScore >= 60
                        ? 'bg-blue-500'
                        : metrics.diversityScore >= 40
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                  }`}
                  style={{ width: `${metrics.diversityScore}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Herfindahl 指数</p>
                <p className="text-lg font-bold text-gray-900">{metrics.herfindahlIndex}</p>
                <p className="text-xs text-gray-400 mt-1">越低越分散</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">最大 Publisher 权重</p>
                <p className="text-lg font-bold text-gray-900">{metrics.topPublisherWeight}%</p>
                <p className="text-xs text-gray-400 mt-1">建议 &lt;30%</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">单一 Publisher 故障影响</span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${impactLevel.bgColor} ${impactLevel.color}`}>
                  {impactLevel.label}风险
                </span>
              </div>
              <p className="text-xs text-gray-500">
                当最大权重 Publisher 发生故障时，可能对价格准确性产生{' '}
                {metrics.singleFailureImpact === 'high' ? '显著' : metrics.singleFailureImpact === 'medium' ? '一定' : '轻微'}{' '}
                影响。
              </p>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Publisher 详情</h4>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500">名称</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">权重</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">提交次数</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500">可靠性</th>
                  <th className="text-center py-2 px-3 text-xs font-medium text-gray-500">状态</th>
                </tr>
              </thead>
              <tbody>
                {publishers.map((publisher, index) => (
                  <tr key={publisher.name} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm text-gray-900">{publisher.name}</span>
                      </div>
                    </td>
                    <td className="text-right py-2 px-3 text-sm text-gray-900">{publisher.weight}%</td>
                    <td className="text-right py-2 px-3 text-sm text-gray-600">{publisher.submissions.toLocaleString()}</td>
                    <td className="text-right py-2 px-3 text-sm text-gray-600">{publisher.reliability}%</td>
                    <td className="text-center py-2 px-3">
                      <span
                        className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                          publisher.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : publisher.status === 'degraded'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {publisher.status === 'active' ? '正常' : publisher.status === 'degraded' ? '降级' : '离线'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-blue-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">集中度风险说明</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Herfindahl 指数用于衡量市场集中度，数值越低表示数据源越分散</li>
            <li>• 理想情况下，单一 Publisher 权重不应超过 30%</li>
            <li>• 多样性评分综合考虑了 Publisher 数量和权重分布</li>
            <li>• 高集中度可能导致单点故障风险，影响价格数据的可靠性</li>
          </ul>
        </div>
      </div>
    </DashboardCard>
  );
}
