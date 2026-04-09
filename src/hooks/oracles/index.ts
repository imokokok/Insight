// Shared utilities
export { useLastUpdated } from './useLastUpdated';

// Chainlink
export { useChainlinkPrice, useChainlinkHistorical } from './chainlink';

// Pyth
export { usePythPrice, usePythHistorical } from './pyth';

// RedStone
export { useRedStonePrice, useRedStoneHistorical } from './redstone';

// DIA
export { useDIAPrice, useDIAHistorical } from './dia';
export {
  useDIAOnChainData,
  formatLargeNumber,
  formatSupply,
  formatChangePercent,
  type UseDIAOnChainDataOptions,
  type UseDIAOnChainDataReturn,
} from './useDIAOnChainData';

// WINkLink
export { useWINkLinkPrice, useWINkLinkHistoricalPrices } from './winklink';

// API3
export { useAPI3Price, useAPI3Historical } from './api3/index';

// UMA
export { useUMAPrice, useUMAHistorical } from './uma';

// Unified Oracle Page Hook removed - no longer needed

// Performance Metrics Hook
export {
  useCalculatedPerformanceMetrics,
  type OraclePriceResult,
} from './useCalculatedPerformanceMetrics';

// Cross Oracle with Metrics Hook
export {
  useCrossOracleWithMetrics,
  type UseCrossOracleWithMetricsOptions,
  type UseCrossOracleWithMetricsReturn,
} from './useCrossOracleWithMetrics';
