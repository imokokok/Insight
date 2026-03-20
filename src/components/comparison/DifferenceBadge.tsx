'use client';

import { useTranslations } from 'next-intl';
import { DifferenceSeverity, DifferenceHighlight } from './types';
import { semanticColors } from '@/lib/config/colors';

interface DifferenceBadgeProps {
  value: number;
  type?: 'percentage' | 'absolute' | 'currency';
  threshold?: {
    low: number;
    medium: number;
    high: number;
  };
  showIcon?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const defaultThreshold = {
  low: 0.5,
  medium: 1.0,
  high: 2.0,
};

const sizeClasses = {
  sm: 'text-xs px-1.5 py-0.5',
  md: 'text-sm px-2 py-1',
  lg: 'text-base px-3 py-1.5',
};

export function DifferenceBadge({
  value,
  type = 'percentage',
  threshold = defaultThreshold,
  showIcon = true,
  size = 'md',
  className = '',
}: DifferenceBadgeProps) {
  const t = useTranslations('comparison.difference');

  const getSeverity = (val: number): DifferenceSeverity => {
    const absVal = Math.abs(val);
    if (absVal >= threshold.high) return 'critical';
    if (absVal >= threshold.medium) return 'high';
    if (absVal >= threshold.low) return 'medium';
    if (absVal > 0) return 'low';
    return 'none';
  };

  const getSeverityStyles = (
    severity: DifferenceSeverity
  ): { bg: string; text: string; border: string } => {
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-danger-100',
          text: 'text-danger-700',
          border: 'border-red-300',
        };
      case 'high':
        return {
          bg: 'bg-warning-100',
          text: 'text-orange-700',
          border: 'border-orange-300',
        };
      case 'medium':
        return {
          bg: 'bg-warning-100',
          text: 'text-warning-700',
          border: 'border-yellow-300',
        };
      case 'low':
        return {
          bg: 'bg-primary-100',
          text: 'text-primary-700',
          border: 'border-primary-300',
        };
      default:
        return {
          bg: 'bg-gray-100',
          text: 'text-gray-600',
          border: 'border-gray-300',
        };
    }
  };

  const formatValue = (val: number): string => {
    const prefix = val >= 0 ? '+' : '';
    switch (type) {
      case 'percentage':
        return `${prefix}${val.toFixed(2)}%`;
      case 'currency':
        return `${prefix}$${val.toFixed(2)}`;
      case 'absolute':
      default:
        return `${prefix}${val.toFixed(2)}`;
    }
  };

  const getIcon = (val: number): string => {
    if (val > 0) return '↑';
    if (val < 0) return '↓';
    return '→';
  };

  const severity = getSeverity(value);
  const styles = getSeverityStyles(severity);
  const formattedValue = formatValue(value);
  const icon = getIcon(value);

  return (
    <span
      className={`inline-flex items-center gap-1 font-medium border ${styles.bg} ${styles.text} ${styles.border} ${sizeClasses[size]} ${className}`}
    >
      {showIcon && <span>{icon}</span>}
      <span>{formattedValue}</span>
    </span>
  );
}

interface DifferenceCellProps {
  primary: number;
  comparison: number;
  type?: 'percentage' | 'absolute' | 'currency';
  highlight?: boolean;
  className?: string;
}

export function DifferenceCell({
  primary,
  comparison,
  type = 'percentage',
  highlight = true,
  className = '',
}: DifferenceCellProps) {
  const t = useTranslations('comparison.difference');

  const difference = primary - comparison;
  const percentChange = comparison !== 0 ? (difference / comparison) * 100 : 0;

  const formatValue = (val: number): string => {
    switch (type) {
      case 'percentage':
        return `${val.toFixed(2)}%`;
      case 'currency':
        return `$${val.toFixed(2)}`;
      case 'absolute':
      default:
        return val.toFixed(2);
    }
  };

  const getTrendColor = (val: number): string => {
    if (!highlight) return 'text-gray-600';
    if (val > 0) return 'text-success-600';
    if (val < 0) return 'text-danger-600';
    return 'text-gray-600';
  };

  const getTrendIcon = (val: number): string => {
    if (val > 0) return '↑';
    if (val < 0) return '↓';
    return '→';
  };

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="font-mono text-gray-900">{formatValue(primary)}</div>
      {highlight && (
        <div className={`text-xs ${getTrendColor(percentChange)}`}>
          <span>{getTrendIcon(percentChange)}</span>
          <span className="ml-1">
            {percentChange >= 0 ? '+' : ''}
            {percentChange.toFixed(2)}%
          </span>
        </div>
      )}
    </div>
  );
}

interface ComparisonRowProps {
  label: string;
  primary: number | string;
  comparison: number | string;
  type?: 'percentage' | 'absolute' | 'currency';
  invertColors?: boolean;
  className?: string;
}

export function ComparisonRow({
  label,
  primary,
  comparison,
  type = 'absolute',
  invertColors = false,
  className = '',
}: ComparisonRowProps) {
  const t = useTranslations('comparison');

  const primaryNum = typeof primary === 'string' ? parseFloat(primary) : primary;
  const comparisonNum = typeof comparison === 'string' ? parseFloat(comparison) : comparison;

  const difference = primaryNum - comparisonNum;
  const percentChange = comparisonNum !== 0 ? (difference / comparisonNum) * 100 : 0;

  const formatValue = (val: number): string => {
    if (isNaN(val)) return '-';
    switch (type) {
      case 'percentage':
        return `${val.toFixed(2)}%`;
      case 'currency':
        return `$${val.toFixed(2)}`;
      case 'absolute':
      default:
        return val.toFixed(2);
    }
  };

  const getTrendColor = (val: number): string => {
    const isPositive = invertColors ? val < 0 : val > 0;
    if (isPositive) return 'text-success-600';
    if (val === 0) return 'text-gray-600';
    return 'text-danger-600';
  };

  return (
    <div className={`grid grid-cols-3 gap-4 py-3 border-b border-gray-100 ${className}`}>
      <div className="text-sm text-gray-600">{label}</div>
      <div className="text-sm font-mono text-right text-gray-900">{formatValue(primaryNum)}</div>
      <div className="text-sm font-mono text-right">
        <span className="text-gray-500">{formatValue(comparisonNum)}</span>
        <span className={`ml-2 ${getTrendColor(percentChange)}`}>
          ({percentChange >= 0 ? '+' : ''}
          {percentChange.toFixed(1)}%)
        </span>
      </div>
    </div>
  );
}

export default DifferenceBadge;
