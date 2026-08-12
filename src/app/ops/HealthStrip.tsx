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
    <div className="max-w-6xl mx-auto px-6 pt-8 mb-6 flex flex-wrap items-center gap-2">
      {items.map((it) => (
        <span
          key={it.label}
          className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${TONE_DOT[it.tone]}`} />
          <span className="text-gray-500">{it.label}</span>
          <span className="font-mono tabular-nums font-medium text-gray-900">{it.value}</span>
        </span>
      ))}
      {s.partial && <span className="text-xs text-warning-600">部分数据可能不完整</span>}
    </div>
  );
}
