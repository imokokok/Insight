/**
 * 色盲友好配色方案
 * 支持红绿色盲、蓝黄色盲和全色盲用户
 * 使用颜色+图案/纹理的双重编码策略
 */

// ============================================
// 色盲类型定义
// ============================================

export type ColorBlindType =
  | 'normal'
  | 'deuteranopia'
  | 'protanopia'
  | 'tritanopia'
  | 'achromatopsia';

export interface ColorBlindConfig {
  type: ColorBlindType;
  name: string;
  description: string;
}

// ============================================
// 色盲友好配色方案
// ============================================

/**
 * 色盲安全配色方案
 * 这些颜色在各种色盲类型下都能保持可区分性
 */
export const colorBlindSafeColors = {
  // 主要色盲安全色（基于 ColorBrewer 2.0）
  primary: [
    '#1f77b4', // 蓝
    '#ff7f0e', // 橙
    '#2ca02c', // 绿
    '#d62728', // 红
    '#9467bd', // 紫
    '#8c564b', // 棕
    '#e377c2', // 粉
    '#7f7f7f', // 灰
    '#bcbd22', // 黄绿
    '#17becf', // 青
  ],

  // 高对比度色盲安全色
  highContrast: [
    '#000000', // 黑
    '#004488', // 深蓝
    '#ddaa33', // 金黄
    '#bb5566', // 玫瑰
    '#555555', // 中灰
  ],

  // 色盲友好的涨跌颜色
  priceChange: {
    up: {
      color: '#004488', // 深蓝（替代绿色）
      bg: '#e6f0ff',
      pattern: 'upArrow',
      icon: '▲',
      label: '上涨',
    },
    down: {
      color: '#bb5566', // 玫瑰色（替代红色）
      bg: '#ffe6ea',
      pattern: 'downArrow',
      icon: '▼',
      label: '下跌',
    },
    neutral: {
      color: '#555555',
      bg: '#f0f0f0',
      pattern: 'dash',
      icon: '—',
      label: '持平',
    },
  },

  // 状态颜色（色盲友好）
  status: {
    success: {
      color: '#004488',
      bg: '#e6f0ff',
      pattern: 'check',
      icon: '✓',
    },
    warning: {
      color: '#ddaa33',
      bg: '#fff8e6',
      pattern: 'triangle',
      icon: '⚠',
    },
    error: {
      color: '#bb5566',
      bg: '#ffe6ea',
      pattern: 'cross',
      icon: '✕',
    },
    info: {
      color: '#004488',
      bg: '#e6f0ff',
      pattern: 'info',
      icon: 'ℹ',
    },
  },
} as const;

// ============================================
// 图案/纹理配置
// ============================================

export type PatternType =
  | 'solid'
  | 'striped'
  | 'dotted'
  | 'crossHatch'
  | 'diagonal'
  | 'checkerboard'
  | 'waves';

export interface PatternConfig {
  type: PatternType;
  name: string;
  description: string;
  // SVG pattern definition
  svgPattern: string;
}

/**
 * 图案填充配置
 * 用于在图表中提供除颜色外的第二重视觉编码
 */
export const patternFills: Record<PatternType, PatternConfig> = {
  solid: {
    type: 'solid',
    name: '纯色',
    description: '纯色填充，无图案',
    svgPattern: '',
  },
  striped: {
    type: 'striped',
    name: '条纹',
    description: '斜条纹图案',
    svgPattern: `
      <pattern id="striped" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(45)">
        <rect width="4" height="8" fill="currentColor" opacity="0.3"/>
      </pattern>
    `,
  },
  dotted: {
    type: 'dotted',
    name: '点状',
    description: '点状图案',
    svgPattern: `
      <pattern id="dotted" patternUnits="userSpaceOnUse" width="8" height="8">
        <circle cx="2" cy="2" r="1.5" fill="currentColor" opacity="0.4"/>
        <circle cx="6" cy="6" r="1.5" fill="currentColor" opacity="0.4"/>
      </pattern>
    `,
  },
  crossHatch: {
    type: 'crossHatch',
    name: '交叉网格',
    description: '交叉线网格图案',
    svgPattern: `
      <pattern id="crossHatch" patternUnits="userSpaceOnUse" width="8" height="8">
        <path d="M0,8 L8,0 M-2,2 L2,-2 M6,10 L10,6" stroke="currentColor" stroke-width="1" opacity="0.3"/>
      </pattern>
    `,
  },
  diagonal: {
    type: 'diagonal',
    name: '对角线',
    description: '对角线图案',
    svgPattern: `
      <pattern id="diagonal" patternUnits="userSpaceOnUse" width="10" height="10" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="10" stroke="currentColor" stroke-width="2" opacity="0.3"/>
      </pattern>
    `,
  },
  checkerboard: {
    type: 'checkerboard',
    name: '棋盘格',
    description: '棋盘格图案',
    svgPattern: `
      <pattern id="checkerboard" patternUnits="userSpaceOnUse" width="8" height="8">
        <rect x="0" y="0" width="4" height="4" fill="currentColor" opacity="0.3"/>
        <rect x="4" y="4" width="4" height="4" fill="currentColor" opacity="0.3"/>
      </pattern>
    `,
  },
  waves: {
    type: 'waves',
    name: '波浪',
    description: '波浪线图案',
    svgPattern: `
      <pattern id="waves" patternUnits="userSpaceOnUse" width="12" height="8">
        <path d="M0,4 Q3,0 6,4 T12,4" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
      </pattern>
    `,
  },
} as const;

// ============================================
// 预言机色盲友好配色
// ============================================

export const oracleColorBlindFriendly = {
  chainlink: {
    color: '#004488',
    pattern: 'solid',
    symbol: '●',
    description: '蓝色实心圆',
  },
  'band-protocol': {
    color: '#ddaa33',
    pattern: 'striped',
    symbol: '▲',
    description: '黄色条纹三角形',
  },
  uma: {
    color: '#bb5566',
    pattern: 'dotted',
    symbol: '■',
    description: '玫瑰色点状方块',
  },
  pyth: {
    color: '#555555',
    pattern: 'crossHatch',
    symbol: '◆',
    description: '灰色交叉菱形',
  },
  api3: {
    color: '#1f77b4',
    pattern: 'diagonal',
    symbol: '★',
    description: '蓝色对角线星形',
  },
  redstone: {
    color: '#ff7f0e',
    pattern: 'checkerboard',
    symbol: '●',
    description: '橙色棋盘圆',
  },
  switchboard: {
    color: '#2ca02c',
    pattern: 'waves',
    symbol: '▲',
    description: '绿色波浪三角形',
  },
  dia: {
    color: '#9467bd',
    pattern: 'solid',
    symbol: '■',
    description: '紫色实心方块',
  },
  flux: {
    color: '#8c564b',
    pattern: 'striped',
    symbol: '◆',
    description: '棕色条纹菱形',
  },
  tellor: {
    color: '#e377c2',
    pattern: 'dotted',
    symbol: '★',
    description: '粉色点状星形',
  },
  chronicle: {
    color: '#7f7f7f',
    pattern: 'crossHatch',
    symbol: '●',
    description: '灰色交叉圆',
  },
  winklink: {
    color: '#bcbd22',
    pattern: 'diagonal',
    symbol: '▲',
    description: '黄绿对角线三角形',
  },
} as const;

// ============================================
// 线条样式配置
// ============================================

export const lineStyles = {
  solid: {
    strokeDasharray: '0',
    strokeWidth: 2,
    description: '实线',
  },
  dashed: {
    strokeDasharray: '8 4',
    strokeWidth: 2,
    description: '虚线',
  },
  dotted: {
    strokeDasharray: '2 3',
    strokeWidth: 2,
    description: '点线',
  },
  dashDot: {
    strokeDasharray: '8 3 2 3',
    strokeWidth: 2,
    description: '点划线',
  },
  longDash: {
    strokeDasharray: '12 6',
    strokeWidth: 2,
    description: '长虚线',
  },
  double: {
    strokeDasharray: '0',
    strokeWidth: 4,
    description: '双线',
  },
} as const;

// ============================================
// 辅助函数
// ============================================

/**
 * 获取色盲友好的颜色配置
 * @param index - 颜色索引
 * @returns 颜色配置对象
 */
export function getColorBlindSafeColor(index: number): string {
  return colorBlindSafeColors.primary[index % colorBlindSafeColors.primary.length];
}

/**
 * 获取图案配置
 * @param type - 图案类型
 * @returns 图案配置
 */
export function getPatternConfig(type: PatternType): PatternConfig {
  return patternFills[type];
}

/**
 * 获取预言机的色盲友好配置
 * @param oracleName - 预言机名称
 * @returns 色盲友好配置
 */
export function getOracleColorBlindConfig(oracleName: keyof typeof oracleColorBlindFriendly) {
  return (
    oracleColorBlindFriendly[oracleName] || {
      color: '#555555',
      pattern: 'solid' as PatternType,
      symbol: '●',
      description: '默认配置',
    }
  );
}

/**
 * 生成 SVG 图案定义
 * @param patterns - 需要生成的图案类型数组
 * @returns SVG 字符串
 */
export function generateSvgPatterns(patterns: PatternType[]): string {
  const defs = patterns
    .map((type) => patternFills[type]?.svgPattern || '')
    .filter(Boolean)
    .join('\n');

  return `<defs>\n${defs}\n</defs>`;
}

/**
 * 获取线条样式
 * @param index - 样式索引
 * @returns 线条样式配置
 */
export function getLineStyleByIndex(index: number): (typeof lineStyles)[keyof typeof lineStyles] {
  const keys = Object.keys(lineStyles) as (keyof typeof lineStyles)[];
  return lineStyles[keys[index % keys.length]];
}

/**
 * 生成色盲友好的图表配置
 * @param dataCount - 数据系列数量
 * @returns 图表配置数组
 */
export function generateAccessibleChartConfig(dataCount: number): Array<{
  color: string;
  pattern: PatternType;
  lineStyle: keyof typeof lineStyles;
  symbol: string;
}> {
  const patterns: PatternType[] = [
    'solid',
    'striped',
    'dotted',
    'crossHatch',
    'diagonal',
    'checkerboard',
    'waves',
  ];
  const lineStyleKeys = Object.keys(lineStyles) as (keyof typeof lineStyles)[];
  const symbols = ['●', '▲', '■', '◆', '★', '◉', '◇', '○'];

  return Array.from({ length: dataCount }, (_, i) => ({
    color: getColorBlindSafeColor(i),
    pattern: patterns[i % patterns.length],
    lineStyle: lineStyleKeys[i % lineStyleKeys.length],
    symbol: symbols[i % symbols.length],
  }));
}

// ============================================
// 色盲模拟器配置
// ============================================

export const colorBlindSimulations: Record<
  ColorBlindType,
  { matrix: number[]; description: string }
> = {
  normal: {
    matrix: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    description: '正常视觉',
  },
  deuteranopia: {
    // 绿色盲
    matrix: [0.43, 0.72, -0.15, 0, 0.34, 0.57, 0.09, 0, -0.02, 0.03, 1, 0, 0, 0, 0, 1],
    description: '绿色盲（Deuteranopia）- 难以区分红绿色',
  },
  protanopia: {
    // 红色盲
    matrix: [0.57, 0.43, 0, 0, 0.56, 0.44, 0, 0, 0, 0.24, 0.76, 0, 0, 0, 0, 1],
    description: '红色盲（Protanopia）- 难以区分红绿色',
  },
  tritanopia: {
    // 蓝色盲
    matrix: [0.95, 0.05, 0, 0, 0, 0.43, 0.57, 0, 0, 0.48, 0.52, 0, 0, 0, 0, 1],
    description: '蓝色盲（Tritanopia）- 难以区分蓝黄色',
  },
  achromatopsia: {
    // 全色盲
    matrix: [0.3, 0.59, 0.11, 0, 0.3, 0.59, 0.11, 0, 0.3, 0.59, 0.11, 0, 0, 0, 0, 1],
    description: '全色盲（Achromatopsia）- 只能看到灰度',
  },
};

// ============================================
// 导出默认对象
// ============================================

export const colorBlindFriendly = {
  colors: colorBlindSafeColors,
  patterns: patternFills,
  oracleColors: oracleColorBlindFriendly,
  lineStyles,
  simulations: colorBlindSimulations,
} as const;

export default colorBlindFriendly;
