'use client';

import { useMemo } from 'react';

import { DataSourceList, type DataSourceGroup } from '@/components/data-transparency';
import { getCredibilityLevel, useReputationMap } from '@/lib/oracles/utils/dataSourceUtils';

import { type QueryResult } from '../constants';

interface DataSourceSectionProps {
  results: QueryResult[];
  lastUpdated: Date | null;
  onRefresh: () => void;
  isLoading: boolean;
  error?: Error | null;
  chartContainerRef?: React.RefObject<HTMLDivElement | null>;
}

function calculateConfidence(result: QueryResult): number {
  let confidence = result.priceData.confidence ?? 0.7;

  const age = Date.now() - (result.priceData.ingestionTimestamp ?? result.priceData.timestamp);
  if (age < 60000) {
    confidence = Math.min(1, confidence + 0.1);
  } else if (age > 300000) {
    confidence = Math.max(0, confidence - 0.1);
  }

  return Math.max(0, Math.min(1, confidence));
}

export function DataSourceSection({
  results,
  lastUpdated,
  onRefresh,
  isLoading,
  error,
  chartContainerRef: _chartContainerRef,
}: DataSourceSectionProps) {
  const reputationMap = useReputationMap();

  const dataSources: DataSourceGroup[] = useMemo(() => {
    return results.map((result) => {
      const confidence = calculateConfidence(result);
      const reputationScore = reputationMap.get(result.provider);
      const hasOnChainVerification = result.priceData.verification?.type === 'on-chain';

      return {
        provider: result.provider,
        chain: result.chain,
        confidence,
        confidenceSource: result.priceData.confidenceSource,
        source: result.priceData.source,
        credibilityLevel: getCredibilityLevel(
          result.provider,
          reputationScore,
          hasOnChainVerification,
          confidence
        ),
        lastUpdated: result.priceData.timestamp,
        verification: result.priceData.verification,
        metadataFallback: result.priceData.metadataFallback,
      };
    });
  }, [results, reputationMap]);

  if (results.length === 0) {
    return null;
  }

  return (
    <DataSourceList
      sources={dataSources}
      lastUpdated={lastUpdated}
      onRefresh={onRefresh}
      isLoading={isLoading}
      error={error}
      title="Data Sources"
      className="mb-6"
      showUpdateTime
      initiallyExpanded={true}
      maxVisible={5}
    />
  );
}
