'use client';

import { memo, useMemo } from 'react';

import { BarChart3 } from 'lucide-react';

import { DispersionGauge } from './DispersionGauge';

interface PriceDispersionCardProps {
  standardDeviation: number;
  avgPrice: number;
  oracleCount: number;
}

function PriceDispersionCardComponent({
  standardDeviation,
  avgPrice,
  oracleCount,
}: PriceDispersionCardProps) {
  const cv = useMemo(() => {
    if (avgPrice === 0) return 0;
    return (standardDeviation / avgPrice) * 100;
  }, [standardDeviation, avgPrice]);

  const standardError = useMemo(() => {
    if (oracleCount === 0) return 0;
    return standardDeviation / Math.sqrt(oracleCount);
  }, [standardDeviation, oracleCount]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-4 h-4 text-purple-500" />
        <span className="text-sm font-medium text-gray-500">Price Dispersion</span>
      </div>

      <DispersionGauge cv={cv} size={100} />

      <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
        <div className="text-center group relative">
          <div className="text-lg font-semibold text-gray-900">{standardDeviation.toFixed(4)}</div>
          <div className="text-xs text-gray-500">Std Dev</div>
          <div
            className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-gray-900 rounded-md shadow-lg whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            role="tooltip"
          >
            Deviation of oracle quotes from mean, lower means higher consistency
            <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-gray-900 border-4 border-gray-900 border-l-transparent border-r-transparent border-b-transparent" />
          </div>
        </div>
        <div className="text-center group relative">
          <div className="text-lg font-semibold text-gray-900">{cv.toFixed(4)}%</div>
          <div className="text-xs text-gray-500">CV</div>
          <div
            className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs text-white bg-gray-900 rounded-md shadow-lg whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            role="tooltip"
          >
            Ratio of standard deviation to mean, for comparing volatility at different price levels
            <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 w-2 h-2 bg-gray-900 border-4 border-gray-900 border-l-transparent border-r-transparent border-b-transparent" />
          </div>
        </div>
        <div className="text-center border-t border-gray-100 pt-4">
          <div className="text-lg font-semibold text-gray-900">{standardError.toFixed(4)}</div>
          <div className="text-xs text-gray-500">Std Error</div>
        </div>
        <div className="text-center border-t border-gray-100 pt-4">
          <div className="text-lg font-semibold text-gray-900">{oracleCount}</div>
          <div className="text-xs text-gray-500">Sample Size</div>
        </div>
      </div>
    </div>
  );
}

export const PriceDispersionCard = memo(PriceDispersionCardComponent);
PriceDispersionCard.displayName = 'PriceDispersionCard';
