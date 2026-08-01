'use client';

import { useEffect, useState, useRef } from 'react';

import { cn } from '@/lib/utils';

interface PriceFlashProps {
  value: number;
  previousValue?: number;
  className?: string;
  children?: React.ReactNode;
}

const FLASH_THRESHOLD_PERCENT = 0.1;

export function PriceFlash({ value, previousValue, className, children }: PriceFlashProps) {
  const [flashClass, setFlashClass] = useState('');
  const [changeDescription, setChangeDescription] = useState('Price unchanged');
  const prevRef = useRef<number | undefined>(previousValue);

  useEffect(() => {
    const prev = prevRef.current;
    if (prev !== undefined && prev > 0 && value !== prev) {
      const changePercent = (Math.abs(value - prev) / prev) * 100;
      if (changePercent < FLASH_THRESHOLD_PERCENT) {
        prevRef.current = value;
        return;
      }
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!prefersReducedMotion) {
        const direction = value > prev ? 'up' : 'down';
        const rafId = requestAnimationFrame(() => {
          setFlashClass(direction === 'up' ? 'price-flash-up' : 'price-flash-down');
        });
        const timer = setTimeout(() => setFlashClass(''), 500);
        prevRef.current = value;
        return () => {
          cancelAnimationFrame(rafId);
          clearTimeout(timer);
        };
      }

      const direction = value > prev ? 'increased' : 'decreased';
      const percent = ((Math.abs(value - prev) / prev) * 100).toFixed(2);
      setChangeDescription(`Price ${direction} by ${percent}%`);
    }
    prevRef.current = value;
    return undefined;
  }, [value]);

  return (
    <span
      className={cn(
        'inline-block rounded px-1 transition-colors duration-300',
        flashClass,
        className
      )}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={changeDescription}
    >
      {children || value}
    </span>
  );
}
