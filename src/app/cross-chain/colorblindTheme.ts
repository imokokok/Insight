/**
 * 色盲友好配色方案
 * 使用蓝-黄配色替代传统的绿-红配色，适合红绿色盲用户
 */

// 蓝-黄色盲友好配色梯度
// 低值 -> 蓝色，高值 -> 黄色/橙色
export const colorblindHeatmapGradient = [
  '#3b82f6', // 蓝色 - 低值
  '#60a5fa',
  '#93c5fd',
  '#fef08a',
  '#fde047',
  '#fbbf24',
  '#f59e0b',
  '#d97706', // 深黄/橙色 - 高值
];

/**
 * 获取色盲友好模式的热力图颜色
 * @param percent 百分比值 (0 - maxPercent)
 * @param maxPercent 最大百分比值
 * @returns 颜色字符串
 */
export const getColorblindHeatmapColor = (percent: number, maxPercent: number): string => {
  if (maxPercent === 0) return colorblindHeatmapGradient[0];

  const normalizedValue = Math.min(percent / maxPercent, 1);
  const index = Math.floor(normalizedValue * (colorblindHeatmapGradient.length - 1));
  return colorblindHeatmapGradient[Math.min(index, colorblindHeatmapGradient.length - 1)];
};

/**
 * 获取色盲友好模式的相关性矩阵颜色
 * 使用蓝-黄配色，负相关为蓝色，正相关为黄色
 * @param correlation 相关系数 (-1 到 1)
 * @returns 颜色字符串
 */
export const getColorblindCorrelationColor = (correlation: number): string => {
  const clampedCorrelation = Math.max(-1, Math.min(1, correlation));

  if (clampedCorrelation >= 0) {
    // 正相关: 白色 -> 黄色
    const t = clampedCorrelation;
    const r = Math.floor(255 - (255 - 251) * t); // 255 -> 251
    const g = Math.floor(255 - (255 - 191) * t); // 255 -> 191
    const b = Math.floor(255 - (255 - 36) * t); // 255 -> 36
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // 负相关: 白色 -> 蓝色
    const t = Math.abs(clampedCorrelation);
    const r = Math.floor(255 - (255 - 59) * t); // 255 -> 59
    const g = Math.floor(255 - (255 - 130) * t); // 255 -> 130
    const b = Math.floor(255 - (255 - 246) * t); // 255 -> 246
    return `rgb(${r}, ${g}, ${b})`;
  }
};

/**
 * 获取相关性矩阵单元格的尺寸（用于形状编码）
 * 相关系数绝对值越大，单元格尺寸越大
 * @param correlation 相关系数 (-1 到 1)
 * @returns 尺寸比例 (0.6 - 1.0)
 */
export const getCorrelationSizeScale = (correlation: number): number => {
  const absCorrelation = Math.abs(correlation);
  // 基础尺寸 0.6，根据相关性增加，最大 1.0
  return 0.6 + absCorrelation * 0.4;
};

/**
 * 获取色盲友好模式的差异颜色
 * @param diffPercent 差异百分比
 * @returns 背景色和文字色
 */
export const getColorblindDiffColor = (diffPercent: number): { bg: string; text: string } => {
  const absPercent = Math.abs(diffPercent);

  if (absPercent <= 0.5) {
    return { bg: 'transparent', text: '#6b7280' };
  }

  // 使用蓝色表示负差异，黄色/橙色表示正差异
  if (diffPercent > 0.5) {
    // 正差异 - 黄色/橙色
    const intensity = Math.min((diffPercent - 0.5) / 2, 1);
    const r = Math.floor(254 + (217 - 254) * intensity);
    const g = Math.floor(240 + (119 - 240) * intensity);
    const b = Math.floor(219 + (6 - 219) * intensity);
    return {
      bg: `rgba(${r}, ${g}, ${b}, 0.2)`,
      text: intensity > 0.5 ? '#b45309' : '#d97706',
    };
  } else {
    // 负差异 - 蓝色
    const intensity = Math.min((-diffPercent - 0.5) / 2, 1);
    const r = Math.floor(219 + (30 - 219) * intensity);
    const g = Math.floor(234 + (64 - 234) * intensity);
    const b = Math.floor(254 + (175 - 254) * intensity);
    return {
      bg: `rgba(${r}, ${g}, ${b}, 0.2)`,
      text: intensity > 0.5 ? '#1e40af' : '#3b82f6',
    };
  }
};

/**
 * 色盲友好模式的颜色图例配置
 */
export const colorblindLegendConfig = {
  heatmap: {
    lowColor: '#3b82f6',
    highColor: '#d97706',
    lowLabel: '低差异',
    highLabel: '高差异',
  },
  correlation: {
    negativeColor: '#3b82f6',
    positiveColor: '#fbbf24',
    negativeLabel: '负相关',
    positiveLabel: '正相关',
  },
};

/**
 * 判断颜色是否需要深色文字（用于对比度）
 * @param backgroundColor 背景颜色
 * @returns 是否需要深色文字
 */
export const needsDarkText = (backgroundColor: string): boolean => {
  // 简单的亮度计算
  const rgb = backgroundColor.match(/\d+/g);
  if (!rgb || rgb.length < 3) return true;

  const r = parseInt(rgb[0], 10);
  const g = parseInt(rgb[1], 10);
  const b = parseInt(rgb[2], 10);

  // 计算相对亮度
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6;
};
