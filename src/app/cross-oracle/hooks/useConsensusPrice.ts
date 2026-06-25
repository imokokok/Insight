import { useMemo, useEffect, useRef } from 'react';

import {
  calculateConsensusPrice,
  recordConsensusHistory,
  resetConsensusHistory,
  type ConsensusMethod,
  type ConsensusResult,
  type ConsensusPriceInput,
} from '@/lib/analytics/consensusPrice';
import { type PriceData } from '@/types/oracle';

interface UseConsensusPriceOptions {
  defaultMethod?: ConsensusMethod;
  enableAutoSelect?: boolean;
}

interface UseConsensusPriceReturn {
  consensus: ConsensusResult | null;
}

function toConsensusInputs(priceData: PriceData[]): ConsensusPriceInput[] {
  return priceData
    .filter((p) => p.price > 0 && Number.isFinite(p.price))
    .map((p) => ({
      provider: p.provider,
      price: p.price,
      timestamp: p.timestamp,
      confidence: p.confidence,
      confidenceInterval: p.confidenceInterval,
    }));
}

export function useConsensusPrice(
  priceData: PriceData[],
  symbol?: string,
  options: UseConsensusPriceOptions = {}
): UseConsensusPriceReturn {
  const { defaultMethod, enableAutoSelect = true } = options;

  const consensusRef = useRef<ConsensusResult | null>(null);

  const providerKey = priceData
    .map((p) => p.provider)
    .sort()
    .join(',');

  const recommendedMethod = useMemo(() => {
    if (!symbol) return 'weighted_median' as ConsensusMethod;
    const inputs = toConsensusInputs(priceData);
    const tempResult = calculateConsensusPrice(inputs, undefined, symbol);
    return tempResult.recommendedMethod;
  }, [priceData, symbol]);

  const activeMethod: ConsensusMethod = defaultMethod ?? recommendedMethod;

  const consensus = useMemo(() => {
    if (priceData.length === 0) return null;

    const inputs = toConsensusInputs(priceData);
    if (inputs.length === 0) return null;

    const method = enableAutoSelect ? activeMethod : (defaultMethod ?? 'median');
    const result = calculateConsensusPrice(inputs, method, symbol);

    return result;
  }, [priceData, activeMethod, symbol, enableAutoSelect, defaultMethod]);

  useEffect(() => {
    if (providerKey) {
      resetConsensusHistory();
    }
  }, [providerKey]);

  useEffect(() => {
    consensusRef.current = consensus;
    if (consensus && consensus.price > 0) {
      const historyKey = symbol ?? 'default';
      recordConsensusHistory(historyKey, consensus);
    }
  }, [consensus, symbol]);

  return {
    consensus,
  };
}
