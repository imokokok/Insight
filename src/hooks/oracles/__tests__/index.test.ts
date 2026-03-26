import {
  useChainlinkPrice,
  useChainlinkHistorical,
  useChainlinkAllData,
  usePythPrice,
  usePythHistorical,
  usePythAllData,
  useRedStonePrice,
  useRedStoneHistorical,
  useRedStoneAllData,
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
  useChroniclePrice,
  useChronicleHistoricalPrices,
  useChronicleScuttlebutt,
  useChronicleMakerDAO,
  useChronicleValidators,
  useChronicleNetworkStats,
  useChronicleAllData,
  useWINkLinkPrice,
  useWINkLinkHistoricalPrices,
  useWINkLinkTRONEcosystem,
  useWINkLinkStaking,
  useWINkLinkGamingData,
  useWINkLinkNetworkStats,
  useWINkLinkRiskMetrics,
  useWINkLinkAllData,
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
  useOraclePage,
} from '../index';

describe('Oracle Hooks Index', () => {
  describe('Chainlink exports', () => {
    it('should export useChainlinkPrice', () => {
      expect(useChainlinkPrice).toBeDefined();
      expect(typeof useChainlinkPrice).toBe('function');
    });

    it('should export useChainlinkHistorical', () => {
      expect(useChainlinkHistorical).toBeDefined();
      expect(typeof useChainlinkHistorical).toBe('function');
    });

    it('should export useChainlinkAllData', () => {
      expect(useChainlinkAllData).toBeDefined();
      expect(typeof useChainlinkAllData).toBe('function');
    });
  });

  describe('Pyth exports', () => {
    it('should export usePythPrice', () => {
      expect(usePythPrice).toBeDefined();
      expect(typeof usePythPrice).toBe('function');
    });

    it('should export usePythHistorical', () => {
      expect(usePythHistorical).toBeDefined();
      expect(typeof usePythHistorical).toBe('function');
    });

    it('should export usePythAllData', () => {
      expect(usePythAllData).toBeDefined();
      expect(typeof usePythAllData).toBe('function');
    });
  });

  describe('RedStone exports', () => {
    it('should export useRedStonePrice', () => {
      expect(useRedStonePrice).toBeDefined();
      expect(typeof useRedStonePrice).toBe('function');
    });

    it('should export useRedStoneHistorical', () => {
      expect(useRedStoneHistorical).toBeDefined();
      expect(typeof useRedStoneHistorical).toBe('function');
    });

    it('should export useRedStoneAllData', () => {
      expect(useRedStoneAllData).toBeDefined();
      expect(typeof useRedStoneAllData).toBe('function');
    });
  });

  describe('DIA exports', () => {
    it('should export all DIA hooks', () => {
      expect(useDIAPrice).toBeDefined();
      expect(useDIAHistorical).toBeDefined();
      expect(useDIADataTransparency).toBeDefined();
      expect(useDIACrossChainCoverage).toBeDefined();
      expect(useDIADataSourceVerification).toBeDefined();
      expect(useDIANetworkStats).toBeDefined();
      expect(useDIAStaking).toBeDefined();
      expect(useDIANFTData).toBeDefined();
      expect(useDIAStakingDetails).toBeDefined();
      expect(useDIACustomFeeds).toBeDefined();
      expect(useDIAEcosystem).toBeDefined();
      expect(useDIAAllData).toBeDefined();
    });
  });

  describe('Tellor exports', () => {
    it('should export all Tellor hooks', () => {
      expect(useTellorPrice).toBeDefined();
      expect(useTellorHistorical).toBeDefined();
      expect(useTellorPriceStream).toBeDefined();
      expect(useTellorMarketDepth).toBeDefined();
      expect(useTellorMultiChainAggregation).toBeDefined();
      expect(useTellorNetworkStats).toBeDefined();
      expect(useTellorLiquidity).toBeDefined();
      expect(useTellorStaking).toBeDefined();
      expect(useTellorReporters).toBeDefined();
      expect(useTellorRisk).toBeDefined();
      expect(useTellorEcosystem).toBeDefined();
      expect(useTellorDisputes).toBeDefined();
      expect(useTellorNetworkHealth).toBeDefined();
      expect(useStakingCalculator).toBeDefined();
      expect(useTellorAllData).toBeDefined();
    });
  });

  describe('Chronicle exports', () => {
    it('should export all Chronicle hooks', () => {
      expect(useChroniclePrice).toBeDefined();
      expect(useChronicleHistoricalPrices).toBeDefined();
      expect(useChronicleScuttlebutt).toBeDefined();
      expect(useChronicleMakerDAO).toBeDefined();
      expect(useChronicleValidators).toBeDefined();
      expect(useChronicleNetworkStats).toBeDefined();
      expect(useChronicleAllData).toBeDefined();
    });
  });

  describe('WINkLink exports', () => {
    it('should export all WINkLink hooks', () => {
      expect(useWINkLinkPrice).toBeDefined();
      expect(useWINkLinkHistoricalPrices).toBeDefined();
      expect(useWINkLinkTRONEcosystem).toBeDefined();
      expect(useWINkLinkStaking).toBeDefined();
      expect(useWINkLinkGamingData).toBeDefined();
      expect(useWINkLinkNetworkStats).toBeDefined();
      expect(useWINkLinkRiskMetrics).toBeDefined();
      expect(useWINkLinkAllData).toBeDefined();
    });
  });

  describe('API3 exports', () => {
    it('should export all API3 hooks', () => {
      expect(useAPI3Price).toBeDefined();
      expect(useAPI3Historical).toBeDefined();
      expect(useAPI3AirnodeStats).toBeDefined();
      expect(useAPI3DapiCoverage).toBeDefined();
      expect(useAPI3Staking).toBeDefined();
      expect(useAPI3FirstParty).toBeDefined();
      expect(useAPI3Latency).toBeDefined();
      expect(useAPI3QualityMetrics).toBeDefined();
      expect(useAPI3Deviations).toBeDefined();
      expect(useAPI3SourceTrace).toBeDefined();
      expect(useAPI3CoverageEvents).toBeDefined();
      expect(useAPI3GasFees).toBeDefined();
      expect(useAPI3OHLC).toBeDefined();
      expect(useAPI3QualityHistory).toBeDefined();
      expect(useAPI3CrossOracle).toBeDefined();
      expect(useAPI3AllData).toBeDefined();
    });
  });

  describe('Unified Oracle Page Hook', () => {
    it('should export useOraclePage', () => {
      expect(useOraclePage).toBeDefined();
      expect(typeof useOraclePage).toBe('function');
    });
  });
});
