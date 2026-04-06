'use client';

import type { OracleProvider } from '@/types/oracle';

interface MovingAverageChartProps {
  data: { oracle: OracleProvider; prices: { timestamp: number; price: number }[] }[];
  oracleNames: Record<string, string>;
}

export function MovingAverageChart({
  data: _data,
  oracleNames: _oracleNames,
}: MovingAverageChartProps) {
  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <p className="text-sm text-gray-500">Moving Average Chart (Placeholder)</p>
    </div>
  );
}
