import { useState, useCallback } from 'react';

import { type OracleProvider, ORACLE_PROVIDER_VALUES } from '@/types/oracle';

import { useOracleData } from './useOracleData';
import { usePriceAnomalyDetection } from './usePriceAnomalyDetection';
import { usePriceStats } from './usePriceStats';
import { useRiskMetrics } from './useRiskMetrics';

export type CrossOracleTab = 'comparison' | 'risk' | 'ranking';

interface UseCrossOraclePageOptions {
  initialSymbol?: string;
  initialOracles?: OracleProvider[];
}

export function useCrossOraclePage(options: UseCrossOraclePageOptions = {}) {
  const { initialSymbol = 'BTC/USD', initialOracles = [...ORACLE_PROVIDER_VALUES] } = options;

  const [selectedOracles, setSelectedOracles] = useState<OracleProvider[]>(initialOracles);
  const [selectedSymbol, setSelectedSymbol] = useState<string>(initialSymbol);
  const [activeTab, setActiveTab] = useState<CrossOracleTab>('comparison');

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

  const priceStats = usePriceStats(priceData);

  const anomalyDetection = usePriceAnomalyDetection(
    priceData,
    priceStats.medianPrice,
    undefined,
    selectedSymbol
  );

  const riskMetrics = useRiskMetrics(priceData, priceHistoryMapRef, selectedSymbol);

  const toggleOracle = useCallback((oracle: OracleProvider) => {
    setSelectedOracles((prev) =>
      prev.includes(oracle) ? prev.filter((o) => o !== oracle) : [...prev, oracle]
    );
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

    anomalyDetection,

    riskMetrics,

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
