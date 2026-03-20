'use client';

import { forwardRef, HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export type BadgeVariant = 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  removable?: boolean;
  onRemove?: () => void;
  dot?: boolean;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      children,
      className,
      variant = 'default',
      size = 'md',
      removable = false,
      onRemove,
      dot = false,
      ...props
    },
    ref
  ) => {
    const variantStyles = {
      default: 'bg-gray-100 text-gray-700 border-gray-200',
      primary: 'bg-primary-50 text-primary-700 border-primary-200',
      secondary: 'bg-gray-100 text-gray-700 border-gray-200',
      success: 'bg-success-50 text-success-700 border-success-200',
      warning: 'bg-warning-50 text-warning-700 border-warning-200',
      danger: 'bg-danger-50 text-danger-700 border-danger-200',
      info: 'bg-blue-50 text-blue-700 border-blue-200',
    };

    const dotStyles = {
      default: 'bg-gray-500',
      primary: 'bg-primary-500',
      secondary: 'bg-gray-500',
      success: 'bg-success-500',
      warning: 'bg-warning-500',
      danger: 'bg-danger-500',
      info: 'bg-blue-500',
    };

    const sizeStyles = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-1 text-xs',
      lg: 'px-3 py-1.5 text-sm',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1.5 font-medium border rounded-full transition-all duration-200',
          variantStyles[variant],
          sizeStyles[size],
          removable && 'pr-1',
          className
        )}
        {...props}
      >
        {dot && (
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full flex-shrink-0',
              dotStyles[variant]
            )}
          />
        )}
        <span className="truncate">{children}</span>
        {removable && (
          <button
            type="button"
            onClick={onRemove}
            className={cn(
              'inline-flex items-center justify-center rounded-full transition-colors duration-200',
              'hover:bg-black/10 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-500',
              size === 'sm' && 'w-3.5 h-3.5',
              size === 'md' && 'w-4 h-4',
              size === 'lg' && 'w-4 h-4'
            )}
            aria-label="Remove"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
