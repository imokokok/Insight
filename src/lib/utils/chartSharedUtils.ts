import { chartColors as configChartColors, semanticColors } from '@/lib/config/colors';

export const chartColors = {
  primary: configChartColors.recharts.primary,
  secondary: configChartColors.recharts.tick,
  success: semanticColors.success.DEFAULT,
  warning: semanticColors.warning.DEFAULT,
  danger: semanticColors.danger.DEFAULT,
  info: configChartColors.recharts.cyan,
  neutral: configChartColors.recharts.tick,
  grid: configChartColors.recharts.grid,
  text: configChartColors.recharts.tickDark,
  background: configChartColors.recharts.background,

  price: configChartColors.recharts.primary,
  volume: configChartColors.recharts.purple,
  ma7: semanticColors.warning.DEFAULT,
  ma20: configChartColors.recharts.pink,
  ma50: configChartColors.recharts.teal,

  up: semanticColors.success.DEFAULT,
  down: semanticColors.danger.DEFAULT,

  anomaly: semanticColors.danger.DEFAULT,
  prediction: configChartColors.recharts.primary,
  predictionFill: 'rgba(59, 130, 246, 0.1)',

  heatmap: {
    low: semanticColors.success.DEFAULT,
    medium: semanticColors.warning.DEFAULT,
    high: semanticColors.danger.DEFAULT,
  },
};

export const chartGradients = {
  primary: {
    start: 'rgba(59, 130, 246, 0.3)',
    end: 'rgba(59, 130, 246, 0)',
  },
  volume: {
    start: 'rgba(139, 92, 246, 0.3)',
    end: 'rgba(139, 92, 246, 0)',
  },
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'normal':
    case 'active':
    case 'success':
      return chartColors.success;
    case 'warning':
    case 'degraded':
    case 'improving':
      return chartColors.warning;
    case 'critical':
    case 'inactive':
    case 'error':
      return chartColors.danger;
    case 'stale':
      return chartColors.neutral;
    default:
      return chartColors.primary;
  }
};

export const getDeviationColor = (deviationPercent: number): string => {
  const absDeviation = Math.abs(deviationPercent);
  if (absDeviation < 0.1) return chartColors.success;
  if (absDeviation < 0.5) return chartColors.warning;
  return chartColors.danger;
};

export const getHeatmapColor = (value: number, min: number, max: number): string => {
  const range = max - min;
  const normalized = range === 0 ? 0.5 : (value - min) / range;

  if (normalized < 0.33) return chartColors.heatmap.low;
  if (normalized < 0.66) return chartColors.heatmap.medium;
  return chartColors.heatmap.high;
};

export const chartResponsiveSettings = {
  mobile: {
    fontSize: 10,
    axisWidth: 45,
    marginRight: 5,
  },
  tablet: {
    fontSize: 11,
    axisWidth: 50,
    marginRight: 8,
  },
  desktop: {
    fontSize: 12,
    axisWidth: 60,
    marginRight: 10,
  },
};

export const getResponsiveSettings = (screenWidth: number) => {
  if (screenWidth < 640) return chartResponsiveSettings.mobile;
  if (screenWidth < 1024) return chartResponsiveSettings.tablet;
  return chartResponsiveSettings.desktop;
};

export const formatPrice = (price: number, decimals: number = 4): string => {
  if (price >= 1000) {
    return `$${price.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${price.toFixed(decimals)}`;
};

export const formatVolume = (volume: number): string => {
  if (volume >= 1e9) return `${(volume / 1e9).toFixed(2)}B`;
  if (volume >= 1e6) return `${(volume / 1e6).toFixed(2)}M`;
  if (volume >= 1e3) return `${(volume / 1e3).toFixed(2)}K`;
  return volume.toFixed(2);
};

export const formatPercentage = (value: number, decimals: number = 2): string => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
};

export const formatTimestamp = (
  timestamp: number,
  format: 'time' | 'date' | 'datetime' = 'datetime'
): string => {
  const date = new Date(timestamp);

  if (format === 'time') {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }

  if (format === 'date') {
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  }

  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const calculateStandardDeviation = (values: number[]): number => {
  if (values.length === 0) return 0;

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;

  return Math.sqrt(variance);
};

export const calculateMovingAverage = (values: number[], period: number): number[] => {
  if (values.length < period) return values;

  const result: number[] = [];

  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(values[i]);
    } else {
      const slice = values.slice(i - period + 1, i + 1);
      const avg = slice.reduce((sum, val) => sum + val, 0) / period;
      result.push(avg);
    }
  }

  return result;
};

export const detectAnomalies = (
  values: number[],
  threshold: number = 2
): { index: number; value: number; deviation: number }[] => {
  if (values.length < 3) return [];

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const stdDev = calculateStandardDeviation(values);
  const anomalyThreshold = stdDev * threshold;

  const anomalies: { index: number; value: number; deviation: number }[] = [];

  values.forEach((value, index) => {
    const deviation = Math.abs(value - mean);
    if (deviation > anomalyThreshold) {
      anomalies.push({
        index,
        value,
        deviation: deviation / stdDev,
      });
    }
  });

  return anomalies;
};

export const interpolateMissingValues = (
  data: { timestamp: number; value: number | null }[]
): { timestamp: number; value: number }[] => {
  const result: { timestamp: number; value: number }[] = [];

  for (let i = 0; i < data.length; i++) {
    if (data[i].value !== null) {
      result.push({ timestamp: data[i].timestamp, value: data[i].value as number });
    } else {
      let prevIndex = i - 1;
      let nextIndex = i + 1;

      while (prevIndex >= 0 && data[prevIndex].value === null) prevIndex--;
      while (nextIndex < data.length && data[nextIndex].value === null) nextIndex++;

      let interpolatedValue: number;

      if (prevIndex < 0 && nextIndex >= data.length) {
        interpolatedValue = 0;
      } else if (prevIndex < 0) {
        interpolatedValue = data[nextIndex].value as number;
      } else if (nextIndex >= data.length) {
        interpolatedValue = data[prevIndex].value as number;
      } else {
        const t = (i - prevIndex) / (nextIndex - prevIndex);
        interpolatedValue =
          (data[prevIndex].value as number) * (1 - t) + (data[nextIndex].value as number) * t;
      }

      result.push({ timestamp: data[i].timestamp, value: interpolatedValue });
    }
  }

  return result;
};

export const aggregateByTimeGranularity = (
  data: { timestamp: number; value: number }[],
  granularity: 'hour' | 'day' | 'week'
): { timestamp: number; value: number; count: number }[] => {
  const aggregated = new Map<number, { sum: number; count: number }>();

  const msMap = {
    hour: 3600000,
    day: 86400000,
    week: 604800000,
  };

  const granularityMs = msMap[granularity];

  data.forEach((point) => {
    const bucket = Math.floor(point.timestamp / granularityMs) * granularityMs;

    if (aggregated.has(bucket)) {
      const existing = aggregated.get(bucket)!;
      existing.sum += point.value;
      existing.count += 1;
    } else {
      aggregated.set(bucket, { sum: point.value, count: 1 });
    }
  });

  return Array.from(aggregated.entries()).map(([timestamp, { sum, count }]) => ({
    timestamp,
    value: sum / count,
    count,
  }));
};

export const downloadAsCSV = (data: Record<string, unknown>[], filename: string): void => {
  if (data.length === 0) return;

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          }
          return value;
        })
        .join(',')
    ),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
};

export const downloadAsJSON = (data: unknown, filename: string): void => {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
};

export const exportChartAsImage = async (
  chartRef: React.RefObject<HTMLDivElement>,
  filename: string
): Promise<void> => {
  if (!chartRef.current) return;

  const html2canvas = (await import('html2canvas')).default;

  const canvas = await html2canvas(chartRef.current, {
    backgroundColor: '#ffffff' as any,
  });

  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = `${filename}.png`;
  link.click();
};
