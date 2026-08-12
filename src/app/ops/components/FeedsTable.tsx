'use client';

import { useMemo, useState } from 'react';

import type { FeedRow } from '@/lib/ops/opsQueries';

import { Badge, EmptyState, tableCls, thCls, trCls } from '../ui';

function reasonTone(reason: string | null): 'default' | 'warn' | 'bad' {
  if (reason === 'discover_pruned') return 'warn';
  if (reason === 'health_failed') return 'bad';
  return 'default';
}

export default function FeedsTable({ feeds }: { feeds: FeedRow[] }) {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return feeds;
    return feeds.filter(
      (f) =>
        f.provider.toLowerCase().includes(s) ||
        f.symbol.toLowerCase().includes(s) ||
        (f.deactivated_reason ?? '').toLowerCase().includes(s)
    );
  }, [q, feeds]);

  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="搜索 provider / symbol / 原因"
        className="mb-3 w-full max-w-sm px-3 py-1.5 rounded-lg text-sm border border-slate-200 bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
      />
      <div className="overflow-x-auto max-h-[60vh]">
        <table className={tableCls}>
          <thead>
            <tr>
              <th className={thCls}>Provider</th>
              <th className={thCls}>Symbol</th>
              <th className={thCls}>Chain</th>
              <th className={`${thCls} text-right`}>Fails</th>
              <th className={thCls}>Last success</th>
              <th className={thCls}>Reason</th>
              <th className={thCls}>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState message="无匹配的 feed" />
                </td>
              </tr>
            ) : (
              filtered.map((f, i) => (
                <tr key={`${f.provider}-${f.symbol}-${f.chain_id}-${i}`} className={trCls}>
                  <td className="py-2 pr-3 font-medium text-slate-800">{f.provider}</td>
                  <td className="py-2 pr-3 text-slate-700">{f.symbol}</td>
                  <td className="py-2 pr-3 tabular-nums text-slate-500">{f.chain_id}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-slate-700">
                    {f.consecutive_failures}
                  </td>
                  <td className="py-2 pr-3 tabular-nums text-slate-500">
                    {f.last_success_at
                      ? new Date(f.last_success_at).toISOString().slice(0, 16).replace('T', ' ')
                      : '—'}
                  </td>
                  <td className="py-2 pr-3">
                    {f.deactivated_reason ? (
                      <Badge tone={reasonTone(f.deactivated_reason)}>{f.deactivated_reason}</Badge>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    {f.is_active ? (
                      <Badge tone="good">active</Badge>
                    ) : (
                      <Badge tone="default">inactive</Badge>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400 mt-2">
        显示 {filtered.length} / {feeds.length}
      </p>
    </div>
  );
}
