'use client';

import { memo, useMemo } from 'react';

import dynamic from 'next/dynamic';

import { BarChart3 } from 'lucide-react';

const DispersionGauge = dynamic(() => import('./DispersionGauge').then((m) => m.DispersionGauge), {
  ssr: false,
});

interface PriceDispersionCardProps {
  standardDeviation: number;
  avgPrice: number;
  oracleCount: number;
}

function PriceDispersionCardComponent({ standardDeviation, avgPrice }: PriceDispersionCardProps) {
  const cv = useMemo(() => {
    if (avgPrice === 0) return 0;
    return standardDeviation / avgPrice;
  }, [standardDeviation, avgPrice]);

  return (
    <div className="border-y border-slate-900/15 bg-white/55 p-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="h-4 w-4 text-blue-600" />
        <span className="text-sm font-medium text-gray-500">Price Dispersion</span>
      </div>

      <DispersionGauge cv={cv} size={100} />

      <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
        <div className="text-center group relative">
          <div className="text-lg font-semibold text-gray-900">{standardDeviation.toFixed(4)}</div>
          <div className="text-xs text-gray-500">Std Dev</div>
          <div
            className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap border border-slate-700 bg-gray-900 px-3 py-2 text-xs text-white opacity-0 shadow-[0_16px_40px_rgba(15,23,42,0.18)] transition-opacity duration-200 group-hover:opacity-100"
            role="tooltip"
          >
            Deviation of oracle quotes from mean; lower values indicate higher consistency.
            <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-gray-900 border-4 border-gray-900 border-l-transparent border-r-transparent border-b-transparent" />
          </div>
        </div>
        <div className="text-center group relative">
          <div className="text-lg font-semibold text-gray-900">{(cv * 100).toFixed(4)}%</div>
          <div className="text-xs text-gray-500">CV</div>
          <div
            className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap border border-slate-700 bg-gray-900 px-3 py-2 text-xs text-white opacity-0 shadow-[0_16px_40px_rgba(15,23,42,0.18)] transition-opacity duration-200 group-hover:opacity-100"
            role="tooltip"
          >
            Coefficient of Variation — ratio of standard deviation to mean. Enables comparison
            across different price levels. &lt;1% is excellent, 1-3% moderate, &gt;3% high
            dispersion.
            <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-gray-900 border-4 border-gray-900 border-l-transparent border-r-transparent border-b-transparent" />
          </div>
        </div>
      </div>
    </div>
  );
}

export const PriceDispersionCard = memo(PriceDispersionCardComponent);
PriceDispersionCard.displayName = 'PriceDispersionCard';
