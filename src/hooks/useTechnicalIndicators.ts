'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('useTechnicalIndicators');

// 技术指标数据点
export interface IndicatorDataPoint {
  time: string;
  timestamp: number;
  price: number;
  volume: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  ma7?: number;
  ma14?: number;
  ma30?: number;
  ma60?: number;
  ma20?: number;
  bbUpper?: number;
  bbMiddle?: number;
  bbLower?: number;
  rsi?: number;
  macd?: number;
  macdSignal?: number;
  macdHistogram?: number;
  [key: string]: unknown;
}

// 布林带配置
export interface BollingerBandsConfig {
  period: number;
  multiplier: number;
}

// RSI配置
export interface RSIConfig {
  period: number;
  overbought: number;
  oversold: number;
}

// MACD配置
export interface MACDConfig {
  fastPeriod: number;
  slowPeriod: number;
  signalPeriod: number;
}

// 移动平均线配置
export interface MAConfig {
  enabled: boolean;
  period: number;
  color: string;
}

// 指标设置
export interface IndicatorSettings {
  showMA7: boolean;
  showMA14: boolean;
  showMA30: boolean;
  showMA60: boolean;
  showMA20: boolean;
  showBollingerBands: boolean;
  showRSI: boolean;
  showMACD: boolean;
  showVolume: boolean;
  bollingerBands: BollingerBandsConfig;
  rsi: RSIConfig;
  macd: MACDConfig;
}

// 默认设置
const DEFAULT_SETTINGS: IndicatorSettings = {
  showMA7: true,
  showMA14: false,
  showMA30: false,
  showMA60: false,
  showMA20: false,
  showBollingerBands: false,
  showRSI: false,
  showMACD: false,
  showVolume: true,
  bollingerBands: {
    period: 20,
    multiplier: 2,
  },
  rsi: {
    period: 14,
    overbought: 70,
    oversold: 30,
  },
  macd: {
    fastPeriod: 12,
    slowPeriod: 26,
    signalPeriod: 9,
  },
};

// 移动端默认设置（简化）
const MOBILE_DEFAULT_SETTINGS: IndicatorSettings = {
  ...DEFAULT_SETTINGS,
  showMA7: true,
  showMA14: false,
  showMA30: false,
  showMA60: false,
  showMA20: false,
  showBollingerBands: false,
  showRSI: false,
  showMACD: false,
  showVolume: false,
};

const SETTINGS_STORAGE_KEY = 'technicalIndicators_settings';

// 计算简单移动平均线 (SMA)
function calculateSMA(prices: number[], period: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      result.push(prices[i]);
    } else {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / period);
    }
  }
  return result;
}

// 计算指数移动平均线 (EMA)
function calculateEMA(prices: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const ema: number[] = [];
  let prevEma = prices[0];

  for (let i = 0; i < prices.length; i++) {
    if (i === 0) {
      ema.push(prices[i]);
    } else {
      prevEma = prices[i] * k + prevEma * (1 - k);
      ema.push(prevEma);
    }
  }
  return ema;
}

// 计算布林带
function calculateBollingerBands(
  prices: number[],
  period: number = 20,
  multiplier: number = 2
): { upper: number[]; middle: number[]; lower: number[] } {
  const middle = calculateSMA(prices, period);
  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      upper.push(prices[i]);
      lower.push(prices[i]);
    } else {
      const slice = prices.slice(i - period + 1, i + 1);
      const mean = middle[i];
      const squaredDiffs = slice.map((p) => Math.pow(p - mean, 2));
      const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / period;
      const stdDev = Math.sqrt(variance);

      upper.push(mean + multiplier * stdDev);
      lower.push(mean - multiplier * stdDev);
    }
  }

  return { upper, middle, lower };
}

// 计算RSI
function calculateRSI(prices: number[], period: number = 14): number[] {
  const rsi: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];

  // 计算价格变化
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }

  // 计算初始平均增益和损失
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

  // 前 period 个数据点没有 RSI
  for (let i = 0; i < period; i++) {
    rsi.push(50);
  }

  // 计算第一个 RSI
  if (avgLoss === 0) {
    rsi.push(100);
  } else {
    const rs = avgGain / avgLoss;
    rsi.push(100 - 100 / (1 + rs));
  }

  // 使用平滑方法计算后续 RSI
  for (let i = period + 1; i < prices.length; i++) {
    const gainIndex = i - 1;
    const gain = gains[gainIndex] || 0;
    const loss = losses[gainIndex] || 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - 100 / (1 + rs));
    }
  }

  return rsi;
}

// 计算MACD
function calculateMACD(
  prices: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): { macd: number[]; signal: number[]; histogram: number[] } {
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);

  // MACD 线 = 快线 EMA - 慢线 EMA
  const macdLine: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    macdLine.push(fastEMA[i] - slowEMA[i]);
  }

  // 信号线 = MACD 的 EMA
  const signalLine = calculateEMA(macdLine, signalPeriod);

  // 柱状图 = MACD - 信号线
  const histogram: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    histogram.push(macdLine[i] - signalLine[i]);
  }

  return { macd: macdLine, signal: signalLine, histogram };
}

// 计算所有指标
function calculateAllIndicators(
  data: IndicatorDataPoint[],
  settings: IndicatorSettings
): IndicatorDataPoint[] {
  if (data.length === 0) return data;

  const prices = data.map((d) => d.price);
  let result = [...data];

  // 计算移动平均线
  if (settings.showMA7) {
    const ma7 = calculateSMA(prices, 7);
    result = result.map((point, index) => ({ ...point, ma7: ma7[index] }));
  }

  if (settings.showMA14) {
    const ma14 = calculateSMA(prices, 14);
    result = result.map((point, index) => ({ ...point, ma14: ma14[index] }));
  }

  if (settings.showMA30) {
    const ma30 = calculateSMA(prices, 30);
    result = result.map((point, index) => ({ ...point, ma30: ma30[index] }));
  }

  if (settings.showMA60) {
    const ma60 = calculateSMA(prices, 60);
    result = result.map((point, index) => ({ ...point, ma60: ma60[index] }));
  }

  if (settings.showMA20) {
    const ma20 = calculateSMA(prices, 20);
    result = result.map((point, index) => ({ ...point, ma20: ma20[index] }));
  }

  // 计算布林带
  if (settings.showBollingerBands) {
    const bb = calculateBollingerBands(
      prices,
      settings.bollingerBands.period,
      settings.bollingerBands.multiplier
    );
    result = result.map((point, index) => ({
      ...point,
      bbUpper: bb.upper[index],
      bbMiddle: bb.middle[index],
      bbLower: bb.lower[index],
    }));
  }

  // 计算RSI
  if (settings.showRSI) {
    const rsi = calculateRSI(prices, settings.rsi.period);
    result = result.map((point, index) => ({ ...point, rsi: rsi[index] }));
  }

  // 计算MACD
  if (settings.showMACD) {
    const macd = calculateMACD(
      prices,
      settings.macd.fastPeriod,
      settings.macd.slowPeriod,
      settings.macd.signalPeriod
    );
    result = result.map((point, index) => ({
      ...point,
      macd: macd.macd[index],
      macdSignal: macd.signal[index],
      macdHistogram: macd.histogram[index],
    }));
  }

  return result;
}

// 从localStorage加载设置
function loadSettings(): IndicatorSettings | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    logger.warn('Failed to load indicator settings', e instanceof Error ? e : new Error(String(e)));
  }
  return null;
}

// 保存设置到localStorage
function saveSettings(settings: IndicatorSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    logger.warn('Failed to save indicator settings', e instanceof Error ? e : new Error(String(e)));
  }
}

// Hook选项
export interface UseTechnicalIndicatorsOptions {
  isMobile?: boolean;
  persistSettings?: boolean;
  onSettingsChange?: (settings: IndicatorSettings) => void;
}

// Hook返回值
export interface UseTechnicalIndicatorsReturn {
  settings: IndicatorSettings;
  updateSettings: (updates: Partial<IndicatorSettings>) => void;
  resetSettings: () => void;
  calculateIndicators: (data: IndicatorDataPoint[]) => IndicatorDataPoint[];
  isLoaded: boolean;
  // 便捷访问
  showMA7: boolean;
  showMA14: boolean;
  showMA30: boolean;
  showMA60: boolean;
  showMA20: boolean;
  showBollingerBands: boolean;
  showRSI: boolean;
  showMACD: boolean;
  showVolume: boolean;
  // 指标配置
  bollingerBands: BollingerBandsConfig;
  rsi: RSIConfig;
  macd: MACDConfig;
  // 切换方法
  toggleMA7: () => void;
  toggleMA14: () => void;
  toggleMA30: () => void;
  toggleMA60: () => void;
  toggleMA20: () => void;
  toggleBollingerBands: () => void;
  toggleRSI: () => void;
  toggleMACD: () => void;
  toggleVolume: () => void;
}

/**
 * 技术指标 Hook
 * - 管理技术指标设置
 * - 计算技术指标
 * - 支持移动端默认简化显示
 * - 支持设置持久化
 */
export function useTechnicalIndicators(
  options: UseTechnicalIndicatorsOptions = {}
): UseTechnicalIndicatorsReturn {
  const { isMobile = false, persistSettings = true, onSettingsChange } = options;

  const [settings, setSettings] = useState<IndicatorSettings>(
    isMobile ? MOBILE_DEFAULT_SETTINGS : DEFAULT_SETTINGS
  );
  const [isLoaded, setIsLoaded] = useState(false);
  const prevMobileRef = useRef(isMobile);

  // 加载保存的设置
  useEffect(() => {
    if (persistSettings) {
      const saved = loadSettings();
      if (saved) {
        // 移动端只恢复部分设置，保持简洁
        if (isMobile) {
          setSettings({
            ...MOBILE_DEFAULT_SETTINGS,
            ...saved,
            showMA14: false,
            showMA30: false,
            showMA60: false,
            showMA20: false,
            showBollingerBands: false,
            showRSI: false,
            showMACD: false,
            showVolume: false,
          });
        } else {
          setSettings((prev) => ({ ...prev, ...saved }));
        }
      }
    }
    setIsLoaded(true);
  }, [persistSettings, isMobile]);

  // 监听移动端变化
  useEffect(() => {
    if (prevMobileRef.current !== isMobile) {
      prevMobileRef.current = isMobile;
      if (isMobile) {
        // 切换到移动端时简化显示
        setSettings((prev) => ({
          ...prev,
          showMA7: true,
          showMA14: false,
          showMA30: false,
          showMA60: false,
          showMA20: false,
          showBollingerBands: false,
          showRSI: false,
          showMACD: false,
          showVolume: false,
        }));
      }
    }
  }, [isMobile]);

  // 更新设置
  const updateSettings = useCallback(
    (updates: Partial<IndicatorSettings>) => {
      setSettings((prev) => {
        const newSettings = { ...prev, ...updates };
        if (persistSettings) {
          saveSettings(newSettings);
        }
        onSettingsChange?.(newSettings);
        return newSettings;
      });
    },
    [persistSettings, onSettingsChange]
  );

  // 重置设置
  const resetSettings = useCallback(() => {
    const defaultSettings = isMobile ? MOBILE_DEFAULT_SETTINGS : DEFAULT_SETTINGS;
    setSettings(defaultSettings);
    if (persistSettings) {
      saveSettings(defaultSettings);
    }
    onSettingsChange?.(defaultSettings);
  }, [isMobile, persistSettings, onSettingsChange]);

  // 计算指标（使用useMemo缓存）
  const calculateIndicators = useCallback(
    (data: IndicatorDataPoint[]): IndicatorDataPoint[] => {
      return calculateAllIndicators(data, settings);
    },
    [settings]
  );

  // 切换方法
  const toggleMA7 = useCallback(() => updateSettings({ showMA7: !settings.showMA7 }), [settings.showMA7, updateSettings]);
  const toggleMA14 = useCallback(() => updateSettings({ showMA14: !settings.showMA14 }), [settings.showMA14, updateSettings]);
  const toggleMA30 = useCallback(() => updateSettings({ showMA30: !settings.showMA30 }), [settings.showMA30, updateSettings]);
  const toggleMA60 = useCallback(() => updateSettings({ showMA60: !settings.showMA60 }), [settings.showMA60, updateSettings]);
  const toggleMA20 = useCallback(() => updateSettings({ showMA20: !settings.showMA20 }), [settings.showMA20, updateSettings]);
  const toggleBollingerBands = useCallback(() => updateSettings({ showBollingerBands: !settings.showBollingerBands }), [settings.showBollingerBands, updateSettings]);
  const toggleRSI = useCallback(() => updateSettings({ showRSI: !settings.showRSI }), [settings.showRSI, updateSettings]);
  const toggleMACD = useCallback(() => updateSettings({ showMACD: !settings.showMACD }), [settings.showMACD, updateSettings]);
  const toggleVolume = useCallback(() => updateSettings({ showVolume: !settings.showVolume }), [settings.showVolume, updateSettings]);

  return useMemo(
    () => ({
      settings,
      updateSettings,
      resetSettings,
      calculateIndicators,
      isLoaded,
      showMA7: settings.showMA7,
      showMA14: settings.showMA14,
      showMA30: settings.showMA30,
      showMA60: settings.showMA60,
      showMA20: settings.showMA20,
      showBollingerBands: settings.showBollingerBands,
      showRSI: settings.showRSI,
      showMACD: settings.showMACD,
      showVolume: settings.showVolume,
      bollingerBands: settings.bollingerBands,
      rsi: settings.rsi,
      macd: settings.macd,
      toggleMA7,
      toggleMA14,
      toggleMA30,
      toggleMA60,
      toggleMA20,
      toggleBollingerBands,
      toggleRSI,
      toggleMACD,
      toggleVolume,
    }),
    [
      settings,
      updateSettings,
      resetSettings,
      calculateIndicators,
      isLoaded,
      toggleMA7,
      toggleMA14,
      toggleMA30,
      toggleMA60,
      toggleMA20,
      toggleBollingerBands,
      toggleRSI,
      toggleMACD,
      toggleVolume,
    ]
  );
}

// 批量计算指标（用于大数据集）
export interface BatchIndicatorOptions {
  chunkSize?: number;
  onProgress?: (progress: number) => void;
}

/**
 * 批量计算指标
 * 使用 requestAnimationFrame 避免阻塞主线程
 */
export function useBatchTechnicalIndicators(options: BatchIndicatorOptions = {}) {
  const { chunkSize = 1000, onProgress } = options;
  const [isCalculating, setIsCalculating] = useState(false);
  const [progress, setProgress] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const calculateBatch = useCallback(
    async (
      data: IndicatorDataPoint[],
      settings: IndicatorSettings
    ): Promise<IndicatorDataPoint[]> => {
      if (data.length === 0) return data;

      abortControllerRef.current = new AbortController();
      setIsCalculating(true);
      setProgress(0);

      return new Promise((resolve, reject) => {
        const results: IndicatorDataPoint[] = [];
        let index = 0;

        const processChunk = () => {
          if (abortControllerRef.current?.signal.aborted) {
            reject(new Error('Calculation aborted'));
            return;
          }

          const endIndex = Math.min(index + chunkSize, data.length);
          const chunk = data.slice(0, endIndex);

          // 计算当前块的指标
          const processedChunk = calculateAllIndicators(chunk, settings);

          // 更新结果
          results.length = 0;
          results.push(...processedChunk);

          index = endIndex;
          const currentProgress = Math.round((index / data.length) * 100);
          setProgress(currentProgress);
          onProgress?.(currentProgress);

          if (index < data.length) {
            requestAnimationFrame(processChunk);
          } else {
            setIsCalculating(false);
            resolve(results);
          }
        };

        requestAnimationFrame(processChunk);
      });
    },
    [chunkSize, onProgress]
  );

  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsCalculating(false);
  }, []);

  useEffect(() => {
    return () => {
      abort();
    };
  }, [abort]);

  return { calculateBatch, isCalculating, progress, abort };
}

export default useTechnicalIndicators;
