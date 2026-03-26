'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import { useTranslations, useLocale } from '@/i18n';
import { isChineseLocale } from '@/i18n/routing';
import { chartColors, semanticColors } from '@/lib/config/colors';


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
    color: 'text-success-600',
    bgColor: 'bg-success-500',
    lightBg: 'bg-success-50',
    borderColor: 'border-green-200',
    range: [90, 100],
  },
  good: {
    color: 'text-primary-600',
    bgColor: 'bg-primary-500',
    lightBg: 'bg-primary-50',
    borderColor: 'border-primary-200',
    range: [70, 90],
  },
  fair: {
    color: 'text-warning-600',
    bgColor: 'bg-warning-500',
    lightBg: 'bg-warning-50',
    borderColor: 'border-yellow-200',
    range: [50, 70],
  },
  poor: {
    color: 'text-danger-600',
    bgColor: 'bg-danger-500',
    lightBg: 'bg-danger-50',
    borderColor: 'border-danger-200',
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

function generateMockData(t: (key: string) => string): ConfidenceData {
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
      name: t('confidenceScore.dimensions.nodeCount'),
      score: nodeScore,
      weight: 0.2,
      description: t('confidenceScore.dimensions.nodeCountDesc'),
      details: {
        value: activeNodes,
        unit: t('confidenceScore.units.count'),
        benchmark: 80,
      },
    },
    {
      name: t('confidenceScore.dimensions.consensus'),
      score: consensusScore,
      weight: 0.25,
      description: t('confidenceScore.dimensions.consensusDesc'),
      details: {
        value: consensusRate,
        unit: t('confidenceScore.units.percent'),
        benchmark: 90,
      },
    },
    {
      name: t('confidenceScore.dimensions.diversity'),
      score: diversityScore,
      weight: 0.2,
      description: t('confidenceScore.dimensions.diversityDesc'),
      details: {
        value: sourceCount,
        unit: t('confidenceScore.units.count'),
        benchmark: 10,
      },
    },
    {
      name: t('confidenceScore.dimensions.freshness'),
      score: freshnessScore,
      weight: 0.15,
      description: t('confidenceScore.dimensions.freshnessDesc'),
      details: {
        value: avgUpdateInterval,
        unit: t('confidenceScore.units.seconds'),
        benchmark: 30,
      },
    },
    {
      name: t('confidenceScore.dimensions.accuracy'),
      score: accuracyScore,
      weight: 0.2,
      description: t('confidenceScore.dimensions.accuracyDesc'),
      details: {
        value: historicalAccuracy,
        unit: t('confidenceScore.units.percent'),
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
    suggestions.push(t('confidenceScore.suggestions.increaseNodes'));
  }
  if (consensusScore < 90) {
    suggestions.push(t('confidenceScore.suggestions.checkConsensus'));
  }
  if (diversityScore < 70) {
    suggestions.push(t('confidenceScore.suggestions.increaseDiversity'));
  }
  if (freshnessScore < 80) {
    suggestions.push(t('confidenceScore.suggestions.optimizeFreshness'));
  }
  if (accuracyScore < 95) {
    suggestions.push(t('confidenceScore.suggestions.improveAccuracy'));
  }
  if (suggestions.length === 0) {
    suggestions.push(t('confidenceScore.suggestions.maintainQuality'));
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
  const t = useTranslations();
  const levelConfig = LEVEL_CONFIG[level];

  const getLevelLabel = () => {
    switch (level) {
      case 'excellent':
        return t('confidenceScore.level.excellent');
      case 'good':
        return t('confidenceScore.level.good');
      case 'fair':
        return t('confidenceScore.level.fair');
      case 'poor':
        return t('confidenceScore.level.poor');
      default:
        return '';
    }
  };

  const getStrokeColor = () => {
    switch (level) {
      case 'excellent':
        return semanticColors.success.DEFAULT;
      case 'good':
        return chartColors.recharts.primary;
      case 'fair':
        return semanticColors.warning.DEFAULT;
      case 'poor':
        return semanticColors.danger.DEFAULT;
      default:
        return chartColors.recharts.tick;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            {t('confidenceScore.overallScore')}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">{t('confidenceScore.overallScoreDesc')}</p>
        </div>
        <div className={`p-2 rounded-lg ${levelConfig.lightBg}`}>
          <svg
            className={`w-5 h-5 ${levelConfig.color}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
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
            <circle
              cx="80"
              cy="80"
              r="70"
              stroke={chartColors.recharts.grid}
              strokeWidth="10"
              fill="none"
            />
            <circle
              cx="80"
              cy="80"
              r="70"
              stroke={getStrokeColor()}
              strokeWidth="10"
              fill="none"
              strokeDasharray={`${score * 4.4} 440`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className={`text-4xl font-bold ${levelConfig.color}`}>{score}</p>
              <p className="text-xs text-gray-500 mt-1">{t('confidenceScore.totalScore')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center">
        <span
          className={`px-4 py-2 text-sm font-medium  ${levelConfig.lightBg} ${levelConfig.color}`}
        >
          {getLevelLabel()}
        </span>
      </div>
    </div>
  );
}

function DimensionRadarChart({ dimensions }: { dimensions: DimensionScore[] }) {
  const t = useTranslations();

  const radarData = dimensions.map((dim) => ({
    name: dim.name,
    score: dim.score,
    fullMark: 100,
  }));

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900">
          {t('confidenceScore.radarChart.title')}
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">{t('confidenceScore.radarChart.subtitle')}</p>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={radarData}>
          <PolarGrid stroke={chartColors.recharts.grid} />
          <PolarAngleAxis dataKey="name" tick={{ fontSize: 11, fill: chartColors.recharts.tick }} />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: chartColors.recharts.tickDark }}
          />
          <Radar
            name={t('confidenceScore.totalScore')}
            dataKey="score"
            stroke={chartColors.recharts.primary}
            fill={chartColors.recharts.primary}
            fillOpacity={0.3}
            strokeWidth={2}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

function DimensionDetails({ dimensions }: { dimensions: DimensionScore[] }) {
  const t = useTranslations();

  const getScoreColor = (score: number) => {
    if (score >= 90) return semanticColors.success.DEFAULT;
    if (score >= 70) return chartColors.recharts.primary;
    if (score >= 50) return semanticColors.warning.DEFAULT;
    return semanticColors.danger.DEFAULT;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900">
          {t('confidenceScore.details.title')}
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">{t('confidenceScore.details.subtitle')}</p>
      </div>

      <div className="space-y-4">
        {dimensions.map((dim, index) => (
          <div key={index} className="border border-gray-100 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900 text-sm">{dim.name}</span>
                <span className="text-xs text-gray-400">
                  {t('confidenceScore.details.weight')}: {(dim.weight * 100).toFixed(0)}%
                </span>
              </div>
              <span className="text-lg font-bold" style={{ color: getScoreColor(dim.score) }}>
                {dim.score.toFixed(1)}
              </span>
            </div>

            <p className="text-xs text-gray-500 mb-3">{dim.description}</p>

            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 h-2 bg-gray-100  overflow-hidden">
                <div
                  className="h-full  transition-all duration-300"
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
                {t('confidenceScore.details.current')}: {dim.details.value.toFixed(1)}{' '}
                {dim.details.unit}
              </span>
              <span>
                {t('confidenceScore.details.benchmark')}: {dim.details.benchmark} {dim.details.unit}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TrendChart({ trend }: { trend: TrendDataPoint[] }) {
  const t = useTranslations();
  const locale = useLocale();

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(isChineseLocale(locale) ? 'zh-CN' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            {t('confidenceScore.trend.title')}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">{t('confidenceScore.trend.subtitle')}</p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={trend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} />
          <XAxis
            dataKey="timestamp"
            stroke={chartColors.recharts.tick}
            tick={{ fontSize: 10, fill: chartColors.recharts.tick }}
            tickLine={false}
            axisLine={{ stroke: chartColors.recharts.grid }}
            tickFormatter={formatTime}
          />
          <YAxis
            stroke={chartColors.recharts.tick}
            tick={{ fontSize: 10, fill: chartColors.recharts.tick }}
            tickLine={false}
            axisLine={{ stroke: chartColors.recharts.grid }}
            domain={[0, 100]}
          />
          <RechartsTooltip
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const data = payload[0].payload as TrendDataPoint;
              return (
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-600 font-medium mb-2">
                    {data.timestamp.toLocaleString('zh-CN')}
                  </p>
                  <div className="space-y-1">
                    <div className="flex justify-between gap-4 text-xs">
                      <span className="text-gray-500">{t('confidenceScore.trend.overall')}:</span>
                      <span className="text-gray-900 font-semibold">{data.score.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between gap-4 text-xs">
                      <span className="text-gray-500">{t('confidenceScore.trend.nodes')}:</span>
                      <span className="text-gray-900">{data.nodeScore.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between gap-4 text-xs">
                      <span className="text-gray-500">{t('confidenceScore.trend.consensus')}:</span>
                      <span className="text-gray-900">{data.consensusScore.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between gap-4 text-xs">
                      <span className="text-gray-500">{t('confidenceScore.trend.diversity')}:</span>
                      <span className="text-gray-900">{data.diversityScore.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between gap-4 text-xs">
                      <span className="text-gray-500">{t('confidenceScore.trend.freshness')}:</span>
                      <span className="text-gray-900">{data.freshnessScore.toFixed(1)}</span>
                    </div>
                    <div className="flex justify-between gap-4 text-xs">
                      <span className="text-gray-500">{t('confidenceScore.trend.accuracy')}:</span>
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
            stroke={chartColors.recharts.primary}
            strokeWidth={2}
            dot={false}
            name={t('confidenceScore.trend.overall')}
          />
          <Line
            type="monotone"
            dataKey="consensusScore"
            stroke={chartColors.recharts.purple}
            strokeWidth={1.5}
            dot={false}
            strokeDasharray="5 5"
            name={t('confidenceScore.trend.consensus')}
          />
          <Line
            type="monotone"
            dataKey="accuracyScore"
            stroke={semanticColors.success.DEFAULT}
            strokeWidth={1.5}
            dot={false}
            strokeDasharray="5 5"
            name={t('confidenceScore.trend.accuracy')}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <span className="w-3 h-0.5 bg-primary-500" />
          <span className="text-xs text-gray-500">{t('confidenceScore.trend.overall')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-0.5 bg-purple-500" style={{ borderStyle: 'dashed' }} />
          <span className="text-xs text-gray-500">{t('confidenceScore.trend.consensus')}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-0.5 bg-success-500" style={{ borderStyle: 'dashed' }} />
          <span className="text-xs text-gray-500">{t('confidenceScore.trend.accuracy')}</span>
        </div>
      </div>
    </div>
  );
}

function SuggestionsCard({ suggestions }: { suggestions: string[] }) {
  const t = useTranslations();

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            {t('confidenceScore.suggestions.title')}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {t('confidenceScore.suggestions.subtitle')}
          </p>
        </div>
        <div className="p-2 bg-primary-50 border border-primary-100 rounded-lg">
          <svg
            className="w-5 h-5 text-primary-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
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
            className="flex items-start gap-3 p-3 bg-gray-50  hover:bg-gray-100 transition-colors"
          >
            <div className="flex-shrink-0 w-6 h-6  bg-primary-100 flex items-center justify-center">
              <span className="text-xs font-semibold text-primary-600">{index + 1}</span>
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
  const t = useTranslations();
  const locale = useLocale();
  const [data, setData] = useState<ConfidenceData | null>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const updateData = useCallback(() => {
    const newData = generateMockData(t);
    setData(newData);
    setLastUpdated(new Date());
  }, [t]);

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
        <div className="text-gray-500">{t('confidenceScore.loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{t('confidenceScore.title')}</h2>
          <p className="text-sm text-gray-500 mt-1">{t('confidenceScore.subtitle')}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            {t('confidenceScore.lastUpdated')}:{' '}
            {lastUpdated.toLocaleTimeString(isChineseLocale(locale) ? 'zh-CN' : 'en-US')}
          </span>
          <button
            onClick={updateData}
            className="px-3 py-1.5 bg-primary-50 text-primary-600 text-sm font-medium  hover:bg-primary-100 transition-colors"
          >
            {t('confidenceScore.refresh')}
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
