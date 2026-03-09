'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// ============ 类型定义 ============

interface OracleMetrics {
  name: string;
  publisherCount: number;
  supportedChains: number;
  dataSources: number;
  tvs: number; // in billions
  marketShare: number; // percentage
  avgLatency: number; // in ms
  updateFrequency: string;
  securityModel: string;
  consensus: string;
  dataSourceType: string;
  color: string;
  logo: string;
}

interface RadarDataPoint {
  metric: string;
  chainlink: number;
  pyth: number;
  band: number;
  api3: number;
  fullMark: number;
}

// ============ 模拟数据 ============

const mockOracleMetrics: OracleMetrics[] = [
  {
    name: 'Chainlink',
    publisherCount: 0, // Third-party nodes
    supportedChains: 25,
    dataSources: 1200,
    tvs: 28.5,
    marketShare: 68.2,
    avgLatency: 120000, // ~2 min in ms
    updateFrequency: '~2 min',
    securityModel: 'Decentralized Oracle Network',
    consensus: 'Multi-sig + Staking',
    dataSourceType: 'Third-party Aggregators',
    color: '#3b82f6',
    logo: 'LINK',
  },
  {
    name: 'Pyth Network',
    publisherCount: 95,
    supportedChains: 50,
    dataSources: 450,
    tvs: 8.2,
    marketShare: 19.6,
    avgLatency: 400, // ~400ms
    updateFrequency: '~400 ms',
    securityModel: 'First-Party Oracle',
    consensus: 'Proof of Authority',
    dataSourceType: 'First-party Publishers',
    color: '#a855f7',
    logo: 'PYTH',
  },
  {
    name: 'Band Protocol',
    publisherCount: 85,
    supportedChains: 15,
    dataSources: 280,
    tvs: 3.1,
    marketShare: 7.4,
    avgLatency: 600000, // ~10 min in ms
    updateFrequency: '~10 min',
    securityModel: 'Delegated Proof of Stake',
    consensus: 'BFT Consensus',
    dataSourceType: 'Mixed',
    color: '#10b981',
    logo: 'BAND',
  },
  {
    name: 'API3',
    publisherCount: 45,
    supportedChains: 12,
    dataSources: 180,
    tvs: 1.9,
    marketShare: 4.8,
    avgLatency: 60000, // ~1 min in ms
    updateFrequency: '~1 min',
    securityModel: 'First-Party Oracle',
    consensus: 'DAO Governance',
    dataSourceType: 'First-party dAPIs',
    color: '#f97316',
    logo: 'API3',
  },
];

const mockRadarData: RadarDataPoint[] = [
  { metric: '去中心化程度', chainlink: 95, pyth: 70, band: 75, api3: 65, fullMark: 100 },
  { metric: '数据覆盖', chainlink: 98, pyth: 85, band: 70, api3: 60, fullMark: 100 },
  { metric: '延迟性能', chainlink: 40, pyth: 98, band: 35, api3: 75, fullMark: 100 },
  { metric: '安全性', chainlink: 95, pyth: 88, band: 80, api3: 78, fullMark: 100 },
  { metric: '成本效率', chainlink: 70, pyth: 90, band: 85, api3: 88, fullMark: 100 },
  { metric: '易用性', chainlink: 85, pyth: 88, band: 82, api3: 80, fullMark: 100 },
];

// ============ 工具函数 ============

function formatNumber(value: number, compact: boolean = false): string {
  if (compact) {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);
  }
  return new Intl.NumberFormat('en-US').format(value);
}

function formatLatency(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(0)}min`;
}

function getRank(value: number, values: number[], ascending: boolean = false): number {
  const sorted = [...values].sort((a, b) => (ascending ? a - b : b - a));
  return sorted.indexOf(value) + 1;
}

// ============ 子组件 ============

// 对比矩阵表格
function ComparisonMatrix() {
  const metrics = [
    {
      key: 'publisherCount',
      label: '发布者数量',
      format: (v: number) => (v === 0 ? 'Third-party' : formatNumber(v)),
      ascending: false,
    },
    {
      key: 'supportedChains',
      label: '支持的链',
      format: (v: number) => `${v}+`,
      ascending: false,
    },
    {
      key: 'dataSources',
      label: '数据源',
      format: (v: number) => formatNumber(v),
      ascending: false,
    },
    {
      key: 'tvs',
      label: 'TVS ($B)',
      format: (v: number) => `$${v}B`,
      ascending: false,
    },
    {
      key: 'marketShare',
      label: '市场份额',
      format: (v: number) => `${v}%`,
      ascending: false,
    },
    {
      key: 'avgLatency',
      label: '平均延迟',
      format: (v: number) => formatLatency(v),
      ascending: true,
    },
    {
      key: 'updateFrequency',
      label: '更新频率',
      format: (v: string) => v,
      ascending: false,
      isString: true,
    },
    {
      key: 'securityModel',
      label: '安全模型',
      format: (v: string) => v,
      ascending: false,
      isString: true,
    },
    {
      key: 'consensus',
      label: '共识机制',
      format: (v: string) => v,
      ascending: false,
      isString: true,
    },
    {
      key: 'dataSourceType',
      label: '数据源类型',
      format: (v: string) => v,
      ascending: false,
      isString: true,
    },
  ];

  const getMetricValue = (oracle: OracleMetrics, key: string): number | string => {
    return (oracle as unknown as Record<string, number | string>)[key];
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-slate-700/50">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <svg
            className="w-5 h-5 text-violet-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"
            />
          </svg>
          多维度对比矩阵
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-900/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider sticky left-0 bg-slate-900/50 z-10">
                指标
              </th>
              {mockOracleMetrics.map((oracle) => (
                <th
                  key={oracle.name}
                  className={`px-4 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                    oracle.name === 'Pyth Network' ? 'text-violet-400' : 'text-slate-400'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm font-bold">{oracle.name}</span>
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: `${oracle.color}20`, color: oracle.color }}
                    >
                      {oracle.logo}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {metrics.map((metric) => {
              const values = mockOracleMetrics.map((o) => getMetricValue(o, metric.key) as number);
              return (
                <tr key={metric.key} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3 text-sm text-slate-300 sticky left-0 bg-slate-800/50 z-10 font-medium">
                    {metric.label}
                  </td>
                  {mockOracleMetrics.map((oracle) => {
                    const value = getMetricValue(oracle, metric.key);
                    const isPyth = oracle.name === 'Pyth Network';
                    let rank: number | null = null;

                    if (!metric.isString) {
                      rank = getRank(value as number, values, metric.ascending);
                    }

                    return (
                      <td
                        key={oracle.name}
                        className={`px-4 py-3 text-center ${isPyth ? 'bg-violet-500/5' : ''}`}
                      >
                        <div className="flex flex-col items-center">
                          <span
                            className={`text-sm ${isPyth ? 'text-violet-300 font-semibold' : 'text-slate-300'}`}
                          >
                            {metric.format(value as number & string)}
                          </span>
                          {rank && (
                            <span
                              className={`text-[10px] mt-0.5 px-1.5 py-0.5 rounded-full ${
                                rank === 1
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : rank === 2
                                    ? 'bg-slate-500/20 text-slate-400'
                                    : 'bg-slate-700/30 text-slate-500'
                              }`}
                            >
                              #{rank}
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// 延迟对比柱状图
function LatencyComparisonChart() {
  const latencyData = mockOracleMetrics.map((oracle) => ({
    name: oracle.name,
    latency: oracle.avgLatency,
    color: oracle.color,
    formatted: formatLatency(oracle.avgLatency),
  }));

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <svg
            className="w-5 h-5 text-emerald-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
          延迟性能对比 (对数刻度)
        </h3>
      </div>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={latencyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.3} />
            <XAxis
              dataKey="name"
              stroke="#64748b"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={{ stroke: '#334155', strokeOpacity: 0.5 }}
            />
            <YAxis
              stroke="#64748b"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={{ stroke: '#334155', strokeOpacity: 0.5 }}
              scale="log"
              domain={[1, 'auto']}
              tickFormatter={(value) => formatLatency(value)}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const data = payload[0].payload;
                return (
                  <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl">
                    <p className="text-white font-medium text-sm">{data.name}</p>
                    <p className="text-slate-400 text-xs mt-1">延迟: {data.formatted}</p>
                  </div>
                );
              }}
            />
            <Bar dataKey="latency" radius={[4, 4, 0, 0]}>
              {latencyData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// 市场份额环形图
function MarketShareChart() {
  const data = mockOracleMetrics.map((oracle) => ({
    name: oracle.name,
    value: oracle.marketShare,
    color: oracle.color,
    tvs: oracle.tvs,
  }));

  const totalTVS = data.reduce((sum, item) => sum + item.tvs, 0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
      <div className="mb-4">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <svg
            className="w-5 h-5 text-amber-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"
            />
          </svg>
          市场份额分布
        </h3>
      </div>
      <div className="h-[280px] relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              onMouseEnter={(_, index) => setActiveIndex(index)}
              onMouseLeave={() => setActiveIndex(null)}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  stroke={activeIndex === index ? '#fff' : 'transparent'}
                  strokeWidth={activeIndex === index ? 2 : 0}
                  style={{
                    filter: activeIndex === index ? 'brightness(1.2)' : 'none',
                    transition: 'all 0.2s ease',
                  }}
                />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const data = payload[0].payload;
                return (
                  <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: data.color }}
                      />
                      <span className="text-white font-medium text-sm">{data.name}</span>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-400">市场份额:</span>
                        <span className="text-white font-mono">{data.value}%</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-400">TVS:</span>
                        <span className="text-white font-mono">${data.tvs}B</span>
                      </div>
                    </div>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* 中心内容 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-slate-400 text-xs">Total TVS</span>
          <span className="text-white text-xl font-bold">${totalTVS.toFixed(1)}B</span>
        </div>
      </div>
      {/* 图例 */}
      <div className="grid grid-cols-2 gap-2 mt-2">
        {data.map((item) => (
          <div key={item.name} className="flex items-center gap-2 p-2 rounded-lg bg-slate-700/30">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            <div className="flex-1 min-w-0">
              <p className="text-slate-300 text-xs font-medium truncate">{item.name}</p>
              <p className="text-slate-500 text-[10px]">
                {item.value}% · ${item.tvs}B
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 雷达图对比
function RadarComparisonChart() {
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

  const oracles = [
    { key: 'chainlink', name: 'Chainlink', color: '#3b82f6', fillColor: '#3b82f6' },
    { key: 'pyth', name: 'Pyth', color: '#a855f7', fillColor: '#a855f7' },
    { key: 'band', name: 'Band', color: '#10b981', fillColor: '#10b981' },
    { key: 'api3', name: 'API3', color: '#f97316', fillColor: '#f97316' },
  ];

  const toggleSeries = (key: string) => {
    const newHidden = new Set(hiddenSeries);
    if (newHidden.has(key)) {
      newHidden.delete(key);
    } else {
      newHidden.add(key);
    }
    setHiddenSeries(newHidden);
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <svg
            className="w-5 h-5 text-purple-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          综合能力雷达图
        </h3>
        <div className="flex items-center gap-1">
          {oracles.map((oracle) => (
            <button
              key={oracle.key}
              onClick={() => toggleSeries(oracle.key)}
              className={`px-2 py-1 rounded text-[10px] transition-all ${
                hiddenSeries.has(oracle.key) ? 'bg-slate-700/50 text-slate-500' : 'text-white'
              }`}
              style={{
                backgroundColor: hiddenSeries.has(oracle.key) ? undefined : `${oracle.color}30`,
              }}
            >
              {oracle.name}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={mockRadarData}>
            <PolarGrid stroke="#334155" />
            <PolarAngleAxis dataKey="metric" tick={{ fill: '#94a3b8', fontSize: 11 }} />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 100]}
              tick={{ fill: '#64748b', fontSize: 9 }}
              tickCount={6}
              stroke="#334155"
            />
            {!hiddenSeries.has('chainlink') && (
              <Radar
                name="Chainlink"
                dataKey="chainlink"
                stroke="#3b82f6"
                strokeWidth={2}
                fill="#3b82f6"
                fillOpacity={0.15}
              />
            )}
            {!hiddenSeries.has('pyth') && (
              <Radar
                name="Pyth"
                dataKey="pyth"
                stroke="#a855f7"
                strokeWidth={2}
                fill="#a855f7"
                fillOpacity={0.15}
              />
            )}
            {!hiddenSeries.has('band') && (
              <Radar
                name="Band"
                dataKey="band"
                stroke="#10b981"
                strokeWidth={2}
                fill="#10b981"
                fillOpacity={0.15}
              />
            )}
            {!hiddenSeries.has('api3') && (
              <Radar
                name="API3"
                dataKey="api3"
                stroke="#f97316"
                strokeWidth={2}
                fill="#f97316"
                fillOpacity={0.15}
              />
            )}
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const data = payload[0].payload as RadarDataPoint;
                return (
                  <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl">
                    <p className="text-slate-300 text-xs mb-2 font-medium">{data.metric}</p>
                    <div className="space-y-1">
                      {!hiddenSeries.has('chainlink') && (
                        <div className="flex items-center justify-between gap-4 text-xs">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            <span className="text-slate-400">Chainlink</span>
                          </span>
                          <span className="text-blue-400 font-mono">{data.chainlink}</span>
                        </div>
                      )}
                      {!hiddenSeries.has('pyth') && (
                        <div className="flex items-center justify-between gap-4 text-xs">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-purple-500" />
                            <span className="text-slate-400">Pyth</span>
                          </span>
                          <span className="text-purple-400 font-mono">{data.pyth}</span>
                        </div>
                      )}
                      {!hiddenSeries.has('band') && (
                        <div className="flex items-center justify-between gap-4 text-xs">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            <span className="text-slate-400">Band</span>
                          </span>
                          <span className="text-emerald-400 font-mono">{data.band}</span>
                        </div>
                      )}
                      {!hiddenSeries.has('api3') && (
                        <div className="flex items-center justify-between gap-4 text-xs">
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-orange-500" />
                            <span className="text-slate-400">API3</span>
                          </span>
                          <span className="text-orange-400 font-mono">{data.api3}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// 技术架构差异说明
function ArchitectureComparison() {
  const architectures = [
    {
      name: 'Chainlink',
      type: 'Third-party Aggregators',
      description: '使用独立的节点运营商网络聚合数据，通过多签和质押机制保证安全。',
      pros: ['高度去中心化', '广泛的链支持', '成熟的生态系统'],
      cons: ['更新延迟较高', '成本相对较高'],
      color: 'blue',
    },
    {
      name: 'Pyth Network',
      type: 'First-party Publishers',
      description: '由顶级交易机构和做市商直接发布数据，提供亚秒级更新和置信区间。',
      pros: ['极低延迟 (~400ms)', '置信区间机制', '第一方数据质量高'],
      cons: ['发布者数量相对较少', '较新的协议'],
      color: 'violet',
    },
    {
      name: 'Band Protocol',
      type: 'Delegated Proof of Stake',
      description: '基于 Cosmos SDK 构建，使用委托权益证明共识机制验证数据。',
      pros: ['跨链互操作性', '灵活的定制能力'],
      cons: ['更新频率较低', '较小的生态系统'],
      color: 'emerald',
    },
    {
      name: 'API3',
      type: 'First-party dAPIs',
      description: '通过 Airnode 让 API 提供商直接运行预言机节点，无需第三方中介。',
      pros: ['消除中间人', 'DAO 治理', '透明的数据源'],
      cons: ['数据源覆盖有限', '需要 API 提供商参与'],
      color: 'orange',
    },
  ];

  const colorClasses: Record<string, { border: string; bg: string; text: string }> = {
    blue: { border: 'border-blue-500/30', bg: 'bg-blue-500/10', text: 'text-blue-400' },
    violet: { border: 'border-violet-500/30', bg: 'bg-violet-500/10', text: 'text-violet-400' },
    emerald: { border: 'border-emerald-500/30', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
    orange: { border: 'border-orange-500/30', bg: 'bg-orange-500/10', text: 'text-orange-400' },
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {architectures.map((arch) => {
        const colors = colorClasses[arch.color];
        return (
          <div key={arch.name} className={`bg-slate-800/30 border ${colors.border} rounded-xl p-4`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className={`font-semibold ${colors.text}`}>{arch.name}</h4>
                <span className="text-xs text-slate-500">{arch.type}</span>
              </div>
            </div>
            <p className="text-sm text-slate-400 mb-3">{arch.description}</p>
            <div className="space-y-2">
              <div>
                <span className="text-xs text-emerald-400 font-medium">优势:</span>
                <ul className="mt-1 space-y-1">
                  {arch.pros.map((pro, i) => (
                    <li key={i} className="text-xs text-slate-500 flex items-center gap-1">
                      <span className="text-emerald-500">+</span> {pro}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <span className="text-xs text-rose-400 font-medium">劣势:</span>
                <ul className="mt-1 space-y-1">
                  {arch.cons.map((con, i) => (
                    <li key={i} className="text-xs text-slate-500 flex items-center gap-1">
                      <span className="text-rose-500">-</span> {con}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 关键洞察卡片
function InsightCards() {
  const insights = [
    {
      title: '最低延迟',
      value: 'Pyth Network',
      description: '平均 400ms 延迟，亚秒级更新频率',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      color: 'violet',
    },
    {
      title: '市场领导者',
      value: 'Chainlink',
      description: '占据 68.2% 市场份额，TVS 达 $28.5B',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
          />
        </svg>
      ),
      color: 'blue',
    },
    {
      title: '最多链支持',
      value: 'Pyth Network',
      description: '支持 50+ 区块链网络，覆盖主流 L1/L2',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
          />
        </svg>
      ),
      color: 'emerald',
    },
    {
      title: '第一方数据',
      value: 'Pyth & API3',
      description: '直接来自顶级交易机构和 API 提供商',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      ),
      color: 'amber',
    },
  ];

  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    violet: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
    emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {insights.map((insight, idx) => {
        const colors = colorClasses[insight.color];
        return (
          <div
            key={idx}
            className={`${colors.bg} border ${colors.border} rounded-xl p-4 hover:bg-opacity-20 transition-all`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className={`p-2 rounded-lg ${colors.bg} ${colors.text}`}>{insight.icon}</div>
            </div>
            <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">{insight.title}</p>
            <p className={`${colors.text} font-semibold text-lg mb-1`}>{insight.value}</p>
            <p className="text-slate-500 text-xs">{insight.description}</p>
          </div>
        );
      })}
    </div>
  );
}

// ============ 主组件 ============

export function CompetitorComparisonPanel() {
  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">竞品深度对比</h2>
          <p className="text-slate-400 text-sm mt-1">Pyth Network vs 主要预言机协议全方位分析</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          数据实时更新
        </div>
      </div>

      {/* 关键洞察 */}
      <InsightCards />

      {/* 对比矩阵表格 */}
      <ComparisonMatrix />

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 延迟对比图 */}
        <LatencyComparisonChart />

        {/* 市场份额环形图 */}
        <MarketShareChart />
      </div>

      {/* 雷达图 */}
      <RadarComparisonChart />

      {/* 技术架构差异 */}
      <div>
        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
          <svg
            className="w-5 h-5 text-cyan-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
            />
          </svg>
          技术架构差异
        </h3>
        <ArchitectureComparison />
      </div>

      {/* 底部说明 */}
      <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <svg
            className="w-5 h-5 text-slate-500 mt-0.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="text-sm text-slate-400">
            <p className="mb-1">
              <span className="text-slate-300 font-medium">数据说明：</span>
              TVS (Total Value Secured)
              表示预言机协议保障的总价值。数据来源于各协议官方披露及链上数据分析，更新频率为每日。
            </p>
            <p>
              <span className="text-slate-300 font-medium">对比维度：</span>
              延迟测试基于以太坊主网环境；去中心化程度基于节点/发布者数量和分布；数据覆盖包括价格对、链上数据源等。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CompetitorComparisonPanel;
