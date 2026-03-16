import { useQuery, useQueries } from '@tanstack/react-query';
import {
  ChronicleClient,
  ScuttlebuttData,
  MakerDAOIntegration,
  ValidatorNetwork,
} from '@/lib/oracles';
import { Blockchain } from '@/types/oracle';
import { useMemo } from 'react';

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
  ] = results;

  const isLoading = results.some((r) => r.isLoading);
  const isError = results.some((r) => r.isError);
  const errors = results.map((r) => r.error).filter(Boolean) as Error[];

  const refetchAll = () => {
    results.forEach((r) => r.refetch());
  };

  return useMemo(
    () => ({
      price: priceResult.data,
      historicalData: historicalResult.data,
      scuttlebutt: scuttlebuttResult.data,
      makerDAO: makerDAOResult.data,
      validatorMetrics: validatorsResult.data,
      networkStats: networkResult.data,
      staking: stakingResult.data,
      isLoading,
      isError,
      errors,
      refetchAll,
    }),
    [
      priceResult.data,
      historicalResult.data,
      scuttlebuttResult.data,
      makerDAOResult.data,
      validatorsResult.data,
      networkResult.data,
      stakingResult.data,
      isLoading,
      isError,
      errors,
    ]
  );
}
