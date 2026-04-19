/**
 * Unified color configuration file
 * Centrally manage all colors in the project, avoid hardcoding
 */

// ============================================
// Type definitions
// ============================================

/**
 * Color scale type (50-900)
 */
interface ColorScale {
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
 * Semantic color type
 */
interface SemanticColor {
  light: string;
  DEFAULT: string;
  dark: string;
  text: string;
  main: string;
}

/**
 * Shadow color type
 */
interface ShadowColor {
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
// Base color system
// ============================================

export const baseColors = {
  // Primary tone - Finance blue series
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

  // Neutral - Grayscale
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

  // Slate gray - For text
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
// Semantic colors
// ============================================

export const semanticColors = {
  // Status colors
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
// Finance theme colors
// ============================================

const financeColors = {
  primary: baseColors.primary[800],
  secondary: baseColors.primary[500],
  accent: baseColors.primary[400],
  success: semanticColors.success.DEFAULT,
  warning: semanticColors.warning.DEFAULT,
  danger: semanticColors.danger.DEFAULT,
  neutral: semanticColors.neutral.DEFAULT,
} as const;

// ============================================
// Blockchain brand colors
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
  flare: '#E84142',
  stellar: '#14B8A6',
} as const;

// ============================================
// Gradient definitions
// ============================================

const gradients = {
  blue: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%)',
  green: 'linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)',
  purple: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 50%, #a78bfa 100%)',
  gold: 'linear-gradient(135deg, #d97706 0%, #f59e0b 50%, #fbbf24 100%)',
  red: 'linear-gradient(135deg, #dc2626 0%, #ef4444 50%, #f87171 100%)',
} as const;

// ============================================
// Chart color configuration
// ============================================

export const chartColors = {
  // Oracle brand colors - Optimized for contrast and distinguishability
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
    reflector: '#F59E0B',
    flare: '#E84142',
  } as const,

  // Oracle colors - Colorblind-friendly version (using shape + color dual encoding)
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
    reflector: { color: '#d97706', pattern: 'dashDot' },
    flare: { color: '#E84142', pattern: 'dotted' },
  } as const,

  // Region colors
  region: {
    northAmerica: '#3B82F6',
    europe: '#8B5CF6',
    asia: '#10B981',
    southAmerica: '#F59E0B',
    africa: '#EF4444',
    oceania: '#06B6D4',
    other: '#64748b',
  },

  // Validator type colors
  validator: {
    institution: '#8B5CF6',
    independent: '#3B82F6',
    community: '#10B981',
    exchange: '#F59E0B',
    delegator: '#06B6D4',
    unknown: '#64748b',
  },

  // Semantic colors (for charts)
  semantic: {
    positive: '#10B981',
    negative: '#EF4444',
    neutral: '#64748b',
    warning: '#F59E0B',
    success: '#10B981',
    danger: '#EF4444',
  },

  // Chart grid and axis colors
  grid: {
    line: '#E5E7EB',
    axis: '#6B7280',
    background: '#FFFFFF',
  },

  // General chart color sequence
  sequence: [
    '#3B82F6', // Blue
    '#10B981', // Green
    '#F59E0B', // Orange
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#06B6D4', //
    '#F97316', // Orange
    '#84CC16', // Green
  ],

  // Market overview specific colors
  marketOverview: {
    chainlink: '#375BD2',
    pyth: '#E6B800',
    api3: '#7CE3CB',
    supra: '#14B8A6',
    default: '#8884d8',
  },

  // Oracle color constants (backward compatible)
  ORACLE_COLORS: {
    chainlink: '#375BD2',
    pyth: '#E6B800',
    api3: '#7CE3CB',
    supra: '#14B8A6',
    others: '#8884d8',
  },

  // Pie chart colors
  pie: {
    default: '#8884d8',
    stroke: {
      selected: '#ffffff',
      none: 'none',
    },
  },

  // Line chart grid and axis
  lineChart: {
    grid: '#f3f4f6',
    axis: '#9ca3af',
  },

  // Recharts common chart colors
  recharts: {
    // Grid lines
    grid: '#e5e7eb',
    gridLight: '#E5E7EB',
    // Axis lines
    axis: '#9ca3af',
    axisLight: '#9CA3AF',
    secondaryAxis: '#6b7280',
    // Tick text
    tick: '#6b7280',
    tickLight: '#6B7280',
    tickDark: '#374151',
    // Primary
    primary: '#3B82F6',
    primaryDark: '#2563eb',
    primaryLight: '#3b82f6',
    // Purple
    purple: '#8B5CF6',
    purpleDark: '#7c3aed',
    // Status colors
    success: '#10B981',
    warning: '#f59e0b',
    danger: '#ef4444',
    // Orange (for medium risk)
    orange: '#f97316',
    // Other
    cyan: '#06B6D4',
    teal: '#7CE3CB',
    pink: '#EC4899',
    magenta: '#FF4A8D',
    gold: '#E6B800',
    indigo: '#516BEB',
    chainlink: '#375BD2',
    // Background
    background: '#f9fafb',
    backgroundLight: '#F3F4F6',
    // Border
    border: '#d1d5db',
    borderLight: '#D1D5DB',
    // White
    white: '#ffffff',
    whiteLight: '#FFFFFF',
    // Transparent
    none: 'none',
  },

  // RSI technical indicator colors
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

  // MACD technical indicator colors
  macd: {
    line: '#3B82F6',
    signal: '#F59E0B',
    histogram: {
      positive: '#10B981',
      negative: '#EF4444',
    },
    zeroLine: '#9CA3AF',
  },

  // Chart colors - For BentoMetricsGrid and similar components
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
// Shadow colors
// ============================================

const shadowColors = {
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
// Export color constants
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
// Accessibility colors (colorblind-friendly)
// ============================================

export const accessibleColors = {
  // Colorblind-friendly price change colors
  priceChange: {
    up: {
      color: '#1e40af', // Blue (replacing green)
      bg: '#dbeafe',
      icon: '↑',
    },
    down: {
      color: '#d97706', // Orange (replacing red)
      bg: '#fef3c7',
      icon: '↓',
    },
  },

  // High contrast text colors
  text: {
    primary: '#111827', // gray-900
    secondary: '#374151', // gray-700
    tertiary: '#4b5563', // gray-600
    muted: '#6b7280', // gray-500
    placeholder: '#9ca3af', // gray-400
  },

  // Colorblind-friendly chart color scheme
  chart: {
    // Use colors with different brightness and saturation to ensure distinguishability
    sequence: [
      '#003f5c', // Dark blue
      '#2f4b7c', // Medium blue
      '#665191', // Purple-blue
      '#a05195', // Purple
      '#d45087', // Magenta
      '#f95d6a', // Pink
      '#ff7c43', // Orange
      '#ffa600', // Yellow
      '#00b4d8', // Cyan
      '#e63946', // Red - WINkLink
    ],
    // High contrast mode
    highContrast: [
      '#000000', // Black
      '#e60000', // Red
      '#0073e6', // Blue
      '#008a00', // Green
      '#f5c400', // Yellow
      '#e67300', // Orange
      '#9900e6', // Purple
      '#e6007a', // Pink
    ],
  },

  // Line patterns (for colorblind-friendly dual encoding)
  linePatterns: {
    solid: '0',
    dashed: '5 5',
    dotted: '1 3',
    dashDot: '10 3 3 3',
    longDash: '15 5',
  } as const,
} as const;

// ============================================
// WCAG AA standard high contrast color scheme
// ============================================

const wcagColors = {
  // WCAG AA standard: text and background contrast ratio 4.5:1
  // WCAG AAA standard: text and background contrast ratio 7:1

  // High contrast text colors
  text: {
    // Background on text (for >= 4.5:1)
    onLight: {
      primary: '#000000',
      secondary: '#1a1a1a',
      tertiary: '#333333',
      muted: '#595959',
      disabled: '#757575',
    },
  },

  // Status colors (ensure text readability)
  status: {
    success: {
      bg: '#006600', // Green background
      text: '#ffffff', // White text, contrast 7.5:1
      border: '#004d00',
      light: '#e6f4ea', // Green background
      lightText: '#1e4620', // Green, for 8.6:1
    },
    warning: {
      bg: '#b35900', // Orange background
      text: '#ffffff', // White text, contrast 5.2:1
      border: '#8f4700',
      light: '#fff3e0', // Orange background
      lightText: '#663c00', // Orange, for 7.2:1
    },
    danger: {
      bg: '#cc0000', // Red background
      text: '#ffffff', // White text, contrast 5.7:1
      border: '#a30000',
      light: '#fce8e8', // Red background
      lightText: '#7f1d1d', // Red, for 8.4:1
    },
    info: {
      bg: '#005fcc', // Dark blue background
      text: '#ffffff', // White text, contrast 6.1:1
      border: '#004ba0',
      light: '#e8f4fd', // Blue background
      lightText: '#0c3b6e', // Dark blue, for 8.9:1
    },
  },

  // Chart high contrast colors (WCAG AA standard)
  chart: {
    // Primary - ensure colors have sufficient contrast
    primary: [
      '#0033a0', // Dark blue
      '#d90000', // Red
      '#008000', // Green
      '#b35900', // Orange
      '#6b2c91', // Purple
      '#c75b12', // Orange
      '#005a9c', // Medium blue
      '#8b0000', // Red
    ],
    // Secondary color sequence
    secondary: [
      '#4a4a4a', // Dark gray
      '#707070', // Medium gray
      '#969696', // Light gray
      '#1a1a1a', // Black
    ],
    // Background
    background: {
      default: '#ffffff',
      subtle: '#f5f5f5',
      grid: '#e0e0e0',
    },
    // Axis lines color
    axis: {
      line: '#595959',
      text: '#333333',
      grid: '#d9d9d9',
    },
  },

  // Focus indicator (keyboard navigation visibility)
  focus: {
    outline: '#005fcc', // Blue
    outlineWidth: '3px',
    outlineOffset: '2px',
    boxShadow: '0 0 0 3px rgba(0, 95, 204, 0.4)',
  },

  // Link colors
  link: {
    default: '#005fcc', // Blue, for 6.1:1
    visited: '#6b2c91', // Purple, for 7.2:1
    hover: '#003d7a', // Dark blue, for 8.4:1
    active: '#cc0000', // Red, for 5.7:1
  },
} as const;

// ============================================
// Chart color scheme collection
// ============================================

const chartColorSchemes = {
  default: chartColors.sequence,
  highContrast: wcagColors.chart.primary,
  colorblind: accessibleColors.chart.sequence,
} as const;

// ============================================
// UI component colors
// ============================================

const uiColors = {
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
// Heatmap colors
// ============================================

const heatmapColors = {
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
// Animation effect colors
// ============================================

const animationColors = {
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
// Tailwind class name mapping
// ============================================

// ============================================
// Tailwind theme configuration mapping
// ============================================

// Color name mapping - Map configured colors to Tailwind class names
const colorNames = {
  // Primary
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
  // Grayscale
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
  // Semantic colors
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
// Tailwind class name builder
// ============================================

const createBgClass = (color: string) => `bg-${color}`;
const createTextClass = (color: string) => `text-${color}`;
const createBorderClass = (color: string) => `border-${color}`;
const createHoverBorderClass = (color: string) => `hover:border-${color}`;

// ============================================
// Base Tailwind class names
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
// Combined Tailwind class names
// ============================================

const tailwindClasses = {
  // Background
  bg: baseBgClasses,

  // Text
  text: baseTextClasses,

  // Border
  border: baseBorderClasses,

  // stateBackground（light version）
  statusBg: {
    success: createBgClass(colorNames.emerald[50]),
    warning: createBgClass(colorNames.amber[50]),
    danger: createBgClass(colorNames.red[50]),
    info: createBgClass(colorNames.primary[50]),
  },

  // stateText
  statusText: {
    success: createTextClass(colorNames.emerald[700]),
    warning: createTextClass(colorNames.amber[700]),
    danger: createTextClass(colorNames.red[700]),
    info: createTextClass(colorNames.primary[700]),
  },

  // Transitions
  transition: {
    colors: 'transition-colors duration-200',
    all: 'transition-all duration-200',
  },

  // Borderclass
  borderBase: {
    DEFAULT: 'border',
    bottom: 'border-b',
  },

  // Hover effects - Using base class name combinations
  hover: {
    borderDark: createHoverBorderClass(colorNames.gray[400]),
  },

  // Cursor
  cursor: {
    pointer: 'cursor-pointer',
  },

  // Spacing
  spacing: {
    cardPadding: 'px-6 py-4',
  },

  // Font
  font: {
    title: 'text-lg font-semibold',
  },
} as const;

// ============================================
// Helper functions
// ============================================

/**
 * Get color configuration for price changes
 * Returns color configuration based on whether price is up or down
 *
 * @param isPositive - Whether price is up (true = up, false = down)
 * @param useAccessible - Whether to use colorblind-friendly colors (defaults to false)
 * @returns Object containing color, background, and icon configuration
 * @example
 * ```typescript
 * const upColor = getPriceChangeColor(true); // up color
 * const downColor = getPriceChangeColor(false, true); // down color
 * ```
 */
function getPriceChangeColor(
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
 * Get color from chart sequence
 * Returns a color from the sequence based on index, cycling through colors
 *
 * @param index - Color index (starting from 0)
 * @returns Color value for the given index (hex format)
 * @example
 * ```typescript
 * const color1 = getChartSequenceColor(0); // '#3B82F6' (Blue)
 * const color2 = getChartSequenceColor(8); // Cycles back to the first color
 * ```
 */
function getChartSequenceColor(index: number): string {
  return chartColors.sequence[index % chartColors.sequence.length];
}

/**
 * Get contrast text color
 * Calculates and returns black or white text color based on background to ensure readability
 *
 * Algorithm:
 * Use YIQ: brightness = (R * 299 + G * 587 + B * 114) / 1000
 * > 128 return black text, otherwise return white
 *
 * @param backgroundColor - Background color (hex format, e.g. '#ffffff')
 * @returns Text color (hex format)
 * @example
 * ```typescript
 * const textColor = getContrastTextColor('#ffffff'); // '#111827' (dark)
 * const textColor2 = getContrastTextColor('#000000'); // '#FFFFFF' (white)
 * ```
 */
function getContrastTextColor(backgroundColor: string): string {
  // Simple brightness calculation
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  return brightness > 128 ? baseColors.gray[900] : '#FFFFFF';
}

// ============================================
// Export default object
// ============================================

const colors = {
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
