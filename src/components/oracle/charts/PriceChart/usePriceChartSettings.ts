'use client';

import { useState, useEffect, useCallback } from 'react';

import {
  type ChartSettings,
  type ScreenSize,
  CHART_SETTINGS_STORAGE_KEY,
} from './priceChartConfig';
import { loadChartSettings, saveChartSettings } from './priceChartUtils';

const DEFAULT_CHART_SETTINGS: ChartSettings = {
  anomalyDetectionEnabled: true,
  showPredictionInterval: false,
  confidenceLevel: 95,
  comparisonEnabled: false,
};

export function useChartSettings() {
  const [settings, setSettings] = useState<ChartSettings>(DEFAULT_CHART_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = loadChartSettings(CHART_SETTINGS_STORAGE_KEY, null as ChartSettings | null);
    if (saved) {
      setSettings((prev) => ({ ...prev, ...saved }));
    }
    setIsLoaded(true);
  }, []);

  const updateSettings = useCallback((updates: Partial<ChartSettings>) => {
    setSettings((prev) => {
      const newSettings = { ...prev, ...updates };
      saveChartSettings(CHART_SETTINGS_STORAGE_KEY, newSettings);
      return newSettings;
    });
  }, []);

  return { settings, updateSettings, isLoaded };
}

export function useScreenSize(): ScreenSize {
  const [screenSize, setScreenSize] = useState<ScreenSize>('desktop');

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setScreenSize('mobile');
      } else if (width < 1024) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return screenSize;
}
