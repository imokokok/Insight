import { chartColors as configChartColors, semanticColors } from '@/lib/config/colors';

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

export const getHeatmapColor = (value: number, min: number, max: number): string => {
  const range = max - min;
  const absValue = Math.abs(value);

  if (range === 0 || max < 0.01) {
    if (absValue < 0.001) return semanticColors.success.DEFAULT;
    if (absValue < 0.003) return semanticColors.success.dark || '#16a34a';
    if (absValue < 0.005) return '#65a30d';
    if (absValue < 0.01) return '#84cc16';
    if (absValue < 0.03) return semanticColors.warning.DEFAULT;
    if (absValue < 0.05) return semanticColors.warning.dark || '#f59e0b';
    if (absValue < 0.1) return '#f97316';
    if (absValue < 0.3) return semanticColors.danger.light || '#ea580c';
    return semanticColors.danger.DEFAULT;
  }

  const normalized = (value - min) / range;

  if (normalized < 0.2) return chartColors.heatmap.low;
  if (normalized < 0.4) return '#84cc16';
  if (normalized < 0.6) return chartColors.heatmap.medium;
  if (normalized < 0.8) return '#f97316';
  return chartColors.heatmap.high;
};
