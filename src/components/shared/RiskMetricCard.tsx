import { type ElementType, type ReactNode } from 'react';

import { type RiskLevel } from '@/lib/analytics/riskMetrics';

import { createBadgeMapper, type BadgeStyle } from './badgeUtils';

const levelBadgeMapping: Record<RiskLevel, BadgeStyle> = {
  low: { label: 'Low', bgClass: 'bg-emerald-50', textClass: 'text-emerald-700' },
  medium: { label: 'Medium', bgClass: 'bg-amber-50', textClass: 'text-amber-700' },
  high: { label: 'High', bgClass: 'bg-orange-50', textClass: 'text-orange-700' },
  critical: { label: 'Critical', bgClass: 'bg-red-50', textClass: 'text-red-700' },
};

export const getLevelBadge = createBadgeMapper<RiskLevel>(levelBadgeMapping, {
  label: 'Unknown',
  bgClass: 'bg-gray-50',
  textClass: 'text-gray-700',
});

export function ScoreBar({
  value,
  maxValue,
  color,
}: {
  value: number;
  maxValue: number;
  color: string;
}) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div
        className="h-2 rounded-full transition-all duration-500"
        style={{ width: `${percentage}%`, backgroundColor: color }}
      />
    </div>
  );
}

function getBarColor(level: RiskLevel): string {
  switch (level) {
    case 'low':
      return '#10b981';
    case 'medium':
      return '#f59e0b';
    case 'high':
      return '#f97316';
    case 'critical':
      return '#ef4444';
    default:
      return '#888888';
  }
}

export function RiskMetricCard({
  icon: Icon,
  iconColor,
  title,
  description,
  value,
  maxValue,
  unit,
  level,
  children,
}: {
  icon: ElementType;
  iconColor: string;
  title: string;
  description: string;
  value: number;
  maxValue: number;
  unit?: string;
  level: RiskLevel;
  barColor?: string;
  children?: ReactNode;
}) {
  const badge = getLevelBadge(level);
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${iconColor}`} />
          <span className="text-sm font-medium text-gray-700">{title}</span>
        </div>
        <span
          className={`inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded ${badge.bgClass} ${badge.textClass}`}
        >
          {badge.label}
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-3">{description}</p>
      <div className="flex items-baseline gap-1 mb-3">
        <span className="text-2xl font-bold text-gray-900 font-mono">{value.toFixed(0)}</span>
        {unit && <span className="text-sm text-gray-500">{unit}</span>}
      </div>
      <ScoreBar value={value} maxValue={maxValue} color={getBarColor(level)} />
      {children}
    </div>
  );
}

export function formatStaleness(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}
