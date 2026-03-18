'use client';

import React from 'react';
import { Search, Database, AlertCircle, FileX, Inbox } from 'lucide-react';
import { useTranslations } from 'next-intl';

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
  const t = useTranslations();
  const Icon = icons[type];

  const defaultTitle = t(`emptyState.${type}.title`);
  const defaultDescription = t(`emptyState.${type}.description`);

  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
    >
      <div className="w-16 h-16 mb-4 bg-gray-100 flex items-center justify-center">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title || defaultTitle}</h3>
      <p className="text-sm text-gray-500 max-w-sm mb-6">{description || defaultDescription}</p>
      {(actionLabel || secondaryActionLabel) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              {actionLabel}
            </button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <button
              onClick={onSecondaryAction}
              className="px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
            >
              {secondaryActionLabel}
            </button>
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
  const t = useTranslations();
  return (
    <EmptyState
      type="data"
      actionLabel={onRefresh ? t('common.actions.refresh') : undefined}
      onAction={onRefresh}
      className={className}
    />
  );
}
