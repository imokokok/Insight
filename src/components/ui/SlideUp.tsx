'use client';

import { forwardRef, type ReactNode, type CSSProperties, useState, useEffect } from 'react';

import { cn } from '@/lib/utils';

export interface SlideUpProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  distance?: number;
  threshold?: number;
  once?: boolean;
  style?: CSSProperties;
}

export const SlideUp = forwardRef<HTMLDivElement, SlideUpProps>(
  (
    {
      children,
      className,
      delay = 0,
      duration = 600,
      distance = 30,
      threshold = 0.1,
      once = true,
      style,
    },
    ref
  ) => {
    const [isVisible, setIsVisible] = useState(false);
    const [hasAnimated, setHasAnimated] = useState(false);

    useEffect(() => {
      const element = ref && 'current' in ref ? ref.current : null;
      if (!element) return;

      if (once && hasAnimated) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              setIsVisible(true);
              setHasAnimated(true);
            }, delay);
            if (once) {
              observer.unobserve(element);
            }
          } else if (!once) {
            setIsVisible(false);
          }
        },
        { threshold }
      );

      observer.observe(element);

      return () => {
        observer.disconnect();
      };
    }, [delay, once, threshold, hasAnimated, ref]);

    return (
      <div
        ref={ref}
        className={cn('transition-all', className)}
        style={{
          ...style,
          transform: isVisible ? 'translateY(0)' : `translateY(${distance}px)`,
          opacity: isVisible ? 1 : 0,
          transitionDuration: `${duration}ms`,
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {children}
      </div>
    );
  }
);

SlideUp.displayName = 'SlideUp';

export interface SlideInProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  direction?: 'left' | 'right' | 'up' | 'down';
  distance?: number;
  threshold?: number;
  once?: boolean;
  style?: CSSProperties;
}

export const SlideIn = forwardRef<HTMLDivElement, SlideInProps>(
  (
    {
      children,
      className,
      delay = 0,
      duration = 600,
      direction = 'left',
      distance = 30,
      threshold = 0.1,
      once = true,
      style,
    },
    ref
  ) => {
    const [isVisible, setIsVisible] = useState(false);
    const [hasAnimated, setHasAnimated] = useState(false);

    useEffect(() => {
      const element = ref && 'current' in ref ? ref.current : null;
      if (!element) return;

      if (once && hasAnimated) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              setIsVisible(true);
              setHasAnimated(true);
            }, delay);
            if (once) {
              observer.unobserve(element);
            }
          } else if (!once) {
            setIsVisible(false);
          }
        },
        { threshold }
      );

      observer.observe(element);

      return () => {
        observer.disconnect();
      };
    }, [delay, once, threshold, hasAnimated, ref]);

    const getTransform = () => {
      if (isVisible) return 'translate(0, 0)';

      switch (direction) {
        case 'left':
          return `translateX(-${distance}px)`;
        case 'right':
          return `translateX(${distance}px)`;
        case 'up':
          return `translateY(${distance}px)`;
        case 'down':
          return `translateY(-${distance}px)`;
        default:
          return `translateX(-${distance}px)`;
      }
    };

    return (
      <div
        ref={ref}
        className={cn('transition-all', className)}
        style={{
          ...style,
          transform: getTransform(),
          opacity: isVisible ? 1 : 0,
          transitionDuration: `${duration}ms`,
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {children}
      </div>
    );
  }
);

SlideIn.displayName = 'SlideIn';
