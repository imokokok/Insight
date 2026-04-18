import type { ReflectorTokenOnChainData } from '@/hooks/oracles/useReflectorOnChainData';
import type { TwapOnChainData } from '@/hooks/oracles/useTwapOnChainData';
import {
  providerNames,
  chainNames,
  symbols,
  chainColors,
  oracleColors,
  TIME_RANGES,
  DEVIATION_THRESHOLD,
} from '@/lib/constants';
import type { FlareTokenOnChainData } from '@/lib/oracles/clients/flare';
import type { RedStoneTokenOnChainData } from '@/lib/oracles/clients/redstone';
import type { SupraTokenOnChainData } from '@/lib/oracles/clients/supra';
import type { DIATokenOnChainData } from '@/lib/oracles/services/diaDataService';
import type { WINkLinkTokenOnChainData } from '@/lib/oracles/services/winklinkRealDataService';
import type { OracleProvider, Blockchain, PriceData } from '@/types/oracle';

import type { ChartDataPoint } from './hooks/usePriceQueryChart';
import type { QueryError } from './hooks/usePriceQueryData';

export type { PriceData };

type AnyOnChainData =
  | DIATokenOnChainData
  | RedStoneTokenOnChainData
  | SupraTokenOnChainData
  | WINkLinkTokenOnChainData
  | TwapOnChainData
  | ReflectorTokenOnChainData
  | FlareTokenOnChainData;

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
  twapOnChainData?: AnyOnChainData | null;
  isTwapDataLoading?: boolean;
  reflectorOnChainData?: AnyOnChainData | null;
  isReflectorDataLoading?: boolean;
  flareOnChainData?: AnyOnChainData | null;
  isFlareDataLoading?: boolean;
}

export { providerNames, chainNames, symbols, chainColors, oracleColors, TIME_RANGES };
