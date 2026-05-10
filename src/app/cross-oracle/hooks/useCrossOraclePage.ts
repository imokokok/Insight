import { useState, useCallback } from 'react';

import { type ConsensusMethod } from '@/lib/analytics/consensusPrice';
import { type OracleProvider, ORACLE_PROVIDER_VALUES } from '@/types/oracle';

import { useConsensusPrice } from './useConsensusPrice';
import { useDivergenceSignals } from './useDivergenceSignals';
import { useFeedBehavior } from './useFeedBehavior';
import { useOracleData } from './useOracleData';
import { usePriceAnomalyDetection } from './usePriceAnomalyDetection';
import { usePriceStats } from './usePriceStats';
import { useRiskMetrics } from './useRiskMetrics';
import { useStabilityScore } from './useStabilityScore';

export type CrossOracleTab = 'comparison' | 'divergence' | 'feedHealth' | 'risk' | 'ranking';

interface UseCrossOraclePageOptions {
  initialSymbol?: string;
  initialOracles?: OracleProvider[];
}

export function useCrossOraclePage(options: UseCrossOraclePageOptions = {}) {
  const { initialSymbol = 'BTC/USD', initialOracles = [...ORACLE_PROVIDER_VALUES] } = options;

  const [selectedOracles, setSelectedOracles] = useState<OracleProvider[]>(initialOracles);
  const [selectedSymbol, setSelectedSymbol] = useState<string>(initialSymbol);
  const [activeTab, setActiveTab] = useState<CrossOracleTab>('comparison');
  const [consensusMethod, setConsensusMethod] = useState<ConsensusMethod | undefined>(undefined);

  const {
    priceData,
    isLoading,
    lastUpdated,
    fetchPriceData,
    oracleDataError,
    retryOracle,
    retryAllFailed,
    isRetrying,
    retryingOracles,
    queryProgress,
    refreshInterval,
    setRefreshInterval,
    lastRefreshedAt,
    nextRefreshAt,
    performanceMetrics,
    isCalculatingMetrics,
    priceHistoryMapRef,
  } = useOracleData({
    selectedOracles,
    selectedSymbol,
  });

  const priceStats = usePriceStats(priceData, selectedSymbol, consensusMethod);

  const consensus = useConsensusPrice(priceData, selectedSymbol, {
    defaultMethod: consensusMethod,
  });

  const anomalyDetection = usePriceAnomalyDetection(
    priceData,
    priceStats.medianPrice,
    undefined,
    selectedSymbol
  );

  const riskMetrics = useRiskMetrics(priceData, priceHistoryMapRef, selectedSymbol);

  const divergenceSignals = useDivergenceSignals(priceData, priceHistoryMapRef, selectedSymbol);
  const feedBehavior = useFeedBehavior(priceData, priceHistoryMapRef);
  const stabilityScore = useStabilityScore(priceData, priceHistoryMapRef);

  const toggleOracle = useCallback((oracle: OracleProvider) => {
    setSelectedOracles((prev) =>
      prev.includes(oracle) ? prev.filter((o) => o !== oracle) : [...prev, oracle]
    );
  }, []);

  const handleSetConsensusMethod = useCallback((method: ConsensusMethod) => {
    setConsensusMethod(method);
  }, []);

  return {
    selectedOracles,
    setSelectedOracles,
    selectedSymbol,
    setSelectedSymbol,
    activeTab,
    setActiveTab,

    priceData,
    isLoading,
    lastUpdated,

    priceStats,

    consensus,
    consensusMethod,
    setConsensusMethod: handleSetConsensusMethod,

    anomalyDetection,

    riskMetrics,

    divergenceSignals,
    feedBehavior,
    stabilityScore,

    performanceMetrics,
    isCalculatingMetrics,

    oracleDataError,
    retryOracle,
    retryAllFailed,
    isRetrying,
    retryingOracles,

    queryProgress,

    toggleOracle,

    fetchPriceData,

    refreshInterval,
    setRefreshInterval,
    lastRefreshedAt,
    nextRefreshAt,
  };
}
