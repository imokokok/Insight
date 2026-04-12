/**
 * 专业热力图颜色方案
 * 提供高对比度、色盲友好的颜色渐变
 */

// 专业热力图配色 - 从绿到红的渐变
export const heatmapColorSchemes = {
  // 标准渐变：绿 -> 黄 -> 橙 -> 红
  standard: {
    low: '#10b981', //  emerald-500
    lowMedium: '#84cc16', // lime-500
    medium: '#eab308', // yellow-500
    mediumHigh: '#f97316', // orange-500
    high: '#ef4444', // red-500
    veryHigh: '#dc2626', // red-600
    extreme: '#991b1b', // red-800
  },
  // 高对比度版本
  highContrast: {
    low: '#059669', // emerald-600
    lowMedium: '#65a30d', // lime-600
    medium: '#ca8a04', // yellow-600
    mediumHigh: '#ea580c', // orange-600
    high: '#dc2626', // red-600
    veryHigh: '#b91c1c', // red-700
    extreme: '#7f1d1d', // red-900
  },
  // 色盲友好版本（使用蓝到红的渐变）
  colorblind: {
    low: '#3b82f6', // blue-500
    lowMedium: '#8b5cf6', // violet-500
    medium: '#a855f7', // purple-500
    mediumHigh: '#ec4899', // pink-500
    high: '#f43f5e', // rose-500
    veryHigh: '#e11d48', // rose-600
    extreme: '#be123c', // rose-700
  },
} as const;

/**
 * 获取专业热力图颜色
 * 使用平滑的渐变算法，根据数值在范围内的位置返回对应颜色
 * @param value - 当前数值
 * @param min - 最小值
 * @param max - 最大值
 * @param scheme - 颜色方案
 * @returns HEX 颜色值
 */
export function getProfessionalHeatmapColor(
  value: number,
  min: number,
  max: number,
  scheme: keyof typeof heatmapColorSchemes = 'standard'
): string {
  const colors = heatmapColorSchemes[scheme];
  const range = max - min;

  // 如果范围为零，返回中间颜色
  if (range === 0) {
    return colors.medium;
  }

  // 归一化到 0-1
  const normalized = Math.max(0, Math.min(1, (value - min) / range));

  // 根据归一化值选择颜色
  if (normalized < 0.17) return colors.low;
  if (normalized < 0.33) return colors.lowMedium;
  if (normalized < 0.5) return colors.medium;
  if (normalized < 0.67) return colors.mediumHigh;
  if (normalized < 0.83) return colors.high;
  if (normalized < 0.95) return colors.veryHigh;
  return colors.extreme;
}

/**
 * 获取平滑渐变的热力图颜色
 * 使用 HSL 颜色空间进行平滑插值
 * @param value - 当前数值
 * @param min - 最小值
 * @param max - 最大值
 * @returns HEX 颜色值
 */
export function getSmoothHeatmapColor(value: number, min: number, max: number): string {
  const range = max - min;
  if (range === 0) {
    return '#10b981'; // 默认绿色
  }

  // 归一化到 0-1
  const t = Math.max(0, Math.min(1, (value - min) / range));

  // HSL 插值：从绿色(145)到红色(0)
  // 调整色相曲线，让中间过渡更自然
  const hue = 145 * (1 - Math.pow(t, 0.8));
  const saturation = 70 + 10 * t; // 70% -> 80%
  const lightness = 50 - 10 * t; // 50% -> 40%

  return hslToHex(hue, saturation, lightness);
}

/**
 * HSL 转 HEX
 */
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0,
    g = 0,
    b = 0;

  if (h >= 0 && h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h >= 60 && h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h >= 120 && h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h >= 180 && h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h >= 240 && h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * 获取对比度安全的文本颜色
 * 根据背景色亮度返回黑色或白色文本
 * @param backgroundColor - 背景色 (HEX)
 * @returns 文本颜色 (HEX)
 */
export function getContrastColor(backgroundColor: string): string {
  // 移除 # 号
  const hex = backgroundColor.replace('#', '');

  // 解析 RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);

  // 计算亮度 (YIQ 公式)
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;

  // 亮度 > 128 返回深色，否则返回白色
  return brightness > 128 ? '#1f2937' : '#ffffff';
}

/**
 * 获取热力图单元格样式
 * @param percent - 百分比值
 * @param maxPercent - 最大百分比
 * @param isDiagonal - 是否对角线单元格
 * @returns 样式对象
 */
export function getHeatmapCellStyle(
  percent: number,
  maxPercent: number,
  isDiagonal: boolean = false
): {
  backgroundColor: string;
  color: string;
  borderColor?: string;
} {
  if (isDiagonal) {
    return {
      backgroundColor: '#f3f4f6',
      color: '#9ca3af',
    };
  }

  const bgColor = getSmoothHeatmapColor(percent, 0, maxPercent);
  const textColor = getContrastColor(bgColor);

  return {
    backgroundColor: bgColor,
    color: textColor,
    borderColor: 'rgba(255,255,255,0.2)',
  };
}

/**
 * 获取图例渐变样式
 * @param _maxValue - 最大值
 * @returns CSS 渐变字符串
 */
export function getLegendGradient(_maxValue: number): string {
  // 从绿色到红色的渐变
  return 'linear-gradient(to right, #10b981, #84cc16, #eab308, #f97316, #ef4444, #dc2626)';
}
