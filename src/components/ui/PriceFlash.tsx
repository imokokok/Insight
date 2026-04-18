'use client';

import { useEffect, useState, useRef } from 'react';

import { cn } from '@/lib/utils';

interface PriceFlashProps {
  value: number;
  previousValue?: number;
  className?: string;
  children?: React.ReactNode;
}

export function PriceFlash({ value, previousValue, className, children }: PriceFlashProps) {
  const [flashClass, setFlashClass] = useState('');
  const prevRef = useRef<number | undefined>(previousValue);

  useEffect(() => {
    const prev = prevRef.current;
    if (prev !== undefined && value !== prev) {
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!prefersReducedMotion) {
        const direction = value > prev ? 'up' : 'down';
        requestAnimationFrame(() => {
          setFlashClass(direction === 'up' ? 'price-flash-up' : 'price-flash-down');
        });
        const timer = setTimeout(() => setFlashClass(''), 500);
        prevRef.current = value;
        return () => clearTimeout(timer);
      }
    }
    prevRef.current = value;
  }, [value]);

  // Determine change description for accessibility
  const getChangeDescription = () => {
    const prev = prevRef.current;
    if (prev === undefined || value === prev) return 'Price unchanged';
    const direction = value > prev ? 'increased' : 'decreased';
    const percent = ((Math.abs(value - prev) / prev) * 100).toFixed(2);
    return `Price ${direction} by ${percent}%`;
  };

  const changeDescription = getChangeDescription();

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
