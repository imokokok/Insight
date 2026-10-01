import { BarChart3, Clock, Layers, ShieldCheck } from 'lucide-react';

interface LiveStatusStripProps {
  activeProviders: number;
  totalProviders: number;
  avgSpread: number;
  healthyCount: number;
  totalAssets: number;
  lastObservedAt: number;
  now: number;
  updateInterval?: string;
}

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  tone?: 'blue' | 'emerald' | 'amber' | 'slate';
}

function StatCard({ icon: Icon, label, value, tone = 'slate' }: StatCardProps) {
  const toneStyles = {
    blue: 'text-blue-900',
    emerald: 'text-emerald-900',
    amber: 'text-amber-900',
    slate: 'text-slate-900',
  };

  const iconToneStyles = {
    blue: 'text-blue-600',
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
    slate: 'text-slate-600',
  };

  return (
    <div
      className={`live-evidence-stat flex min-w-0 items-center gap-3 px-4 py-3 ${toneStyles[tone]} transition-colors`}
    >
      <Icon className={`w-4 h-4 flex-shrink-0 ${iconToneStyles[tone]}`} />
      <div>
        <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500 font-semibold mb-1">
          {label}
        </div>
        <div className="text-base lg:text-lg font-semibold font-mono tabular-nums tracking-tight">
          {value}
        </div>
      </div>
    </div>
  );
}

function formatObservationAge(timestamp: number, now: number): string {
  if (!timestamp) return 'Unavailable';
  const minutes = Math.max(0, Math.floor((now - timestamp) / 60_000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function LiveStatusStrip({
  activeProviders,
  totalProviders,
  avgSpread,
  healthyCount,
  totalAssets,
  lastObservedAt,
  now,
  updateInterval = '30s',
}: LiveStatusStripProps) {
  const spreadTone = avgSpread > 1 ? 'amber' : avgSpread > 0 ? 'emerald' : 'slate';
  const isCurrent = lastObservedAt > 0 && now - lastObservedAt <= 20 * 60_000;
  const state = lastObservedAt === 0 ? 'awaiting' : isCurrent ? 'current' : 'delayed';

  return (
    <section className={`live-evidence-strip is-${state}`} aria-label="Source observation status">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="live-evidence-intro">
          <span className="live-evidence-pulse" aria-hidden="true" />
          <div>
            <div className="live-evidence-state">
              {state === 'current'
                ? 'Recent observation'
                : state === 'delayed'
                  ? 'Older observations'
                  : 'Awaiting observations'}
            </div>
            <div className="live-evidence-caption">Rechecks every {updateInterval}</div>
          </div>
        </div>

        <div className="live-evidence-stats grid grid-cols-2 divide-x divide-y divide-slate-900/10 border-y border-slate-900/10 sm:grid-cols-4 sm:divide-y-0 lg:border-y-0">
          <StatCard
            icon={Layers}
            label="Providers sampled"
            value={`${activeProviders}/${totalProviders}`}
            tone="blue"
          />
          <StatCard
            icon={BarChart3}
            label="Average spread"
            value={avgSpread > 0 ? `${avgSpread.toFixed(3)}%` : '—'}
            tone={spreadTone}
          />
          <StatCard
            icon={ShieldCheck}
            label="Tight spread"
            value={`${healthyCount}/${totalAssets}`}
            tone="emerald"
          />
          <StatCard
            icon={Clock}
            label="Newest observation"
            value={formatObservationAge(lastObservedAt, now)}
            tone={state === 'delayed' ? 'amber' : 'slate'}
          />
        </div>
      </div>
      {state === 'delayed' && (
        <p className="live-evidence-caution">
          Source timestamps are older than 20 minutes. Check the observation time before using a
          price.
        </p>
      )}
    </section>
  );
}
