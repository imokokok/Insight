/**
 * 色盲友好配色方案
 * 使用蓝-黄配色替代传统的绿-红配色，适合红绿色盲用户
 */

import { baseColors, accessibleColors } from '@/lib/config/colors';

// 蓝-黄色盲友好配色梯度
// 低值 -> 蓝色，高值 -> 黄色/橙色
export const colorblindHeatmapGradient = [
  baseColors.primary[500], // 蓝色 - 低值
  baseColors.primary[400],
  baseColors.primary[300],
  accessibleColors.priceChange.down.bg,
  baseColors.primary[200],
  accessibleColors.priceChange.up.bg,
  accessibleColors.priceChange.up.color,
  baseColors.primary[700], // 深黄/橙色 - 高值
];

/**
 * 获取色盲友好模式的热力图颜色
 * 根据百分比值从预设的颜色序列中返回对应颜色
 *
 * @param percent - 当前百分比值
 * @param maxPercent - 最大百分比值（用于归一化）
 * @returns 对应的颜色字符串（hex 格式）
 */
export const getColorblindHeatmapColor = (percent: number, maxPercent: number): string => {
  if (maxPercent === 0) return accessibleColors.chart.sequence[0];

  const normalizedValue = Math.min(percent / maxPercent, 1);
  const index = Math.floor(normalizedValue * (accessibleColors.chart.sequence.length - 1));
  return accessibleColors.chart.sequence[
    Math.min(index, accessibleColors.chart.sequence.length - 1)
  ];
};

/**
 * 获取色盲友好模式的相关性矩阵颜色
 * 使用蓝-黄配色方案，负相关为蓝色，正相关为黄色/橙色
 * 通过 RGB 插值计算中间颜色
 *
 * @param correlation - 相关系数（-1 到 1）
 * @returns 计算得到的颜色字符串（rgb 格式）
 */
export const getColorblindCorrelationColor = (correlation: number): string => {
  const clampedCorrelation = Math.max(-1, Math.min(1, correlation));

  if (clampedCorrelation >= 0) {
    // 正相关: 白色 -> 黄色/橙色
    const t = clampedCorrelation;
    const r = Math.floor(
      255 - (255 - parseInt(accessibleColors.priceChange.up.color.slice(1, 3), 16)) * t
    );
    const g = Math.floor(
      255 - (255 - parseInt(accessibleColors.priceChange.up.color.slice(3, 5), 16)) * t
    );
    const b = Math.floor(
      255 - (255 - parseInt(accessibleColors.priceChange.up.color.slice(5, 7), 16)) * t
    );
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    // 负相关: 白色 -> 蓝色
    const t = Math.abs(clampedCorrelation);
    const r = Math.floor(
      255 - (255 - parseInt(accessibleColors.priceChange.down.color.slice(1, 3), 16)) * t
    );
    const g = Math.floor(
      255 - (255 - parseInt(accessibleColors.priceChange.down.color.slice(3, 5), 16)) * t
    );
    const b = Math.floor(
      255 - (255 - parseInt(accessibleColors.priceChange.down.color.slice(5, 7), 16)) * t
    );
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
 * 使用蓝色表示负差异，黄色/橙色表示正差异
 *
 * @param diffPercent - 差异百分比
 * @returns 包含背景色和文字色的对象
 */
export const getColorblindDiffColor = (diffPercent: number): { bg: string; text: string } => {
  const absPercent = Math.abs(diffPercent);

  if (absPercent <= 0.5) {
    return { bg: 'transparent', text: accessibleColors.text.muted };
  }

  // 使用蓝色表示负差异，黄色/橙色表示正差异
  if (diffPercent > 0.5) {
    // 正差异 - 黄色/橙色
    const intensity = Math.min((diffPercent - 0.5) / 2, 1);
    const upColor = accessibleColors.priceChange.up.color;
    const r = Math.floor(254 + (parseInt(upColor.slice(1, 3), 16) - 254) * intensity);
    const g = Math.floor(240 + (parseInt(upColor.slice(3, 5), 16) - 240) * intensity);
    const b = Math.floor(219 + (parseInt(upColor.slice(5, 7), 16) - 219) * intensity);
    return {
      bg: `rgba(${r}, ${g}, ${b}, 0.2)`,
      text:
        intensity > 0.5
          ? accessibleColors.priceChange.up.color
          : accessibleColors.priceChange.up.color,
    };
  } else {
    // 负差异 - 蓝色
    const intensity = Math.min((-diffPercent - 0.5) / 2, 1);
    const downColor = accessibleColors.priceChange.down.color;
    const r = Math.floor(219 + (parseInt(downColor.slice(1, 3), 16) - 219) * intensity);
    const g = Math.floor(234 + (parseInt(downColor.slice(3, 5), 16) - 234) * intensity);
    const b = Math.floor(254 + (parseInt(downColor.slice(5, 7), 16) - 254) * intensity);
    return {
      bg: `rgba(${r}, ${g}, ${b}, 0.2)`,
      text:
        intensity > 0.5
          ? accessibleColors.priceChange.down.color
          : accessibleColors.priceChange.down.color,
    };
  }
};

/**
 * 色盲友好模式的颜色图例配置
 * 注意：label 需要在组件中使用翻译函数传入
 */
export const colorblindLegendConfig = {
  heatmap: {
    lowColor: accessibleColors.priceChange.down.color,
    highColor: accessibleColors.priceChange.up.color,
    lowLabel: 'Low Diff',
    highLabel: 'High Diff',
  },
  correlation: {
    negativeColor: accessibleColors.priceChange.down.color,
    positiveColor: accessibleColors.priceChange.up.color,
    negativeLabel: 'Negative Corr',
    positiveLabel: 'Positive Corr',
  },
};

/**
 * 判断颜色是否需要深色文字（用于对比度）
 * 通过计算颜色的相对亮度来决定
 *
 * @param backgroundColor - 背景颜色（rgb 格式）
 * @returns 是否需要深色文字（true 表示需要深色）
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
