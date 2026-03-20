/**
 * 图表颜色配置
 * 统一的图表配色方案
 */

export const chartColors = {
  // 主色调
  primary: '#3b82f6',
  secondary: '#8b5cf6',
  tertiary: '#10b981',
  quaternary: '#f59e0b',
  quinary: '#ef4444',
  senary: '#06b6d4',

  // 扩展色板
  palette: [
    '#3b82f6', // blue
    '#8b5cf6', // purple
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#06b6d4', // cyan
    '#f97316', // orange
    '#84cc16', // lime
    '#ec4899', // pink
    '#6366f1', // indigo
  ],

  // 渐变色
  gradients: {
    primary: ['#3b82f6', '#60a5fa'],
    secondary: ['#8b5cf6', '#a78bfa'],
    tertiary: ['#10b981', '#34d399'],
    quaternary: ['#f59e0b', '#fbbf24'],
    quinary: ['#ef4444', '#f87171'],
    senary: ['#06b6d4', '#22d3ee'],
  },

  // 语义色
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',

  // 中性色
  neutral: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
} as const;

// Recharts 主题配置
export const rechartsTheme = {
  colors: chartColors.palette,
  chart: {
    backgroundColor: 'transparent',
    borderColor: chartColors.neutral[200],
    textColor: chartColors.neutral[600],
  },
  line: {
    strokeWidth: 2,
    dot: {
      r: 4,
      strokeWidth: 2,
    },
    activeDot: {
      r: 6,
      strokeWidth: 2,
    },
  },
  bar: {
    radius: [2, 2, 0, 0],
    strokeWidth: 0,
  },
  area: {
    strokeWidth: 2,
    fillOpacity: 0.1,
  },
  pie: {
    stroke: '#fff',
    strokeWidth: 2,
  },
  axis: {
    stroke: chartColors.neutral[300],
    tick: {
      fill: chartColors.neutral[500],
      fontSize: 12,
    },
    label: {
      fill: chartColors.neutral[600],
      fontSize: 12,
    },
  },
  grid: {
    stroke: chartColors.neutral[200],
    strokeDasharray: '3 3',
  },
  tooltip: {
    backgroundColor: '#fff',
    borderColor: chartColors.neutral[200],
    borderWidth: 1,
    textColor: chartColors.neutral[700],
  },
  legend: {
    textColor: chartColors.neutral[600],
    fontSize: 12,
  },
} as const;

// 获取颜色
export function getChartColor(index: number): string {
  return chartColors.palette[index % chartColors.palette.length];
}

// 获取渐变色
export function getChartGradient(index: number): readonly string[] {
  const gradients = Object.values(chartColors.gradients);
  return gradients[index % gradients.length];
}
