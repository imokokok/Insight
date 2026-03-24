'use client';

import { useEffect, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { semanticColors } from '@/lib/config/colors';

interface PriceChangeProps {
  currentPrice: number;
  previousPrice: number;
  currency?: string;
  animated?: boolean;
  className?: string;
}

export function PriceChange({
  currentPrice,
  previousPrice,
  currency = '',
  animated = true,
  className,
}: PriceChangeProps) {
  const [displayValue, setDisplayValue] = useState(0);

  const { percentageChange, isPositive, isNeutral, absoluteChange } = useMemo(() => {
    if (previousPrice === 0) {
      return {
        percentageChange: 0,
        isPositive: false,
        isNeutral: true,
        absoluteChange: 0,
      };
    }

    const change = currentPrice - previousPrice;
    const percentage = (change / previousPrice) * 100;

    return {
      percentageChange: percentage,
      isPositive: change > 0,
      isNeutral: change === 0,
      absoluteChange: Math.abs(change),
    };
  }, [currentPrice, previousPrice]);

  useEffect(() => {
    if (!animated) {
      setDisplayValue(percentageChange);
      return;
    }

    const duration = 600;
    const startTime = performance.now();
    const startValue = displayValue;
    const endValue = percentageChange;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = startValue + (endValue - startValue) * easeOutQuart;

      setDisplayValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [percentageChange, animated]);

  const getColorStyles = () => {
    if (isNeutral) {
      return {
        text: semanticColors.neutral.text,
        bg: semanticColors.neutral.light,
      };
    }
    if (isPositive) {
      return {
        text: semanticColors.success.text,
        bg: semanticColors.success.light,
      };
    }
    return {
      text: semanticColors.danger.text,
      bg: semanticColors.danger.light,
    };
  };

  const getSign = () => {
    if (isNeutral) return '';
    return isPositive ? '+' : '-';
  };

  const formatValue = (value: number) => {
    return Math.abs(value).toFixed(2);
  };

  const colors = getColorStyles();
  const sign = getSign();

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 text-sm font-medium rounded-md transition-all duration-300',
        className
      )}
      style={{
        color: colors.text,
        backgroundColor: colors.bg,
      }}
    >
      <span className="flex items-center">
        {!isNeutral && (
          <span className="mr-0.5 text-xs">
            {isPositive ? '↑' : '↓'}
          </span>
        )}
        <span>
          {sign}
          {formatValue(displayValue)}%
        </span>
      </span>
      {currency && !isNeutral && (
        <span className="text-xs opacity-75">
          ({sign}
          {currency}
          {formatValue(absoluteChange)})
        </span>
      )}
    </span>
  );
}

export default PriceChange;
