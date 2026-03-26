'use client';

import { forwardRef, type SVGAttributes } from 'react';

import { cn } from '@/lib/utils';

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type SpinnerVariant = 'primary' | 'secondary' | 'white' | 'gray';

export interface SpinnerProps extends Omit<SVGAttributes<SVGSVGElement>, 'size'> {
  size?: SpinnerSize;
  variant?: SpinnerVariant;
  className?: string;
}

export const Spinner = forwardRef<SVGSVGElement, SpinnerProps>(
  ({ className, size = 'md', variant = 'primary', ...props }, ref) => {
    const sizeStyles = {
      xs: 'w-3 h-3',
      sm: 'w-4 h-4',
      md: 'w-6 h-6',
      lg: 'w-8 h-8',
      xl: 'w-12 h-12',
    };

    const variantStyles = {
      primary: 'text-primary-600',
      secondary: 'text-gray-600',
      white: 'text-white',
      gray: 'text-gray-400',
    };

    return (
      <svg
        ref={ref}
        className={cn('animate-spin', sizeStyles[size], variantStyles[variant], className)}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        {...props}
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    );
  }
);

Spinner.displayName = 'Spinner';

export interface LoadingOverlayProps {
  children?: React.ReactNode;
  isLoading: boolean;
  spinnerSize?: SpinnerSize;
  spinnerVariant?: SpinnerVariant;
  className?: string;
  overlayClassName?: string;
  text?: string;
}

export const LoadingOverlay = forwardRef<HTMLDivElement, LoadingOverlayProps>(
  (
    {
      children,
      isLoading,
      spinnerSize = 'lg',
      spinnerVariant = 'primary',
      className,
      overlayClassName,
      text,
    },
    ref
  ) => {
    return (
      <div ref={ref} className={cn('relative', className)}>
        {children}
        {isLoading && (
          <div
            className={cn(
              'absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-50',
              overlayClassName
            )}
          >
            <Spinner size={spinnerSize} variant={spinnerVariant} />
            {text && <p className="mt-3 text-sm text-gray-600">{text}</p>}
          </div>
        )}
      </div>
    );
  }
);

LoadingOverlay.displayName = 'LoadingOverlay';
