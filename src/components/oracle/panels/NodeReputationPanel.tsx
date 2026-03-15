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
import { useI18n } from '@/lib/i18n/provider';
import { chartColors } from '@/lib/config/colors';

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

const SCORE_COLORS = {
  excellent: chartColors.semantic.success,
  good: chartColors.recharts.primary,
  fair: chartColors.semantic.warning,
  poor: chartColors.semantic.danger,
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
  const { t } = useI18n();

  const getScoreColor = (score: number) => {
    if (score >= 90) return SCORE_COLORS.excellent;
    if (score >= 80) return SCORE_COLORS.good;
    if (score >= 70) return SCORE_COLORS.fair;
    return SCORE_COLORS.poor;
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return t('nodeReputation.reputationScore.excellent');
    if (score >= 80) return t('nodeReputation.reputationScore.good');
    if (score >= 70) return t('nodeReputation.reputationScore.fair');
    return t('nodeReputation.reputationScore.poor');
  };

  const color = getScoreColor(score);
  const label = getScoreLabel(score);
  const circumference = 2 * Math.PI * 45;
  const strokeDasharray = `${(score / 100) * circumference} ${circumference}`;

  return (
    <div className="bg-white border border-gray-200  p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-gray-900 text-sm font-semibold">
            {t('nodeReputation.reputationScore.title')}
          </p>
          <p className="text-gray-500 text-xs mt-0.5">
            {t('nodeReputation.reputationScore.subtitle')}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center">
        <div className="relative w-32 h-32">
          <svg className="w-full h-full transform -rotate-90">
            <circle cx="64" cy="64" r="45" stroke={chartColors.recharts.grid} strokeWidth="10" fill="none" />
            <circle
              cx="64"
              cy="64"
              r="45"
              stroke={color}
              strokeWidth="10"
              fill="none"
              strokeDasharray={strokeDasharray}
              
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
          className="px-3 py-1  text-xs font-medium"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {label}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
        <div>
          <div
            className="w-3 h-3  mx-auto mb-1"
            style={{ backgroundColor: SCORE_COLORS.excellent }}
          ></div>
          <p className="text-xs text-gray-500">{t('nodeReputation.reputationScore.excellent')}</p>
          <p className="text-xs text-gray-400">90+</p>
        </div>
        <div>
          <div
            className="w-3 h-3  mx-auto mb-1"
            style={{ backgroundColor: SCORE_COLORS.good }}
          ></div>
          <p className="text-xs text-gray-500">{t('nodeReputation.reputationScore.good')}</p>
          <p className="text-xs text-gray-400">80-89</p>
        </div>
        <div>
          <div
            className="w-3 h-3  mx-auto mb-1"
            style={{ backgroundColor: SCORE_COLORS.fair }}
          ></div>
          <p className="text-xs text-gray-500">{t('nodeReputation.reputationScore.fair')}</p>
          <p className="text-xs text-gray-400">70-79</p>
        </div>
        <div>
          <div
            className="w-3 h-3  mx-auto mb-1"
            style={{ backgroundColor: SCORE_COLORS.poor }}
          ></div>
          <p className="text-xs text-gray-500">{t('nodeReputation.reputationScore.poor')}</p>
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
  const { t } = useI18n();

  const data = [
    { period: t('nodeReputation.accuracy.day'), accuracy: daily },
    { period: t('nodeReputation.accuracy.week'), accuracy: weekly },
    { period: t('nodeReputation.accuracy.month'), accuracy: monthly },
  ];

  return (
    <div className="bg-white border border-gray-200  p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-gray-900 text-sm font-semibold">
            {t('nodeReputation.accuracy.title')}
          </p>
          <p className="text-gray-500 text-xs mt-0.5">{t('nodeReputation.accuracy.subtitle')}</p>
        </div>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} />
            <XAxis type="number" domain={[95, 100]} tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="period" tick={{ fontSize: 12 }} width={40} />
            <Tooltip
              formatter={(value) => [
                `${Number(value).toFixed(2)}%`,
                t('nodeReputation.tooltip.accuracy'),
              ]}
              contentStyle={{
                backgroundColor: '#ffffff',
                border: `1px solid ${chartColors.recharts.grid}`,
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
            />
            <Bar dataKey="accuracy" fill={chartColors.recharts.primary} >
              {data.map((entry, index) => {
                const color =
                  entry.accuracy >= 99
                    ? SCORE_COLORS.excellent
                    : entry.accuracy >= 98
                      ? SCORE_COLORS.good
                      : entry.accuracy >= 97
                        ? SCORE_COLORS.fair
                        : SCORE_COLORS.poor;
                return <Cell key={`cell-${index}`} fill={color} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="text-center p-3 bg-gray-50 ">
          <p className="text-xs text-gray-500 mb-1">{t('nodeReputation.accuracy.daily')}</p>
          <p className="text-lg font-bold text-gray-900">{daily.toFixed(2)}%</p>
        </div>
        <div className="text-center p-3 bg-gray-50 ">
          <p className="text-xs text-gray-500 mb-1">{t('nodeReputation.accuracy.weekly')}</p>
          <p className="text-lg font-bold text-gray-900">{weekly.toFixed(2)}%</p>
        </div>
        <div className="text-center p-3 bg-gray-50 ">
          <p className="text-xs text-gray-500 mb-1">{t('nodeReputation.accuracy.monthly')}</p>
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
  const { t } = useI18n();

  return (
    <div className="bg-white border border-gray-200  p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-gray-900 text-sm font-semibold">
            {t('nodeReputation.responseTime.title')}
          </p>
          <p className="text-gray-500 text-xs mt-0.5">
            {t('nodeReputation.responseTime.subtitle')}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">
            {t('nodeReputation.responseTime.avgResponseTime')}
          </p>
          <p className="text-lg font-bold text-gray-900">{avgTime}ms</p>
        </div>
      </div>

      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} />
            <XAxis dataKey="range" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip
              formatter={(value) => [
                `${value} ${t('nodeReputation.tooltip.responseCount')}`,
                t('nodeReputation.tooltip.responseCount'),
              ]}
              contentStyle={{
                backgroundColor: '#ffffff',
                border: `1px solid ${chartColors.recharts.grid}`,
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
            />
            <Bar dataKey="count" fill={chartColors.recharts.primary} >
              {data.map((entry, index) => {
                if (entry.range === '0-50ms')
                  return <Cell key={`cell-${index}`} fill={SCORE_COLORS.excellent} />;
                if (entry.range === '50-100ms')
                  return <Cell key={`cell-${index}`} fill={SCORE_COLORS.good} />;
                if (entry.range === '100-150ms')
                  return <Cell key={`cell-${index}`} fill={SCORE_COLORS.fair} />;
                return <Cell key={`cell-${index}`} fill={SCORE_COLORS.poor} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div
              className="w-2 h-2 "
              style={{ backgroundColor: SCORE_COLORS.excellent }}
            ></div>
            <span>{t('nodeReputation.responseTime.excellent')}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 " style={{ backgroundColor: SCORE_COLORS.good }}></div>
            <span>{t('nodeReputation.responseTime.good')}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 " style={{ backgroundColor: SCORE_COLORS.fair }}></div>
            <span>{t('nodeReputation.responseTime.fair')}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 " style={{ backgroundColor: SCORE_COLORS.poor }}></div>
            <span>{t('nodeReputation.responseTime.slow')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function StakingInfo({ staked, earnings, apr }: { staked: number; earnings: number; apr: number }) {
  const { t } = useI18n();

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`;
    }
    return `$${value.toFixed(2)}`;
  };

  return (
    <div className="bg-white border border-gray-200  p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-gray-900 text-sm font-semibold">{t('nodeReputation.staking.title')}</p>
          <p className="text-gray-500 text-xs mt-0.5">{t('nodeReputation.staking.subtitle')}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="p-4 bg-gray-100 border border-gray-200 ">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">
                {t('nodeReputation.staking.stakedAmount')}
              </p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(staked)}</p>
            </div>
            <div className="p-3 bg-blue-500 ">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 ">
            <p className="text-xs text-gray-500 mb-1">
              {t('nodeReputation.staking.totalEarnings')}
            </p>
            <p className="text-lg font-bold text-gray-900">{formatCurrency(earnings)}</p>
            <p className="text-xs text-green-600 mt-1">
              ↑ 12.5% {t('nodeReputation.staking.vsLastMonth')}
            </p>
          </div>
          <div className="p-4 bg-gray-50 ">
            <p className="text-xs text-gray-500 mb-1">{t('nodeReputation.staking.apr')}</p>
            <p className="text-lg font-bold text-gray-900">{apr.toFixed(2)}%</p>
            <p className="text-xs text-gray-400 mt-1">APR</p>
          </div>
        </div>

        <div className="p-4 border border-gray-200 ">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500">{t('nodeReputation.staking.earningsTrend')}</p>
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
                  stroke={chartColors.semantic.success}
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
  const { t } = useI18n();

  const NODE_TYPE_LABELS: Record<NodeType, string> = {
    data_provider: t('nodeReputation.nodeTypes.dataProvider'),
    validator: t('nodeReputation.nodeTypes.validator'),
    aggregator: t('nodeReputation.nodeTypes.aggregator'),
  };

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

  const NODE_TYPE_COLORS_MAP = [chartColors.recharts.primary, chartColors.semantic.success, chartColors.recharts.purple];

  return (
    <div className="bg-white border border-gray-200  p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-gray-900 text-sm font-semibold">
            {t('nodeReputation.nodeTypes.title')}
          </p>
          <p className="text-gray-500 text-xs mt-0.5">{t('nodeReputation.nodeTypes.subtitle')}</p>
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
                <Cell key={`cell-${index}`} fill={NODE_TYPE_COLORS_MAP[index]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [
                `${value} ${t('nodeReputation.tooltip.nodeCount')}`,
                t('nodeReputation.tooltip.nodeCount'),
              ]}
              contentStyle={{
                backgroundColor: '#ffffff',
                border: `1px solid ${chartColors.recharts.grid}`,
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
          <div key={item.type} className="text-center p-2 bg-gray-50 ">
            <div
              className="w-3 h-3  mx-auto mb-1"
              style={{ backgroundColor: NODE_TYPE_COLORS_MAP[index] }}
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
  const { t } = useI18n();

  const NODE_TYPE_LABELS: Record<NodeType, string> = {
    data_provider: t('nodeReputation.nodeTypes.dataProvider'),
    validator: t('nodeReputation.nodeTypes.validator'),
    aggregator: t('nodeReputation.nodeTypes.aggregator'),
  };

  const topNodes = nodes.slice(0, 10);

  return (
    <div className="bg-white border border-gray-200  p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-gray-900 text-sm font-semibold">{t('nodeReputation.ranking.title')}</p>
          <p className="text-gray-500 text-xs mt-0.5">{t('nodeReputation.ranking.subtitle')}</p>
        </div>
      </div>

      <div className="space-y-2">
        {topNodes.map((node, index) => (
          <div
            key={node.id}
            className="flex items-center justify-between p-3 bg-gray-50  hover:bg-gray-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8  flex items-center justify-center font-bold text-sm ${
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
                  <span className="text-xs text-gray-400">
                    {node.uptime.toFixed(2)}% {t('nodeReputation.ranking.online')}
                  </span>
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
  const { t } = useI18n();
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
          <div className="animate-spin  h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">{t('nodeReputation.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{t('nodeReputation.title')}</h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('nodeReputation.lastUpdated')}: {lastUpdated.toLocaleTimeString('zh-CN')}
          </p>
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-blue-600 text-white  hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          {t('nodeReputation.refresh')}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200  p-4">
            <p className="text-sm font-semibold text-gray-900 mb-3">
              {t('nodeReputation.selectNode')}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {nodes.slice(0, 10).map((node) => (
                <button
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className={`p-3  border-2 transition-all ${
                    selectedNode.id === node.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-center">
                    <p className="text-xs font-medium text-gray-900 truncate">{node.name}</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">{node.reputationScore}</p>
                    <p className="text-xs text-gray-500">
                      {t('nodeReputation.ranking.rankLabel')}
                      {node.rank}
                    </p>
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
