'use client';

import { forwardRef, type ReactNode } from 'react';

import { Inbox } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  secondaryAction?: ReactNode;
  className?: string;
  compact?: boolean;
}

export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      title,
      description,
      icon,
      action,
      secondaryAction,
      className,
      compact = false,
    },
    ref
  ) => {
    const t = useTranslations();
    const resolvedTitle = title ?? t('crossOracle.ui.emptyStateTitle');
    const resolvedDescription = description ?? t('crossOracle.ui.emptyStateDescription');

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col items-center justify-center text-center',
          compact ? 'py-8 px-4' : 'py-16 px-4',
          className
        )}
      >
        <div
          className={cn(
            'flex items-center justify-center rounded-full bg-gray-50 mb-4',
            compact ? 'w-12 h-12' : 'w-16 h-16'
          )}
        >
          {icon || <Inbox className={cn('text-gray-400', compact ? 'w-6 h-6' : 'w-8 h-8')} />}
        </div>
        <h3 className={cn('font-semibold text-gray-900 mb-1', compact ? 'text-base' : 'text-lg')}>
          {resolvedTitle}
        </h3>
        <p className={cn('text-gray-500 max-w-sm', compact ? 'text-sm' : 'text-base')}>
          {resolvedDescription}
        </p>
        {(action || secondaryAction) && (
          <div className={cn('flex items-center gap-3', compact ? 'mt-4' : 'mt-6')}>
            {action}
            {secondaryAction}
          </div>
        )}
      </div>
    );
  }
);

EmptyState.displayName = 'EmptyState';
