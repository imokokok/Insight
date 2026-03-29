import { type OracleMarketData, type AssetData } from '../types';

function calculateMarketStats(oracleData: OracleMarketData[], assets: AssetData[]) {
  const totalTVS = oracleData.reduce((sum, oracle) => sum + oracle.tvsValue, 0);
  const totalChains = oracleData.reduce((sum, oracle) => sum + oracle.chains, 0);
  const totalProtocols = oracleData.reduce((sum, oracle) => sum + oracle.protocols, 0);
  const avgLatency =
    oracleData.length > 0
      ? oracleData.reduce((sum, oracle) => sum + oracle.avgLatency, 0) / oracleData.length
      : 0;
  const marketDominance = oracleData[0]?.share || 0;
  const totalChange24h =
    oracleData.length > 0
      ? oracleData.reduce((sum, oracle) => sum + oracle.change24h * oracle.share, 0) / 100
      : 0;

  const chainsChange24h =
    oracleData.length > 0
      ? oracleData.reduce((sum, oracle) => sum + oracle.change24h * oracle.chains, 0) / totalChains
      : 0;
  const protocolsChange24h =
    oracleData.length > 0
      ? oracleData.reduce((sum, oracle) => sum + oracle.change24h * oracle.protocols, 0) /
        totalProtocols
      : 0;

  const dominanceChange24h = oracleData.length > 0 ? oracleData[0]?.change24h || 0 : 0;

  const latencyChange24h =
    oracleData.length > 0
      ? (oracleData.reduce((sum, oracle) => sum + oracle.change24h, 0) / oracleData.length) * -0.5
      : 0;

  const oracleCountChange24h = 0;

  return {
    totalTVS,
    totalChains,
    totalProtocols,
    totalAssets: assets.length,
    avgUpdateLatency: Math.round(avgLatency),
    marketDominance,
    oracleCount: oracleData.length,
    change24h: totalChange24h,
    chainsChange24h,
    protocolsChange24h,
    dominanceChange24h,
    latencyChange24h,
    oracleCountChange24h,
  };
}

const mockOracleData: OracleMarketData[] = [
  {
    name: 'Chainlink',
    share: 45.5,
    color: '#375BD2',
    tvs: '$45.5B',
    tvsValue: 45.5,
    chains: 50,
    protocols: 1800,
    avgLatency: 12,
    accuracy: 99.98,
    updateFrequency: 1,
    change24h: 2.5,
    change7d: 5.2,
    change30d: 12.3,
  },
  {
    name: 'Pyth',
    share: 25.3,
    color: '#FF6B35',
    tvs: '$25.3B',
    tvsValue: 25.3,
    chains: 40,
    protocols: 450,
    avgLatency: 8,
    accuracy: 99.95,
    updateFrequency: 0.4,
    change24h: 3.1,
    change7d: 8.1,
    change30d: 15.7,
  },
  {
    name: 'Band Protocol',
    share: 10.2,
    color: '#5B6EE1',
    tvs: '$10.2B',
    tvsValue: 10.2,
    chains: 30,
    protocols: 200,
    avgLatency: 15,
    accuracy: 99.9,
    updateFrequency: 2,
    change24h: -1.5,
    change7d: 2.3,
    change30d: 5.5,
  },
];

const mockAssets: AssetData[] = [
  {
    symbol: 'BTC',
    price: 68000,
    change24h: 2.5,
    change7d: 5.2,
    volume24h: 25000000000,
    marketCap: 1300000000000,
    primaryOracle: 'Chainlink',
    oracleCount: 5,
    priceSources: [],
  },
  {
    symbol: 'ETH',
    price: 3500,
    change24h: 3.1,
    change7d: 8.1,
    volume24h: 15000000000,
    marketCap: 420000000000,
    primaryOracle: 'Chainlink',
    oracleCount: 4,
    priceSources: [],
  },
];

describe('MarketStats Calculations', () => {
  describe('totalTVS', () => {
    it('should calculate total TVS correctly', () => {
      const stats = calculateMarketStats(mockOracleData, mockAssets);
      expect(stats.totalTVS).toBe(45.5 + 25.3 + 10.2);
    });

    it('should return 0 for empty oracle data', () => {
      const stats = calculateMarketStats([], mockAssets);
      expect(stats.totalTVS).toBe(0);
    });
  });

  describe('totalChains', () => {
    it('should calculate total chains correctly', () => {
      const stats = calculateMarketStats(mockOracleData, mockAssets);
      expect(stats.totalChains).toBe(50 + 40 + 30);
    });

    it('should return 0 for empty oracle data', () => {
      const stats = calculateMarketStats([], mockAssets);
      expect(stats.totalChains).toBe(0);
    });
  });

  describe('totalProtocols', () => {
    it('should calculate total protocols correctly', () => {
      const stats = calculateMarketStats(mockOracleData, mockAssets);
      expect(stats.totalProtocols).toBe(1800 + 450 + 200);
    });

    it('should return 0 for empty oracle data', () => {
      const stats = calculateMarketStats([], mockAssets);
      expect(stats.totalProtocols).toBe(0);
    });
  });

  describe('avgLatency', () => {
    it('should calculate average latency correctly', () => {
      const stats = calculateMarketStats(mockOracleData, mockAssets);
      expect(stats.avgUpdateLatency).toBe(Math.round((12 + 8 + 15) / 3));
    });

    it('should return 0 for empty oracle data (avoid division by zero)', () => {
      const stats = calculateMarketStats([], mockAssets);
      expect(stats.avgUpdateLatency).toBe(0);
    });
  });

  describe('marketDominance', () => {
    it('should return first oracle share as market dominance', () => {
      const stats = calculateMarketStats(mockOracleData, mockAssets);
      expect(stats.marketDominance).toBe(45.5);
    });

    it('should return 0 for empty oracle data', () => {
      const stats = calculateMarketStats([], mockAssets);
      expect(stats.marketDominance).toBe(0);
    });
  });

  describe('change24h', () => {
    it('should calculate weighted 24h change correctly', () => {
      const stats = calculateMarketStats(mockOracleData, mockAssets);
      const expected = (2.5 * 45.5 + 3.1 * 25.3 + -1.5 * 10.2) / 100;
      expect(stats.change24h).toBeCloseTo(expected, 4);
    });

    it('should return 0 for empty oracle data', () => {
      const stats = calculateMarketStats([], mockAssets);
      expect(stats.change24h).toBe(0);
    });
  });

  describe('chainsChange24h', () => {
    it('should calculate chains-weighted 24h change correctly', () => {
      const stats = calculateMarketStats(mockOracleData, mockAssets);
      const totalChains = 50 + 40 + 30;
      const expected = (2.5 * 50 + 3.1 * 40 + -1.5 * 30) / totalChains;
      expect(stats.chainsChange24h).toBeCloseTo(expected, 4);
    });

    it('should return 0 for empty oracle data', () => {
      const stats = calculateMarketStats([], mockAssets);
      expect(stats.chainsChange24h).toBe(0);
    });
  });

  describe('protocolsChange24h', () => {
    it('should calculate protocols-weighted 24h change correctly', () => {
      const stats = calculateMarketStats(mockOracleData, mockAssets);
      const totalProtocols = 1800 + 450 + 200;
      const expected = (2.5 * 1800 + 3.1 * 450 + -1.5 * 200) / totalProtocols;
      expect(stats.protocolsChange24h).toBeCloseTo(expected, 4);
    });

    it('should return 0 for empty oracle data', () => {
      const stats = calculateMarketStats([], mockAssets);
      expect(stats.protocolsChange24h).toBe(0);
    });
  });

  describe('dominanceChange24h', () => {
    it('should return first oracle 24h change as dominance change', () => {
      const stats = calculateMarketStats(mockOracleData, mockAssets);
      expect(stats.dominanceChange24h).toBe(2.5);
    });

    it('should return 0 for empty oracle data', () => {
      const stats = calculateMarketStats([], mockAssets);
      expect(stats.dominanceChange24h).toBe(0);
    });
  });

  describe('latencyChange24h', () => {
    it('should calculate latency change with negative multiplier', () => {
      const stats = calculateMarketStats(mockOracleData, mockAssets);
      const avgChange = (2.5 + 3.1 + -1.5) / 3;
      expect(stats.latencyChange24h).toBeCloseTo(avgChange * -0.5, 4);
    });

    it('should return 0 for empty oracle data', () => {
      const stats = calculateMarketStats([], mockAssets);
      expect(stats.latencyChange24h).toBe(0);
    });
  });

  describe('oracleCountChange24h', () => {
    it('should always return 0 (not tracked)', () => {
      const stats = calculateMarketStats(mockOracleData, mockAssets);
      expect(stats.oracleCountChange24h).toBe(0);
    });
  });

  describe('totalAssets', () => {
    it('should return assets array length', () => {
      const stats = calculateMarketStats(mockOracleData, mockAssets);
      expect(stats.totalAssets).toBe(2);
    });

    it('should return 0 for empty assets', () => {
      const stats = calculateMarketStats(mockOracleData, []);
      expect(stats.totalAssets).toBe(0);
    });
  });

  describe('oracleCount', () => {
    it('should return oracle data array length', () => {
      const stats = calculateMarketStats(mockOracleData, mockAssets);
      expect(stats.oracleCount).toBe(3);
    });

    it('should return 0 for empty oracle data', () => {
      const stats = calculateMarketStats([], mockAssets);
      expect(stats.oracleCount).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single oracle correctly', () => {
      const singleOracle = [mockOracleData[0]];
      const stats = calculateMarketStats(singleOracle, mockAssets);

      expect(stats.totalTVS).toBe(45.5);
      expect(stats.totalChains).toBe(50);
      expect(stats.totalProtocols).toBe(1800);
      expect(stats.avgUpdateLatency).toBe(12);
      expect(stats.marketDominance).toBe(45.5);
      expect(stats.change24h).toBeCloseTo((2.5 * 45.5) / 100, 4);
    });

    it('should handle negative changes correctly', () => {
      const negativeChangeData: OracleMarketData[] = [
        {
          name: 'Test Oracle',
          share: 50,
          color: '#000000',
          tvs: '$50B',
          tvsValue: 50,
          chains: 10,
          protocols: 100,
          avgLatency: 20,
          accuracy: 99.5,
          updateFrequency: 1,
          change24h: -5.5,
          change7d: -10.2,
          change30d: -15.8,
        },
      ];

      const stats = calculateMarketStats(negativeChangeData, mockAssets);
      expect(stats.change24h).toBeCloseTo((-5.5 * 50) / 100, 4);
      expect(stats.dominanceChange24h).toBe(-5.5);
    });

    it('should handle very large numbers correctly', () => {
      const largeData: OracleMarketData[] = [
        {
          name: 'Large Oracle',
          share: 100,
          color: '#000000',
          tvs: '$1000B',
          tvsValue: 1000,
          chains: 1000,
          protocols: 100000,
          avgLatency: 100,
          accuracy: 99.99,
          updateFrequency: 1,
          change24h: 100,
          change7d: 200,
          change30d: 500,
        },
      ];

      const stats = calculateMarketStats(largeData, mockAssets);
      expect(stats.totalTVS).toBe(1000);
      expect(stats.totalChains).toBe(1000);
      expect(stats.totalProtocols).toBe(100000);
    });

    it('should handle zero values correctly', () => {
      const zeroData: OracleMarketData[] = [
        {
          name: 'Zero Oracle',
          share: 0,
          color: '#000000',
          tvs: '$0B',
          tvsValue: 0,
          chains: 0,
          protocols: 0,
          avgLatency: 0,
          accuracy: 0,
          updateFrequency: 0,
          change24h: 0,
          change7d: 0,
          change30d: 0,
        },
      ];

      const stats = calculateMarketStats(zeroData, mockAssets);
      expect(stats.totalTVS).toBe(0);
      expect(stats.totalChains).toBe(0);
      expect(stats.totalProtocols).toBe(0);
      expect(stats.avgUpdateLatency).toBe(0);
    });
  });
});
