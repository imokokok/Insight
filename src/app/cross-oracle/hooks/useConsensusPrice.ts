import { useMemo, useState, useCallback, useEffect, useRef } from 'react';

import {
  calculateConsensusPrice,
  recordConsensusHistory,
  getConsensusHistory,
  resetConsensusHistory,
  type ConsensusMethod,
  type ConsensusResult,
  type ConsensusHistoryPoint,
  type ConsensusPriceInput,
} from '@/lib/analytics/consensusPrice';
import { type PriceData } from '@/types/oracle';

interface UseConsensusPriceOptions {
  defaultMethod?: ConsensusMethod;
  enableAutoSelect?: boolean;
}

interface UseConsensusPriceReturn {
  consensus: ConsensusResult | null;
  currentMethod: ConsensusMethod;
  setMethod: (method: ConsensusMethod) => void;
  recommendedMethod: ConsensusMethod;
  consensusHistory: ConsensusHistoryPoint[];
  isCalculating: boolean;
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

  const [currentMethod, setCurrentMethod] = useState<ConsensusMethod | null>(null);
  const [consensusHistory, setConsensusHistory] = useState<ConsensusHistoryPoint[]>([]);
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

  useEffect(() => {
    resetConsensusHistory();
    setConsensusHistory([]);
  }, [providerKey]);

  const activeMethod: ConsensusMethod = currentMethod ?? defaultMethod ?? recommendedMethod;

  const consensus = useMemo(() => {
    if (priceData.length === 0) return null;

    const inputs = toConsensusInputs(priceData);
    if (inputs.length === 0) return null;

    const method = enableAutoSelect ? activeMethod : (defaultMethod ?? 'median');
    const result = calculateConsensusPrice(inputs, method, symbol);

    return result;
  }, [priceData, activeMethod, symbol, enableAutoSelect, defaultMethod]);

  useEffect(() => {
    consensusRef.current = consensus;
  }, [consensus]);

  useEffect(() => {
    if (consensusRef.current && consensusRef.current.price > 0) {
      const historyKey = symbol ?? 'default';
      recordConsensusHistory(historyKey, consensusRef.current);
      const updated = getConsensusHistory(historyKey);
      setConsensusHistory(updated);
    }
  }, [consensus?.price, consensus?.method, symbol]);

  const setMethod = useCallback((method: ConsensusMethod) => {
    setCurrentMethod(method);
  }, []);

  return {
    consensus,
    currentMethod: activeMethod,
    setMethod,
    recommendedMethod,
    consensusHistory,
    isCalculating: false,
  };
}
