'use client';

import { useMemo } from 'react';

import { useQuery, useQueries } from '@tanstack/react-query';

import { ChronicleClient } from '@/lib/oracles';
import type {
  ScuttlebuttData,
  MakerDAOIntegration,
  ValidatorNetwork,
  VaultData,
  ScuttlebuttConsensus,
  CrossChainPrice,
  PriceDeviation,
} from '@/lib/oracles';
import { type Blockchain } from '@/types/oracle';

const client = new ChronicleClient();

export function useChroniclePrice(symbol: string) {
  return useQuery({
    queryKey: ['chronicle', 'price', symbol],
    queryFn: () => client.getPrice(symbol),
    refetchInterval: 60000,
  });
}

export function useChronicleHistoricalPrices(symbol: string, period: number = 24) {
  return useQuery({
    queryKey: ['chronicle', 'historical', symbol, period],
    queryFn: () => client.getHistoricalPrices(symbol, undefined, period),
    refetchInterval: 300000,
  });
}

export function useChronicleScuttlebutt() {
  return useQuery<ScuttlebuttData>({
    queryKey: ['chronicle', 'scuttlebutt'],
    queryFn: () => client.getScuttlebuttSecurity(),
    refetchInterval: 300000,
  });
}

export function useChronicleMakerDAO() {
  return useQuery<MakerDAOIntegration>({
    queryKey: ['chronicle', 'makerdao'],
    queryFn: () => client.getMakerDAOIntegration(),
    refetchInterval: 60000,
  });
}

export function useChronicleValidators() {
  return useQuery<ValidatorNetwork>({
    queryKey: ['chronicle', 'validators'],
    queryFn: () => client.getValidatorNetwork(),
    refetchInterval: 60000,
  });
}

export function useChronicleNetworkStats() {
  return useQuery({
    queryKey: ['chronicle', 'network'],
    queryFn: () => client.getNetworkStats(),
    refetchInterval: 60000,
  });
}

interface UseChronicleAllDataOptions {
  symbol: string;
  chain?: Blockchain;
  enabled?: boolean;
}

export function useChronicleAllData({ symbol, chain, enabled = true }: UseChronicleAllDataOptions) {
  const results = useQueries({
    queries: [
      {
        queryKey: ['chronicle', 'price', symbol, chain],
        queryFn: () => client.getPrice(symbol, chain),
        enabled,
        refetchInterval: 60000,
      },
      {
        queryKey: ['chronicle', 'historical', symbol, chain, 24],
        queryFn: () => client.getHistoricalPrices(symbol, chain, 24),
        enabled,
        refetchInterval: 300000,
      },
      {
        queryKey: ['chronicle', 'scuttlebutt'],
        queryFn: () => client.getScuttlebuttSecurity(),
        enabled,
        refetchInterval: 300000,
      },
      {
        queryKey: ['chronicle', 'makerdao'],
        queryFn: () => client.getMakerDAOIntegration(),
        enabled,
        refetchInterval: 60000,
      },
      {
        queryKey: ['chronicle', 'validators'],
        queryFn: () => client.getValidatorNetwork(),
        enabled,
        refetchInterval: 60000,
      },
      {
        queryKey: ['chronicle', 'network'],
        queryFn: () => client.getNetworkStats(),
        enabled,
        refetchInterval: 60000,
      },
      {
        queryKey: ['chronicle', 'staking'],
        queryFn: () => client.getStakingData(),
        enabled,
        refetchInterval: 60000,
      },
      {
        queryKey: ['chronicle', 'vault'],
        queryFn: () => client.getVaultData(),
        enabled,
        refetchInterval: 60000,
      },
      {
        queryKey: ['chronicle', 'cross-chain', symbol],
        queryFn: () => client.getCrossChainPrices(symbol),
        enabled,
        refetchInterval: 60000,
      },
      {
        queryKey: ['chronicle', 'price-deviation', symbol],
        queryFn: () => client.getPriceDeviation(symbol),
        enabled,
        refetchInterval: 30000,
      },
    ],
  });

  const [
    priceResult,
    historicalResult,
    scuttlebuttResult,
    makerDAOResult,
    validatorsResult,
    networkResult,
    stakingResult,
    vaultResult,
    crossChainResult,
    deviationResult,
  ] = results;

  const isLoading = results.some((r) => r.isLoading);
  const isError = results.some((r) => r.isError);
  const errors = results.map((r) => r.error).filter(Boolean) as Error[];

  const refetchAll = () => {
    results.forEach((r) => r.refetch());
  };

  const lastUpdated = useMemo(() => {
    const timestamps = results.map((r) => r.dataUpdatedAt).filter((t): t is number => t > 0);
    return timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null;
  }, [results]);

  return useMemo(
    () => ({
      price: priceResult.data,
      historicalData: historicalResult.data,
      scuttlebutt: scuttlebuttResult.data,
      makerDAO: makerDAOResult.data,
      validatorMetrics: validatorsResult.data,
      networkStats: networkResult.data,
      staking: stakingResult.data,
      vaultData: vaultResult.data,
      crossChainData: crossChainResult.data,
      deviationData: deviationResult.data,
      isLoading,
      isError,
      errors,
      refetchAll,
      lastUpdated,
    }),
    [
      priceResult.data,
      historicalResult.data,
      scuttlebuttResult.data,
      makerDAOResult.data,
      validatorsResult.data,
      networkResult.data,
      stakingResult.data,
      vaultResult.data,
      crossChainResult.data,
      deviationResult.data,
      isLoading,
      isError,
      errors,
      lastUpdated,
    ]
  );
}

export function useChronicleVaultData() {
  return useQuery<VaultData>({
    queryKey: ['chronicle', 'vault'],
    queryFn: () => client.getVaultData(),
    refetchInterval: 60000,
  });
}

export function useChronicleScuttlebuttConsensus() {
  return useQuery<ScuttlebuttConsensus>({
    queryKey: ['chronicle', 'scuttlebutt-consensus'],
    queryFn: () => client.getScuttlebuttConsensus(),
    refetchInterval: 30000,
  });
}

export function useChronicleCrossChain(symbol: string) {
  return useQuery<CrossChainPrice[]>({
    queryKey: ['chronicle', 'cross-chain', symbol],
    queryFn: () => client.getCrossChainPrices(symbol),
    refetchInterval: 60000,
  });
}

export function useChroniclePriceDeviation(symbol: string) {
  return useQuery<PriceDeviation[]>({
    queryKey: ['chronicle', 'price-deviation', symbol],
    queryFn: () => client.getPriceDeviation(symbol),
    refetchInterval: 30000,
  });
}
