'use client';

import { useEffect, useState, useMemo } from 'react';

export interface ProgressRingProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  showValue?: boolean;
  label?: string;
  formatValue?: (value: number, max: number) => string;
  animate?: boolean;
  animationDuration?: number;
  className?: string;
}

export function ProgressRing({
  value,
  max = 100,
  size = 120,
  strokeWidth = 8,
  color = '#3b82f6',
  bgColor = '#e5e7eb',
  showValue = true,
  label,
  formatValue = (v, m) => `${Math.round((v / m) * 100)}%`,
  animate = true,
  animationDuration = 1000,
  className = '',
}: ProgressRingProps) {
  const [animatedValue, setAnimatedValue] = useState(animate ? 0 : value);

  const radius = useMemo(() => (size - strokeWidth) / 2, [size, strokeWidth]);
  const circumference = useMemo(() => 2 * Math.PI * radius, [radius]);
  const center = useMemo(() => size / 2, [size]);

  const percentage = useMemo(() => {
    const clampedValue = Math.max(0, Math.min(value, max));
    return (clampedValue / max) * 100;
  }, [value, max]);

  const animatedPercentage = useMemo(() => {
    const clampedValue = Math.max(0, Math.min(animatedValue, max));
    return (clampedValue / max) * 100;
  }, [animatedValue, max]);

  const strokeDashoffset = useMemo(
    () => circumference - (animatedPercentage / 100) * circumference,
    [circumference, animatedPercentage]
  );

  useEffect(() => {
    if (!animate) {
      setAnimatedValue(value);
      return;
    }

    const startTime = Date.now();
    const startValue = 0;
    const endValue = value;

    const animateProgress = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / animationDuration, 1);

      // Easing function (ease-out cubic)
      const easeOut = 1 - Math.pow(1 - progress, 3);

      const currentValue = startValue + (endValue - startValue) * easeOut;
      setAnimatedValue(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animateProgress);
      }
    };

    requestAnimationFrame(animateProgress);
  }, [value, animate, animationDuration]);

  const getColorByPercentage = (pct: number): string => {
    if (color !== '#3b82f6') return color;
    // Default gradient colors based on percentage
    if (pct < 30) return '#ef4444'; // red-500
    if (pct < 60) return '#f59e0b'; // amber-500
    if (pct < 80) return '#3b82f6'; // blue-500
    return '#10b981'; // green-500
  };

  const currentColor = getColorByPercentage(percentage);

  return (
    <div
      className={`inline-flex flex-col items-center justify-center ${className}`}
      style={{ width: size, height: size + (label ? 24 : 0) }}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
          viewBox={`0 0 ${size} ${size}`}
        >
          {/* Background circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={bgColor}
            strokeWidth={strokeWidth}
          />

          {/* Progress circle */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={currentColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{
              transition: animate ? 'stroke-dashoffset 0.1s ease-out' : 'none',
            }}
          />
        </svg>

        {/* Center content */}
        {showValue && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold" style={{ color: currentColor }}>
              {formatValue(animatedValue, max)}
            </span>
          </div>
        )}
      </div>

      {/* Label */}
      {label && <span className="mt-2 text-sm text-gray-600 text-center">{label}</span>}
    </div>
  );
}

export default ProgressRing;
