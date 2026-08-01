'use client';

import { forwardRef, type HTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, variant = 'text', width, height, animation = 'pulse', style, ...props }, ref) => {
    const variantStyles = {
      text: 'rounded',
      circular: 'rounded-full',
      rectangular: 'rounded-md',
      rounded: 'rounded-md',
    };

    const animationStyles = {
      pulse: 'animate-pulse',
      wave: 'animate-shimmer',
      none: '',
    };

    const getSizeStyles = () => {
      const styles: Record<string, string> = {};

      if (width !== undefined) {
        styles.width = typeof width === 'number' ? `${width}px` : width;
      }

      if (height !== undefined) {
        styles.height = typeof height === 'number' ? `${height}px` : height;
      }

      if (variant === 'text' && height === undefined) {
        styles.height = '1em';
      }

      return styles;
    };

    return (
      <div
        ref={ref}
        className={cn(
          'bg-gray-200',
          variantStyles[variant],
          animationStyles[animation],
          animation === 'wave' && 'relative overflow-hidden',
          className
        )}
        style={{
          ...getSizeStyles(),
          ...style,
        }}
        {...props}
      >
        {animation === 'wave' && (
          <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        )}
      </div>
    );
  }
);

Skeleton.displayName = 'Skeleton';
