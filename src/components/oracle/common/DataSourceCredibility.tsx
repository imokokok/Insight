'use client';

import { useState } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from 'recharts';
import { DashboardCard } from './DashboardCard';
import { chartColors, semanticColors } from '@/lib/config/colors';

interface DataSourceCredibilityProps {
  sources: Array<{
    id: string;
    name: string;
    accuracy: number;
    responseSpeed: number;
    consistency: number;
    availability: number;
    contribution: number;
  }>;
  className?: string;
}

function getScoreColor(score: number): string {
  if (score >= 80) return semanticColors.success.DEFAULT;
  if (score >= 60) return semanticColors.warning.DEFAULT;
  return semanticColors.danger.DEFAULT;
}

function getScoreColorClass(score: number): string {
  if (score >= 80) return 'text-success-600';
  if (score >= 60) return 'text-warning-600';
  return 'text-danger-600';
}

function CircularProgress({
  score,
  size = 80,
  strokeWidth = 8,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={chartColors.grid.line}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-lg font-bold ${getScoreColorClass(score)}`}>{score}</span>
      </div>
    </div>
  );
}

function ContributionBar({ contribution, color }: { contribution: number; color: string }) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-500">贡献度</span>
        <span className="text-xs font-medium text-gray-700">{contribution.toFixed(1)}%</span>
      </div>
      <div className="w-full h-2 bg-gray-200  overflow-hidden">
        <div
          className="h-full  transition-all duration-500"
          style={{
            width: `${contribution}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

function DataSourceCard({ source }: { source: DataSourceCredibilityProps['sources'][0] }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const overallScore = Math.round(
    (source.accuracy + source.responseSpeed + source.consistency + source.availability) / 4
  );
  const color = getScoreColor(overallScore);

  const radarData = [
    { metric: '历史准确度', value: source.accuracy },
    { metric: '响应速度', value: source.responseSpeed },
    { metric: '数据一致性', value: source.consistency },
    { metric: '可用性', value: source.availability },
  ];

  const metrics = [
    { label: '历史准确度', value: source.accuracy, icon: '🎯' },
    { label: '响应速度', value: source.responseSpeed, icon: '⚡' },
    { label: '数据一致性', value: source.consistency, icon: '🔄' },
    { label: '可用性', value: source.availability, icon: '✅' },
  ];

  return (
    <div className="border border-gray-200  overflow-hidden hover:border-gray-300 transition-colors">
      <div className="p-4 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 " style={{ backgroundColor: color }} />
            <h4 className="text-base font-semibold text-gray-900">{source.name}</h4>
          </div>
          <div className="flex items-center gap-3">
            <CircularProgress score={overallScore} size={60} strokeWidth={6} />
            <svg
              className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        <ContributionBar contribution={source.contribution} color={color} />
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-3">可信度雷达图</h5>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                    <Radar
                      name={source.name}
                      dataKey="value"
                      stroke={color}
                      fill={color}
                      fillOpacity={0.2}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-3">详细指标</h5>
              <div className="space-y-3">
                {metrics.map((metric) => (
                  <div key={metric.label} className="bg-white  p-3 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{metric.icon}</span>
                        <span className="text-sm text-gray-600">{metric.label}</span>
                      </div>
                      <span className={`text-lg font-bold ${getScoreColorClass(metric.value)}`}>
                        {metric.value}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200  overflow-hidden">
                      <div
                        className="h-full  transition-all duration-500"
                        style={{
                          width: `${metric.value}%`,
                          backgroundColor: getScoreColor(metric.value),
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function DataSourceCredibility({ sources, className = '' }: DataSourceCredibilityProps) {
  const averageScore =
    sources.length > 0
      ? Math.round(
          sources.reduce(
            (sum, s) => sum + (s.accuracy + s.responseSpeed + s.consistency + s.availability) / 4,
            0
          ) / sources.length
        )
      : 0;

  const totalContribution = sources.reduce((sum, s) => sum + s.contribution, 0);

  return (
    <DashboardCard title="数据源可信度分析" className={className}>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-100 border border-gray-200 ">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">数据源数量</p>
            <p className="text-3xl font-bold text-gray-900">{sources.length}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">平均综合评分</p>
            <div className="flex items-center justify-center">
              <CircularProgress score={averageScore} size={70} strokeWidth={7} />
            </div>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">总贡献度</p>
            <p className="text-3xl font-bold text-gray-900">{totalContribution.toFixed(1)}%</p>
          </div>
        </div>

        <div className="space-y-3">
          {sources.map((source) => (
            <DataSourceCard key={source.id} source={source} />
          ))}
        </div>

        {sources.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <svg
              className="w-12 h-12 mx-auto mb-3 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <p>暂无数据源信息</p>
          </div>
        )}
      </div>
    </DashboardCard>
  );
}
