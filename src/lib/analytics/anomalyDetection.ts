/**
 * 异常检测模块
 *
 * 提供基于统计学的异常检测功能：
 * - 基于标准差 (2σ) 的异常检测
 * - 趋势突变检测
 * - 价格异动预警
 */

import { chartColors, semanticColors } from '@/lib/config/colors';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('anomalyDetection');

/**
 * 异常等级
 */
export type AnomalyLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * 异常类型
 */
export type AnomalyType =
  | 'price_spike' // 价格暴涨
  | 'price_drop' // 价格暴跌
  | 'volatility_spike' // 波动率激增
  | 'trend_break' // 趋势突变
  | 'volume_anomaly' // 成交量异常
  | 'correlation_break'; // 相关性断裂

/**
 * 异常数据
 */
export interface AnomalyData {
  id: string;
  type: AnomalyType;
  level: AnomalyLevel;
  title: string;
  description: string;
  timestamp: number;
  asset?: string;
  oracle?: string;
  value: number;
  expectedValue: number;
  deviation: number; // 偏离程度 (标准差倍数)
  duration: number; // 持续时间 (分钟)
  acknowledged: boolean;
}

/**
 * 标准差检测结果
 */
export interface StdDevResult {
  mean: number;
  stdDev: number;
  upperBound: number; // μ + 2σ
  lowerBound: number; // μ - 2σ
  anomalies: {
    index: number;
    value: number;
    deviation: number;
    isUpper: boolean;
  }[];
}

/**
 * 趋势检测结果
 */
export interface TrendResult {
  direction: 'up' | 'down' | 'flat';
  strength: number; // 0-100
  changePoint?: number; // 突变点索引
  confidence: number; // 置信度 0-1
}

/**
 * 计算标准差检测
 * 使用改进的 Z-Score 方法，结合 MAD (Median Absolute Deviation) 进行稳健统计
 * 参考: Iglewicz & Hoaglin (1993) - 使用调整后的 Z-Score 进行异常检测
 *
 * @param data 数据数组
 * @param threshold 标准差倍数阈值 (默认 2.5，对应约 99% 置信区间)
 * @returns 标准差检测结果
 */
export function calculateStdDevDetection(data: number[], threshold: number = 2.5): StdDevResult {
  try {
    if (data.length < 2) {
      throw new Error('Insufficient data for standard deviation calculation');
    }

    // 计算均值和标准差
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);

    // 计算中位数和 MAD (Median Absolute Deviation) 用于稳健统计
    const sortedData = [...data].sort((a, b) => a - b);
    const median = sortedData[Math.floor(sortedData.length / 2)];
    const mad =
      sortedData.reduce((sum, val) => sum + Math.abs(val - median), 0) / sortedData.length;

    // 处理 stdDev 为 0 的情况，使用 MAD 作为备选
    const effectiveStdDev = stdDev === 0 ? mad * 1.4826 : stdDev; // 1.4826 是 MAD 到标准差的转换系数

    if (effectiveStdDev === 0) {
      return {
        mean,
        stdDev: 0,
        upperBound: mean,
        lowerBound: mean,
        anomalies: [],
      };
    }

    // 使用动态阈值：小样本时使用更严格的阈值
    const adjustedThreshold = data.length < 30 ? threshold * 1.2 : threshold;

    // 计算上下界
    const upperBound = mean + adjustedThreshold * effectiveStdDev;
    const lowerBound = mean - adjustedThreshold * effectiveStdDev;

    // 检测异常点 - 使用改进的 Z-Score
    const anomalies = data
      .map((value, index) => {
        // 使用调整后的 Z-Score: 0.6745 * (x - median) / MAD
        const modifiedZScore = (0.6745 * (value - median)) / (mad || effectiveStdDev);
        const deviation = Math.abs(value - mean) / effectiveStdDev;

        // 异常判定：传统 Z-Score 或改进的 Z-Score 任一超过阈值
        if (deviation > adjustedThreshold || Math.abs(modifiedZScore) > 3.5) {
          return {
            index,
            value,
            deviation: Math.max(deviation, Math.abs(modifiedZScore)),
            isUpper: value > mean,
          };
        }
        return null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    logger.debug(
      `StdDev detection: mean=${mean.toFixed(4)}, stdDev=${effectiveStdDev.toFixed(4)}, anomalies=${anomalies.length}`
    );

    return {
      mean,
      stdDev: effectiveStdDev,
      upperBound,
      lowerBound,
      anomalies,
    };
  } catch (error) {
    logger.error(
      'Failed to calculate standard deviation detection',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      mean: 0,
      stdDev: 0,
      upperBound: 0,
      lowerBound: 0,
      anomalies: [],
    };
  }
}

/**
 * 检测价格异动
 * 使用对数收益率和 GARCH 风格波动率聚类检测
 * 参考: Bollinger Bands + 波动率突破检测
 *
 * @param prices 价格历史
 * @param timestamps 时间戳数组
 * @param asset 资产名称
 * @returns 异常数据数组
 */
export function detectPriceAnomalies(
  prices: number[],
  timestamps: number[],
  asset: string
): AnomalyData[] {
  try {
    if (prices.length < 20) {
      return [];
    }

    const anomalies: AnomalyData[] = [];

    // 计算对数收益率 (更稳定的收益率计算方式)
    const logReturns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      if (prices[i] > 0 && prices[i - 1] > 0) {
        const logRet = Math.log(prices[i] / prices[i - 1]) * 100; // 转换为百分比
        logReturns.push(logRet);
      }
    }

    if (logReturns.length < 10) return [];

    // 使用滚动窗口计算动态波动率 (EWMA - 指数加权移动平均)
    const lambda = 0.94; // RiskMetrics 标准参数
    const window = Math.min(20, Math.floor(logReturns.length / 2));

    for (let i = window; i < logReturns.length; i++) {
      const windowReturns = logReturns.slice(i - window, i);

      // 计算 EWMA 波动率
      let ewmaVar = 0;
      let weightSum = 0;
      for (let j = 0; j < windowReturns.length; j++) {
        const weight = Math.pow(lambda, windowReturns.length - 1 - j);
        ewmaVar += weight * windowReturns[j] * windowReturns[j];
        weightSum += weight;
      }
      const ewmaVol = Math.sqrt(ewmaVar / weightSum);

      // 计算当前收益率的 Z-Score
      const currentReturn = logReturns[i];
      const windowMean = windowReturns.reduce((a, b) => a + b, 0) / windowReturns.length;
      const zScore = ewmaVol > 0 ? (currentReturn - windowMean) / ewmaVol : 0;

      // 多阈值检测
      const absZScore = Math.abs(zScore);
      if (absZScore > 2) {
        const priceIndex = i + 1;
        const priceChange = currentReturn;

        // 确定异常类型和等级
        let type: AnomalyType;
        let level: AnomalyLevel;

        if (priceChange > 0) {
          type = 'price_spike';
        } else {
          type = 'price_drop';
        }

        // 基于 Z-Score 确定等级
        if (absZScore > 4) level = 'critical';
        else if (absZScore > 3) level = 'high';
        else if (absZScore > 2.5) level = 'medium';
        else level = 'low';

        // 检查是否是连续异常 (去重)
        const isDuplicate = anomalies.some(
          (a) => Math.abs(a.timestamp - timestamps[priceIndex]) < 60000 // 1分钟内不重复
        );

        if (!isDuplicate) {
          anomalies.push({
            id: `price-${asset}-${timestamps[priceIndex]}-${Date.now()}`,
            type,
            level,
            title: type === 'price_spike' ? 'price_spike_detected' : 'price_drop_detected',
            description: `${asset} ${type === 'price_spike' ? 'surged' : 'dropped'} ${Math.abs(priceChange).toFixed(2)}% (Z-Score: ${zScore.toFixed(2)})`,
            timestamp: timestamps[priceIndex],
            asset,
            value: prices[priceIndex],
            expectedValue: prices[priceIndex - 1] * Math.exp(windowMean / 100),
            deviation: absZScore,
            duration: 0,
            acknowledged: false,
          });
        }
      }
    }

    logger.debug(`Detected ${anomalies.length} price anomalies for ${asset}`);
    return anomalies;
  } catch (error) {
    logger.error(
      'Failed to detect price anomalies',
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}

/**
 * 检测趋势突变
 * 使用 CUSUM (累积和) 算法检测趋势变化
 *
 * @param data 数据数组
 * @param timestamps 时间戳数组
 * @param threshold 检测阈值
 * @returns 趋势检测结果
 */
export function detectTrendBreak(
  data: number[],
  timestamps: number[],
  threshold: number = 2
): { trend: TrendResult; anomalies: AnomalyData[] } {
  try {
    if (data.length < 20) {
      return {
        trend: { direction: 'flat', strength: 0, confidence: 0 },
        anomalies: [],
      };
    }

    // 计算对数收益率
    const returns: number[] = [];
    for (let i = 1; i < data.length; i++) {
      // 添加除零检查
      if (data[i] > 0 && data[i - 1] > 0) {
        returns.push(Math.log(data[i] / data[i - 1]));
      }
    }

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const stdDev = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length
    );

    // CUSUM 算法
    let posSum = 0;
    let negSum = 0;
    const k = 0.5 * stdDev; // 参考值
    const h = threshold * stdDev; // 决策区间

    let changePoint: number | undefined;
    const anomalies: AnomalyData[] = [];

    for (let i = 0; i < returns.length; i++) {
      const x = returns[i] - mean;

      posSum = Math.max(0, posSum + x - k);
      negSum = Math.max(0, negSum - x - k);

      if (posSum > h || negSum > h) {
        changePoint = i + 1;

        // 确定趋势方向
        const direction = posSum > h ? 'up' : 'down';

        // 计算趋势强度
        const recentData = data.slice(Math.max(0, changePoint - 10), changePoint + 10);
        const trendSlope = calculateTrendSlope(recentData);
        const strength = Math.min(Math.abs(trendSlope) * 100, 100);

        anomalies.push({
          id: `trend-${changePoint}-${timestamps[changePoint]}-${Date.now()}`,
          type: 'trend_break',
          level: strength > 70 ? 'high' : strength > 40 ? 'medium' : 'low',
          title: 'trend_break_detected',
          description: `Trend changed to ${direction} with ${strength.toFixed(1)}% strength`,
          timestamp: timestamps[changePoint],
          value: data[changePoint],
          expectedValue: data[changePoint - 1],
          deviation: Math.abs(trendSlope),
          duration: 0,
          acknowledged: false,
        });

        // 使用衰减而不是重置，避免漏检连续的变化
        // 衰减因子 0.5 允许检测到连续的趋势变化
        posSum *= 0.5;
        negSum *= 0.5;
      }
    }

    // 计算整体趋势
    const recentReturns = returns.slice(-20);
    const recentMean = recentReturns.reduce((sum, r) => sum + r, 0) / recentReturns.length;

    let direction: 'up' | 'down' | 'flat';
    if (recentMean > 0.001) direction = 'up';
    else if (recentMean < -0.001) direction = 'down';
    else direction = 'flat';

    const trend: TrendResult = {
      direction,
      strength: Math.min(Math.abs(recentMean) * 1000, 100),
      changePoint,
      confidence: changePoint ? 0.85 : 0.7,
    };

    logger.debug(`Trend detection: direction=${direction}, anomalies=${anomalies.length}`);

    return { trend, anomalies };
  } catch (error) {
    logger.error(
      'Failed to detect trend break',
      error instanceof Error ? error : new Error(String(error))
    );
    return {
      trend: { direction: 'flat', strength: 0, confidence: 0 },
      anomalies: [],
    };
  }
}

/**
 * 计算趋势斜率 (简单线性回归)
 */
function calculateTrendSlope(data: number[]): number {
  const n = data.length;
  const xMean = (n - 1) / 2;
  const yMean = data.reduce((sum, y) => sum + y, 0) / n;

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (data[i] - yMean);
    denominator += Math.pow(i - xMean, 2);
  }

  return denominator !== 0 ? numerator / denominator : 0;
}

/**
 * 检测波动率异常
 * 使用 Parkinson 波动率估计和 GARCH(1,1) 风格的波动率聚类检测
 * 参考: Parkinson (1980) - The Extreme Value Method
 *
 * @param prices 价格历史
 * @param timestamps 时间戳数组
 * @param window 滚动窗口大小
 * @returns 异常数据数组
 */
export function detectVolatilityAnomalies(
  prices: number[],
  timestamps: number[],
  window: number = 20
): AnomalyData[] {
  try {
    if (prices.length < window * 2) {
      return [];
    }

    // 计算 Parkinson 波动率 (使用 High-Low 范围更准确地估计波动率)
    const parkinsonVol: number[] = [];

    for (let i = window; i < prices.length; i++) {
      const windowPrices = prices.slice(i - window, i);

      // 计算价格范围波动率
      const highs: number[] = [];
      const lows: number[] = [];

      for (let j = 1; j < windowPrices.length; j++) {
        const prevPrice = windowPrices[j - 1];
        const currPrice = windowPrices[j];
        // 使用前后价格作为高低点估计
        highs.push(Math.max(prevPrice, currPrice));
        lows.push(Math.min(prevPrice, currPrice));
      }

      // Parkinson 波动率公式: σ² = (1/4Nln2) * Σ[ln(Hi/Li)]²
      let sumSquaredLogRange = 0;
      for (let j = 0; j < highs.length; j++) {
        if (lows[j] > 0) {
          const logRange = Math.log(highs[j] / lows[j]);
          sumSquaredLogRange += logRange * logRange;
        }
      }

      const n = highs.length;
      const parkinsonVariance = sumSquaredLogRange / (4 * n * Math.log(2));
      const annualizedVol = Math.sqrt(parkinsonVariance) * Math.sqrt(365 * 24 * 12) * 100; // 年化，假设5分钟数据
      parkinsonVol.push(annualizedVol);
    }

    if (parkinsonVol.length < 10) return [];

    // 使用 GARCH(1,1) 风格的波动率预测
    const omega = 0.000001;
    const alpha = 0.1;
    const beta = 0.85;

    const garchVol: number[] = [];
    let lastVar = (parkinsonVol[0] * parkinsonVol[0]) / 10000; // 初始方差

    for (let i = 0; i < parkinsonVol.length; i++) {
      const currentVol = parkinsonVol[i];
      const currentVar = (currentVol * currentVol) / 10000;

      // GARCH(1,1): σ²_t = ω + α * ε²_{t-1} + β * σ²_{t-1}
      const predictedVar = omega + alpha * currentVar + beta * lastVar;
      const predictedVol = Math.sqrt(predictedVar) * 100;

      garchVol.push(predictedVol);
      lastVar = predictedVar;
    }

    // 检测实际波动率与预测波动率的偏离
    const anomalies: AnomalyData[] = [];

    for (let i = window; i < parkinsonVol.length; i++) {
      const actualVol = parkinsonVol[i];
      const predictedVol = garchVol[i - 1]; // 使用前一期预测

      if (predictedVol > 0) {
        const volRatio = actualVol / predictedVol;
        const deviation = Math.abs(volRatio - 1);

        // 波动率突破阈值
        if (volRatio > 1.5 || volRatio < 0.5) {
          const priceIndex = i + window;
          let level: AnomalyLevel;

          if (volRatio > 3 || volRatio < 0.33) level = 'critical';
          else if (volRatio > 2 || volRatio < 0.5) level = 'high';
          else if (volRatio > 1.5 || volRatio < 0.67) level = 'medium';
          else level = 'low';

          // 去重检查
          const isDuplicate = anomalies.some(
            (a) => Math.abs(a.timestamp - timestamps[priceIndex]) < 300000 // 5分钟内不重复
          );

          if (!isDuplicate) {
            anomalies.push({
              id: `volatility-${timestamps[priceIndex]}-${Date.now()}`,
              type: 'volatility_spike',
              level,
              title: volRatio > 1 ? 'volatility_spike_detected' : 'volatility_drop_detected',
              description: `Volatility ${volRatio > 1 ? 'spiked' : 'dropped'} to ${actualVol.toFixed(1)}% (expected: ${predictedVol.toFixed(1)}%, ratio: ${volRatio.toFixed(2)})`,
              timestamp: timestamps[priceIndex],
              value: actualVol,
              expectedValue: predictedVol,
              deviation: volRatio,
              duration: window,
              acknowledged: false,
            });
          }
        }
      }
    }

    logger.debug(`Detected ${anomalies.length} volatility anomalies`);
    return anomalies;
  } catch (error) {
    logger.error(
      'Failed to detect volatility anomalies',
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}

/**
 * 检测成交量异常
 *
 * @param volumes 成交量历史
 * @param timestamps 时间戳数组
 * @returns 异常数据数组
 */
export function detectVolumeAnomalies(volumes: number[], timestamps: number[]): AnomalyData[] {
  try {
    if (volumes.length < 10) {
      return [];
    }

    const stdDevResult = calculateStdDevDetection(volumes, 2.5);
    const anomalies: AnomalyData[] = [];

    stdDevResult.anomalies.forEach((anomaly) => {
      let level: AnomalyLevel;

      if (anomaly.deviation > 5) level = 'critical';
      else if (anomaly.deviation > 4) level = 'high';
      else if (anomaly.deviation > 3) level = 'medium';
      else level = 'low';

      anomalies.push({
        id: `volume-${timestamps[anomaly.index]}-${Date.now()}`,
        type: 'volume_anomaly',
        level,
        title: anomaly.isUpper ? 'volume_spike_detected' : 'volume_drop_detected',
        description: `Volume ${anomaly.isUpper ? 'spiked' : 'dropped'} to ${anomaly.value.toFixed(0)}`,
        timestamp: timestamps[anomaly.index],
        value: anomaly.value,
        expectedValue: stdDevResult.mean,
        deviation: anomaly.deviation,
        duration: 0,
        acknowledged: false,
      });
    });

    logger.debug(`Detected ${anomalies.length} volume anomalies`);
    return anomalies;
  } catch (error) {
    logger.error(
      'Failed to detect volume anomalies',
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}

/**
 * 执行完整异常检测
 *
 * @param data 市场数据
 * @returns 所有检测到的异常
 */
export function detectAllAnomalies(data: {
  prices: number[];
  timestamps: number[];
  volumes?: number[];
  asset?: string;
}): AnomalyData[] {
  try {
    const { prices, timestamps, volumes, asset = 'Unknown' } = data;

    const allAnomalies: AnomalyData[] = [];

    // 价格异常检测
    const priceAnomalies = detectPriceAnomalies(prices, timestamps, asset);
    allAnomalies.push(...priceAnomalies);

    // 趋势突变检测
    const { anomalies: trendAnomalies } = detectTrendBreak(prices, timestamps);
    allAnomalies.push(...trendAnomalies);

    // 波动率异常检测
    const volatilityAnomalies = detectVolatilityAnomalies(prices, timestamps);
    allAnomalies.push(...volatilityAnomalies);

    // 成交量异常检测
    if (volumes && volumes.length > 0) {
      const volumeAnomalies = detectVolumeAnomalies(volumes, timestamps);
      allAnomalies.push(...volumeAnomalies);
    }

    // 按时间戳排序
    allAnomalies.sort((a, b) => b.timestamp - a.timestamp);

    logger.info(`Total anomalies detected: ${allAnomalies.length}`);
    return allAnomalies;
  } catch (error) {
    logger.error(
      'Failed to detect all anomalies',
      error instanceof Error ? error : new Error(String(error))
    );
    return [];
  }
}

/**
 * 获取异常等级颜色
 *
 * @param level 异常等级
 * @returns 颜色代码
 */
export function getAnomalyLevelColor(level: AnomalyLevel): string {
  const colors: Record<AnomalyLevel, string> = {
    low: chartColors.recharts.primary,
    medium: semanticColors.warning.DEFAULT,
    high: semanticColors.danger.DEFAULT,
    critical: chartColors.oracle['pyth'],
  };
  return colors[level];
}

/**
 * 获取异常类型图标
 *
 * @param type 异常类型
 * @returns 图标名称
 */
export function getAnomalyIcon(type: AnomalyType): string {
  const icons: Record<AnomalyType, string> = {
    price_spike: 'TrendingUp',
    price_drop: 'TrendingDown',
    volatility_spike: 'Activity',
    trend_break: 'GitBranch',
    volume_anomaly: 'BarChart3',
    correlation_break: 'Unlink',
  };
  return icons[type];
}

/**
 * 获取异常类型文本
 *
 * @param type 异常类型
 * @returns 本地化文本键
 */
export function getAnomalyTypeText(type: AnomalyType): string {
  const texts: Record<AnomalyType, string> = {
    price_spike: 'anomaly_price_spike',
    price_drop: 'anomaly_price_drop',
    volatility_spike: 'anomaly_volatility_spike',
    trend_break: 'anomaly_trend_break',
    volume_anomaly: 'anomaly_volume',
    correlation_break: 'anomaly_correlation_break',
  };
  return texts[type];
}

/**
 * 过滤未确认的异常
 *
 * @param anomalies 异常数组
 * @returns 未确认的异常
 */
export function getUnacknowledgedAnomalies(anomalies: AnomalyData[]): AnomalyData[] {
  return anomalies.filter((a) => !a.acknowledged);
}

/**
 * 按等级统计异常数量
 *
 * @param anomalies 异常数组
 * @returns 各等级数量
 */
export function countAnomaliesByLevel(anomalies: AnomalyData[]): Record<AnomalyLevel, number> {
  return anomalies.reduce(
    (acc, anomaly) => {
      acc[anomaly.level] = (acc[anomaly.level] || 0) + 1;
      return acc;
    },
    {} as Record<AnomalyLevel, number>
  );
}
