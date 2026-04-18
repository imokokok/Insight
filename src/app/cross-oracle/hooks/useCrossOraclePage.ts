/**
 * @fileoverview Multi-oracle comparison page composition hook
 * @description Composes all focused hooks, providing a unified page state management interface
 */

import { useState, useCallback } from 'react';

import { type OracleProvider, ORACLE_PROVIDER_VALUES } from '@/types/oracle';

import { type TimeRange } from '../constants';

import { useOracleData } from './useOracleData';
import { usePriceAnomalyDetection } from './usePriceAnomalyDetection';
import { usePriceStats } from './usePriceStats';

interface UseCrossOraclePageOptions {
  initialSymbol?: string;
  initialOracles?: OracleProvider[];
}

export function useCrossOraclePage(options: UseCrossOraclePageOptions = {}) {
  const { initialSymbol = 'BTC/USD', initialOracles = [...ORACLE_PROVIDER_VALUES] } = options;

  const [selectedOracles, setSelectedOracles] = useState<OracleProvider[]>(initialOracles);
  const [selectedSymbol, setSelectedSymbol] = useState<string>(initialSymbol);
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');

  const {
    priceData,
    historicalData,
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
  } = useOracleData({
    selectedOracles,
    selectedSymbol,
    timeRange,
  });

  const priceStats = usePriceStats(priceData);

  const anomalyDetection = usePriceAnomalyDetection(priceData, priceStats.avgPrice);

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
    timeRange,
    setTimeRange,

    priceData,
    historicalData,
    isLoading,
    lastUpdated,

    priceStats,

    anomalyDetection,

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
