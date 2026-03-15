'use client';

import { useMemo } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { chartColors, semanticColors } from '@/lib/config/colors';

interface DataQualityIndicatorProps {
  completeness: number;
  latency: number;
  sourceCount: number;
  className?: string;
}

function calculateQualityScore(completeness: number, latency: number, sourceCount: number): number {
  const completenessScore = completeness;

  let latencyScore = 100;
  if (latency >= 1000) {
    latencyScore = 0;
  } else if (latency > 100) {
    latencyScore = 100 - ((latency - 100) / 900) * 100;
  }

  let sourceScore = 100;
  if (sourceCount < 3) {
    sourceScore = 0;
  } else if (sourceCount < 10) {
    sourceScore = ((sourceCount - 3) / 7) * 100;
  }

  const totalScore = completenessScore * 0.4 + latencyScore * 0.3 + sourceScore * 0.3;

  return Math.min(100, Math.max(0, totalScore));
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
}

function getScoreBgColor(score: number): string {
  if (score >= 80) return 'bg-green-600';
  if (score >= 60) return 'bg-yellow-600';
  return 'bg-red-600';
}

function getScoreLabel(score: number, t: (key: string) => string): string {
  if (score >= 80) return t('oracleCommon.dataQualityIndicator.scoreLabels.excellent');
  if (score >= 60) return t('oracleCommon.dataQualityIndicator.scoreLabels.good');
  return t('oracleCommon.dataQualityIndicator.scoreLabels.needsImprovement');
}

function GaugeChart({
  value,
  size = 140,
  t,
}: {
  value: number;
  size?: number;
  t: (key: string) => string;
}) {
  const clampedValue = Math.min(Math.max(value, 0), 100);
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * 0.75;
  const strokeDashoffset = arcLength - (clampedValue / 100) * arcLength;

  const getColor = (score: number) => {
    if (score >= 80) return semanticColors.success.dark;
    if (score >= 60) return semanticColors.warning.dark;
    return semanticColors.danger.dark;
  };

  const color = getColor(clampedValue);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-135"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={chartColors.grid.line}
          strokeWidth={strokeWidth}
          strokeDasharray={arcLength}
          strokeDashoffset={0}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={arcLength}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center pt-4">
        <span className="text-3xl font-bold" style={{ color }}>
          {clampedValue.toFixed(0)}
        </span>
        <span className="text-xs font-medium text-gray-500 mt-1">
          {getScoreLabel(clampedValue, t)}
        </span>
      </div>
    </div>
  );
}

function ProgressBar({
  label,
  value,
  maxValue = 100,
  unit = '%',
  showValue = true,
}: {
  label: string;
  value: number;
  maxValue?: number;
  unit?: string;
  showValue?: boolean;
}) {
  const percentage = Math.min((value / maxValue) * 100, 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">{label}</span>
        {showValue && (
          <span className="font-medium text-gray-900">
            {value.toFixed(0)}
            {unit}
          </span>
        )}
      </div>
      <div className="h-2 bg-gray-100  overflow-hidden">
        <div
          className="h-full bg-blue-500  transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default function DataQualityIndicator({
  completeness,
  latency,
  sourceCount,
  className = '',
}: DataQualityIndicatorProps) {
  const { t } = useI18n();
  const qualityScore = useMemo(
    () => calculateQualityScore(completeness, latency, sourceCount),
    [completeness, latency, sourceCount]
  );

  const scoreColor = getScoreColor(qualityScore);
  const scoreBgColor = getScoreBgColor(qualityScore);

  return (
    <div className={`bg-white border border-gray-200  overflow-hidden  ${className}`}>
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">
          {t('oracleCommon.dataQualityIndicator.title')}
        </h3>
      </div>

      <div className="p-5">
        <div className="flex items-start gap-6">
          <div className="flex-shrink-0">
            <GaugeChart value={qualityScore} t={t} />
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">
                  {t('oracleCommon.dataQualityIndicator.completeness')}
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {completeness.toFixed(0)}%
                </span>
              </div>
              <div className="h-2 bg-gray-100  overflow-hidden">
                <div
                  className="h-full bg-blue-500  transition-all duration-500"
                  style={{ width: `${Math.min(completeness, 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">
                  {t('oracleCommon.dataQualityIndicator.latency')}
                </span>
                <span className="text-sm font-medium text-gray-900">{latency.toFixed(0)}ms</span>
              </div>
              <div className="h-2 bg-gray-100  overflow-hidden">
                <div
                  className={`h-full  transition-all duration-500 ${
                    latency < 100 ? 'bg-green-500' : latency < 500 ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${Math.max(0, 100 - (latency / 1000) * 100)}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">
                  {t('oracleCommon.dataQualityIndicator.sourceCount')}
                </span>
                <span className="text-sm font-medium text-gray-900">
                  {sourceCount} {t('oracleCommon.dataQualityIndicator.sources')}
                </span>
              </div>
              <div className="h-2 bg-gray-100  overflow-hidden">
                <div
                  className="h-full  transition-all duration-500"
                  style={{
                    width: `${Math.min((sourceCount / 10) * 100, 100)}%`,
                    backgroundColor: chartColors.recharts.purple,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2  ${scoreBgColor}`} />
              <span className="text-sm text-gray-600">
                {t('oracleCommon.dataQualityIndicator.overallScore')}
              </span>
            </div>
            <span className={`text-lg font-bold ${scoreColor}`}>
              {qualityScore.toFixed(1)} {t('oracleCommon.dataQualityIndicator.score')}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {t('oracleCommon.dataQualityIndicator.scoringFormula')}
          </p>
        </div>
      </div>
    </div>
  );
}
