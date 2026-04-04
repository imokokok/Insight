'use client';

import { useMemo } from 'react';

/**
 * 偏离级别类型
 */
export type DeviationLevel = 'none' | 'warning' | 'danger';

/**
 * 偏离值类型
 */
export type DeviationType = 'percentage' | 'absolute';

/**
 * 阈值配置接口
 */
export interface DeviationThreshold {
  /** 警告阈值 */
  warning: number;
  /** 危险阈值 */
  danger: number;
}

/**
 * 偏离检测结果接口
 */
export interface DeviationDetectionResult {
  /** 偏离级别 */
  level: DeviationLevel;
  /** 是否处于警告状态 */
  isWarning: boolean;
  /** 是否处于危险状态 */
  isDanger: boolean;
  /** 是否偏离正常范围 */
  isDeviated: boolean;
  /** 颜色类名 */
  colorClass: string;
  /** 背景颜色类名 */
  bgClass: string;
  /** 边框颜色类名 */
  borderClass: string;
  /** 文字颜色类名 */
  textClass: string;
  /** 脉冲动画类名 */
  pulseClass: string;
}

/**
 * 默认阈值配置
 */
export const DEFAULT_DEVIATION_THRESHOLD: DeviationThreshold = {
  warning: 1,
  danger: 2,
};

/**
 * 偏离检测 Hook
 * @param value 偏离值（百分比或绝对值）
 * @param threshold 阈值配置
 * @param type 偏离值类型
 * @returns 偏离检测结果
 */
export function useDeviationDetection(
  value: number,
  threshold: Partial<DeviationThreshold> = {},
  type: DeviationType = 'percentage'
): DeviationDetectionResult {
  const mergedThreshold = useMemo(
    () => ({
      ...DEFAULT_DEVIATION_THRESHOLD,
      ...threshold,
    }),
    [threshold]
  );

  // 计算绝对值用于比较
  const absoluteValue = Math.abs(value);

  // 根据类型转换阈值
  const warningThreshold =
    type === 'percentage' ? mergedThreshold.warning : mergedThreshold.warning;
  const dangerThreshold = type === 'percentage' ? mergedThreshold.danger : mergedThreshold.danger;

  return useMemo(() => {
    let level: DeviationLevel = 'none';

    if (absoluteValue > dangerThreshold) {
      level = 'danger';
    } else if (absoluteValue > warningThreshold) {
      level = 'warning';
    }

    const isWarning = level === 'warning';
    const isDanger = level === 'danger';
    const isDeviated = isWarning || isDanger;

    // 颜色配置
    const colorConfig = {
      none: {
        color: 'text-gray-600',
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        text: 'text-gray-700',
        pulse: '',
      },
      warning: {
        color: 'text-amber-500',
        bg: 'bg-amber-50 dark:bg-amber-950/30',
        border: 'border-amber-200 dark:border-amber-800',
        text: 'text-amber-700 dark:text-amber-400',
        pulse: 'animate-pulse-warning',
      },
      danger: {
        color: 'text-red-500',
        bg: 'bg-red-50 dark:bg-red-950/30',
        border: 'border-red-200 dark:border-red-800',
        text: 'text-red-700 dark:text-red-400',
        pulse: 'animate-pulse-danger',
      },
    };

    const config = colorConfig[level];

    return {
      level,
      isWarning,
      isDanger,
      isDeviated,
      colorClass: config.color,
      bgClass: config.bg,
      borderClass: config.border,
      textClass: config.text,
      pulseClass: config.pulse,
    };
  }, [absoluteValue, warningThreshold, dangerThreshold]);
}

/**
 * 计算偏离检测结果（纯函数，非 hook）
 * @param value 偏离值
 * @param threshold 阈值配置
 * @param type 偏离值类型
 * @returns 偏离检测结果
 */
function calculateDeviationResult(
  value: number,
  threshold: DeviationThreshold,
  type: DeviationType
): DeviationDetectionResult {
  const absoluteValue = Math.abs(value);

  const warningThreshold = type === 'percentage' ? threshold.warning : threshold.warning;
  const dangerThreshold = type === 'percentage' ? threshold.danger : threshold.danger;

  let level: DeviationLevel = 'none';

  if (absoluteValue > dangerThreshold) {
    level = 'danger';
  } else if (absoluteValue > warningThreshold) {
    level = 'warning';
  }

  const isWarning = level === 'warning';
  const isDanger = level === 'danger';
  const isDeviated = isWarning || isDanger;

  const colorConfig = {
    none: {
      color: 'text-gray-600',
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      text: 'text-gray-700',
      pulse: '',
    },
    warning: {
      color: 'text-amber-500',
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      border: 'border-amber-200 dark:border-amber-800',
      text: 'text-amber-700 dark:text-amber-400',
      pulse: 'animate-pulse-warning',
    },
    danger: {
      color: 'text-red-500',
      bg: 'bg-red-50 dark:bg-red-950/30',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-700 dark:text-red-400',
      pulse: 'animate-pulse-danger',
    },
  };

  const config = colorConfig[level];

  return {
    level,
    isWarning,
    isDanger,
    isDeviated,
    colorClass: config.color,
    bgClass: config.bg,
    borderClass: config.border,
    textClass: config.text,
    pulseClass: config.pulse,
  };
}

/**
 * 批量偏离检测 Hook
 * @param values 偏离值数组
 * @param threshold 阈值配置
 * @param type 偏离值类型
 * @returns 批量偏离检测结果
 */
export function useBatchDeviationDetection(
  values: number[],
  threshold: Partial<DeviationThreshold> = {},
  type: DeviationType = 'percentage'
): {
  results: DeviationDetectionResult[];
  hasWarning: boolean;
  hasDanger: boolean;
  maxDeviation: number;
  maxLevel: DeviationLevel;
} {
  const mergedThreshold = useMemo(
    () => ({
      ...DEFAULT_DEVIATION_THRESHOLD,
      ...threshold,
    }),
    [threshold]
  );

  return useMemo(() => {
    const results = values.map((value) => calculateDeviationResult(value, mergedThreshold, type));
    const hasWarning = results.some((r) => r.isWarning);
    const hasDanger = results.some((r) => r.isDanger);
    const maxDeviation = Math.max(...values.map(Math.abs), 0);

    let maxLevel: DeviationLevel = 'none';
    if (hasDanger) {
      maxLevel = 'danger';
    } else if (hasWarning) {
      maxLevel = 'warning';
    }

    return {
      results,
      hasWarning,
      hasDanger,
      maxDeviation,
      maxLevel,
    };
  }, [values, mergedThreshold, type]);
}

export default useDeviationDetection;
