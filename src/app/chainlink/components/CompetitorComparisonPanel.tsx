'use client';

import { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

// ============ 类型定义 ============

interface OracleMetrics {
  name: string;
  nodeCount: number;
  supportedChains: number;
  dataSources: number;
  tvs: number; // in billions
  marketShare: number; // percentage
  avgLatency: number; // in ms
  updateFrequency: string;
  securityModel: string;
  consensus: string;
  color: string;
  logo: string;
}

interface TVSHistoryPoint {
  month: string;
  chainlink: number;
  pyth: number;
  band: number;
  api3: number;
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
    nodeCount: 1250,
    supportedChains: 25,
    dataSources: 1200,
    tvs: 28.5,
    marketShare: 68.2,
    avgLatency: 120,
    updateFrequency: '~2 min',
    securityModel: 'Decentralized Oracle Network',
    consensus: 'Multi-sig + Staking',
    color: '#3b82f6',
    logo: 'LINK',
  },
  {
    name: 'Pyth Network',
    nodeCount: 95,
    supportedChains: 50,
    dataSources: 450,
    tvs: 8.2,
    marketShare: 19.6,
    avgLatency: 300,
    updateFrequency: '~400 ms',
    securityModel: 'First-Party Oracle',
    consensus: 'Proof of Authority',
    color: '#a855f7',
    logo: 'PYTH',
  },
  {
    name: 'Band Protocol',
    nodeCount: 85,
    supportedChains: 15,
    dataSources: 280,
    tvs: 3.1,
    marketShare: 7.4,
    avgLatency: 600,
    updateFrequency: '~10 min',
    securityModel: 'Delegated Proof of Stake',
    consensus: 'BFT Consensus',
    color: '#10b981',
    logo: 'BAND',
  },
  {
    name: 'API3',
    nodeCount: 45,
    supportedChains: 12,
    dataSources: 180,
    tvs: 1.9,
    marketShare: 4.8,
    avgLatency: 450,
    updateFrequency: '~1 min',
    securityModel: 'First-Party Oracle',
    consensus: 'DAO Governance',
    color: '#f97316',
    logo: 'API3',
  },
];

const mockTVSHistory: TVSHistoryPoint[] = [
  { month: '2024-03', chainlink: 21.2, pyth: 3.8, band: 2.1, api3: 0.8 },
  { month: '2024-04', chainlink: 22.8, pyth: 4.5, band: 2.3, api3: 1.0 },
  { month: '2024-05', chainlink: 24.1, pyth: 5.2, band: 2.5, api3: 1.2 },
  { month: '2024-06', chainlink: 23.5, pyth: 5.8, band: 2.4, api3: 1.3 },
  { month: '2024-07', chainlink: 25.2, pyth: 6.5, band: 2.7, api3: 1.5 },
  { month: '2024-08', chainlink: 26.8, pyth: 7.1, band: 2.9, api3: 1.6 },
  { month: '2024-09', chainlink: 25.5, pyth: 7.8, band: 2.8, api3: 1.7 },
  { month: '2024-10', chainlink: 27.1, pyth: 8.5, band: 3.0, api3: 1.8 },
  { month: '2024-11', chainlink: 28.3, pyth: 9.2, band: 3.1, api3: 1.9 },
  { month: '2024-12', chainlink: 29.5, pyth: 9.8, band: 3.2, api3: 2.0 },
  { month: '2025-01', chainlink: 27.8, pyth: 8.5, band: 3.0, api3: 1.9 },
  { month: '2025-02', chainlink: 28.5, pyth: 8.2, band: 3.1, api3: 1.9 },
];

const mockRadarData: RadarDataPoint[] = [
  { metric: '去中心化程度', chainlink: 95, pyth: 70, band: 75, api3: 65, fullMark: 100 },
  { metric: '数据覆盖', chainlink: 98, pyth: 85, band: 70, api3: 60, fullMark: 100 },
  { metric: '延迟性能', chainlink: 80, pyth: 95, band: 60, api3: 75, fullMark: 100 },
  { metric: '安全性', chainlink: 95, pyth: 85, band: 80, api3: 78, fullMark: 100 },
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

function getRank(value: number, values: number[], ascending: boolean = false): number {
  const sorted = [...values].sort((a, b) => (ascending ? a - b : b - a));
  return sorted.indexOf(value) + 1;
}

// ============ 子组件 ============

// 对比矩阵表格
function ComparisonMatrix() {
  const metrics = [
    {
      key: 'nodeCount',
      label: '节点数量',
      format: (v: number) => formatNumber(v),
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
      format: (v: number) => `${v}ms`,
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
  ];

  const getMetricValue = (oracle: OracleMetrics, key: string): number | string => {
    return (oracle as unknown as Record<string, number | string>)[key];
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
      <div className="p-4 border-b border-slate-700/50">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <svg
            className="w-5 h-5 text-blue-400"
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
                    oracle.name === 'Chainlink' ? 'text-blue-400' : 'text-slate-400'
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
                    const isChainlink = oracle.name === 'Chainlink';
                    let rank: number | null = null;

                    if (!metric.isString) {
                      rank = getRank(value as number, values, metric.ascending);
                    }

                    return (
                      <td
                        key={oracle.name}
                        className={`px-4 py-3 text-center ${isChainlink ? 'bg-blue-500/5' : ''}`}
                      >
                        <div className="flex flex-col items-center">
                          <span
                            className={`text-sm ${isChainlink ? 'text-blue-300 font-semibold' : 'text-slate-300'}`}
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

// TVS 历史趋势图表
function TVSTrendChart() {
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

  const toggleSeries = (dataKey: string) => {
    const newHidden = new Set(hiddenSeries);
    if (newHidden.has(dataKey)) {
      newHidden.delete(dataKey);
    } else {
      newHidden.add(dataKey);
    }
    setHiddenSeries(newHidden);
  };

  const oracles = [
    { key: 'chainlink', name: 'Chainlink', color: '#3b82f6' },
    { key: 'pyth', name: 'Pyth Network', color: '#a855f7' },
    { key: 'band', name: 'Band Protocol', color: '#10b981' },
    { key: 'api3', name: 'API3', color: '#f97316' },
  ];

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
              d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
            />
          </svg>
          TVS 增长趋势 (12个月)
        </h3>
        <div className="flex items-center gap-2">
          {oracles.map((oracle) => (
            <button
              key={oracle.key}
              onClick={() => toggleSeries(oracle.key)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs transition-all ${
                hiddenSeries.has(oracle.key)
                  ? 'bg-slate-700/50 text-slate-500'
                  : 'bg-slate-700 text-slate-300'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: hiddenSeries.has(oracle.key) ? '#64748b' : oracle.color }}
              />
              {oracle.name}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={mockTVSHistory} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorChainlink" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorPyth" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorBand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorApi3" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" strokeOpacity={0.3} />
            <XAxis
              dataKey="month"
              stroke="#64748b"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={{ stroke: '#334155', strokeOpacity: 0.5 }}
              tickFormatter={(value) => {
                const [year, month] = value.split('-');
                return `${month}/${year.slice(2)}`;
              }}
            />
            <YAxis
              yAxisId="tvs"
              stroke="#64748b"
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={{ stroke: '#334155', strokeOpacity: 0.5 }}
              tickFormatter={(value) => `$${value}B`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload) return null;
                return (
                  <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl">
                    <p className="text-slate-300 text-xs mb-2 font-medium">{label}</p>
                    {payload.map((entry) => {
                      const dataKey = String(entry.dataKey || '');
                      const value = Number(entry.value || 0);
                      const color = String((entry as { color?: string }).color || '#64748b');
                      return (
                        <div
                          key={dataKey}
                          className="flex items-center justify-between gap-4 text-xs mb-1"
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: color }}
                            />
                            <span className="text-slate-400">
                              {dataKey === 'chainlink' && 'Chainlink'}
                              {dataKey === 'pyth' && 'Pyth Network'}
                              {dataKey === 'band' && 'Band Protocol'}
                              {dataKey === 'api3' && 'API3'}
                            </span>
                          </span>
                          <span className="text-white font-mono">${value}B</span>
                        </div>
                      );
                    })}
                  </div>
                );
              }}
            />
            {!hiddenSeries.has('chainlink') && (
              <Area
                type="monotone"
                dataKey="chainlink"
                yAxisId="tvs"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorChainlink)"
              />
            )}
            {!hiddenSeries.has('pyth') && (
              <Area
                type="monotone"
                dataKey="pyth"
                yAxisId="tvs"
                stroke="#a855f7"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorPyth)"
              />
            )}
            {!hiddenSeries.has('band') && (
              <Area
                type="monotone"
                dataKey="band"
                yAxisId="tvs"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorBand)"
              />
            )}
            {!hiddenSeries.has('api3') && (
              <Area
                type="monotone"
                dataKey="api3"
                yAxisId="tvs"
                stroke="#f97316"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorApi3)"
              />
            )}
          </AreaChart>
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

// 关键洞察卡片
function InsightCards() {
  const insights = [
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
      title: '增长最快',
      value: 'Pyth Network',
      description: '12个月 TVS 增长 115%，支持 50+ 链',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          />
        </svg>
      ),
      color: 'purple',
    },
    {
      title: '最低延迟',
      value: 'Pyth Network',
      description: '平均 300ms 延迟，亚秒级更新',
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
      color: 'emerald',
    },
    {
      title: '最去中心化',
      value: 'Chainlink',
      description: '1,250+ 个独立节点运营商',
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
      color: 'amber',
    },
  ];

  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
    purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
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
          <p className="text-slate-400 text-sm mt-1">Chainlink vs 主要预言机协议全方位分析</p>
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
        {/* TVS 趋势图 */}
        <TVSTrendChart />

        {/* 市场份额环形图 */}
        <MarketShareChart />
      </div>

      {/* 雷达图 */}
      <RadarComparisonChart />

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
              去中心化程度基于节点数量和分布；数据覆盖包括价格对、链上数据源等；延迟测试基于以太坊主网环境。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CompetitorComparisonPanel;
