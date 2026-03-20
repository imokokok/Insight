'use client';

import { forwardRef, InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Check, Minus } from 'lucide-react';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
  helperText?: string;
  error?: string;
  indeterminate?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      label,
      helperText,
      error,
      indeterminate = false,
      disabled,
      checked,
      id,
      ...props
    },
    ref
  ) => {
    const checkboxId = id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className={cn('flex items-start gap-3', className)}>
        <div className="relative flex items-center">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            disabled={disabled}
            checked={checked}
            className="sr-only peer"
            {...props}
          />
          <label
            htmlFor={checkboxId}
            className={cn(
              'w-5 h-5 border-2 rounded transition-all duration-200 cursor-pointer',
              'flex items-center justify-center',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500 peer-focus-visible:ring-offset-2',
              'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
              checked || indeterminate
                ? 'bg-primary-600 border-primary-600'
                : 'bg-white border-gray-300 hover:border-gray-400',
              error && 'border-danger-500'
            )}
          >
            {checked && !indeterminate && (
              <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
            )}
            {indeterminate && (
              <Minus className="w-3.5 h-3.5 text-white" strokeWidth={3} />
            )}
          </label>
        </div>
        {(label || helperText || error) && (
          <div className="flex flex-col gap-0.5">
            {label && (
              <label
                htmlFor={checkboxId}
                className={cn(
                  'text-sm font-medium cursor-pointer select-none',
                  disabled && 'cursor-not-allowed opacity-50',
                  error ? 'text-danger-600' : 'text-gray-700'
                )}
              >
                {label}
              </label>
            )}
            {(helperText || error) && (
              <p
                className={cn(
                  'text-sm',
                  error ? 'text-danger-600' : 'text-gray-500'
                )}
              >
                {error || helperText}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export interface CheckboxGroupProps {
  children: ReactNode;
  className?: string;
  direction?: 'horizontal' | 'vertical';
}

export const CheckboxGroup = forwardRef<HTMLDivElement, CheckboxGroupProps>(
  ({ children, className, direction = 'vertical' }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex gap-4',
          direction === 'vertical' && 'flex-col',
          direction === 'horizontal' && 'flex-row flex-wrap',
          className
        )}
        role="group"
      >
        {children}
      </div>
    );
  }
);

CheckboxGroup.displayName = 'CheckboxGroup';
