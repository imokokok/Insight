'use client';

import { useState } from 'react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

// 竞品数据类型
interface CompetitorData {
  name: string;
  nodes: number;
  chains: number;
  latency: number;
  disputeMechanism: string;
  costEfficiency: number;
  color: string;
  bgColor: string;
}

// 乐观预言机特性类型
interface OptimisticOracleFeature {
  feature: string;
  uma: string;
  chainlink: string;
  band: string;
}

// TVS数据点类型
interface TVSDataPoint {
  month: string;
  uma: number;
  chainlink: number;
  band: number;
}

// 竞品基础数据
const COMPETITORS: CompetitorData[] = [
  {
    name: 'UMA',
    nodes: 850,
    chains: 10,
    latency: 180,
    disputeMechanism: '乐观预言机',
    costEfficiency: 95,
    color: '#8b5cf6', // purple-500
    bgColor: 'bg-purple-500',
  },
  {
    name: 'Chainlink',
    nodes: 1800,
    chains: 20,
    latency: 245,
    disputeMechanism: '多节点共识',
    costEfficiency: 75,
    color: '#3b82f6', // blue-500
    bgColor: 'bg-blue-500',
  },
  {
    name: 'Band Protocol',
    nodes: 150,
    chains: 15,
    latency: 200,
    disputeMechanism: '委托共识',
    costEfficiency: 80,
    color: '#10b981', // emerald-500
    bgColor: 'bg-emerald-500',
  },
];

// 雷达图数据
const RADAR_DATA = [
  { metric: '节点数量', UMA: 47, Chainlink: 100, Band: 8 },
  { metric: '支持链数', UMA: 50, Chainlink: 100, Band: 75 },
  { metric: '响应速度', UMA: 100, Chainlink: 73, Band: 90 },
  { metric: '成本效率', UMA: 100, Chainlink: 79, Band: 84 },
  { metric: '去中心化', UMA: 85, Chainlink: 90, Band: 65 },
  { metric: '创新性', UMA: 95, Chainlink: 70, Band: 60 },
];

// 乐观预言机特性对比数据
const OPTIMISTIC_FEATURES: OptimisticOracleFeature[] = [
  {
    feature: '争议解决时间',
    uma: '2小时',
    chainlink: 'N/A',
    band: 'N/A',
  },
  {
    feature: '验证周期',
    uma: '乐观验证(即时)',
    chainlink: '多节点聚合',
    band: '委托验证',
  },
  {
    feature: '争议成本',
    uma: '低(无gas预提交)',
    chainlink: '高(多节点签名)',
    band: '中(委托质押)',
  },
  {
    feature: '最终确定性',
    uma: '2小时(乐观期)',
    chainlink: '即时',
    band: '即时',
  },
  {
    feature: '数据新鲜度',
    uma: '高(按需请求)',
    chainlink: '中(定期更新)',
    band: '中(定期更新)',
  },
  {
    feature: '自定义数据源',
    uma: '完全支持',
    chainlink: '有限支持',
    band: '有限支持',
  },
];

// TVS趋势数据（单位：百万美元）
const TVS_DATA: TVSDataPoint[] = [
  { month: '1月', uma: 45, chainlink: 8500, band: 320 },
  { month: '2月', uma: 52, chainlink: 9200, band: 340 },
  { month: '3月', uma: 48, chainlink: 8800, band: 310 },
  { month: '4月', uma: 58, chainlink: 9500, band: 360 },
  { month: '5月', uma: 65, chainlink: 10200, band: 380 },
  { month: '6月', uma: 72, chainlink: 9800, band: 350 },
  { month: '7月', uma: 68, chainlink: 10500, band: 400 },
  { month: '8月', uma: 75, chainlink: 11200, band: 420 },
  { month: '9月', uma: 82, chainlink: 10800, band: 390 },
  { month: '10月', uma: 88, chainlink: 11500, band: 450 },
  { month: '11月', uma: 95, chainlink: 12200, band: 480 },
  { month: '12月', uma: 102, chainlink: 12800, band: 520 },
];

// 多维度对比矩阵组件
function ComparisonMatrix() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h4 className="text-gray-900 font-semibold">多维度对比矩阵</h4>
        <p className="text-gray-500 text-sm mt-1">核心指标横向对比</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                对比维度
              </th>
              {COMPETITORS.map((comp) => (
                <th
                  key={comp.name}
                  className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider"
                  style={{ color: comp.color }}
                >
                  {comp.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            <tr className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 text-sm font-medium text-gray-900">节点数量</td>
              {COMPETITORS.map((comp) => (
                <td key={comp.name} className="px-6 py-4 text-center">
                  <span className="text-gray-900 font-semibold">{comp.nodes}+</span>
                </td>
              ))}
            </tr>
            <tr className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 text-sm font-medium text-gray-900">支持链数</td>
              {COMPETITORS.map((comp) => (
                <td key={comp.name} className="px-6 py-4 text-center">
                  <span className="text-gray-900 font-semibold">{comp.chains}+</span>
                </td>
              ))}
            </tr>
            <tr className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 text-sm font-medium text-gray-900">平均延迟</td>
              {COMPETITORS.map((comp) => (
                <td key={comp.name} className="px-6 py-4 text-center">
                  <span
                    className={`font-semibold ${
                      comp.latency <= 180 ? 'text-green-600' : 'text-gray-900'
                    }`}
                  >
                    {comp.latency}ms
                  </span>
                </td>
              ))}
            </tr>
            <tr className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 text-sm font-medium text-gray-900">争议机制</td>
              {COMPETITORS.map((comp) => (
                <td key={comp.name} className="px-6 py-4 text-center">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      comp.disputeMechanism === '乐观预言机'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {comp.disputeMechanism}
                  </span>
                </td>
              ))}
            </tr>
            <tr className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 text-sm font-medium text-gray-900">成本效率</td>
              {COMPETITORS.map((comp) => (
                <td key={comp.name} className="px-6 py-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${comp.bgColor}`}
                        style={{ width: `${comp.costEfficiency}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {comp.costEfficiency}%
                    </span>
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 乐观预言机特性对比组件
function OptimisticOracleComparison() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h4 className="text-gray-900 font-semibold">乐观预言机特性对比</h4>
        <p className="text-gray-500 text-sm mt-1">UMA独特优势详解</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                特性
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-purple-600 uppercase tracking-wider">
                UMA
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-blue-600 uppercase tracking-wider">
                Chainlink
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-emerald-600 uppercase tracking-wider">
                Band Protocol
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {OPTIMISTIC_FEATURES.map((item, index) => (
              <tr key={index} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.feature}</td>
                <td className="px-6 py-4 text-center">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                    {item.uma}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-sm text-gray-600">{item.chainlink}</span>
                </td>
                <td className="px-6 py-4 text-center">
                  <span className="text-sm text-gray-600">{item.band}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 雷达图组件
function CompetitorRadarChart() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="mb-4">
        <h4 className="text-gray-900 font-semibold">综合竞争力雷达图</h4>
        <p className="text-gray-500 text-sm mt-1">多维度能力评估（归一化分数）</p>
      </div>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={RADAR_DATA} margin={{ top: 20, right: 30, bottom: 20, left: 30 }}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis dataKey="metric" tick={{ fill: '#6b7280', fontSize: 12 }} />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              stroke="#e5e7eb"
            />
            <Radar
              name="UMA"
              dataKey="UMA"
              stroke="#8b5cf6"
              strokeWidth={2}
              fill="#8b5cf6"
              fillOpacity={0.2}
            />
            <Radar
              name="Chainlink"
              dataKey="Chainlink"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="#3b82f6"
              fillOpacity={0.1}
            />
            <Radar
              name="Band Protocol"
              dataKey="Band"
              stroke="#10b981"
              strokeWidth={2}
              fill="#10b981"
              fillOpacity={0.1}
            />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="circle"
              formatter={(value) => <span className="text-gray-700 text-sm">{value}</span>}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
              }}
              formatter={(value: any) => [`${value}分`, '']}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// TVS趋势对比组件
function TVSTrendComparison() {
  const [showLogScale, setShowLogScale] = useState(false);

  // 格式化大数字
  const formatTVS = (value: number) => {
    if (value >= 1000) {
      return `$${(value / 1000).toFixed(1)}B`;
    }
    return `$${value}M`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-gray-900 font-semibold">TVS趋势对比</h4>
          <p className="text-gray-500 text-sm mt-1">总担保价值变化趋势（12个月）</p>
        </div>
        <button
          onClick={() => setShowLogScale(!showLogScale)}
          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
            showLogScale
              ? 'bg-purple-100 text-purple-700'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {showLogScale ? '对数刻度' : '线性刻度'}
        </button>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={TVS_DATA} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="umaGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#a78bfa" />
              </linearGradient>
              <linearGradient id="chainlinkGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#3b82f6" />
                <stop offset="100%" stopColor="#60a5fa" />
              </linearGradient>
              <linearGradient id="bandGradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#34d399" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
            <XAxis
              dataKey="month"
              stroke="#9ca3af"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
            />
            <YAxis
              stroke="#9ca3af"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e5e7eb' }}
              tickFormatter={formatTVS}
              scale={showLogScale ? 'log' : 'linear'}
              domain={showLogScale ? ['auto', 'auto'] : [0, 'auto']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                borderRadius: '12px',
                border: '1px solid #e5e7eb',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
              }}
              formatter={(value: any, name: any) => [formatTVS(value), name]}
              labelFormatter={(label) => `${label}`}
            />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              iconType="line"
              formatter={(value) => <span className="text-gray-700 text-sm">{value}</span>}
            />
            <Line
              type="monotone"
              dataKey="uma"
              name="UMA"
              stroke="url(#umaGradient)"
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
            <Line
              type="monotone"
              dataKey="chainlink"
              name="Chainlink"
              stroke="url(#chainlinkGradient)"
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
            <Line
              type="monotone"
              dataKey="band"
              name="Band Protocol"
              stroke="url(#bandGradient)"
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
              activeDot={{ r: 6, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4">
        {COMPETITORS.map((comp) => {
          const currentTVS = TVS_DATA[TVS_DATA.length - 1];
          const tvsValue =
            comp.name === 'UMA'
              ? currentTVS.uma
              : comp.name === 'Chainlink'
                ? currentTVS.chainlink
                : currentTVS.band;
          const prevTVS = TVS_DATA[TVS_DATA.length - 2];
          const prevValue =
            comp.name === 'UMA'
              ? prevTVS.uma
              : comp.name === 'Chainlink'
                ? prevTVS.chainlink
                : prevTVS.band;
          const growth = ((tvsValue - prevValue) / prevValue) * 100;

          return (
            <div key={comp.name} className="text-center p-3 rounded-lg bg-gray-50">
              <p className="text-xs text-gray-500 mb-1">{comp.name} TVS</p>
              <p className="text-lg font-bold" style={{ color: comp.color }}>
                {formatTVS(tvsValue)}
              </p>
              <p className={`text-xs ${growth >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {growth >= 0 ? '+' : ''}
                {growth.toFixed(1)}%
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 主组件
export function CompetitorComparisonPanel() {
  return (
    <div className="space-y-6">
      {/* 顶部：多维度对比矩阵 */}
      <ComparisonMatrix />

      {/* 中部：雷达图 + 乐观预言机特性 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CompetitorRadarChart />
        <OptimisticOracleComparison />
      </div>

      {/* 底部：TVS趋势对比 */}
      <TVSTrendComparison />
    </div>
  );
}

export default CompetitorComparisonPanel;
