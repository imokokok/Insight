/**
 * 计算简单移动平均线 (SMA)
 * @param data 价格数据数组
 * @param period 周期
 * @returns 移动平均线数据数组
 */
export function calculateSMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];

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

/**
 * 计算指数移动平均线 (EMA)
 * @param data 价格数据数组
 * @param period 周期
 * @returns 指数移动平均线数据数组
 */
export function calculateEMA(data: number[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const multiplier = 2 / (period + 1);

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      result.push(null);
      continue;
    }

    if (i === period - 1) {
      // 第一个EMA使用SMA
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

/**
 * 计算历史波动率 (HV)
 * @param data 价格数据数组
 * @param period 周期
 * @returns 波动率数据数组
 */
export function calculateVolatility(data: number[], period: number = 20): (number | null)[] {
  const result: (number | null)[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      result.push(null);
      continue;
    }

    // 计算对数收益率
    const returns: number[] = [];
    for (let j = 1; j <= period; j++) {
      const currentPrice = data[i - period + j];
      const prevPrice = data[i - period + j - 1];
      returns.push(Math.log(currentPrice / prevPrice));
    }

    // 计算收益率的标准差
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    // 年化波动率
    const annualizedVol = stdDev * Math.sqrt(365) * 100;
    result.push(annualizedVol);
  }

  return result;
}

/**
 * 计算价格变化率 (ROC)
 * @param data 价格数据数组
 * @param period 周期
 * @returns ROC数据数组
 */
export function calculateROC(data: number[], period: number = 10): (number | null)[] {
  const result: (number | null)[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      result.push(null);
      continue;
    }

    const currentPrice = data[i];
    const pastPrice = data[i - period];
    const roc = ((currentPrice - pastPrice) / pastPrice) * 100;
    result.push(roc);
  }

  return result;
}

/**
 * 为图表数据添加技术指标
 * @param chartData 图表数据点数组
 * @param dataKey 价格数据键名
 * @returns 添加指标后的数据数组
 */
export function addTechnicalIndicators<T extends Record<string, unknown>>(
  chartData: T[],
  dataKey: string
): T[] {
  const prices = chartData.map((d) => d[dataKey] as number).filter((p) => typeof p === 'number');

  if (prices.length === 0) return chartData;

  const ma7 = calculateSMA(prices, 7);
  const ma30 = calculateSMA(prices, 30);
  const volatility = calculateVolatility(prices, 20);

  return chartData.map((point, index) => ({
    ...point,
    [`${dataKey}_MA7`]: ma7[index],
    [`${dataKey}_MA30`]: ma30[index],
    [`${dataKey}_Volatility`]: volatility[index],
  })) as T[];
}

/**
 * 计算当前波动率
 * @param prices 价格数组
 * @returns 当前波动率百分比
 */
export function calculateCurrentVolatility(prices: number[]): number | null {
  if (prices.length < 20) return null;

  const recentPrices = prices.slice(-20);
  const returns: number[] = [];

  for (let i = 1; i < recentPrices.length; i++) {
    returns.push(Math.log(recentPrices[i] / recentPrices[i - 1]));
  }

  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);

  return stdDev * Math.sqrt(365) * 100;
}

/**
 * 布林带计算结果
 */
export interface BollingerBands {
  upper: (number | null)[];
  middle: (number | null)[];
  lower: (number | null)[];
  stdDev: (number | null)[];
}

/**
 * 计算布林带 (Bollinger Bands)
 * @param data 价格数据数组
 * @param period 周期，默认20
 * @param multiplier 标准差倍数，默认2
 * @returns 布林带数据
 */
export function calculateBollingerBands(
  data: number[],
  period: number = 20,
  multiplier: number = 2
): BollingerBands {
  const upper: (number | null)[] = [];
  const middle: (number | null)[] = [];
  const lower: (number | null)[] = [];
  const stdDev: (number | null)[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      upper.push(null);
      middle.push(null);
      lower.push(null);
      stdDev.push(null);
      continue;
    }

    // 计算SMA作为中轨
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j];
    }
    const sma = sum / period;

    // 计算标准差
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

  return { upper, middle, lower, stdDev };
}

/**
 * 计算置信区间
 * @param data 价格数据数组
 * @param period 周期，默认20
 * @returns 置信区间数据
 */
export function calculateConfidenceIntervals(
  data: number[],
  period: number = 20
): {
  upper1: (number | null)[];
  lower1: (number | null)[];
  upper2: (number | null)[];
  lower2: (number | null)[];
} {
  const upper1: (number | null)[] = [];
  const lower1: (number | null)[] = [];
  const upper2: (number | null)[] = [];
  const lower2: (number | null)[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      upper1.push(null);
      lower1.push(null);
      upper2.push(null);
      lower2.push(null);
      continue;
    }

    // 计算均值
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j];
    }
    const mean = sum / period;

    // 计算标准差
    let varianceSum = 0;
    for (let j = 0; j < period; j++) {
      varianceSum += Math.pow(data[i - j] - mean, 2);
    }
    const currentStdDev = Math.sqrt(varianceSum / period);

    // ±1σ 和 ±2σ 置信区间
    upper1.push(mean + currentStdDev);
    lower1.push(mean - currentStdDev);
    upper2.push(mean + 2 * currentStdDev);
    lower2.push(mean - 2 * currentStdDev);
  }

  return { upper1, lower1, upper2, lower2 };
}
