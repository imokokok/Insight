'use client';

import { type ReactNode, type ButtonHTMLAttributes, forwardRef, memo } from 'react';

import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Props for the Button component
 * @extends ButtonHTMLAttributes<HTMLButtonElement>
 */
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button content */
  children: ReactNode;
  /** Visual style variant */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg' | 'icon';
  /** Whether the button is in loading state */
  isLoading?: boolean;
  /** Icon to display on the left side */
  leftIcon?: ReactNode;
  /** Icon to display on the right side */
  rightIcon?: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center gap-2 border font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50';

    const variants = {
      primary:
        'border-primary-700 bg-primary-700 text-white hover:border-slate-950 hover:bg-slate-950',
      secondary:
        'border-gray-300 bg-white text-gray-700 hover:border-primary-400 hover:bg-primary-50/40 hover:text-primary-700 active:bg-gray-100',
      ghost:
        'border-transparent bg-transparent text-gray-600 hover:border-gray-200 hover:bg-white/70 hover:text-gray-900 active:bg-gray-100',
      danger: 'border-danger-700 bg-danger-700 text-white hover:bg-danger-800 active:bg-danger-900',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm rounded-sm',
      md: 'px-4 py-2.5 text-sm rounded-sm',
      lg: 'px-6 py-3 text-base rounded-sm',
      icon: 'p-2 rounded-sm',
    };

    return (
      <button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
        {!isLoading && leftIcon}
        {(!isLoading || size !== 'icon') && children}
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = 'Button';

const MemoizedButton = memo(Button);
MemoizedButton.displayName = 'Button';

export { MemoizedButton as Button };
