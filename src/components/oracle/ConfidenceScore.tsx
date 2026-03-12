'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  LineChart,
  Line,
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
} from 'recharts';
import { useI18n } from '@/lib/i18n/context';

type ConfidenceLevel = 'excellent' | 'good' | 'fair' | 'poor';

interface DimensionScore {
  name: string;
  score: number;
  weight: number;
  description: string;
  details: {
    value: number;
    unit: string;
    benchmark: number;
  };
}

interface ConfidenceData {
  overallScore: number;
  level: ConfidenceLevel;
  dimensions: DimensionScore[];
  trend: TrendDataPoint[];
  lastUpdated: Date;
  suggestions: string[];
}

interface TrendDataPoint {
  timestamp: Date;
  score: number;
  nodeScore: number;
  consensusScore: number;
  diversityScore: number;
  freshnessScore: number;
  accuracyScore: number;
}

const LEVEL_CONFIG = {
  excellent: {
    color: 'text-green-600',
    bgColor: 'bg-green-500',
    lightBg: 'bg-green-50',
    borderColor: 'border-green-200',
    label: '优秀',
    labelEn: 'Excellent',
    range: [90, 100],
  },
  good: {
    color: 'text-blue-600',
    bgColor: 'bg-blue-500',
    lightBg: 'bg-blue-50',
    borderColor: 'border-blue-200',
    label: '良好',
    labelEn: 'Good',
    range: [70, 90],
  },
  fair: {
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-500',
    lightBg: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    label: '一般',
    labelEn: 'Fair',
    range: [50, 70],
  },
  poor: {
    color: 'text-red-600',
    bgColor: 'bg-red-500',
    lightBg: 'bg-red-50',
    borderColor: 'border-red-200',
    label: '较差',
    labelEn: 'Poor',
    range: [0, 50],
  },
};

function getLevelFromScore(score: number): ConfidenceLevel {
  if (score >= 90) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'fair';
  return 'poor';
}

function calculateNodeScore(activeNodes: number, totalNodes: number): number {
  const ratio = activeNodes / totalNodes;
  const baseScore = ratio * 100;
  const nodeBonus = Math.min(activeNodes / 100, 10);
  return Math.min(100, baseScore + nodeBonus);
}

function calculateConsensusScore(consensusRate: number): number {
  return consensusRate;
}

function calculateDiversityScore(sourceTypes: number, sourceCount: number): number {
  const typeScore = Math.min(sourceTypes * 15, 60);
  const countScore = Math.min(sourceCount * 2, 40);
  return typeScore + countScore;
}

function calculateFreshnessScore(avgUpdateInterval: number): number {
  if (avgUpdateInterval <= 10) return 100;
  if (avgUpdateInterval <= 30) return 90;
  if (avgUpdateInterval <= 60) return 80;
  if (avgUpdateInterval <= 120) return 70;
  if (avgUpdateInterval <= 300) return 60;
  return Math.max(30, 100 - avgUpdateInterval / 10);
}

function calculateAccuracyScore(historicalAccuracy: number): number {
  return historicalAccuracy;
}

function generateMockData(): ConfidenceData {
  const activeNodes = Math.floor(80 + Math.random() * 20);
  const totalNodes = 100;
  const consensusRate = 85 + Math.random() * 15;
  const sourceTypes = Math.floor(3 + Math.random() * 3);
  const sourceCount = Math.floor(8 + Math.random() * 7);
  const avgUpdateInterval = Math.floor(15 + Math.random() * 45);
  const historicalAccuracy = 92 + Math.random() * 8;

  const nodeScore = calculateNodeScore(activeNodes, totalNodes);
  const consensusScore = calculateConsensusScore(consensusRate);
  const diversityScore = calculateDiversityScore(sourceTypes, sourceCount);
  const freshnessScore = calculateFreshnessScore(avgUpdateInterval);
  const accuracyScore = calculateAccuracyScore(historicalAccuracy);

  const dimensions: DimensionScore[] = [
    {
      name: '节点数量',
      score: nodeScore,
      weight: 0.2,
      description: '基于活跃节点数量和占比',
      details: {
        value: activeNodes,
        unit: '个',
        benchmark: 80,
      },
    },
    {
      name: '共识度',
      score: consensusScore,
      weight: 0.25,
      description: '节点间数据一致性程度',
      details: {
        value: consensusRate,
        unit: '%',
        benchmark: 90,
      },
    },
    {
      name: '数据源多样性',
      score: diversityScore,
      weight: 0.2,
      description: '数据源类型和数量',
      details: {
        value: sourceCount,
        unit: '个',
        benchmark: 10,
      },
    },
    {
      name: '数据新鲜度',
      score: freshnessScore,
      weight: 0.15,
      description: '数据更新频率',
      details: {
        value: avgUpdateInterval,
        unit: '秒',
        benchmark: 30,
      },
    },
    {
      name: '历史准确率',
      score: accuracyScore,
      weight: 0.2,
      description: '历史数据准确性',
      details: {
        value: historicalAccuracy,
        unit: '%',
        benchmark: 95,
      },
    },
  ];

  const overallScore =
    nodeScore * 0.2 +
    consensusScore * 0.25 +
    diversityScore * 0.2 +
    freshnessScore * 0.15 +
    accuracyScore * 0.2;

  const trend: TrendDataPoint[] = [];
  const now = new Date();
  for (let i = 23; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
    const variation = (Math.random() - 0.5) * 10;
    trend.push({
      timestamp,
      score: Math.max(0, Math.min(100, overallScore + variation)),
      nodeScore: Math.max(0, Math.min(100, nodeScore + (Math.random() - 0.5) * 8)),
      consensusScore: Math.max(0, Math.min(100, consensusScore + (Math.random() - 0.5) * 6)),
      diversityScore: Math.max(0, Math.min(100, diversityScore + (Math.random() - 0.5) * 5)),
      freshnessScore: Math.max(0, Math.min(100, freshnessScore + (Math.random() - 0.5) * 7)),
      accuracyScore: Math.max(0, Math.min(100, accuracyScore + (Math.random() - 0.5) * 4)),
    });
  }

  const suggestions: string[] = [];
  if (nodeScore < 80) {
    suggestions.push('建议增加更多活跃节点以提高去中心化程度');
  }
  if (consensusScore < 90) {
    suggestions.push('节点共识度较低，建议检查数据源质量');
  }
  if (diversityScore < 70) {
    suggestions.push('建议增加更多类型的数据源以提高多样性');
  }
  if (freshnessScore < 80) {
    suggestions.push('数据更新频率较低，建议优化数据获取流程');
  }
  if (accuracyScore < 95) {
    suggestions.push('历史准确率有待提升，建议加强数据验证机制');
  }
  if (suggestions.length === 0) {
    suggestions.push('当前数据质量优秀，建议保持现有配置');
  }

  return {
    overallScore: Math.round(overallScore * 10) / 10,
    level: getLevelFromScore(overallScore),
    dimensions,
    trend,
    lastUpdated: new Date(),
    suggestions,
  };
}

function OverallScoreGauge({ score, level }: { score: number; level: ConfidenceLevel }) {
  const { locale } = useI18n();
  const levelConfig = LEVEL_CONFIG[level];

  const getStrokeColor = () => {
    switch (level) {
      case 'excellent':
        return '#10b981';
      case 'good':
        return '#3b82f6';
      case 'fair':
        return '#f59e0b';
      case 'poor':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            {locale === 'zh-CN' ? '综合置信度评分' : 'Overall Confidence Score'}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {locale === 'zh-CN'
              ? '基于多维度数据质量评估'
              : 'Multi-dimensional data quality assessment'}
          </p>
        </div>
        <div className={`p-2 rounded-lg ${levelConfig.lightBg}`}>
          <svg
            className={`w-5 h-5 ${levelConfig.color}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        </div>
      </div>

      <div className="flex items-center justify-center mb-6">
        <div className="relative">
          <svg className="w-40 h-40 transform -rotate-90">
            <circle cx="80" cy="80" r="70" stroke="#e5e7eb" strokeWidth="10" fill="none" />
            <circle
              cx="80"
              cy="80"
              r="70"
              stroke={getStrokeColor()}
              strokeWidth="10"
              fill="none"
              strokeDasharray={`${score * 4.4} 440`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className={`text-4xl font-bold ${levelConfig.color}`}>{score}</p>
              <p className="text-xs text-gray-500 mt-1">{locale === 'zh-CN' ? '总分' : 'Score'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center">
        <span
          className={`px-4 py-2 text-sm font-medium rounded-full ${levelConfig.lightBg} ${levelConfig.color}`}
        >
          {locale === 'zh-CN' ? levelConfig.label : levelConfig.labelEn}
        </span>
      </div>
    </div>
  );
}

function DimensionRadarChart({ dimensions }: { dimensions: DimensionScore[] }) {
  const { locale } = useI18n();

  const radarData = dimensions.map((dim) => ({
    name: dim.name,
    score: dim.score,
    fullMark: 100,
  }));

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900">
          {locale === 'zh-CN' ? '维度评分雷达图' : 'Dimension Score Radar'}
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          {locale === 'zh-CN'
            ? '各维度评分可视化展示'
            : 'Visual representation of dimension scores'}
        </p>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={radarData}>
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
          <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} />
          <Radar
            name={locale === 'zh-CN' ? '评分' : 'Score'}
            dataKey="score"
            stroke="#3b82f6"
            fill="#3b82f6"
            fillOpacity={0.3}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function DimensionDetails({ dimensions }: { dimensions: DimensionScore[] }) {
  const { locale } = useI18n();

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#10b981';
    if (score >= 70) return '#3b82f6';
    if (score >= 50) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900">
          {locale === 'zh-CN' ? '各维度评分详情' : 'Dimension Score Details'}
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          {locale === 'zh-CN'
            ? '详细评分数据与基准对比'
            : 'Detailed scores with benchmark comparison'}
        </p>
      </div>

      <div className="space-y-4">
        {dimensions.map((dim, index) => (
          <div key={index} className="border border-gray-100 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 text-sm">{dim.name}</span>
                <span className="text-xs text-gray-400">
                  权重: {(dim.weight * 100).toFixed(0)}%
                </span>
              </div>
              <span className="text-lg font-bold" style={{ color: getScoreColor(dim.score) }}>
                {dim.score.toFixed(1)}
              </span>
            </div>

            <p className="text-xs text-gray-500 mb-3">{dim.description}</p>

            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${dim.score}%`,
                    backgroundColor: getScoreColor(dim.score),
                  }}
                />
              </div>
              <div className="relative w-2 h-2">
                <div
                  className="absolute w-0.5 h-3 bg-gray-400 -top-0.5"
                  style={{ left: '50%', transform: 'translateX(-50%)' }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>
                {locale === 'zh-CN' ? '当前值' : 'Current'}: {dim.details.value.toFixed(1)}{' '}
                {dim.details.unit}
              </span>
              <span>
                {locale === 'zh-CN' ? '基准' : 'Benchmark'}: {dim.details.benchmark}{' '}
                {dim.details.unit}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendChart({ trend }: { trend: TrendDataPoint[] }) {
  const { locale } = useI18n();

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            {locale === 'zh-CN' ? '置信度历史趋势' : 'Confidence Score Trend'}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {locale === 'zh-CN' ? '过去24小时评分变化' : 'Score changes over the last 24 hours'}
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="timestamp"
            stroke="#9ca3af"
            tick={{ fontSize: 10, fill: '#6b7280' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
            tickFormatter={formatTime}
          />
          <YAxis
            stroke="#9ca3af"
            tick={{ fontSize: 10, fill: '#6b7280' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
            domain={[0, 100]}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const data = payload[0].payload as TrendDataPoint;
              return (
                <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-xl">
                  <p className="text-xs text-gray-600 font-medium mb-2">
                    {data.timestamp.toLocaleString('zh-CN')}
                  </p>
                  <div className="space-y-1">
                    <div className="flex justify-between gap-4 text-xs">
                      <span className="text-gray-500">
                        {locale === 'zh-CN' ? '综合评分' : 'Overall'}:
                      </span>
                      <span className="text-gray-900 font-semibold">{data.score.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between gap-4 text-xs">
                      <span className="text-gray-500">
                        {locale === 'zh-CN' ? '节点数量' : 'Nodes'}:
                      </span>
                      <span className="text-gray-900">{data.nodeScore.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between gap-4 text-xs">
                      <span className="text-gray-500">
                        {locale === 'zh-CN' ? '共识度' : 'Consensus'}:
                      </span>
                      <span className="text-gray-900">{data.consensusScore.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between gap-4 text-xs">
                      <span className="text-gray-500">
                        {locale === 'zh-CN' ? '多样性' : 'Diversity'}:
                      </span>
                      <span className="text-gray-900">{data.diversityScore.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between gap-4 text-xs">
                      <span className="text-gray-500">
                        {locale === 'zh-CN' ? '新鲜度' : 'Freshness'}:
                      </span>
                      <span className="text-gray-900">{data.freshnessScore.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between gap-4 text-xs">
                      <span className="text-gray-500">
                        {locale === 'zh-CN' ? '准确率' : 'Accuracy'}:
                      </span>
                      <span className="text-gray-900">{data.accuracyScore.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            name={locale === 'zh-CN' ? '综合评分' : 'Overall Score'}
          />
          <Line
            type="monotone"
            dataKey="consensusScore"
            stroke="#8b5cf6"
            strokeWidth={1.5}
            dot={false}
            strokeDasharray="5 5"
            name={locale === 'zh-CN' ? '共识度' : 'Consensus'}
          />
          <Line
            type="monotone"
            dataKey="accuracyScore"
            stroke="#10b981"
            strokeWidth={1.5}
            dot={false}
            strokeDasharray="5 5"
            name={locale === 'zh-CN' ? '准确率' : 'Accuracy'}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <span className="w-3 h-0.5 bg-blue-500" />
          <span className="text-xs text-gray-500">
            {locale === 'zh-CN' ? '综合评分' : 'Overall'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-0.5 bg-purple-500" style={{ borderStyle: 'dashed' }} />
          <span className="text-xs text-gray-500">
            {locale === 'zh-CN' ? '共识度' : 'Consensus'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-0.5 bg-green-500" style={{ borderStyle: 'dashed' }} />
          <span className="text-xs text-gray-500">
            {locale === 'zh-CN' ? '准确率' : 'Accuracy'}
          </span>
        </div>
      </div>
    </div>
  );
}

function SuggestionsCard({ suggestions }: { suggestions: string[] }) {
  const { locale } = useI18n();

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            {locale === 'zh-CN' ? '改进建议' : 'Improvement Suggestions'}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {locale === 'zh-CN'
              ? '基于当前评分的优化建议'
              : 'Optimization suggestions based on current scores'}
          </p>
        </div>
        <div className="p-2 bg-blue-50 rounded-lg">
          <svg
            className="w-5 h-5 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
        </div>
      </div>

      <div className="space-y-3">
        {suggestions.map((suggestion, index) => (
          <div
            key={index}
            className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-xs font-semibold text-blue-600">{index + 1}</span>
            </div>
            <p className="text-sm text-gray-700 flex-1">{suggestion}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ConfidenceScoreProps {
  autoUpdate?: boolean;
  updateInterval?: number;
}

export function ConfidenceScore({
  autoUpdate = true,
  updateInterval = 30000,
}: ConfidenceScoreProps) {
  const { locale } = useI18n();
  const [data, setData] = useState<ConfidenceData | null>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateData = useCallback(() => {
    const newData = generateMockData();
    setData(newData);
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    updateData();

    if (autoUpdate) {
      intervalRef.current = setInterval(updateData, updateInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [updateData, autoUpdate, updateInterval]);

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">
          {locale === 'zh-CN' ? '加载数据中...' : 'Loading data...'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {locale === 'zh-CN' ? '数据置信度评分' : 'Data Confidence Score'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {locale === 'zh-CN'
              ? '综合评估数据质量和可靠性'
              : 'Comprehensive assessment of data quality and reliability'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            {locale === 'zh-CN' ? '最后更新' : 'Last updated'}:{' '}
            {lastUpdated.toLocaleTimeString('zh-CN')}
          </span>
          <button
            onClick={updateData}
            className="px-3 py-1.5 bg-blue-50 text-blue-600 text-sm font-medium rounded-lg hover:bg-blue-100 transition-colors"
          >
            {locale === 'zh-CN' ? '刷新数据' : 'Refresh'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <OverallScoreGauge score={data.overallScore} level={data.level} />
        <div className="lg:col-span-2">
          <DimensionRadarChart dimensions={data.dimensions} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DimensionDetails dimensions={data.dimensions} />
        <SuggestionsCard suggestions={data.suggestions} />
      </div>

      <TrendChart trend={data.trend} />
    </div>
  );
}

export type {
  ConfidenceScoreProps,
  ConfidenceData,
  DimensionScore,
  TrendDataPoint,
  ConfidenceLevel,
};
