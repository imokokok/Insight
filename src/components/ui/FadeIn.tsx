'use client';

import { forwardRef, ReactNode, CSSProperties } from 'react';
import { cn } from '@/lib/utils';

export interface FadeInProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: number;
  once?: boolean;
  style?: CSSProperties;
}

export const FadeIn = forwardRef<HTMLDivElement, FadeInProps>(
  (
    {
      children,
      className,
      delay = 0,
      duration = 500,
      direction = 'up',
      distance = 20,
      once = true,
      style,
    },
    ref
  ) => {
    const getInitialTransform = () => {
      switch (direction) {
        case 'up':
          return `translateY(${distance}px)`;
        case 'down':
          return `translateY(-${distance}px)`;
        case 'left':
          return `translateX(${distance}px)`;
        case 'right':
          return `translateX(-${distance}px)`;
        case 'none':
        default:
          return 'none';
      }
    };

    return (
      <div
        ref={ref}
        className={cn('animate-fade-in', className)}
        style={{
          ...style,
          '--fade-in-delay': `${delay}ms`,
          '--fade-in-duration': `${duration}ms`,
          '--fade-in-transform': getInitialTransform(),
        } as CSSProperties}
      >
        {children}
      </div>
    );
  }
);

FadeIn.displayName = 'FadeIn';

export interface StaggerContainerProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
  initialDelay?: number;
}

export const StaggerContainer = forwardRef<HTMLDivElement, StaggerContainerProps>(
  (
    {
      children,
      className,
      staggerDelay = 100,
      initialDelay = 0,
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn('stagger-container', className)}
        style={
          {
            '--stagger-delay': `${staggerDelay}ms`,
            '--initial-delay': `${initialDelay}ms`,
          } as CSSProperties
        }
      >
        {children}
      </div>
    );
  }
);

StaggerContainer.displayName = 'StaggerContainer';

export interface StaggerItemProps {
  children: ReactNode;
  className?: string;
  index?: number;
}

export const StaggerItem = forwardRef<HTMLDivElement, StaggerItemProps>(
  ({ children, className, index = 0 }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('stagger-item', className)}
        style={{ '--stagger-index': index } as CSSProperties}
      >
        {children}
      </div>
    );
  }
);

StaggerItem.displayName = 'StaggerItem';
