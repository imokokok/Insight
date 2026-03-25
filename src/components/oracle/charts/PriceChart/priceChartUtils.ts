import { HistoricalPricePoint } from '@/lib/oracles/bandProtocol';
import { IndicatorDataPoint } from '@/hooks';
import { createLogger } from '@/lib/utils/logger';
import {
  TimeRange,
  DataGranularity,
  ConfidenceLevel,
  TIME_RANGE_CONFIG,
  GRANULARITY_CONFIG,
  CONFIDENCE_Z_SCORES,
} from './priceChartConfig';

const logger = createLogger('PriceChartUtils');

export function calculatePredictionIntervals(
  data: IndicatorDataPoint[],
  windowSize: number = 20,
  confidenceLevel: ConfidenceLevel
): IndicatorDataPoint[] {
  const zScore = CONFIDENCE_Z_SCORES[confidenceLevel];

  return data.map((point, index) => {
    if (index < windowSize - 1) {
      return {
        ...point,
        predictionUpper: point.price,
        predictionLower: point.price,
        predictionMean: point.price,
      };
    }

    const windowData = data.slice(index - windowSize + 1, index + 1);
    const prices = windowData.map((d) => d.price);

    const mean = prices.reduce((sum, p) => sum + p, 0) / windowSize;

    const squaredDiffs = prices.map((p) => Math.pow(p - mean, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / windowSize;
    const stdDev = Math.sqrt(variance);

    const upper = mean + zScore * stdDev;
    const lower = mean - zScore * stdDev;

    return {
      ...point,
      predictionUpper: upper,
      predictionLower: lower,
      predictionMean: mean,
    };
  });
}

export function generateHistoricalData(
  basePrice: number,
  timeRange: TimeRange
): IndicatorDataPoint[] {
  const config = TIME_RANGE_CONFIG[timeRange];
  const now = Date.now();
  const dataPoints: IndicatorDataPoint[] = [];

  const totalMinutes = config.hours * 60;
  const dataCount = Math.min(Math.floor(totalMinutes / config.interval), 500);

  let currentPrice = basePrice;
  const volatility = 0.015;

  for (let i = dataCount; i >= 0; i--) {
    const timestamp = now - i * config.interval * 60 * 1000;
    const date = new Date(timestamp);

    const change = (Math.random() - 0.5) * 2 * volatility;
    const open = currentPrice;
    const close = currentPrice * (1 + change);
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);

    const volumeBase = 1000000 + Math.random() * 2000000;
    const volume = Math.floor(volumeBase * (1 + Math.abs(change) * 10));

    let timeLabel: string;
    if (config.hours <= 24) {
      timeLabel = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (config.hours <= 24 * 7) {
      timeLabel = date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
      });
    } else {
      timeLabel = date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    }

    dataPoints.push({
      time: timeLabel,
      timestamp,
      price: close,
      volume,
      open,
      high,
      low,
      close,
    });

    currentPrice = close;
  }

  return dataPoints;
}

export function convertHistoricalPricePoints(
  points: HistoricalPricePoint[],
  isComparison: boolean = false
): IndicatorDataPoint[] {
  return points.map((point) => {
    const date = new Date(point.timestamp);
    let timeLabel: string;
    const hoursDiff = (Date.now() - point.timestamp) / (1000 * 60 * 60);

    if (hoursDiff <= 24) {
      timeLabel = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (hoursDiff <= 24 * 7) {
      timeLabel = date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
      });
    } else {
      timeLabel = date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    }

    return {
      time: timeLabel,
      timestamp: point.timestamp,
      price: point.price,
      volume: point.volume,
      open: point.open,
      high: point.high,
      low: point.low,
      close: point.close,
      ma7: point.ma7,
      ma20: point.ma20,
      isComparison,
    };
  });
}

export function generateDataWithGranularity(
  basePrice: number,
  startDate: Date,
  endDate: Date,
  granularity: DataGranularity
): IndicatorDataPoint[] {
  const dataPoints: IndicatorDataPoint[] = [];
  const granularityConfig = GRANULARITY_CONFIG[granularity];
  const intervalMs = granularityConfig.intervalMinutes * 60 * 1000;

  const startTime = startDate.getTime();
  const endTime = endDate.getTime();
  let currentPrice = basePrice;
  const volatility = 0.015;

  for (let timestamp = startTime; timestamp <= endTime; timestamp += intervalMs) {
    const date = new Date(timestamp);
    const change = (Math.random() - 0.5) * 2 * volatility;
    const open = currentPrice;
    const close = currentPrice * (1 + change);
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);

    const volumeBase = 1000000 + Math.random() * 2000000;
    const volume = Math.floor(volumeBase * (1 + Math.abs(change) * 10));

    let timeLabel: string;
    if (granularity === 'minute') {
      timeLabel = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (granularity === 'hour') {
      timeLabel = date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
      });
    } else {
      timeLabel = date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    }

    dataPoints.push({
      time: timeLabel,
      timestamp,
      price: close,
      volume,
      open,
      high,
      low,
      close,
    });

    currentPrice = close;
  }

  return dataPoints;
}

export function loadChartSettings<T>(storageKey: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    logger.warn('Failed to load chart settings', e instanceof Error ? e : new Error(String(e)));
  }
  return defaultValue;
}

export function saveChartSettings<T>(storageKey: string, settings: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(storageKey, JSON.stringify(settings));
  } catch (e) {
    logger.warn('Failed to save chart settings', e instanceof Error ? e : new Error(String(e)));
  }
}
