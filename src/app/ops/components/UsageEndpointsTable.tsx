'use client';

import { useMemo, useState } from 'react';

import type { UsageByEndpoint } from '@/lib/ops/opsQueries';

import { Badge, EmptyState, formatCompact, tableCls, thCls, trCls } from '../ui';

export default function UsageEndpointsTable({ rows }: { rows: UsageByEndpoint[] }) {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => r.endpoint.toLowerCase().includes(s));
  }, [q, rows]);

  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="搜索 endpoint"
        className="mb-3 w-full max-w-sm px-3 py-1.5 rounded-lg text-sm border border-slate-200 bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
      />
      <div className="overflow-x-auto max-h-[60vh]">
        <table className={tableCls}>
          <thead>
            <tr>
              <th className={thCls}>Endpoint</th>
              <th className={`${thCls} text-right`}>Requests</th>
              <th className={`${thCls} text-right`}>Errors</th>
              <th className={`${thCls} text-right`}>Avg ms</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <EmptyState message="无匹配的 endpoint" />
                </td>
              </tr>
            ) : (
              filtered.map((e) => (
                <tr key={e.endpoint} className={trCls}>
                  <td className="py-2 pr-3 font-mono text-xs text-slate-700">{e.endpoint}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-slate-700">
                    {formatCompact(e.requests)}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {e.errors > 0 ? (
                      <Badge tone="warn">{e.errors}</Badge>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-slate-500">
                    {e.avgMs ?? '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400 mt-2">
        显示 {filtered.length} / {rows.length}
      </p>
    </div>
  );
}
