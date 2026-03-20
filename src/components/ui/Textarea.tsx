'use client';

import { forwardRef, TextareaHTMLAttributes, useState } from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  maxLength?: number;
  showCharacterCount?: boolean;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      maxLength,
      showCharacterCount = false,
      resize = 'vertical',
      disabled,
      value,
      defaultValue,
      id,
      onChange,
      ...props
    },
    ref
  ) => {
    const [characterCount, setCharacterCount] = useState(
      String(value || defaultValue || '').length
    );
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, '-');

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCharacterCount(e.target.value.length);
      onChange?.(e);
    };

    const resizeStyles = {
      none: 'resize-none',
      vertical: 'resize-y',
      horizontal: 'resize-x',
      both: 'resize',
    };

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          disabled={disabled}
          value={value}
          defaultValue={defaultValue}
          maxLength={maxLength}
          onChange={handleChange}
          className={cn(
            'w-full px-4 py-3 text-sm bg-white border rounded-md transition-all duration-200',
            'placeholder:text-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
            'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
            error && 'border-danger-500 focus:ring-danger-500 focus:border-danger-500',
            !error && 'border-gray-300 hover:border-gray-400',
            resizeStyles[resize],
            className
          )}
          {...props}
        />
        <div className="flex items-center justify-between mt-1.5">
          {(error || helperText) && (
            <p
              className={cn(
                'text-sm',
                error ? 'text-danger-600' : 'text-gray-500'
              )}
            >
              {error || helperText}
            </p>
          )}
          {(showCharacterCount || maxLength) && (
            <p
              className={cn(
                'text-xs text-gray-400 ml-auto',
                !error && !helperText && 'mt-1.5'
              )}
            >
              {characterCount}
              {maxLength && ` / ${maxLength}`}
            </p>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
