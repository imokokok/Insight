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
    blue: 'bg-blue-50/60 border-blue-100/80 text-blue-900',
    emerald: 'bg-emerald-50/60 border-emerald-100/80 text-emerald-900',
    amber: 'bg-amber-50/60 border-amber-100/80 text-amber-900',
    slate: 'bg-slate-50/80 border-slate-100 text-slate-900',
  };

  const iconToneStyles = {
    blue: 'text-blue-600',
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
    slate: 'text-slate-600',
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${toneStyles[tone]} transition-colors`}
    >
      <Icon className={`w-4 h-4 flex-shrink-0 ${iconToneStyles[tone]}`} />
      <div>
        <div className="text-xs text-slate-500 font-medium mb-0.5">{label}</div>
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
    <section className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-60 [animation-duration:2s]" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">Network Live</div>
            <div className="text-xs text-slate-500">
              Aggregated transparency feed refreshed every {updateInterval}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
