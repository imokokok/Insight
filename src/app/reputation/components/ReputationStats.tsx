'use client';

import { useState, useEffect, useCallback } from 'react';

import { Clock, Shield, Zap, Layers } from 'lucide-react';

import { cn } from '@/lib/utils';

function NextUpdateCountdown({ nextRecalcAt }: { nextRecalcAt: string | null | undefined }) {
  const computeRemaining = useCallback(() => {
    if (!nextRecalcAt) return '';
    const diff = new Date(nextRecalcAt).getTime() - Date.now();
    if (diff <= 0) return 'soon';
    const m = Math.floor(diff / 60000);
    if (m < 1) return '<1m';
    if (m < 60) return `${m}m`;
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  }, [nextRecalcAt]);

  const [remaining, setRemaining] = useState(computeRemaining);

  useEffect(() => {
    if (!nextRecalcAt) return;
    const t = setInterval(() => setRemaining(computeRemaining), 30000);
    return () => clearInterval(t);
  }, [nextRecalcAt, computeRemaining]);

  if (!nextRecalcAt || !remaining) return null;
  return (
    <span className="flex items-center gap-1.5 border border-slate-200 bg-white px-3 py-2 text-[11px] font-medium text-slate-500">
      <Clock className="w-3 h-3" />
      Next update in {remaining}
    </span>
  );
}

function TypeLegend({
  onchainCount,
  apiCount,
  hybridCount,
}: {
  onchainCount: number;
  apiCount: number;
  hybridCount: number;
}) {
  const items = [
    {
      icon: Shield,
      label: 'On-chain',
      count: onchainCount,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    { icon: Zap, label: 'API', count: apiCount, color: 'text-blue-600', bg: 'bg-blue-50' },
    {
      icon: Layers,
      label: 'Hybrid',
      count: hybridCount,
      color: 'text-slate-700',
      bg: 'bg-slate-100',
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map(({ icon: Icon, label, count, color, bg }) => (
        <div
          key={label}
          className={cn(
            'inline-flex items-center gap-1.5 border px-2.5 py-1 text-[11px] font-semibold',
            bg,
            color,
            color.replace('text-', 'border-').replace('600', '200')
          )}
        >
          <Icon className="w-3 h-3" />
          {label}
          <span className="ml-0.5 px-1 py-0 rounded bg-white/70 text-slate-700 font-bold">
            {count}
          </span>
        </div>
      ))}
    </div>
  );
}

export { NextUpdateCountdown, TypeLegend };
