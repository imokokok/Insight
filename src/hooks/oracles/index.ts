// Shared utilities
export { useLastUpdated } from './useLastUpdated';

// Chainlink
export { useChainlinkPrice, useChainlinkHistorical, useChainlinkAllData } from './chainlink';

// Pyth
export { usePythPrice, usePythHistorical, usePythAllData } from './pyth';

// RedStone
export {
  useRedStonePrice,
  useRedStoneHistorical,
  useRedStoneProviders,
  useRedStoneMetrics,
  useRedStoneAllData,
} from './redstone';
export type {
  RedStoneProviderInfo,
  RedStoneMetrics,
  RedStoneNetworkStats,
  RedStoneEcosystemData,
  RedStoneRiskMetrics,
} from './redstone';

// DIA
export {
  useDIAPrice,
  useDIAHistorical,
  useDIADataTransparency,
  useDIACrossChainCoverage,
  useDIADataSourceVerification,
  useDIANetworkStats,
  useDIAStaking,
  useDIANFTData,
  useDIAStakingDetails,
  useDIACustomFeeds,
  useDIAEcosystem,
  useDIAAllData,
} from './dia';

// Tellor
export {
  useTellorPrice,
  useTellorHistorical,
  useTellorPriceStream,
  useTellorMarketDepth,
  useTellorMultiChainAggregation,
  useTellorNetworkStats,
  useTellorLiquidity,
  useTellorStaking,
  useTellorReporters,
  useTellorRisk,
  useTellorEcosystem,
  useTellorDisputes,
  useTellorNetworkHealth,
  useStakingCalculator,
  useTellorAllData,
} from './tellor';

// Chronicle
export {
  useChroniclePrice,
  useChronicleHistoricalPrices,
  useChronicleScuttlebutt,
  useChronicleMakerDAO,
  useChronicleValidators,
  useChronicleNetworkStats,
  useChronicleAllData,
} from './chronicle';

// WINkLink
export {
  useWINkLinkPrice,
  useWINkLinkHistoricalPrices,
  useWINkLinkTRONEcosystem,
  useWINkLinkStaking,
  useWINkLinkGamingData,
  useWINkLinkNetworkStats,
  useWINkLinkRiskMetrics,
  useWINkLinkAllData,
} from './winklink';

// API3
export {
  useAPI3Price,
  useAPI3Historical,
  useAPI3AirnodeStats,
  useAPI3DapiCoverage,
  useAPI3Staking,
  useAPI3FirstParty,
  useAPI3Latency,
  useAPI3QualityMetrics,
  useAPI3Deviations,
  useAPI3SourceTrace,
  useAPI3CoverageEvents,
  useAPI3GasFees,
  useAPI3OHLC,
  useAPI3QualityHistory,
  useAPI3CrossOracle,
  useAPI3AllData,
} from './api3';

// UMA
export {
  useUMAPrice,
  useUMAHistorical,
  useUMANetworkStats,
  useUMAValidators,
  useUMADisputes,
  useUMAAllData,
} from './uma';

// Band Protocol
export {
  useBandPrice,
  useBandHistorical,
  useBandNetworkStats,
  useBandValidators,
  useBandCrossChainStats,
  useBandProtocolAllData,
} from './band';

// Unified Oracle Page Hook
export {
  useOraclePage,
  type UseOraclePageOptions,
  type UseOraclePageReturn,
  type NetworkStats,
  type PublisherData,
  type ValidatorData,
} from './useOraclePage';
