'use client';

import { forwardRef, HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

export interface FormErrorProps extends HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

export const FormError = forwardRef<HTMLParagraphElement, FormErrorProps>(
  (
    {
      children,
      className,
      showIcon = true,
      size = 'sm',
      ...props
    },
    ref
  ) => {
    const sizeStyles = {
      sm: 'text-xs',
      md: 'text-sm',
    };

    return (
      <p
        ref={ref}
        className={cn(
          'flex items-center gap-1.5 text-danger-600',
          sizeStyles[size],
          className
        )}
        role="alert"
        {...props}
      >
        {showIcon && <AlertCircle className="w-4 h-4 flex-shrink-0" />}
        <span>{children}</span>
      </p>
    );
  }
);

FormError.displayName = 'FormError';
