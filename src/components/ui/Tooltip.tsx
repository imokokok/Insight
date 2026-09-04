'use client';

import { forwardRef, type ReactNode, useState, useRef, useEffect } from 'react';

import { cn } from '@/lib/utils';

type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

interface TooltipProps {
  children: ReactNode;
  content: ReactNode;
  placement?: TooltipPlacement;
  delay?: number;
  disabled?: boolean;
  className?: string;
  contentClassName?: string;
}

export const Tooltip = forwardRef<HTMLDivElement, TooltipProps>(
  (
    {
      children,
      content,
      placement = 'top',
      delay = 200,
      disabled = false,
      className,
      contentClassName,
    },
    ref
  ) => {
    const [isVisible, setIsVisible] = useState(false);
    const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
      return () => {
        if (timeoutIdRef.current) {
          clearTimeout(timeoutIdRef.current);
        }
      };
    }, []);

    const showTooltip = () => {
      if (disabled) return;
      timeoutIdRef.current = setTimeout(() => setIsVisible(true), delay);
    };

    const hideTooltip = () => {
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
      setIsVisible(false);
    };

    const placementStyles = {
      top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
      bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
      left: 'right-full top-1/2 -translate-y-1/2 mr-2',
      right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    };

    const arrowStyles = {
      top: 'top-full left-1/2 -translate-x-1/2 -mt-1 border-l-transparent border-r-transparent border-b-transparent',
      bottom:
        'bottom-full left-1/2 -translate-x-1/2 -mb-1 border-l-transparent border-r-transparent border-t-transparent',
      left: 'left-full top-1/2 -translate-y-1/2 -ml-1 border-t-transparent border-b-transparent border-r-transparent',
      right:
        'right-full top-1/2 -translate-y-1/2 -mr-1 border-t-transparent border-b-transparent border-l-transparent',
    };

    return (
      <div
        ref={ref}
        className={cn('relative inline-block', className)}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
      >
        {children}
        {isVisible && !disabled && (
          <div
            className={cn(
              'absolute z-50 whitespace-nowrap border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white',
              'transition-opacity duration-200',
              placementStyles[placement],
              contentClassName
            )}
            role="tooltip"
          >
            {content}
            <span
              className={cn(
                'absolute w-2 h-2 bg-gray-900 border-4 border-gray-900',
                arrowStyles[placement]
              )}
            />
          </div>
        )}
      </div>
    );
  }
);

Tooltip.displayName = 'Tooltip';
