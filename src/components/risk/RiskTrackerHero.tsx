'use client';

import { AlertCircle, ShieldAlert, TrendingUp } from 'lucide-react';

import { EditorialWorkspaceHeader, EvidenceProcessRail } from '@/components/editorial';
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

interface RiskTrackerHeroProps {
  page: 'stablecoin' | 'wrapped';
  title: string;
  description: string;
  eyebrow?: string;
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

export function RiskTrackerHero({
  page,
  title,
  description,
  eyebrow = 'Risk Surveillance',
  icon,
  stats,
  className,
}: RiskTrackerHeroProps) {
  return (
    <section
      className={cn('editorial-frame mx-auto max-w-[1440px] px-5 pt-4 sm:px-8 lg:px-12', className)}
    >
      <EditorialWorkspaceHeader
        index={page === 'stablecoin' ? '07' : '08'}
        stage="Monitor"
        eyebrow={`${eyebrow} · Live peg evidence across sources and protocols`}
        title={title}
        description={description}
        evidence={['Source agreement', 'Deviation duration', 'Protocol impact']}
        action={
          <div className="inline-flex items-center gap-2 border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">
            {icon}
            Live surveillance
          </div>
        }
      />

      <EvidenceProcessRail
        label="Surveillance cycle"
        items={[
          { label: 'Observe the peg', detail: 'Reference vs market' },
          { label: 'Measure persistence', detail: 'Threshold · duration' },
          { label: 'Map exposure', detail: 'Protocols · consequence' },
        ]}
      />

      <div className="mb-3 mt-7 flex items-center justify-between border-b border-slate-900/15 pb-3">
        <p className="editorial-index">01 — Market condition</p>
        <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
          60s refresh
        </span>
      </div>
      <div className="risk-signal-board grid grid-cols-1 border-y border-slate-900/15 sm:grid-cols-3">
        {stats.map((stat, statIndex) => (
          <div
            key={stat.id}
            className={cn(
              'risk-signal-cell border-b border-r border-slate-900/10 bg-white/35 px-4 py-4 last:border-r-0 sm:border-b-0',
              stat.id === 'alerts' && stat.level && getLevelStyles(stat.level)
            )}
          >
            <span className="risk-signal-index">{String(statIndex + 1).padStart(2, '0')}</span>
            <div className="risk-signal-icon text-blue-600">{getStatIcon(stat.icon)}</div>
            <div className="risk-signal-copy">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {stat.label}
              </div>
              <div className="font-mono text-xl font-bold leading-tight text-slate-950">
                {stat.value}
              </div>
              {stat.subtext && (
                <div className="mt-0.5 text-[10px] text-slate-400">{stat.subtext}</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
