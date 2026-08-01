import { riskMetricsLogger as logger, type RiskLevel, type VolatilityResult } from './types';

export function calculateVolatilityIndex(
  priceHistory: number[],
  timestamps?: number[]
): VolatilityResult {
  try {
    if (priceHistory.length < 2) {
      throw new Error('Insufficient price history data');
    }

    const returns: number[] = [];
    for (let i = 1; i < priceHistory.length; i++) {
      if (priceHistory[i] > 0 && priceHistory[i - 1] > 0) {
        const logReturn = Math.log(priceHistory[i] / priceHistory[i - 1]);
        returns.push(logReturn);
      }
    }

    if (returns.length === 0) {
      throw new Error('Unable to calculate returns from price history');
    }

    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;

    const variance =
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) /
      Math.max(returns.length - 1, 1);

    const dailyVolatility = Math.sqrt(variance);

    const annualizationFactor = computeAnnualizationFactor(timestamps, priceHistory.length);
    const annualizedVolatility = dailyVolatility * Math.sqrt(annualizationFactor);

    const index = Math.min(Math.round(annualizedVolatility * 100), 100);

    let level: RiskLevel;
    let description: string;

    if (index < 20) {
      level = 'low';
      description = 'volatility_low';
    } else if (index < 40) {
      level = 'medium';
      description = 'volatility_moderate';
    } else if (index < 60) {
      level = 'high';
      description = 'volatility_high';
    } else {
      level = 'critical';
      description = 'volatility_extreme';
    }

    logger.debug(`Volatility index: ${index}, Daily: ${dailyVolatility.toFixed(4)}`);

    return {
      index,
      level,
      description,
      annualizedVolatility: Number(annualizedVolatility.toFixed(4)),
      dailyVolatility: Number(dailyVolatility.toFixed(4)),
    };
  } catch (error) {
    logger.error(
      'Failed to calculate volatility index',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      index: 0,
      level: 'critical',
      description: 'calculation_error',
      annualizedVolatility: 0,
      dailyVolatility: 0,
    };
  }
}

const MS_PER_YEAR = 365 * 24 * 60 * 60 * 1000;

function computeAnnualizationFactor(timestamps: number[] | undefined, priceCount: number): number {
  if (timestamps && timestamps.length >= 2) {
    let totalInterval = 0;
    let intervalCount = 0;
    for (let i = 1; i < timestamps.length; i++) {
      const interval = timestamps[i] - timestamps[i - 1];
      if (interval > 0) {
        totalInterval += interval;
        intervalCount++;
      }
    }
    if (intervalCount > 0) {
      const avgIntervalMs = totalInterval / intervalCount;
      if (avgIntervalMs > 0) {
        return MS_PER_YEAR / avgIntervalMs;
      }
    }
  }
  return priceCount >= 2 ? 365 : 1;
}

export function aggregateVolatilityResults(results: VolatilityResult[]): VolatilityResult {
  if (results.length === 0) {
    return {
      index: 0,
      level: 'low',
      description: 'volatility_insufficient_data',
      annualizedVolatility: 0,
      dailyVolatility: 0,
    };
  }

  const n = results.length;
  const avgIndex = Math.round(results.reduce((sum, r) => sum + r.index, 0) / n);
  const avgAnnualized = results.reduce((sum, r) => sum + r.annualizedVolatility, 0) / n;
  const avgDaily = results.reduce((sum, r) => sum + r.dailyVolatility, 0) / n;

  let level: RiskLevel;
  let description: string;
  if (avgIndex < 20) {
    level = 'low';
    description = 'volatility_low';
  } else if (avgIndex < 40) {
    level = 'medium';
    description = 'volatility_moderate';
  } else if (avgIndex < 60) {
    level = 'high';
    description = 'volatility_high';
  } else {
    level = 'critical';
    description = 'volatility_extreme';
  }

  return {
    index: avgIndex,
    level,
    description,
    annualizedVolatility: Number(avgAnnualized.toFixed(4)),
    dailyVolatility: Number(avgDaily.toFixed(4)),
  };
}
