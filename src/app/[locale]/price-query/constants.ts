import {
  providerNames,
  chainNames,
  symbols,
  chainColors,
  oracleColors,
  TIME_RANGES,
  DEVIATION_THRESHOLD,
  oracleI18nKeys,
} from '@/lib/constants';
import { type OracleProvider, type Blockchain, type PriceData } from '@/lib/oracles';
import type { RedStoneTokenOnChainData } from '@/lib/oracles/clients/redstone';
import type { SupraTokenOnChainData } from '@/lib/oracles/clients/supra';
import type { DIATokenOnChainData } from '@/lib/oracles/services/diaDataService';
import type { WINkLinkTokenOnChainData } from '@/lib/oracles/services/winklinkRealDataService';

import type { QueryError } from './hooks/usePriceQueryData';
import type { ChartDataPoint } from './hooks/usePriceQueryChart';

export type { PriceData };

type AnyOnChainData = DIATokenOnChainData | RedStoneTokenOnChainData | SupraTokenOnChainData | WINkLinkTokenOnChainData;

export interface QueryResult {
  provider: OracleProvider;
  chain: Blockchain;
  priceData: PriceData;
}

export interface QueryState {
  queryResults: QueryResult[];
  historicalData: Partial<Record<string, PriceData[]>>;
  isLoading: boolean;
  queryDuration: number | null;
  queryProgress: { completed: number; total: number };
  currentQueryTarget: { oracle: OracleProvider | null; chain: Blockchain | null };
}

export interface StatsState {
  validPrices: number[];
  avgPrice: number;
  avgChange24hPercent?: number;
  maxPrice: number;
  minPrice: number;
  priceRange: number;
  standardDeviation: number;
  standardDeviationPercent: number;
}

export interface ChartConfig {
  chartData: ChartDataPoint[];
  chartContainerRef: React.RefObject<HTMLDivElement | null>;
  selectedTimeRange: number;
}

export interface ErrorState {
  queryErrors: QueryError[];
  onRetryDataSource: (provider: OracleProvider, chain: Blockchain) => void;
  onRetryAllErrors: () => void;
  onClearErrors: () => void;
}

export interface OnChainData {
  diaOnChainData?: AnyOnChainData | null;
  isDIADataLoading?: boolean;
  winklinkOnChainData?: AnyOnChainData | null;
  isWINkLinkDataLoading?: boolean;
  redstoneOnChainData?: AnyOnChainData | null;
  isRedStoneDataLoading?: boolean;
  supraOnChainData?: AnyOnChainData | null;
  isSupraDataLoading?: boolean;
}

export {
  providerNames,
  chainNames,
  symbols,
  chainColors,
  oracleColors,
  TIME_RANGES,
  DEVIATION_THRESHOLD,
  oracleI18nKeys,
};
