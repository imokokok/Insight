import { fetchRiskMetrics, fetchHHI, fetchDiversificationScore } from '../riskCalculations';

jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }),
}));

jest.mock('@/lib/analytics/riskMetrics', () => ({
  calculateRiskMetrics: jest.fn().mockReturnValue({
    hhi: {
      value: 2500,
      level: 'high',
      description: 'market_concentration_high',
      concentrationRatio: 65,
    },
    diversification: {
      score: 60,
      level: 'medium',
      description: 'diversification_moderate',
      factors: {
        chainDiversity: 55,
        protocolDiversity: 65,
        assetDiversity: 60,
      },
    },
    volatility: {
      index: 35,
      level: 'medium',
      description: 'volatility_moderate',
      annualizedVolatility: 0.35,
      dailyVolatility: 0.018,
    },
    correlationRisk: {
      score: 50,
      level: 'medium',
      description: 'correlation_risk_moderate',
      avgCorrelation: 0.65,
      highCorrelationPairs: [],
    },
    overallRisk: {
      score: 45,
      level: 'medium',
      timestamp: Date.now(),
    },
  }),
  calculateHHIFromOracles: jest.fn().mockReturnValue({
    value: 2500,
    level: 'high',
    description: 'market_concentration_high',
    concentrationRatio: 65,
  }),
  calculateDiversificationScore: jest.fn().mockReturnValue({
    score: 60,
    level: 'medium',
    description: 'diversification_moderate',
    factors: {
      chainDiversity: 55,
      protocolDiversity: 65,
      assetDiversity: 60,
    },
  }),
}));

const createMockOracleData = () => [
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
    name: 'Pyth Network',
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

describe('riskCalculations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchRiskMetrics', () => {
    it('should calculate risk metrics from oracle data', async () => {
      const oracleData = createMockOracleData();

      const result = await fetchRiskMetrics(oracleData);

      expect(result).toHaveProperty('hhi');
      expect(result).toHaveProperty('diversification');
      expect(result).toHaveProperty('volatility');
      expect(result).toHaveProperty('correlationRisk');
      expect(result).toHaveProperty('overallRisk');
    });

    it('should return default metrics on error', async () => {
      const { calculateRiskMetrics } = jest.requireMock('@/lib/analytics/riskMetrics');
      calculateRiskMetrics.mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      const result = await fetchRiskMetrics([]);

      expect(result.hhi.value).toBe(2500);
      expect(result.diversification.score).toBe(60);
      expect(result.volatility.index).toBe(35);
    });

    it('should calculate HHI correctly', async () => {
      const oracleData = createMockOracleData();

      const result = await fetchRiskMetrics(oracleData);

      expect(result.hhi.value).toBe(2500);
      expect(result.hhi.level).toBe('high');
    });

    it('should calculate diversification score', async () => {
      const oracleData = createMockOracleData();

      const result = await fetchRiskMetrics(oracleData);

      expect(result.diversification.score).toBe(60);
      expect(result.diversification.factors).toHaveProperty('chainDiversity');
      expect(result.diversification.factors).toHaveProperty('protocolDiversity');
      expect(result.diversification.factors).toHaveProperty('assetDiversity');
    });

    it('should calculate volatility index', async () => {
      const oracleData = createMockOracleData();

      const result = await fetchRiskMetrics(oracleData);

      expect(result.volatility.index).toBe(35);
      expect(result.volatility).toHaveProperty('annualizedVolatility');
      expect(result.volatility).toHaveProperty('dailyVolatility');
    });

    it('should calculate correlation risk', async () => {
      const oracleData = createMockOracleData();

      const result = await fetchRiskMetrics(oracleData);

      expect(result.correlationRisk.score).toBe(50);
      expect(result.correlationRisk).toHaveProperty('avgCorrelation');
    });

    it('should calculate overall risk', async () => {
      const oracleData = createMockOracleData();

      const result = await fetchRiskMetrics(oracleData);

      expect(result.overallRisk.score).toBe(45);
      expect(result.overallRisk).toHaveProperty('timestamp');
    });
  });

  describe('fetchHHI', () => {
    it('should calculate HHI from oracle data', async () => {
      const oracleData = createMockOracleData();

      const result = await fetchHHI(oracleData);

      expect(result.value).toBe(2500);
      expect(result.level).toBe('high');
      expect(result.concentrationRatio).toBe(65);
    });

    it('should return default HHI on error', async () => {
      const { calculateHHIFromOracles } = jest.requireMock('@/lib/analytics/riskMetrics');
      calculateHHIFromOracles.mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      const result = await fetchHHI([]);

      expect(result.value).toBe(0);
      expect(result.level).toBe('low');
    });
  });

  describe('fetchDiversificationScore', () => {
    it('should calculate diversification score from oracle data', async () => {
      const oracleData = createMockOracleData();

      const result = await fetchDiversificationScore(oracleData);

      expect(result.score).toBe(60);
      expect(result.level).toBe('medium');
      expect(result.factors).toHaveProperty('chainDiversity');
      expect(result.factors).toHaveProperty('protocolDiversity');
      expect(result.factors).toHaveProperty('assetDiversity');
    });

    it('should return critical score on error', async () => {
      const { calculateDiversificationScore } = jest.requireMock('@/lib/analytics/riskMetrics');
      calculateDiversificationScore.mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      const result = await fetchDiversificationScore([]);

      expect(result.score).toBe(0);
      expect(result.level).toBe('critical');
      expect(result.description).toBe('calculation_error');
    });

    it('should handle empty oracle data', async () => {
      const result = await fetchDiversificationScore([]);

      expect(result.score).toBe(0);
      expect(result.level).toBe('critical');
    });

    it('should calculate factors correctly', async () => {
      const oracleData = createMockOracleData();

      const result = await fetchDiversificationScore(oracleData);

      expect(result.factors.chainDiversity).toBeGreaterThanOrEqual(0);
      expect(result.factors.protocolDiversity).toBeGreaterThanOrEqual(0);
      expect(result.factors.assetDiversity).toBeGreaterThanOrEqual(0);
    });
  });
});
