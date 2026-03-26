import {
  calculateRiskScore,
  getRiskLevel,
  getRiskColor,
  calculateVolatility,
  calculateSharpeRatio,
  calculateMaxDrawdown,
  calculateVaR,
  calculateCVaR,
  calculateBeta,
  calculateCorrelation,
  calculatePortfolioRisk,
  formatRiskMetrics,
} from '../riskUtils';

describe('riskUtils', () => {
  describe('calculateRiskScore', () => {
    it('should calculate risk score for low risk', () => {
      const metrics = {
        volatility: 0.1,
        maxDrawdown: 0.05,
        sharpeRatio: 2.0,
        correlation: 0.3,
      };
      const score = calculateRiskScore(metrics);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should calculate risk score for high risk', () => {
      const metrics = {
        volatility: 0.8,
        maxDrawdown: 0.5,
        sharpeRatio: 0.5,
        correlation: 0.9,
      };
      const score = calculateRiskScore(metrics);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should handle missing metrics', () => {
      const metrics = {
        volatility: 0.2,
      };
      const score = calculateRiskScore(metrics);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  describe('getRiskLevel', () => {
    it('should return low for score 0-30', () => {
      expect(getRiskLevel(15)).toBe('low');
      expect(getRiskLevel(30)).toBe('low');
    });

    it('should return medium for score 31-60', () => {
      expect(getRiskLevel(31)).toBe('medium');
      expect(getRiskLevel(45)).toBe('medium');
      expect(getRiskLevel(60)).toBe('medium');
    });

    it('should return high for score 61-100', () => {
      expect(getRiskLevel(61)).toBe('high');
      expect(getRiskLevel(85)).toBe('high');
      expect(getRiskLevel(100)).toBe('high');
    });

    it('should handle edge cases', () => {
      expect(getRiskLevel(0)).toBe('low');
      expect(getRiskLevel(-10)).toBe('low');
      expect(getRiskLevel(150)).toBe('high');
    });
  });

  describe('getRiskColor', () => {
    it('should return green for low risk', () => {
      expect(getRiskColor('low')).toBe('#10B981');
    });

    it('should return yellow for medium risk', () => {
      expect(getRiskColor('medium')).toBe('#F59E0B');
    });

    it('should return red for high risk', () => {
      expect(getRiskColor('high')).toBe('#EF4444');
    });

    it('should return gray for unknown risk', () => {
      expect(getRiskColor('unknown' as any)).toBe('#6B7280');
    });
  });

  describe('calculateVolatility', () => {
    it('should calculate volatility from returns', () => {
      const returns = [0.01, -0.02, 0.015, -0.01, 0.005];
      const volatility = calculateVolatility(returns);

      expect(volatility).toBeGreaterThan(0);
      expect(typeof volatility).toBe('number');
    });

    it('should return 0 for single return', () => {
      const returns = [0.01];
      const volatility = calculateVolatility(returns);

      expect(volatility).toBe(0);
    });

    it('should return 0 for empty array', () => {
      const volatility = calculateVolatility([]);

      expect(volatility).toBe(0);
    });
  });

  describe('calculateSharpeRatio', () => {
    it('should calculate Sharpe ratio', () => {
      const returns = [0.01, 0.02, 0.015, 0.01, 0.005];
      const riskFreeRate = 0.02;
      const sharpeRatio = calculateSharpeRatio(returns, riskFreeRate);

      expect(typeof sharpeRatio).toBe('number');
    });

    it('should handle zero volatility', () => {
      const returns = [0.01, 0.01, 0.01];
      const sharpeRatio = calculateSharpeRatio(returns);

      expect(sharpeRatio).toBe(0);
    });

    it('should use default risk-free rate', () => {
      const returns = [0.01, 0.02, 0.015];
      const sharpeRatio = calculateSharpeRatio(returns);

      expect(typeof sharpeRatio).toBe('number');
    });
  });

  describe('calculateMaxDrawdown', () => {
    it('should calculate max drawdown', () => {
      const prices = [100, 110, 105, 95, 100, 90, 95];
      const maxDrawdown = calculateMaxDrawdown(prices);

      expect(maxDrawdown).toBeGreaterThan(0);
      expect(maxDrawdown).toBeLessThan(1);
    });

    it('should return 0 for increasing prices', () => {
      const prices = [100, 105, 110, 115, 120];
      const maxDrawdown = calculateMaxDrawdown(prices);

      expect(maxDrawdown).toBe(0);
    });

    it('should handle single price', () => {
      const prices = [100];
      const maxDrawdown = calculateMaxDrawdown(prices);

      expect(maxDrawdown).toBe(0);
    });
  });

  describe('calculateVaR', () => {
    it('should calculate Value at Risk', () => {
      const returns = [0.01, -0.02, 0.015, -0.01, 0.005, -0.03, 0.02];
      const confidence = 0.95;
      const var_ = calculateVaR(returns, confidence);

      expect(typeof var_).toBe('number');
    });

    it('should use default confidence level', () => {
      const returns = [0.01, -0.02, 0.015];
      const var_ = calculateVaR(returns);

      expect(typeof var_).toBe('number');
    });

    it('should handle empty array', () => {
      const var_ = calculateVaR([]);

      expect(var_).toBe(0);
    });
  });

  describe('calculateCVaR', () => {
    it('should calculate Conditional Value at Risk', () => {
      const returns = [0.01, -0.02, 0.015, -0.01, 0.005, -0.03, 0.02];
      const confidence = 0.95;
      const cvar = calculateCVaR(returns, confidence);

      expect(typeof cvar).toBe('number');
    });

    it('should be more conservative than VaR', () => {
      const returns = [0.01, -0.02, 0.015, -0.01, 0.005, -0.03, 0.02];
      const var_ = calculateVaR(returns);
      const cvar = calculateCVaR(returns);

      expect(Math.abs(cvar)).toBeGreaterThanOrEqual(Math.abs(var_));
    });
  });

  describe('calculateBeta', () => {
    it('should calculate beta against market', () => {
      const assetReturns = [0.01, 0.02, -0.01, 0.015, 0.005];
      const marketReturns = [0.005, 0.01, -0.005, 0.01, 0.002];
      const beta = calculateBeta(assetReturns, marketReturns);

      expect(typeof beta).toBe('number');
    });

    it('should return 0 for zero market variance', () => {
      const assetReturns = [0.01, 0.02, 0.015];
      const marketReturns = [0.01, 0.01, 0.01];
      const beta = calculateBeta(assetReturns, marketReturns);

      expect(beta).toBe(0);
    });

    it('should handle mismatched array lengths', () => {
      const assetReturns = [0.01, 0.02];
      const marketReturns = [0.005, 0.01, 0.015];
      const beta = calculateBeta(assetReturns, marketReturns);

      expect(typeof beta).toBe('number');
    });
  });

  describe('calculateCorrelation', () => {
    it('should calculate correlation between two assets', () => {
      const returns1 = [0.01, 0.02, -0.01, 0.015, 0.005];
      const returns2 = [0.005, 0.015, -0.005, 0.01, 0.002];
      const correlation = calculateCorrelation(returns1, returns2);

      expect(correlation).toBeGreaterThanOrEqual(-1);
      expect(correlation).toBeLessThanOrEqual(1);
    });

    it('should return 1 for perfectly correlated assets', () => {
      const returns = [0.01, 0.02, 0.015];
      const correlation = calculateCorrelation(returns, returns);

      expect(correlation).toBeCloseTo(1, 5);
    });

    it('should return 0 for zero variance', () => {
      const returns1 = [0.01, 0.01, 0.01];
      const returns2 = [0.02, 0.02, 0.02];
      const correlation = calculateCorrelation(returns1, returns2);

      expect(correlation).toBe(0);
    });
  });

  describe('calculatePortfolioRisk', () => {
    it('should calculate portfolio risk', () => {
      const assets = [
        { weight: 0.5, volatility: 0.2, returns: [0.01, 0.02, -0.01] },
        { weight: 0.5, volatility: 0.15, returns: [0.005, 0.015, -0.005] },
      ];
      const portfolioRisk = calculatePortfolioRisk(assets);

      expect(portfolioRisk).toHaveProperty('totalRisk');
      expect(portfolioRisk).toHaveProperty('diversificationBenefit');
      expect(portfolioRisk).toHaveProperty('weightedVolatility');
    });

    it('should calculate diversification benefit', () => {
      const assets = [
        { weight: 0.5, volatility: 0.2, returns: [0.01, 0.02, -0.01] },
        { weight: 0.5, volatility: 0.15, returns: [0.005, 0.015, -0.005] },
      ];
      const portfolioRisk = calculatePortfolioRisk(assets);

      expect(portfolioRisk.diversificationBenefit).toBeGreaterThanOrEqual(0);
    });

    it('should handle single asset portfolio', () => {
      const assets = [
        { weight: 1, volatility: 0.2, returns: [0.01, 0.02, -0.01] },
      ];
      const portfolioRisk = calculatePortfolioRisk(assets);

      expect(portfolioRisk.totalRisk).toBeGreaterThan(0);
      expect(portfolioRisk.diversificationBenefit).toBe(0);
    });
  });

  describe('formatRiskMetrics', () => {
    it('should format risk metrics for display', () => {
      const metrics = {
        volatility: 0.25,
        sharpeRatio: 1.5,
        maxDrawdown: 0.15,
        var95: 0.05,
      };
      const formatted = formatRiskMetrics(metrics);

      expect(formatted).toHaveProperty('volatility');
      expect(formatted).toHaveProperty('sharpeRatio');
      expect(formatted).toHaveProperty('maxDrawdown');
      expect(formatted).toHaveProperty('var95');
    });

    it('should format volatility as percentage', () => {
      const metrics = { volatility: 0.25 };
      const formatted = formatRiskMetrics(metrics);

      expect(formatted.volatility).toBe('25.00%');
    });

    it('should format max drawdown as percentage', () => {
      const metrics = { maxDrawdown: 0.15 };
      const formatted = formatRiskMetrics(metrics);

      expect(formatted.maxDrawdown).toBe('15.00%');
    });

    it('should format VaR as percentage', () => {
      const metrics = { var95: 0.05 };
      const formatted = formatRiskMetrics(metrics);

      expect(formatted.var95).toBe('5.00%');
    });

    it('should format Sharpe ratio with 2 decimals', () => {
      const metrics = { sharpeRatio: 1.567 };
      const formatted = formatRiskMetrics(metrics);

      expect(formatted.sharpeRatio).toBe('1.57');
    });
  });
});
