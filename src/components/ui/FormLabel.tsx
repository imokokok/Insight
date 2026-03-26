'use client';

import { forwardRef, type LabelHTMLAttributes, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface FormLabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  children: ReactNode;
  required?: boolean;
  optional?: boolean;
  disabled?: boolean;
  error?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const FormLabel = forwardRef<HTMLLabelElement, FormLabelProps>(
  (
    {
      children,
      className,
      required = false,
      optional = false,
      disabled = false,
      error = false,
      size = 'md',
      ...props
    },
    ref
  ) => {
    const sizeStyles = {
      sm: 'text-xs',
      md: 'text-sm',
      lg: 'text-base',
    };

    return (
      <label
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1 font-medium transition-colors duration-200',
          sizeStyles[size],
          disabled && 'opacity-50 cursor-not-allowed',
          error ? 'text-danger-600' : 'text-gray-700',
          className
        )}
        {...props}
      >
        {children}
        {required && (
          <span className="text-danger-500" aria-hidden="true">
            *
          </span>
        )}
        {optional && !required && <span className="text-gray-400 font-normal">(可选)</span>}
      </label>
    );
  }
);

FormLabel.displayName = 'FormLabel';
