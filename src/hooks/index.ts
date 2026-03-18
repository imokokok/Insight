// DI Hooks
export {
  useService,
  useOracleClient,
  useOracleClientFactory,
  useAlertService,
  useFavoriteService,
  useSnapshotService,
  useDependencyInjection,
  useDependencyInjection as useDI,
} from './useDependencyInjection';

// Tellor Hooks
export {
  useTellorPrice,
  useTellorHistorical,
  useTellorPriceStream,
  useTellorMarketDepth,
  useTellorMultiChainAggregation,
  useTellorNetworkStats,
  useTellorLiquidity,
  useTellorStaking,
  useTellorAllData,
} from './useTellorData';

export { usePriceData, useHistoricalPrices } from './useOracleData';
export { useRefresh, useExport, useLocalStorage } from './useUtils';
export type { ExportOptions, ExportFormat, DataType } from './useUtils';
export { useOraclePrices } from './useOraclePrices';
export { usePriceHistory } from './usePriceHistory';
export type {
  PriceHistoryPoint,
  AccuracyStats,
  AccuracyTrendPoint,
  ExtremeMarketEvent,
} from './usePriceHistory';
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
export {
  useAlerts,
  useCreateAlert,
  useUpdateAlert,
  useDeleteAlert,
  useAlertEvents,
  useAcknowledgeAlert,
  useActiveAlertsRealtime,
  useAlertEventsRealtime,
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

// API3 Hooks
export {
  useAPI3Price,
  useAPI3Historical,
  useAPI3AirnodeStats,
  useAPI3DapiCoverage,
  useAPI3Staking,
  useAPI3FirstParty,
  useAPI3Latency,
  useAPI3QualityMetrics,
  useAPI3Deviations,
  useAPI3SourceTrace,
  useAPI3CoverageEvents,
  useAPI3GasFees,
  useAPI3OHLC,
  useAPI3QualityHistory,
  useAPI3CrossOracle,
  useAPI3AllData,
} from './useAPI3Data';

// UMA Realtime Hooks
export {
  useUMARealtimePrice,
  useUMARealtimeDisputes,
  useUMARealtimeValidators,
  useUMARealtime,
} from './useUMARealtime';
export type {
  UMAPriceData,
  UMADisputeUpdate,
  UMAValidatorUpdate,
  ConnectionStatus,
  UseUMARealtimePriceOptions,
  UseUMARealtimePriceReturn,
  UseUMARealtimeDisputesOptions,
  UseUMARealtimeDisputesReturn,
  UseUMARealtimeValidatorsOptions,
  UseUMARealtimeValidatorsReturn,
  UseUMARealtimeOptions,
  UseUMARealtimeReturn,
} from './useUMARealtime';

export { useChartZoom, useBrushZoom } from './useChartZoom';
export type {
  ZoomState,
  ZoomHistoryEntry,
  ZoomConfig,
  UseChartZoomOptions,
  UseChartZoomReturn,
  UseBrushZoomOptions,
  UseBrushZoomReturn,
} from './useChartZoom';

export { useChartExport, useBatchChartExport } from './useChartExport';
export type {
  ExportFormat as ChartExportFormat,
  ExportStatus as ChartExportStatus,
  ExportConfig as ChartExportConfig,
  ExportProgress as ChartExportProgress,
  DataExportConfig as ChartDataExportConfig,
  UseChartExportOptions,
  UseChartExportReturn,
  BatchExportItem,
  UseBatchChartExportOptions,
  UseBatchChartExportReturn,
} from './useChartExport';

// Technical Indicators Hook
export { useTechnicalIndicators, useBatchTechnicalIndicators } from './useTechnicalIndicators';
export type {
  IndicatorDataPoint,
  IndicatorSettings,
  BollingerBandsConfig,
  RSIConfig,
  MACDConfig,
  UseTechnicalIndicatorsOptions,
  UseTechnicalIndicatorsReturn,
  BatchIndicatorOptions,
} from './useTechnicalIndicators';

// Adaptive Downsampling Hook
export { useAdaptiveDownsampling, useChartPerformanceMonitor } from './useAdaptiveDownsampling';

// Performance Metrics Hooks
export {
  usePerformanceTracker,
  useComponentPerformance,
  useWebVitalsMonitor,
  useMemoryMonitor,
  usePerformanceReport,
  useLongTaskMonitor,
  useResourceTimingMonitor,
} from './usePerformanceMetrics';
export type {
  OperationMetric,
  ComponentRenderMetric,
  PerformanceReport,
} from './usePerformanceMetrics';

// Hover Prefetch Hooks
export {
  useHoverPrefetch,
  useHoverPrefetchHandlers,
  createPrefetchConfig,
} from './useHoverPrefetch';
export type { HoverPrefetchOptions, PrefetchConfig } from './useHoverPrefetch';

// Route Prefetch Hooks
export {
  useRoutePrefetch,
  usePrefetchOnNavigation,
  usePrefetchMetrics,
  getRoutePrefetchConfig,
  routePrefetchMap,
} from './useRoutePrefetch';
export type {
  RoutePrefetchConfig,
  PrefetchQueryConfig,
  UseRoutePrefetchOptions,
} from './useRoutePrefetch';

// Preferences Hooks
export {
  usePreferences,
  useDefaultOracle,
  useDefaultSymbol,
  useDefaultTimeRange,
  useDefaultCurrency,
  useAutoRefreshInterval,
} from './usePreferences';
export type { UserPreferences } from './usePreferences';

// Keyboard Shortcuts
export {
  useKeyboardShortcuts,
  useCommonShortcuts,
  useGlobalKeyboardListener,
  shortcutManager,
  checkShortcutConflicts,
  formatShortcut,
  getPlatformShortcut,
  shortcutKeys,
} from './useKeyboardShortcuts';
export type {
  KeyboardShortcut,
  ShortcutConflict,
} from './useKeyboardShortcuts';
