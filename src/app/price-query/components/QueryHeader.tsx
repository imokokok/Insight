'use client';

import { useQueryData, useQueryParams } from '../contexts';

import UnifiedExportSection from './UnifiedExportSection';

export function QueryHeader() {
  const { selectedSymbol } = useQueryParams();
  const { queryResults, isLoading: loading, stats } = useQueryData();

  const { avgPrice, maxPrice, minPrice, priceRange, standardDeviation, standardDeviationPercent } =
    stats;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Price Query</h1>
        <p className="text-sm text-gray-500 mt-1">Query oracle prices across multiple chains</p>
      </div>

      <div className="flex items-center gap-2">
        <UnifiedExportSection
          loading={loading}
          queryResults={queryResults}
          selectedSymbol={selectedSymbol}
          avgPrice={avgPrice}
          maxPrice={maxPrice}
          minPrice={minPrice}
          priceRange={priceRange}
          standardDeviation={standardDeviation}
          standardDeviationPercent={standardDeviationPercent}
        />
      </div>
    </div>
  );
}
