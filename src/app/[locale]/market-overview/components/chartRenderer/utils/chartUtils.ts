/**
 * @fileoverview 图表渲染工具函数
 * @description 提供图表数据处理、颜色配置等工具函数
 */

import { chartColors } from '@/lib/config/colors';

/**
 * 格式化数值
 */
export function formatValue(value: number, decimals: number = 2): string {
  if (value >= 1000000000) {
    return `$${(value / 1000000000).toFixed(decimals)}B`;
  }
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(decimals)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(decimals)}K`;
  }
  return `$${value.toFixed(decimals)}`;
}

/**
 * 获取图表颜色
 */
export function getChartColor(index: number): string {
  const colors = [
    chartColors.oracle.chainlink,
    chartColors.oracle.uma,
    chartColors.oracle.pyth,
    chartColors.oracle.api3,
    chartColors.oracle.redstone,
  ];
  return colors[index % colors.length];
}

/**
 * 格式化日期
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * 格式化时间
 */
export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
