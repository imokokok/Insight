// 阈值配置 - 这些是业务逻辑配置，不是模拟数据
export const DEVIATION_THRESHOLDS = {
  excellent: 0.1,
  warning: 0.5,
} as const;

export const RELIABILITY_THRESHOLDS = {
  excellent: 99.5,
  good: 98,
  warning: 95,
} as const;
