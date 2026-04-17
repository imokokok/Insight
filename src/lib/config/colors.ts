/**
 * 统一颜色配置文件
 * 集中管理项目中所有颜色，避免硬编码
 */

// ============================================
// 类型定义
// ============================================

/**
 * 色阶颜色类型 (50-900)
 */
export interface ColorScale {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
}

/**
 * 语义化颜色类型
 */
export interface SemanticColor {
  light: string;
  DEFAULT: string;
  dark: string;
  text: string;
  main: string;
}

/**
 * 阴影颜色类型
 */
export interface ShadowColor {
  soft: string;
  medium: string;
  strong: string;
  tooltip: string;
  card: string;
  cardHover: string;
  inputFocus: string;
  glow: string;
  pulse: string;
}

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
    main: '#10b981',
  },
  warning: {
    light: '#fef3c7',
    DEFAULT: '#f59e0b',
    dark: '#d97706',
    text: '#92400e',
    main: '#f59e0b',
  },
  danger: {
    light: '#fee2e2',
    DEFAULT: '#ef4444',
    dark: '#dc2626',
    text: '#991b1b',
    main: '#ef4444',
  },
  info: {
    light: '#dbeafe',
    DEFAULT: '#3b82f6',
    dark: '#2563eb',
    text: '#1e40af',
    main: '#3b82f6',
  },
  neutral: {
    light: '#f1f5f9',
    DEFAULT: '#64748b',
    dark: '#475569',
    text: '#334155',
    main: '#64748b',
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
// 区块链品牌颜色
// ============================================

export const chainColors = {
  cosmosHub: '#2E3359',
  osmosis: '#9945FF',
  ethereum: '#627EEA',
  polygon: '#8247E5',
  avalanche: '#E84142',
  fantom: '#1969FF',
  cronos: '#002D74',
  juno: '#5B6EE1',
  arbitrum: '#28A0F0',
  optimism: '#FF0420',
  solana: '#14F195',
  bnbChain: '#F0B90B',
  base: '#0052FF',
  scroll: '#FFEEDA',
  zkSync: '#8C8DFC',
  aptos: '#4CD7D0',
  sui: '#6FBCF0',
  gnosis: '#04795B',
  mantle: '#000000',
  linea: '#000000',
  celestia: '#2B2B2B',
  injective: '#00F2FE',
  sei: '#B100CD',
  tron: '#FF0013',
  ton: '#0098EA',
  near: '#00C08B',
  aurora: '#6BBE47',
  celo: '#FBCC5C',
  starknet: '#0C0C4F',
  blast: '#FCFC03',
  cardano: '#0033AD',
  polkadot: '#E6007A',
  kava: '#FF564F',
  moonbeam: '#53CBC8',
  moonriver: '#F2A902',
  metis: '#00D2FF',
  starkex: '#0C0C4F',
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
  // 预言机品牌色 - 优化对比度和可区分性
  oracle: {
    chainlink: '#2563EB',
    pyth: '#7C3AED',
    api3: '#DB2777',
    redstone: '#FF6B6B',
    switchboard: '#4ECDC4',
    dia: '#6366F1',
    flux: '#F38181',
    winklink: '#FF4D4D',
    supra: '#14B8A6',
    twap: '#FF007A',
  } as const,

  // 预言机颜色 - 色盲友好版本（使用形状+颜色双重编码）
  oracleAccessible: {
    chainlink: { color: '#1e40af', pattern: 'solid' },
    pyth: { color: '#5b21b6', pattern: 'dashDot' },
    api3: { color: '#9d174d', pattern: 'longDash' },
    redstone: { color: '#dc2626', pattern: 'solid' },
    switchboard: { color: '#0d9488', pattern: 'dashed' },
    dia: { color: '#059669', pattern: 'dotted' },
    flux: { color: '#ea580c', pattern: 'dashDot' },
    winklink: { color: '#dc2626', pattern: 'dashed' },
    supra: { color: '#0d9488', pattern: 'dotted' },
    twap: { color: '#FF007A', pattern: 'longDash' },
  } as const,

  // 地区颜色
  region: {
    northAmerica: '#3B82F6',
    europe: '#8B5CF6',
    asia: '#10B981',
    southAmerica: '#F59E0B',
    africa: '#EF4444',
    oceania: '#06B6D4',
    other: '#64748b',
  },

  // 验证者类型颜色
  validator: {
    institution: '#8B5CF6',
    independent: '#3B82F6',
    community: '#10B981',
    exchange: '#F59E0B',
    delegator: '#06B6D4',
    unknown: '#64748b',
  },

  // 语义颜色（用于图表）
  semantic: {
    positive: '#10B981',
    negative: '#EF4444',
    neutral: '#64748b',
    warning: '#F59E0B',
    success: '#10B981',
    danger: '#EF4444',
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

  // 市场概览专用颜色
  marketOverview: {
    chainlink: '#375BD2',
    pyth: '#E6B800',
    api3: '#7CE3CB',
    supra: '#14B8A6',
    default: '#8884d8',
  },

  // 预言机颜色常量 (兼容旧代码)
  ORACLE_COLORS: {
    chainlink: '#375BD2',
    pyth: '#E6B800',
    api3: '#7CE3CB',
    supra: '#14B8A6',
    others: '#8884d8',
  },

  // 饼图颜色
  pie: {
    default: '#8884d8',
    stroke: {
      selected: '#ffffff',
      none: 'none',
    },
  },

  // 折线图网格和轴线
  lineChart: {
    grid: '#f3f4f6',
    axis: '#9ca3af',
  },

  // Recharts 图表常用颜色
  recharts: {
    // 网格线
    grid: '#e5e7eb',
    gridLight: '#E5E7EB',
    // 轴线
    axis: '#9ca3af',
    axisLight: '#9CA3AF',
    secondaryAxis: '#6b7280',
    // 刻度文字
    tick: '#6b7280',
    tickLight: '#6B7280',
    tickDark: '#374151',
    // 主色
    primary: '#3B82F6',
    primaryDark: '#2563eb',
    primaryLight: '#3b82f6',
    // 紫色
    purple: '#8B5CF6',
    purpleDark: '#7c3aed',
    // 状态色
    success: '#10B981',
    warning: '#f59e0b',
    danger: '#ef4444',
    // 橙色（用于中等风险）
    orange: '#f97316',
    // 其他
    cyan: '#06B6D4',
    teal: '#7CE3CB',
    pink: '#EC4899',
    magenta: '#FF4A8D',
    gold: '#E6B800',
    indigo: '#516BEB',
    chainlink: '#375BD2',
    // 背景
    background: '#f9fafb',
    backgroundLight: '#F3F4F6',
    // 边框
    border: '#d1d5db',
    borderLight: '#D1D5DB',
    // 白色
    white: '#ffffff',
    whiteLight: '#FFFFFF',
    // 透明
    none: 'none',
  },

  // RSI 技术指标颜色
  rsi: {
    line: '#8B5CF6',
    overbought: {
      line: '#EF4444',
      area: 'rgba(239, 68, 68, 0.1)',
    },
    oversold: {
      line: '#10B981',
      area: 'rgba(16, 185, 129, 0.1)',
    },
    neutral: '#6B7280',
  },

  // MACD 技术指标颜色
  macd: {
    line: '#3B82F6',
    signal: '#F59E0B',
    histogram: {
      positive: '#10B981',
      negative: '#EF4444',
    },
    zeroLine: '#9CA3AF',
  },

  // 图表颜色 - 用于 BentoMetricsGrid 等组件
  chart: {
    blue: '#3B82F6',
    blueLight: '#60A5FA',
    indigo: '#6366F1',
    indigoLight: '#818CF8',
    violet: '#8B5CF6',
    violetLight: '#A78BFA',
    amber: '#F59E0B',
    amberLight: '#FBBF24',
    emerald: '#10B981',
    emeraldLight: '#34D399',
    cyan: '#06B6D4',
    cyanLight: '#22D3EE',
  },
} as const;

// ============================================
// 阴影颜色
// ============================================

export const shadowColors = {
  soft: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  medium: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  strong: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  tooltip: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  card: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  cardHover: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  inputFocus: '0 0 0 3px rgba(59, 130, 246, 0.1)',
  glow: '0 0 20px rgba(59, 130, 246, 0.3)',
  pulse: '0 0 0 0 rgba(59, 130, 246, 0.4)',
} as const;

// ============================================
// 导出颜色常量
// ============================================

export const exportColors = {
  background: '#ffffff',
  text: {
    primary: '#1f2937',
    secondary: '#6b7280',
    muted: '#9ca3af',
  },
  canvas: {
    background: '#ffffff',
    textPrimary: '#111827',
    textSecondary: '#6b7280',
    grid: 'rgba(128, 128, 128, 0.15)',
    watermark: '#808080',
  },
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

  // 色盲友好的图表配色方案
  chart: {
    // 使用不同亮度和饱和度的颜色，确保可区分
    sequence: [
      '#003f5c', // 深蓝
      '#2f4b7c', // 中蓝
      '#665191', // 紫蓝
      '#a05195', // 紫色
      '#d45087', // 紫红
      '#f95d6a', // 粉红
      '#ff7c43', // 橙色
      '#ffa600', // 黄色
      '#00b4d8', // 青色
      '#e63946', // 红色 - WINkLink
    ],
    // 高对比度模式
    highContrast: [
      '#000000', // 黑
      '#e60000', // 红
      '#0073e6', // 蓝
      '#008a00', // 绿
      '#f5c400', // 黄
      '#e67300', // 橙
      '#9900e6', // 紫
      '#e6007a', // 粉
    ],
  },

  // 线条样式（用于色盲友好的双重编码）
  linePatterns: {
    solid: '0',
    dashed: '5 5',
    dotted: '1 3',
    dashDot: '10 3 3 3',
    longDash: '15 5',
  } as const,
} as const;

// ============================================
// WCAG AA 标准高对比度配色方案
// ============================================

export const wcagColors = {
  // WCAG AA 标准：文本与背景对比度至少 4.5:1
  // WCAG AAA 标准：文本与背景对比度至少 7:1

  // 高对比度文本颜色
  text: {
    // 浅色背景上的文本（对比度 >= 4.5:1）
    onLight: {
      primary: '#000000', // 黑色，对比度 21:1
      secondary: '#1a1a1a', // 深灰，对比度 ~18:1
      tertiary: '#333333', // 中深灰，对比度 ~12:1
      muted: '#595959', // 灰色，对比度 7:1 (AA)
      disabled: '#757575', // 禁用状态，对比度 4.6:1 (AA)
    },
    // 深色背景上的文本（对比度 >= 4.5:1）
    onDark: {
      primary: '#ffffff', // 白色，对比度 21:1
      secondary: '#f0f0f0', // 浅灰，对比度 ~18:1
      tertiary: '#e0e0e0', // 中浅灰，对比度 ~14:1
      muted: '#b3b3b3', // 灰色，对比度 7:1 (AA)
      disabled: '#949494', // 禁用状态，对比度 4.6:1 (AA)
    },
  },

  // 高对比度状态色（确保文本可读性）
  status: {
    success: {
      bg: '#006600', // 深绿背景
      text: '#ffffff', // 白字，对比度 7.5:1
      border: '#004d00',
      light: '#e6f4ea', // 浅绿背景
      lightText: '#1e4620', // 深绿字，对比度 8.6:1
    },
    warning: {
      bg: '#b35900', // 深橙背景
      text: '#ffffff', // 白字，对比度 5.2:1
      border: '#8f4700',
      light: '#fff3e0', // 浅橙背景
      lightText: '#663c00', // 深橙字，对比度 7.2:1
    },
    danger: {
      bg: '#cc0000', // 深红背景
      text: '#ffffff', // 白字，对比度 5.7:1
      border: '#a30000',
      light: '#fce8e8', // 浅红背景
      lightText: '#7f1d1d', // 深红字，对比度 8.4:1
    },
    info: {
      bg: '#005fcc', // 深蓝背景
      text: '#ffffff', // 白字，对比度 6.1:1
      border: '#004ba0',
      light: '#e8f4fd', // 浅蓝背景
      lightText: '#0c3b6e', // 深蓝字，对比度 8.9:1
    },
  },

  // 图表高对比度配色（WCAG AA 标准）
  chart: {
    // 主色序列 - 确保相邻颜色有足够对比度
    primary: [
      '#0033a0', // 深蓝
      '#d90000', // 深红
      '#008000', // 深绿
      '#b35900', // 深橙
      '#6b2c91', // 深紫
      '#c75b12', // 深棕橙
      '#005a9c', // 中蓝
      '#8b0000', // 暗红
    ],
    // 辅助色序列
    secondary: [
      '#4a4a4a', // 深灰
      '#707070', // 中灰
      '#969696', // 浅灰
      '#1a1a1a', // 近黑
    ],
    // 背景色
    background: {
      default: '#ffffff',
      subtle: '#f5f5f5',
      grid: '#e0e0e0',
    },
    // 轴线颜色
    axis: {
      line: '#595959',
      text: '#333333',
      grid: '#d9d9d9',
    },
  },

  // 焦点指示器（键盘导航可见性）
  focus: {
    outline: '#005fcc', // 蓝色焦点环
    outlineWidth: '3px',
    outlineOffset: '2px',
    boxShadow: '0 0 0 3px rgba(0, 95, 204, 0.4)',
  },

  // 链接颜色
  link: {
    default: '#005fcc', // 蓝色，对比度 6.1:1
    visited: '#6b2c91', // 紫色，对比度 7.2:1
    hover: '#003d7a', // 深蓝，对比度 8.4:1
    active: '#cc0000', // 红色，对比度 5.7:1
  },
} as const;

// ============================================
// 图表配色方案集合
// ============================================

export const chartColorSchemes = {
  // 默认配色
  default: chartColors.sequence,
  // 高对比度配色（WCAG AA）
  highContrast: wcagColors.chart.primary,
  // 色盲友好配色
  colorblind: accessibleColors.chart.sequence,
  // 深色主题配色
  dark: [
    '#60a5fa', // 浅蓝
    '#f87171', // 浅红
    '#4ade80', // 浅绿
    '#fbbf24', // 浅黄
    '#a78bfa', // 浅紫
    '#fb923c', // 浅橙
    '#22d3ee', // 青
    '#f472b6', // 粉
  ],
} as const;

// ============================================
// UI 组件颜色
// ============================================

export const uiColors = {
  button: {
    primary: {
      bg: '#2563eb',
      bgHover: '#1d4ed8',
      bgActive: '#1e40af',
      text: '#ffffff',
    },
    secondary: {
      bg: '#f3f4f6',
      bgHover: '#e5e7eb',
      bgActive: '#d1d5db',
      text: '#374151',
    },
  },
  card: {
    bg: '#ffffff',
    border: '#e5e7eb',
    borderHover: '#d1d5db',
    shadow: 'none',
    shadowHover: 'none',
  },
  input: {
    bg: '#ffffff',
    border: '#e5e7eb',
    text: '#111827',
    placeholder: '#9ca3af',
    focusBorder: '#3b82f6',
    focusShadow: 'none',
  },
  table: {
    headerBg: '#f9fafb',
    headerText: '#4b5563',
    border: '#e5e7eb',
    rowBorder: '#f3f4f6',
    rowHover: '#f9fafb',
  },
  scrollbar: {
    track: 'rgba(30, 64, 175, 0.1)',
    thumb: '#1e40af',
    thumbHover: '#3b82f6',
  },
} as const;

// ============================================
// 热力图颜色
// ============================================

export const heatmapColors = {
  deviation: {
    extremelyLow: '#10B981', // < 0.1%
    low: '#34D399', // 0.1-0.25%
    lower: '#6EE7B7', // 0.25-0.5%
    medium: '#FCD34D', // 0.5-0.75%
    higher: '#FBBF24', // 0.75-1%
    high: '#F59E0B', // 1-1.5%
    veryHigh: '#EF4444', // 1.5-2%
    extremelyHigh: '#DC2626', // 2-3%
    anomaly: '#B91C1C', // > 3%
    noData: '#F3F4F6',
  },
  oracle: {
    chainlink: '#375BD2',
    pythNetwork: '#EC4899',
    api3: '#10B981',
  },
  accessible: {
    chainlink: '#003f5c',
    pythNetwork: '#a05195',
    api3: '#d45087',
  },
} as const;

// ============================================
// 动画效果颜色
// ============================================

export const animationColors = {
  pulse: {
    primary: 'rgba(30, 64, 175, 0.1)',
    warning: 'rgba(251, 191, 36, 0.7)',
    warningTransparent: 'rgba(251, 191, 36, 0)',
  },
  glow: {
    primary: 'rgba(30, 64, 175, 0.4)',
  },
  fade: {
    overlay: 'rgba(0, 0, 0, 0.5)',
    cursor: 'rgba(0, 0, 0, 0.05)',
  },
  highlight: {
    primary: 'rgba(59, 130, 246, 0.15)',
    secondary: 'rgba(59, 130, 246, 0.05)',
  },
} as const;

// ============================================
// Tailwind 类名映射
// ============================================

// ============================================
// Tailwind 主题配置映射
// ============================================

// 颜色名称映射 - 将配置的颜色映射到 Tailwind 类名
const colorNames = {
  // 主色调
  primary: {
    50: 'blue-50',
    100: 'blue-100',
    200: 'blue-200',
    300: 'blue-300',
    400: 'blue-400',
    500: 'blue-500',
    600: 'blue-600',
    700: 'blue-700',
    800: 'blue-800',
    900: 'blue-900',
  },
  // 灰度
  gray: {
    50: 'gray-50',
    100: 'gray-100',
    200: 'gray-200',
    300: 'gray-300',
    400: 'gray-400',
    500: 'gray-500',
    600: 'gray-600',
    700: 'gray-700',
    800: 'gray-800',
    900: 'gray-900',
  },
  // Slate
  slate: {
    50: 'slate-50',
    100: 'slate-100',
    200: 'slate-200',
    300: 'slate-300',
    400: 'slate-400',
    500: 'slate-500',
    600: 'slate-600',
    700: 'slate-700',
    800: 'slate-800',
    900: 'slate-900',
  },
  // 语义色
  emerald: {
    50: 'emerald-50',
    500: 'emerald-500',
    600: 'emerald-600',
    700: 'emerald-700',
  },
  amber: {
    50: 'amber-50',
    500: 'amber-500',
    600: 'amber-600',
    700: 'amber-700',
  },
  red: {
    50: 'red-50',
    500: 'red-500',
    600: 'red-600',
    700: 'red-700',
  },
} as const;

// ============================================
// Tailwind 类名构建器
// ============================================

const createBgClass = (color: string) => `bg-${color}`;
const createTextClass = (color: string) => `text-${color}`;
const createBorderClass = (color: string) => `border-${color}`;
const createHoverBorderClass = (color: string) => `hover:border-${color}`;

// ============================================
// 基础 Tailwind 类名
// ============================================

const baseBgClasses = {
  primary: createBgClass(colorNames.primary[800]),
  secondary: createBgClass(colorNames.primary[500]),
  accent: createBgClass(colorNames.primary[400]),
  success: createBgClass(colorNames.emerald[500]),
  warning: createBgClass(colorNames.amber[500]),
  danger: createBgClass(colorNames.red[500]),
  neutral: createBgClass(colorNames.slate[500]),
  white: 'bg-white',
} as const;

const baseTextClasses = {
  primary: createTextClass(colorNames.gray[900]),
  secondary: createTextClass(colorNames.gray[700]),
  tertiary: createTextClass(colorNames.gray[600]),
  muted: createTextClass(colorNames.gray[500]),
  success: createTextClass(colorNames.emerald[600]),
  warning: createTextClass(colorNames.amber[600]),
  danger: createTextClass(colorNames.red[600]),
} as const;

const baseBorderClasses = {
  light: createBorderClass(colorNames.gray[200]),
  DEFAULT: createBorderClass(colorNames.gray[300]),
  dark: createBorderClass(colorNames.gray[400]),
} as const;

// ============================================
// 组合 Tailwind 类名
// ============================================

export const tailwindClasses = {
  // 背景色
  bg: baseBgClasses,

  // 文本色
  text: baseTextClasses,

  // 边框色
  border: baseBorderClasses,

  // 状态背景色（light 版本）
  statusBg: {
    success: createBgClass(colorNames.emerald[50]),
    warning: createBgClass(colorNames.amber[50]),
    danger: createBgClass(colorNames.red[50]),
    info: createBgClass(colorNames.primary[50]),
  },

  // 状态文本色
  statusText: {
    success: createTextClass(colorNames.emerald[700]),
    warning: createTextClass(colorNames.amber[700]),
    danger: createTextClass(colorNames.red[700]),
    info: createTextClass(colorNames.primary[700]),
  },

  // 过渡动画
  transition: {
    colors: 'transition-colors duration-200',
    all: 'transition-all duration-200',
  },

  // 边框基础类
  borderBase: {
    DEFAULT: 'border',
    bottom: 'border-b',
  },

  // 悬停效果 - 使用基础类名组合
  hover: {
    borderDark: createHoverBorderClass(colorNames.gray[400]),
  },

  // 鼠标样式
  cursor: {
    pointer: 'cursor-pointer',
  },

  // 间距
  spacing: {
    cardPadding: 'px-6 py-4',
  },

  // 字体
  font: {
    title: 'text-lg font-semibold',
  },
} as const;

// ============================================
// 辅助函数
// ============================================

/**
 * 获取涨跌颜色配置
 * 根据是否上涨返回对应的颜色配置，支持普通模式和色盲友好模式
 *
 * @param isPositive - 是否上涨（true 表示上涨，false 表示下跌）
 * @param useAccessible - 是否使用色盲友好颜色（默认为 false）
 * @returns 包含颜色、背景色和图标的配置对象
 * @example
 * ```typescript
 * const upColor = getPriceChangeColor(true); // 上涨颜色
 * const downColor = getPriceChangeColor(false, true); // 色盲友好下跌颜色
 * ```
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
 * 根据索引循环返回预设的颜色序列，用于多系列图表
 *
 * @param index - 颜色索引（从 0 开始）
 * @returns 对应索引的颜色值（hex 格式）
 * @example
 * ```typescript
 * const color1 = getChartSequenceColor(0); // '#3B82F6'（蓝色）
 * const color2 = getChartSequenceColor(8); // 循环回到第一个颜色
 * ```
 */
export function getChartSequenceColor(index: number): string {
  return chartColors.sequence[index % chartColors.sequence.length];
}

/**
 * 获取对比度安全的文本颜色
 * 根据背景色的亮度计算，返回黑色或白色文本以确保可读性
 *
 * 算法说明：
 * 使用 YIQ 亮度公式：brightness = (R * 299 + G * 587 + B * 114) / 1000
 * 亮度 > 128 返回深色文本，否则返回白色
 *
 * @param backgroundColor - 背景色（hex 格式，如 '#ffffff'）
 * @returns 适合的文本颜色（hex 格式）
 * @example
 * ```typescript
 * const textColor = getContrastTextColor('#ffffff'); // '#111827'（深色）
 * const textColor2 = getContrastTextColor('#000000'); // '#FFFFFF'（白色）
 * ```
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
  chain: chainColors,
  gradients,
  chart: chartColors,
  shadow: shadowColors,
  accessible: accessibleColors,
  wcag: wcagColors,
  chartSchemes: chartColorSchemes,
  tailwind: tailwindClasses,
  ui: uiColors,
  heatmap: heatmapColors,
  animation: animationColors,
  export: exportColors,
} as const;

export default colors;
