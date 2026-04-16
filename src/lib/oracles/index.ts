export { ChainlinkClient } from './clients/chainlink';
export {
  ChainlinkOnChainService,
  chainlinkOnChainService,
  type ChainlinkPriceData,
  type ChainlinkTokenData,
} from './services/chainlinkOnChainService';
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
} from './services/chainlinkDataSources';
export { PythClient } from './clients/PythClient';
export { API3Client } from './clients/api3';
export { RedStoneClient } from './clients/redstone';
export { DIAClient } from './clients/dia';
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
} from './services/diaDataService';
export { WINkLinkClient } from './clients/winklink';
export { SupraClient } from './clients/supra';
export {
  SupraDataService,
  getSupraDataService,
  resetSupraDataService,
  type SupraLatestPriceData,
  type SupraOHLCDataPoint,
} from './services/supraDataService';
export {
  PythDataService,
  getPythDataService,
  resetPythDataService,
  type PublisherData,
  type ValidatorData,
  type CrossChainPriceData,
  type CrossChainResult,
} from './services/pythDataService';
export type { RetryConfig } from './constants/pythConstants';
export { OracleRepository } from './OracleRepository';
export {
  BaseOracleClient,
  shouldUseDatabase,
  configureStorage,
  getStorageConfig,
  ORACLE_CACHE_TTL,
} from './base';
export type { OracleClientConfig, OracleStorageConfig } from './base';
export type { IOracleClient, IOracleClientFactory } from './interfaces';
export {
  savePriceToDatabase,
  savePricesToDatabase,
  getPriceFromDatabase,
  getHistoricalPricesFromDatabase,
  savePriceWithFallback,
  saveHistoricalPricesWithFallback,
} from './utils/storage';
export {
  OracleClientFactory,
  getDefaultFactory,
  getOracleClient,
  getAllOracleClients,
  setMockOracleFactory,
  clearMockOracleFactory,
} from './factory';
export * from '@/types/oracle';
export { getOracleColor } from './colors';

// Performance Metrics Calculator
export {
  PerformanceMetricsCalculator,
  type CalculatedPerformanceMetrics,
  type PriceHistoryEntry,
  type MetricsCalculationConfig,
} from './utils/performanceMetricsCalculator';

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
} from './utils/oracleDataUtils';
