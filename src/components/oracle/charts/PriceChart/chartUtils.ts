import { type IndicatorDataPoint } from '@/hooks';

import { type AnomalyPoint } from './useChartState';

export function calculatePriceRange(
  data: IndicatorDataPoint[],
  comparisonData: IndicatorDataPoint[],
  comparisonEnabled: boolean
): { min: number; max: number } {
  if (data.length === 0) return { min: 0, max: 100 };
  const allData = comparisonEnabled ? [...data, ...comparisonData] : data;
  const prices = allData.map((d) => d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const padding = (max - min) * 0.1;
  return { min: min - padding, max: max + padding };
}

export function calculateVolumeRange(
  data: IndicatorDataPoint[],
  comparisonData: IndicatorDataPoint[],
  comparisonEnabled: boolean
): { min: number; max: number } {
  if (data.length === 0) return { min: 0, max: 1000000 };
  const allData = comparisonEnabled ? [...data, ...comparisonData] : data;
  const volumes = allData.map((d) => d.volume);
  const max = Math.max(...volumes);
  return { min: 0, max: max * 3 };
}

export function calculatePriceChange(data: IndicatorDataPoint[]): {
  value: number;
  percent: number;
} {
  if (data.length < 2) return { value: 0, percent: 0 };
  const first = data[0].price;
  const last = data[data.length - 1].price;
  const change = last - first;
  const percent = (change / first) * 100;
  return { value: change, percent };
}

export function detectAnomalies(
  data: IndicatorDataPoint[],
  anomalyDetectionEnabled: boolean
): AnomalyPoint[] {
  if (!anomalyDetectionEnabled || data.length < 10) return [];

  const prices = data.map((d) => d.price);
  const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  const squaredDiffs = prices.map((p) => Math.pow(p - mean, 2));
  const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / prices.length;
  const stdDev = Math.sqrt(variance);

  const anomalyThreshold = 2 * stdDev;

  const detected: AnomalyPoint[] = [];

  data.forEach((point) => {
    const deviation = Math.abs(point.price - mean);
    if (deviation > anomalyThreshold) {
      const deviationInSigma = deviation / stdDev;
      const deviationPercent = ((point.price - mean) / mean) * 100;

      detected.push({
        timestamp: point.timestamp,
        price: point.price,
        deviation: deviationInSigma,
        type: point.price > mean ? 'spike' : 'drop',
        time: point.time,
        deviationPercent: Math.abs(deviationPercent),
        absoluteDeviation: deviation,
      });
    }
  });

  return detected;
}

export function calculateChartHeights(
  height: number,
  showToolbar: boolean,
  isMobile: boolean,
  showRSI: boolean,
  showMACD: boolean
): { main: number; rsi: number; macd: number } {
  const minHeight = isMobile ? 300 : 400;
  const availableHeight = Math.max(minHeight, height - (showToolbar ? (isMobile ? 140 : 180) : 0));
  const gap = isMobile ? 4 : 8;

  if (showRSI && showMACD) {
    const mainHeight = Math.floor((availableHeight - gap * 2) * 0.6);
    const subHeight = Math.floor((availableHeight - gap * 2) * 0.2);
    return {
      main: Math.max(mainHeight, isMobile ? 180 : 240),
      rsi: Math.max(subHeight, isMobile ? 60 : 80),
      macd: Math.max(subHeight, isMobile ? 60 : 80),
    };
  } else if (showRSI || showMACD) {
    const mainHeight = Math.floor((availableHeight - gap) * 0.7);
    const subHeight = Math.floor((availableHeight - gap) * 0.3);
    return {
      main: Math.max(mainHeight, isMobile ? 200 : 280),
      rsi: showRSI ? Math.max(subHeight, isMobile ? 80 : 100) : 0,
      macd: showMACD ? Math.max(subHeight, isMobile ? 80 : 100) : 0,
    };
  } else {
    return { main: availableHeight, rsi: 0, macd: 0 };
  }
}
