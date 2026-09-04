'use client';

import { useMemo, useState } from 'react';

import Link from 'next/link';

import type { Incident } from '@/lib/api/services/incidentService';

import { Badge, EmptyState, tableCls, thCls, trCls } from '../ui';

import { downloadCsv, nextSort, sortRows, type SortState } from './tableUtils';

function severityTone(sev: string): 'default' | 'warn' | 'bad' {
  if (sev === 'critical' || sev === 'high') return 'bad';
  if (sev === 'medium') return 'warn';
  return 'default';
}

function incidentWhen(inc: Incident): string | null {
  return inc.type === 'feed_failure' ? inc.lastFailureAt : inc.snapshotTime;
}

function incidentStatus(inc: Incident): string {
  return inc.type === 'feed_failure' ? inc.status : 'recorded';
}

function cellValue(inc: Incident, key: string): string | number {
  switch (key) {
    case 'severity':
      return inc.severity;
    case 'type':
      return inc.type;
    case 'provider':
      return inc.provider;
    case 'symbol':
      return inc.symbol;
    case 'status':
      return incidentStatus(inc);
    case 'when':
      return incidentWhen(inc) ?? '';
    case 'detail':
      return inc.description;
    default:
      return '';
  }
}

type Col = { key: string; label: string; align?: 'right' };

const COLS: Col[] = [
  { key: 'severity', label: 'Severity' },
  { key: 'type', label: 'Type' },
  { key: 'provider', label: 'Provider' },
  { key: 'symbol', label: 'Symbol' },
  { key: 'status', label: 'Status' },
  { key: 'when', label: 'When' },
  { key: 'detail', label: 'Detail' },
];

export default function IncidentsTable({ incidents }: { incidents: Incident[] }) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortState>(null);

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

  const rows = useMemo(() => sortRows(filtered, sort, cellValue), [filtered, sort]);

  function exportCsv() {
    downloadCsv(
      'incidents.csv',
      ['severity', 'type', 'provider', 'symbol', 'status', 'when', 'description'],
      filtered.map((inc) => [
        inc.severity,
        inc.type,
        inc.provider,
        inc.symbol,
        incidentStatus(inc),
        incidentWhen(inc) ?? '',
        inc.description,
      ])
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索 provider / symbol / 类型 / 严重度"
          className="min-w-[200px] max-w-sm flex-1 border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
        />
        <button
          type="button"
          onClick={exportCsv}
          className="inline-flex shrink-0 items-center gap-1.5 border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 transition-colors hover:border-primary-400 hover:text-primary-700"
        >
          导出 CSV
        </button>
      </div>
      <div className="max-h-[60vh] overflow-x-auto border-y border-slate-900/10">
        <table className={tableCls}>
          <thead>
            <tr>
              {COLS.map((c) => (
                <th key={c.key} className={`${thCls} ${c.align === 'right' ? 'text-right' : ''}`}>
                  <button
                    type="button"
                    onClick={() => setSort((prev) => nextSort(prev, c.key))}
                    className={`inline-flex items-center gap-1 hover:text-gray-700 ${c.align === 'right' ? 'w-full justify-end' : ''}`}
                  >
                    {c.label}
                    <span className="text-[10px] text-gray-400">
                      {sort?.key === c.key ? (sort.dir === 'asc' ? '▲' : '▼') : '⇅'}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={COLS.length}>
                  <EmptyState message="无匹配的 incident" />
                </td>
              </tr>
            ) : (
              rows.map((inc, i) => {
                const when = incidentWhen(inc);
                return (
                  <tr key={`${inc.type}-${inc.provider}-${inc.symbol}-${i}`} className={trCls}>
                    <td className="py-2 pr-3">
                      <Badge tone={severityTone(inc.severity)}>{inc.severity}</Badge>
                    </td>
                    <td className="py-2 pr-3">
                      <Badge tone="default">{inc.type}</Badge>
                    </td>
                    <td className="py-2 pr-3 font-medium text-gray-800">
                      <Link
                        href={`/ops/feeds?provider=${encodeURIComponent(inc.provider)}`}
                        className="text-primary-700 hover:underline"
                        title={`查看 ${inc.provider} 的 feeds`}
                      >
                        {inc.provider}
                      </Link>
                    </td>
                    <td className="py-2 pr-3 text-gray-700">{inc.symbol}</td>
                    <td className="py-2 pr-3">
                      {inc.type === 'feed_failure' ? (
                        <Badge tone={inc.status === 'ongoing' ? 'bad' : 'good'}>{inc.status}</Badge>
                      ) : (
                        <span className="text-gray-400">recorded</span>
                      )}
                    </td>
                    <td className="py-2 pr-3 tabular-nums text-gray-500">
                      {when ? new Date(when).toISOString().slice(0, 16).replace('T', ' ') : '—'}
                    </td>
                    <td className="py-2 pr-3 text-gray-600 max-w-md">{inc.description}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-2">
        显示 {rows.length} / {incidents.length}
      </p>
    </div>
  );
}
