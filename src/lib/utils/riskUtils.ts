import { type RiskLevel } from '@/types/risk';

export interface RiskMetrics {
  volatility?: number;
  maxDrawdown?: number;
  sharpeRatio?: number;
  correlation?: number;
}

export function calculateRiskScore(metrics: RiskMetrics): number {
  const { volatility = 0.2, maxDrawdown = 0.1, sharpeRatio = 1, correlation = 0.5 } = metrics;

  const volatilityScore = Math.max(0, 100 - volatility * 100);
  const drawdownScore = Math.max(0, 100 - maxDrawdown * 200);
  const sharpeScore = Math.min(100, sharpeRatio * 50);
  const correlationScore = Math.max(0, 100 - correlation * 50);

  return Math.round((volatilityScore + drawdownScore + sharpeScore + correlationScore) / 4);
}

export function getRiskColor(level: string): string {
  switch (level) {
    case 'low':
      return '#10B981';
    case 'medium':
      return '#F59E0B';
    case 'high':
      return '#EF4444';
    default:
      return '#6B7280';
  }
}

export function calculateVolatility(returns: number[]): number {
  if (returns.length < 2) return 0;

  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const squaredDiffs = returns.map((r) => Math.pow(r - mean, 2));
  const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / (returns.length - 1);

  return Math.sqrt(variance);
}

export function calculateSharpeRatio(returns: number[], riskFreeRate: number = 0.02): number {
  if (returns.length < 2) return 0;

  const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const volatility = calculateVolatility(returns);

  if (volatility === 0) return 0;

  return (meanReturn - riskFreeRate / 252) / volatility;
}

export function calculateMaxDrawdown(prices: number[]): number {
  if (prices.length < 2) return 0;

  let maxDrawdown = 0;
  let peak = prices[0];

  for (const price of prices) {
    if (price > peak) {
      peak = price;
    }
    const drawdown = peak !== 0 ? (peak - price) / peak : 0;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  }

  return maxDrawdown;
}

export function calculateCorrelation(returns1: number[], returns2: number[]): number {
  const minLength = Math.min(returns1.length, returns2.length);
  if (minLength < 2) return 0;

  const slice1 = returns1.slice(0, minLength);
  const slice2 = returns2.slice(0, minLength);

  const mean1 = slice1.reduce((sum, r) => sum + r, 0) / minLength;
  const mean2 = slice2.reduce((sum, r) => sum + r, 0) / minLength;

  let covariance = 0;
  let variance1 = 0;
  let variance2 = 0;

  for (let i = 0; i < minLength; i++) {
    const diff1 = slice1[i] - mean1;
    const diff2 = slice2[i] - mean2;
    covariance += diff1 * diff2;
    variance1 += diff1 * diff1;
    variance2 += diff2 * diff2;
  }

  const denominator = Math.sqrt(variance1 * variance2);
  if (denominator === 0) return 0;

  return covariance / denominator;
}

export function getRiskLevel(score: number): RiskLevel {
  if (score <= 30) return 'low';
  if (score <= 60) return 'medium';
  return 'high';
}

export function getRiskLevelColor(level: RiskLevel): string {
  switch (level) {
    case 'low':
      return 'bg-success-100 text-success-700';
    case 'medium':
      return 'bg-warning-100 text-warning-700';
    case 'high':
      return 'bg-danger-100 text-danger-700';
  }
}
