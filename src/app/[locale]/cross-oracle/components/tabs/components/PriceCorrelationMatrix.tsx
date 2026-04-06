'use client';

import type { OraclePriceSeries } from '../../../types/index';

interface PriceCorrelationMatrixProps {
  data: OraclePriceSeries[];
  oracleNames: Record<string, string>;
}

export function PriceCorrelationMatrix({
  data: _data,
  oracleNames: _oracleNames,
}: PriceCorrelationMatrixProps) {
  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <p className="text-sm text-gray-500">Price Correlation Matrix (Placeholder)</p>
    </div>
  );
}
