'use client';

import { useMemo } from 'react';

import { useReputations } from '@/hooks/data/useReputations';
import {
  getCredibilityFromScore,
  getCredibilityFromVerification,
  type CredibilityLevel,
} from '@/lib/oracles/utils/reputationUtils';
import { type OracleProvider } from '@/types/oracle';

export type { CredibilityLevel };

export function getCredibilityLevel(
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

export function useReputationMap(): Map<OracleProvider, number> {
  const { data: reputationsData } = useReputations();

  return useMemo(() => {
    const map = new Map<OracleProvider, number>();
    reputationsData?.data.forEach((r) => {
      map.set(r.provider, r.overall_score);
    });
    return map;
  }, [reputationsData]);
}
