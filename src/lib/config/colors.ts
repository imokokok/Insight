/**
 * 统一颜色配置文件
 * 集中管理项目中所有颜色，避免硬编码
 */

import { OracleProvider } from '@/lib/types/oracle';

// ============================================
// 基础颜色系统
// ============================================

export const baseColors = {
  // 主色调 - 金融蓝色系
  primary: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },

  // 中性色 - 灰度
  gray: {
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

  // Slate 灰 - 用于文本
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
} as const;

// ============================================
// 语义化颜色
// ============================================

export const semanticColors = {
  // 状态色
  success: {
    light: '#d1fae5',
    DEFAULT: '#10b981',
    dark: '#059669',
    text: '#065f46',
  },
  warning: {
    light: '#fef3c7',
    DEFAULT: '#f59e0b',
    dark: '#d97706',
    text: '#92400e',
  },
  danger: {
    light: '#fee2e2',
    DEFAULT: '#ef4444',
    dark: '#dc2626',
    text: '#991b1b',
  },
  info: {
    light: '#dbeafe',
    DEFAULT: '#3b82f6',
    dark: '#2563eb',
    text: '#1e40af',
  },
  neutral: {
    light: '#f1f5f9',
    DEFAULT: '#64748b',
    dark: '#475569',
    text: '#334155',
  },
} as const;

// ============================================
// 金融主题颜色
// ============================================

export const financeColors = {
  primary: baseColors.primary[800],
  secondary: baseColors.primary[500],
  accent: baseColors.primary[400],
  success: semanticColors.success.DEFAULT,
  warning: semanticColors.warning.DEFAULT,
  danger: semanticColors.danger.DEFAULT,
  neutral: semanticColors.neutral.DEFAULT,
} as const;

// ============================================
// 渐变定义
// ============================================

export const gradients = {
  blue: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%)',
  green: 'linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)',
  purple: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #a78bfa 100%)',
  gold: 'linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #fbbf24 100%)',
  red: 'linear-gradient(135deg, #dc2626 0%, #ef4444 50%, #f87171 100%)',
} as const;

// ============================================
// 图表颜色配置
// ============================================

export const chartColors = {
  // 预言机品牌色
  oracle: {
    chainlink: '#3B82F6',
    'band-protocol': '#10B981',
    uma: '#F59E0B',
    'pyth-network': '#8B5CF6',
    api3: '#EC4899',
  } as const,

  // 地区颜色
  region: {
    northAmerica: '#3B82F6',
    europe: '#8B5CF6',
    asia: '#10B981',
    other: '#F59E0B',
  },

  // 验证者类型颜色
  validator: {
    institution: '#8B5CF6',
    independent: '#3B82F6',
    community: '#10B981',
  },

  // 语义颜色（用于图表）
  semantic: {
    positive: '#10B981',
    negative: '#EF4444',
    neutral: '#64748b',
    warning: '#F59E0B',
  },

  // 图表网格和轴线颜色
  grid: {
    line: '#E5E7EB',
    axis: '#6B7280',
    background: '#FFFFFF',
  },

  // 通用图表颜色序列
  sequence: [
    '#3B82F6', // 蓝
    '#10B981', // 绿
    '#F59E0B', // 橙
    '#8B5CF6', // 紫
    '#EC4899', // 粉
    '#06B6D4', // 青
    '#F97316', // 深橙
    '#84CC16', // 浅绿
  ],
} as const;

// ============================================
// 阴影颜色
// ============================================

export const shadowColors = {
  soft: '0 4px 20px -2px rgba(30, 64, 175, 0.1)',
  medium: '0 8px 30px -4px rgba(30, 64, 175, 0.15)',
  strong: '0 12px 40px -6px rgba(30, 64, 175, 0.2)',
} as const;

// ============================================
// 可访问性颜色（色盲友好）
// ============================================

export const accessibleColors = {
  // 色盲友好的涨跌颜色
  priceChange: {
    up: {
      color: '#1e40af', // 蓝色（替代绿色）
      bg: '#dbeafe',
      icon: '↑',
    },
    down: {
      color: '#d97706', // 橙色（替代红色）
      bg: '#fef3c7',
      icon: '↓',
    },
  },

  // 高对比度文本颜色
  text: {
    primary: '#111827', // gray-900
    secondary: '#374151', // gray-700
    tertiary: '#4b5563', // gray-600
    muted: '#6b7280', // gray-500
    placeholder: '#9ca3af', // gray-400
  },
} as const;

// ============================================
// Tailwind 类名映射
// ============================================

export const tailwindClasses = {
  // 背景色
  bg: {
    primary: 'bg-blue-800',
    secondary: 'bg-blue-500',
    accent: 'bg-blue-400',
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    danger: 'bg-red-500',
    neutral: 'bg-slate-500',
  },

  // 文本色
  text: {
    primary: 'text-gray-900',
    secondary: 'text-gray-700',
    tertiary: 'text-gray-600',
    muted: 'text-gray-500',
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    danger: 'text-red-600',
  },

  // 边框色
  border: {
    light: 'border-gray-200',
    DEFAULT: 'border-gray-300',
    dark: 'border-gray-400',
  },

  // 状态背景色（light 版本）
  statusBg: {
    success: 'bg-emerald-50',
    warning: 'bg-amber-50',
    danger: 'bg-red-50',
    info: 'bg-blue-50',
  },

  // 状态文本色
  statusText: {
    success: 'text-emerald-700',
    warning: 'text-amber-700',
    danger: 'text-red-700',
    info: 'text-blue-700',
  },
} as const;

// ============================================
// 辅助函数
// ============================================

/**
 * 获取预言机颜色
 */
export function getOracleColor(provider: OracleProvider): string {
  const colorMap: Record<OracleProvider, string> = {
    [OracleProvider.CHAINLINK]: chartColors.oracle.chainlink,
    [OracleProvider.BAND_PROTOCOL]: chartColors.oracle['band-protocol'],
    [OracleProvider.UMA]: chartColors.oracle.uma,
    [OracleProvider.PYTH_NETWORK]: chartColors.oracle['pyth-network'],
    [OracleProvider.API3]: chartColors.oracle.api3,
  };
  return colorMap[provider] || chartColors.sequence[0];
}

/**
 * 获取涨跌颜色配置
 * @param isPositive 是否上涨
 * @param useAccessible 是否使用色盲友好颜色
 */
export function getPriceChangeColor(
  isPositive: boolean,
  useAccessible: boolean = false
): { color: string; bgColor: string; icon: string } {
  if (useAccessible) {
    const accessible = isPositive
      ? accessibleColors.priceChange.up
      : accessibleColors.priceChange.down;
    return {
      color: accessible.color,
      bgColor: accessible.bg,
      icon: accessible.icon,
    };
  }

  return isPositive
    ? { color: semanticColors.success.DEFAULT, bgColor: semanticColors.success.light, icon: '↑' }
    : { color: semanticColors.danger.DEFAULT, bgColor: semanticColors.danger.light, icon: '↓' };
}

/**
 * 获取图表序列颜色
 */
export function getChartSequenceColor(index: number): string {
  return chartColors.sequence[index % chartColors.sequence.length];
}

/**
 * 获取对比度安全的文本颜色
 * @param backgroundColor 背景色（hex 格式）
 */
export function getContrastTextColor(backgroundColor: string): string {
  // 简单的亮度计算
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  return brightness > 128 ? baseColors.gray[900] : '#FFFFFF';
}

// ============================================
// 导出默认对象
// ============================================

export const colors = {
  base: baseColors,
  semantic: semanticColors,
  finance: financeColors,
  gradients,
  chart: chartColors,
  shadow: shadowColors,
  accessible: accessibleColors,
  tailwind: tailwindClasses,
} as const;

export default colors;
