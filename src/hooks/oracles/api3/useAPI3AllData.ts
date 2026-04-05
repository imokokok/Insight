'use client';

import { useCallback, useMemo } from 'react';

import { api3RequestManager } from '@/lib/oracles/api3RequestManager';

import { useAPI3CoverageEvents, useAPI3DapiCoverage } from './useAPI3Coverage';
import { useAPI3QualityHistory, useAPI3Historical } from './useAPI3Historical';
import {
  useAPI3CrossOracle,
  useAPI3AirnodeStats,
  useAPI3FirstParty,
  useAPI3GasFees,
  useAPI3Latency,
} from './useAPI3Network';
import { useAPI3OHLC, useAPI3Price } from './useAPI3Price';
import { useAPI3Deviations, useAPI3QualityMetrics, useAPI3SourceTrace } from './useAPI3Quality';
import { useAPI3Staking } from './useAPI3Staking';

import type { UseAPI3AllDataOptions, UseAPI3AllDataReturn } from './types';

export function useAPI3AllData(options: UseAPI3AllDataOptions): UseAPI3AllDataReturn {
  const { symbol, chain, enabled = true } = options;

  const priceQuery = useAPI3Price({ symbol, chain, enabled });
  const historicalQuery = useAPI3Historical({ symbol, chain, period: 7, enabled });
  const airnodeStatsQuery = useAPI3AirnodeStats(enabled);
  const dapiCoverageQuery = useAPI3DapiCoverage(enabled);
  const stakingQuery = useAPI3Staking(enabled);
  const firstPartyQuery = useAPI3FirstParty(enabled);
  const latencyQuery = useAPI3Latency(enabled);
  const qualityQuery = useAPI3QualityMetrics(enabled);
  const deviationsQuery = useAPI3Deviations(enabled);
  const sourceTraceQuery = useAPI3SourceTrace(enabled);
  const coverageEventsQuery = useAPI3CoverageEvents(enabled);
  const gasFeesQuery = useAPI3GasFees(enabled);
  const ohlcQuery = useAPI3OHLC({ symbol, chain, period: 30, enabled });
  const qualityHistoryQuery = useAPI3QualityHistory(enabled);
  const crossOracleQuery = useAPI3CrossOracle(enabled);

  const isLoading = useMemo(() => {
    if (!enabled) return false;
    return (
      priceQuery.isLoading ||
      historicalQuery.isLoading ||
      airnodeStatsQuery.isLoading ||
      dapiCoverageQuery.isLoading ||
      stakingQuery.isLoading ||
      firstPartyQuery.isLoading ||
      latencyQuery.isLoading ||
      qualityQuery.isLoading ||
      deviationsQuery.isLoading ||
      sourceTraceQuery.isLoading ||
      coverageEventsQuery.isLoading ||
      gasFeesQuery.isLoading ||
      ohlcQuery.isLoading ||
      qualityHistoryQuery.isLoading ||
      crossOracleQuery.isLoading
    );
  }, [
    enabled,
    priceQuery.isLoading,
    historicalQuery.isLoading,
    airnodeStatsQuery.isLoading,
    dapiCoverageQuery.isLoading,
    stakingQuery.isLoading,
    firstPartyQuery.isLoading,
    latencyQuery.isLoading,
    qualityQuery.isLoading,
    deviationsQuery.isLoading,
    sourceTraceQuery.isLoading,
    coverageEventsQuery.isLoading,
    gasFeesQuery.isLoading,
    ohlcQuery.isLoading,
    qualityHistoryQuery.isLoading,
    crossOracleQuery.isLoading,
  ]);

  const errors = useMemo(() => {
    const errs: Error[] = [];
    if (priceQuery.error) errs.push(priceQuery.error);
    if (historicalQuery.error) errs.push(historicalQuery.error);
    if (airnodeStatsQuery.error) errs.push(airnodeStatsQuery.error);
    if (dapiCoverageQuery.error) errs.push(dapiCoverageQuery.error);
    if (stakingQuery.error) errs.push(stakingQuery.error);
    if (firstPartyQuery.error) errs.push(firstPartyQuery.error);
    if (latencyQuery.error) errs.push(latencyQuery.error);
    if (qualityQuery.error) errs.push(qualityQuery.error);
    if (deviationsQuery.error) errs.push(deviationsQuery.error);
    if (sourceTraceQuery.error) errs.push(sourceTraceQuery.error);
    if (coverageEventsQuery.error) errs.push(coverageEventsQuery.error);
    if (gasFeesQuery.error) errs.push(gasFeesQuery.error);
    if (ohlcQuery.error) errs.push(ohlcQuery.error);
    if (qualityHistoryQuery.error) errs.push(qualityHistoryQuery.error);
    if (crossOracleQuery.error) errs.push(crossOracleQuery.error);
    return errs;
  }, [
    priceQuery.error,
    historicalQuery.error,
    airnodeStatsQuery.error,
    dapiCoverageQuery.error,
    stakingQuery.error,
    firstPartyQuery.error,
    latencyQuery.error,
    qualityQuery.error,
    deviationsQuery.error,
    sourceTraceQuery.error,
    coverageEventsQuery.error,
    gasFeesQuery.error,
    ohlcQuery.error,
    qualityHistoryQuery.error,
    crossOracleQuery.error,
  ]);

  const isError = errors.length > 0;

  const refetchAll = useCallback(async () => {
    const criticalRequests = [priceQuery.refetch()];

    const highPriorityRequests = [stakingQuery.refetch(), dapiCoverageQuery.refetch()];

    const normalPriorityRequests = [
      historicalQuery.refetch(),
      airnodeStatsQuery.refetch(),
      firstPartyQuery.refetch(),
      latencyQuery.refetch(),
      qualityQuery.refetch(),
      deviationsQuery.refetch(),
    ];

    const lowPriorityRequests = [
      sourceTraceQuery.refetch(),
      coverageEventsQuery.refetch(),
      gasFeesQuery.refetch(),
      ohlcQuery.refetch(),
      qualityHistoryQuery.refetch(),
      crossOracleQuery.refetch(),
    ];

    await Promise.all(criticalRequests);
    await Promise.all(highPriorityRequests);
    await Promise.all([...normalPriorityRequests, ...lowPriorityRequests]);
  }, [
    priceQuery,
    historicalQuery,
    airnodeStatsQuery,
    dapiCoverageQuery,
    stakingQuery,
    firstPartyQuery,
    latencyQuery,
    qualityQuery,
    deviationsQuery,
    sourceTraceQuery,
    coverageEventsQuery,
    gasFeesQuery,
    ohlcQuery,
    qualityHistoryQuery,
    crossOracleQuery,
  ]);

  const cacheStatus = useMemo(
    () => ({
      isOffline: priceQuery.isOffline,
      lastUpdated: priceQuery.lastUpdated,
    }),
    [priceQuery.isOffline, priceQuery.lastUpdated]
  );

  const queueStats = useMemo(() => api3RequestManager.getQueueStats(), []);

  return {
    price: priceQuery.price,
    historicalData: historicalQuery.historicalData,
    airnodeStats: airnodeStatsQuery.airnodeStats,
    dapiCoverage: dapiCoverageQuery.dapiCoverage,
    staking: stakingQuery.staking,
    firstParty: firstPartyQuery.firstParty,
    latency: latencyQuery.latency,
    qualityMetrics: qualityQuery.qualityMetrics,
    hourlyActivity: airnodeStatsQuery.airnodeStats?.hourlyActivity ?? [],
    deviations: deviationsQuery.deviations,
    sourceTrace: sourceTraceQuery.sourceTrace,
    coverageEvents: coverageEventsQuery.coverageEvents,
    gasFees: gasFeesQuery.gasFees,
    ohlc: ohlcQuery.ohlc,
    qualityHistory: qualityHistoryQuery.qualityHistory,
    crossOracle: crossOracleQuery.crossOracle,
    isLoading,
    isError,
    errors,
    refetchAll,
    cacheStatus,
    queueStats,
  };
}
