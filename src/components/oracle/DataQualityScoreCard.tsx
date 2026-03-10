'use client';

import { useMemo } from 'react';

type QualityLevel = 'excellent' | 'good' | 'warning' | 'critical';

interface FreshnessData {
  lastUpdated: Date;
  updateInterval?: number;
}

interface CompletenessData {
  successCount: number;
  totalCount: number;
}

interface ReliabilityData {
  historicalAccuracy: number;
  responseSuccessRate: number;
  uptime?: number;
}

interface DataQualityScoreCardProps {
  freshness: FreshnessData;
  completeness: CompletenessData;
  reliability: ReliabilityData;
  className?: string;
}

const LEVEL_CONFIG = {
  excellent: {
    color: 'text-green-600',
    bgColor: 'bg-green-500',
    lightBg: 'bg-green-50',
    borderColor: 'border-green-200',
    label: '优秀',
    labelEn: 'Excellent',
    range: [80, 100],
  },
  good: {
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-500',
    lightBg: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    label: '良好',
    labelEn: 'Good',
    range: [60, 80],
  },
  warning: {
    color: 'text-orange-600',
    bgColor: 'bg-orange-500',
    lightBg: 'bg-orange-50',
    borderColor: 'border-orange-200',
    label: '警告',
    labelEn: 'Warning',
    range: [40, 60],
  },
  critical: {
    color: 'text-red-600',
    bgColor: 'bg-red-500',
    lightBg: 'bg-red-50',
    borderColor: 'border-red-200',
    label: '严重',
    labelEn: 'Critical',
    range: [0, 40],
  },
};

function getLevelFromScore(score: number): QualityLevel {
  if (score >= 80) return 'excellent';
  if (score >= 60) return 'good';
  if (score >= 40) return 'warning';
  return 'critical';
}

function calculateFreshnessScore(lastUpdated: Date): number {
  const now = new Date();
  const diffMs = now.getTime() - lastUpdated.getTime();
  const diffMinutes = diffMs / (1000 * 60);

  if (diffMinutes <= 1) return 100;
  if (diffMinutes <= 5) return 95;
  if (diffMinutes <= 15) return 85;
  if (diffMinutes <= 30) return 70;
  if (diffMinutes <= 60) return 50;
  if (diffMinutes <= 120) return 30;
  return Math.max(0, 30 - (diffMinutes - 120) / 10);
}

function calculateCompletenessScore(successCount: number, totalCount: number): number {
  if (totalCount === 0) return 0;
  return (successCount / totalCount) * 100;
}

function calculateReliabilityScore(historicalAccuracy: number, responseSuccessRate: number): number {
  return historicalAccuracy * 0.6 + responseSuccessRate * 0.4;
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return `${diffSeconds}秒前`;
  if (diffMinutes < 60) return `${diffMinutes}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  return `${diffDays}天前`;
}

function CircularProgress({ score, level }: { score: number; level: QualityLevel }) {
  const levelConfig = LEVEL_CONFIG[level];
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getColor = () => {
    switch (level) {
      case 'excellent':
        return '#10b981';
      case 'good':
        return '#eab308';
      case 'warning':
        return '#f97316';
      case 'critical':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg className="w-28 h-28 transform -rotate-90">
        <circle
          cx="56"
          cy="56"
          r={radius}
          stroke="#e5e7eb"
          strokeWidth="8"
          fill="none"
        />
        <circle
          cx="56"
          cy="56"
          r={radius}
          stroke={getColor()}
          strokeWidth="8"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <p className={`text-2xl font-bold ${levelConfig.color}`}>{Math.round(score)}</p>
          <p className="text-xs text-gray-500">综合评分</p>
        </div>
      </div>
    </div>
  );
}

function MetricBar({ label, score, icon }: { label: string; score: number; icon: React.ReactNode }) {
  const level = getLevelFromScore(score);
  const levelConfig = LEVEL_CONFIG[level];

  const getColor = () => {
    switch (level) {
      case 'excellent':
        return '#10b981';
      case 'good':
        return '#eab308';
      case 'warning':
        return '#f97316';
      case 'critical':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${levelConfig.lightBg}`}>{icon}</div>
          <span className="text-sm font-medium text-gray-700">{label}</span>
        </div>
        <span className={`text-sm font-semibold ${levelConfig.color}`}>{Math.round(score)}分</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${score}%`,
            backgroundColor: getColor(),
          }}
        />
      </div>
    </div>
  );
}

export function DataQualityScoreCard({
  freshness,
  completeness,
  reliability,
  className = '',
}: DataQualityScoreCardProps) {
  const scores = useMemo(() => {
    const freshnessScore = calculateFreshnessScore(freshness.lastUpdated);
    const completenessScore = calculateCompletenessScore(
      completeness.successCount,
      completeness.totalCount
    );
    const reliabilityScore = calculateReliabilityScore(
      reliability.historicalAccuracy,
      reliability.responseSuccessRate
    );

    const overallScore = freshnessScore * 0.3 + completenessScore * 0.35 + reliabilityScore * 0.35;

    return {
      freshness: freshnessScore,
      completeness: completenessScore,
      reliability: reliabilityScore,
      overall: overallScore,
      level: getLevelFromScore(overallScore),
    };
  }, [freshness, completeness, reliability]);

  const levelConfig = LEVEL_CONFIG[scores.level];

  const FreshnessIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );

  const CompletenessIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );

  const ReliabilityIcon = () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );

  return (
    <div
      className={`bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm ${className}`}
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">数据质量评分</h3>
        <span
          className={`px-3 py-1 text-xs font-medium rounded-full ${levelConfig.lightBg} ${levelConfig.color}`}
        >
          {levelConfig.label}
        </span>
      </div>

      <div className="p-5">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex flex-col items-center justify-center lg:w-1/3">
            <CircularProgress score={scores.overall} level={scores.level} />
            <p className="text-xs text-gray-500 mt-3">基于多维度加权评估</p>
          </div>

          <div className="flex-1 space-y-5">
            <MetricBar
              label="数据新鲜度"
              score={scores.freshness}
              icon={<FreshnessIcon />}
            />
            <div className="text-xs text-gray-500 -mt-2 pl-8">
              最后更新: {formatTimeAgo(freshness.lastUpdated)}
            </div>

            <MetricBar
              label="数据完整性"
              score={scores.completeness}
              icon={<CompletenessIcon />}
            />
            <div className="text-xs text-gray-500 -mt-2 pl-8">
              成功获取: {completeness.successCount}/{completeness.totalCount} 个预言机
            </div>

            <MetricBar
              label="数据可靠性"
              score={scores.reliability}
              icon={<ReliabilityIcon />}
            />
            <div className="text-xs text-gray-500 -mt-2 pl-8">
              历史准确率: {reliability.historicalAccuracy.toFixed(1)}% | 响应成功率:{' '}
              {reliability.responseSuccessRate.toFixed(1)}%
            </div>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500 mb-1">新鲜度权重</p>
              <p className="text-sm font-semibold text-gray-900">30%</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">完整性权重</p>
              <p className="text-sm font-semibold text-gray-900">35%</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">可靠性权重</p>
              <p className="text-sm font-semibold text-gray-900">35%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export type {
  DataQualityScoreCardProps,
  FreshnessData,
  CompletenessData,
  ReliabilityData,
  QualityLevel,
};
