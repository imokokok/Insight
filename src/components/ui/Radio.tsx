'use client';

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

export interface RadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
  helperText?: string;
  error?: string;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ className, label, helperText, error, disabled, checked, id, ...props }, ref) => {
    const radioId =
      id || (typeof label === 'string' ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className={cn('flex items-start gap-3', className)}>
        <div className="relative flex items-center">
          <input
            ref={ref}
            type="radio"
            id={radioId}
            disabled={disabled}
            checked={checked}
            className="sr-only peer"
            {...props}
          />
          <label
            htmlFor={radioId}
            className={cn(
              'w-5 h-5 border-2 rounded-full transition-all duration-200 cursor-pointer',
              'flex items-center justify-center',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-primary-500 peer-focus-visible:ring-offset-2',
              'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
              checked ? 'border-primary-600' : 'bg-white border-gray-300 hover:border-gray-400',
              error && 'border-danger-500'
            )}
          >
            <span
              className={cn(
                'w-2.5 h-2.5 rounded-full bg-primary-600 transition-transform duration-200',
                checked ? 'scale-100' : 'scale-0'
              )}
            />
          </label>
        </div>
        {(label || helperText || error) && (
          <div className="flex flex-col gap-0.5">
            {label && (
              <label
                htmlFor={radioId}
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
              <p className={cn('text-sm', error ? 'text-danger-600' : 'text-gray-500')}>
                {error || helperText}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Radio.displayName = 'Radio';

export interface RadioOption {
  value: string;
  label: ReactNode;
  helperText?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
  direction?: 'horizontal' | 'vertical';
  error?: string;
}

export const RadioGroup = forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ name, options, value, onChange, className, direction = 'vertical', error }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex gap-4',
          direction === 'vertical' && 'flex-col',
          direction === 'horizontal' && 'flex-row flex-wrap',
          className
        )}
        role="radiogroup"
      >
        {options.map((option) => (
          <Radio
            key={option.value}
            name={name}
            value={option.value}
            label={option.label}
            helperText={option.helperText}
            checked={value === option.value}
            disabled={option.disabled}
            error={error}
            onChange={() => onChange?.(option.value)}
          />
        ))}
      </div>
    );
  }
);

RadioGroup.displayName = 'RadioGroup';
