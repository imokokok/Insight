'use client';

import { useMemo, useCallback } from 'react';

import { useQuery, useQueries } from '@tanstack/react-query';

import { BandProtocolClient } from '@/lib/oracles/bandProtocol';
import type {
  BandNetworkStats,
  ValidatorInfo,
  CrossChainStats,
  CrossChainTrend,
  CrossChainComparison,
  TrendPeriod,
  IBCConnection,
  IBCTransferStats,
  IBCTransferTrend,
  OracleScript,
  PriceFeed,
  DataSourceListResponse,
  RiskMetrics,
  RiskTrendData,
  RiskEvent,
  StakingInfo,
  StakingDistribution,
  StakingReward,
  GovernanceProposal,
  GovernanceParams,
  ProposalStatus,
} from '@/lib/oracles/bandProtocol';
import { type Blockchain, type PriceData } from '@/types/oracle';

import { useLastUpdated } from './useLastUpdated';

const bandClient = new BandProtocolClient();

type BandDataType =
  | 'price'
  | 'historical'
  | 'network'
  | 'validators'
  | 'crossChain'
  | 'crossChainTrend'
  | 'crossChainComparison'
  | 'ibcConnections'
  | 'ibcTransferStats'
  | 'ibcTransferTrends'
  | 'oracleScripts'
  | 'oracleScript'
  | 'dataSources'
  | 'priceFeeds'
  | 'stakingInfo'
  | 'stakingDistribution'
  | 'riskMetrics'
  | 'riskTrend'
  | 'securityAuditEvents'
  | 'governanceProposals'
  | 'governanceParams';

const getBandKey = (type: BandDataType, params?: Record<string, unknown>): string[] => {
  const baseKey = ['band', type];
  if (!params) return baseKey;
  const paramStr = Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return [...baseKey, paramStr];
};

interface UseBandPriceOptions {
  symbol: string;
  chain?: Blockchain;
  enabled?: boolean;
}

export function useBandPrice(options: UseBandPriceOptions) {
  const { symbol, chain, enabled = true } = options;
  const queryKey = getBandKey('price', { symbol, chain });

  const { data, error, isLoading, refetch } = useQuery<PriceData, Error>({
    queryKey,
    queryFn: () => bandClient.getPrice(symbol, chain),
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

interface UseBandHistoricalOptions {
  symbol: string;
  chain?: Blockchain;
  period?: number;
  enabled?: boolean;
}

export function useBandHistorical(options: UseBandHistoricalOptions) {
  const { symbol, chain, period = 7, enabled = true } = options;
  const queryKey = getBandKey('historical', { symbol, chain, period });

  const { data, error, isLoading, refetch } = useQuery<PriceData[], Error>({
    queryKey,
    queryFn: () => bandClient.getHistoricalPrices(symbol, chain, period),
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

export function useBandNetworkStats(enabled = true) {
  const queryKey = getBandKey('network');

  const { data, error, isLoading, refetch } = useQuery<BandNetworkStats, Error>({
    queryKey,
    queryFn: () => bandClient.getNetworkStats(),
    enabled,
    staleTime: 60000,
    gcTime: 120000,
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    networkStats: data,
    error,
    isLoading,
    refetch,
  };
}

interface UseBandValidatorsOptions {
  limit?: number;
  enabled?: boolean;
}

export function useBandValidators(options: UseBandValidatorsOptions = {}) {
  const { limit = 20, enabled = true } = options;
  const queryKey = getBandKey('validators', { limit });

  const { data, error, isLoading, refetch } = useQuery<ValidatorInfo[], Error>({
    queryKey,
    queryFn: () => bandClient.getValidators(limit),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    validators: data ?? [],
    error,
    isLoading,
    refetch,
  };
}

export function useBandCrossChainStats(enabled = true) {
  const queryKey = getBandKey('crossChain');

  const { data, error, isLoading, refetch } = useQuery<CrossChainStats, Error>({
    queryKey,
    queryFn: () => bandClient.getCrossChainStats(),
    enabled,
    staleTime: 60000,
    gcTime: 120000,
    refetchInterval: 60000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    crossChainStats: data,
    error,
    isLoading,
    refetch,
  };
}

interface UseBandCrossChainTrendOptions {
  period?: TrendPeriod;
  enabled?: boolean;
}

export function useBandCrossChainTrend(options: UseBandCrossChainTrendOptions = {}) {
  const { period = '7d', enabled = true } = options;
  const queryKey = getBandKey('crossChainTrend', { period });

  const { data, error, isLoading, refetch } = useQuery<CrossChainTrend[], Error>({
    queryKey,
    queryFn: () => bandClient.getCrossChainTrend(period),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  const crossChainTrend: CrossChainTrend[] = data ?? [];

  return {
    crossChainTrend,
    error,
    isLoading,
    refetch,
  };
}

interface UseBandCrossChainComparisonOptions {
  period?: TrendPeriod;
  enabled?: boolean;
}

export function useBandCrossChainComparison(options: UseBandCrossChainComparisonOptions = {}) {
  const { period = '7d', enabled = true } = options;
  const queryKey = getBandKey('crossChainComparison', { period });

  const { data, error, isLoading, refetch } = useQuery<CrossChainComparison, Error>({
    queryKey,
    queryFn: () => bandClient.getCrossChainComparison(period),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    crossChainComparison: data,
    error,
    isLoading,
    refetch,
  };
}

export function useBandIBCConnections(enabled = true) {
  const queryKey = getBandKey('ibcConnections');

  const { data, error, isLoading, refetch } = useQuery<IBCConnection[], Error>({
    queryKey,
    queryFn: () => bandClient.getIBCConnections(),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    ibcConnections: data ?? [],
    error,
    isLoading,
    refetch,
  };
}

export function useBandIBCTransferStats(enabled = true) {
  const queryKey = getBandKey('ibcTransferStats');

  const { data, error, isLoading, refetch } = useQuery<IBCTransferStats, Error>({
    queryKey,
    queryFn: () => bandClient.getIBCTransferStats(),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    ibcTransferStats: data,
    error,
    isLoading,
    refetch,
  };
}

interface UseBandIBCTransferTrendsOptions {
  days?: number;
  enabled?: boolean;
}

export function useBandIBCTransferTrends(options: UseBandIBCTransferTrendsOptions = {}) {
  const { days = 7, enabled = true } = options;
  const queryKey = getBandKey('ibcTransferTrends', { days });

  const { data, error, isLoading, refetch } = useQuery<IBCTransferTrend[], Error>({
    queryKey,
    queryFn: () => bandClient.getIBCTransferTrends(days),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    ibcTransferTrends: data ?? [],
    error,
    isLoading,
    refetch,
  };
}

interface UseBandProtocolAllDataOptions {
  symbol: string;
  chain?: Blockchain;
  enabled?: boolean;
}

export function useBandProtocolAllData({
  symbol,
  chain,
  enabled = true,
}: UseBandProtocolAllDataOptions) {
  const { lastUpdated, updateLastUpdated } = useLastUpdated();

  const results = useQueries({
    queries: [
      {
        queryKey: getBandKey('price', { symbol, chain }),
        queryFn: async () => {
          const result = await bandClient.getPrice(symbol, chain);
          updateLastUpdated();
          return result;
        },
        enabled,
        staleTime: 30000,
        gcTime: 60000,
        refetchInterval: 30000,
        refetchOnWindowFocus: false,
        retry: 3,
      },
      {
        queryKey: getBandKey('historical', { symbol, chain, period: 7 }),
        queryFn: () => bandClient.getHistoricalPrices(symbol, chain, 7),
        enabled,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        refetchInterval: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 3,
      },
      {
        queryKey: getBandKey('network'),
        queryFn: () => bandClient.getNetworkStats(),
        enabled,
        staleTime: 60000,
        gcTime: 120000,
        refetchInterval: 60000,
        refetchOnWindowFocus: false,
        retry: 3,
      },
      {
        queryKey: getBandKey('validators', { limit: 20 }),
        queryFn: () => bandClient.getValidators(20),
        enabled,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        refetchInterval: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
        retry: 3,
      },
      {
        queryKey: getBandKey('crossChain'),
        queryFn: () => bandClient.getCrossChainStats(),
        enabled,
        staleTime: 60000,
        gcTime: 120000,
        refetchInterval: 60000,
        refetchOnWindowFocus: false,
        retry: 3,
      },
    ],
  });

  const [priceResult, historicalResult, networkResult, validatorsResult, crossChainResult] =
    results;

  const isLoading = results.some((r) => r.isLoading);
  const isError = results.some((r) => r.isError);
  const errors = results.map((r) => r.error).filter(Boolean) as Error[];

  const refetchAll = useCallback(async () => {
    await Promise.all(results.map((r) => r.refetch()));
    updateLastUpdated();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return useMemo(
    () => ({
      price: priceResult.data,
      historicalData: historicalResult.data ?? [],
      networkStats: networkResult.data,
      validators: validatorsResult.data ?? [],
      crossChainStats: crossChainResult.data,
      isLoading,
      isError,
      errors,
      refetchAll,
      lastUpdated,
    }),
    [
      priceResult.data,
      historicalResult.data,
      networkResult.data,
      validatorsResult.data,
      crossChainResult.data,
      isLoading,
      isError,
      errors,
      refetchAll,
      lastUpdated,
    ]
  );
}

export function useBandOracleScripts(enabled = true) {
  const queryKey = getBandKey('oracleScripts');

  const { data, error, isLoading, refetch } = useQuery<OracleScript[], Error>({
    queryKey,
    queryFn: () => bandClient.getOracleScripts(),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    oracleScripts: data ?? [],
    error,
    isLoading,
    refetch,
  };
}

interface UseBandOracleScriptOptions {
  id: number;
  enabled?: boolean;
}

export function useBandOracleScript(options: UseBandOracleScriptOptions) {
  const { id, enabled = true } = options;
  const queryKey = getBandKey('oracleScript', { id });

  const { data, error, isLoading, refetch } = useQuery<OracleScript | null, Error>({
    queryKey,
    queryFn: () => bandClient.getOracleScriptById(id),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    oracleScript: data,
    error,
    isLoading,
    refetch,
  };
}

interface UseBandDataSourcesOptions {
  page?: number;
  limit?: number;
  enabled?: boolean;
  getAllDataSources?: boolean;
}

export function useBandDataSources(options: UseBandDataSourcesOptions = {}) {
  const { page = 1, limit = 20, enabled = true, getAllDataSources = false } = options;
  const queryKey = getBandKey('dataSources', { page, limit, getAllDataSources });

  const { data, error, isLoading, refetch } = useQuery<DataSourceListResponse, Error>({
    queryKey,
    queryFn: async () => {
      if (getAllDataSources) {
        const allData = await bandClient.getDataSourceList(1, 1000);
        return {
          dataSources: allData.dataSources,
          total: allData.total,
          hasMore: false,
        };
      }
      return bandClient.getDataSourceList(page, limit);
    },
    enabled,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    dataSources: data?.dataSources ?? [],
    total: data?.total ?? 0,
    hasMore: data?.hasMore ?? false,
    error,
    isLoading,
    refetch,
  };
}

export function useBandPriceFeeds(enabled = true) {
  const queryKey = getBandKey('priceFeeds');

  const { data, error, isLoading, refetch } = useQuery<PriceFeed[], Error>({
    queryKey,
    queryFn: () => bandClient.getPriceFeeds(),
    enabled,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    priceFeeds: data ?? [],
    error,
    isLoading,
    refetch,
  };
}

export function useBandStakingInfo(enabled = true) {
  const queryKey = getBandKey('stakingInfo');

  const { data, error, isLoading, refetch } = useQuery<StakingInfo, Error>({
    queryKey,
    queryFn: () => bandClient.getStakingInfo(),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    stakingInfo: data,
    error,
    isLoading,
    refetch,
  };
}

export function useBandStakingDistribution(enabled = true) {
  const queryKey = getBandKey('stakingDistribution');

  const { data, error, isLoading, refetch } = useQuery<StakingDistribution[], Error>({
    queryKey,
    queryFn: () => bandClient.getStakingDistribution(),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  const stakingDistribution: StakingDistribution[] = data ?? [];

  return {
    stakingDistribution,
    error,
    isLoading,
    refetch,
  };
}

export function useBandStakingReward(amount: number, durationDays: number) {
  return useMemo(() => {
    return bandClient.calculateStakingReward(amount, durationDays);
  }, [amount, durationDays]);
}

export function useBandRiskMetrics(enabled = true) {
  const queryKey = getBandKey('riskMetrics');

  const { data, error, isLoading, refetch } = useQuery<RiskMetrics, Error>({
    queryKey,
    queryFn: () => bandClient.getRiskMetrics(),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    riskMetrics: data,
    error,
    isLoading,
    refetch,
  };
}

interface UseBandRiskTrendOptions {
  days?: number;
  enabled?: boolean;
}

export function useBandRiskTrend(options: UseBandRiskTrendOptions = {}) {
  const { days = 30, enabled = true } = options;
  const queryKey = getBandKey('riskTrend', { days });

  const { data, error, isLoading, refetch } = useQuery<RiskTrendData[], Error>({
    queryKey,
    queryFn: () => bandClient.getRiskTrendData(days),
    enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  const riskTrend: RiskTrendData[] = data ?? [];

  return {
    riskTrend,
    error,
    isLoading,
    refetch,
  };
}

export function useBandSecurityAuditEvents(enabled = true) {
  const queryKey = getBandKey('securityAuditEvents');

  const { data, error, isLoading, refetch } = useQuery<RiskEvent[], Error>({
    queryKey,
    queryFn: () => bandClient.getSecurityAuditEvents(),
    enabled,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    events: data ?? [],
    error,
    isLoading,
    refetch,
  };
}

interface UseBandGovernanceProposalsOptions {
  status?: ProposalStatus;
  enabled?: boolean;
}

export function useBandGovernanceProposals(options: UseBandGovernanceProposalsOptions = {}) {
  const { status, enabled = true } = options;
  const queryKey = getBandKey('governanceProposals', { status });

  const { data, error, isLoading, refetch } = useQuery<GovernanceProposal[], Error>({
    queryKey,
    queryFn: () => bandClient.getGovernanceProposals(status),
    enabled,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    proposals: data ?? [],
    error,
    isLoading,
    refetch,
  };
}

export function useBandGovernanceParams(enabled = true) {
  const queryKey = getBandKey('governanceParams');

  const { data, error, isLoading, refetch } = useQuery<GovernanceParams, Error>({
    queryKey,
    queryFn: () => bandClient.getGovernanceParams(),
    enabled,
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 3,
  });

  return {
    governanceParams: data,
    error,
    isLoading,
    refetch,
  };
}
