'use client';

import { RISK_LEVELS } from '@/lib/risk/constants';
import type { RiskLevel } from '@/lib/risk/types';
import { cn } from '@/lib/utils';

interface RiskBadgeProps {
  level: RiskLevel;
  className?: string;
  showDot?: boolean;
}

export function RiskBadge({ level, className, showDot = true }: RiskBadgeProps) {
  const config = RISK_LEVELS[level];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border-l-2 px-2.5 py-1 text-xs font-semibold',
        config.bg,
        config.border,
        config.color,
        className
      )}
    >
      {showDot && (
        <span
          className={cn(
            'w-1.5 h-1.5 rounded-full',
            level === 'normal'
              ? 'bg-emerald-500'
              : level === 'warning'
                ? 'bg-amber-500'
                : level === 'critical'
                  ? 'bg-red-500'
                  : 'bg-red-700'
          )}
        />
      )}
      {config.label}
    </span>
  );
}
