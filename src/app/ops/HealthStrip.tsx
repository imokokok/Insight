import { getOverviewStats } from '@/lib/ops/opsQueries';

import { TONE_DOT, type Tone } from './ui';

/**
 * Persistent, cross-tab system-health strip. Renders on every /ops page so the
 * operator always sees the headline status (signing rate / unsigned BLOCKs /
 * stale pipelines / 7d incidents) without switching tabs.
 */
export default async function HealthStrip() {
  const s = await getOverviewStats(24);

  const items: { label: string; value: string; tone: Tone }[] = [
    {
      label: '签名率',
      value: s.signedRatePct != null ? `${s.signedRatePct}%` : '—',
      tone: s.signedRatePct == null ? 'default' : s.signedRatePct < 100 ? 'warn' : 'good',
    },
    {
      label: '未签名 BLOCK',
      value: String(s.unsignedBlocks),
      tone: s.unsignedBlocks > 0 ? 'bad' : 'good',
    },
    { label: '陈旧 Cron', value: String(s.cronStale), tone: s.cronStale > 0 ? 'warn' : 'good' },
    { label: '事件 7d', value: String(s.incidents7d), tone: s.incidents7d > 0 ? 'bad' : 'default' },
  ];

  return (
    <div className="mx-auto mb-6 max-w-6xl px-6 pt-8">
      <div className="grid border-y border-slate-900/15 bg-white/45 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-slate-900/10">
        {items.map((it, index) => (
          <div key={it.label} className="border-b border-slate-900/10 px-4 py-3 lg:border-b-0">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-gray-500">
              <span className={`h-1.5 w-1.5 rounded-full ${TONE_DOT[it.tone]}`} />
              <span className="font-mono text-[9px] text-blue-700">0{index + 1}</span>
              {it.label}
            </div>
            <div className="mt-1 font-mono text-lg font-semibold tabular-nums text-slate-950">
              {it.value}
            </div>
          </div>
        ))}
      </div>
      {s.partial && <p className="mt-2 text-xs text-warning-600">部分数据可能不完整</p>}
    </div>
  );
}
