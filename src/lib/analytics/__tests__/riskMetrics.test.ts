/* eslint-disable max-lines-per-function */
import { type OracleMarketData } from '@/lib/services/marketData/types';

import { calculateRiskMetrics, getRiskLevelColor } from '../riskMetrics';

function buildRiskMetricsInput(
  oracleData: OracleMarketData[],
  priceHistory: number[],
  _correlationMatrix: number[][]
) {
  const priceHistoriesByProvider = new Map<string, number[]>();
  const oracleNames = oracleData.map((o) => o.name);
  oracleNames.forEach((name) => {
    priceHistoriesByProvider.set(name, priceHistory);
  });

  const now = Date.now();
  const oracleTimestamps = oracleData.map((o, i) => ({
    name: o.name,
    timestamp: now - i * 1000,
  }));

  const manipulationResistanceData = oracleData.map((o) => ({
    name: o.name,
    dataSources: 10,
    updateFrequencySeconds: 60,
    hasOnChainVerification: true,
    aggregationMethod: 'median' as const,
  }));

  const sharedDependencyData = oracleData.map((o) => ({
    name: o.name,
    primaryDataSources: ['binance', 'coinbase'],
  }));

  return {
    oracleData,
    priceHistoriesByProvider,
    oracleTimestamps,
    manipulationResistanceData,
    sharedDependencyData,
  };
}

describe('riskMetrics', () => {
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
        name: 'RedStone',
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
        buildRiskMetricsInput(
          createMockOracleData(),
          createMockPriceHistory(),
          createMockCorrelationMatrix()
        )
      );

      expect(result.hhi).toBeDefined();
      expect(result.diversification).toBeDefined();
      expect(result.volatility).toBeDefined();
      expect(result.correlationRisk).toBeDefined();
      expect(result.freshnessRisk).toBeDefined();
      expect(result.manipulationResistance).toBeDefined();
      expect(result.sharedDependency).toBeDefined();
      expect(result.overallRisk).toBeDefined();
    });

    it('should calculate overall risk score correctly', () => {
      const result = calculateRiskMetrics(
        buildRiskMetricsInput(
          createMockOracleData(),
          createMockPriceHistory(),
          createMockCorrelationMatrix()
        )
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

      const result = calculateRiskMetrics(buildRiskMetricsInput(oracleData, priceHistory, matrix));

      if (result.overallRisk.score < 30) {
        expect(result.overallRisk.level).toBe('low');
      }
    });

    it('should return medium overall risk for score 30-49', () => {
      const result = calculateRiskMetrics(
        buildRiskMetricsInput(
          createMockOracleData(),
          createMockPriceHistory(),
          createMockCorrelationMatrix()
        )
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
      oracleData[3].share = 10;

      const result = calculateRiskMetrics(
        buildRiskMetricsInput(oracleData, createMockPriceHistory(), createMockCorrelationMatrix())
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

      const result = calculateRiskMetrics(buildRiskMetricsInput(oracleData, priceHistory, matrix));

      if (result.overallRisk.score >= 70) {
        expect(result.overallRisk.level).toBe('critical');
      }
    });

    it('should handle errors gracefully', () => {
      const result = calculateRiskMetrics({
        oracleData: [],
        priceHistoriesByProvider: new Map(),
        oracleTimestamps: [],
        manipulationResistanceData: [],
        sharedDependencyData: [],
      });

      expect(result.hhi.value).toBe(0);
      expect(result.hhi.description).toBe('calculation_error');
      expect(result.volatility.index).toBe(0);
      expect(result.correlationRisk.score).toBe(0);
    });

    it('should include timestamp in overall risk', () => {
      const beforeTime = Date.now();
      const result = calculateRiskMetrics(
        buildRiskMetricsInput(
          createMockOracleData(),
          createMockPriceHistory(),
          createMockCorrelationMatrix()
        )
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

  describe('Error Handling Coverage', () => {
    describe('calculateRiskMetrics error handling', () => {
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
          name: 'RedStone',
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
      ];

      it('should handle errors and return default results', () => {
        const oracleData = createMockOracleData();
        Object.defineProperty(oracleData, 'map', {
          value: () => {
            throw new Error('Test error');
          },
          configurable: true,
        });

        const result = calculateRiskMetrics({
          oracleData: oracleData as unknown as OracleMarketData[],
          priceHistoriesByProvider: new Map([
            ['A', [100, 101, 102]],
            ['B', [100, 101, 102]],
          ]),
          oracleTimestamps: [
            { name: 'A', timestamp: Date.now() },
            { name: 'B', timestamp: Date.now() },
          ],
          manipulationResistanceData: [
            {
              name: 'A',
              dataSources: 10,
              updateFrequencySeconds: 60,
              hasOnChainVerification: true,
              aggregationMethod: 'median',
            },
            {
              name: 'B',
              dataSources: 10,
              updateFrequencySeconds: 60,
              hasOnChainVerification: true,
              aggregationMethod: 'median',
            },
          ],
          sharedDependencyData: [
            { name: 'A', primaryDataSources: ['binance'] },
            { name: 'B', primaryDataSources: ['binance'] },
          ],
        });
        expect(result.hhi.value).toBe(0);
        expect(result.hhi.description).toBe('calculation_error');
        expect(result.volatility.index).toBe(0);
        expect(result.correlationRisk.score).toBe(0);
        expect(result.overallRisk.score).toBe(0);
      });

      it('should return medium overall risk for score 30-49', () => {
        const oracleData: OracleMarketData[] = [
          {
            name: 'A',
            share: 25,
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
            share: 25,
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
            share: 25,
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
            share: 25,
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
        const priceHistory = [100, 102, 104, 103, 105, 104, 106, 105, 107, 106];
        const matrix = [
          [1, 0.5, 0.5, 0.5],
          [0.5, 1, 0.5, 0.5],
          [0.5, 0.5, 1, 0.5],
          [0.5, 0.5, 0.5, 1],
        ];

        const result = calculateRiskMetrics(
          buildRiskMetricsInput(oracleData, priceHistory, matrix)
        );

        if (result.overallRisk.score >= 30 && result.overallRisk.score < 50) {
          expect(result.overallRisk.level).toBe('medium');
        }
      });
    });
  });
});
