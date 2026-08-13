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

// Degenerate branch (range === 0 or sub-percent max): band by absolute value.
const HEATMAP_ABS_BANDS: ReadonlyArray<{ max: number; color: string }> = [
  { max: 0.001, color: semanticColors.success.DEFAULT },
  { max: 0.003, color: semanticColors.success.dark },
  { max: 0.005, color: '#65a30d' },
  { max: 0.01, color: '#84cc16' },
  { max: 0.03, color: semanticColors.warning.DEFAULT },
  { max: 0.05, color: semanticColors.warning.dark },
  { max: 0.1, color: '#f97316' },
  { max: 0.3, color: semanticColors.danger.light },
];

// Normal branch: band by normalized position within [min, max].
const HEATMAP_NORM_BANDS: ReadonlyArray<{ max: number; color: string }> = [
  { max: 0.2, color: chartColors.heatmap.low },
  { max: 0.4, color: '#84cc16' },
  { max: 0.6, color: chartColors.heatmap.medium },
  { max: 0.8, color: '#f97316' },
];

export const getHeatmapColor = (value: number, min: number, max: number): string => {
  if (max - min === 0 || max < 0.01) {
    const absValue = Math.abs(value);
    for (const band of HEATMAP_ABS_BANDS) {
      if (absValue < band.max) return band.color;
    }
    return semanticColors.danger.DEFAULT;
  }

  const normalized = (value - min) / (max - min);
  for (const band of HEATMAP_NORM_BANDS) {
    if (normalized < band.max) return band.color;
  }
  return chartColors.heatmap.high;
};
