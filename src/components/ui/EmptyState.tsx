'use client';

import React from 'react';
import { Search, Database, AlertCircle, FileX, Inbox } from 'lucide-react';
import { Button } from './Button';
import { useI18n } from '@/lib/i18n/provider';

export type EmptyStateType = 'search' | 'data' | 'error' | 'filter' | 'default';

interface EmptyStateProps {
  type?: EmptyStateType;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

const icons = {
  search: Search,
  data: Database,
  error: AlertCircle,
  filter: FileX,
  default: Inbox,
};

export function EmptyState({
  type = 'default',
  title,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className = '',
}: EmptyStateProps) {
  const { t } = useI18n();
  const Icon = icons[type];

  const defaultTitle = t(`emptyState.${type}.title`);
  const defaultDescription = t(`emptyState.${type}.description`);

  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
    >
      <div className="w-16 h-16 mb-4  bg-gray-100 flex items-center justify-center">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title || defaultTitle}</h3>
      <p className="text-sm text-gray-500 max-w-sm mb-6">{description || defaultDescription}</p>
      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {actionLabel && onAction && (
            <Button onClick={onAction} variant="primary">
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button onClick={onSecondaryAction} variant="outline">
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

interface NoDataEmptyStateProps {
  onRefresh?: () => void;
  className?: string;
}

export function NoDataEmptyState({ onRefresh, className = '' }: NoDataEmptyStateProps) {
  const { t } = useI18n();
  return (
    <EmptyState
      type="data"
      actionLabel={onRefresh ? t('common.refresh') : undefined}
      onAction={onRefresh}
      className={className}
    />
  );
}
