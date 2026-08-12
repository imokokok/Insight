'use client';

import { useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

/**
 * Refresh + optional auto-refresh control for /ops pages. Auto-refresh defaults
 * OFF (an ops console should not hammer the DB unless the operator opts in); when
 * enabled it re-runs the server component every `intervalMs`.
 */
export default function RefreshControl({ intervalMs = 30000 }: { intervalMs?: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [auto, setAuto] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!auto) return undefined;
    timer.current = setInterval(() => {
      router.refresh();
    }, intervalMs);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [auto, intervalMs, router]);

  const onRefresh = async () => {
    setLoading(true);
    try {
      await router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <label className="flex items-center gap-1.5 text-xs text-slate-500 select-none cursor-pointer">
        <input
          type="checkbox"
          checked={auto}
          onChange={(e) => setAuto(e.target.checked)}
          className="rounded border-slate-300 text-slate-900 focus:ring-slate-400"
        />
        自动刷新
      </label>
      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className="px-3 py-1.5 rounded-lg text-sm border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-60"
      >
        {loading ? '刷新中…' : '刷新'}
      </button>
    </div>
  );
}
