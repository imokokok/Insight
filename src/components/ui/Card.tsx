'use client';

import { type ReactNode, forwardRef } from 'react';

import { cn } from '@/lib/utils';

/**
 * Props for the Card component
 */
export interface CardProps {
  /** Card content */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Visual style variant */
  variant?: 'default' | 'elevated' | 'bordered' | 'filled' | 'interactive';
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Click handler for interactive cards */
  onClick?: () => void;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ children, className, variant = 'default', size = 'md', onClick, ...props }, ref) => {
    const baseStyles = 'rounded-lg transition-all duration-200';

    const variants = {
      default: 'bg-white border border-gray-200 shadow-sm',
      elevated: 'bg-white border border-gray-200 shadow-md hover:shadow-lg hover:-translate-y-0.5',
      bordered: 'bg-white border-2 border-primary-500 shadow-sm',
      filled: 'bg-gray-50 border-none',
      interactive:
        'bg-white border border-gray-200 shadow-sm cursor-pointer hover:border-primary-300 hover:bg-primary-50/30 hover:shadow-md active:scale-[0.99]',
    };

    const sizes = {
      sm: 'p-4',
      md: 'p-5',
      lg: 'p-6',
    };

    return (
      <div
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        onClick={onClick}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

/**
 * Props for the CardHeader component
 */
export interface CardHeaderProps {
  /** Header content */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-center justify-between pb-4 border-b border-gray-100', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

/**
 * Props for the CardTitle component
 */
export interface CardTitleProps {
  /** Title content */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <h3 ref={ref} className={cn('text-base font-semibold text-gray-900', className)} {...props}>
        {children}
      </h3>
    );
  }
);

CardTitle.displayName = 'CardTitle';

/**
 * Props for the CardDescription component
 */
export interface CardDescriptionProps {
  /** Description content */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <p ref={ref} className={cn('text-sm text-gray-500 mt-1', className)} {...props}>
        {children}
      </p>
    );
  }
);

CardDescription.displayName = 'CardDescription';

/**
 * Props for the CardContent component
 */
export interface CardContentProps {
  /** Content to render */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div ref={ref} className={cn('pt-4', className)} {...props}>
        {children}
      </div>
    );
  }
);

CardContent.displayName = 'CardContent';

/**
 * Props for the CardFooter component
 */
export interface CardFooterProps {
  /** Footer content */
  children: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-between pt-4 mt-4 border-t border-gray-100 bg-gray-50/50 -mx-5 -mb-5 px-5 pb-4 rounded-b-lg',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';

/**
 * Props for the StatCard component
 */
export interface StatCardProps {
  /** Card title */
  title: string;
  /** Main value to display */
  value: string | number;
  /** Change indicator text */
  change?: string;
  /** Type of change for styling */
  changeType?: 'positive' | 'negative' | 'neutral';
  /** Optional icon to display */
  icon?: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export const StatCard = forwardRef<HTMLDivElement, StatCardProps>(
  ({ title, value, change, changeType = 'neutral', icon, className, ...props }, ref) => {
    const changeColors = {
      positive: 'text-success-600 bg-success-50',
      negative: 'text-danger-600 bg-danger-50',
      neutral: 'text-gray-600 bg-gray-100',
    };

    const changeIcons = {
      positive: '↑',
      negative: '↓',
      neutral: '→',
    };

    return (
      <Card ref={ref} variant="elevated" className={cn('flex flex-col', className)} {...props}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1 font-tabular">{value}</p>
            {change && (
              <div
                className={cn(
                  'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-2',
                  changeColors[changeType]
                )}
              >
                <span>{changeIcons[changeType]}</span>
                <span>{change}</span>
              </div>
            )}
          </div>
          {icon && (
            <div className="p-2.5 bg-gray-100 rounded-lg text-gray-600 flex-shrink-0">{icon}</div>
          )}
        </div>
      </Card>
    );
  }
);

StatCard.displayName = 'StatCard';
