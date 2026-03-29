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
} from './oracles/tellor';

export { usePriceData, useHistoricalPrices } from './useOracleData';
export { useRefresh, useExport, useLocalStorage } from './useUtils';
export type { ExportOptions, ExportFormat, DataType, ExportScope, Resolution } from './useUtils';
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
  useAPI3OEVStats,
  useAPI3OEVAuctions,
} from './oracles/api3';

// API3 WebSocket Hooks
export { useAPI3Price as useAPI3PriceRealtime } from './useAPI3WebSocket';
export type {
  UseAPI3PriceOptions as UseAPI3PriceRealtimeOptions,
  UseAPI3PriceReturn as UseAPI3PriceRealtimeReturn,
  API3ConnectionStatus,
} from './useAPI3WebSocket';

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

// Performance Optimizer Hooks
export {
  usePerformanceOptimizer,
  useWebVitalsOptimizer,
  useResourceOptimizer,
  useNavigationOptimizer,
  useLazyLoadOptimizer,
  useRouteOptimizer,
  useMemoryOptimizer,
} from './usePerformanceOptimizer';
export type {
  PerformanceMetrics,
  ResourceMetric,
  NavigationTiming,
  OptimizationSuggestion,
} from './usePerformanceOptimizer';

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
export type { KeyboardShortcut, ShortcutConflict } from './useKeyboardShortcuts';

// Chainlink Hooks
export { useChainlinkAllData } from './oracles/chainlink';

// Chronicle Hooks
export { useChronicleAllData } from './oracles/chronicle';

// DIA Hooks
export {
  useDIADataTransparency,
  useDIADataSourceVerification,
  useDIANetworkStats,
  useDIAStaking,
  useDIANFTData,
  useDIAStakingDetails,
  useDIACustomFeeds,
  useDIAEcosystem,
  useDIAAllData,
} from './oracles/dia';

// Pyth Hooks
export { usePythAllData } from './oracles/pyth';

// RedStone Hooks
export { useRedStoneAllData, useRedStoneProviders, useRedStoneMetrics } from './oracles/redstone';

// UMA Hooks
export {
  useUMAAllData,
  useUMAPrice,
  useUMAHistorical,
  useUMANetworkStats,
  useUMAValidators,
  useUMADisputes,
} from './oracles/uma';

// Band Protocol Hooks
export {
  useBandProtocolAllData,
  useBandPrice,
  useBandHistorical,
  useBandNetworkStats,
  useBandValidators,
  useBandCrossChainStats,
  useBandIBCConnections,
  useBandIBCTransferStats,
  useBandIBCTransferTrends,
  useBandStakingInfo,
  useBandStakingDistribution,
  useBandStakingReward,
  useBandGovernanceProposals,
  useBandGovernanceParams,
} from './oracles/band';

// Shared Oracle Hooks
export { useLastUpdated } from './oracles/useLastUpdated';
export { useDataFreshness } from './useDataFreshness';
export type { DataFreshnessStatus, UseDataFreshnessReturn } from './useDataFreshness';

// WINkLink Hooks
export { useWINkLinkAllData } from './oracles/winklink';

// Alerts Hooks
export { useBatchAlerts } from './useAlerts';

// Tellor Hooks (additional)
export { useStakingCalculator } from './oracles/tellor';

// Realtime Hooks
export { useRealtimeAlerts } from './useRealtimeAlerts';

// Debounce Hook
export { useDebounce, useDebouncedCallback } from './useDebounce';
export type { UseDebounceOptions } from './useDebounce';

// Oracle Statistics Hook
export { useOracleStatistics } from './useOracleStatistics';
export type {
  HistoryMinMaxValue,
  HistoryMinMax,
  ConsistencyRating,
  OracleStatisticsResult,
  initialHistoryMinMax,
} from './useOracleStatistics';

// Deviation Detection Hook
export { useDeviationDetection, useBatchDeviationDetection } from './useDeviationDetection';
export type {
  DeviationLevel,
  DeviationType,
  DeviationThreshold,
  DeviationDetectionResult,
  DEFAULT_DEVIATION_THRESHOLD,
} from './useDeviationDetection';

// API3 Analytics Hook
export { useAPI3Analytics } from './useAPI3Analytics';
export type {
  DataPoint,
  Anomaly,
  PredictionResult,
  CorrelationResult,
  ComparisonResult,
  MetricDefinition,
  ReportConfig,
  DataSource,
  TimeRange,
} from './useAPI3Analytics';
