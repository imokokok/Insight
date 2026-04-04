export { useOracleData } from './useOracleData';
export { useOraclePrices } from './useOraclePrices';
export { usePriceHistory } from './usePriceHistory';
export {
  usePrefetchOracleData,
  usePrefetchOraclePrices,
  usePrefetchPriceHistory,
  useInvalidateOracleQueries,
  useInvalidatePriceQueries,
} from './usePrefetchQueries';
export { usePriceData, useHistoricalPrices } from './useOracleClientData';
export { useOraclePrices as useMultiOraclePrices } from './useMultiOraclePrices';
export { usePriceHistory as usePriceHistoryAnalysis } from './usePriceHistoryAnalysis';
export type {
  PriceHistoryPoint,
  AccuracyStats,
  AccuracyTrendPoint,
  ExtremeMarketEvent,
  marketConditionDescriptions,
  networkEventKeys,
} from './usePriceHistoryAnalysis';
export { useOracleStatistics } from './useOracleStatistics';
export type {
  HistoryMinMaxValue,
  HistoryMinMax,
  ConsistencyRating,
  OracleStatisticsResult,
  initialHistoryMinMax,
} from './useOracleStatistics';
export {
  useAlerts,
  useCreateAlert,
  useUpdateAlert,
  useDeleteAlert,
  useAlertEvents,
  useAcknowledgeAlert,
  useActiveAlertsRealtime,
  useAlertEventsRealtime,
  useBatchAlerts,
} from './useAlerts';
export type {
  CreateAlertInput,
  UpdateAlertInput,
  UseAlertsReturn,
  UseCreateAlertReturn,
  UseUpdateAlertReturn,
  UseDeleteAlertReturn,
  UseAlertEventsReturn,
  UseAcknowledgeAlertReturn,
} from './useAlerts';
export {
  useFavorites,
  useAddFavorite,
  useRemoveFavorite,
  useToggleFavorite,
  useIsFavorited,
  useUpdateFavorite,
  mapConfigTypeFromDB,
} from './useFavorites';
export type { FavoriteConfig, UseFavoritesOptions } from './useFavorites';
export { useRealtimeAlerts } from './useRealtimeAlerts';
export { useDataFreshness } from './useDataFreshness';
export type { DataFreshnessStatus, UseDataFreshnessReturn } from './useDataFreshness';
export { useOraclePage } from './useOraclePage';
export type { NetworkStats, OraclePageData, UseOraclePageOptions } from './useOraclePage';
export {
  useOptimizedQuery,
  useBatchQueries,
  useCachePriorityQuery,
  useOptimizedMutation,
  usePollingQuery,
  useInfiniteScroll,
  useOptimisticMutation,
  useQueryPerformance,
  useConditionalQuery,
} from './useOptimizedQuery';
export type {
  UseBatchQueriesOptions,
  UseBatchQueriesResult,
  UseInfiniteScrollOptions,
} from './useOptimizedQuery';
export { useSmartPrefetch, useVisibilityPrefetch, createPrefetchTarget } from './usePrefetch';
export type { PrefetchTarget, UsePrefetchOptions, UseSmartPrefetchOptions } from './usePrefetch';
