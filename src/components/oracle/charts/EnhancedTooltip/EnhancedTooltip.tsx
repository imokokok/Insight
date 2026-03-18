'use client';

import { memo, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { baseColors, semanticColors, chartColors } from '@/lib/config/colors';

// Types
export interface TooltipDataPoint {
  dataKey: string;
  value: number;
  color: string;
  payload: Record<string, unknown>;
  name?: string;
}

export interface TooltipComparisonData {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
}

export interface EnhancedTooltipProps {
  active?: boolean;
  payload?: TooltipDataPoint[];
  label?: string;
  title?: string;
  showComparison?: boolean;
  comparisonData?: TooltipComparisonData;
  highlightDifferences?: boolean;
  formatValue?: (value: number, dataKey: string) => string;
  formatLabel?: (label: string) => string;
  additionalContent?: React.ReactNode;
  isMobile?: boolean;
  maxItems?: number;
  className?: string;
}

// Utility functions
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

function formatPercentage(value: number): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function formatNumber(value: number): string {
  if (Math.abs(value) >= 1e9) {
    return `${(value / 1e9).toFixed(2)}B`;
  }
  if (Math.abs(value) >= 1e6) {
    return `${(value / 1e6).toFixed(2)}M`;
  }
  if (Math.abs(value) >= 1e3) {
    return `${(value / 1e3).toFixed(2)}K`;
  }
  return value.toFixed(2);
}

// Comparison Badge Component
interface ComparisonBadgeProps {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  isMobile?: boolean;
}

const ComparisonBadge = memo(function ComparisonBadge({
  current,
  previous,
  change,
  changePercent,
  isMobile = false,
}: ComparisonBadgeProps) {
  const isPositive = change >= 0;
  const t = useTranslations('enhancedTooltip');

  return (
    <div
      className={`mt-3 pt-3 border-t ${isMobile ? 'text-[10px]' : 'text-xs'}`}
      style={{ borderColor: baseColors.gray[200] }}
    >
      <div className="flex items-center justify-between mb-2">
        <span style={{ color: baseColors.gray[500] }}>{t('comparison.title')}</span>
        <span
          className={`font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}
        >
          {formatPercentage(changePercent)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div
          className="p-2 rounded"
          style={{ backgroundColor: baseColors.gray[50] }}
        >
          <div style={{ color: baseColors.gray[500] }}>{t('comparison.previous')}</div>
          <div className="font-mono font-medium" style={{ color: baseColors.gray[700] }}>
            {formatCurrency(previous)}
          </div>
        </div>
        <div
          className="p-2 rounded"
          style={{ backgroundColor: isPositive ? `${semanticColors.success.light}50` : `${semanticColors.danger.light}50` }}
        >
          <div style={{ color: baseColors.gray[500] }}>{t('comparison.current')}</div>
          <div
            className="font-mono font-medium"
            style={{ color: isPositive ? semanticColors.success.dark : semanticColors.danger.dark }}
          >
            {formatCurrency(current)}
          </div>
        </div>
      </div>
    </div>
  );
});

// Data Point Row Component
interface DataPointRowProps {
  dataKey: string;
  value: number;
  color: string;
  name?: string;
  index: number;
  isMobile?: boolean;
  formatValue?: (value: number, dataKey: string) => string;
  highlightDifferences?: boolean;
  allValues?: number[];
}

const DataPointRow = memo(function DataPointRow({
  dataKey,
  value,
  color,
  name,
  index,
  isMobile = false,
  formatValue,
  highlightDifferences = false,
  allValues = [],
}: DataPointRowProps) {
  const displayValue = formatValue ? formatValue(value, dataKey) : formatCurrency(value);
  const displayName = name || dataKey;

  // Calculate if this value is significantly different from others
  const isDifferent = useMemo(() => {
    if (!highlightDifferences || allValues.length < 2) return false;
    const avg = allValues.reduce((a, b) => a + b, 0) / allValues.length;
    const deviation = Math.abs(value - avg) / avg;
    return deviation > 0.1; // 10% threshold
  }, [highlightDifferences, allValues, value]);

  return (
    <div
      className={`flex items-center justify-between py-1.5 ${
        index > 0 ? 'border-t' : ''
      } ${isMobile ? 'text-[10px]' : 'text-xs'}`}
      style={{ borderColor: baseColors.gray[100] }}
    >
      <div className="flex items-center gap-2">
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: color }}
        />
        <span
          style={{ color: baseColors.gray[600] }}
          className={isDifferent ? 'font-medium' : ''}
        >
          {displayName}
        </span>
        {isDifferent && (
          <span
            className="text-[8px] px-1 rounded"
            style={{
              backgroundColor: semanticColors.warning.light,
              color: semanticColors.warning.dark,
            }}
          >
            !
          </span>
        )}
      </div>
      <span
        className="font-mono font-medium"
        style={{ color: baseColors.gray[900] }}
      >
        {displayValue}
      </span>
    </div>
  );
});

// Main Enhanced Tooltip Component
export const EnhancedTooltip = memo(function EnhancedTooltip({
  active,
  payload,
  label,
  title,
  showComparison = false,
  comparisonData,
  highlightDifferences = false,
  formatValue,
  formatLabel,
  additionalContent,
  isMobile = false,
  maxItems = 10,
  className = '',
}: EnhancedTooltipProps) {
  const t = useTranslations('enhancedTooltip');

  if (!active || !payload || payload.length === 0) return null;

  // Filter and limit payload items
  const filteredPayload = useMemo(() => {
    // Filter out internal/technical data keys
    const excludedKeys = ['timestamp', 'time', 'isComparison'];
    return payload
      .filter((item) => !excludedKeys.includes(item.dataKey))
      .slice(0, maxItems);
  }, [payload, maxItems]);

  // Extract all values for comparison highlighting
  const allValues = useMemo(() => {
    return filteredPayload.map((item) => item.value).filter((v): v is number => typeof v === 'number');
  }, [filteredPayload]);

  // Format the label
  const formattedLabel = formatLabel ? formatLabel(label || '') : label;

  return (
    <div
      className={`
        bg-white rounded-lg shadow-lg border
        ${isMobile ? 'p-2.5 max-w-[220px]' : 'p-4 max-w-sm'}
        ${className}
      `}
      style={{
        borderColor: baseColors.gray[200],
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      }}
    >
      {/* Header */}
      <div className="mb-3">
        {title && (
          <div
            className={`font-semibold mb-1 ${isMobile ? 'text-xs' : 'text-sm'}`}
            style={{ color: baseColors.gray[900] }}
          >
            {title}
          </div>
        )}
        {formattedLabel && (
          <div
            className={`font-medium ${isMobile ? 'text-[10px]' : 'text-xs'}`}
            style={{ color: baseColors.gray[500] }}
          >
            {formattedLabel}
          </div>
        )}
      </div>

      {/* Data Points */}
      <div className="space-y-0.5">
        {filteredPayload.map((item, index) => (
          <DataPointRow
            key={item.dataKey}
            dataKey={item.dataKey}
            value={item.value}
            color={item.color}
            name={item.name}
            index={index}
            isMobile={isMobile}
            formatValue={formatValue}
            highlightDifferences={highlightDifferences}
            allValues={allValues}
          />
        ))}
      </div>

      {/* Comparison Section */}
      {showComparison && comparisonData && (
        <ComparisonBadge
          current={comparisonData.current}
          previous={comparisonData.previous}
          change={comparisonData.change}
          changePercent={comparisonData.changePercent}
          isMobile={isMobile}
        />
      )}

      {/* Additional Content */}
      {additionalContent && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: baseColors.gray[200] }}>
          {additionalContent}
        </div>
      )}

      {/* Footer - Data Count Indicator */}
      {payload.length > maxItems && (
        <div
          className={`mt-2 pt-2 border-t text-center ${isMobile ? 'text-[8px]' : 'text-[10px]'}`}
          style={{ borderColor: baseColors.gray[100], color: baseColors.gray[400] }}
        >
          {t('moreItems', { count: payload.length - maxItems })}
        </div>
      )}
    </div>
  );
});

// Specialized Tooltip Variants

// Price Tooltip
interface PriceTooltipProps {
  active?: boolean;
  payload?: TooltipDataPoint[];
  label?: string;
  showVolume?: boolean;
  showMA?: boolean;
  isMobile?: boolean;
}

export const PriceTooltip = memo(function PriceTooltip({
  active,
  payload,
  label,
  showVolume = true,
  showMA = true,
  isMobile = false,
}: PriceTooltipProps) {
  const t = useTranslations('enhancedTooltip');

  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0]?.payload as Record<string, number>;
  if (!data) return null;

  const price = data.price;
  const volume = data.volume;
  const ma7 = data.ma7;
  const ma14 = data.ma14;
  const ma30 = data.ma30;

  return (
    <EnhancedTooltip
      active={active}
      payload={payload}
      label={label}
      title={t('price.title')}
      isMobile={isMobile}
      formatValue={(value, key) => {
        if (key === 'volume') {
          return `${formatNumber(value)} ${t('volume.unit')}`;
        }
        return formatCurrency(value);
      }}
      additionalContent={
        showVolume && volume ? (
          <div className={`flex justify-between ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
            <span style={{ color: baseColors.gray[500] }}>{t('volume.label')}</span>
            <span className="font-mono" style={{ color: baseColors.gray[700] }}>
              {formatNumber(volume)}
            </span>
          </div>
        ) : null
      }
    />
  );
});

// Multi-Series Comparison Tooltip
interface MultiSeriesTooltipProps {
  active?: boolean;
  payload?: TooltipDataPoint[];
  label?: string;
  seriesNames?: Record<string, string>;
  isMobile?: boolean;
}

export const MultiSeriesTooltip = memo(function MultiSeriesTooltip({
  active,
  payload,
  label,
  seriesNames = {},
  isMobile = false,
}: MultiSeriesTooltipProps) {
  const t = useTranslations('enhancedTooltip');

  // Enhance payload with display names
  const enhancedPayload = useMemo(() => {
    if (!payload) return [];
    return payload.map((item) => ({
      ...item,
      name: seriesNames[item.dataKey] || item.name || item.dataKey,
    }));
  }, [payload, seriesNames]);

  return (
    <EnhancedTooltip
      active={active}
      payload={enhancedPayload}
      label={label}
      title={t('comparison.title')}
      highlightDifferences={true}
      isMobile={isMobile}
      maxItems={8}
    />
  );
});

// Technical Indicator Tooltip
interface TechnicalIndicatorTooltipProps {
  active?: boolean;
  payload?: TooltipDataPoint[];
  label?: string;
  indicators: Array<{
    key: string;
    name: string;
    color: string;
    format?: 'price' | 'percentage' | 'number';
  }>;
  isMobile?: boolean;
}

export const TechnicalIndicatorTooltip = memo(function TechnicalIndicatorTooltip({
  active,
  payload,
  label,
  indicators,
  isMobile = false,
}: TechnicalIndicatorTooltipProps) {
  const t = useTranslations('enhancedTooltip');

  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0]?.payload as Record<string, number>;
  if (!data) return null;

  const formatValue = (value: number, format?: string): string => {
    switch (format) {
      case 'percentage':
        return `${value.toFixed(2)}%`;
      case 'number':
        return formatNumber(value);
      case 'price':
      default:
        return formatCurrency(value);
    }
  };

  const indicatorPayload = indicators
    .filter((ind) => data[ind.key] !== undefined)
    .map((ind) => ({
      dataKey: ind.key,
      value: data[ind.key],
      color: ind.color,
      name: ind.name,
      payload: data,
    }));

  return (
    <EnhancedTooltip
      active={active}
      payload={indicatorPayload}
      label={label}
      title={t('indicators.title')}
      isMobile={isMobile}
      formatValue={(value, key) => {
        const indicator = indicators.find((i) => i.key === key);
        return formatValue(value, indicator?.format);
      }}
    />
  );
});

export default EnhancedTooltip;
