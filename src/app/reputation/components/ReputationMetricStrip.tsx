'use client';

import { motion } from 'framer-motion';

import { cn } from '@/lib/utils';
import { addThousandSeparators } from '@/lib/utils/format';

interface ReputationMetricStripProps {
  providerCount: number;
  ratedCount: number;
  averageScore: number;
  totalQueries: number;
  totalSymbols: number;
}

interface MetricItem {
  label: string;
  value: number;
  suffix?: string;
  color: string;
  isScore?: boolean;
  format?: boolean;
}

/**
 * Compact metric strip summarizing the reputation directory.
 *
 * Grid uses `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5` so the 5 cards
 * flow as 2 + 3 on tablet (instead of the previous 2 + 2 + 1 orphan
 * produced by `grid-cols-2 md:grid-cols-5`).
 */
export function ReputationMetricStrip({
  providerCount,
  ratedCount,
  averageScore,
  totalQueries,
  totalSymbols,
}: ReputationMetricStripProps) {
  const metrics: MetricItem[] = [
    { label: 'Providers tracked', value: providerCount, color: 'text-blue-600' },
    { label: 'With reputation data', value: ratedCount, color: 'text-emerald-600' },
    {
      label: 'Average reputation',
      value: averageScore,
      color: 'text-violet-600',
      isScore: true,
    },
    {
      label: 'Total queries (7d)',
      value: totalQueries,
      color: 'text-amber-600',
      format: true,
    },
    { label: 'Symbols tracked', value: totalSymbols, suffix: '+', color: 'text-cyan-600' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
      {metrics.map((m, i) => (
        <motion.div
          key={m.label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: Math.min(i * 0.05, 0.25) }}
          className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm"
        >
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">
            {m.label}
          </p>
          <div className="flex items-baseline gap-1.5">
            <span className={cn('text-2xl font-black font-mono tracking-tight', m.color)}>
              {m.format
                ? addThousandSeparators(String(m.value))
                : m.value.toFixed(m.isScore ? 0 : 0)}
            </span>
            {m.suffix && <span className="text-sm font-bold text-slate-400">{m.suffix}</span>}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
