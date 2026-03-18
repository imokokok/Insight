'use client';

import { useTranslations } from 'next-intl';
import { DataSourceList, DataSourceGroup } from '@/components/data-transparency';
import { QueryResult } from '../constants';
import { useMemo } from 'react';
import { OracleProvider } from '@/types/oracle';

interface DataSourceSectionProps {
  results: QueryResult[];
  lastUpdated: Date | null;
  onRefresh: () => void;
  isLoading: boolean;
  error?: Error | null;
}

// Map oracle provider to credibility level based on reputation
function getCredibilityLevel(provider: OracleProvider): 'high' | 'medium' | 'low' | 'unverified' {
  const highCredibility: OracleProvider[] = [
    OracleProvider.CHAINLINK,
    OracleProvider.PYTH,
    OracleProvider.CHRONICLE,
  ];
  const mediumCredibility: OracleProvider[] = [
    OracleProvider.API3,
    OracleProvider.BAND_PROTOCOL,
    OracleProvider.REDSTONE,
    OracleProvider.DIA,
  ];

  if (highCredibility.includes(provider)) return 'high';
  if (mediumCredibility.includes(provider)) return 'medium';
  return 'low';
}

// Calculate confidence based on price data quality
function calculateConfidence(result: QueryResult): number {
  let confidence = 0.7; // Base confidence

  // Adjust based on available data
  if (result.priceData.confidence !== undefined) {
    confidence = result.priceData.confidence;
  }

  // Boost for recent data
  const age = Date.now() - result.priceData.timestamp;
  if (age < 60000)
    confidence += 0.1; // Less than 1 minute
  else if (age > 300000) confidence -= 0.1; // More than 5 minutes

  // Cap at 0-1 range
  return Math.max(0, Math.min(1, confidence));
}

export function DataSourceSection({
  results,
  lastUpdated,
  onRefresh,
  isLoading,
  error,
}: DataSourceSectionProps) {
  const t = useTranslations();

  const dataSources: DataSourceGroup[] = useMemo(() => {
    return results.map((result) => ({
      provider: result.provider,
      chain: result.chain,
      confidence: calculateConfidence(result),
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
      title={t('priceQuery.dataSources.title')}
      className="mb-6"
      showUpdateTime
      initiallyExpanded={false}
      maxVisible={5}
    />
  );
}

export default DataSourceSection;
