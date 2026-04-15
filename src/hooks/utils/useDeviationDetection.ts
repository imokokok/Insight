'use client';

import { useMemo } from 'react';

import { safeMax } from '@/lib/utils';

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

const COLOR_CONFIG = {
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
  type: DeviationType = 'percentage',
  referencePrice?: number
): DeviationDetectionResult {
  const mergedThreshold = useMemo(
    () => ({
      ...DEFAULT_DEVIATION_THRESHOLD,
      ...threshold,
    }),
    [threshold]
  );

  const absoluteValue = Math.abs(value);

  const comparisonValue =
    type === 'percentage'
      ? absoluteValue
      : referencePrice && referencePrice > 0
        ? (absoluteValue / 100) * referencePrice
        : absoluteValue;

  return useMemo(() => {
    let level: DeviationLevel = 'none';

    if (comparisonValue > mergedThreshold.danger) {
      level = 'danger';
    } else if (comparisonValue > mergedThreshold.warning) {
      level = 'warning';
    }

    const isWarning = level === 'warning';
    const isDanger = level === 'danger';
    const isDeviated = isWarning || isDanger;

    const config = COLOR_CONFIG[level];

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
  }, [comparisonValue, mergedThreshold.warning, mergedThreshold.danger]);
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
  type: DeviationType,
  referencePrice?: number
): DeviationDetectionResult {
  const absoluteValue = Math.abs(value);

  const comparisonValue =
    type === 'percentage'
      ? absoluteValue
      : referencePrice && referencePrice > 0
        ? (absoluteValue / 100) * referencePrice
        : absoluteValue;

  let level: DeviationLevel = 'none';

  if (comparisonValue > threshold.danger) {
    level = 'danger';
  } else if (comparisonValue > threshold.warning) {
    level = 'warning';
  }

  const isWarning = level === 'warning';
  const isDanger = level === 'danger';
  const isDeviated = isWarning || isDanger;

  const config = COLOR_CONFIG[level];

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
  type: DeviationType = 'percentage',
  referencePrice?: number
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
    const results = values.map((value) =>
      calculateDeviationResult(value, mergedThreshold, type, referencePrice)
    );
    const hasWarning = results.some((r) => r.isWarning);
    const hasDanger = results.some((r) => r.isDanger);
    const maxDeviation = safeMax(values.map(Math.abs), 0);

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
  }, [values, mergedThreshold, type, referencePrice]);
}

export default useDeviationDetection;
