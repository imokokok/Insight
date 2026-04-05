import {
  type OracleMarketData,
  type AssetData,
  type ChainBreakdown,
  type ProtocolDetail,
  type AssetCategory,
  type ComparisonData,
  type BenchmarkData,
  type CorrelationData,
  type CorrelationPair,
  type RadarDataPoint,
} from '@/app/[locale]/market-overview/types';

export class MarketDataError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'MarketDataError';
  }
}

export interface DefiLlamaOracleResponse {
  oracles?: Array<{
    name: string;
    tvs?: number;
    tvsPrevDay?: number;
    tvsPrevWeek?: number;
    tvsPrevMonth?: number;
    chains?: string[];
    protocols?: number;
    mcaps?: number;
  }>;
}

export interface DefiLlamaProtocol {
  name: string;
  tvl?: number;
  chainTvls?: Record<string, number>;
  chains?: string[];
  category?: string;
  oracles?: string[];
}

export interface DefiLlamaChain {
  gecko_id: string | null;
  tvl: number;
  tokenSymbol: string | null;
  cmcId: string | null;
  name: string;
  chainId: string;
}

export interface CategoryData {
  id: string;
  name: string;
  market_cap: number;
  total_volume: number;
}

export type {
  OracleMarketData,
  AssetData,
  ChainBreakdown,
  ProtocolDetail,
  AssetCategory,
  ComparisonData,
  BenchmarkData,
  CorrelationData,
  CorrelationPair,
  RadarDataPoint,
};
