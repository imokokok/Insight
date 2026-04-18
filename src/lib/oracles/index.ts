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
export { TWAPClient } from './clients/twap';
export {
  TwapOnChainService,
  twapOnChainService,
  type TwapPriceData,
  type PoolInfo,
} from './services/twapOnChainService';
export {
  UNISWAP_V3_FACTORY,
  TWAP_FEE_TIERS,
  TWAP_INTERVALS,
  TWAP_TOKEN_ADDRESSES,
  TWAP_POOL_ADDRESSES,
  TWAP_RPC_CONFIG,
  UNISWAP_V3_POOL_ABI,
  UNISWAP_V3_FACTORY_ABI,
  twapSymbols,
  TWAP_AVAILABLE_PAIRS,
  BLOCKCHAIN_TO_CHAIN_ID,
  CHAIN_ID_TO_BLOCKCHAIN,
  TWAP_CHAIN_RELABILITY,
  type TwapPoolConfig,
  type TwapSymbol,
} from './constants/twapConstants';
export { SupraClient } from './clients/supra';
export {
  SupraDataService,
  getSupraDataService,
  resetSupraDataService,
  type SupraLatestPriceData,
  type SupraOHLCDataPoint,
} from './services/supraDataService';
export { ReflectorClient } from './clients/reflector';
export {
  ReflectorDataService,
  getReflectorDataService,
  type ReflectorOnChainMetadata,
} from './services/reflectorDataService';
export {
  REFLECTOR_CRYPTO_CONTRACT,
  REFLECTOR_FOREX_CONTRACT,
  STELLAR_RPC_URL,
  REFLECTOR_CRYPTO_ASSETS,
  REFLECTOR_FOREX_ASSETS,
  REFLECTOR_ASSET_CONTRACT_MAP,
  REFLECTOR_CACHE_TTL,
  REFLECTOR_DEFAULT_DECIMALS,
  REFLECTOR_CONTRACT_METHODS,
  type ReflectorCryptoAsset,
  type ReflectorForexAsset,
  type ReflectorAsset,
} from './constants/reflectorConstants';
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
