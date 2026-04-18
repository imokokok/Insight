/**
 * 数值格式化工具函数
 * 用于热力图等场景的智能数值显示
 */

import {
  formatPercent as formatPercentCore,
  formatPriceDiff as formatPriceDiffCore,
} from '@/lib/utils/format';

/**
 * 智能格式化百分比数值
 * 根据数值大小自动选择合适的小数位数
 * @param value - 百分比数值（如 0.15 表示 0.15%）
 * @param options - 配置选项
 * @returns 格式化后的字符串
 */
export function formatPercent(
  value: number,
  options: {
    minDecimals?: number;
    maxDecimals?: number;
    threshold?: number;
  } = {}
): string {
  const { minDecimals = 1, maxDecimals = 4, threshold = 0.01 } = options;

  if (value === 0) return '0%';

  // 根据数值大小动态选择小数位数
  let decimals = minDecimals;

  if (Math.abs(value) < 0.001) {
    decimals = Math.min(4, maxDecimals);
  } else if (Math.abs(value) < 0.01) {
    decimals = Math.min(3, maxDecimals);
  } else if (Math.abs(value) < threshold) {
    decimals = Math.min(2, maxDecimals);
  }

  return `${value.toFixed(decimals)}%`;
}

/**
 * 格式化价格差异
 * 根据差异大小选择合适的精度
 * @param value - 价格差异值
 * @param basePrice - 基准价格（用于计算相对精度）
 * @returns 格式化后的字符串
 */
export function formatPriceDiff(value: number, basePrice?: number): string {
  return formatPriceDiffCore(value, basePrice);
}

/**
 * 格式化热力图单元格显示
 * 在有限空间内显示最有意义的数值
 * @param percent - 百分比值
 * @returns 格式化后的字符串
 */
export function formatHeatmapCell(percent: number): string {
  if (percent === 0) return '0%';

  // 对于非常小的值，使用 2 位小数
  if (Math.abs(percent) < 0.01) {
    return `${percent.toFixed(2)}%`;
  }

  // 对于较小的值，使用 1 位小数
  if (Math.abs(percent) < 0.1) {
    return `${percent.toFixed(1)}%`;
  }

  // 对于较大的值，使用整数
  return `${Math.round(percent)}%`;
}

/**
 * 格式化图例数值
 * @param value - 数值
 * @returns 格式化后的字符串
 */
export function formatLegendValue(value: number): string {
  if (value === 0) return '0%';
  if (value < 0.01) return `${value.toFixed(2)}%`;
  if (value < 0.1) return `${value.toFixed(1)}%`;
  return `${Math.round(value)}%`;
}

/**
 * 获取数值的精度等级
 * 用于决定显示样式
 * @param value - 数值
 * @returns 精度等级
 */
export function getPrecisionLevel(value: number): 'high' | 'medium' | 'low' {
  if (Math.abs(value) < 0.01) return 'high';
  if (Math.abs(value) < 0.1) return 'medium';
  return 'low';
}
