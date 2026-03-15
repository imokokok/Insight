'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { chartColors, semanticColors } from '@/lib/config/colors';

type GaugeType = 'percentage' | 'value';
type GaugeLevel = 'excellent' | 'good' | 'warning' | 'danger';

interface PerformanceGaugeProps {
  value: number;
  max: number;
  label: string;
  unit?: string;
  type: GaugeType;
  warningThreshold?: number;
  dangerThreshold?: number;
  size?: number;
  showAnimation?: boolean;
  animationDuration?: number;
}

interface GaugeConfig {
  color: string;
  bgColor: string;
  lightBg: string;
  borderColor: string;
  label: string;
}

const LEVEL_CONFIGS: Record<GaugeLevel, Omit<GaugeConfig, 'label'>> = {
  excellent: {
    color: semanticColors.success.DEFAULT,
    bgColor: 'bg-green-500',
    lightBg: 'bg-green-50',
    borderColor: 'border-green-200',
  },
  good: {
    color: chartColors.recharts.primary,
    bgColor: 'bg-blue-500',
    lightBg: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  warning: {
    color: semanticColors.warning.DEFAULT,
    bgColor: 'bg-yellow-500',
    lightBg: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
  },
  danger: {
    color: semanticColors.danger.DEFAULT,
    bgColor: 'bg-red-500',
    lightBg: 'bg-red-50',
    borderColor: 'border-red-200',
  },
};

function getLevelLabel(level: GaugeLevel, t: (key: string, params?: Record<string, string | number>) => string): string {
  switch (level) {
    case 'excellent':
      return t('oracleCommon.performanceGauge.levels.excellent');
    case 'good':
      return t('oracleCommon.performanceGauge.levels.good');
    case 'warning':
      return t('oracleCommon.performanceGauge.levels.warning');
    case 'danger':
      return t('oracleCommon.performanceGauge.levels.danger');
  }
}

function getLevelForPercentage(
  percentage: number,
  _warningThreshold: number,
  _dangerThreshold: number
): GaugeLevel {
  if (percentage <= 20 || percentage >= 95) return 'excellent';
  if (percentage <= 40 || percentage >= 90) return 'good';
  if (percentage <= 60 || percentage >= 80) return 'warning';
  return 'danger';
}

function getLevelForValue(
  percentage: number,
  _warningThreshold: number,
  _dangerThreshold: number
): GaugeLevel {
  if (percentage >= 95) return 'excellent';
  if (percentage >= 90) return 'good';
  if (percentage >= 80) return 'warning';
  return 'danger';
}

function formatValue(value: number, unit?: string): string {
  if (unit === 'ms') {
    if (value < 1000) return `${value.toFixed(0)}ms`;
    return `${(value / 1000).toFixed(2)}s`;
  }
  if (unit === '%') {
    return `${value.toFixed(1)}%`;
  }
  if (unit === '次/分') {
    return `${value.toFixed(1)}`;
  }
  return value.toFixed(2);
}

interface SingleGaugeProps {
  value: number;
  max: number;
  label: string;
  unit?: string;
  type: GaugeType;
  warningThreshold: number;
  dangerThreshold: number;
  size: number;
  showAnimation: boolean;
  animationDuration: number;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function SingleGauge({
  value,
  max,
  label,
  unit,
  type,
  warningThreshold,
  dangerThreshold,
  size,
  showAnimation,
  animationDuration,
  t,
}: SingleGaugeProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const startValueRef = useRef(0);

  const clampedValue = Math.min(Math.max(value, 0), max);
  const targetPercentage = (clampedValue / max) * 100;

  const getLevel = useCallback(
    (percentage: number): GaugeLevel => {
      if (type === 'percentage') {
        return getLevelForPercentage(percentage, warningThreshold, dangerThreshold);
      }
      return getLevelForValue(percentage, warningThreshold, dangerThreshold);
    },
    [type, warningThreshold, dangerThreshold]
  );

  const currentDisplayValue = showAnimation ? displayValue : clampedValue;
  const currentPercentage = showAnimation ? animatedPercentage : targetPercentage;
  const level = useMemo(() => getLevel(currentPercentage), [getLevel, currentPercentage]);
  const levelConfig = LEVEL_CONFIGS[level];
  const levelLabel = getLevelLabel(level, t);

  useEffect(() => {
    if (!showAnimation) {
      return;
    }

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / animationDuration, 1);

      const easeOutQuart = 1 - Math.pow(1 - progress, 4);

      startValueRef.current = 0;
      const currentValue =
        startValueRef.current + (clampedValue - startValueRef.current) * easeOutQuart;
      const currentPct = (currentValue / max) * 100;

      setDisplayValue(currentValue);
      setAnimatedPercentage(currentPct);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    startTimeRef.current = null;
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [clampedValue, max, showAnimation, animationDuration]);

  const strokeWidth = size * 0.1;
  const radius = (size - strokeWidth) / 2 - 10;
  const centerX = size / 2;
  const centerY = size / 2 + 5;

  const startAngle = -180;
  const endAngle = 0;
  const angleRange = endAngle - startAngle;

  const gaugeStartAngle = startAngle;
  const gaugeEndAngle = startAngle + (currentPercentage / 100) * angleRange;

  const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => {
    const radians = (angle * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(radians),
      y: cy + r * Math.sin(radians),
    };
  };

  const describeArc = (cx: number, cy: number, r: number, startAng: number, endAng: number) => {
    const start = polarToCartesian(cx, cy, r, endAng);
    const end = polarToCartesian(cx, cy, r, startAng);
    const largeArcFlag = endAng - startAng <= 180 ? 0 : 1;

    return ['M', start.x, start.y, 'A', r, r, 0, largeArcFlag, 0, end.x, end.y].join(' ');
  };

  const backgroundArc = describeArc(centerX, centerY, radius, startAngle, endAngle);
  const valueArc = describeArc(centerX, centerY, radius, gaugeStartAngle, gaugeEndAngle);

  // 刻度在弧形内部
  const tickCount = 5;
  const ticks = [];
  for (let i = 0; i <= tickCount; i++) {
    const angle = startAngle + (i / tickCount) * angleRange;
    const outerRadius = radius - strokeWidth / 2 - 2;
    const innerRadius = radius - strokeWidth / 2 - 8;
    const inner = polarToCartesian(centerX, centerY, innerRadius, angle);
    const outer = polarToCartesian(centerX, centerY, outerRadius, angle);
    const labelRadius = radius - strokeWidth / 2 - 18;
    const labelPos = polarToCartesian(centerX, centerY, labelRadius, angle);
    ticks.push({
      x1: inner.x,
      y1: inner.y,
      x2: outer.x,
      y2: outer.y,
      labelX: labelPos.x,
      labelY: labelPos.y,
      value: (i / tickCount) * max,
    });
  }

  const needleAngle = gaugeEndAngle;
  const needleLength = radius - strokeWidth - 8;
  const needleBase = polarToCartesian(centerX, centerY, needleLength, needleAngle);
  const needleWidth = 3;

  const needleLeft = polarToCartesian(centerX, centerY, needleWidth, needleAngle - 90);
  const needleRight = polarToCartesian(centerX, centerY, needleWidth, needleAngle + 90);

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size * 0.6 }}>
        <svg
          width={size}
          height={size * 0.6}
          viewBox={`0 0 ${size} ${size * 0.6}`}
          className="overflow-visible"
        >
          <defs>
            <linearGradient id={`gaugeGradient-${label}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={levelConfig.color} stopOpacity="1" />
              <stop offset="100%" stopColor={levelConfig.color} stopOpacity="0.7" />
            </linearGradient>
            <filter id={`glow-${label}`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <path
            d={backgroundArc}
            fill="none"
            stroke={chartColors.grid.line}
            strokeWidth={strokeWidth}
          />

          <path
            d={valueArc}
            fill="none"
            stroke={`url(#gaugeGradient-${label})`}
            strokeWidth={strokeWidth}
            filter={`url(#glow-${label})`}
            className="transition-all duration-300"
          />

          {ticks.map((tick, index) => (
            <g key={index}>
              <line
                x1={tick.x1}
                y1={tick.y1}
                x2={tick.x2}
                y2={tick.y2}
                stroke={chartColors.grid.axis}
                strokeWidth={1.5}
              />
              <text
                x={tick.labelX}
                y={tick.labelY}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="8"
                fill={chartColors.recharts.axisLight}
                fontWeight="500"
              >
                {type === 'percentage'
                  ? `${((tick.value / max) * 100).toFixed(0)}%`
                  : tick.value.toFixed(0)}
              </text>
            </g>
          ))}

          <g
            className="transition-transform duration-300"
            style={{ transformOrigin: `${centerX}px ${centerY}px` }}
          >
            <polygon
              points={`${needleBase.x},${needleBase.y} ${needleLeft.x},${needleLeft.y} ${centerX},${centerY} ${needleRight.x},${needleRight.y}`}
              fill={levelConfig.color}
              className="drop-"
            />
            <circle cx={centerX} cy={centerY} r={strokeWidth / 2 + 1} fill={levelConfig.color} />
            <circle cx={centerX} cy={centerY} r={strokeWidth / 4} fill="white" />
          </g>
        </svg>

        <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 text-center">
          <div className="text-xl font-bold" style={{ color: levelConfig.color }}>
            {formatValue(currentDisplayValue, unit)}
          </div>
          <div className="text-xs text-gray-500">{levelLabel}</div>
        </div>
      </div>

      <div className="mt-2 text-center">
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {type === 'value' && (
          <p className="text-xs text-gray-400 mt-0.5">
            {t('oracleCommon.performanceGauge.range', { value: formatValue(max, unit) })}
          </p>
        )}
      </div>
    </div>
  );
}

interface PerformanceGaugeGroupProps {
  gauges: Array<{
    value: number;
    max: number;
    label: string;
    unit?: string;
    type: GaugeType;
    warningThreshold?: number;
    dangerThreshold?: number;
  }>;
  size?: number;
  showAnimation?: boolean;
  animationDuration?: number;
}

export function PerformanceGaugeGroup({
  gauges,
  size = 140,
  showAnimation = true,
  animationDuration = 1500,
}: PerformanceGaugeGroupProps) {
  const { t } = useI18n();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {gauges.map((gauge, index) => (
        <div key={index} className="bg-white border border-gray-200  p-4  hover: transition-shadow">
          <SingleGauge
            value={gauge.value}
            max={gauge.max}
            label={gauge.label}
            unit={gauge.unit}
            type={gauge.type}
            warningThreshold={gauge.warningThreshold ?? 80}
            dangerThreshold={gauge.dangerThreshold ?? 60}
            size={size}
            showAnimation={showAnimation}
            animationDuration={animationDuration}
            t={t}
          />
        </div>
      ))}
    </div>
  );
}

export function PerformanceGauge({
  value,
  max,
  label,
  unit,
  type,
  warningThreshold = 80,
  dangerThreshold = 60,
  size = 140,
  showAnimation = true,
  animationDuration = 1500,
}: PerformanceGaugeProps) {
  const { t } = useI18n();
  return (
    <div className="bg-white border border-gray-200  p-4  hover: transition-shadow">
      <SingleGauge
        value={value}
        max={max}
        label={label}
        unit={unit}
        type={type}
        warningThreshold={warningThreshold}
        dangerThreshold={dangerThreshold}
        size={size}
        showAnimation={showAnimation}
        animationDuration={animationDuration}
        t={t}
      />
    </div>
  );
}

export default PerformanceGauge;
export type { PerformanceGaugeProps, PerformanceGaugeGroupProps, GaugeType, GaugeLevel };
