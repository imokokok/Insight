'use client';

import { motion } from 'framer-motion';
import { Award, Loader2, RefreshCw } from 'lucide-react';

import { NextUpdateCountdown } from '@/app/reputation/components/ReputationStats';
import { cn } from '@/lib/utils';

interface ReputationHeroProps {
  isCalculating: boolean;
  calcMessage?: string;
  nextRecalcAt?: string | null;
  onRefresh: () => void;
  refreshPending: boolean;
}

/**
 * Compact light header for the reputation directory.
 *
 * Replaces the previous dark `bg-slate-950` hero with gradient orbs — a
 * data-tool page should let the comparison table be the visual focus, so
 * the header now mirrors the badge + h1 + description pattern used by the
 * other data pages (e.g. PriceQuery's QueryHeader).
 */
export function ReputationHero({
  isCalculating,
  calcMessage,
  nextRecalcAt,
  onRefresh,
  refreshPending,
}: ReputationHeroProps) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 mb-6"
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-[11px] font-bold mb-3">
            <Award className="w-3.5 h-3.5" />
            <span>Live oracle reputation tracking</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mb-1.5">
            Oracle Reputation Center
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed max-w-2xl">
            Compare oracle providers across accuracy, uptime, latency, and deviation with
            transparent, rolling 7-day reputation scores.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {isCalculating ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg">
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
              <span className="text-xs font-bold text-blue-700">
                {calcMessage || 'Recalculating...'}
              </span>
            </div>
          ) : (
            <>
              <NextUpdateCountdown nextRecalcAt={nextRecalcAt} />
              <button
                onClick={onRefresh}
                disabled={refreshPending || isCalculating}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all border',
                  refreshPending || isCalculating
                    ? 'bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed'
                    : 'bg-blue-600 text-white border-transparent hover:bg-blue-700 shadow-sm'
                )}
              >
                <RefreshCw className={cn('w-3.5 h-3.5', refreshPending && 'animate-spin')} />
                {refreshPending ? 'Calculating...' : 'Refresh'}
              </button>
            </>
          )}
        </div>
      </div>
    </motion.section>
  );
}
