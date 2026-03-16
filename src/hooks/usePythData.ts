'use client';

import { useQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { PythClient } from '@/lib/oracles/pythNetwork';
import { PriceData, Blockchain } from '@/types/oracle';

const pythClient = new PythClient();

type PythDataType = 'price' | 'historical' | 'network' | 'publishers' | 'validators';

const getPythKey = (type: PythDataType, params?: Record<string, unknown>): string[] => {
  const baseKey = ['pyth', type];
  if (!params) return baseKey;
  const paramStr = Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return [...baseKey, paramStr];
};

interface NetworkStats {
  activeNodes: number;
  dataFeeds: number;
  nodeUptime: number;
  avgResponseTime: number;
  updateFrequency: number;
}

interface PublisherData {
  id: string;
  name: string;
  stake: number;
  accuracy: number;
}

interface ValidatorData {
  id: string;
  name: string;
  stake: number;
  uptime: number;
  rewards: number;
  status: 'active' | 'inactive' | 'jailed';
}

interface UsePythPriceOptions {
  symbol: string;
  chain?: Blockchain;
  enabled?: boolean;
}

export function usePythPrice(options: UsePythPriceOptions) {
  const { symbol, chain, enabled = true } = options;
  const queryKey = getPythKey('price', { symbol, chain });

  const { data, error, isLoading, refetch } = useQuery<PriceData, Error>({
    queryKey,
    queryFn: () => pythClient.getPrice(symbol, chain),
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

interface UsePythHistoricalOptions {
  symbol: string;
  chain?: Blockchain;
  period?: number;
  enabled?: boolean;
}

export function usePythHistorical(options: UsePythHistoricalOptions) {
  const { symbol, chain, period = 30, enabled = true } = options;
  const queryKey = getPythKey('historical', { symbol, chain, period });

  const { data, error, isLoading, refetch } = useQuery<PriceData[], Error>({
    queryKey,
    queryFn: () => pythClient.getHistoricalPrices(symbol, chain, period),
    enabled,
    staleTime: 300000,
    gcTime: 600000,
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

interface UsePythAllDataOptions {
  symbol: string;
  chain?: Blockchain;
  enabled?: boolean;
}

export function usePythAllData(options: UsePythAllDataOptions) {
  const { symbol, chain, enabled = true } = options;

  const priceQuery = usePythPrice({ symbol, chain, enabled });
  const historicalQuery = usePythHistorical({ symbol, chain, enabled });

  const networkQuery = useQuery<NetworkStats, Error>({
    queryKey: getPythKey('network', { symbol, chain }),
    queryFn: async () => {
      return {
        activeNodes: 100,
        dataFeeds: 500,
        nodeUptime: 99.9,
        avgResponseTime: 100,
        updateFrequency: 1,
      };
    },
    enabled,
    staleTime: 300000,
    gcTime: 600000,
  });

  const publishersQuery = useQuery<PublisherData[], Error>({
    queryKey: getPythKey('publishers', { symbol, chain }),
    queryFn: async () => {
      return [
        { id: '1', name: 'Publisher A', stake: 1000000, accuracy: 98 },
        { id: '2', name: 'Publisher B', stake: 800000, accuracy: 97 },
        { id: '3', name: 'Publisher C', stake: 600000, accuracy: 96 },
        { id: '4', name: 'Publisher D', stake: 450000, accuracy: 95 },
        { id: '5', name: 'Publisher E', stake: 300000, accuracy: 94 },
        { id: '6', name: 'Publisher F', stake: 250000, accuracy: 93 },
      ];
    },
    enabled,
    staleTime: 300000,
    gcTime: 600000,
  });

  const validatorsQuery = useQuery<ValidatorData[], Error>({
    queryKey: getPythKey('validators', { symbol, chain }),
    queryFn: async () => {
      return [
        {
          id: '1',
          name: 'Validator A',
          stake: 5000000,
          uptime: 99.9,
          rewards: 125000,
          status: 'active',
        },
        {
          id: '2',
          name: 'Validator B',
          stake: 4200000,
          uptime: 99.8,
          rewards: 105000,
          status: 'active',
        },
        {
          id: '3',
          name: 'Validator C',
          stake: 3800000,
          uptime: 99.7,
          rewards: 95000,
          status: 'active',
        },
        {
          id: '4',
          name: 'Validator D',
          stake: 2900000,
          uptime: 98.5,
          rewards: 72500,
          status: 'active',
        },
        {
          id: '5',
          name: 'Validator E',
          stake: 2100000,
          uptime: 97.2,
          rewards: 52500,
          status: 'inactive',
        },
        {
          id: '6',
          name: 'Validator F',
          stake: 1500000,
          uptime: 95.0,
          rewards: 37500,
          status: 'jailed',
        },
      ];
    },
    enabled,
    staleTime: 300000,
    gcTime: 600000,
  });

  const isLoading =
    priceQuery.isLoading ||
    historicalQuery.isLoading ||
    networkQuery.isLoading ||
    publishersQuery.isLoading ||
    validatorsQuery.isLoading;
  const isError =
    priceQuery.error !== null ||
    historicalQuery.error !== null ||
    networkQuery.error !== null ||
    publishersQuery.error !== null ||
    validatorsQuery.error !== null;
  const errors = [
    priceQuery.error,
    historicalQuery.error,
    networkQuery.error,
    publishersQuery.error,
    validatorsQuery.error,
  ].filter(Boolean) as Error[];

  const refetchAll = useCallback(() => {
    priceQuery.refetch();
    historicalQuery.refetch();
    networkQuery.refetch();
    publishersQuery.refetch();
    validatorsQuery.refetch();
  }, [priceQuery, historicalQuery, networkQuery, publishersQuery, validatorsQuery]);

  return {
    price: priceQuery.price,
    historicalData: historicalQuery.historicalData,
    networkStats: networkQuery.data,
    publishers: publishersQuery.data ?? [],
    validators: validatorsQuery.data ?? [],
    isLoading,
    isError,
    errors,
    refetchAll,
  };
}
