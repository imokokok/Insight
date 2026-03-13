export { ChainlinkClient } from './chainlink';
export { BandProtocolClient } from './bandProtocol';
export { UMAClient } from './uma';
export { PythNetworkClient } from './pythNetwork';
export { API3Client } from './api3';
export {
  PythHermesClient,
  getPythHermesClient,
  resetPythHermesClient,
  type PythPriceUpdate,
} from './pythHermesClient';
export {
  BaseOracleClient,
  UNIFIED_BASE_PRICES,
  shouldUseDatabase,
  configureStorage,
  getStorageConfig,
} from './base';
export type { OracleClientConfig, OracleStorageConfig } from './base';
export {
  savePriceToDatabase,
  savePricesToDatabase,
  getPriceFromDatabase,
  getHistoricalPricesFromDatabase,
  savePriceWithFallback,
  saveHistoricalPricesWithFallback,
} from './storage';
export * from '@/lib/types/oracle';
