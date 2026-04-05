export { MarketDataError } from './types';
export type {
  OracleMarketData,
  AssetData,
  ChainBreakdown,
  ProtocolDetail,
  AssetCategory,
  ComparisonData,
  BenchmarkData,
  CorrelationData,
  CorrelationPair,
  RadarDataPoint,
  DefiLlamaOracleResponse,
  DefiLlamaProtocol,
  DefiLlamaChain,
  CategoryData,
} from './types';

export { fetchOraclesData, checkApiHealth } from './oracles';

export { fetchAssetsData, fetchAssetCategories } from './assets';

export { fetchChainBreakdown } from './chains';

export { fetchProtocolDetails } from './protocols';

export {
  fetchComparisonData,
  fetchRadarData,
  fetchBenchmarkData,
  calculateCorrelation,
} from './comparison';
