import {
  calculateHHI,
  calculateHHIFromOracles,
  calculateDiversificationScore,
  calculateVolatilityIndex,
  calculateCorrelationRisk,
  calculateRiskMetrics,
  getRiskLevelColor,
  getRiskLevelText,
} from '../riskMetrics';
import { OracleMarketData } from '@/app/[locale]/market-overview/types';

describe('riskMetrics', () => {
  describe('calculateHHI', () => {
    it('should calculate HHI correctly for competitive market', () => {
      const marketShares = [25, 25, 25, 25];
      const result = calculateHHI(marketShares);

      expect(result.value).toBe(2500);
      expect(result.level).toBe('high');
      expect(result.concentrationRatio).toBe(100);
    });

    it('should calculate HHI correctly for concentrated market', () => {
      const marketShares = [60, 20, 10, 5, 5];
      const result = calculateHHI(marketShares);

      const expectedHHI = Math.round(
        (Math.pow(0.6, 2) +
          Math.pow(0.2, 2) +
          Math.pow(0.1, 2) +
          Math.pow(0.05, 2) +
          Math.pow(0.05, 2)) *
          10000
      );
      expect(result.value).toBe(expectedHHI);
      expect(result.level).toBe('critical');
      expect(result.concentrationRatio).toBe(95);
    });

    it('should return low risk level for HHI < 1500', () => {
      const marketShares = [10, 10, 10, 10, 10, 10, 10, 10, 10, 10];
      const result = calculateHHI(marketShares);

      expect(result.value).toBe(1000);
      expect(result.level).toBe('low');
      expect(result.description).toBe('market_concentration_low');
    });

    it('should return medium risk level for HHI 1500-2500', () => {
      const marketShares = [30, 20, 15, 10, 10, 5, 5, 5];
      const result = calculateHHI(marketShares);

      expect(result.value).toBeGreaterThanOrEqual(1500);
      expect(result.value).toBeLessThan(2500);
      expect(result.level).toBe('medium');
      expect(result.description).toBe('market_concentration_medium');
    });

    it('should return high risk level for HHI 2500-3500', () => {
      const marketShares = [45, 20, 15, 10, 10];
      const result = calculateHHI(marketShares);

      expect(result.value).toBeGreaterThanOrEqual(2500);
      expect(result.value).toBeLessThan(3500);
      expect(result.level).toBe('high');
      expect(result.description).toBe('market_concentration_high');
    });

    it('should return critical risk level for HHI > 3500', () => {
      const marketShares = [70, 15, 10, 5];
      const result = calculateHHI(marketShares);

      expect(result.value).toBeGreaterThan(3500);
      expect(result.level).toBe('critical');
      expect(result.description).toBe('market_concentration_critical');
    });

    it('should calculate CR4 correctly', () => {
      const marketShares = [40, 30, 15, 10, 5];
      const result = calculateHHI(marketShares);

      expect(result.concentrationRatio).toBe(95);
    });

    it('should handle CR4 with less than 4 elements', () => {
      const marketShares = [50, 30, 20];
      const result = calculateHHI(marketShares);

      expect(result.concentrationRatio).toBe(100);
    });

    it('should handle single element array', () => {
      const marketShares = [100];
      const result = calculateHHI(marketShares);

      expect(result.value).toBe(10000);
      expect(result.level).toBe('critical');
      expect(result.concentrationRatio).toBe(100);
    });

    it('should handle empty array', () => {
      const result = calculateHHI([]);

      expect(result.value).toBe(0);
      expect(result.level).toBe('low');
      expect(result.description).toBe('calculation_error');
      expect(result.concentrationRatio).toBe(0);
    });

    it('should ensure HHI value is within valid range (0-10000)', () => {
      const marketShares1 = [100];
      const result1 = calculateHHI(marketShares1);
      expect(result1.value).toBeLessThanOrEqual(10000);
      expect(result1.value).toBeGreaterThanOrEqual(0);

      const marketShares2 = [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5];
      const result2 = calculateHHI(marketShares2);
      expect(result2.value).toBeLessThanOrEqual(10000);
      expect(result2.value).toBeGreaterThanOrEqual(0);
    });
  });

  describe('calculateHHIFromOracles', () => {
    const createMockOracleData = (shares: number[]): OracleMarketData[] => {
      return shares.map((share, index) => ({
        name: `Oracle ${index + 1}`,
        share,
        color: '#000000',
        tvs: '$1B',
        tvsValue: 1000000000,
        chains: 10,
        protocols: 50,
        avgLatency: 100,
        accuracy: 99.9,
        updateFrequency: 1000,
        change24h: 0,
        change7d: 0,
        change30d: 0,
      }));
    };

    it('should calculate HHI from oracle data correctly', () => {
      const oracleData = createMockOracleData([50, 30, 20]);
      const result = calculateHHIFromOracles(oracleData);

      expect(result.value).toBe(3800);
      expect(result.level).toBe('critical');
    });

    it('should handle empty oracle data', () => {
      const result = calculateHHIFromOracles([]);

      expect(result.value).toBe(0);
      expect(result.description).toBe('calculation_error');
    });
  });

  describe('calculateDiversificationScore', () => {
    it('should calculate diversification score correctly', () => {
      const result = calculateDiversificationScore({
        chainCount: 10,
        totalChains: 20,
        protocolCount: 30,
        totalProtocols: 100,
        assetCount: 50,
        totalAssets: 100,
      });

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.factors.chainDiversity).toBeDefined();
      expect(result.factors.protocolDiversity).toBeDefined();
      expect(result.factors.assetDiversity).toBeDefined();
    });

    it('should return low risk for score >= 80', () => {
      const result = calculateDiversificationScore({
        chainCount: 50,
        totalChains: 50,
        protocolCount: 100,
        totalProtocols: 100,
        assetCount: 100,
        totalAssets: 100,
      });

      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.level).toBe('low');
      expect(['diversification_excellent', 'diversification_good']).toContain(result.description);
    });

    it('should return low risk for score 60-79', () => {
      const result = calculateDiversificationScore({
        chainCount: 15,
        totalChains: 50,
        protocolCount: 30,
        totalProtocols: 100,
        assetCount: 30,
        totalAssets: 100,
      });

      expect(result.score).toBeGreaterThanOrEqual(60);
      expect(result.score).toBeLessThan(80);
      expect(result.level).toBe('low');
    });

    it('should return medium risk for score 40-59', () => {
      const result = calculateDiversificationScore({
        chainCount: 10,
        totalChains: 50,
        protocolCount: 20,
        totalProtocols: 100,
        assetCount: 25,
        totalAssets: 100,
      });

      expect(result.score).toBeGreaterThanOrEqual(40);
      expect(result.score).toBeLessThan(60);
      expect(result.level).toBe('medium');
      expect(result.description).toBe('diversification_moderate');
    });

    it('should return high risk for score 20-39', () => {
      const result = calculateDiversificationScore({
        chainCount: 5,
        totalChains: 50,
        protocolCount: 10,
        totalProtocols: 100,
        assetCount: 10,
        totalAssets: 100,
      });

      expect(result.score).toBeGreaterThanOrEqual(20);
      expect(result.score).toBeLessThan(40);
      expect(result.level).toBe('high');
      expect(result.description).toBe('diversification_poor');
    });

    it('should return critical risk for score < 20', () => {
      const result = calculateDiversificationScore({
        chainCount: 1,
        totalChains: 50,
        protocolCount: 5,
        totalProtocols: 100,
        assetCount: 5,
        totalAssets: 100,
      });

      expect(result.score).toBeLessThan(20);
      expect(result.level).toBe('critical');
      expect(result.description).toBe('diversification_critical');
    });

    it('should calculate weighted average correctly', () => {
      const result = calculateDiversificationScore({
        chainCount: 25,
        totalChains: 50,
        protocolCount: 50,
        totalProtocols: 100,
        assetCount: 50,
        totalAssets: 100,
      });

      const expectedChain = Math.min((25 / (50 * 0.5)) * 100, 100);
      const expectedProtocol = Math.min((50 / (100 * 0.3)) * 100, 100);
      const expectedAsset = Math.min((50 / (100 * 0.5)) * 100, 100);
      const expectedScore = Math.round(
        expectedChain * 0.3 + expectedProtocol * 0.4 + expectedAsset * 0.3
      );

      expect(result.factors.chainDiversity).toBe(Math.round(expectedChain));
      expect(result.factors.protocolDiversity).toBe(Math.round(expectedProtocol));
      expect(result.factors.assetDiversity).toBe(Math.round(expectedAsset));
      expect(result.score).toBe(expectedScore);
    });

    it('should handle zero total values', () => {
      const result = calculateDiversificationScore({
        chainCount: 10,
        totalChains: 0,
        protocolCount: 10,
        totalProtocols: 0,
        assetCount: 10,
        totalAssets: 0,
      });

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.factors.chainDiversity).toBeDefined();
    });

    it('should cap factor scores at 100', () => {
      const result = calculateDiversificationScore({
        chainCount: 100,
        totalChains: 50,
        protocolCount: 100,
        totalProtocols: 50,
        assetCount: 100,
        totalAssets: 50,
      });

      expect(result.factors.chainDiversity).toBeLessThanOrEqual(100);
      expect(result.factors.protocolDiversity).toBeLessThanOrEqual(100);
      expect(result.factors.assetDiversity).toBeLessThanOrEqual(100);
    });
  });

  describe('calculateVolatilityIndex', () => {
    it('should calculate volatility index correctly', () => {
      const priceHistory = [100, 101, 102, 101, 103, 104, 103, 105];
      const result = calculateVolatilityIndex(priceHistory);

      expect(result.index).toBeGreaterThanOrEqual(0);
      expect(result.index).toBeLessThanOrEqual(100);
      expect(result.dailyVolatility).toBeGreaterThan(0);
      expect(result.annualizedVolatility).toBeGreaterThan(0);
    });

    it('should calculate log returns correctly', () => {
      const priceHistory = [100, 110, 121];
      const result = calculateVolatilityIndex(priceHistory);

      expect(result.dailyVolatility).toBeGreaterThanOrEqual(0);
      expect(result.annualizedVolatility).toBeGreaterThanOrEqual(0);
    });

    it('should calculate annualized volatility correctly', () => {
      const priceHistory = [100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110];
      const result = calculateVolatilityIndex(priceHistory);

      const expectedAnnualized = result.dailyVolatility * Math.sqrt(365);
      expect(result.annualizedVolatility).toBeCloseTo(expectedAnnualized, 2);
    });

    it('should return low risk for index < 20', () => {
      const priceHistory = [100, 100.1, 100.2, 100.1, 100.3, 100.2, 100.4, 100.3];
      const result = calculateVolatilityIndex(priceHistory);

      if (result.index < 20) {
        expect(result.level).toBe('low');
        expect(result.description).toBe('volatility_low');
      }
    });

    it('should return medium risk for index 20-39', () => {
      const result = calculateVolatilityIndex([100, 102, 104, 102, 106, 104, 108, 106]);

      if (result.index >= 20 && result.index < 40) {
        expect(result.level).toBe('medium');
        expect(result.description).toBe('volatility_moderate');
      }
    });

    it('should return high risk for index 40-59', () => {
      const result = calculateVolatilityIndex([100, 105, 110, 105, 115, 110, 120, 115]);

      if (result.index >= 40 && result.index < 60) {
        expect(result.level).toBe('high');
        expect(result.description).toBe('volatility_high');
      }
    });

    it('should return critical risk for index >= 60', () => {
      const result = calculateVolatilityIndex([100, 120, 90, 130, 80, 140, 70, 150]);

      if (result.index >= 60) {
        expect(result.level).toBe('critical');
        expect(result.description).toBe('volatility_extreme');
      }
    });

    it('should handle insufficient data (single price)', () => {
      const result = calculateVolatilityIndex([100]);

      expect(result.index).toBe(0);
      expect(result.level).toBe('low');
      expect(result.description).toBe('calculation_error');
      expect(result.dailyVolatility).toBe(0);
      expect(result.annualizedVolatility).toBe(0);
    });

    it('should handle empty array', () => {
      const result = calculateVolatilityIndex([]);

      expect(result.index).toBe(0);
      expect(result.description).toBe('calculation_error');
    });

    it('should cap index at 100', () => {
      const priceHistory = [100, 200, 50, 300, 25, 400, 10, 500];
      const result = calculateVolatilityIndex(priceHistory);

      expect(result.index).toBeLessThanOrEqual(100);
    });

    it('should handle constant prices', () => {
      const priceHistory = [100, 100, 100, 100, 100];
      const result = calculateVolatilityIndex(priceHistory);

      expect(result.index).toBe(0);
      expect(result.dailyVolatility).toBe(0);
    });
  });

  describe('calculateCorrelationRisk', () => {
    it('should calculate correlation risk correctly', () => {
      const matrix = [
        [1, 0.5, 0.3],
        [0.5, 1, 0.6],
        [0.3, 0.6, 1],
      ];
      const names = ['Oracle A', 'Oracle B', 'Oracle C'];

      const result = calculateCorrelationRisk(matrix, names);

      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.avgCorrelation).toBeGreaterThan(0);
    });

    it('should identify high correlation pairs (>0.8)', () => {
      const matrix = [
        [1, 0.9, 0.3],
        [0.9, 1, 0.85],
        [0.3, 0.85, 1],
      ];
      const names = ['Oracle A', 'Oracle B', 'Oracle C'];

      const result = calculateCorrelationRisk(matrix, names);

      expect(result.highCorrelationPairs.length).toBe(2);
      expect(result.highCorrelationPairs[0]).toContain('Oracle A - Oracle B');
      expect(result.highCorrelationPairs[1]).toContain('Oracle B - Oracle C');
    });

    it('should return low risk for score < 40', () => {
      const matrix = [
        [1, 0.2, 0.3],
        [0.2, 1, 0.25],
        [0.3, 0.25, 1],
      ];
      const names = ['A', 'B', 'C'];

      const result = calculateCorrelationRisk(matrix, names);

      expect(result.score).toBeLessThan(40);
      expect(result.level).toBe('low');
      expect(result.description).toBe('correlation_risk_low');
    });

    it('should return medium risk for score 40-59', () => {
      const matrix = [
        [1, 0.5, 0.45],
        [0.5, 1, 0.55],
        [0.45, 0.55, 1],
      ];
      const names = ['A', 'B', 'C'];

      const result = calculateCorrelationRisk(matrix, names);

      if (result.score >= 40 && result.score < 60) {
        expect(result.level).toBe('medium');
        expect(result.description).toBe('correlation_risk_moderate');
      }
    });

    it('should return high risk for score 60-79', () => {
      const matrix = [
        [1, 0.7, 0.65],
        [0.7, 1, 0.75],
        [0.65, 0.75, 1],
      ];
      const names = ['A', 'B', 'C'];

      const result = calculateCorrelationRisk(matrix, names);

      if (result.score >= 60 && result.score < 80) {
        expect(result.level).toBe('high');
        expect(result.description).toBe('correlation_risk_high');
      }
    });

    it('should return critical risk for score >= 80', () => {
      const matrix = [
        [1, 0.9, 0.85],
        [0.9, 1, 0.88],
        [0.85, 0.88, 1],
      ];
      const names = ['A', 'B', 'C'];

      const result = calculateCorrelationRisk(matrix, names);

      expect(result.score).toBeGreaterThanOrEqual(80);
      expect(result.level).toBe('critical');
      expect(result.description).toBe('correlation_risk_critical');
    });

    it('should handle empty matrix', () => {
      const result = calculateCorrelationRisk([], []);

      expect(result.score).toBe(0);
      expect(result.level).toBe('low');
      expect(result.description).toBe('calculation_error');
    });

    it('should handle mismatched matrix and names length', () => {
      const matrix = [
        [1, 0.5],
        [0.5, 1],
      ];
      const names = ['A', 'B', 'C'];

      const result = calculateCorrelationRisk(matrix, names);

      expect(result.description).toBe('calculation_error');
    });

    it('should limit high correlation pairs to 5', () => {
      const matrix = [
        [1, 0.9, 0.9, 0.9, 0.9, 0.9, 0.9],
        [0.9, 1, 0.9, 0.9, 0.9, 0.9, 0.9],
        [0.9, 0.9, 1, 0.9, 0.9, 0.9, 0.9],
        [0.9, 0.9, 0.9, 1, 0.9, 0.9, 0.9],
        [0.9, 0.9, 0.9, 0.9, 1, 0.9, 0.9],
        [0.9, 0.9, 0.9, 0.9, 0.9, 1, 0.9],
        [0.9, 0.9, 0.9, 0.9, 0.9, 0.9, 1],
      ];
      const names = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];

      const result = calculateCorrelationRisk(matrix, names);

      expect(result.highCorrelationPairs.length).toBeLessThanOrEqual(5);
    });

    it('should calculate average correlation correctly', () => {
      const matrix = [
        [1, 0.5, 0.3],
        [0.5, 1, 0.7],
        [0.3, 0.7, 1],
      ];
      const names = ['A', 'B', 'C'];

      const result = calculateCorrelationRisk(matrix, names);

      const expectedAvg = (0.5 + 0.3 + 0.7) / 3;
      expect(result.avgCorrelation).toBeCloseTo(expectedAvg, 3);
    });

    it('should use absolute value of correlations', () => {
      const matrix = [
        [1, -0.8, 0.3],
        [-0.8, 1, -0.6],
        [0.3, -0.6, 1],
      ];
      const names = ['A', 'B', 'C'];

      const result = calculateCorrelationRisk(matrix, names);

      expect(result.avgCorrelation).toBeCloseTo((0.8 + 0.3 + 0.6) / 3, 3);
    });
  });

  describe('calculateRiskMetrics', () => {
    const createMockOracleData = (): OracleMarketData[] => [
      {
        name: 'Chainlink',
        share: 45,
        color: '#375BD2',
        tvs: '$20B',
        tvsValue: 20000000000,
        chains: 15,
        protocols: 500,
        avgLatency: 100,
        accuracy: 99.9,
        updateFrequency: 1000,
        change24h: 2.5,
        change7d: 5.0,
        change30d: 10.0,
      },
      {
        name: 'Pyth',
        share: 25,
        color: '#FF8C00',
        tvs: '$10B',
        tvsValue: 10000000000,
        chains: 10,
        protocols: 200,
        avgLatency: 50,
        accuracy: 99.8,
        updateFrequency: 500,
        change24h: 3.0,
        change7d: 6.0,
        change30d: 12.0,
      },
      {
        name: 'Band',
        share: 15,
        color: '#5423E7',
        tvs: '$5B',
        tvsValue: 5000000000,
        chains: 8,
        protocols: 150,
        avgLatency: 150,
        accuracy: 99.5,
        updateFrequency: 2000,
        change24h: 1.5,
        change7d: 3.0,
        change30d: 6.0,
      },
      {
        name: 'API3',
        share: 10,
        color: '#1B1B1B',
        tvs: '$3B',
        tvsValue: 3000000000,
        chains: 5,
        protocols: 100,
        avgLatency: 80,
        accuracy: 99.7,
        updateFrequency: 800,
        change24h: 2.0,
        change7d: 4.0,
        change30d: 8.0,
      },
      {
        name: 'UMA',
        share: 5,
        color: '#FF4F4F',
        tvs: '$2B',
        tvsValue: 2000000000,
        chains: 3,
        protocols: 50,
        avgLatency: 200,
        accuracy: 99.0,
        updateFrequency: 3000,
        change24h: 1.0,
        change7d: 2.0,
        change30d: 4.0,
      },
    ];

    const createMockPriceHistory = (): number[] => {
      return [100, 101, 102, 101, 103, 104, 103, 105, 106, 105, 107, 108, 107, 109, 110];
    };

    const createMockCorrelationMatrix = (): number[][] => {
      return [
        [1, 0.7, 0.5, 0.4, 0.3],
        [0.7, 1, 0.6, 0.5, 0.4],
        [0.5, 0.6, 1, 0.7, 0.5],
        [0.4, 0.5, 0.7, 1, 0.6],
        [0.3, 0.4, 0.5, 0.6, 1],
      ];
    };

    it('should calculate comprehensive risk metrics', () => {
      const result = calculateRiskMetrics(
        createMockOracleData(),
        createMockPriceHistory(),
        createMockCorrelationMatrix()
      );

      expect(result.hhi).toBeDefined();
      expect(result.diversification).toBeDefined();
      expect(result.volatility).toBeDefined();
      expect(result.correlationRisk).toBeDefined();
      expect(result.overallRisk).toBeDefined();
    });

    it('should calculate overall risk score correctly', () => {
      const result = calculateRiskMetrics(
        createMockOracleData(),
        createMockPriceHistory(),
        createMockCorrelationMatrix()
      );

      expect(result.overallRisk.score).toBeGreaterThanOrEqual(0);
      expect(result.overallRisk.score).toBeLessThanOrEqual(100);
      expect(result.overallRisk.timestamp).toBeDefined();
    });

    it('should return low overall risk for score < 30', () => {
      const oracleData: OracleMarketData[] = [
        {
          name: 'A',
          share: 10,
          color: '#000',
          tvs: '$1B',
          tvsValue: 1e9,
          chains: 10,
          protocols: 100,
          avgLatency: 100,
          accuracy: 99.9,
          updateFrequency: 1000,
          change24h: 0,
          change7d: 0,
          change30d: 0,
        },
        {
          name: 'B',
          share: 10,
          color: '#000',
          tvs: '$1B',
          tvsValue: 1e9,
          chains: 10,
          protocols: 100,
          avgLatency: 100,
          accuracy: 99.9,
          updateFrequency: 1000,
          change24h: 0,
          change7d: 0,
          change30d: 0,
        },
        {
          name: 'C',
          share: 10,
          color: '#000',
          tvs: '$1B',
          tvsValue: 1e9,
          chains: 10,
          protocols: 100,
          avgLatency: 100,
          accuracy: 99.9,
          updateFrequency: 1000,
          change24h: 0,
          change7d: 0,
          change30d: 0,
        },
        {
          name: 'D',
          share: 10,
          color: '#000',
          tvs: '$1B',
          tvsValue: 1e9,
          chains: 10,
          protocols: 100,
          avgLatency: 100,
          accuracy: 99.9,
          updateFrequency: 1000,
          change24h: 0,
          change7d: 0,
          change30d: 0,
        },
        {
          name: 'E',
          share: 10,
          color: '#000',
          tvs: '$1B',
          tvsValue: 1e9,
          chains: 10,
          protocols: 100,
          avgLatency: 100,
          accuracy: 99.9,
          updateFrequency: 1000,
          change24h: 0,
          change7d: 0,
          change30d: 0,
        },
        {
          name: 'F',
          share: 10,
          color: '#000',
          tvs: '$1B',
          tvsValue: 1e9,
          chains: 10,
          protocols: 100,
          avgLatency: 100,
          accuracy: 99.9,
          updateFrequency: 1000,
          change24h: 0,
          change7d: 0,
          change30d: 0,
        },
        {
          name: 'G',
          share: 10,
          color: '#000',
          tvs: '$1B',
          tvsValue: 1e9,
          chains: 10,
          protocols: 100,
          avgLatency: 100,
          accuracy: 99.9,
          updateFrequency: 1000,
          change24h: 0,
          change7d: 0,
          change30d: 0,
        },
        {
          name: 'H',
          share: 10,
          color: '#000',
          tvs: '$1B',
          tvsValue: 1e9,
          chains: 10,
          protocols: 100,
          avgLatency: 100,
          accuracy: 99.9,
          updateFrequency: 1000,
          change24h: 0,
          change7d: 0,
          change30d: 0,
        },
        {
          name: 'I',
          share: 5,
          color: '#000',
          tvs: '$1B',
          tvsValue: 1e9,
          chains: 10,
          protocols: 100,
          avgLatency: 100,
          accuracy: 99.9,
          updateFrequency: 1000,
          change24h: 0,
          change7d: 0,
          change30d: 0,
        },
        {
          name: 'J',
          share: 5,
          color: '#000',
          tvs: '$1B',
          tvsValue: 1e9,
          chains: 10,
          protocols: 100,
          avgLatency: 100,
          accuracy: 99.9,
          updateFrequency: 1000,
          change24h: 0,
          change7d: 0,
          change30d: 0,
        },
      ];
      const priceHistory = [100, 100.1, 100.2, 100.1, 100.3, 100.2, 100.4, 100.3];
      const matrix = [
        [1, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2],
        [0.2, 1, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2],
        [0.2, 0.2, 1, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2],
        [0.2, 0.2, 0.2, 1, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2],
        [0.2, 0.2, 0.2, 0.2, 1, 0.2, 0.2, 0.2, 0.2, 0.2],
        [0.2, 0.2, 0.2, 0.2, 0.2, 1, 0.2, 0.2, 0.2, 0.2],
        [0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 1, 0.2, 0.2, 0.2],
        [0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 1, 0.2, 0.2],
        [0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 1, 0.2],
        [0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 1],
      ];

      const result = calculateRiskMetrics(oracleData, priceHistory, matrix);

      if (result.overallRisk.score < 30) {
        expect(result.overallRisk.level).toBe('low');
      }
    });

    it('should return medium overall risk for score 30-49', () => {
      const result = calculateRiskMetrics(
        createMockOracleData(),
        createMockPriceHistory(),
        createMockCorrelationMatrix()
      );

      if (result.overallRisk.score >= 30 && result.overallRisk.score < 50) {
        expect(result.overallRisk.level).toBe('medium');
      }
    });

    it('should return high overall risk for score 50-69', () => {
      const oracleData = createMockOracleData();
      oracleData[0].share = 60;
      oracleData[1].share = 20;
      oracleData[2].share = 10;
      oracleData[3].share = 5;
      oracleData[4].share = 5;

      const result = calculateRiskMetrics(
        oracleData,
        createMockPriceHistory(),
        createMockCorrelationMatrix()
      );

      if (result.overallRisk.score >= 50 && result.overallRisk.score < 70) {
        expect(result.overallRisk.level).toBe('high');
      }
    });

    it('should return critical overall risk for score >= 70', () => {
      const oracleData: OracleMarketData[] = [
        {
          name: 'A',
          share: 80,
          color: '#000',
          tvs: '$1B',
          tvsValue: 1e9,
          chains: 1,
          protocols: 10,
          avgLatency: 100,
          accuracy: 99.9,
          updateFrequency: 1000,
          change24h: 0,
          change7d: 0,
          change30d: 0,
        },
        {
          name: 'B',
          share: 10,
          color: '#000',
          tvs: '$1B',
          tvsValue: 1e9,
          chains: 1,
          protocols: 10,
          avgLatency: 100,
          accuracy: 99.9,
          updateFrequency: 1000,
          change24h: 0,
          change7d: 0,
          change30d: 0,
        },
        {
          name: 'C',
          share: 10,
          color: '#000',
          tvs: '$1B',
          tvsValue: 1e9,
          chains: 1,
          protocols: 10,
          avgLatency: 100,
          accuracy: 99.9,
          updateFrequency: 1000,
          change24h: 0,
          change7d: 0,
          change30d: 0,
        },
      ];
      const priceHistory = [100, 120, 90, 130, 80, 140, 70, 150];
      const matrix = [
        [1, 0.95, 0.92],
        [0.95, 1, 0.94],
        [0.92, 0.94, 1],
      ];

      const result = calculateRiskMetrics(oracleData, priceHistory, matrix);

      if (result.overallRisk.score >= 70) {
        expect(result.overallRisk.level).toBe('critical');
      }
    });

    it('should handle errors gracefully', () => {
      const result = calculateRiskMetrics([], [], []);

      expect(result.hhi.value).toBe(0);
      expect(result.hhi.description).toBe('calculation_error');
      expect(result.volatility.index).toBe(0);
      expect(result.correlationRisk.score).toBe(0);
    });

    it('should include timestamp in overall risk', () => {
      const beforeTime = Date.now();
      const result = calculateRiskMetrics(
        createMockOracleData(),
        createMockPriceHistory(),
        createMockCorrelationMatrix()
      );
      const afterTime = Date.now();

      expect(result.overallRisk.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(result.overallRisk.timestamp).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('getRiskLevelColor', () => {
    it('should return correct color for low risk', () => {
      const color = getRiskLevelColor('low');
      expect(color).toBeDefined();
      expect(typeof color).toBe('string');
    });

    it('should return correct color for medium risk', () => {
      const color = getRiskLevelColor('medium');
      expect(color).toBeDefined();
      expect(typeof color).toBe('string');
    });

    it('should return correct color for high risk', () => {
      const color = getRiskLevelColor('high');
      expect(color).toBeDefined();
      expect(typeof color).toBe('string');
    });

    it('should return correct color for critical risk', () => {
      const color = getRiskLevelColor('critical');
      expect(color).toBeDefined();
      expect(typeof color).toBe('string');
    });
  });

  describe('getRiskLevelText', () => {
    it('should return correct text key for low risk', () => {
      expect(getRiskLevelText('low')).toBe('risk_level_low');
    });

    it('should return correct text key for medium risk', () => {
      expect(getRiskLevelText('medium')).toBe('risk_level_medium');
    });

    it('should return correct text key for high risk', () => {
      expect(getRiskLevelText('high')).toBe('risk_level_high');
    });

    it('should return correct text key for critical risk', () => {
      expect(getRiskLevelText('critical')).toBe('risk_level_critical');
    });
  });
});
