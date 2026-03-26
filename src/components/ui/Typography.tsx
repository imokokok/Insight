'use client';

import React, { type ReactNode, forwardRef } from 'react';

import { cn } from '@/lib/utils';

export interface TypographyProps {
  children: ReactNode;
  className?: string;
  as?: React.ElementType;
}

export const Display = forwardRef<HTMLHeadingElement, TypographyProps>(
  ({ children, className, as: Component = 'h1', ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn('text-5xl font-bold tracking-tight text-gray-900', 'md:text-6xl', className)}
        {...props}
      >
        {children}
      </Component>
    );
  }
);
Display.displayName = 'Display';

export const H1 = forwardRef<HTMLHeadingElement, TypographyProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <h1
        ref={ref}
        className={cn('text-4xl font-bold tracking-tight text-gray-900', 'md:text-5xl', className)}
        {...props}
      >
        {children}
      </h1>
    );
  }
);
H1.displayName = 'H1';

export const H2 = forwardRef<HTMLHeadingElement, TypographyProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <h2
        ref={ref}
        className={cn(
          'text-3xl font-semibold tracking-tight text-gray-900',
          'md:text-4xl',
          className
        )}
        {...props}
      >
        {children}
      </h2>
    );
  }
);
H2.displayName = 'H2';

export const H3 = forwardRef<HTMLHeadingElement, TypographyProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={cn('text-2xl font-semibold text-gray-900', 'md:text-3xl', className)}
        {...props}
      >
        {children}
      </h3>
    );
  }
);
H3.displayName = 'H3';

export const H4 = forwardRef<HTMLHeadingElement, TypographyProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <h4
        ref={ref}
        className={cn('text-xl font-semibold text-gray-900', 'md:text-2xl', className)}
        {...props}
      >
        {children}
      </h4>
    );
  }
);
H4.displayName = 'H4';

export const H5 = forwardRef<HTMLHeadingElement, TypographyProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <h5
        ref={ref}
        className={cn('text-lg font-semibold text-gray-900', 'md:text-xl', className)}
        {...props}
      >
        {children}
      </h5>
    );
  }
);
H5.displayName = 'H5';

export const H6 = forwardRef<HTMLHeadingElement, TypographyProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <h6
        ref={ref}
        className={cn('text-base font-semibold text-gray-900', 'md:text-lg', className)}
        {...props}
      >
        {children}
      </h6>
    );
  }
);
H6.displayName = 'H6';

export const BodyLarge = forwardRef<HTMLParagraphElement, TypographyProps>(
  ({ children, className, as: Component = 'p', ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn('text-lg leading-relaxed text-gray-600', className)}
        {...props}
      >
        {children}
      </Component>
    );
  }
);
BodyLarge.displayName = 'BodyLarge';

export const Body = forwardRef<HTMLParagraphElement, TypographyProps>(
  ({ children, className, as: Component = 'p', ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn('text-base leading-relaxed text-gray-600', className)}
        {...props}
      >
        {children}
      </Component>
    );
  }
);
Body.displayName = 'Body';

export const BodySmall = forwardRef<HTMLParagraphElement, TypographyProps>(
  ({ children, className, as: Component = 'p', ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn('text-sm leading-relaxed text-gray-600', className)}
        {...props}
      >
        {children}
      </Component>
    );
  }
);
BodySmall.displayName = 'BodySmall';

export const Caption = forwardRef<HTMLSpanElement, TypographyProps>(
  ({ children, className, as: Component = 'span', ...props }, ref) => {
    return (
      <Component ref={ref} className={cn('text-xs text-gray-500', className)} {...props}>
        {children}
      </Component>
    );
  }
);
Caption.displayName = 'Caption';

export const Overline = forwardRef<HTMLSpanElement, TypographyProps>(
  ({ children, className, as: Component = 'span', ...props }, ref) => {
    return (
      <Component
        ref={ref}
        className={cn('text-xs font-semibold uppercase tracking-wider text-gray-500', className)}
        {...props}
      >
        {children}
      </Component>
    );
  }
);
Overline.displayName = 'Overline';
