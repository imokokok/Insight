'use client';

import { useMemo, useState } from 'react';

import type { FeedRow } from '@/lib/ops/opsQueries';

import { Badge, EmptyState, tableCls, thCls, trCls } from '../ui';

import { downloadCsv, nextSort, sortRows, type SortState } from './tableUtils';

function reasonTone(reason: string | null): 'default' | 'warn' | 'bad' {
  if (reason === 'discover_pruned') return 'warn';
  if (reason === 'health_failed') return 'bad';
  return 'default';
}

function cellValue(f: FeedRow, key: string): string | number {
  switch (key) {
    case 'provider':
      return f.provider;
    case 'symbol':
      return f.symbol;
    case 'chain_id':
      return f.chain_id;
    case 'consecutive_failures':
      return f.consecutive_failures;
    case 'is_active':
      return f.is_active ? 'active' : 'inactive';
    case 'last_success_at':
      return f.last_success_at ?? '';
    case 'deactivated_reason':
      return f.deactivated_reason ?? '';
    default:
      return '';
  }
}

type Col = { key: string; label: string; align?: 'right' };

const COLS: Col[] = [
  { key: 'provider', label: 'Provider' },
  { key: 'symbol', label: 'Symbol' },
  { key: 'chain_id', label: 'Chain', align: 'right' },
  { key: 'consecutive_failures', label: 'Fails', align: 'right' },
  { key: 'last_success_at', label: 'Last success' },
  { key: 'deactivated_reason', label: 'Reason' },
  { key: 'is_active', label: 'Status' },
];

export default function FeedsTable({ feeds }: { feeds: FeedRow[] }) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<SortState>(null);

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

  const rows = useMemo(() => sortRows(filtered, sort, cellValue), [filtered, sort]);

  function exportCsv() {
    downloadCsv(
      'feeds.csv',
      [
        'provider',
        'symbol',
        'chain_id',
        'consecutive_failures',
        'last_success_at',
        'deactivated_reason',
        'status',
      ],
      filtered.map((f) => [
        f.provider,
        f.symbol,
        f.chain_id,
        f.consecutive_failures,
        f.last_success_at ?? '',
        f.deactivated_reason ?? '',
        f.is_active ? 'active' : 'inactive',
      ])
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索 provider / symbol / 原因"
          className="flex-1 min-w-[200px] max-w-sm px-3 py-1.5 rounded-lg text-sm border border-gray-200 bg-white text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-200"
        />
        <button
          type="button"
          onClick={exportCsv}
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
        >
          导出 CSV
        </button>
      </div>
      <div className="overflow-x-auto max-h-[60vh]">
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
                  <EmptyState message="无匹配的 feed" />
                </td>
              </tr>
            ) : (
              rows.map((f, i) => (
                <tr key={`${f.provider}-${f.symbol}-${f.chain_id}-${i}`} className={trCls}>
                  <td className="py-2 pr-3 font-medium text-gray-800">{f.provider}</td>
                  <td className="py-2 pr-3 text-gray-700">{f.symbol}</td>
                  <td className="py-2 pr-3 tabular-nums text-gray-500">{f.chain_id}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-gray-700">
                    {f.consecutive_failures}
                  </td>
                  <td className="py-2 pr-3 tabular-nums text-gray-500">
                    {f.last_success_at
                      ? new Date(f.last_success_at).toISOString().slice(0, 16).replace('T', ' ')
                      : '—'}
                  </td>
                  <td className="py-2 pr-3">
                    {f.deactivated_reason ? (
                      <Badge tone={reasonTone(f.deactivated_reason)}>{f.deactivated_reason}</Badge>
                    ) : (
                      <span className="text-gray-400">—</span>
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
      <p className="text-xs text-gray-400 mt-2">
        显示 {rows.length} / {feeds.length}
      </p>
    </div>
  );
}
