export { ChainlinkClient } from './chainlink';
export { BandProtocolClient } from './bandProtocol';
export { UMAClient } from './uma';
export { PythClient } from './pythNetwork';
export { API3Client } from './api3';
export {
  PythHermesClient,
  getPythHermesClient,
  resetPythHermesClient,
  type PythPriceUpdate,
} from './pythHermesClient';
export {
  BaseOracleClient,
  shouldUseDatabase,
  configureStorage,
  getStorageConfig,
} from './base';
export type { OracleClientConfig, OracleStorageConfig } from './base';
export type {
  IOracleClient,
  IOracleClientFactory,
  IMockOracleClient,
  IOracleClientConfig,
  MockCallHistory,
  IOracleClientBuilder,
  MockDataConfig,
} from './interfaces';
export {
  savePriceToDatabase,
  savePricesToDatabase,
  getPriceFromDatabase,
  getHistoricalPricesFromDatabase,
  savePriceWithFallback,
  saveHistoricalPricesWithFallback,
} from './storage';
export {
  UNIFIED_BASE_PRICES,
  updateBasePrices,
  resetBasePrices,
  DEFAULT_BASE_PRICES,
} from '@/lib/config/basePrices';
export type { BasePrices } from '@/lib/config/basePrices';
export {
  OracleClientFactory,
  getOracleClient,
  getAllOracleClients,
  getOracleClientFromDI,
  registerMockOracleFactory,
  unregisterMockOracleFactory,
} from './factory';
export * from '@/lib/types/oracle';
