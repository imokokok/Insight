import { type RiskLevel } from '@/types/risk';

export interface RiskMetrics {
  volatility?: number;
  maxDrawdown?: number;
  sharpeRatio?: number;
  correlation?: number;
}

export function calculateRiskScore(metrics: RiskMetrics): number {
  const { volatility = 0.2, maxDrawdown = 0.1, sharpeRatio = 1, correlation = 0.5 } = metrics;

  // Higher score = lower risk (0-100 scale)
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
    const drawdown = (peak - price) / peak;
    maxDrawdown = Math.max(maxDrawdown, drawdown);
  }

  return maxDrawdown;
}

export function calculateVaR(returns: number[], confidence: number = 0.95): number {
  if (returns.length === 0) return 0;

  const sorted = [...returns].sort((a, b) => a - b);
  const index = Math.floor((1 - confidence) * sorted.length);

  return sorted[index] || 0;
}

export function calculateCVaR(returns: number[], confidence: number = 0.95): number {
  if (returns.length === 0) return 0;

  const sorted = [...returns].sort((a, b) => a - b);
  const cutoffIndex = Math.floor((1 - confidence) * sorted.length);

  if (cutoffIndex === 0) return sorted[0] || 0;

  const tailReturns = sorted.slice(0, cutoffIndex);
  return tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length;
}

export function calculateBeta(assetReturns: number[], marketReturns: number[]): number {
  const minLength = Math.min(assetReturns.length, marketReturns.length);
  if (minLength < 2) return 0;

  const assetSlice = assetReturns.slice(0, minLength);
  const marketSlice = marketReturns.slice(0, minLength);

  const assetMean = assetSlice.reduce((sum, r) => sum + r, 0) / minLength;
  const marketMean = marketSlice.reduce((sum, r) => sum + r, 0) / minLength;

  let covariance = 0;
  let marketVariance = 0;

  for (let i = 0; i < minLength; i++) {
    const assetDiff = assetSlice[i] - assetMean;
    const marketDiff = marketSlice[i] - marketMean;
    covariance += assetDiff * marketDiff;
    marketVariance += marketDiff * marketDiff;
  }

  covariance /= minLength;
  marketVariance /= minLength;

  if (marketVariance === 0) return 0;

  return covariance / marketVariance;
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

export function calculatePortfolioRisk(
  assets: Array<{ weight: number; volatility: number; returns: number[] }>
): { totalRisk: number; diversificationBenefit: number; weightedVolatility: number } {
  if (assets.length === 0) {
    return { totalRisk: 0, diversificationBenefit: 0, weightedVolatility: 0 };
  }

  const weightedVolatility = assets.reduce(
    (sum, asset) => sum + asset.weight * asset.volatility,
    0
  );

  // Calculate portfolio variance with correlation
  let portfolioVariance = 0;
  for (let i = 0; i < assets.length; i++) {
    for (let j = 0; j < assets.length; j++) {
      const correlation = i === j ? 1 : calculateCorrelation(assets[i].returns, assets[j].returns);
      portfolioVariance +=
        assets[i].weight *
        assets[j].weight *
        assets[i].volatility *
        assets[j].volatility *
        correlation;
    }
  }

  const totalRisk = Math.sqrt(portfolioVariance);
  const diversificationBenefit = Math.max(0, weightedVolatility - totalRisk);

  return { totalRisk, diversificationBenefit, weightedVolatility };
}

export function formatRiskMetrics(metrics: Record<string, number>): Record<string, string> {
  const formatted: Record<string, string> = {};

  for (const [key, value] of Object.entries(metrics)) {
    if (key.toLowerCase().includes('ratio')) {
      formatted[key] = value.toFixed(2);
    } else if (key.toLowerCase().includes('var') || key.toLowerCase().includes('cvar')) {
      formatted[key] = `${(value * 100).toFixed(2)}%`;
    } else {
      formatted[key] = `${(value * 100).toFixed(2)}%`;
    }
  }

  return formatted;
}

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'just now';
  }
  if (diffMins < 60) {
    return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  }
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  }
  if (diffDays < 30) {
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }
  return date.toLocaleDateString();
}

export function isDataStale(lastUpdated: Date, thresholdMinutes: number = 5): boolean {
  const now = new Date();
  const diffMs = now.getTime() - lastUpdated.getTime();
  const diffMins = Math.floor(diffMs / 1000 / 60);
  return diffMins > thresholdMinutes;
}

export function getScoreColor(score: number): string {
  if (score >= 90) return 'text-success-600';
  if (score >= 70) return 'text-warning-600';
  return 'text-danger-600';
}

export function getScoreBg(score: number): string {
  if (score >= 90) return 'bg-success-100';
  if (score >= 70) return 'bg-warning-100';
  return 'bg-danger-100';
}

export function getScoreBarColor(score: number): string {
  if (score >= 90) return 'bg-success-500';
  if (score >= 70) return 'bg-warning-500';
  return 'bg-danger-500';
}

export function getEventTypeColor(type: string): string {
  switch (type) {
    case 'upgrade':
      return 'bg-primary-100 text-primary-700';
    case 'vulnerability':
      return 'bg-danger-100 text-danger-700';
    case 'response':
      return 'bg-success-100 text-success-700';
    case 'maintenance':
      return 'bg-gray-100 text-gray-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
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

export function getStatusColor(status: 'resolved' | 'monitoring'): string {
  return status === 'resolved'
    ? 'bg-success-100 text-success-700'
    : 'bg-warning-100 text-warning-700';
}

export function getMeasureStatusColor(status: 'active' | 'inactive'): string {
  return status === 'active' ? 'bg-success-100 text-success-700' : 'bg-gray-100 text-gray-600';
}

export function formatLatency(latency: number): string {
  return latency < 1000 ? `${latency}ms` : `${(latency / 1000).toFixed(1)}s`;
}

export function calculateOverallScore(metrics: { value: number }[]): number {
  return Math.round(metrics.reduce((sum, metric) => sum + metric.value, 0) / metrics.length);
}
