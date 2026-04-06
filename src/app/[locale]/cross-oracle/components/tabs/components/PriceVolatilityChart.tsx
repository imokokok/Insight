'use client';

import type { OraclePriceHistory } from '../../../types/index';

interface PriceVolatilityChartProps {
  data: OraclePriceHistory[];
  oracleNames: Record<string, string>;
}

export function PriceVolatilityChart({
  data: _data,
  oracleNames: _oracleNames,
}: PriceVolatilityChartProps) {
  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <p className="text-sm text-gray-500">Price Volatility Chart (Placeholder)</p>
    </div>
  );
}
