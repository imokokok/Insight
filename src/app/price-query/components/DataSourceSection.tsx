'use client';

import { useMemo } from 'react';

import { DataSourceList, type DataSourceGroup } from '@/components/data-transparency';
import { useReputations } from '@/hooks/data/useReputations';
import {
  getCredibilityFromScore,
  getCredibilityFromVerification,
  type CredibilityLevel,
} from '@/lib/oracles/utils/reputationUtils';
import { type OracleProvider } from '@/types/oracle';

import { type QueryResult } from '../constants';

interface DataSourceSectionProps {
  results: QueryResult[];
  lastUpdated: Date | null;
  onRefresh: () => void;
  isLoading: boolean;
  error?: Error | null;
  chartContainerRef?: React.RefObject<HTMLDivElement | null>;
}

function getCredibilityLevel(
  _provider: OracleProvider,
  reputationScore: number | undefined,
  hasOnChainVerification: boolean,
  confidence: number
): CredibilityLevel {
  if (reputationScore !== undefined && reputationScore > 0) {
    return getCredibilityFromScore(reputationScore).level;
  }
  return getCredibilityFromVerification(hasOnChainVerification, confidence).level;
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
  const { data: reputationsData } = useReputations();

  const reputationMap = useMemo(() => {
    const map = new Map<OracleProvider, number>();
    reputationsData?.data.forEach((r) => {
      map.set(r.provider, r.overall_score);
    });
    return map;
  }, [reputationsData]);

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
