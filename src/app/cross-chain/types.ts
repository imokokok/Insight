/**
 * @fileoverview 跨链数据类型定义
 */

import { type FavoriteConfig, type useFavorites } from '@/hooks';
import {
  type OracleProvider,
  type Blockchain,
  type PriceData,
  type BaseOracleClient,
} from '@/lib/oracles';
import type { useUser } from '@/stores/authStore';

import { type RefreshInterval } from './constants';
import {
  type UseStatisticsReturn,
  type UseChartDataReturn,
  type PriceDifferenceItem,
} from './hooks';
import { type AnomalousPricePoint } from './utils/anomalyDetection';

export interface UseCrossChainDataReturn {
  selectedProvider: OracleProvider;
  setSelectedProvider: (provider: OracleProvider) => void;
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
  selectedTimeRange: number;
  setSelectedTimeRange: (range: number) => void;
  selectedBaseChain: Blockchain | null;
  setSelectedBaseChain: (chain: Blockchain | null) => void;
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
  hoveredCell: { xChain: Blockchain; yChain: Blockchain; x: number; y: number } | null;
  setHoveredCell: (
    cell: { xChain: Blockchain; yChain: Blockchain; x: number; y: number } | null
  ) => void;
  selectedCell: { xChain: Blockchain; yChain: Blockchain } | null;
  setSelectedCell: (cell: { xChain: Blockchain; yChain: Blockchain } | null) => void;
  tooltipPosition: { x: number; y: number };
  setTooltipPosition: (position: { x: number; y: number }) => void;
  refreshInterval: RefreshInterval;
  setRefreshInterval: (interval: RefreshInterval) => void;
  lastUpdated: Date | null;
  currentPrices: PriceData[];
  historicalPrices: Partial<Record<Blockchain, PriceData[]>>;
  loading: boolean;
  refreshStatus: 'idle' | 'refreshing' | 'success' | 'error';
  showRefreshSuccess: boolean;
  recommendedBaseChain: Blockchain | null;
  supportedChains: Blockchain[];
  currentClient: BaseOracleClient;
  fetchData: () => Promise<void>;
  filteredChains: Blockchain[];
  priceDifferences: PriceDifferenceItem[];
  sortedPriceDifferences: PriceDifferenceItem[];
  chartData: UseChartDataReturn['chartData'];
  chartDataWithMA: UseChartDataReturn['chartDataWithMA'];
  heatmapData: UseChartDataReturn['heatmapData'];
  maxHeatmapValue: number;
  priceDistributionData: { range: string; count: number; midPrice: number }[];
  boxPlotData: UseChartDataReturn['boxPlotData'];
  totalDataPoints: number;
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
  iqrOutliers: UseChartDataReturn['iqrOutliers'];
  stdDevHistoricalOutliers: UseChartDataReturn['stdDevHistoricalOutliers'];
  scatterData: UseChartDataReturn['scatterData'];
  correlationMatrix: UseChartDataReturn['correlationMatrix'];
  correlationMatrixWithSignificance: UseChartDataReturn['correlationMatrixWithSignificance'];
  chainVolatility: Partial<Record<Blockchain, number>>;
  updateDelays: Partial<Record<Blockchain, { avgDelay: number; maxDelay: number }>>;
  dataIntegrity: Partial<Record<Blockchain, number>>;
  actualUpdateIntervals: Partial<Record<Blockchain, number>>;
  priceJumpFrequency: Partial<Record<Blockchain, number>>;
  priceChangePercent: Partial<Record<Blockchain, number>>;
  meanBinIndex: number;
  medianBinIndex: number;
  stdDevBinRange: { lower: number; upper: number } | null;
  chainsWithHighDeviation: PriceDifferenceItem[];
  prevStats: {
    avgPrice: number;
    maxPrice: number;
    minPrice: number;
    priceRange: number;
    standardDeviationPercent: number;
  } | null;
  anomalies: AnomalousPricePoint[];
  sortColumn: string;
  setSortColumn: (column: string) => void;
  sortDirection: 'asc' | 'desc';
  setSortDirection: (direction: 'asc' | 'desc') => void;
  toggleChain: (chain: Blockchain) => void;
  handleSort: (column: string) => void;
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
