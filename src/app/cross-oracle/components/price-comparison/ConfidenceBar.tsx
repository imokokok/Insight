'use client';

import { memo } from 'react';

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

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 90) return 'Very High';
  if (confidence >= 75) return 'High';
  if (confidence >= 60) return 'Medium';
  if (confidence >= 40) return 'Low';
  return 'Very Low';
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
          <span className="text-gray-400">{getConfidenceLabel(normalizedConfidence)}</span>
        </div>
      )}
    </div>
  );
}

export const ConfidenceBar = memo(ConfidenceBarComponent);
ConfidenceBar.displayName = 'ConfidenceBar';

export default ConfidenceBar;
