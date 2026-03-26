// Performance Optimization Components

// Dynamic Page Components
export {
  DynamicCrossOraclePage,
  DynamicCrossChainPage,
  DynamicMarketOverviewPage,
  DynamicPriceQueryPage,
  DynamicAlertsPage,
  DynamicFavoritesPage,
  DynamicSettingsPage,
  DynamicChainlinkPage,
  DynamicPythPage,
  DynamicAPI3Page,
  DynamicBandProtocolPage,
  DynamicDIAPage,
  DynamicUMAPage,
  DynamicTellorPage,
  DynamicRedStonePage,
  DynamicChroniclePage,
  DynamicWINkLinkPage,
  preloadPage,
  preloadPages,
  createDynamicPage,
} from './DynamicPageComponents';
export type { DynamicPageComponent } from './DynamicPageComponents';

// Optimized Image Components
export {
  OptimizedImage,
  LazyImage,
  ResponsiveImage,
  AvatarImage,
  BackgroundImage,
} from './OptimizedImage';
export type {
  OptimizedImageProps,
  LazyImageProps,
  ResponsiveImageProps,
  AvatarImageProps,
  BackgroundImageProps,
} from './OptimizedImage';

// Performance Monitoring Components
export { PerformanceMonitor } from './PerformanceMonitor';
export type { PerformanceMonitorProps } from './PerformanceMonitor';

// Virtual List for Large Data Sets
export { VirtualList, VirtualGrid } from './VirtualList';
export type { VirtualListProps, VirtualGridProps } from './VirtualList';

// Code Splitting Utilities
export {
  withCodeSplitting,
  withPreload,
  createDynamicComponent,
} from './codeSplitting';
export type {
  CodeSplittingOptions,
  DynamicComponentOptions,
} from './codeSplitting';
