'use client';

import { useMemo, useState } from 'react';

import type { Incident } from '@/lib/api/services/incidentService';

import { Badge, EmptyState, tableCls, thCls, trCls } from '../ui';

function severityTone(sev: string): 'default' | 'warn' | 'bad' {
  if (sev === 'critical' || sev === 'high') return 'bad';
  if (sev === 'medium') return 'warn';
  return 'default';
}

function incidentWhen(inc: Incident): string | null {
  return inc.type === 'feed_failure' ? inc.lastFailureAt : inc.snapshotTime;
}

export default function IncidentsTable({ incidents }: { incidents: Incident[] }) {
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return incidents;
    return incidents.filter(
      (inc) =>
        inc.provider.toLowerCase().includes(s) ||
        inc.symbol.toLowerCase().includes(s) ||
        inc.type.toLowerCase().includes(s) ||
        inc.severity.toLowerCase().includes(s)
    );
  }, [q, incidents]);

  return (
    <div>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="搜索 provider / symbol / 类型 / 严重度"
        className="mb-3 w-full max-w-sm px-3 py-1.5 rounded-lg text-sm border border-slate-200 bg-white text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300"
      />
      <div className="overflow-x-auto max-h-[60vh]">
        <table className={tableCls}>
          <thead>
            <tr>
              <th className={thCls}>Severity</th>
              <th className={thCls}>Type</th>
              <th className={thCls}>Provider</th>
              <th className={thCls}>Symbol</th>
              <th className={thCls}>Status</th>
              <th className={thCls}>When</th>
              <th className={thCls}>Detail</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState message="无匹配的 incident" />
                </td>
              </tr>
            ) : (
              filtered.map((inc, i) => {
                const when = incidentWhen(inc);
                return (
                  <tr key={`${inc.type}-${inc.provider}-${inc.symbol}-${i}`} className={trCls}>
                    <td className="py-2 pr-3">
                      <Badge tone={severityTone(inc.severity)}>{inc.severity}</Badge>
                    </td>
                    <td className="py-2 pr-3">
                      <Badge tone="default">{inc.type}</Badge>
                    </td>
                    <td className="py-2 pr-3 font-medium text-slate-800">{inc.provider}</td>
                    <td className="py-2 pr-3 text-slate-700">{inc.symbol}</td>
                    <td className="py-2 pr-3">
                      {inc.type === 'feed_failure' ? (
                        <Badge tone={inc.status === 'ongoing' ? 'bad' : 'good'}>{inc.status}</Badge>
                      ) : (
                        <span className="text-slate-400">recorded</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 tabular-nums text-slate-500">
                      {when ? new Date(when).toISOString().slice(0, 16).replace('T', ' ') : '—'}
                    </td>
                    <td className="py-2 pr-3 text-slate-600 max-w-md">{inc.description}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-400 mt-2">
        显示 {filtered.length} / {incidents.length}
      </p>
    </div>
  );
}
