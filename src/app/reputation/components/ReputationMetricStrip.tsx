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
      color: 'text-blue-700',
      isScore: true,
    },
    {
      label: 'Total queries (7d)',
      value: totalQueries,
      color: 'text-slate-950',
      format: true,
    },
    { label: 'Symbols tracked', value: totalSymbols, suffix: '+', color: 'text-blue-600' },
  ];

  return (
    <section className="mb-7" aria-label="Reputation summary">
      <div className="mb-3 flex items-center justify-between border-b border-slate-900/15 pb-3">
        <p className="editorial-index">01 — Read the field</p>
        <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
          Rolling 7 days
        </span>
      </div>
      <div className="grid grid-cols-2 border-y border-slate-900/15 sm:grid-cols-3 lg:grid-cols-5">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="border-b border-r border-slate-900/10 bg-white/35 p-4 last:border-r-0 sm:p-5 lg:border-b-0"
          >
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
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
          </div>
        ))}
      </div>
    </section>
  );
}
