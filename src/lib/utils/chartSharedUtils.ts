import { chartColors as configChartColors, semanticColors } from '@/lib/config/colors';

// Re-export formatPrice from core utils to maintain backward compatibility
export { formatPrice } from './format';

const hexToRgba = (hex: string, alpha: number): string => {
  if (!hex || typeof hex !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(hex)) {
    return `rgba(0, 0, 0, ${alpha})`;
  }
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const chartColors = {
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
  predictionFill: hexToRgba(configChartColors.recharts.primary, 0.1),

  heatmap: {
    low: semanticColors.success.DEFAULT,
    medium: semanticColors.warning.DEFAULT,
    high: semanticColors.danger.DEFAULT,
  },
};

const getStatusColor = (status: string): string => {
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

const getDeviationColor = (deviationPercent: number): string => {
  const absDeviation = Math.abs(deviationPercent);
  if (absDeviation < 0.1) return chartColors.success;
  if (absDeviation < 0.5) return chartColors.warning;
  return chartColors.danger;
};

/**
 * Gets heatmap color using project color system
 * @param value - The value to color
 * @param min - Minimum value in range
 * @param max - Maximum value in range
 * @returns Color hex code
 */
export const getHeatmapColor = (value: number, min: number, max: number): string => {
  const range = max - min;
  const absValue = Math.abs(value);

  // 当所有值都为0或范围很小时，使用基于绝对阈值的着色
  if (range === 0 || max < 0.01) {
    // 使用项目颜色系统的语义颜色，避免硬编码
    if (absValue < 0.001) return semanticColors.success.DEFAULT;
    if (absValue < 0.003) return semanticColors.success.dark || '#16a34a';
    if (absValue < 0.005) return '#65a30d'; // 黄绿 - 介于 success 和 warning 之间
    if (absValue < 0.01) return '#84cc16'; // 浅黄绿
    if (absValue < 0.03) return semanticColors.warning.DEFAULT;
    if (absValue < 0.05) return semanticColors.warning.dark || '#f59e0b';
    if (absValue < 0.1) return '#f97316'; // 橙色 - 介于 warning 和 danger 之间
    if (absValue < 0.3) return semanticColors.danger.light || '#ea580c';
    return semanticColors.danger.DEFAULT;
  }

  // 正常归一化逻辑
  const normalized = (value - min) / range;

  // 使用项目颜色系统
  if (normalized < 0.2) return chartColors.heatmap.low;
  if (normalized < 0.4) return '#84cc16';
  if (normalized < 0.6) return chartColors.heatmap.medium;
  if (normalized < 0.8) return '#f97316';
  return chartColors.heatmap.high;
};

export const calculateStandardDeviation = (values: number[]): number => {
  if (values.length < 2) return 0;

  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
  // 使用样本方差 (n-1) 而非总体方差 (n)，这是金融分析的标准做法
  const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / (values.length - 1);

  return Math.sqrt(variance);
};

export const calculateMovingAverage = (values: number[], period: number): number[] => {
  if (values.length < period) return values;

  const result: number[] = [];
  let sum = 0;

  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      result.push(values[i]);
      sum += values[i];
    } else if (i === period - 1) {
      // 第一个完整窗口
      sum += values[i];
      result.push(sum / period);
    } else {
      // 滑动窗口：新 sum = 旧 sum - 离开窗口的值 + 新进入窗口的值
      sum = sum - values[i - period] + values[i];
      result.push(sum / period);
    }
  }

  return result;
};
