'use client';

import { useCallback } from 'react';

import { useQuery } from '@tanstack/react-query';

import {
  type PriceFeed,
  type NetworkStats,
  type PublisherData,
  type ValidatorData,
} from '@/app/[locale]/pyth/types';
import { getPythDataService, type CrossChainResult } from '@/lib/oracles/pythDataService';
import { PythClient } from '@/lib/oracles/pythNetwork';
import { type Blockchain, type PriceData } from '@/types/oracle';

const pythClient = new PythClient();
const pythDataService = getPythDataService();

type PythDataType = 'price' | 'historical' | 'network' | 'publishers' | 'validators';

const getPythKey = (type: PythDataType, params?: Record<string, unknown>): string[] => {
  const baseKey = ['pyth', type];
  if (!params) return baseKey;
  const paramStr = Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join('&');
  return [...baseKey, paramStr];
};

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
    queryFn: () => pythDataService.getPublishers(),
    enabled,
    staleTime: 300000,
    gcTime: 600000,
  });

  const validatorsQuery = useQuery<ValidatorData[], Error>({
    queryKey: getPythKey('validators', { symbol, chain }),
    queryFn: () => pythDataService.getValidators(),
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
  const isError = Boolean(
    priceQuery.error ||
    historicalQuery.error ||
    networkQuery.error ||
    publishersQuery.error ||
    validatorsQuery.error
  );
  const errors = [
    priceQuery.error,
    historicalQuery.error,
    networkQuery.error,
    publishersQuery.error,
    validatorsQuery.error,
  ].filter(Boolean) as Error[];

  const refetchAll = useCallback(async () => {
    await Promise.all([
      priceQuery.refetch(),
      historicalQuery.refetch(),
      networkQuery.refetch(),
      publishersQuery.refetch(),
      validatorsQuery.refetch(),
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

interface UsePythPriceFeedsOptions {
  enabled?: boolean;
}

const SYMBOL_TO_CATEGORY: Record<string, PriceFeed['category']> = {
  'BTC/USD': 'crypto',
  'ETH/USD': 'crypto',
  'SOL/USD': 'crypto',
  'PYTH/USD': 'crypto',
  'USDC/USD': 'crypto',
  'LINK/USD': 'crypto',
  'AVAX/USD': 'crypto',
  'MATIC/USD': 'crypto',
  'DOT/USD': 'crypto',
  'UNI/USD': 'crypto',
  'ARB/USD': 'crypto',
  'OP/USD': 'crypto',
  'DOGE/USD': 'crypto',
  'XRP/USD': 'crypto',
  'ADA/USD': 'crypto',
  'BNB/USD': 'crypto',
};

const UPDATE_FREQUENCIES: Record<string, string> = {
  crypto: '400ms',
  forex: '1s',
  commodities: '2s',
  equities: '3s',
};

const DEVIATION_THRESHOLDS: Record<string, string> = {
  crypto: '0.1%',
  forex: '0.05%',
  commodities: '0.1%',
  equities: '0.2%',
};

function transformPriceFeed(raw: { id: string; symbol: string; status: string }): PriceFeed {
  const category = SYMBOL_TO_CATEGORY[raw.symbol] ?? 'crypto';
  const status: PriceFeed['status'] =
    raw.status === 'active' ? 'active' : raw.status === 'paused' ? 'paused' : 'deprecated';

  return {
    id: raw.id,
    name: raw.symbol,
    category,
    updateFrequency: UPDATE_FREQUENCIES[category] ?? '400ms',
    deviationThreshold: DEVIATION_THRESHOLDS[category] ?? '0.1%',
    status,
    totalRequests: Math.floor(Math.random() * 15000000) + 1000000,
    reliability: 99.9 + Math.random() * 0.1,
  };
}

export function usePythPriceFeeds(options: UsePythPriceFeedsOptions = {}) {
  const { enabled = true } = options;
  const pythDataService = getPythDataService();

  const { data, error, isLoading, refetch } = useQuery<PriceFeed[], Error>({
    queryKey: ['pyth', 'priceFeeds'],
    queryFn: async () => {
      const rawFeeds = await pythDataService.getPriceFeeds();
      return rawFeeds.map(transformPriceFeed);
    },
    enabled,
    staleTime: 300000,
    gcTime: 600000,
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

interface UsePythCrossChainOptions {
  symbol?: string;
  enabled?: boolean;
}

export function usePythCrossChain(options: UsePythCrossChainOptions = {}) {
  const { symbol = 'SOL/USD', enabled = true } = options;
  const service = getPythDataService();

  const { data, error, isLoading, refetch } = useQuery<CrossChainResult, Error>({
    queryKey: ['pyth', 'crossChain', symbol],
    queryFn: () => service.getCrossChainPrices(symbol),
    enabled,
    staleTime: 10000,
    gcTime: 30000,
    refetchInterval: 10000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  return {
    crossChainData: data?.data ?? [],
    basePrice: data?.basePrice ?? 0,
    timestamp: data?.timestamp ?? 0,
    error,
    isLoading,
    refetch,
  };
}
