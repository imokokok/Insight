import { TimeRange } from '../../common/TabNavigation';

export type { TimeRange };

export type ChartType = 'line' | 'candlestick';
export type DataGranularity = 'minute' | 'hour' | 'day';
export type ConfidenceLevel = 90 | 95 | 99;

export interface TimeRangeOption {
  value: TimeRange;
  label: string;
  hours: number;
}

export interface ComparisonPeriod {
  enabled: boolean;
  period1Start: string;
  period1End: string;
  period2Start: string;
  period2End: string;
}

export interface ChartSettings {
  anomalyDetectionEnabled: boolean;
  showPredictionInterval: boolean;
  confidenceLevel: ConfidenceLevel;
  comparisonEnabled: boolean;
}

export type ScreenSize = 'mobile' | 'tablet' | 'desktop';

export type TranslateFunction = (key: string, params?: Record<string, string | number>) => string;

export const CHART_SETTINGS_STORAGE_KEY = 'priceChart_settings';

export const TIME_RANGE_OPTIONS: TimeRangeOption[] = [
  { value: '1H', label: '1H', hours: 1 },
  { value: '24H', label: '24H', hours: 24 },
  { value: '7D', label: '7D', hours: 24 * 7 },
  { value: '30D', label: '30D', hours: 24 * 30 },
  { value: '90D', label: '90D', hours: 24 * 90 },
  { value: '1Y', label: '1Y', hours: 24 * 365 },
];

export function getTimeRangeConfig(t: TranslateFunction): Record<TimeRange, { hours: number; interval: number; label: string }> {
  return {
    '1H': { hours: 1, interval: 2, label: t('oracle.chart.timeRange.1h') || '1h' },
    '24H': { hours: 24, interval: 30, label: t('oracle.chart.timeRange.24h') || '24h' },
    '7D': { hours: 24 * 7, interval: 4, label: t('oracle.chart.timeRange.7d') || '7d' },
    '30D': { hours: 24 * 30, interval: 24, label: t('oracle.chart.timeRange.30d') || '30d' },
    '90D': { hours: 24 * 90, interval: 72, label: t('oracle.chart.timeRange.90d') || '90d' },
    '1Y': { hours: 24 * 365, interval: 168, label: t('oracle.chart.timeRange.1y') || '1y' },
    ALL: { hours: 24 * 365 * 2, interval: 336, label: t('oracle.chart.timeRange.all') || 'All' },
  };
}

export function getGranularityConfig(t: TranslateFunction): Record<DataGranularity, { intervalMinutes: number; label: string }> {
  return {
    minute: { intervalMinutes: 1, label: t('oracle.chart.granularity.minute') || 'Minute' },
    hour: { intervalMinutes: 60, label: t('oracle.chart.granularity.hour') || 'Hour' },
    day: { intervalMinutes: 1440, label: t('oracle.chart.granularity.day') || 'Day' },
  };
}

export const CONFIDENCE_Z_SCORES: Record<ConfidenceLevel, number> = {
  90: 1.645,
  95: 1.96,
  99: 2.576,
};

export const TIME_RANGE_CONFIG: Record<TimeRange, { hours: number; interval: number; label: string }> = {
  '1H': { hours: 1, interval: 2, label: '1小时' },
  '24H': { hours: 24, interval: 30, label: '24小时' },
  '7D': { hours: 24 * 7, interval: 4, label: '7天' },
  '30D': { hours: 24 * 30, interval: 24, label: '30天' },
  '90D': { hours: 24 * 90, interval: 72, label: '90天' },
  '1Y': { hours: 24 * 365, interval: 168, label: '1年' },
  ALL: { hours: 24 * 365 * 2, interval: 336, label: '全部' },
};

export const GRANULARITY_CONFIG: Record<DataGranularity, { intervalMinutes: number; label: string }> = {
  minute: { intervalMinutes: 1, label: '分钟' },
  hour: { intervalMinutes: 60, label: '小时' },
  day: { intervalMinutes: 1440, label: '天' },
};
