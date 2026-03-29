'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export interface TrendIndicatorProps {
  value: string | number;
  trend?: 'up' | 'down' | 'stable';
  showIcon?: boolean;
  className?: string;
}

export function TrendIndicator({
  value,
  trend = 'stable',
  showIcon = true,
  className = '',
}: TrendIndicatorProps) {
  const getColor = () => {
    switch (trend) {
      case 'up': return 'text-emerald-600';
      case 'down': return 'text-red-600';
      default: return 'text-gray-500';
    }
  };

  const getIcon = () => {
    if (!showIcon) return null;
    switch (trend) {
      case 'up': return <TrendingUp className="w-3 h-3" />;
      case 'down': return <TrendingDown className="w-3 h-3" />;
      default: return <Minus className="w-3 h-3" />;
    }
  };

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${getColor()} ${className}`}>
      {getIcon()}
      {value}
    </span>
  );
}
