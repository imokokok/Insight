'use client';

import { useMemo } from 'react';

import { DataSourceList, type DataSourceGroup } from '@/components/data-transparency';
import { OracleProvider } from '@/types/oracle';

import { type QueryResult } from '../constants';

interface DataSourceSectionProps {
  results: QueryResult[];
  lastUpdated: Date | null;
  onRefresh: () => void;
  isLoading: boolean;
  error?: Error | null;
  chartContainerRef?: React.RefObject<HTMLDivElement | null>;
}

// Map oracle provider to credibility level based on reputation
function getCredibilityLevel(provider: OracleProvider): 'high' | 'medium' | 'low' | 'unverified' {
  const highCredibility: OracleProvider[] = [OracleProvider.CHAINLINK, OracleProvider.PYTH];
  const mediumCredibility: OracleProvider[] = [
    OracleProvider.API3,
    OracleProvider.REDSTONE,
    OracleProvider.DIA,
  ];

  if (highCredibility.includes(provider)) return 'high';
  if (mediumCredibility.includes(provider)) return 'medium';
  return 'low';
}

// Calculate confidence based on price data quality
function calculateConfidence(result: QueryResult): number {
  let confidence = result.priceData.confidence ?? 0.7;

  const age = Date.now() - result.priceData.timestamp;
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
  const dataSources: DataSourceGroup[] = useMemo(() => {
    return results.map((result) => ({
      provider: result.provider,
      chain: result.chain,
      confidence: calculateConfidence(result),
      confidenceSource: result.priceData.confidenceSource,
      source: result.priceData.source,
      credibilityLevel: getCredibilityLevel(result.provider),
      lastUpdated: result.priceData.timestamp,
    }));
  }, [results]);

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
      initiallyExpanded={false}
      maxVisible={5}
    />
  );
}
