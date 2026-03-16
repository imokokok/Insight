/**
 * 统一颜色配置文件
 * 集中管理项目中所有颜色，避免硬编码
 */

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
    'band-protocol': '#059669',
    uma: '#D97706',
    pyth: '#7C3AED',
    api3: '#DB2777',
    redstone: '#FF6B6B',
    switchboard: '#4ECDC4',
    dia: '#6366F1',
    flux: '#F38181',
    tellor: '#AA96DA',
    chronicle: '#E11D48',
    winklink: '#FF4D4D',
  } as const,

  // 预言机颜色 - 色盲友好版本（使用形状+颜色双重编码）
  oracleAccessible: {
    chainlink: { color: '#1e40af', pattern: 'solid' },
    'band-protocol': { color: '#065f46', pattern: 'dashed' },
    uma: { color: '#92400e', pattern: 'dotted' },
    pyth: { color: '#5b21b6', pattern: 'dashDot' },
    api3: { color: '#9d174d', pattern: 'longDash' },
    redstone: { color: '#dc2626', pattern: 'solid' },
    switchboard: { color: '#0d9488', pattern: 'dashed' },
    dia: { color: '#059669', pattern: 'dotted' },
    flux: { color: '#ea580c', pattern: 'dashDot' },
    tellor: { color: '#7c3aed', pattern: 'longDash' },
    chronicle: { color: '#be123c', pattern: 'solid' },
    winklink: { color: '#dc2626', pattern: 'dashed' },
  } as const,

  // UMA 请求类型颜色
  umaRequestType: {
    price: '#3b82f6',
    state: '#10b981',
    liquidation: '#f59e0b',
    other: '#64748b',
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
    band: '#516BEB',
    api3: '#7CE3CB',
    uma: '#FF4A8D',
    default: '#8884d8',
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
  soft: '0 4px 20px -2px rgba(30, 64, 175, 0.1)',
  medium: '0 8px 30px -4px rgba(30, 64, 175, 0.15)',
  strong: '0 12px 40px -6px rgba(30, 64, 175, 0.2)',
  tooltip: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
  card: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  cardHover: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  inputFocus: '0 0 0 2px rgba(59, 130, 246, 0.5)',
  glow: '0 0 20px rgba(30, 64, 175, 0.4)',
  pulse: '0 0 0 0 rgba(251, 191, 36, 0.7)',
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
      '#00b4d8', // 青色 - Chronicle
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
    shadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    shadowHover: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  },
  input: {
    bg: '#ffffff',
    border: '#e5e7eb',
    text: '#111827',
    placeholder: '#9ca3af',
    focusBorder: '#3b82f6',
    focusShadow: '0 0 0 2px #3b82f6',
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
    extremelyLow: '#10B981',    // < 0.1%
    low: '#34D399',             // 0.1-0.25%
    lower: '#6EE7B7',           // 0.25-0.5%
    medium: '#FCD34D',          // 0.5-0.75%
    higher: '#FBBF24',          // 0.75-1%
    high: '#F59E0B',            // 1-1.5%
    veryHigh: '#EF4444',        // 1.5-2%
    extremelyHigh: '#DC2626',   // 2-3%
    anomaly: '#B91C1C',         // > 3%
    noData: '#F3F4F6',
  },
  oracle: {
    chainlink: '#375BD2',
    bandProtocol: '#9B51E0',
    uma: '#FF6B6B',
    pythNetwork: '#EC4899',
    api3: '#10B981',
  },
  accessible: {
    chainlink: '#003f5c',
    bandProtocol: '#2f4b7c',
    uma: '#665191',
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
  chain: chainColors,
  gradients,
  chart: chartColors,
  shadow: shadowColors,
  accessible: accessibleColors,
  tailwind: tailwindClasses,
  ui: uiColors,
  heatmap: heatmapColors,
  animation: animationColors,
  export: exportColors,
} as const;

export default colors;
