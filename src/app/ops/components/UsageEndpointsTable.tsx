'use client';

import { useMemo, useState } from 'react';

import type { UsageByEndpoint } from '@/lib/ops/opsQueries';

import { Badge, EmptyState, formatCompact, tableCls, thCls, trCls } from '../ui';

import { downloadCsv, nextSort, sortRows, type SortState } from './tableUtils';

function cellValue(e: UsageByEndpoint, key: string): string | number {
  switch (key) {
    case 'requests':
      return e.requests;
    case 'errors':
      return e.errors;
    case 'avgMs':
      return e.avgMs ?? -1;
    default:
      return e.endpoint;
  }
}

type Col = { key: string; label: string; align?: 'right' };

const COLS: Col[] = [
  { key: 'endpoint', label: 'Endpoint' },
  { key: 'requests', label: 'Requests', align: 'right' },
  { key: 'errors', label: 'Errors', align: 'right' },
  { key: 'avgMs', label: 'Avg ms', align: 'right' },
];

export default function UsageEndpointsTable({ rows }: { rows: UsageByEndpoint[] }) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortState>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) => r.endpoint.toLowerCase().includes(s));
  }, [q, rows]);

  const sorted = useMemo(() => sortRows(filtered, sort, cellValue), [filtered, sort]);

  function exportCsv() {
    downloadCsv(
      'usage-endpoints.csv',
      ['endpoint', 'requests', 'errors', 'avg_ms'],
      filtered.map((e) => [e.endpoint, e.requests, e.errors, e.avgMs ?? ''])
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索 endpoint"
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
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={COLS.length}>
                  <EmptyState message="无匹配的 endpoint" />
                </td>
              </tr>
            ) : (
              sorted.map((e) => (
                <tr key={e.endpoint} className={trCls}>
                  <td className="py-2 pr-3 font-mono text-xs text-gray-700">{e.endpoint}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-gray-700">
                    {formatCompact(e.requests)}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">
                    {e.errors > 0 ? (
                      <Badge tone="warn">{e.errors}</Badge>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-gray-500">
                    {e.avgMs ?? '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-2">
        显示 {sorted.length} / {rows.length}
      </p>
    </div>
  );
}
