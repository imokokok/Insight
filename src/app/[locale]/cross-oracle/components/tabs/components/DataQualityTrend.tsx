'use client';

import type { OracleProvider } from '@/types/oracle';

import type { QualityTrendData } from '../../../types/index';

interface DataQualityTrendProps {
  data: QualityTrendData[];
  oracleNames: Record<string, string>;
}

export function DataQualityTrend({
  data: _data,
  oracleNames: _oracleNames,
}: DataQualityTrendProps) {
  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <p className="text-sm text-gray-500">Data Quality Trend Chart (Placeholder)</p>
    </div>
  );
}
