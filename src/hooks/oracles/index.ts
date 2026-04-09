// Shared utilities
export { useLastUpdated } from './useLastUpdated';

// Chainlink
export { useChainlinkPrice, useChainlinkHistorical } from './chainlink';

// Pyth
export { usePythPrice, usePythHistorical } from './pyth';

// RedStone
export { useRedStonePrice, useRedStoneHistorical } from './redstone';
export {
  useRedStoneOnChainData,
  formatChangeAmount,
  formatSpread,
  formatProvider,
  type UseRedStoneOnChainDataOptions,
  type UseRedStoneOnChainDataReturn,
} from './useRedStoneOnChainData';

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
export {
  useWINkLinkOnChainData,
  formatContractAddress,
  formatTPS,
  formatBlockHeight,
  type UseWINkLinkOnChainDataOptions,
  type UseWINkLinkOnChainDataReturn,
} from './useWINkLinkOnChainData';

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
