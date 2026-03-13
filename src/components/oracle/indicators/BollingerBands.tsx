'use client';

import { useMemo } from 'react';

// ============ 类型定义 ============

export interface PriceDataPoint {
  price: number;
  timestamp: number;
}

export interface BollingerBandsProps {
  data: PriceDataPoint[];
  period?: number; // 默认20
  multiplier?: number; // 默认2
}

export type SignalType = 'touch_upper' | 'touch_lower' | 'breakout_upper' | 'breakout_lower';

export interface BollingerBandsResult {
  upper: number[];
  middle: number[];
  lower: number[];
  bandwidth: number[]; // 带宽 = (上轨-下轨)/中轨
  signals: Array<{
    index: number;
    type: SignalType;
  }>;
}

export interface BollingerBandsDataPoint {
  timestamp: number;
  price: number;
  upper: number;
  middle: number;
  lower: number;
  bandwidth: number;
  bandwidthPercent: number;
  position: number; // 价格在布林带中的位置 (-1 到 1 为正常区间)
  squeeze: boolean; // 是否处于挤压状态
  signal?: SignalType;
}

// ============ 计算函数 ============

/**
 * 计算简单移动平均 (SMA)
 * @param prices 价格数组
 * @param period 周期
 * @returns SMA数组，前period-1个为NaN
 */
export function calculateSMA(prices: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      sma.push(NaN);
    } else {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
  }
  return sma;
}

/**
 * 计算标准差
 * @param prices 价格数组
 * @param period 周期
 * @returns 标准差数组，前period-1个为NaN
 */
export function calculateStdDev(prices: number[], period: number): number[] {
  const stdDev: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      stdDev.push(NaN);
    } else {
      const slice = prices.slice(i - period + 1, i + 1);
      const mean = slice.reduce((a, b) => a + b, 0) / period;
      const squaredDiffs = slice.map((p) => Math.pow(p - mean, 2));
      const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
      stdDev.push(Math.sqrt(variance));
    }
  }
  return stdDev;
}

/**
 * 计算布林带
 * 中轨 = 20日简单移动平均(SMA20)
 * 标准差 = 20日收盘价标准差
 * 上轨 = 中轨 + (2 × 标准差)
 * 下轨 = 中轨 - (2 × 标准差)
 *
 * @param data 价格数据点数组
 * @param period 周期，默认20
 * @param multiplier 标准差倍数，默认2
 * @returns 布林带计算结果
 */
export function calculateBollingerBands(
  data: PriceDataPoint[],
  period: number = 20,
  multiplier: number = 2
): BollingerBandsResult {
  // 按时间戳排序
  const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);
  const prices = sortedData.map((d) => d.price);

  const sma = calculateSMA(prices, period);
  const stdDev = calculateStdDev(prices, period);

  const upper: number[] = [];
  const middle: number[] = [];
  const lower: number[] = [];
  const bandwidth: number[] = [];
  const signals: Array<{ index: number; type: SignalType }> = [];

  for (let i = 0; i < sortedData.length; i++) {
    const mid = sma[i];
    const sd = stdDev[i];
    const price = prices[i];

    if (isNaN(mid) || isNaN(sd)) {
      upper.push(NaN);
      middle.push(NaN);
      lower.push(NaN);
      bandwidth.push(NaN);
      continue;
    }

    const up = mid + sd * multiplier;
    const low = mid - sd * multiplier;
    const bw = (up - low) / mid;

    upper.push(up);
    middle.push(mid);
    lower.push(low);
    bandwidth.push(bw);

    // 检测信号：触及/突破轨道
    // 使用一个小误差范围来判断"触及"
    const touchThreshold = sd * 0.05; // 5%的标准差作为触及阈值

    if (price >= up) {
      // 突破或触及上轨
      if (price > up + touchThreshold) {
        signals.push({ index: i, type: 'breakout_upper' });
      } else {
        signals.push({ index: i, type: 'touch_upper' });
      }
    } else if (price <= low) {
      // 突破或触及下轨
      if (price < low - touchThreshold) {
        signals.push({ index: i, type: 'breakout_lower' });
      } else {
        signals.push({ index: i, type: 'touch_lower' });
      }
    }
  }

  return {
    upper,
    middle,
    lower,
    bandwidth,
    signals,
  };
}

/**
 * 计算详细的布林带数据点（包含更多分析信息）
 * @param data 价格数据点数组
 * @param period 周期，默认20
 * @param multiplier 标准差倍数，默认2
 * @returns 详细的布林带数据点数组
 */
export function calculateBollingerBandsDetailed(
  data: PriceDataPoint[],
  period: number = 20,
  multiplier: number = 2
): BollingerBandsDataPoint[] {
  const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);
  const prices = sortedData.map((d) => d.price);

  const sma = calculateSMA(prices, period);
  const stdDev = calculateStdDev(prices, period);

  const results: BollingerBandsDataPoint[] = [];
  let previousBandwidth = 0;

  for (let i = 0; i < sortedData.length; i++) {
    const mid = sma[i];
    const sd = stdDev[i];
    const price = prices[i];

    if (isNaN(mid) || isNaN(sd)) {
      results.push({
        timestamp: sortedData[i].timestamp,
        price,
        upper: NaN,
        middle: NaN,
        lower: NaN,
        bandwidth: NaN,
        bandwidthPercent: NaN,
        position: NaN,
        squeeze: false,
      });
      continue;
    }

    const up = mid + sd * multiplier;
    const low = mid - sd * multiplier;
    const bw = up - low;
    const bwPercent = mid > 0 ? (bw / mid) * 100 : 0;
    const position = sd > 0 ? (price - mid) / (sd * multiplier) : 0;

    // 挤压检测：带宽小于5%或比前一个带宽小20%
    const squeeze = bwPercent < 5 || (previousBandwidth > 0 && bw < previousBandwidth * 0.8);

    // 检测信号
    let signal: SignalType | undefined;
    const touchThreshold = sd * 0.05;

    if (price >= up) {
      signal = price > up + touchThreshold ? 'breakout_upper' : 'touch_upper';
    } else if (price <= low) {
      signal = price < low - touchThreshold ? 'breakout_lower' : 'touch_lower';
    }

    results.push({
      timestamp: sortedData[i].timestamp,
      price,
      upper: up,
      middle: mid,
      lower: low,
      bandwidth: bw,
      bandwidthPercent: bwPercent,
      position,
      squeeze,
      signal,
    });

    previousBandwidth = bw;
  }

  return results;
}

/**
 * 获取位置描述
 * @param position 位置系数
 * @returns 描述文本
 */
export function getPositionDescription(position: number): string {
  if (position > 1) return '超买区';
  if (position > 0.5) return '强势区';
  if (position > -0.5) return '中性区';
  if (position > -1) return '弱势区';
  return '超卖区';
}

/**
 * 获取位置颜色
 * @param position 位置系数
 * @returns 颜色代码
 */
export function getPositionColor(position: number): string {
  if (position > 1) return '#EF4444'; // 红色 - 超买
  if (position > 0.5) return '#F59E0B'; // 橙色 - 强势
  if (position > -0.5) return '#6B7280'; // 灰色 - 中性
  if (position > -1) return '#10B981'; // 绿色 - 弱势
  return '#059669'; // 深绿色 - 超卖
}

/**
 * 获取信号描述
 * @param signal 信号类型
 * @returns 描述文本
 */
export function getSignalDescription(signal: SignalType): string {
  switch (signal) {
    case 'touch_upper':
      return '触及上轨';
    case 'touch_lower':
      return '触及下轨';
    case 'breakout_upper':
      return '向上突破';
    case 'breakout_lower':
      return '向下突破';
    default:
      return '';
  }
}

/**
 * 获取信号颜色
 * @param signal 信号类型
 * @returns 颜色代码
 */
export function getSignalColor(signal: SignalType): string {
  switch (signal) {
    case 'touch_upper':
    case 'breakout_upper':
      return '#10B981'; // 绿色
    case 'touch_lower':
    case 'breakout_lower':
      return '#EF4444'; // 红色
    default:
      return '#6B7280';
  }
}

// ============ React Hook ============

/**
 * 使用布林带计算的自定义Hook
 * @param data 价格数据
 * @param period 周期
 * @param multiplier 标准差倍数
 * @returns 布林带计算结果
 */
export function useBollingerBands(
  data: PriceDataPoint[],
  period: number = 20,
  multiplier: number = 2
): BollingerBandsResult {
  return useMemo(
    () => calculateBollingerBands(data, period, multiplier),
    [data, period, multiplier]
  );
}

/**
 * 使用详细布林带计算的自定义Hook
 * @param data 价格数据
 * @param period 周期
 * @param multiplier 标准差倍数
 * @returns 详细布林带数据
 */
export function useBollingerBandsDetailed(
  data: PriceDataPoint[],
  period: number = 20,
  multiplier: number = 2
): BollingerBandsDataPoint[] {
  return useMemo(
    () => calculateBollingerBandsDetailed(data, period, multiplier),
    [data, period, multiplier]
  );
}

// ============ 默认导出 ============

export default {
  calculateBollingerBands,
  calculateBollingerBandsDetailed,
  calculateSMA,
  calculateStdDev,
  useBollingerBands,
  useBollingerBandsDetailed,
  getPositionDescription,
  getPositionColor,
  getSignalDescription,
  getSignalColor,
};
