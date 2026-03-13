/**
 * 技术指标计算 Hook
 */

import { useMemo, useCallback } from 'react';

export interface PriceData {
  price: number;
  timestamp: number;
}

// 简单移动平均 (SMA)
export function calculateSMA(prices: number[], period: number): number[] {
  const result: number[] = [];
  
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }
    
    const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    result.push(sum / period);
  }
  
  return result;
}

// 指数移动平均 (EMA)
export function calculateEMA(prices: number[], period: number): number[] {
  const result: number[] = [];
  const multiplier = 2 / (period + 1);
  
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      result.push(NaN);
      continue;
    }
    
    if (i === period - 1) {
      // 第一个EMA使用SMA
      const sum = prices.slice(0, period).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    } else {
      const ema = (prices[i] - result[i - 1]) * multiplier + result[i - 1];
      result.push(ema);
    }
  }
  
  return result;
}

// RSI (相对强弱指数)
export interface RSIData {
  rsi: number;
  avgGain: number;
  avgLoss: number;
}

export function calculateRSI(prices: number[], period: number = 14): RSIData[] {
  const result: RSIData[] = [];
  
  // 计算价格变化
  const changes: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }
  
  let avgGain = 0;
  let avgLoss = 0;
  
  for (let i = 0; i < prices.length; i++) {
    if (i === 0) {
      result.push({ rsi: NaN, avgGain: NaN, avgLoss: NaN });
      continue;
    }
    
    const change = changes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    
    if (i < period) {
      // 累积期
      avgGain += gain;
      avgLoss += loss;
      result.push({ rsi: NaN, avgGain: NaN, avgLoss: NaN });
    } else if (i === period) {
      // 第一个RSI
      avgGain = (avgGain + gain) / period;
      avgLoss = (avgLoss + loss) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));
      result.push({ rsi, avgGain, avgLoss });
    } else {
      // Wilder平滑
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsi = 100 - (100 / (1 + rs));
      result.push({ rsi, avgGain, avgLoss });
    }
  }
  
  return result;
}

// MACD
export interface MACDData {
  macd: number;
  signal: number;
  histogram: number;
}

export function calculateMACD(
  prices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACDData[] {
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);
  
  // 计算DIF (MACD线)
  const dif: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (isNaN(fastEMA[i]) || isNaN(slowEMA[i])) {
      dif.push(NaN);
    } else {
      dif.push(fastEMA[i] - slowEMA[i]);
    }
  }
  
  // 计算DEA (信号线)
  const dea = calculateEMA(dif.filter(v => !isNaN(v)), signalPeriod);
  
  // 补齐dea数组长度
  const fullDea: number[] = new Array(prices.length).fill(NaN);
  let deaIndex = dea.length - 1;
  for (let i = prices.length - 1; i >= 0 && deaIndex >= 0; i--) {
    if (!isNaN(dif[i])) {
      fullDea[i] = dea[deaIndex];
      deaIndex--;
    }
  }
  
  // 计算MACD柱状图
  const result: MACDData[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (isNaN(dif[i]) || isNaN(fullDea[i])) {
      result.push({ macd: NaN, signal: NaN, histogram: NaN });
    } else {
      result.push({
        macd: dif[i],
        signal: fullDea[i],
        histogram: (dif[i] - fullDea[i]) * 2,
      });
    }
  }
  
  return result;
}

// 布林带
export interface BollingerBandsData {
  upper: number;
  middle: number;
  lower: number;
  bandwidth: number;
}

export function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  multiplier: number = 2
): BollingerBandsData[] {
  const result: BollingerBandsData[] = [];
  
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      result.push({ upper: NaN, middle: NaN, lower: NaN, bandwidth: NaN });
      continue;
    }
    
    const slice = prices.slice(i - period + 1, i + 1);
    const middle = slice.reduce((a, b) => a + b, 0) / period;
    
    const squaredDiffs = slice.map(p => Math.pow(p - middle, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
    const stdDev = Math.sqrt(variance);
    
    const upper = middle + multiplier * stdDev;
    const lower = middle - multiplier * stdDev;
    const bandwidth = (upper - lower) / middle;
    
    result.push({ upper, middle, lower, bandwidth });
  }
  
  return result;
}

// 检测金叉/死叉
export interface MACDSignal {
  index: number;
  type: 'golden_cross' | 'death_cross';
  price: number;
}

export function detectMACDSignals(macdData: MACDData[]): MACDSignal[] {
  const signals: MACDSignal[] = [];
  
  for (let i = 1; i < macdData.length; i++) {
    const prev = macdData[i - 1];
    const curr = macdData[i];
    
    if (isNaN(prev.macd) || isNaN(curr.macd)) continue;
    
    // 金叉: DIF 上穿 DEA
    if (prev.macd < prev.signal && curr.macd > curr.signal) {
      signals.push({ index: i, type: 'golden_cross', price: curr.macd });
    }
    
    // 死叉: DIF 下穿 DEA
    if (prev.macd > prev.signal && curr.macd < curr.signal) {
      signals.push({ index: i, type: 'death_cross', price: curr.macd });
    }
  }
  
  return signals;
}

// Hook 封装
export function useTechnicalIndicators(data: PriceData[]) {
  const prices = useMemo(() => data.map(d => d.price), [data]);
  const timestamps = useMemo(() => data.map(d => d.timestamp), [data]);

  // 计算所有指标
  const indicators = useMemo(() => {
    return {
      sma7: calculateSMA(prices, 7),
      sma14: calculateSMA(prices, 14),
      sma20: calculateSMA(prices, 20),
      sma30: calculateSMA(prices, 30),
      ema12: calculateEMA(prices, 12),
      ema26: calculateEMA(prices, 26),
      rsi: calculateRSI(prices, 14),
      macd: calculateMACD(prices, 12, 26, 9),
      bollinger: calculateBollingerBands(prices, 20, 2),
    };
  }, [prices]);

  // MACD信号检测
  const macdSignals = useMemo(() => {
    return detectMACDSignals(indicators.macd);
  }, [indicators.macd]);

  // 获取指定时间范围的指标
  const getIndicatorsForRange = useCallback((
    startTime: number,
    endTime: number
  ) => {
    const startIndex = timestamps.findIndex(t => t >= startTime);
    const endIndex = timestamps.findIndex(t => t >= endTime);
    
    if (startIndex === -1 || endIndex === -1) return null;
    
    return {
      sma7: indicators.sma7.slice(startIndex, endIndex + 1),
      sma14: indicators.sma14.slice(startIndex, endIndex + 1),
      rsi: indicators.rsi.slice(startIndex, endIndex + 1),
      macd: indicators.macd.slice(startIndex, endIndex + 1),
      bollinger: indicators.bollinger.slice(startIndex, endIndex + 1),
    };
  }, [timestamps, indicators]);

  return {
    ...indicators,
    macdSignals,
    getIndicatorsForRange,
    dataLength: data.length,
  };
}

export default useTechnicalIndicators;
