/**
 * 色盲友好配色方案
 * 使用蓝-黄配色替代传统的绿-红配色，适合红绿色盲用户
 */

import { accessibleColors } from '@/lib/config/colors';

/**
 * 获取色盲友好模式的热力图颜色
 * 根据百分比值从预设的颜色序列中返回对应颜色
 *
 * @param percent - 当前百分比值
 * @param maxPercent - 最大百分比值（用于归一化）
 * @returns 对应的颜色字符串（hex 格式）
 */
export const getColorblindHeatmapColor = (percent: number, maxPercent: number): string => {
  const absValue = Math.abs(percent);
  const seq = accessibleColors.chart.sequence;

  // 当最大值为0或范围很小时，使用基于绝对阈值的着色
  if (maxPercent === 0 || maxPercent < 0.001) {
    // 更精细的阈值（支持到0.001%级别）
    if (absValue < 0.001) return seq[0];
    if (absValue < 0.003) return seq[1] || seq[0];
    if (absValue < 0.005) return seq[2] || seq[0];
    if (absValue < 0.01) return seq[3] || seq[0];
    if (absValue < 0.03) return seq[4] || seq[seq.length - 1];
    if (absValue < 0.05) return seq[5] || seq[seq.length - 1];
    return seq[seq.length - 1];
  }

  const normalizedValue = Math.min(percent / maxPercent, 1);
  const index = Math.floor(normalizedValue * (accessibleColors.chart.sequence.length - 1));
  return accessibleColors.chart.sequence[
    Math.min(index, accessibleColors.chart.sequence.length - 1)
  ];
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
