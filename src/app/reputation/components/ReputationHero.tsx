'use client';

import { Loader2, RefreshCw } from 'lucide-react';

import { NextUpdateCountdown } from '@/app/reputation/components/ReputationStats';
import { EditorialWorkspaceHeader } from '@/components/editorial';
import { cn } from '@/lib/utils';

interface ReputationHeroProps {
  isCalculating: boolean;
  calcMessage?: string;
  nextRecalcAt?: string | null;
  onRefresh: () => void;
  refreshPending: boolean;
  canRefresh: boolean;
}

export function ReputationHero({
  isCalculating,
  calcMessage,
  nextRecalcAt,
  onRefresh,
  refreshPending,
  canRefresh,
}: ReputationHeroProps) {
  return (
    <EditorialWorkspaceHeader
      index="04"
      stage="Assess"
      eyebrow="A rolling, evidence-led directory of Oracle providers. Reputation is earned from observed behaviour, not brand familiarity."
      title="Judge the feed by its record, not its name."
      description="Compare accuracy, uptime, latency, deviation, and coverage across the providers Insight has actually observed during the rolling seven-day window."
      evidence={['Observed accuracy', 'Operational uptime', 'Coverage record']}
      action={
        <div className="flex flex-wrap items-center gap-2">
          {isCalculating ? (
            <div className="flex items-center gap-2 border-l-2 border-blue-600 bg-blue-50/70 px-3 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span className="text-xs font-bold text-blue-700">
                {calcMessage || 'Recalculating...'}
              </span>
            </div>
          ) : (
            <>
              <NextUpdateCountdown nextRecalcAt={nextRecalcAt} />
              {canRefresh ? (
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={refreshPending || isCalculating}
                  className={cn(
                    'flex items-center gap-2 border px-4 py-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                    refreshPending || isCalculating
                      ? 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400'
                      : 'border-slate-950 bg-slate-950 text-white hover:border-blue-700 hover:bg-blue-700'
                  )}
                >
                  <RefreshCw className={cn('h-3.5 w-3.5', refreshPending && 'animate-spin')} />
                  {refreshPending ? 'Calculating...' : 'Refresh scores'}
                </button>
              ) : null}
            </>
          )}
        </div>
      }
    />
  );
}
