import type { OracleProvider, Blockchain } from '@/types/oracle';

export const priceQueryKeys = {
  all: ['price-query'] as const,
  prices: () => [...priceQueryKeys.all, 'prices'] as const,
  price: (provider: OracleProvider, chain: Blockchain, symbol: string) =>
    [...priceQueryKeys.prices(), provider, chain, symbol] as const,
  historical: () => [...priceQueryKeys.all, 'historical'] as const,
  historicalData: (
    provider: OracleProvider,
    chain: Blockchain,
    symbol: string,
    timeRange: number
  ) => [...priceQueryKeys.historical(), provider, chain, symbol, timeRange] as const,
  multiOracle: (symbol: string) => [...priceQueryKeys.all, 'multi-oracle', symbol] as const,
  comparison: (symbol: string, timeRange: number) =>
    [...priceQueryKeys.all, 'comparison', symbol, timeRange] as const,
} as const;

export type PriceQueryKeys = typeof priceQueryKeys;
