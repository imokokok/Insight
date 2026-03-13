/**
 * 异常检测模块
 *
 * 提供基于统计学的异常检测功能：
 * - 基于标准差 (2σ) 的异常检测
 * - 趋势突变检测
 * - 价格异动预警
 */

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
 * 使用 2σ 原则：约 95% 的数据应落在 μ ± 2σ 范围内
 *
 * @param data 数据数组
 * @param threshold 标准差倍数阈值 (默认 2)
 * @returns 标准差检测结果
 */
export function calculateStdDevDetection(data: number[], threshold: number = 2): StdDevResult {
  try {
    if (data.length < 2) {
      throw new Error('Insufficient data for standard deviation calculation');
    }

    // 计算均值
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;

    // 计算标准差
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    const stdDev = Math.sqrt(variance);

    // 计算上下界
    const upperBound = mean + threshold * stdDev;
    const lowerBound = mean - threshold * stdDev;

    // 检测异常点
    const anomalies = data
      .map((value, index) => {
        const deviation = Math.abs(value - mean) / stdDev;
        if (deviation > threshold) {
          return {
            index,
            value,
            deviation,
            isUpper: value > mean,
          };
        }
        return null;
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    logger.debug(
      `StdDev detection: mean=${mean.toFixed(4)}, stdDev=${stdDev.toFixed(4)}, anomalies=${anomalies.length}`
    );

    return {
      mean,
      stdDev,
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
    if (prices.length < 10) {
      return [];
    }

    const anomalies: AnomalyData[] = [];

    // 计算收益率
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      const ret = ((prices[i] - prices[i - 1]) / prices[i - 1]) * 100;
      returns.push(ret);
    }

    // 使用 2σ 原则检测异常
    const stdDevResult = calculateStdDevDetection(returns, 2);

    stdDevResult.anomalies.forEach((anomaly) => {
      const index = anomaly.index + 1; // 收益率比价格少一个
      const priceChange = returns[anomaly.index];

      // 确定异常类型和等级
      let type: AnomalyType;
      let level: AnomalyLevel;

      if (priceChange > 0) {
        type = 'price_spike';
        if (anomaly.deviation > 4) level = 'critical';
        else if (anomaly.deviation > 3) level = 'high';
        else level = 'medium';
      } else {
        type = 'price_drop';
        if (anomaly.deviation > 4) level = 'critical';
        else if (anomaly.deviation > 3) level = 'high';
        else level = 'medium';
      }

      anomalies.push({
        id: `price-${asset}-${timestamps[index]}`,
        type,
        level,
        title: type === 'price_spike' ? 'price_spike_detected' : 'price_drop_detected',
        description: `${asset} ${type === 'price_spike' ? 'surged' : 'dropped'} ${Math.abs(priceChange).toFixed(2)}%`,
        timestamp: timestamps[index],
        asset,
        value: prices[index],
        expectedValue: prices[index - 1] * (1 + stdDevResult.mean / 100),
        deviation: anomaly.deviation,
        duration: 0,
        acknowledged: false,
      });
    });

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
      returns.push(Math.log(data[i] / data[i - 1]));
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
          id: `trend-${changePoint}-${timestamps[changePoint]}`,
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

        // 重置累积和
        posSum = 0;
        negSum = 0;
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
    if (prices.length < window + 1) {
      return [];
    }

    // 计算滚动波动率
    const volatilities: number[] = [];
    for (let i = window; i < prices.length; i++) {
      const windowPrices = prices.slice(i - window, i);
      const returns: number[] = [];
      for (let j = 1; j < windowPrices.length; j++) {
        returns.push(Math.log(windowPrices[j] / windowPrices[j - 1]));
      }
      const variance = returns.reduce((sum, r) => sum + r * r, 0) / returns.length;
      volatilities.push(Math.sqrt(variance) * Math.sqrt(365) * 100); // 年化波动率
    }

    // 检测异常波动率
    const stdDevResult = calculateStdDevDetection(volatilities, 2);
    const anomalies: AnomalyData[] = [];

    stdDevResult.anomalies.forEach((anomaly) => {
      const index = anomaly.index + window;
      let level: AnomalyLevel;

      if (anomaly.deviation > 4) level = 'critical';
      else if (anomaly.deviation > 3) level = 'high';
      else if (anomaly.deviation > 2.5) level = 'medium';
      else level = 'low';

      anomalies.push({
        id: `volatility-${timestamps[index]}`,
        type: 'volatility_spike',
        level,
        title: 'volatility_spike_detected',
        description: `Volatility spiked to ${anomaly.value.toFixed(2)}%`,
        timestamp: timestamps[index],
        value: anomaly.value,
        expectedValue: stdDevResult.mean,
        deviation: anomaly.deviation,
        duration: window,
        acknowledged: false,
      });
    });

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
        id: `volume-${timestamps[anomaly.index]}`,
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
    low: '#3B82F6', // 蓝色
    medium: '#F59E0B', // 黄色
    high: '#EF4444', // 红色
    critical: '#7C3AED', // 紫色
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
