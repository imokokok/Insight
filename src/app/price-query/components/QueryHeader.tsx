'use client';

import { useQueryDataStable, useQueryParams } from '../contexts';

import UnifiedExportSection from './UnifiedExportSection';

export function QueryHeader() {
  const { selectedSymbol } = useQueryParams();
  const { queryResults, isLoading: loading, stats } = useQueryDataStable();

  const { avgPrice, maxPrice, minPrice, priceRange, standardDeviation, standardDeviationPercent } =
    stats;

  return (
    <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
      <div>
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-100 text-blue-700 text-[11px] font-semibold uppercase tracking-wider mb-3">
          On-Demand Oracle Prices
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
          Price Query
        </h1>
        <p className="text-base text-slate-500 mt-2 max-w-2xl">
          Query current oracle prices across providers and chains with on-chain verification
          metadata.
        </p>
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
