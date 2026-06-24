'use client';

import { useState, useEffect, useCallback } from 'react';

import { Clock, Info, Shield, Zap, Layers } from 'lucide-react';

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
    <span className="text-[11px] text-gray-400 flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 font-medium">
      <Clock className="w-3 h-3" />
      Next update in {remaining}
    </span>
  );
}

function ComparisonInfo() {
  return (
    <div className="bg-white rounded-xl border border-gray-200/60 p-4">
      <div className="flex items-start gap-3">
        <div className="p-1.5 rounded-lg bg-blue-50 flex-shrink-0">
          <Info className="w-4 h-4 text-blue-500" />
        </div>
        <div className="text-sm text-gray-600">
          <p className="font-bold text-gray-900 mb-1.5">About Oracle Directory</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0 mt-1.5" />
              <span>
                <strong className="text-gray-800">On-chain Oracles:</strong> Deploy smart contracts
                on blockchains for decentralized price feeds
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
              <span>
                <strong className="text-gray-800">API Oracles:</strong> Fetch data via off-chain
                APIs with faster update speeds
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0 mt-1.5" />
              <span>
                <strong className="text-gray-800">Reputation Scores:</strong> Rolling 7-day
                aggregate across all monitored symbols
              </span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 flex-shrink-0 mt-1.5" />
              <span>
                Click any provider card to view detailed performance metrics and trend charts
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
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
      color: 'text-violet-600',
      bg: 'bg-violet-50',
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map(({ icon: Icon, label, count, color, bg }) => (
        <div
          key={label}
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border',
            bg,
            color,
            color.replace('text-', 'border-').replace('600', '200')
          )}
        >
          <Icon className="w-3 h-3" />
          {label}
          <span className="ml-0.5 px-1 py-0 rounded bg-white/70 text-gray-700 font-bold">
            {count}
          </span>
        </div>
      ))}
    </div>
  );
}

export { NextUpdateCountdown, ComparisonInfo, TypeLegend };
