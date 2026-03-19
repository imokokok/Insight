'use client';

import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { API3Client } from '@/lib/oracles/api3';
import type {
  AirnodeNetworkStats,
  DapiCoverage,
  StakingData,
  FirstPartyOracleData,
  DapiPriceDeviation,
  DataSourceInfo,
  CoveragePoolEvent,
} from '@/lib/oracles/api3';
import type { GasFeeData } from '@/components/oracle/common/GasFeeComparison';
import type { QualityDataPoint } from '@/components/oracle/charts/DataQualityTrend';
import type { OHLCVDataPoint } from '@/lib/indicators';
import { PriceData, OracleProvider, Blockchain } from '@/types/oracle';

const api3Client = new API3Client();

type API3DataType =
  | 'price'
  | 'historical'
  | 'airnodeStats'
  | 'dapiCoverage'
  | 'staking'
  | 'firstParty'
  | 'latency'
  | 'quality'
  | 'deviations'
  | 'sourceTrace'
  | 'coverageEvents'
  | 'gasFees'
  | 'ohlc'
  | 'qualityHistory'
  | 'crossOracle';

const getAPI3Key = (type: API3DataType, params?: Record<string, unknown>): string[] => {
  const baseKey = ['api3', type];
  if (!params) return baseKey;
  const paramStr = Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return [...baseKey, paramStr];
};

interface UseAPI3PriceOptions {
  symbol: string;
  chain?: Blockchain;
  enabled?: boolean;
}

export function useAPI3Price(options: UseAPI3PriceOptions) {
  const { symbol, chain, enabled = true } = options;
  const queryKey = getAPI3Key('price', { symbol, chain });

  const { data, error, isLoading, refetch } = useQuery<PriceData, Error>({
    queryKey,
    queryFn: () => api3Client.getPrice(symbol, chain),
    enabled,
    staleTime: 30000,
    gcTime: 60000,
    refetchInterval: 30000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    price: data,
    error,
    isLoading,
    refetch,
  };
}

interface UseAPI3HistoricalOptions {
  symbol: string;
  chain?: Blockchain;
  period?: number;
  enabled?: boolean;
}

export function useAPI3Historical(options: UseAPI3HistoricalOptions) {
  const { symbol, chain, period = 7, enabled = true } = options;
  const queryKey = getAPI3Key('historical', { symbol, chain, period });

  const { data, error, isLoading, refetch } = useQuery<PriceData[], Error>({
    queryKey,
    queryFn: () => api3Client.getHistoricalPrices(symbol, chain, period),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    historicalData: data ?? [],
    error,
    isLoading,
    refetch,
  };
}

export function useAPI3AirnodeStats(enabled = true) {
  const queryKey = getAPI3Key('airnodeStats');

  const { data, error, isLoading, refetch } = useQuery<AirnodeNetworkStats, Error>({
    queryKey,
    queryFn: () => api3Client.getAirnodeNetworkStats(),
    enabled,
    staleTime: 60000,
    gcTime: 120000,
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    airnodeStats: data,
    error,
    isLoading,
    refetch,
  };
}

export function useAPI3DapiCoverage(enabled = true) {
  const queryKey = getAPI3Key('dapiCoverage');

  const { data, error, isLoading, refetch } = useQuery<DapiCoverage, Error>({
    queryKey,
    queryFn: () => api3Client.getDapiCoverage(),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    dapiCoverage: data,
    error,
    isLoading,
    refetch,
  };
}

export function useAPI3Staking(enabled = true) {
  const queryKey = getAPI3Key('staking');

  const { data, error, isLoading, refetch } = useQuery<StakingData, Error>({
    queryKey,
    queryFn: () => api3Client.getStakingData(),
    enabled,
    staleTime: 60000,
    gcTime: 120000,
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    staking: data,
    error,
    isLoading,
    refetch,
  };
}

export function useAPI3FirstParty(enabled = true) {
  const queryKey = getAPI3Key('firstParty');

  const { data, error, isLoading, refetch } = useQuery<FirstPartyOracleData, Error>({
    queryKey,
    queryFn: () => api3Client.getFirstPartyOracleData(),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    firstParty: data,
    error,
    isLoading,
    refetch,
  };
}

export function useAPI3Latency(enabled = true) {
  const queryKey = getAPI3Key('latency');

  const { data, error, isLoading, refetch } = useQuery<number[], Error>({
    queryKey,
    queryFn: () => api3Client.getLatencyDistribution(),
    enabled,
    staleTime: 60000,
    gcTime: 120000,
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    latency: data ?? [],
    error,
    isLoading,
    refetch,
  };
}

interface UseAPI3QualityMetricsReturn {
  freshness: { lastUpdated: Date; updateInterval: number };
  completeness: { successCount: number; totalCount: number };
  reliability: { historicalAccuracy: number; responseSuccessRate: number; uptime: number };
}

export function useAPI3QualityMetrics(enabled = true) {
  const queryKey = getAPI3Key('quality');

  const { data, error, isLoading, refetch } = useQuery<UseAPI3QualityMetricsReturn, Error>({
    queryKey,
    queryFn: () => api3Client.getDataQualityMetrics(),
    enabled,
    staleTime: 60000,
    gcTime: 120000,
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    qualityMetrics: data,
    error,
    isLoading,
    refetch,
  };
}

export function useAPI3Deviations(enabled = true) {
  const queryKey = getAPI3Key('deviations');

  const { data, error, isLoading, refetch } = useQuery<DapiPriceDeviation[], Error>({
    queryKey,
    queryFn: () => api3Client.getDapiPriceDeviations(),
    enabled,
    staleTime: 30000,
    gcTime: 60000,
    refetchInterval: 30000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    deviations: data ?? [],
    error,
    isLoading,
    refetch,
  };
}

export function useAPI3SourceTrace(enabled = true) {
  const queryKey = getAPI3Key('sourceTrace');

  const { data, error, isLoading, refetch } = useQuery<DataSourceInfo[], Error>({
    queryKey,
    queryFn: () => api3Client.getDataSourceTraceability(),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    sourceTrace: data ?? [],
    error,
    isLoading,
    refetch,
  };
}

export function useAPI3CoverageEvents(enabled = true) {
  const queryKey = getAPI3Key('coverageEvents');

  const { data, error, isLoading, refetch } = useQuery<CoveragePoolEvent[], Error>({
    queryKey,
    queryFn: () => api3Client.getCoveragePoolEvents(),
    enabled,
    staleTime: 60000,
    gcTime: 120000,
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    coverageEvents: data ?? [],
    error,
    isLoading,
    refetch,
  };
}

export function useAPI3GasFees(enabled = true) {
  const queryKey = getAPI3Key('gasFees');

  const { data, error, isLoading, refetch } = useQuery<GasFeeData[], Error>({
    queryKey,
    queryFn: () => api3Client.getGasFeeData(),
    enabled,
    staleTime: 60000,
    gcTime: 120000,
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    gasFees: data ?? [],
    error,
    isLoading,
    refetch,
  };
}

interface UseAPI3OHLCOptions {
  symbol: string;
  chain?: Blockchain;
  period?: number;
  enabled?: boolean;
}

export function useAPI3OHLC(options: UseAPI3OHLCOptions) {
  const { symbol, chain, period = 30, enabled = true } = options;
  const queryKey = getAPI3Key('ohlc', { symbol, chain, period });

  const { data, error, isLoading, refetch } = useQuery<OHLCVDataPoint[], Error>({
    queryKey,
    queryFn: () => api3Client.getOHLCPrices(symbol, chain, period),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    ohlc: data ?? [],
    error,
    isLoading,
    refetch,
  };
}

export function useAPI3QualityHistory(enabled = true) {
  const queryKey = getAPI3Key('qualityHistory');

  const { data, error, isLoading, refetch } = useQuery<QualityDataPoint[], Error>({
    queryKey,
    queryFn: () => api3Client.getQualityHistory(),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    qualityHistory: data ?? [],
    error,
    isLoading,
    refetch,
  };
}

export function useAPI3CrossOracle(enabled = true) {
  const queryKey = getAPI3Key('crossOracle');

  const { data, error, isLoading, refetch } = useQuery<
    {
      oracle: OracleProvider;
      responseTime: number;
      accuracy: number;
      availability: number;
      costEfficiency: number;
      updateFrequency: number;
    }[],
    Error
  >({
    queryKey,
    queryFn: () => api3Client.getCrossOracleComparison(),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    crossOracle: data ?? [],
    error,
    isLoading,
    refetch,
  };
}

interface UseAPI3AllDataOptions {
  symbol: string;
  chain?: Blockchain;
  enabled?: boolean;
}

interface UseAPI3AllDataReturn {
  price: PriceData | undefined;
  historicalData: PriceData[];
  airnodeStats: AirnodeNetworkStats | undefined;
  dapiCoverage: DapiCoverage | undefined;
  staking: StakingData | undefined;
  firstParty: FirstPartyOracleData | undefined;
  latency: number[];
  qualityMetrics: UseAPI3QualityMetricsReturn | undefined;
  hourlyActivity: number[];
  deviations: DapiPriceDeviation[];
  sourceTrace: DataSourceInfo[];
  coverageEvents: CoveragePoolEvent[];
  gasFees: GasFeeData[];
  ohlc: OHLCVDataPoint[];
  qualityHistory: QualityDataPoint[];
  crossOracle: {
    oracle: OracleProvider;
    responseTime: number;
    accuracy: number;
    availability: number;
    costEfficiency: number;
    updateFrequency: number;
  }[];
  isLoading: boolean;
  isError: boolean;
  errors: Error[];
  refetchAll: () => Promise<void>;
}

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
    await Promise.all([
      priceQuery.refetch(),
      historicalQuery.refetch(),
      airnodeStatsQuery.refetch(),
      dapiCoverageQuery.refetch(),
      stakingQuery.refetch(),
      firstPartyQuery.refetch(),
      latencyQuery.refetch(),
      qualityQuery.refetch(),
      deviationsQuery.refetch(),
      sourceTraceQuery.refetch(),
      coverageEventsQuery.refetch(),
      gasFeesQuery.refetch(),
      ohlcQuery.refetch(),
      qualityHistoryQuery.refetch(),
      crossOracleQuery.refetch(),
    ]);
  }, [
    priceQuery.refetch,
    historicalQuery.refetch,
    airnodeStatsQuery.refetch,
    dapiCoverageQuery.refetch,
    stakingQuery.refetch,
    firstPartyQuery.refetch,
    latencyQuery.refetch,
    qualityQuery.refetch,
    deviationsQuery.refetch,
    sourceTraceQuery.refetch,
    coverageEventsQuery.refetch,
    gasFeesQuery.refetch,
    ohlcQuery.refetch,
    qualityHistoryQuery.refetch,
    crossOracleQuery.refetch,
  ]);

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
  };
}
