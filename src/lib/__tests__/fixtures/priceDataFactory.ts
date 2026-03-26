import type { AnomalyLevel, AnomalyType } from '@/lib/analytics/anomalyDetection';
import type { OHLCVDataPoint } from '@/lib/indicators/types';

export interface PriceSeriesOptions {
  basePrice: number;
  count: number;
  volatility?: number;
}

export interface TimestampOptions {
  count: number;
  intervalMs?: number;
  startTime?: number;
}

export interface VolumeSeriesOptions {
  count: number;
  baseVolume?: number;
  volatility?: number;
}

export interface KnownRSIDataset {
  prices: number[];
  expectedRSI: number[];
  period: number;
  description: string;
}

export interface KnownMACDDataset {
  prices: number[];
  expectedMACD: {
    macd: number[];
    signal: number[];
    histogram: number[];
  };
  config: {
    fastPeriod: number;
    slowPeriod: number;
    signalPeriod: number;
  };
  description: string;
}

export interface AnomalyTestData {
  prices: number[];
  timestamps: number[];
  volumes: number[];
  expectedAnomalies: Array<{
    index: number;
    type: AnomalyType;
    level: AnomalyLevel;
  }>;
  description: string;
}

export interface CorrelationMatrixOptions {
  size: number;
  correlation?: number;
}

/**
 * 生成价格序列
 *
 * 基于随机游走模型生成模拟价格数据，适用于技术指标计算测试。
 *
 * @param basePrice - 基础价格，序列的起始价格
 * @param count - 生成的价格数据点数量
 * @param volatility - 波动率参数，控制价格变化的幅度，默认 0.02 (2%)
 * @returns 价格数组
 *
 * @example
 * ```typescript
 * const prices = createPriceSeries(100, 50, 0.03);
 * // 生成 50 个价格点，基础价格 100，波动率 3%
 * ```
 */
export function createPriceSeries(
  basePrice: number,
  count: number,
  volatility: number = 0.02
): number[] {
  const prices: number[] = [];
  let currentPrice = basePrice;

  for (let i = 0; i < count; i++) {
    const randomChange = (Math.random() - 0.5) * 2 * volatility;
    currentPrice = currentPrice * (1 + randomChange);
    prices.push(Number(currentPrice.toFixed(4)));
  }

  return prices;
}

/**
 * 生成时间戳数组
 *
 * 生成等间隔的时间戳序列，用于模拟时间序列数据。
 *
 * @param count - 生成的时间戳数量
 * @param intervalMs - 时间间隔（毫秒），默认 60000 (1分钟)
 * @param startTime - 起始时间戳，默认为当前时间减去 (count-1) * intervalMs
 * @returns 时间戳数组（毫秒级）
 *
 * @example
 * ```typescript
 * const timestamps = createTimestamps(100, 3600000);
 * // 生成 100 个时间戳，间隔 1 小时
 * ```
 */
export function createTimestamps(
  count: number,
  intervalMs: number = 60000,
  startTime?: number
): number[] {
  const start = startTime ?? Date.now() - (count - 1) * intervalMs;
  const timestamps: number[] = [];

  for (let i = 0; i < count; i++) {
    timestamps.push(start + i * intervalMs);
  }

  return timestamps;
}

/**
 * 生成成交量序列
 *
 * 生成模拟的成交量数据，用于成交量相关指标测试。
 *
 * @param count - 生成的成交量数据点数量
 * @param baseVolume - 基础成交量，默认 1000000
 * @param volatility - 波动率参数，控制成交量变化幅度，默认 0.3 (30%)
 * @returns 成交量数组
 *
 * @example
 * ```typescript
 * const volumes = createVolumeSeries(50, 500000, 0.2);
 * // 生成 50 个成交量数据点，基础成交量 500000，波动率 20%
 * ```
 */
export function createVolumeSeries(
  count: number,
  baseVolume: number = 1000000,
  volatility: number = 0.3
): number[] {
  const volumes: number[] = [];

  for (let i = 0; i < count; i++) {
    const randomFactor = 1 + (Math.random() - 0.5) * 2 * volatility;
    const volume = baseVolume * randomFactor;
    volumes.push(Math.round(volume));
  }

  return volumes;
}

/**
 * 创建已知 RSI 计算结果的数据集
 *
 * 返回一个包含已知 RSI 计算结果的数据集，用于验证 RSI 计算函数的正确性。
 * 数据集包含持续上涨的价格序列，预期 RSI 值应高于 70（超买区域）。
 *
 * @returns 包含价格、预期 RSI 值、周期和描述的数据集
 *
 * @example
 * ```typescript
 * const dataset = createKnownRSIDataset();
 * const calculatedRSI = calculateRSI(dataset.prices, dataset.period);
 * // 比较 calculatedRSI 和 dataset.expectedRSI
 * ```
 */
export function createKnownRSIDataset(): KnownRSIDataset {
  const prices = [
    100, 101, 102, 101.5, 103, 104, 103.5, 105, 106, 105.5, 107, 108, 107.5, 109, 110, 109.5, 111,
    112, 111.5, 113, 114, 113.5, 115, 116, 115.5, 117, 118, 117.5, 119, 120,
  ];

  const period = 14;

  const expectedRSI = calculateExpectedRSI(prices, period);

  return {
    prices,
    expectedRSI,
    period,
    description:
      'Consistent uptrend with 14-period RSI calculation. Expected RSI should be above 70 indicating overbought conditions.',
  };
}

function calculateExpectedRSI(prices: number[], period: number): number[] {
  const rsi: number[] = new Array(prices.length).fill(50);

  if (prices.length < period + 1) {
    return rsi;
  }

  const gains: number[] = [];
  const losses: number[] = [];

  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  if (avgLoss === 0) {
    rsi[period] = 100;
  } else {
    const rs = avgGain / avgLoss;
    rsi[period] = 100 - 100 / (1 + rs);
  }

  for (let i = period + 1; i < prices.length; i++) {
    const gainIndex = i - 1;
    const gain = gains[gainIndex] || 0;
    const loss = losses[gainIndex] || 0;

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

/**
 * 创建已知 MACD 计算结果的数据集
 *
 * 返回一个包含已知 MACD 计算结果的数据集，用于验证 MACD 计算函数的正确性。
 * 数据集包含持续上涨的价格序列，MACD 线应为正值且位于信号线之上。
 *
 * @returns 包含价格、预期 MACD 值、配置参数和描述的数据集
 *
 * @example
 * ```typescript
 * const dataset = createKnownMACDDataset();
 * const calculatedMACD = calculateMACD(
 *   dataset.prices,
 *   dataset.config.fastPeriod,
 *   dataset.config.slowPeriod,
 *   dataset.config.signalPeriod
 * );
 * // 比较 calculatedMACD 和 dataset.expectedMACD
 * ```
 */
export function createKnownMACDDataset(): KnownMACDDataset {
  const prices = [
    100, 101, 102, 103, 102.5, 104, 105, 106, 105.5, 107, 108, 109, 108.5, 110, 111, 112, 111.5,
    113, 114, 115, 114.5, 116, 117, 118, 117.5, 119, 120, 121, 120.5, 122, 123, 124, 123.5, 125,
    126, 127, 126.5, 128, 129, 130,
  ];

  const config = {
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
  };

  const expectedMACD = calculateExpectedMACD(
    prices,
    config.fastPeriod,
    config.slowPeriod,
    config.signalPeriod
  );

  return {
    prices,
    expectedMACD,
    config,
    description:
      'Consistent uptrend for MACD calculation. MACD line should be positive and above signal line in uptrend.',
  };
}

function calculateExpectedMACD(
  prices: number[],
  fastPeriod: number,
  slowPeriod: number,
  signalPeriod: number
): { macd: number[]; signal: number[]; histogram: number[] } {
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);

  const macd: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    macd.push(fastEMA[i] - slowEMA[i]);
  }

  const signal = calculateEMA(macd, signalPeriod);

  const histogram: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    histogram.push(macd[i] - signal[i]);
  }

  return { macd, signal, histogram };
}

function calculateEMA(data: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);

  for (let i = 0; i < data.length; i++) {
    if (i === 0) {
      result.push(data[i]);
    } else {
      const ema = data[i] * multiplier + result[i - 1] * (1 - multiplier);
      result.push(ema);
    }
  }

  return result;
}

/**
 * 创建包含已知异常点的测试数据
 *
 * 返回一个包含已知异常点的价格序列，用于验证异常检测算法的正确性。
 * 数据集在索引 15 处包含 15% 的价格飙升，在索引 35 处包含 15% 的价格下跌。
 *
 * @returns 包含价格、时间戳、成交量和预期异常信息的数据集
 *
 * @example
 * ```typescript
 * const testData = createAnomalyTestData();
 * const detectedAnomalies = detectPriceAnomalies(
 *   testData.prices,
 *   testData.timestamps,
 *   'TEST'
 * );
 * // 验证检测到的异常是否与 testData.expectedAnomalies 匹配
 * ```
 */
export function createAnomalyTestData(): AnomalyTestData {
  const basePrice = 100;
  const count = 50;
  const prices: number[] = [];
  const timestamps: number[] = [];
  const volumes: number[] = [];
  const now = Date.now();
  const intervalMs = 60000;

  for (let i = 0; i < count; i++) {
    timestamps.push(now - (count - 1 - i) * intervalMs);
    volumes.push(1000000 + Math.round(Math.random() * 200000));
  }

  for (let i = 0; i < count; i++) {
    if (i === 15) {
      prices.push(basePrice * 1.15);
    } else if (i === 35) {
      prices.push(basePrice * 0.85);
    } else if (i >= 0 && i < 15) {
      prices.push(basePrice + (Math.random() - 0.5) * 2);
    } else if (i > 15 && i < 35) {
      prices.push(basePrice * 1.05 + (Math.random() - 0.5) * 2);
    } else {
      prices.push(basePrice * 0.95 + (Math.random() - 0.5) * 2);
    }
  }

  const expectedAnomalies = [
    { index: 15, type: 'price_spike' as AnomalyType, level: 'high' as AnomalyLevel },
    { index: 35, type: 'price_drop' as AnomalyType, level: 'high' as AnomalyLevel },
  ];

  return {
    prices,
    timestamps,
    volumes,
    expectedAnomalies,
    description:
      'Price series with known anomalies at index 15 (15% spike) and index 35 (15% drop)',
  };
}

/**
 * 生成相关系数矩阵
 *
 * 生成一个对称的相关系数矩阵，对角线元素为 1，非对角线元素围绕指定相关系数随机波动。
 *
 * @param size - 矩阵大小（行数和列数）
 * @param correlation - 基础相关系数，默认 0.5，范围 [-1, 1]
 * @returns 相关系数矩阵（二维数组）
 *
 * @example
 * ```typescript
 * const matrix = createCorrelationMatrix(5, 0.7);
 * // 生成 5x5 的相关系数矩阵，基础相关系数 0.7
 * ```
 */
export function createCorrelationMatrix(size: number, correlation: number = 0.5): number[][] {
  const matrix: number[][] = [];

  for (let i = 0; i < size; i++) {
    const row: number[] = [];
    for (let j = 0; j < size; j++) {
      if (i === j) {
        row.push(1);
      } else if (j > i) {
        const randomFactor = (Math.random() - 0.5) * 0.2;
        const value = Math.max(-1, Math.min(1, correlation + randomFactor));
        row.push(Number(value.toFixed(4)));
      } else {
        row.push(matrix[j][i]);
      }
    }
    matrix.push(row);
  }

  return matrix;
}

/**
 * 创建价格数据点数组
 *
 * 生成完整的 OHLCVDataPoint 对象数组，可选包含 OHLC 和成交量数据。
 *
 * @param basePrice - 基础价格
 * @param count - 数据点数量
 * @param options - 可选配置项
 * @param options.volatility - 波动率，默认 0.02
 * @param options.includeOHLC - 是否包含开高低收数据，默认 false
 * @param options.includeVolume - 是否包含成交量数据，默认 false
 * @param options.intervalMs - 时间间隔（毫秒），默认 60000
 * @returns OHLCVDataPoint 数组
 *
 * @example
 * ```typescript
 * const dataPoints = createPriceDataPoints(100, 50, {
 *   includeOHLC: true,
 *   includeVolume: true
 * });
 * ```
 */
export function createPriceDataPoints(
  basePrice: number,
  count: number,
  options: {
    volatility?: number;
    includeOHLC?: boolean;
    includeVolume?: boolean;
    intervalMs?: number;
  } = {}
): OHLCVDataPoint[] {
  const {
    volatility = 0.02,
    includeOHLC = false,
    includeVolume = false,
    intervalMs = 60000,
  } = options;

  const timestamps = createTimestamps(count, intervalMs);
  const prices = createPriceSeries(basePrice, count, volatility);
  const volumes = includeVolume ? createVolumeSeries(count) : undefined;

  return prices.map((price, index) => {
    const point: OHLCVDataPoint = {
      price,
      timestamp: timestamps[index],
    };

    if (includeOHLC) {
      const range = price * volatility;
      point.high = price + Math.random() * range;
      point.low = price - Math.random() * range;
      point.open = price + (Math.random() - 0.5) * range;
      point.close = price + (Math.random() - 0.5) * range;
    }

    if (includeVolume && volumes) {
      point.volume = volumes[index];
    }

    return point;
  });
}

/**
 * 创建趋势性价格序列
 *
 * 生成具有明确趋势方向的价格序列，用于测试趋势跟随指标。
 *
 * @param basePrice - 基础价格
 * @param count - 数据点数量
 * @param trendDirection - 趋势方向：'up'（上涨）、'down'（下跌）、'flat'（横盘），默认 'up'
 * @param trendStrength - 趋势强度，默认 0.001
 * @returns 价格数组
 *
 * @example
 * ```typescript
 * const uptrendPrices = createTrendingPriceSeries(100, 50, 'up', 0.002);
 * const downtrendPrices = createTrendingPriceSeries(100, 50, 'down', 0.002);
 * ```
 */
export function createTrendingPriceSeries(
  basePrice: number,
  count: number,
  trendDirection: 'up' | 'down' | 'flat' = 'up',
  trendStrength: number = 0.001
): number[] {
  const prices: number[] = [];
  let currentPrice = basePrice;

  const direction = trendDirection === 'up' ? 1 : trendDirection === 'down' ? -1 : 0;

  for (let i = 0; i < count; i++) {
    const trendComponent = direction * trendStrength * currentPrice;
    const noise = (Math.random() - 0.5) * 0.01 * currentPrice;
    currentPrice = currentPrice + trendComponent + noise;
    prices.push(Number(currentPrice.toFixed(4)));
  }

  return prices;
}

/**
 * 创建高波动价格序列
 *
 * 生成在指定索引位置具有高波动性的价格序列，用于测试波动率相关指标。
 *
 * @param basePrice - 基础价格
 * @param count - 数据点数量
 * @param volatilitySpikes - 高波动位置的索引数组
 * @returns 价格数组
 *
 * @example
 * ```typescript
 * const prices = createVolatilePriceSeries(100, 50, [10, 25, 40]);
 * // 在索引 10、25、40 处会有高波动
 * ```
 */
export function createVolatilePriceSeries(
  basePrice: number,
  count: number,
  volatilitySpikes: number[] = []
): number[] {
  const prices: number[] = [];
  let currentPrice = basePrice;

  for (let i = 0; i < count; i++) {
    let volatility = 0.02;

    if (volatilitySpikes.includes(i)) {
      volatility = 0.15;
    }

    const randomChange = (Math.random() - 0.5) * 2 * volatility;
    currentPrice = currentPrice * (1 + randomChange);
    prices.push(Number(currentPrice.toFixed(4)));
  }

  return prices;
}

/**
 * 创建多资产价格数据
 *
 * 为多个资产生成价格序列，所有资产共享相同的时间戳。
 *
 * @param symbols - 资产符号数组
 * @param count - 每个资产的数据点数量
 * @param basePrices - 各资产的基础价格映射
 * @returns 以资产符号为键的价格数据映射
 *
 * @example
 * ```typescript
 * const data = createMultiAssetPriceData(
 *   ['BTC', 'ETH', 'SOL'],
 *   100,
 *   { BTC: 50000, ETH: 3000, SOL: 100 }
 * );
 * ```
 */
export function createMultiAssetPriceData(
  symbols: string[],
  count: number,
  basePrices: Record<string, number>
): Record<string, { prices: number[]; timestamps: number[] }> {
  const timestamps = createTimestamps(count);
  const result: Record<string, { prices: number[]; timestamps: number[] }> = {};

  for (const symbol of symbols) {
    const basePrice = basePrices[symbol] ?? 100;
    result[symbol] = {
      prices: createPriceSeries(basePrice, count),
      timestamps,
    };
  }

  return result;
}

/**
 * 创建已知布林带计算结果的数据集
 *
 * 返回一个包含已知布林带计算结果的数据集，用于验证布林带计算函数的正确性。
 *
 * @returns 包含价格、周期、乘数、预期布林带值和描述的数据集
 *
 * @example
 * ```typescript
 * const dataset = createKnownBollingerBandsDataset();
 * const calculatedBands = calculateBollingerBands(
 *   dataset.prices,
 *   dataset.period,
 *   dataset.multiplier
 * );
 * // 比较 calculatedBands 和 dataset.expectedBands
 * ```
 */
export function createKnownBollingerBandsDataset(): {
  prices: number[];
  period: number;
  multiplier: number;
  expectedBands: {
    upper: number[];
    middle: number[];
    lower: number[];
  };
  description: string;
} {
  const prices = [
    100, 101, 102, 101.5, 103, 104, 103.5, 105, 106, 105.5, 107, 108, 107.5, 109, 110, 109.5, 111,
    112, 111.5, 113,
  ];

  const period = 20;
  const multiplier = 2;

  const expectedBands = calculateExpectedBollingerBands(prices, period, multiplier);

  return {
    prices,
    period,
    multiplier,
    expectedBands,
    description:
      'Price series for Bollinger Bands calculation with 20-period SMA and 2x standard deviation multiplier.',
  };
}

function calculateExpectedBollingerBands(
  prices: number[],
  period: number,
  multiplier: number
): { upper: number[]; middle: number[]; lower: number[] } {
  const middle: number[] = [];
  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      middle.push(prices[i]);
      upper.push(prices[i]);
      lower.push(prices[i]);
    } else {
      const slice = prices.slice(i - period + 1, i + 1);
      const sma = slice.reduce((a, b) => a + b, 0) / period;
      const variance = slice.reduce((sum, p) => sum + Math.pow(p - sma, 2), 0) / period;
      const stdDev = Math.sqrt(variance);

      middle.push(sma);
      upper.push(sma + multiplier * stdDev);
      lower.push(sma - multiplier * stdDev);
    }
  }

  return { upper, middle, lower };
}
