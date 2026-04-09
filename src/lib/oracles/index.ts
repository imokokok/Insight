export { ChainlinkClient } from '@/lib/services/oracle/clients/chainlink';
export {
  ChainlinkOnChainService,
  chainlinkOnChainService,
  type ChainlinkPriceData,
  type ChainlinkTokenData,
} from './chainlinkOnChainService';
export {
  CHAINLINK_PRICE_FEEDS,
  CHAINLINK_CONTRACTS,
  CHAINLINK_RPC_CONFIG,
  CHAINLINK_AGGREGATOR_ABI,
  CHAINLINK_TOKEN_ABI,
  getChainlinkPriceFeed,
  getChainlinkContracts,
  getChainlinkRPCConfig,
  getSupportedSymbols,
  getSupportedChainIds,
  isPriceFeedSupported,
  type ChainlinkPriceFeed,
  type ChainlinkContracts,
  type ChainlinkRPCConfig,
} from './chainlinkDataSources';
export { UMAClient } from '@/lib/services/oracle/clients/uma';
export {
  UMAOnChainService,
  umaOnChainService,
  type UMATokenData,
  type UMAAssertionData,
  type UMANetworkStats as UMAOnChainNetworkStats,
} from './umaOnChainService';
export {
  UMA_CONTRACTS,
  UMA_PRICE_FEEDS,
  UMA_RPC_CONFIG,
  OPTIMISTIC_ORACLE_V3_ABI,
  UMA_TOKEN_ABI,
  getUMAContract,
  getOptimisticOracleV3Address,
  getVotingTokenAddress,
  getUMARPCConfig,
  getSupportedUMAChainIds,
  isUMASupportedOnChain,
  type UMAContract,
  type UMAPriceFeed,
  type UMARPCConfig,
} from './umaDataSources';
export { PythClient } from '@/lib/services/oracle/clients/pyth';
export { API3Client } from '@/lib/services/oracle/clients/api3';
export { RedStoneClient } from '@/lib/services/oracle/clients/redstone';
export { DIAClient } from '@/lib/services/oracle/clients/dia';
export {
  DIADataService,
  getDIADataService,
  resetDIADataService,
  type DIAAssetQuotation,
  type DIANFTQuotation,
  type DIASupply,
  type DIADigitalAsset,
  type DIANetworkStatsData,
  type DIAStakingData,
  type DIANFTCollection,
  type DIANFTData,
  type DIAEcosystemIntegration,
  type DIAExchange,
} from './diaDataService';
export { WINkLinkClient } from '@/lib/services/oracle/clients/winklink';
export {
  PythHermesClient,
  getPythHermesClient,
  resetPythHermesClient,
  type PythPriceUpdate,
} from './pythHermesClient';
export {
  PythDataService,
  getPythDataService,
  resetPythDataService,
  type PublisherData,
  type ValidatorData,
  type CrossChainPriceData,
  type CrossChainResult,
} from './pythDataService';
export type { RetryConfig } from './pythConstants';
export { BaseOracleClient, shouldUseDatabase, configureStorage, getStorageConfig } from './base';
export type { OracleClientConfig, OracleStorageConfig } from './base';
export type { IOracleClient, IOracleClientFactory } from './interfaces';
export {
  savePriceToDatabase,
  savePricesToDatabase,
  getPriceFromDatabase,
  getHistoricalPricesFromDatabase,
  savePriceWithFallback,
  saveHistoricalPricesWithFallback,
} from './storage';
export {
  OracleClientFactory,
  getOracleClient,
  getAllOracleClients,
  getOracleClientFromDI,
  registerMockOracleFactory,
  unregisterMockOracleFactory,
} from './factory';
export * from '@/types/oracle';
export { getOracleColor } from './colors';

// Performance Metrics Calculator
export {
  PerformanceMetricsCalculator,
  performanceMetricsCalculator,
  type CalculatedPerformanceMetrics,
  type PriceHistoryEntry,
  type MetricsCalculationConfig,
} from './performanceMetricsCalculator';

// Oracle Data Utilities
export {
  getHoursForTimeRange,
  fetchOraclePrice,
  fetchMultipleOraclePrices,
  createPriceHistoryManager,
  extractBaseSymbol,
  type TimeRangeValue,
  type OraclePriceFetchResult,
  type FetchOraclePriceOptions,
  type FetchOraclePriceResult,
  type FetchMultipleOraclePricesOptions,
  type FetchMultipleOraclePricesResult,
  type PriceHistoryPoint,
  type PriceHistoryManager,
} from './oracleDataUtils';
