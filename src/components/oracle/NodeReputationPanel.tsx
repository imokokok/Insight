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
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

type NodeType = 'data_provider' | 'validator' | 'aggregator';

interface NodeReputationData {
  id: string;
  name: string;
  type: NodeType;
  reputationScore: number;
  accuracyDaily: number;
  accuracyWeekly: number;
  accuracyMonthly: number;
  responseTimeData: { range: string; count: number }[];
  avgResponseTime: number;
  stakedAmount: number;
  earnings: number;
  apr: number;
  uptime: number;
  rank: number;
}

interface NodeReputationPanelProps {
  autoUpdate?: boolean;
  updateInterval?: number;
}

const COLORS = {
  excellent: '#10B981',
  good: '#3B82F6',
  fair: '#F59E0B',
  poor: '#EF4444',
};

const NODE_TYPE_LABELS: Record<NodeType, string> = {
  data_provider: '数据提供商',
  validator: '验证节点',
  aggregator: '聚合节点',
};

const NODE_TYPE_COLORS: Record<NodeType, string> = {
  data_provider: 'bg-blue-100 text-blue-700',
  validator: 'bg-green-100 text-green-700',
  aggregator: 'bg-purple-100 text-purple-700',
};

function generateMockNodes(): NodeReputationData[] {
  const nodeNames = [
    'AlphaNode',
    'BetaValidator',
    'GammaProvider',
    'DeltaAggregator',
    'EpsilonNode',
    'ZetaValidator',
    'EtaProvider',
    'ThetaAggregator',
    'IotaNode',
    'KappaValidator',
  ];

  const nodeTypes: NodeType[] = ['data_provider', 'validator', 'aggregator'];

  return nodeNames
    .map((name, index) => {
      const type = nodeTypes[index % 3];
      const reputationScore = Math.floor(Math.random() * 30) + 70;
      const avgResponseTime = Math.floor(Math.random() * 200) + 50;

      const responseTimeData = [
        { range: '0-50ms', count: Math.floor(Math.random() * 100) + 50 },
        { range: '50-100ms', count: Math.floor(Math.random() * 150) + 100 },
        { range: '100-150ms', count: Math.floor(Math.random() * 120) + 80 },
        { range: '150-200ms', count: Math.floor(Math.random() * 80) + 40 },
        { range: '200ms+', count: Math.floor(Math.random() * 50) + 20 },
      ];

      return {
        id: `node-${index}`,
        name,
        type,
        reputationScore,
        accuracyDaily: Math.min(99.9, reputationScore + Math.random() * 5),
        accuracyWeekly: Math.min(99.5, reputationScore - Math.random() * 2),
        accuracyMonthly: Math.min(99, reputationScore - Math.random() * 5),
        responseTimeData,
        avgResponseTime,
        stakedAmount: Math.floor(Math.random() * 500000) + 50000,
        earnings: Math.floor(Math.random() * 50000) + 5000,
        apr: Math.random() * 10 + 5,
        uptime: Math.min(99.99, 95 + Math.random() * 5),
        rank: index + 1,
      };
    })
    .sort((a, b) => b.reputationScore - a.reputationScore)
    .map((node, index) => ({
      ...node,
      rank: index + 1,
    }));
}

function ReputationScoreGauge({ score }: { score: number }) {
  const getScoreColor = (score: number) => {
    if (score >= 90) return COLORS.excellent;
    if (score >= 80) return COLORS.good;
    if (score >= 70) return COLORS.fair;
    return COLORS.poor;
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return '优秀';
    if (score >= 80) return '良好';
    if (score >= 70) return '一般';
    return '较差';
  };

  const color = getScoreColor(score);
  const label = getScoreLabel(score);
  const circumference = 2 * Math.PI * 45;
  const strokeDasharray = `${(score / 100) * circumference} ${circumference}`;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-gray-900 text-sm font-semibold">节点声誉评分</p>
          <p className="text-gray-500 text-xs mt-0.5">综合性能评估</p>
        </div>
      </div>

      <div className="flex items-center justify-center">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="64" cy="64" r="45" stroke="#E5E7EB" strokeWidth="10" fill="none" />
            <circle
              cx="64"
              cy="64"
              r="45"
              stroke={color}
              strokeWidth="10"
              fill="none"
              strokeDasharray={strokeDasharray}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-gray-900">{score}</span>
            <span className="text-xs text-gray-500">/ 100</span>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2">
        <span
          className="px-3 py-1 rounded-full text-xs font-medium"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {label}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
        <div>
          <div
            className="w-3 h-3 rounded-full mx-auto mb-1"
            style={{ backgroundColor: COLORS.excellent }}
          ></div>
          <p className="text-xs text-gray-500">优秀</p>
          <p className="text-xs text-gray-400">90+</p>
        </div>
        <div>
          <div
            className="w-3 h-3 rounded-full mx-auto mb-1"
            style={{ backgroundColor: COLORS.good }}
          ></div>
          <p className="text-xs text-gray-500">良好</p>
          <p className="text-xs text-gray-400">80-89</p>
        </div>
        <div>
          <div
            className="w-3 h-3 rounded-full mx-auto mb-1"
            style={{ backgroundColor: COLORS.fair }}
          ></div>
          <p className="text-xs text-gray-500">一般</p>
          <p className="text-xs text-gray-400">70-79</p>
        </div>
        <div>
          <div
            className="w-3 h-3 rounded-full mx-auto mb-1"
            style={{ backgroundColor: COLORS.poor }}
          ></div>
          <p className="text-xs text-gray-500">较差</p>
          <p className="text-xs text-gray-400">&lt;70</p>
        </div>
      </div>
    </div>
  );
}

function AccuracyStats({
  daily,
  weekly,
  monthly,
}: {
  daily: number;
  weekly: number;
  monthly: number;
}) {
  const data = [
    { period: '日', accuracy: daily },
    { period: '周', accuracy: weekly },
    { period: '月', accuracy: monthly },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-gray-900 text-sm font-semibold">历史准确率统计</p>
          <p className="text-gray-500 text-xs mt-0.5">不同时间维度的准确率</p>
        </div>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis type="number" domain={[95, 100]} tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="period" tick={{ fontSize: 12 }} width={40} />
            <Tooltip
              formatter={(value) => [`${Number(value).toFixed(2)}%`, '准确率']}
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
            />
            <Bar dataKey="accuracy" fill="#3B82F6" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => {
                const color =
                  entry.accuracy >= 99
                    ? COLORS.excellent
                    : entry.accuracy >= 98
                      ? COLORS.good
                      : entry.accuracy >= 97
                        ? COLORS.fair
                        : COLORS.poor;
                return <Cell key={`cell-${index}`} fill={color} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">日准确率</p>
          <p className="text-lg font-bold text-gray-900">{daily.toFixed(2)}%</p>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">周准确率</p>
          <p className="text-lg font-bold text-gray-900">{weekly.toFixed(2)}%</p>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">月准确率</p>
          <p className="text-lg font-bold text-gray-900">{monthly.toFixed(2)}%</p>
        </div>
      </div>
    </div>
  );
}

function ResponseTimeDistribution({
  data,
  avgTime,
}: {
  data: { range: string; count: number }[];
  avgTime: number;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-gray-900 text-sm font-semibold">响应时间分布</p>
          <p className="text-gray-500 text-xs mt-0.5">节点响应时间统计</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">平均响应时间</p>
          <p className="text-lg font-bold text-gray-900">{avgTime}ms</p>
        </div>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="range" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value) => [`${value} 次`, '响应次数']}
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
            />
            <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => {
                if (entry.range === '0-50ms')
                  return <Cell key={`cell-${index}`} fill={COLORS.excellent} />;
                if (entry.range === '50-100ms')
                  return <Cell key={`cell-${index}`} fill={COLORS.good} />;
                if (entry.range === '100-150ms')
                  return <Cell key={`cell-${index}`} fill={COLORS.fair} />;
                return <Cell key={`cell-${index}`} fill={COLORS.poor} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: COLORS.excellent }}
            ></div>
            <span>优秀 (&lt;50ms)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.good }}></div>
            <span>良好 (50-100ms)</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.fair }}></div>
            <span>一般 (100-150ms)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.poor }}></div>
            <span>较慢 (&gt;150ms)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StakingInfo({ staked, earnings, apr }: { staked: number; earnings: number; apr: number }) {
  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-gray-900 text-sm font-semibold">质押与收益</p>
          <p className="text-gray-500 text-xs mt-0.5">节点经济数据</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">质押量</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(staked)}</p>
            </div>
            <div className="p-3 bg-blue-500 rounded-lg">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">累计收益</p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(earnings)}</p>
            <p className="text-xs text-green-600 mt-1">↑ 12.5% 较上月</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500 mb-1">年化收益率</p>
            <p className="text-lg font-bold text-gray-900">{apr.toFixed(2)}%</p>
            <p className="text-xs text-gray-400 mt-1">APR</p>
          </div>
        </div>

        <div className="p-4 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500">收益趋势（30天）</p>
            <p className="text-xs text-green-600 font-medium">+{(earnings * 0.125).toFixed(0)}</p>
          </div>
          <div className="h-16">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={Array.from({ length: 30 }, (_, i) => ({
                  day: i,
                  value: earnings * (0.9 + (i / 30) * 0.125),
                }))}
              >
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

function NodeTypeDistribution({ nodes }: { nodes: NodeReputationData[] }) {
  const typeCounts = nodes.reduce(
    (acc, node) => {
      acc[node.type] = (acc[node.type] || 0) + 1;
      return acc;
    },
    {} as Record<NodeType, number>
  );

  const data = Object.entries(typeCounts).map(([type, count]) => ({
    name: NODE_TYPE_LABELS[type as NodeType],
    value: count,
    type,
  }));

  const COLORS_MAP = ['#3B82F6', '#10B981', '#8B5CF6'];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-gray-900 text-sm font-semibold">节点类型分布</p>
          <p className="text-gray-500 text-xs mt-0.5">按功能分类统计</p>
        </div>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={70}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS_MAP[index]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [`${value} 个节点`, '数量']}
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value: string) => <span className="text-xs text-gray-600">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {data.map((item, index) => (
          <div key={item.type} className="text-center p-2 bg-gray-50 rounded-lg">
            <div
              className="w-3 h-3 rounded-full mx-auto mb-1"
              style={{ backgroundColor: COLORS_MAP[index] }}
            ></div>
            <p className="text-xs text-gray-500">{item.name}</p>
            <p className="text-sm font-bold text-gray-900">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function NodeRankingList({ nodes }: { nodes: NodeReputationData[] }) {
  const topNodes = nodes.slice(0, 10);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-gray-900 text-sm font-semibold">节点排名 (Top 10)</p>
          <p className="text-gray-500 text-xs mt-0.5">按声誉评分排序</p>
        </div>
      </div>

      <div className="space-y-2">
        {topNodes.map((node, index) => (
          <div
            key={node.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                  index === 0
                    ? 'bg-yellow-400 text-white'
                    : index === 1
                      ? 'bg-gray-300 text-white'
                      : index === 2
                        ? 'bg-orange-400 text-white'
                        : 'bg-gray-200 text-gray-600'
                }`}
              >
                {node.rank}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{node.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs px-2 py-0.5 rounded ${NODE_TYPE_COLORS[node.type]}`}>
                    {NODE_TYPE_LABELS[node.type]}
                  </span>
                  <span className="text-xs text-gray-400">{node.uptime.toFixed(2)}% 在线</span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-gray-900">{node.reputationScore}</p>
              <p className="text-xs text-gray-500">{node.avgResponseTime}ms</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function NodeReputationPanel({
  autoUpdate = true,
  updateInterval = 30000,
}: NodeReputationPanelProps) {
  const [nodes, setNodes] = useState<NodeReputationData[]>([]);
  const [selectedNode, setSelectedNode] = useState<NodeReputationData | null>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadData = useCallback(() => {
    const mockNodes = generateMockNodes();
    setNodes(mockNodes);
    if (!selectedNode) {
      setSelectedNode(mockNodes[0]);
    } else {
      const updatedNode = mockNodes.find((n) => n.id === selectedNode.id);
      if (updatedNode) {
        setSelectedNode(updatedNode);
      }
    }
    setLastUpdated(new Date());
  }, [selectedNode]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (autoUpdate) {
      intervalRef.current = setInterval(loadData, updateInterval);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [autoUpdate, updateInterval, loadData]);

  if (!selectedNode || nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">加载节点数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">节点声誉面板</h2>
          <p className="text-sm text-gray-500 mt-1">
            最后更新: {lastUpdated.toLocaleTimeString('zh-CN')}
          </p>
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          刷新数据
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-gray-900 mb-3">选择节点查看详情</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {nodes.slice(0, 10).map((node) => (
                <button
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    selectedNode.id === node.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-center">
                    <p className="text-xs font-medium text-gray-900 truncate">{node.name}</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">{node.reputationScore}</p>
                    <p className="text-xs text-gray-500">排名 #{node.rank}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <ReputationScoreGauge score={selectedNode.reputationScore} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AccuracyStats
          daily={selectedNode.accuracyDaily}
          weekly={selectedNode.accuracyWeekly}
          monthly={selectedNode.accuracyMonthly}
        />
        <ResponseTimeDistribution
          data={selectedNode.responseTimeData}
          avgTime={selectedNode.avgResponseTime}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <StakingInfo
          staked={selectedNode.stakedAmount}
          earnings={selectedNode.earnings}
          apr={selectedNode.apr}
        />
        <NodeTypeDistribution nodes={nodes} />
        <NodeRankingList nodes={nodes} />
      </div>
    </div>
  );
}

export type { NodeReputationData, NodeType };
