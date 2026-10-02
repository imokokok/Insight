'use client';

import { Activity, Radio } from 'lucide-react';

import { useQueryDataStable } from '../contexts';

export function QueryResultsLoading() {
  const { queryProgress, currentQueryTarget } = useQueryDataStable();
  const progress =
    queryProgress.total > 0
      ? Math.min(100, (queryProgress.completed / queryProgress.total) * 100)
      : 8;

  return (
    <div className="query-loading-stage editorial-panel" aria-busy="true">
      <div className="query-loading-topline">
        <span className="workbench-kicker">02 / Live observation</span>
        <span className="query-loading-count font-mono text-xs">
          {queryProgress.completed} / {queryProgress.total || '—'} sources
        </span>
      </div>
      <div className="query-loading-body">
        <div className="query-loading-visual" aria-hidden="true">
          <div className="query-loading-orbit query-loading-orbit-outer" />
          <div className="query-loading-orbit query-loading-orbit-inner" />
          <div className="query-loading-core">
            <Activity className="h-7 w-7" />
          </div>
          <span className="query-loading-crosshair query-loading-crosshair-x" />
          <span className="query-loading-crosshair query-loading-crosshair-y" />
        </div>
        <div className="query-loading-copy">
          <div className="mb-4 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
            <Radio className="h-4 w-4 animate-pulse" aria-hidden="true" />
            Reading source data
          </div>
          <h3 className="font-display text-3xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-4xl">
            Following the price back to its source.
          </h3>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-600">
            Resolving the latest observation, update time and source metadata before showing the
            record.
          </p>
          <p className="mt-5 font-mono text-xs text-slate-500" aria-live="polite">
            {currentQueryTarget.oracle && currentQueryTarget.chain
              ? `Now checking ${currentQueryTarget.oracle} on ${currentQueryTarget.chain}`
              : 'Preparing oracle requests'}
          </p>
        </div>
      </div>
      <div
        className="query-loading-track"
        role="progressbar"
        aria-label="Oracle query progress"
        aria-valuemin={0}
        aria-valuemax={Math.max(queryProgress.total, 1)}
        aria-valuenow={queryProgress.completed}
      >
        <span style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
