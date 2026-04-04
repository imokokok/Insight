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
export {
  useHoverPrefetch,
  useHoverPrefetchHandlers,
  createPrefetchConfig,
} from './useHoverPrefetch';
export type { HoverPrefetchOptions, PrefetchConfig } from './useHoverPrefetch';
export {
  useRoutePrefetch,
  usePrefetchOnNavigation,
  usePrefetchMetrics,
  getRoutePrefetchConfig as getRoutePrefetchConfigUI,
  routePrefetchMap,
} from './useRoutePrefetch';
export type {
  RoutePrefetchConfig,
  PrefetchQueryConfig,
  UseRoutePrefetchOptions,
} from './useRoutePrefetch';
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
export { useAdaptiveDownsampling, useChartPerformanceMonitor } from './useAdaptiveDownsampling';
