'use client';

import { AlertCircle, ShieldAlert, TrendingUp } from 'lucide-react';

import { RISK_LEVELS } from '@/lib/risk/constants';
import type { RiskLevel } from '@/lib/risk/types';
import { cn } from '@/lib/utils';

interface RiskSummaryStat {
  id: string;
  label: string;
  value: string;
  subtext?: string;
  level?: RiskLevel;
  icon: 'alert' | 'deviation' | 'protocols';
}

interface RiskSummaryHeaderProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  stats: RiskSummaryStat[];
  className?: string;
}

function getStatIcon(icon: RiskSummaryStat['icon']) {
  switch (icon) {
    case 'alert':
      return <AlertCircle className="w-4 h-4" />;
    case 'deviation':
      return <TrendingUp className="w-4 h-4" />;
    case 'protocols':
      return <ShieldAlert className="w-4 h-4" />;
  }
}

function getLevelStyles(level?: RiskLevel) {
  if (!level) return 'bg-white border-slate-200 text-slate-600';
  const config = RISK_LEVELS[level];
  return cn(config.bg, config.border, config.color);
}

export function RiskSummaryHeader({
  title,
  description,
  icon,
  stats,
  className,
}: RiskSummaryHeaderProps) {
  return (
    <div
      className={cn('bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sm:p-6', className)}
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        {/* Title */}
        <div className="flex items-start gap-4">
          <div className="p-2.5 bg-blue-50 rounded-xl shrink-0">{icon}</div>
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-100 text-blue-700 text-[11px] font-semibold uppercase tracking-wider mb-2">
              Risk Surveillance
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{title}</h1>
            <p className="text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">{description}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-wrap items-center gap-3 lg:shrink-0">
          {stats.map((stat) => (
            <div
              key={stat.id}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl border min-w-[140px]',
                stat.id === 'alerts' && stat.level
                  ? getLevelStyles(stat.level)
                  : 'bg-white border-slate-100'
              )}
            >
              <div
                className={cn(
                  'p-1.5 rounded-lg',
                  stat.id === 'alerts'
                    ? stat.level && stat.level !== 'normal'
                      ? RISK_LEVELS[stat.level].bg
                      : 'bg-emerald-50'
                    : 'bg-slate-50'
                )}
              >
                {getStatIcon(stat.icon)}
              </div>
              <div>
                <div className="text-xs text-slate-500 font-medium">{stat.label}</div>
                <div className="text-lg font-bold text-slate-900 leading-tight">{stat.value}</div>
                {stat.subtext && (
                  <div className="text-[10px] text-slate-400 mt-0.5">{stat.subtext}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
