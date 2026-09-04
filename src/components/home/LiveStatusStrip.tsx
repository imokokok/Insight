import { BarChart3, Clock, Layers, ShieldCheck } from 'lucide-react';

interface LiveStatusStripProps {
  activeProviders: number;
  totalProviders: number;
  avgSpread: number;
  healthyCount: number;
  totalAssets: number;
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
      className={`flex min-w-0 items-center gap-3 px-4 py-3 ${toneStyles[tone]} transition-colors`}
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

export function LiveStatusStrip({
  activeProviders,
  totalProviders,
  avgSpread,
  healthyCount,
  totalAssets,
  updateInterval = '30s',
}: LiveStatusStripProps) {
  const spreadTone = avgSpread > 1 ? 'amber' : avgSpread > 0 ? 'emerald' : 'slate';

  return (
    <section className="border-y border-slate-900/15 bg-white/30 py-4 backdrop-blur-sm sm:py-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4 px-4 lg:pr-7">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 [animation-duration:2s]" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-950">Network live</div>
            <div className="text-xs text-slate-500">
              Independent feed comparison refreshed every {updateInterval}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 divide-x divide-y divide-slate-900/10 border-y border-slate-900/10 sm:grid-cols-4 sm:divide-y-0 lg:border-y-0">
          <StatCard
            icon={Layers}
            label="Active Oracles"
            value={`${activeProviders}/${totalProviders}`}
            tone="blue"
          />
          <StatCard
            icon={BarChart3}
            label="Avg Spread"
            value={avgSpread > 0 ? `${avgSpread.toFixed(3)}%` : '—'}
            tone={spreadTone}
          />
          <StatCard
            icon={ShieldCheck}
            label="Healthy Assets"
            value={`${healthyCount}/${totalAssets}`}
            tone="emerald"
          />
          <StatCard icon={Clock} label="Update Interval" value={updateInterval} tone="slate" />
        </div>
      </div>
    </section>
  );
}
