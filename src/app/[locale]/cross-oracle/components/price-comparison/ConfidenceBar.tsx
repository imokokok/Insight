'use client';

import { memo } from 'react';
import { useTranslations } from 'next-intl';

interface ConfidenceBarProps {
  confidence: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

function getConfidenceColor(confidence: number): string {
  if (confidence >= 90) return 'bg-emerald-500';
  if (confidence >= 75) return 'bg-blue-500';
  if (confidence >= 60) return 'bg-yellow-500';
  if (confidence >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}

function getConfidenceLabel(confidence: number, t: ReturnType<typeof useTranslations>): string {
  if (confidence >= 90) return t('crossOracle.confidenceLevel.veryHigh');
  if (confidence >= 75) return t('crossOracle.confidenceLevel.high');
  if (confidence >= 60) return t('crossOracle.confidenceLevel.medium');
  if (confidence >= 40) return t('crossOracle.confidenceLevel.low');
  return t('crossOracle.confidenceLevel.veryLow');
}

function getSizeClasses(size: 'sm' | 'md' | 'lg'): { bar: string; text: string } {
  switch (size) {
    case 'sm':
      return { bar: 'h-1.5', text: 'text-xs' };
    case 'lg':
      return { bar: 'h-3', text: 'text-sm' };
    default:
      return { bar: 'h-2', text: 'text-xs' };
  }
}

function ConfidenceBarComponent({ confidence, showLabel = true, size = 'md' }: ConfidenceBarProps) {
  const t = useTranslations();
  const normalizedConfidence = Math.max(0, Math.min(100, confidence));
  const colorClass = getConfidenceColor(normalizedConfidence);
  const sizeClasses = getSizeClasses(size);

  return (
    <div className="w-full">
      <div className={`w-full bg-gray-200 rounded-full ${sizeClasses.bar} overflow-hidden`}>
        <div
          className={`${colorClass} ${sizeClasses.bar} rounded-full transition-all duration-500`}
          style={{ width: `${normalizedConfidence}%` }}
        />
      </div>
      {showLabel && (
        <div className={`flex justify-between mt-1 ${sizeClasses.text}`}>
          <span className="text-gray-500">{normalizedConfidence.toFixed(0)}%</span>
          <span className="text-gray-400">{getConfidenceLabel(normalizedConfidence, t)}</span>
        </div>
      )}
    </div>
  );
}

export const ConfidenceBar = memo(ConfidenceBarComponent);
ConfidenceBar.displayName = 'ConfidenceBar';

export default ConfidenceBar;
