'use client';

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

import { AlertTriangle, AlertOctagon } from 'lucide-react';

import {
  useDeviationDetection,
  type DeviationThreshold,
  type DeviationType,
  type DeviationLevel,
} from '@/hooks/useDeviationDetection';
import { cn } from '@/lib/utils';

export type DeviationHighlighterSize = 'sm' | 'md' | 'lg';

export interface DeviationHighlighterProps extends HTMLAttributes<HTMLSpanElement> {
  /** 偏离值 */
  value: number;
  /** 阈值配置 */
  threshold?: Partial<DeviationThreshold>;
  /** 是否显示图标 */
  showIcon?: boolean;
  /** 是否显示脉冲动画 */
  showPulse?: boolean;
  /** 尺寸 */
  size?: DeviationHighlighterSize;
  /** 偏离值类型 */
  type?: DeviationType;
  /** 自定义内容 */
  children?: ReactNode;
  /** 显示格式：percentage | absolute */
  format?: 'percentage' | 'absolute' | 'auto';
  /** 小数位数 */
  decimals?: number;
}

/**
 * 获取尺寸样式
 */
const getSizeStyles = (size: DeviationHighlighterSize) => {
  const styles = {
    sm: {
      container: 'px-2 py-0.5 text-xs gap-1',
      icon: 'w-3 h-3',
      pulse: 'w-1.5 h-1.5',
    },
    md: {
      container: 'px-2.5 py-1 text-sm gap-1.5',
      icon: 'w-4 h-4',
      pulse: 'w-2 h-2',
    },
    lg: {
      container: 'px-3 py-1.5 text-base gap-2',
      icon: 'w-5 h-5',
      pulse: 'w-2.5 h-2.5',
    },
  };
  return styles[size];
};

/**
 * 获取警告图标
 */
const getWarningIcon = (level: DeviationLevel, size: DeviationHighlighterSize) => {
  const iconSize = getSizeStyles(size).icon;

  switch (level) {
    case 'danger':
      return <AlertOctagon className={cn(iconSize, 'flex-shrink-0')} />;
    case 'warning':
      return <AlertTriangle className={cn(iconSize, 'flex-shrink-0')} />;
    default:
      return null;
  }
};

/**
 * 格式化数值显示
 */
const formatValue = (
  value: number,
  format: 'percentage' | 'absolute' | 'auto',
  decimals: number
): string => {
  const absValue = Math.abs(value);
  const sign = value >= 0 ? '+' : '-';

  if (format === 'percentage' || (format === 'auto' && absValue < 10)) {
    return `${sign}${absValue.toFixed(decimals)}%`;
  }

  return `${sign}${absValue.toFixed(decimals)}`;
};

/**
 * 异常高亮组件
 * 用于显示偏离阈值的数值，带有警告颜色和脉冲动画效果
 */
export const DeviationHighlighter = forwardRef<HTMLSpanElement, DeviationHighlighterProps>(
  (
    {
      value,
      threshold,
      showIcon = true,
      showPulse = true,
      size = 'md',
      type = 'percentage',
      format = 'auto',
      decimals = 2,
      children,
      className,
      ...props
    },
    ref
  ) => {
    const { level, isDeviated, bgClass, borderClass, textClass, pulseClass } =
      useDeviationDetection(value, threshold, type);

    const sizeStyles = getSizeStyles(size);
    const icon = showIcon ? getWarningIcon(level, size) : null;
    const formattedValue = formatValue(value, format, decimals);

    // 基础样式
    const baseStyles =
      'inline-flex items-center font-medium rounded-full border transition-all duration-200';

    // 脉冲动画样式
    const pulseElement =
      showPulse && isDeviated ? (
        <span className={cn('relative flex', sizeStyles.pulse)}>
          <span
            className={cn(
              'absolute inline-flex h-full w-full rounded-full opacity-75',
              level === 'danger' ? 'bg-red-400' : 'bg-amber-400',
              'animate-ping'
            )}
          />
          <span
            className={cn(
              'relative inline-flex rounded-full',
              sizeStyles.pulse,
              level === 'danger' ? 'bg-red-500' : 'bg-amber-500'
            )}
          />
        </span>
      ) : null;

    return (
      <span
        ref={ref}
        className={cn(
          baseStyles,
          sizeStyles.container,
          bgClass,
          borderClass,
          textClass,
          isDeviated && pulseClass,
          className
        )}
        {...props}
      >
        {pulseElement}
        {icon}
        <span className="truncate">{children || formattedValue}</span>
      </span>
    );
  }
);

DeviationHighlighter.displayName = 'DeviationHighlighter';

/**
 * 简化版异常指示器（仅显示图标和脉冲）
 */
export interface DeviationIndicatorProps extends HTMLAttributes<HTMLSpanElement> {
  value: number;
  threshold?: Partial<DeviationThreshold>;
  showPulse?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  type?: DeviationType;
}

export const DeviationIndicator = forwardRef<HTMLSpanElement, DeviationIndicatorProps>(
  (
    { value, threshold, showPulse = true, size = 'md', type = 'percentage', className, ...props },
    ref
  ) => {
    const { level, isDeviated, colorClass } = useDeviationDetection(value, threshold, type);

    const sizeStyles = {
      xs: 'w-2 h-2',
      sm: 'w-3 h-3',
      md: 'w-4 h-4',
      lg: 'w-5 h-5',
    };

    const icon = getWarningIcon(level, size === 'xs' ? 'sm' : size);

    if (!isDeviated) {
      return (
        <span
          ref={ref}
          className={cn(
            'inline-flex items-center justify-center rounded-full bg-gray-200',
            sizeStyles[size],
            className
          )}
          {...props}
        />
      );
    }

    return (
      <span
        ref={ref}
        className={cn('inline-flex items-center justify-center', colorClass, className)}
        {...props}
      >
        {showPulse && (
          <span className="relative flex">
            <span
              className={cn(
                'absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping',
                level === 'danger' ? 'bg-red-400' : 'bg-amber-400'
              )}
            />
            <span className="relative inline-flex">{icon}</span>
          </span>
        )}
        {!showPulse && icon}
      </span>
    );
  }
);

DeviationIndicator.displayName = 'DeviationIndicator';

/**
 * 异常高亮文本（仅文字，无边框背景）
 */
export interface DeviationTextProps extends HTMLAttributes<HTMLSpanElement> {
  value: number;
  threshold?: Partial<DeviationThreshold>;
  showIcon?: boolean;
  size?: DeviationHighlighterSize;
  type?: DeviationType;
  format?: 'percentage' | 'absolute' | 'auto';
  decimals?: number;
}

export const DeviationText = forwardRef<HTMLSpanElement, DeviationTextProps>(
  (
    {
      value,
      threshold,
      showIcon = false,
      size = 'md',
      type = 'percentage',
      format = 'auto',
      decimals = 2,
      className,
      children,
      ...props
    },
    ref
  ) => {
    const { level, textClass } = useDeviationDetection(value, threshold, type);

    const sizeStyles = {
      sm: 'text-xs gap-1',
      md: 'text-sm gap-1.5',
      lg: 'text-base gap-2',
    };

    const iconSize = {
      sm: 'w-3 h-3',
      md: 'w-4 h-4',
      lg: 'w-5 h-5',
    };

    const icon = showIcon ? getWarningIcon(level, size) : null;
    const formattedValue = formatValue(value, format, decimals);

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center font-medium',
          sizeStyles[size],
          textClass,
          className
        )}
        {...props}
      >
        {icon && <span className={iconSize[size]}>{icon}</span>}
        <span>{children || formattedValue}</span>
      </span>
    );
  }
);

DeviationText.displayName = 'DeviationText';

export default DeviationHighlighter;
