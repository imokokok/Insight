import type {
  BollingerBandsResult,
  BollingerBandsExtendedResult,
  MACDResult,
  MACDExtendedResult,
  ATRResult,
  OHLCVDataPoint,
  NullableNumber,
} from './types';

export function calculateSMA(data: number[], period: number): number[] {
  const result: number[] = [];
  let runningSum = 0;

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      runningSum += data[i];
      result.push(data[i]);
      continue;
    }

    if (i === period - 1) {
      runningSum += data[i];
      result.push(runningSum / period);
    } else {
      runningSum = runningSum - data[i - period] + data[i];
      result.push(runningSum / period);
    }
  }

  return result;
}

export function calculateSMAWithNull(data: number[], period: number): NullableNumber[] {
  const result: NullableNumber[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }

    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j];
    }
    result.push(sum / period);
  }

  return result;
}

export function calculateEMA(data: number[], period: number): number[] {
  if (period <= 0) {
    throw new Error('Period must be a positive number');
  }
  if (data.length === 0) {
    return [];
  }

  const result: number[] = [];
  const multiplier = 2 / (period + 1);

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      // First period-1 values use SMA (Simple Moving Average)
      const sum = data.slice(0, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / (i + 1));
    } else if (i === period - 1) {
      // The period-th value uses the full-cycle SMA as the initial EMA value
      const sum = data.slice(0, period).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    } else {
      // Subsequent values use the standard EMA formula
      const ema = data[i] * multiplier + result[i - 1] * (1 - multiplier);
      result.push(ema);
    }
  }

  return result;
}

export function calculateEMAWithNull(data: number[], period: number): NullableNumber[] {
  const result: NullableNumber[] = [];
  const multiplier = 2 / (period + 1);

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }

    if (i === period - 1) {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j];
      }
      result.push(sum / period);
    } else {
      const prevEMA = result[i - 1]!;
      const ema = (data[i] - prevEMA) * multiplier + prevEMA;
      result.push(ema);
    }
  }

  return result;
}

function calculateRSICore(changes: number[], period: number, outputLength: number): number[] {
  if (period <= 0) {
    throw new Error('Period must be a positive number');
  }

  const rsi: number[] = new Array(outputLength).fill(50);

  if (changes.length < period) {
    return rsi;
  }

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < period; i++) {
    const change = changes[i];
    if (change > 0) {
      avgGain += change;
    } else {
      avgLoss += Math.abs(change);
    }
  }

  avgGain /= period;
  avgLoss /= period;

  if (avgLoss === 0) {
    rsi[period] = 100;
  } else {
    const rs = avgGain / avgLoss;
    rsi[period] = 100 - 100 / (1 + rs);
  }

  for (let i = period + 1; i < outputLength; i++) {
    const change = changes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      rsi[i] = 100;
    } else {
      const rs = avgGain / avgLoss;
      rsi[i] = 100 - 100 / (1 + rs);
    }
  }

  return rsi;
}

export function calculateRSI(prices: number[], period: number = 14): number[] {
  if (!prices || prices.length === 0) {
    return [];
  }

  if (prices.some((p) => !Number.isFinite(p))) {
    throw new Error('Prices array contains invalid values (NaN, Infinity, or -Infinity)');
  }

  const changes: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }

  return calculateRSICore(changes, period, prices.length);
}

export function calculateRSIFromData(
  data: Array<{ price: number; high?: number; low?: number; close?: number }>,
  period: number = 14
): number[] {
  if (!data || data.length === 0) {
    return [];
  }

  const closes = data.map((d) => d.close ?? d.price);

  if (closes.some((p) => !Number.isFinite(p))) {
    throw new Error('Data contains invalid price values (NaN, Infinity, or -Infinity)');
  }

  const changes: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  return calculateRSICore(changes, period, data.length);
}

export function calculateMACD(
  prices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDResult {
  if (prices.length === 0) {
    return { macd: [], signal: [], histogram: [] };
  }

  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);

  const macdLine: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    macdLine.push(fastEMA[i] - slowEMA[i]);
  }

  const signalLine = calculateEMA(macdLine, signalPeriod);

  const histogram: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    histogram.push(macdLine[i] - signalLine[i]);
  }

  return { macd: macdLine, signal: signalLine, histogram };
}

export function calculateMACDExtended(
  data: Array<{ price: number }>,
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDExtendedResult {
  const prices = data.map((d) => d.price);

  const ema12 = calculateEMA(prices, fastPeriod);
  const ema26 = calculateEMA(prices, slowPeriod);

  const dif = ema12.map((fast, i) => fast - ema26[i]);

  const dea = calculateEMA(dif, signalPeriod);

  const macd = dif.map((d, i) => (d - dea[i]) * 2);

  const signals: Array<'golden' | 'death' | null> = new Array(data.length).fill(null);
  for (let i = 1; i < data.length; i++) {
    if (dif[i - 1] < dea[i - 1] && dif[i] >= dea[i]) {
      signals[i] = 'golden';
    } else if (dif[i - 1] > dea[i - 1] && dif[i] <= dea[i]) {
      signals[i] = 'death';
    }
  }

  return { dif, dea, macd, signals };
}

export function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  multiplier: number = 2
): BollingerBandsResult {
  if (prices.length === 0) {
    return { upper: [], middle: [], lower: [], stdDev: [] };
  }

  const middle = calculateSMA(prices, period);
  const upper: number[] = [];
  const lower: number[] = [];
  const stdDev: number[] = [];

  let windowSum = 0;
  let windowSumSq = 0;

  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      upper.push(prices[i]);
      lower.push(prices[i]);
      stdDev.push(0);
      continue;
    }

    if (i === period - 1) {
      for (let j = 0; j < period; j++) {
        windowSum += prices[j];
        windowSumSq += prices[j] * prices[j];
      }
    } else {
      windowSum += prices[i] - prices[i - period];
      windowSumSq += prices[i] * prices[i] - prices[i - period] * prices[i - period];
    }

    const mean = windowSum / period;
    const variance = Math.max(0, (windowSumSq - (windowSum * windowSum) / period) / period);
    const currentStdDev = Math.sqrt(variance);

    upper.push(mean + multiplier * currentStdDev);
    lower.push(mean - multiplier * currentStdDev);
    stdDev.push(currentStdDev);
  }

  return { upper, middle, lower, stdDev };
}

export function calculateBollingerBandsWithNull(
  data: number[],
  period: number = 20,
  multiplier: number = 2
): BollingerBandsResult {
  const upper: NullableNumber[] = [];
  const middle: NullableNumber[] = [];
  const lower: NullableNumber[] = [];
  const stdDev: NullableNumber[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      upper.push(null);
      middle.push(null);
      lower.push(null);
      stdDev.push(null);
      continue;
    }

    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j];
    }
    const sma = sum / period;

    let varianceSum = 0;
    for (let j = 0; j < period; j++) {
      varianceSum += Math.pow(data[i - j] - sma, 2);
    }
    const currentStdDev = Math.sqrt(varianceSum / period);

    upper.push(sma + multiplier * currentStdDev);
    middle.push(sma);
    lower.push(sma - multiplier * currentStdDev);
    stdDev.push(currentStdDev);
  }

  return { upper, middle, lower, stdDev } as BollingerBandsResult;
}

export function calculateBollingerBandsExtended(
  prices: OHLCVDataPoint[],
  period: number = 20,
  multiplier: number = 2
): BollingerBandsExtendedResult {
  const sortedPrices = [...prices].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  const priceValues = sortedPrices.map((p) => p.price);

  const middle = calculateSMA(priceValues, period);
  const stdDevValues: number[] = [];

  for (let i = 0; i < priceValues.length; i++) {
    if (i < period - 1) {
      stdDevValues.push(0);
    } else {
      const slice = priceValues.slice(i - period + 1, i + 1);
      const mean = middle[i];
      const squaredDiffs = slice.map((p) => Math.pow(p - mean, 2));
      const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / period;
      stdDevValues.push(Math.sqrt(variance));
    }
  }

  const upper = middle.map((m, i) => m + stdDevValues[i] * multiplier);
  const lower = middle.map((m, i) => m - stdDevValues[i] * multiplier);

  const bandwidth = upper.map((u, i) => u - lower[i]);
  const bandwidthPercent = middle.map((m, i) => (m > 0 ? (bandwidth[i] / m) * 100 : 0));
  const position = middle.map((m, i) =>
    stdDevValues[i] > 0 ? (priceValues[i] - m) / (stdDevValues[i] * multiplier) : 0
  );

  return { upper, middle, lower, stdDev: stdDevValues, bandwidth, bandwidthPercent, position };
}

export function calculateTrueRange(
  current: OHLCVDataPoint,
  previous: OHLCVDataPoint | null
): number {
  if (!previous) {
    return (current.high || current.price) - (current.low || current.price);
  }

  const high = current.high || current.price;
  const low = current.low || current.price;
  const previousClose = previous.close || previous.price;

  const tr1 = high - low;
  const tr2 = Math.abs(high - previousClose);
  const tr3 = Math.abs(low - previousClose);

  return Math.max(tr1, tr2, tr3);
}

export function calculateATR(prices: OHLCVDataPoint[], period: number = 14): ATRResult {
  const tr: number[] = [];
  const atr: number[] = [];

  for (let i = 0; i < prices.length; i++) {
    const previous = i > 0 ? prices[i - 1] : null;
    const trueRange = calculateTrueRange(prices[i], previous);
    tr.push(trueRange);

    if (i < period - 1) {
      atr.push(NaN);
    } else if (i === period - 1) {
      const sum = tr.slice(0, period).reduce((a, b) => a + b, 0);
      atr.push(sum / period);
    } else {
      const previousATR = atr[i - 1];
      const currentATR = (previousATR * (period - 1) + trueRange) / period;
      atr.push(currentATR);
    }
  }

  return { tr, atr };
}

export function calculateRollingStdDev(prices: number[], period: number): number[] {
  const result: number[] = [];

  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
    } else {
      const slice = prices.slice(i - period + 1, i + 1);
      const mean = slice.reduce((sum, p) => sum + p, 0) / period;
      const variance = slice.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / period;
      result.push(Math.sqrt(Math.max(0, variance)));
    }
  }
  return result;
}

export function calculateVolatility(data: number[], period: number = 20): NullableNumber[] {
  const result: NullableNumber[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      result.push(null);
      continue;
    }

    const returns: number[] = [];
    for (let j = 1; j <= period; j++) {
      const currentPrice = data[i - period + j];
      const prevPrice = data[i - period + j - 1];
      // Add division by zero check
      if (prevPrice > 0 && currentPrice > 0) {
        returns.push(Math.log(currentPrice / prevPrice));
      }
    }

    const mean = returns.length > 0 ? returns.reduce((sum, r) => sum + r, 0) / returns.length : 0;
    const variance =
      returns.length > 0
        ? returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length
        : 0;
    const stdDev = Math.sqrt(variance);

    const annualizedVol = returns.length > 0 ? stdDev * Math.sqrt(365) * 100 : null;
    result.push(annualizedVol);
  }

  return result;
}

export function calculateROC(data: number[], period: number = 10): NullableNumber[] {
  const result: NullableNumber[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      result.push(null);
      continue;
    }

    const currentPrice = data[i];
    const pastPrice = data[i - period];
    if (pastPrice === 0) {
      result.push(null);
    } else {
      const roc = ((currentPrice - pastPrice) / pastPrice) * 100;
      result.push(roc);
    }
  }

  return result;
}

export function calculateCurrentVolatility(prices: number[]): number | null {
  if (prices.length < 20) return null;

  const recentPrices = prices.slice(-20);
  const returns: number[] = [];

  for (let i = 1; i < recentPrices.length; i++) {
    if (recentPrices[i] > 0 && recentPrices[i - 1] > 0) {
      returns.push(Math.log(recentPrices[i] / recentPrices[i - 1]));
    }
  }

  if (returns.length === 0) return null;

  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  return stdDev * Math.sqrt(365) * 100;
}

export function addTechnicalIndicators<T extends Record<string, unknown>>(
  chartData: T[],
  dataKey: string
): T[] {
  const priceFlags: boolean[] = chartData.map((d) => typeof d[dataKey] === 'number');
  const validPrices: number[] = chartData
    .filter((_, i) => priceFlags[i])
    .map((d) => d[dataKey] as number);

  if (validPrices.length === 0) return chartData;

  const ma7 = calculateSMAWithNull(validPrices, 7);
  const ma30 = calculateSMAWithNull(validPrices, 30);
  const volatility = calculateVolatility(validPrices, 20);

  let validIndex = 0;
  return chartData.map((point, index) => {
    if (!priceFlags[index]) {
      return point;
    }
    const idx = validIndex++;
    return {
      ...point,
      [`${dataKey}_MA7`]: ma7[idx] ?? null,
      [`${dataKey}_MA30`]: ma30[idx] ?? null,
      [`${dataKey}_Volatility`]: volatility[idx] ?? null,
    };
  }) as T[];
}
