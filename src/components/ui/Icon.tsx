'use client';

import { forwardRef, SVGAttributes } from 'react';
import { cn } from '@/lib/utils';
import * as LucideIcons from 'lucide-react';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type IconColor = 'inherit' | 'current' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'gray';

export interface IconProps extends Omit<SVGAttributes<SVGSVGElement>, 'size' | 'color'> {
  name: keyof typeof LucideIcons;
  size?: IconSize | number;
  color?: IconColor;
  className?: string;
}

export const Icon = forwardRef<HTMLSpanElement, IconProps>(
  (
    {
      name,
      size = 'md',
      color = 'current',
      className,
      ...props
    },
    ref
  ) => {
    const LucideIcon = LucideIcons[name] as React.ComponentType<SVGAttributes<SVGSVGElement>>;

    if (!LucideIcon) {
      console.warn(`Icon "${name}" not found in Lucide icons`);
      return null;
    }

    const sizeStyles: Record<IconSize, string> = {
      xs: 'w-3 h-3',
      sm: 'w-4 h-4',
      md: 'w-5 h-5',
      lg: 'w-6 h-6',
      xl: 'w-8 h-8',
      '2xl': 'w-10 h-10',
    };

    const colorStyles: Record<IconColor, string> = {
      inherit: 'text-inherit',
      current: 'text-current',
      primary: 'text-primary-600',
      secondary: 'text-gray-600',
      success: 'text-success-600',
      warning: 'text-warning-600',
      danger: 'text-danger-600',
      info: 'text-blue-600',
      gray: 'text-gray-400',
    };

    const getSize = () => {
      if (typeof size === 'number') {
        return { width: size, height: size };
      }
      return {};
    };

    const getSizeClass = () => {
      if (typeof size === 'string') {
        return sizeStyles[size];
      }
      return '';
    };

    return (
      <span ref={ref} className="inline-flex">
        <LucideIcon
          className={cn(
            getSizeClass(),
            colorStyles[color],
            className
          )}
          style={getSize()}
          {...props}
        />
      </span>
    );
  }
);

Icon.displayName = 'Icon';

// Helper component for creating icon wrappers with consistent styling
export interface IconWrapperProps {
  children: React.ReactNode;
  size?: IconSize;
  className?: string;
}

import { ReactNode } from 'react';

export const IconWrapper = forwardRef<HTMLSpanElement, IconWrapperProps>(
  (
    {
      children,
      size = 'md',
      className,
    },
    ref
  ) => {
    const sizeStyles: Record<IconSize, string> = {
      xs: 'w-4 h-4',
      sm: 'w-5 h-5',
      md: 'w-6 h-6',
      lg: 'w-8 h-8',
      xl: 'w-10 h-10',
      '2xl': 'w-12 h-12',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center',
          sizeStyles[size],
          className
        )}
      >
        {children}
      </span>
    );
  }
);

IconWrapper.displayName = 'IconWrapper';
