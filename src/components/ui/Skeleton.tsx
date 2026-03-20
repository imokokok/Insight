'use client';

import { forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  (
    {
      className,
      variant = 'text',
      width,
      height,
      animation = 'pulse',
      style,
      ...props
    },
    ref
  ) => {
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

      // Default sizes for text variant
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

export interface SkeletonTextProps extends HTMLAttributes<HTMLDivElement> {
  lines?: number;
  lineHeight?: number;
  lastLineWidth?: string;
  animation?: 'pulse' | 'wave' | 'none';
}

export const SkeletonText = forwardRef<HTMLDivElement, SkeletonTextProps>(
  (
    {
      className,
      lines = 3,
      lineHeight = 16,
      lastLineWidth = '60%',
      animation = 'pulse',
      ...props
    },
    ref
  ) => {
    return (
      <div ref={ref} className={cn('flex flex-col gap-2', className)} {...props}>
        {Array.from({ length: lines }).map((_, index) => (
          <Skeleton
            key={index}
            variant="text"
            height={lineHeight}
            animation={animation}
            className={cn(
              'w-full',
              index === lines - 1 && lastLineWidth !== '100%' && lastLineWidth
            )}
            style={index === lines - 1 ? { width: lastLineWidth } : undefined}
          />
        ))}
      </div>
    );
  }
);

SkeletonText.displayName = 'SkeletonText';

export interface SkeletonCardProps extends HTMLAttributes<HTMLDivElement> {
  hasImage?: boolean;
  imageHeight?: number;
  lines?: number;
  animation?: 'pulse' | 'wave' | 'none';
}

export const SkeletonCard = forwardRef<HTMLDivElement, SkeletonCardProps>(
  (
    {
      className,
      hasImage = true,
      imageHeight = 160,
      lines = 3,
      animation = 'pulse',
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn('p-4 border border-gray-200 rounded-lg space-y-4', className)}
        {...props}
      >
        {hasImage && (
          <Skeleton
            variant="rounded"
            height={imageHeight}
            animation={animation}
            className="w-full"
          />
        )}
        <SkeletonText lines={lines} animation={animation} />
      </div>
    );
  }
);

SkeletonCard.displayName = 'SkeletonCard';
