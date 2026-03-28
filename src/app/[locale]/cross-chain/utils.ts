import { baseColors, semanticColors } from '@/lib/config/colors';
import { chainNames, chainColors } from '@/lib/constants';
import { type Blockchain } from '@/lib/oracles';
import {
  getHeatmapColor as getHeatmapColorUtil,
  calculateStandardDeviation as calculateStdDev,
  calculateMovingAverage,
  formatPrice as formatPriceUtil,
} from '@/lib/utils/chartSharedUtils';

export { chainNames, chainColors };
export type { Blockchain };

export const getDiffColorGradient = (diffPercent: number): string => {
  const absPercent = Math.abs(diffPercent);
  if (absPercent <= 0.5) {
    return 'bg-gray-50';
  }
  if (diffPercent > 0.5) {
    if (diffPercent > 2) return 'bg-danger-100';
    if (diffPercent > 1) return 'bg-danger-50';
    return 'bg-danger-50';
  } else {
    if (diffPercent < -2) return 'bg-success-100';
    if (diffPercent < -1) return 'bg-success-50';
    return 'bg-success-50';
  }
};

export const getDiffTextColor = (diffPercent: number): string => {
  if (Math.abs(diffPercent) <= 0.5) {
    return 'text-gray-600';
  }
  if (diffPercent > 0.5) {
    if (diffPercent > 2) return 'text-danger-800';
    if (diffPercent > 1) return 'text-danger-700';
    return 'text-danger-600';
  } else {
    if (diffPercent < -2) return 'text-green-800';
    if (diffPercent < -1) return 'text-success-700';
    return 'text-success-600';
  }
};

export const getDiffColorGradientWithStyle = (
  diffPercent: number
): { bg: string; text: string } => {
  if (diffPercent > 0.5) {
    const intensity = Math.min((diffPercent - 0.5) / 2, 1);
    const r = Math.floor(254 + (239 - 254) * intensity);
    const g = Math.floor(226 + (68 - 226) * intensity);
    const b = Math.floor(226 + (68 - 226) * intensity);
    return {
      bg: `rgba(${r}, ${g}, ${b}, 0.15)`,
      text: intensity > 0.5 ? semanticColors.danger.dark : semanticColors.danger.DEFAULT,
    };
  } else if (diffPercent < -0.5) {
    const intensity = Math.min((-diffPercent - 0.5) / 2, 1);
    const r = Math.floor(226 + (68 - 226) * intensity);
    const g = Math.floor(254 + (239 - 254) * intensity);
    const b = Math.floor(226 + (68 - 226) * intensity);
    return {
      bg: `rgba(${r}, ${g}, ${b}, 0.15)`,
      text: intensity > 0.5 ? semanticColors.success.dark : semanticColors.success.DEFAULT,
    };
  }
  return { bg: 'transparent', text: baseColors.gray[500] };
};

export const getHeatmapColor = (percent: number, maxPercent: number): string => {
  return getHeatmapColorUtil(percent, 0, maxPercent);
};

export const getCorrelationColor = (correlation: number): string => {
  const clampedCorrelation = Math.max(-1, Math.min(1, correlation));

  if (clampedCorrelation >= 0) {
    const t = clampedCorrelation;
    const r = Math.floor(255 - (255 - 30) * t);
    const g = Math.floor(255 - (255 - 64) * t);
    const b = Math.floor(255 - (255 - 175) * t);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    const t = Math.abs(clampedCorrelation);
    const r = Math.floor(255 - (255 - 220) * t);
    const g = Math.floor(255 - (255 - 38) * t);
    const b = Math.floor(255 - (255 - 38) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }
};

export const getConsistencyRating = (stdDevPercent: number): string => {
  if (stdDevPercent < 0.1) return 'excellent';
  if (stdDevPercent < 0.3) return 'good';
  if (stdDevPercent < 0.5) return 'fair';
  return 'poor';
};

export const getStabilityRating = (volatility: number): string => {
  if (volatility < 0.1) return 'stable';
  if (volatility < 0.3) return 'moderate';
  return 'unstable';
};

export const calculateZScore = (price: number, mean: number, stdDev: number): number | null => {
  if (stdDev === 0) return null;
  return (price - mean) / stdDev;
};

/**
 * 使用 Z-score 方法检测异常值
 *
 * @param zScore - Z-score 值
 * @param threshold - 阈值,默认为 2。常用值:
 *   - 1.5: 较宽松,检测更多异常值
 *   - 2.0: 标准阈值,约 95% 置信区间
 *   - 3.0: 较严格,只检测极端异常值
 * @returns 是否为异常值
 *
 * @example
 * // 使用默认阈值 2.0
 * isOutlier(2.5); // true
 *
 * // 使用自定义阈值
 * isOutlier(2.5, 3.0); // false
 */
export const isOutlier = (zScore: number | null, threshold: number = 2): boolean => {
  if (zScore === null) return false;
  return Math.abs(zScore) > threshold;
};

/**
 * 使用 IQR (四分位距) 方法检测异常值
 *
 * IQR 方法对于非正态分布的数据更稳健,不受极端值的影响。
 * 适用于:
 * - 价格数据分布不对称
 * - 存在极端价格波动
 * - 数据不满足正态分布假设
 *
 * @param value - 要检测的值
 * @param q1 - 第一四分位数 (25th percentile)
 * @param q3 - 第三四分位数 (75th percentile)
 * @param multiplier - IQR 乘数,默认为 1.5。常用值:
 *   - 1.5: 标准阈值,检测温和异常值
 *   - 3.0: 严格阈值,只检测极端异常值
 * @returns 是否为异常值
 *
 * @example
 * const prices = [100, 102, 101, 103, 150, 105, 104];
 * const sorted = [...prices].sort((a, b) => a - b);
 * const q1 = calculatePercentile(sorted, 25);
 * const q3 = calculatePercentile(sorted, 75);
 *
 * // 检测 150 是否为异常值
 * isOutlierIQR(150, q1, q3); // true
 */
export const isOutlierIQR = (
  value: number,
  q1: number,
  q3: number,
  multiplier: number = 1.5
): boolean => {
  const iqr = q3 - q1;
  const lowerBound = q1 - multiplier * iqr;
  const upperBound = q3 + multiplier * iqr;
  return value < lowerBound || value > upperBound;
};

/**
 * 批量使用 IQR 方法检测异常值
 *
 * @param prices - 价格数组
 * @param multiplier - IQR 乘数,默认为 1.5
 * @returns 异常值检测结果,包含异常值列表和边界信息
 *
 * @example
 * const prices = [100, 102, 101, 103, 150, 105, 104];
 * const result = detectOutliersIQR(prices);
 * console.log(result.outliers); // [150]
 * console.log(result.bounds); // { lower: 96.5, upper: 109.5 }
 */
export const detectOutliersIQR = (
  prices: number[],
  multiplier: number = 1.5
): {
  outliers: number[];
  q1: number;
  q3: number;
  iqr: number;
  lowerBound: number;
  upperBound: number;
} => {
  if (prices.length < 4) {
    return {
      outliers: [],
      q1: 0,
      q3: 0,
      iqr: 0,
      lowerBound: 0,
      upperBound: 0,
    };
  }

  const sorted = [...prices].sort((a, b) => a - b);
  const q1 = calculatePercentile(sorted, 25);
  const q3 = calculatePercentile(sorted, 75);
  const iqr = q3 - q1;
  const lowerBound = q1 - multiplier * iqr;
  const upperBound = q3 + multiplier * iqr;

  const outliers = prices.filter((price) => price < lowerBound || price > upperBound);

  return {
    outliers,
    q1,
    q3,
    iqr,
    lowerBound,
    upperBound,
  };
};

/**
 * 使用 Z-score 方法批量检测异常值
 *
 * @param prices - 价格数组
 * @param threshold - Z-score 阈值,默认为 2
 * @returns 异常值检测结果,包含异常值列表和统计信息
 *
 * @example
 * const prices = [100, 102, 101, 103, 150, 105, 104];
 * const result = detectOutliersZScore(prices, 2);
 * console.log(result.outliers); // [150]
 */
export const detectOutliersZScore = (
  prices: number[],
  threshold: number = 2
): {
  outliers: number[];
  mean: number;
  stdDev: number;
  lowerBound: number;
  upperBound: number;
} => {
  if (prices.length < 2) {
    return {
      outliers: [],
      mean: 0,
      stdDev: 0,
      lowerBound: 0,
      upperBound: 0,
    };
  }

  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const variance =
    prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) {
    return {
      outliers: [],
      mean,
      stdDev: 0,
      lowerBound: mean,
      upperBound: mean,
    };
  }

  const lowerBound = mean - threshold * stdDev;
  const upperBound = mean + threshold * stdDev;

  const outliers = prices.filter((price) => {
    const zScore = calculateZScore(price, mean, stdDev);
    return zScore !== null && Math.abs(zScore) > threshold;
  });

  return {
    outliers,
    mean,
    stdDev,
    lowerBound,
    upperBound,
  };
};

export const calculateChangePercent = (current: number, previous: number): number | null => {
  if (previous === 0 || current === 0) return null;
  return ((current - previous) / previous) * 100;
};

export const calculateStandardDeviation = (variance: number): number => {
  return Math.sqrt(variance);
};

/**
 * t 分布临界值查找表（95% 置信水平，双侧检验）
 * 用于小样本（n < 30）的置信区间计算
 *
 * 表格来源：标准 t 分布临界值表
 * 自由度 df = n - 1，其中 n 为样本量
 */
const T_CRITICAL_TABLE_95: Record<number, number> = {
  1: 12.706,
  2: 4.303,
  3: 3.182,
  4: 2.776,
  5: 2.571,
  6: 2.447,
  7: 2.365,
  8: 2.306,
  9: 2.262,
  10: 2.228,
  11: 2.201,
  12: 2.179,
  13: 2.16,
  14: 2.145,
  15: 2.131,
  16: 2.12,
  17: 2.11,
  18: 2.101,
  19: 2.093,
  20: 2.086,
  21: 2.08,
  22: 2.074,
  23: 2.069,
  24: 2.064,
  25: 2.06,
  26: 2.056,
  27: 2.052,
  28: 2.048,
  29: 2.045,
  30: 2.042,
};

/**
 * 获取 t 分布临界值
 *
 * 对于小样本（n < 30），应使用 t 分布而非正态分布来计算置信区间。
 * t 分布比正态分布有更厚的尾部，能更好地反映小样本的不确定性。
 *
 * @param df - 自由度，通常为 n - 1（n 为样本量）
 * @param confidenceLevel - 置信水平，默认 0.95（95% 置信区间）
 * @returns t 分布临界值
 *
 * @example
 * // 样本量 n = 5，自由度 df = 4
 * const tValue = getTCriticalValue(4); // 返回 2.776
 *
 * // 样本量 n = 10，自由度 df = 9
 * const tValue = getTCriticalValue(9); // 返回 2.262
 */
export const getTCriticalValue = (df: number, confidenceLevel: number = 0.95): number => {
  if (df <= 0) {
    return 1.96;
  }

  if (confidenceLevel !== 0.95) {
    console.warn('getTCriticalValue: 当前仅支持 95% 置信水平，其他置信水平将使用正态近似');
    return 1.96;
  }

  if (df >= 30) {
    return 1.96;
  }

  const exactValue = T_CRITICAL_TABLE_95[Math.floor(df)];
  if (exactValue !== undefined) {
    return exactValue;
  }

  const lowerDf = Math.floor(df);
  const upperDf = lowerDf + 1;
  const lowerValue = T_CRITICAL_TABLE_95[lowerDf] ?? 2.042;
  const upperValue = T_CRITICAL_TABLE_95[upperDf] ?? 1.96;

  const weight = df - lowerDf;
  return lowerValue + (upperValue - lowerValue) * weight;
};

export const calculateStandardDeviationFromValues = (prices: number[]): number => {
  return calculateStdDev(prices);
};

export const calculateVariance = (prices: number[], mean: number): number => {
  if (prices.length < 2) return 0;
  const sumSquaredDiff = prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0);
  return sumSquaredDiff / prices.length;
};

export const calculatePercentile = (sortedPrices: number[], percentile: number): number => {
  if (sortedPrices.length === 0) return 0;
  const index = (percentile / 100) * (sortedPrices.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  if (upper >= sortedPrices.length) return sortedPrices[sortedPrices.length - 1];
  if (lower === upper) return sortedPrices[lower];
  return sortedPrices[lower] * (1 - weight) + sortedPrices[upper] * weight;
};

export const calculateSMA = (data: number[], period: number): (number | null)[] => {
  const result = calculateMovingAverage(data, period);
  return result.map((v) => v);
};

export const calculatePearsonCorrelation = (x: number[], y: number[]): number => {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;

  const xSlice = x.slice(0, n);
  const ySlice = y.slice(0, n);

  const xMean = xSlice.reduce((a, b) => a + b, 0) / n;
  const yMean = ySlice.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let xDenominator = 0;
  let yDenominator = 0;

  for (let i = 0; i < n; i++) {
    const xDiff = xSlice[i] - xMean;
    const yDiff = ySlice[i] - yMean;
    numerator += xDiff * yDiff;
    xDenominator += xDiff * xDiff;
    yDenominator += yDiff * yDiff;
  }

  const denominator = Math.sqrt(xDenominator * yDenominator);
  if (denominator === 0) return 0;

  return numerator / denominator;
};

export interface TimestampedPrice {
  timestamp: number;
  price: number;
}

export const calculatePearsonCorrelationByTimestamp = (
  dataX: TimestampedPrice[],
  dataY: TimestampedPrice[]
): number => {
  if (dataX.length < 2 || dataY.length < 2) return 0;

  const mapY = new Map<number, number>();
  dataY.forEach((item) => mapY.set(item.timestamp, item.price));

  const matchedPairs: { x: number; y: number }[] = [];
  dataX.forEach((itemX) => {
    const priceY = mapY.get(itemX.timestamp);
    if (priceY !== undefined) {
      matchedPairs.push({ x: itemX.price, y: priceY });
    }
  });

  if (matchedPairs.length < 2) return 0;

  const n = matchedPairs.length;
  const xMean = matchedPairs.reduce((sum, pair) => sum + pair.x, 0) / n;
  const yMean = matchedPairs.reduce((sum, pair) => sum + pair.y, 0) / n;

  let numerator = 0;
  let xDenominator = 0;
  let yDenominator = 0;

  for (let i = 0; i < n; i++) {
    const xDiff = matchedPairs[i].x - xMean;
    const yDiff = matchedPairs[i].y - yMean;
    numerator += xDiff * yDiff;
    xDenominator += xDiff * xDiff;
    yDenominator += yDiff * yDiff;
  }

  const denominator = Math.sqrt(xDenominator * yDenominator);
  if (denominator === 0) return 0;

  return numerator / denominator;
};

export interface CorrelationResult {
  correlation: number;
  pValue: number;
  sampleSize: number;
  isSignificant: boolean;
  significanceLevel: '***' | '**' | '*' | '';
}

export const calculatePearsonCorrelationWithSignificance = (
  x: number[],
  y: number[]
): CorrelationResult => {
  const n = Math.min(x.length, y.length);
  if (n < 3) {
    return {
      correlation: 0,
      pValue: 1,
      sampleSize: n,
      isSignificant: false,
      significanceLevel: '',
    };
  }

  const xSlice = x.slice(0, n);
  const ySlice = y.slice(0, n);

  const xMean = xSlice.reduce((a, b) => a + b, 0) / n;
  const yMean = ySlice.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let xDenominator = 0;
  let yDenominator = 0;

  for (let i = 0; i < n; i++) {
    const xDiff = xSlice[i] - xMean;
    const yDiff = ySlice[i] - yMean;
    numerator += xDiff * yDiff;
    xDenominator += xDiff * xDiff;
    yDenominator += yDiff * yDiff;
  }

  const denominator = Math.sqrt(xDenominator * yDenominator);
  if (denominator === 0) {
    return {
      correlation: 0,
      pValue: 1,
      sampleSize: n,
      isSignificant: false,
      significanceLevel: '',
    };
  }

  const correlation = numerator / denominator;

  const tStatistic = correlation * Math.sqrt((n - 2) / (1 - correlation * correlation));

  const df = n - 2;
  const pValue = approximatePValue(Math.abs(tStatistic), df);

  let significanceLevel: '***' | '**' | '*' | '' = '';
  if (pValue < 0.001) {
    significanceLevel = '***';
  } else if (pValue < 0.01) {
    significanceLevel = '**';
  } else if (pValue < 0.05) {
    significanceLevel = '*';
  }

  return {
    correlation,
    pValue,
    sampleSize: n,
    isSignificant: pValue < 0.05,
    significanceLevel,
  };
};

export const calculatePearsonCorrelationWithSignificanceByTimestamp = (
  dataX: TimestampedPrice[],
  dataY: TimestampedPrice[]
): CorrelationResult => {
  if (dataX.length < 3 || dataY.length < 3) {
    return {
      correlation: 0,
      pValue: 1,
      sampleSize: 0,
      isSignificant: false,
      significanceLevel: '',
    };
  }

  const mapY = new Map<number, number>();
  dataY.forEach((item) => mapY.set(item.timestamp, item.price));

  const matchedPairs: { x: number; y: number }[] = [];
  dataX.forEach((itemX) => {
    const priceY = mapY.get(itemX.timestamp);
    if (priceY !== undefined) {
      matchedPairs.push({ x: itemX.price, y: priceY });
    }
  });

  const n = matchedPairs.length;
  if (n < 3) {
    return {
      correlation: 0,
      pValue: 1,
      sampleSize: n,
      isSignificant: false,
      significanceLevel: '',
    };
  }

  const xMean = matchedPairs.reduce((sum, pair) => sum + pair.x, 0) / n;
  const yMean = matchedPairs.reduce((sum, pair) => sum + pair.y, 0) / n;

  let numerator = 0;
  let xDenominator = 0;
  let yDenominator = 0;

  for (let i = 0; i < n; i++) {
    const xDiff = matchedPairs[i].x - xMean;
    const yDiff = matchedPairs[i].y - yMean;
    numerator += xDiff * yDiff;
    xDenominator += xDiff * xDiff;
    yDenominator += yDiff * yDiff;
  }

  const denominator = Math.sqrt(xDenominator * yDenominator);
  if (denominator === 0) {
    return {
      correlation: 0,
      pValue: 1,
      sampleSize: n,
      isSignificant: false,
      significanceLevel: '',
    };
  }

  const correlation = numerator / denominator;

  const tStatistic = correlation * Math.sqrt((n - 2) / (1 - correlation * correlation));

  const df = n - 2;
  const pValue = approximatePValue(Math.abs(tStatistic), df);

  let significanceLevel: '***' | '**' | '*' | '' = '';
  if (pValue < 0.001) {
    significanceLevel = '***';
  } else if (pValue < 0.01) {
    significanceLevel = '**';
  } else if (pValue < 0.05) {
    significanceLevel = '*';
  }

  return {
    correlation,
    pValue,
    sampleSize: n,
    isSignificant: pValue < 0.05,
    significanceLevel,
  };
};

// Approximate the p-value from t-statistic using a simplified t-distribution CDF
// This is a reasonable approximation for df > 10
const approximatePValue = (t: number, df: number): number => {
  if (df <= 0) return 1;

  // Use a simplified approximation based on the normal distribution for large df
  // For small df, use a rough approximation
  if (df > 30) {
    // Normal approximation for large degrees of freedom
    // Two-tailed test: p = 2 * (1 - CDF(|t|))
    const z = t;
    const p = 2 * (1 - normalCDF(z));
    return Math.min(p, 1);
  }

  // For smaller df, use a rough approximation
  // This is not exact but provides a reasonable estimate for significance testing
  const adjustedT = t * Math.sqrt(df / (df - 2));
  const p = 2 * (1 - normalCDF(adjustedT));
  return Math.min(Math.max(p, 0), 1);
};

// Standard normal CDF approximation using error function
const normalCDF = (x: number): number => {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  const absX = Math.abs(x) / Math.sqrt(2);

  const t = 1 / (1 + p * absX);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX);

  return 0.5 * (1 + sign * y);
};

export const getIntegrityColor = (value: number): string => {
  if (value >= 95) return semanticColors.success.DEFAULT;
  if (value >= 90) return semanticColors.warning.DEFAULT;
  return semanticColors.danger.DEFAULT;
};

export const getJumpColor = (count: number): string => {
  if (count < 3) return semanticColors.success.DEFAULT;
  if (count <= 5) return semanticColors.warning.DEFAULT;
  return semanticColors.danger.DEFAULT;
};

export const getVolatilityColor = (value: number): string => {
  if (value < 0.1) return semanticColors.success.DEFAULT;
  if (value <= 0.3) return semanticColors.warning.DEFAULT;
  return semanticColors.danger.DEFAULT;
};

export const getDataFreshness = (
  delay: { avgDelay: number; maxDelay: number } | undefined
): { status: string; color: string } => {
  if (!delay) return { status: 'unknown', color: 'text-gray-400' };
  if (delay.avgDelay < 5) return { status: 'excellent', color: 'text-success-700' };
  if (delay.avgDelay < 15) return { status: 'good', color: 'text-warning-700' };
  return { status: 'slow', color: 'text-danger-700' };
};

/**
 * 自适应价格格式化
 * 根据价格大小自动调整小数位数
 */
export const formatPrice = (price: number, _decimals?: number): string => {
  // 忽略 decimals 参数，使用自适应格式化
  return formatPriceUtil(price);
};

/**
 * 格式化价格值（使用自适应精度）
 */
export const formatPriceValue = (price: number): string => {
  return formatPriceUtil(price);
};

export const generateFilename = (symbol: string, extension: string): string => {
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
  return `cross-chain-${symbol}-${timestamp}.${extension}`;
};

export interface RollingCorrelationPoint {
  timestamp: number;
  correlation: number;
}

export interface RollingVolatilityPoint {
  timestamp: number;
  volatility: number;
}

export interface VolatilityConePoint {
  windowSize: number;
  minVolatility: number;
  maxVolatility: number;
  meanVolatility: number;
  medianVolatility: number;
  p10: number;
  p25: number;
  p75: number;
  p90: number;
}

export const calculateRollingCorrelation = (
  pricesX: number[],
  pricesY: number[],
  windowSize: number,
  timestamps?: number[]
): RollingCorrelationPoint[] => {
  const n = Math.min(pricesX.length, pricesY.length);
  if (n < windowSize || windowSize < 2) {
    return [];
  }

  if (!timestamps && process.env.NODE_ENV === 'development') {
    console.warn(
      'calculateRollingCorrelation: timestamps parameter is recommended for accurate chart X-axis values'
    );
  }

  const result: RollingCorrelationPoint[] = [];

  for (let i = windowSize - 1; i < n; i++) {
    const xSlice = pricesX.slice(i - windowSize + 1, i + 1);
    const ySlice = pricesY.slice(i - windowSize + 1, i + 1);

    const xMean = xSlice.reduce((a, b) => a + b, 0) / windowSize;
    const yMean = ySlice.reduce((a, b) => a + b, 0) / windowSize;

    let numerator = 0;
    let xDenominator = 0;
    let yDenominator = 0;

    for (let j = 0; j < windowSize; j++) {
      const xDiff = xSlice[j] - xMean;
      const yDiff = ySlice[j] - yMean;
      numerator += xDiff * yDiff;
      xDenominator += xDiff * xDiff;
      yDenominator += yDiff * yDiff;
    }

    const denominator = Math.sqrt(xDenominator * yDenominator);
    const correlation = denominator === 0 ? 0 : numerator / denominator;

    result.push({
      timestamp: timestamps ? timestamps[i] : i,
      correlation: isNaN(correlation) ? 0 : correlation,
    });
  }

  return result;
};

/**
 * 计算滚动波动率
 * @param prices 价格数组
 * @param windowSize 窗口大小
 * @param timestamps 可选的时间戳数组
 * @param dataIntervalMinutes 数据间隔（分钟），默认60（小时级）
 * @returns 滚动波动率时序数据
 */
export const calculateRollingVolatility = (
  prices: number[],
  windowSize: number,
  timestamps?: number[],
  dataIntervalMinutes: number = 60
): RollingVolatilityPoint[] => {
  if (prices.length < windowSize || windowSize < 2) {
    return [];
  }

  if (!timestamps && process.env.NODE_ENV === 'development') {
    console.warn(
      'calculateRollingVolatility: timestamps parameter is recommended for accurate chart X-axis values'
    );
  }

  const result: RollingVolatilityPoint[] = [];

  for (let i = windowSize; i < prices.length; i++) {
    const windowPrices = prices.slice(i - windowSize, i);
    const returns: number[] = [];

    // 计算对数收益率
    for (let j = 1; j < windowPrices.length; j++) {
      if (windowPrices[j - 1] > 0 && windowPrices[j] > 0) {
        const logReturn = Math.log(windowPrices[j] / windowPrices[j - 1]);
        returns.push(logReturn);
      }
    }

    if (returns.length < 2) {
      result.push({
        timestamp: timestamps ? timestamps[i] : i,
        volatility: 0,
      });
      continue;
    }

    // 计算收益率的标准差（波动率）
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);

    // 年化波动率 (根据数据间隔动态计算年化因子)
    // 年化因子 = sqrt(一年的数据点数) = sqrt(365 * 24 * 60 / dataIntervalMinutes)
    const annualizedVolatility =
      volatility * Math.sqrt((365 * 24 * 60) / dataIntervalMinutes) * 100;

    result.push({
      timestamp: timestamps ? timestamps[i] : i,
      volatility: isNaN(annualizedVolatility) ? 0 : annualizedVolatility,
    });
  }

  return result;
};

/**
 * 计算波动率锥
 * @param prices 价格数组
 * @param windowSizes 不同的时间窗口大小数组
 * @returns 波动率锥数据
 */
export const calculateVolatilityCone = (
  prices: number[],
  windowSizes: number[] = [10, 20, 30, 50, 100]
): VolatilityConePoint[] => {
  const result: VolatilityConePoint[] = [];

  windowSizes.forEach((windowSize) => {
    const rollingVols = calculateRollingVolatility(prices, windowSize);
    const volatilities = rollingVols.map((v) => v.volatility).filter((v) => v > 0);

    if (volatilities.length === 0) {
      result.push({
        windowSize,
        minVolatility: 0,
        maxVolatility: 0,
        meanVolatility: 0,
        medianVolatility: 0,
        p10: 0,
        p25: 0,
        p75: 0,
        p90: 0,
      });
      return;
    }

    const sorted = [...volatilities].sort((a, b) => a - b);
    const n = sorted.length;

    const minVolatility = sorted[0];
    const maxVolatility = sorted[n - 1];
    const meanVolatility = volatilities.reduce((a, b) => a + b, 0) / n;
    const medianVolatility =
      n % 2 === 1 ? sorted[Math.floor(n / 2)] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;

    // 计算百分位数
    const p10Index = Math.floor(n * 0.1);
    const p25Index = Math.floor(n * 0.25);
    const p75Index = Math.floor(n * 0.75);
    const p90Index = Math.floor(n * 0.9);

    result.push({
      windowSize,
      minVolatility,
      maxVolatility,
      meanVolatility,
      medianVolatility,
      p10: sorted[p10Index] || minVolatility,
      p25: sorted[p25Index] || minVolatility,
      p75: sorted[p75Index] || maxVolatility,
      p90: sorted[p90Index] || maxVolatility,
    });
  });

  return result;
};

// Dynamic Threshold Types
export type ThresholdType = 'fixed' | 'dynamic' | 'atr';

/**
 * 异常值检测方法类型
 * - zscore: Z-score 方法,适用于正态分布数据
 * - iqr: IQR (四分位距) 方法,适用于非正态分布数据
 */
export type OutlierDetectionMethod = 'zscore' | 'iqr';

export interface ThresholdConfig {
  type: ThresholdType;
  fixedThreshold: number;
  atrMultiplier: number;
  volatilityWindow: number;
  priceJumpMethod: 'std' | 'zscore' | 'simple';
  priceJumpThreshold: number;
  outlierDetectionMethod: OutlierDetectionMethod;
  outlierThreshold: number;
}

// Calculate Average True Range (ATR) for dynamic threshold
export const calculateATR = (prices: number[], period: number = 14): number => {
  if (prices.length < period + 1) {
    // Not enough data, return simple standard deviation as fallback
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance =
      prices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / prices.length;
    return Math.sqrt(variance);
  }

  const trueRanges: number[] = [];

  for (let i = 1; i < prices.length; i++) {
    const currentPrice = prices[i];
    const previousPrice = prices[i - 1];

    // True Range = max(|current - previous|, |current - previous_high|, |current - previous_low|)
    // Simplified version using just price changes
    const priceChange = Math.abs(currentPrice - previousPrice);
    trueRanges.push(priceChange);
  }

  // Calculate Simple Moving Average of True Ranges
  const atrValues: number[] = [];
  for (let i = period - 1; i < trueRanges.length; i++) {
    const slice = trueRanges.slice(i - period + 1, i + 1);
    const atr = slice.reduce((a, b) => a + b, 0) / period;
    atrValues.push(atr);
  }

  // Return the most recent ATR
  return atrValues.length > 0 ? atrValues[atrValues.length - 1] : 0;
};

// Calculate dynamic threshold based on historical volatility
export const calculateDynamicThreshold = (prices: number[], config: ThresholdConfig): number => {
  if (prices.length < 2) {
    return config.fixedThreshold;
  }

  switch (config.type) {
    case 'fixed':
      return config.fixedThreshold;

    case 'atr': {
      const atr = calculateATR(prices, config.volatilityWindow);
      const currentPrice = prices[prices.length - 1];
      if (currentPrice === 0) return config.fixedThreshold;
      // Convert ATR to percentage
      const atrPercent = (atr / currentPrice) * 100;
      return atrPercent * config.atrMultiplier;
    }

    case 'dynamic': {
      // Calculate rolling standard deviation
      const windowSize = Math.min(config.volatilityWindow, prices.length);
      const recentPrices = prices.slice(-windowSize);
      const mean = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
      const variance =
        recentPrices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) /
        recentPrices.length;
      const stdDev = Math.sqrt(variance);

      if (mean === 0) return config.fixedThreshold;

      // Use coefficient of variation (CV) as dynamic threshold base
      const cv = (stdDev / mean) * 100;
      return Math.max(cv * config.atrMultiplier, config.fixedThreshold * 0.1);
    }

    default:
      return config.fixedThreshold;
  }
};

export const calculatePriceJumpStats = (changes: number[]) => {
  if (changes.length === 0) {
    return { mean: 0, stdDev: 0 };
  }

  const mean = changes.reduce((a, b) => a + b, 0) / changes.length;

  if (changes.length === 1) {
    return { mean, stdDev: 0 };
  }

  const variance =
    changes.reduce((sum, change) => sum + Math.pow(change - mean, 2), 0) / changes.length;
  const stdDev = Math.sqrt(variance);

  return { mean, stdDev };
};

export const detectPriceJumps = (
  changes: number[],
  method: 'std' | 'zscore' | 'simple',
  threshold: number
): number => {
  if (changes.length === 0) {
    return 0;
  }

  const { mean, stdDev } = calculatePriceJumpStats(changes);

  if (method === 'simple') {
    const simpleThreshold = mean * threshold;
    return changes.filter((change) => change > simpleThreshold).length;
  }

  if (method === 'std') {
    const stdThreshold = mean + stdDev * threshold;
    return changes.filter((change) => change > stdThreshold).length;
  }

  if (method === 'zscore') {
    if (stdDev === 0) {
      return 0;
    }
    return changes.filter((change) => {
      const zScore = calculateZScore(change, mean, stdDev);
      return zScore !== null && Math.abs(zScore) > threshold;
    }).length;
  }

  return 0;
};

// Default threshold configuration
export const defaultThresholdConfig: ThresholdConfig = {
  type: 'fixed',
  fixedThreshold: 0.5,
  atrMultiplier: 2.0,
  volatilityWindow: 14,
  priceJumpMethod: 'zscore',
  priceJumpThreshold: 2.0,
  outlierDetectionMethod: 'zscore',
  outlierThreshold: 2.0,
};

/**
 * 异常值检测方法选择指南
 *
 * ## Z-score 方法 (outlierDetectionMethod: 'zscore')
 *
 * **适用场景:**
 * - 数据近似正态分布
 * - 价格波动相对稳定
 * - 需要基于统计显著性检测异常
 *
 * **优点:**
 * - 统计学基础扎实
 * - 易于理解和解释
 * - 计算效率高
 *
 * **缺点:**
 * - 对极端值敏感 (均值和标准差会被极端值影响)
 * - 不适合偏态分布
 *
 * **推荐阈值:**
 * - 1.5: 检测约 87% 置信区间外的值
 * - 2.0: 检测约 95% 置信区间外的值 (默认)
 * - 3.0: 检测约 99.7% 置信区间外的值
 *
 * ## IQR 方法 (outlierDetectionMethod: 'iqr')
 *
 * **适用场景:**
 * - 数据分布不对称 (偏态)
 * - 存在极端价格波动
 * - 加密货币等高波动性资产
 *
 * **优点:**
 * - 对极端值稳健 (不受异常值影响)
 * - 适合非正态分布
 * - 不依赖均值和标准差
 *
 * **缺点:**
 * - 可能遗漏一些有意义的异常值
 * - 对小样本不够敏感
 *
 * **推荐阈值:**
 * - 1.5: 标准阈值,检测温和异常值 (默认)
 * - 3.0: 严格阈值,只检测极端异常值
 *
 * ## 使用建议
 *
 * 1. **稳定币价格分析**: 推荐使用 Z-score 方法,阈值 2.0
 * 2. **高波动性代币**: 推荐使用 IQR 方法,阈值 1.5
 * 3. **跨链价格比较**: 推荐使用 IQR 方法,因为不同链的价格分布可能不同
 * 4. **历史异常检测**: 根据数据分布选择,可先用直方图或 Q-Q 图评估分布
 *
 * @example
 * // 使用 Z-score 方法检测异常值
 * const config = {
 *   ...defaultThresholdConfig,
 *   outlierDetectionMethod: 'zscore',
 *   outlierThreshold: 2.0
 * };
 *
 * // 使用 IQR 方法检测异常值
 * const config = {
 *   ...defaultThresholdConfig,
 *   outlierDetectionMethod: 'iqr',
 *   outlierThreshold: 1.5
 * };
 */
