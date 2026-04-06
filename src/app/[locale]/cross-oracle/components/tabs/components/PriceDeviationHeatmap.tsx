'use client';

import type { PriceDeviationDataPoint } from '../../../types/index';

interface PriceDeviationHeatmapProps {
  data: PriceDeviationDataPoint[];
  useAccessibleColors?: boolean;
}

export function PriceDeviationHeatmap({
  data: _data,
  useAccessibleColors: _useAccessibleColors,
}: PriceDeviationHeatmapProps) {
  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <p className="text-sm text-gray-500">Price Deviation Heatmap (Placeholder)</p>
    </div>
  );
}
