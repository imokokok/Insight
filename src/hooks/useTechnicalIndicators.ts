'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';

import {
  calculateSMA,
  calculateBollingerBands,
  calculateRSI,
  calculateMACD,
} from '@/lib/indicators';
import type {
  BollingerBandsConfig,
  RSIConfig,
  MACDConfig,
  MAConfig,
  IndicatorSettings,
} from '@/lib/indicators';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('useTechnicalIndicators');

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

export type { BollingerBandsConfig, RSIConfig, MACDConfig, MAConfig, IndicatorSettings };

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

function calculateAllIndicators(
  data: IndicatorDataPoint[],
  settings: IndicatorSettings
): IndicatorDataPoint[] {
  if (data.length === 0) return data;

  const prices = data.map((d) => d.price);
  let result = [...data];

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

  if (settings.showRSI) {
    const rsi = calculateRSI(prices, settings.rsi.period);
    result = result.map((point, index) => ({ ...point, rsi: rsi[index] }));
  }

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

function saveSettings(settings: IndicatorSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    logger.warn('Failed to save indicator settings', e instanceof Error ? e : new Error(String(e)));
  }
}

export interface UseTechnicalIndicatorsOptions {
  isMobile?: boolean;
  persistSettings?: boolean;
  onSettingsChange?: (settings: IndicatorSettings) => void;
}

export interface UseTechnicalIndicatorsReturn {
  settings: IndicatorSettings;
  updateSettings: (updates: Partial<IndicatorSettings>) => void;
  resetSettings: () => void;
  calculateIndicators: (data: IndicatorDataPoint[]) => IndicatorDataPoint[];
  isLoaded: boolean;
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

export function useTechnicalIndicators(
  options: UseTechnicalIndicatorsOptions = {}
): UseTechnicalIndicatorsReturn {
  const { isMobile = false, persistSettings = true, onSettingsChange } = options;

  const [settings, setSettings] = useState<IndicatorSettings>(
    isMobile ? MOBILE_DEFAULT_SETTINGS : DEFAULT_SETTINGS
  );
  const [isLoaded, setIsLoaded] = useState(false);
  const prevMobileRef = useRef(isMobile);

  useEffect(() => {
    if (persistSettings) {
      const saved = loadSettings();
      if (saved) {
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

  useEffect(() => {
    if (prevMobileRef.current !== isMobile) {
      prevMobileRef.current = isMobile;
      if (isMobile) {
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

  const resetSettings = useCallback(() => {
    const defaultSettings = isMobile ? MOBILE_DEFAULT_SETTINGS : DEFAULT_SETTINGS;
    setSettings(defaultSettings);
    if (persistSettings) {
      saveSettings(defaultSettings);
    }
    onSettingsChange?.(defaultSettings);
  }, [isMobile, persistSettings, onSettingsChange]);

  const calculateIndicators = useCallback(
    (data: IndicatorDataPoint[]): IndicatorDataPoint[] => {
      return calculateAllIndicators(data, settings);
    },
    [settings]
  );

  const toggleMA7 = useCallback(
    () => updateSettings({ showMA7: !settings.showMA7 }),
    [settings.showMA7, updateSettings]
  );
  const toggleMA14 = useCallback(
    () => updateSettings({ showMA14: !settings.showMA14 }),
    [settings.showMA14, updateSettings]
  );
  const toggleMA30 = useCallback(
    () => updateSettings({ showMA30: !settings.showMA30 }),
    [settings.showMA30, updateSettings]
  );
  const toggleMA60 = useCallback(
    () => updateSettings({ showMA60: !settings.showMA60 }),
    [settings.showMA60, updateSettings]
  );
  const toggleMA20 = useCallback(
    () => updateSettings({ showMA20: !settings.showMA20 }),
    [settings.showMA20, updateSettings]
  );
  const toggleBollingerBands = useCallback(
    () => updateSettings({ showBollingerBands: !settings.showBollingerBands }),
    [settings.showBollingerBands, updateSettings]
  );
  const toggleRSI = useCallback(
    () => updateSettings({ showRSI: !settings.showRSI }),
    [settings.showRSI, updateSettings]
  );
  const toggleMACD = useCallback(
    () => updateSettings({ showMACD: !settings.showMACD }),
    [settings.showMACD, updateSettings]
  );
  const toggleVolume = useCallback(
    () => updateSettings({ showVolume: !settings.showVolume }),
    [settings.showVolume, updateSettings]
  );

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

export interface BatchIndicatorOptions {
  chunkSize?: number;
  onProgress?: (progress: number) => void;
}

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

          const processedChunk = calculateAllIndicators(chunk, settings);

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
