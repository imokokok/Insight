function calculateMarketShareStats(data: { tvs: string; chains: number; protocols?: number; value?: number }[]): {
  totalTVS: string;
  totalChains: number;
  totalProtocols: number;
  avgDominance: string;
  oracleCount: number;
} {
  const totalTVS = data.reduce((acc, item) => {
    const tvsValue = parseFloat(item.tvs.replace(/[$B]/g, ''));
    return acc + tvsValue;
  }, 0);

  const totalChains = data.reduce((acc, item) => acc + item.chains, 0);
  const totalProtocols = data.reduce((acc, item) => acc + (item.protocols || 0), 0);
  const avgDominance = data[0]?.value || 0;

  return {
    totalTVS: `$${totalTVS.toFixed(1)}B`,
    totalChains,
    totalProtocols,
    avgDominance: `${avgDominance}%`,
    oracleCount: data.length,
  };
}

import type { MarketShareDataItem } from '../marketDataDefaults';

jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

describe('OracleMarketDataService', () => {
  describe('calculateMarketShareStats', () => {
    it('should calculate stats from market share data', () => {
      const data: MarketShareDataItem[] = [
        { name: 'Chainlink', value: 50, color: '#000', tvs: '$10B', chains: 10, protocols: 100 },
        { name: 'Pyth', value: 30, color: '#111', tvs: '$6B', chains: 8, protocols: 80 },
        { name: 'API3', value: 20, color: '#222', tvs: '$4B', chains: 6, protocols: 60 },
      ];

      const stats = calculateMarketShareStats(data);

      expect(stats.totalTVS).toBe('$20.0B');
      expect(stats.totalChains).toBe(24);
      expect(stats.totalProtocols).toBe(240);
      expect(stats.avgDominance).toBe('50%');
      expect(stats.oracleCount).toBe(3);
    });

    it('should handle empty data', () => {
      const stats = calculateMarketShareStats([]);

      expect(stats.totalTVS).toBe('$0.0B');
      expect(stats.totalChains).toBe(0);
      expect(stats.totalProtocols).toBe(0);
      expect(stats.avgDominance).toBe('0%');
      expect(stats.oracleCount).toBe(0);
    });

    it('should handle single item', () => {
      const data: MarketShareDataItem[] = [
        { name: 'Chainlink', value: 100, color: '#000', tvs: '$10B', chains: 10, protocols: 100 },
      ];

      const stats = calculateMarketShareStats(data);

      expect(stats.totalTVS).toBe('$10.0B');
      expect(stats.totalChains).toBe(10);
      expect(stats.totalProtocols).toBe(100);
      expect(stats.avgDominance).toBe('100%');
      expect(stats.oracleCount).toBe(1);
    });

    it('should handle missing protocols field', () => {
      const data: MarketShareDataItem[] = [
        { name: 'Chainlink', value: 50, color: '#000', tvs: '$10B', chains: 10 },
        { name: 'Pyth', value: 50, color: '#111', tvs: '$10B', chains: 10 },
      ];

      const stats = calculateMarketShareStats(data);

      expect(stats.totalProtocols).toBe(0);
    });

    it('should parse TVS values correctly', () => {
      const data: MarketShareDataItem[] = [
        { name: 'Chainlink', value: 50, color: '#000', tvs: '$15.5B', chains: 10, protocols: 100 },
        { name: 'Pyth', value: 50, color: '#111', tvs: '$4.5B', chains: 10, protocols: 100 },
      ];

      const stats = calculateMarketShareStats(data);

      expect(stats.totalTVS).toBe('$20.0B');
    });

    it('should handle zero values', () => {
      const data: MarketShareDataItem[] = [
        { name: 'Chainlink', value: 0, color: '#000', tvs: '$0B', chains: 0, protocols: 0 },
      ];

      const stats = calculateMarketShareStats(data);

      expect(stats.totalTVS).toBe('$0.0B');
      expect(stats.totalChains).toBe(0);
      expect(stats.totalProtocols).toBe(0);
    });
  });
});
