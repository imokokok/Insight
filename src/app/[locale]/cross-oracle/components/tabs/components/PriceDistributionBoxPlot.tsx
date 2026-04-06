'use client';

import type { OraclePriceData } from '../../../types/index';

interface PriceDistributionBoxPlotProps {
  data: OraclePriceData[];
  oracleNames: Record<string, string>;
}

export function PriceDistributionBoxPlot({
  data: _data,
  oracleNames: _oracleNames,
}: PriceDistributionBoxPlotProps) {
  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <p className="text-sm text-gray-500">Price Distribution Box Plot (Placeholder)</p>
    </div>
  );
}
