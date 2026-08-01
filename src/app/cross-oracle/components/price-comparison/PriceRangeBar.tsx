'use client';

import { memo } from 'react';

import { formatPrice } from '@/lib/utils/format';

interface PriceRangeBarProps {
  minPrice: number;
  maxPrice: number;
  medianPrice: number;
  currentPrice?: number;
}

function PriceRangeBarComponent({
  minPrice,
  maxPrice,
  medianPrice,
  currentPrice,
}: PriceRangeBarProps) {
  if (minPrice === maxPrice) {
    return (
      <div className="w-full">
        <div className="h-2 bg-blue-500 rounded-full" />
        <div className="flex justify-between mt-1 text-xs text-gray-500">
          <span>{formatPrice(minPrice)}</span>
          <span>{formatPrice(maxPrice)}</span>
        </div>
      </div>
    );
  }

  const range = maxPrice - minPrice;
  const medianPosition = ((medianPrice - minPrice) / range) * 100;
  const currentPosition = currentPrice ? ((currentPrice - minPrice) / range) * 100 : null;

  return (
    <div className="w-full">
      <div className="relative h-3 bg-gradient-to-r from-blue-200 via-blue-400 to-blue-600 rounded-full overflow-hidden">
        <div
          className="absolute top-0 bottom-0 w-1 bg-white border-2 border-gray-800 transform -translate-x-1/2"
          style={{ left: `${medianPosition}%` }}
          title={`Median: ${formatPrice(medianPrice)}`}
        />

        {currentPosition !== null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full transform -translate-x-1/2 shadow-sm"
            style={{ left: `${currentPosition}%` }}
            title={`Current: ${formatPrice(currentPrice!)}`}
          />
        )}
      </div>

      <div className="flex justify-between mt-2 text-xs">
        <div className="text-left">
          <span className="text-gray-400">Min</span>
          <div className="font-medium text-gray-700">{formatPrice(minPrice)}</div>
        </div>
        <div className="text-center">
          <span className="text-gray-400">Median</span>
          <div className="font-medium text-gray-900">{formatPrice(medianPrice)}</div>
        </div>
        <div className="text-right">
          <span className="text-gray-400">Max</span>
          <div className="font-medium text-gray-700">{formatPrice(maxPrice)}</div>
        </div>
      </div>
    </div>
  );
}

export const PriceRangeBar = memo(PriceRangeBarComponent);
PriceRangeBar.displayName = 'PriceRangeBar';
