'use client';

import type { OraclePerformanceData } from '../../../types/index';

interface OraclePerformanceRankingProps {
  performanceData: OraclePerformanceData[];
}

export function OraclePerformanceRanking({
  performanceData: _performanceData,
}: OraclePerformanceRankingProps) {
  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <p className="text-sm text-gray-500">Oracle Performance Ranking (Placeholder)</p>
    </div>
  );
}
