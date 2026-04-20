import { type FavoriteConfig, type useFavorites } from '@/hooks';
import { type BaseOracleClient } from '@/lib/oracles';
import type { useUser } from '@/stores/authStore';
import { type OracleProvider, type Blockchain, type PriceData } from '@/types/oracle';

import { type RefreshInterval } from './constants';
import { type UseStatisticsReturn, type UseChartDataReturn } from './hooks';
import { type AnomalousPricePoint } from './utils/anomalyDetection';

export interface PriceDifferenceItem {
  chain: Blockchain;
  price: number;
  diff: number;
  diffPercent: number;
}

export interface SelectorSlice {
  selectedProvider: OracleProvider;
  setSelectedProvider: (provider: OracleProvider) => void;
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
  selectedTimeRange: number;
  setSelectedTimeRange: (range: number) => void;
  selectedBaseChain: Blockchain | null;
  setSelectedBaseChain: (chain: Blockchain | null) => void;
  refreshInterval: RefreshInterval;
  setRefreshInterval: (interval: RefreshInterval) => void;
}

export interface UISlice {
  visibleChains: Blockchain[];
  setVisibleChains: (chains: Blockchain[]) => void;
  showMA: boolean;
  setShowMA: (show: boolean) => void;
  maPeriod: number;
  setMaPeriod: (period: number) => void;
  chartKey: number;
  setChartKey: (key: number) => void;
  hiddenLines: string[];
  setHiddenLines: (lines: string[]) => void;
  focusedChain: Blockchain | null;
  setFocusedChain: (chain: Blockchain | null) => void;
  tableFilter: 'all' | 'abnormal' | 'normal';
  setTableFilter: (filter: 'all' | 'abnormal' | 'normal') => void;
  sortColumn: string;
  setSortColumn: (column: string) => void;
  sortDirection: 'asc' | 'desc';
  setSortDirection: (direction: 'asc' | 'desc') => void;
}

export interface DataStateSlice {
  lastUpdated: Date | null;
  currentPrices: PriceData[];
  loading: boolean;
  refreshStatus: 'idle' | 'refreshing' | 'success' | 'error';
  showRefreshSuccess: boolean;
  recommendedBaseChain: Blockchain | null;
  supportedChains: Blockchain[];
  currentClient: BaseOracleClient;
  fetchData: () => Promise<void>;
  prevStats: {
    avgPrice: number;
    maxPrice: number;
    minPrice: number;
    priceRange: number;
    standardDeviationPercent: number;
  } | null;
  anomalies: AnomalousPricePoint[];
}

export interface StatisticsSlice {
  validPrices: number[];
  avgPrice: number;
  maxPrice: number;
  minPrice: number;
  priceRange: number;
  variance: number;
  standardDeviation: number;
  standardDeviationPercent: number;
  coefficientOfVariation: number;
  medianPrice: number;
  iqrValue: number;
  skewness: number;
  kurtosis: number;
  confidenceInterval95: UseStatisticsReturn['confidenceInterval95'];
}

export interface ChartSlice {
  filteredChains: Blockchain[];
  priceDifferences: PriceDifferenceItem[];
  heatmapData: UseChartDataReturn['heatmapData'];
  maxHeatmapValue: number;
  iqrOutliers: UseChartDataReturn['iqrOutliers'];
}

export interface TableSlice {
  sortedPriceDifferences: PriceDifferenceItem[];
  chainsWithHighDeviation: PriceDifferenceItem[];
  toggleChain: (chain: Blockchain) => void;
  handleSort: (column: string) => void;
}

export interface ExportSlice {
  exportToCSV: () => boolean;
  exportToJSON: () => boolean;
  user: ReturnType<typeof useUser>;
  chainFavorites: ReturnType<typeof useFavorites>['favorites'];
  currentFavoriteConfig: FavoriteConfig;
  showFavoritesDropdown: boolean;
  setShowFavoritesDropdown: (show: boolean) => void;
  favoritesDropdownRef: React.RefObject<HTMLDivElement | null>;
  handleApplyFavorite: (config: FavoriteConfig) => void;
  clearCache: () => void;
  clearCacheForProvider: (provider: OracleProvider) => void;
}

export type UseCrossChainDataReturn = SelectorSlice &
  UISlice &
  DataStateSlice &
  StatisticsSlice &
  ChartSlice &
  TableSlice &
  ExportSlice;
