'use client';

import { EditorialWorkspaceHeader } from '@/components/editorial';

import { useQueryDataStable, useQueryParams } from '../contexts';

import UnifiedExportSection from './UnifiedExportSection';

export function QueryHeader() {
  const { selectedSymbol } = useQueryParams();
  const { queryResults, isLoading: loading, stats } = useQueryDataStable();

  const { avgPrice, maxPrice, minPrice, priceRange, standardDeviation, standardDeviationPercent } =
    stats;

  return (
    <EditorialWorkspaceHeader
      index="01"
      stage="Observe"
      eyebrow="On-demand oracle price inspection. Choose a provider, network, and asset to expose the record behind the number."
      title="Ask the source before trusting the price."
      description="Query current oracle prices with their chain, freshness, source metadata, and verification context kept together."
      evidence={['Source identity', 'Update freshness', 'Verification record']}
      action={
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
      }
    />
  );
}
