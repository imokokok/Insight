'use client';

import React from 'react';

import {
  Search,
  Database,
  AlertCircle,
  Inbox,
  FolderOpen,
  Filter,
  WifiOff,
  FileQuestion,
  Sparkles,
  ArrowRight,
  Play,
  Lightbulb,
  RefreshCw,
} from 'lucide-react';

import { useTranslations } from '@/i18n';
import { cn } from '@/lib/utils';

// ============================================
// 空状态类型定义
// ============================================

export type EmptyStateType =
  | 'search'
  | 'data'
  | 'error'
  | 'filter'
  | 'default'
  | 'folder'
  | 'offline'
  | 'empty'
  | 'new'
  | 'custom';

// ============================================
// 基础空状态组件
// ============================================

interface EmptyStateEnhancedProps {
  type?: EmptyStateType;
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'card' | 'page';
  children?: React.ReactNode;
}

const iconMap = {
  search: Search,
  data: Database,
  error: AlertCircle,
  filter: Filter,
  default: Inbox,
  folder: FolderOpen,
  offline: WifiOff,
  empty: FileQuestion,
  new: Sparkles,
  custom: Lightbulb,
};

const sizeClasses = {
  sm: {
    container: 'py-8',
    icon: 'w-10 h-10',
    iconWrapper: 'w-16 h-16',
    title: 'text-base',
    description: 'text-sm',
  },
  md: {
    container: 'py-12',
    icon: 'w-12 h-12',
    iconWrapper: 'w-20 h-20',
    title: 'text-lg',
    description: 'text-sm',
  },
  lg: {
    container: 'py-16',
    icon: 'w-16 h-16',
    iconWrapper: 'w-24 h-24',
    title: 'text-xl',
    description: 'text-base',
  },
};

export function EmptyStateEnhanced({
  type = 'default',
  title,
  description,
  icon,
  className,
  size = 'md',
  variant = 'default',
  children,
}: EmptyStateEnhancedProps) {
  const t = useTranslations('emptyState');
  const Icon = iconMap[type];
  const sizes = sizeClasses[size];

  const variantClasses = {
    default: '',
    card: 'bg-white border border-gray-200 rounded-xl shadow-sm',
    page: 'min-h-[60vh]',
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-4 text-center',
        sizes.container,
        variantClasses[variant],
        className
      )}
    >
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-gray-100 mb-4',
          sizes.iconWrapper
        )}
      >
        {icon || <Icon className={cn('text-gray-400', sizes.icon)} />}
      </div>
      <h3 className={cn('font-semibold text-gray-900 mb-2', sizes.title)}>
        {title || t(`${type}.title`)}
      </h3>
      <p className={cn('text-gray-500 max-w-md', sizes.description)}>
        {description || t(`${type}.description`)}
      </p>
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
}

// ============================================
// 行动引导空状态组件
// ============================================

export interface ActionButton {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface EmptyStateWithActionsProps extends EmptyStateEnhancedProps {
  actions?: ActionButton[];
  secondaryActions?: ActionButton[];
  showExampleLink?: boolean;
  onViewExample?: () => void;
  exampleLabel?: string;
}

export function EmptyStateWithActions({
  actions = [],
  secondaryActions = [],
  showExampleLink = false,
  onViewExample,
  exampleLabel,
  ...props
}: EmptyStateWithActionsProps) {
  const t = useTranslations('emptyState');

  const getButtonClasses = (variant: ActionButton['variant'] = 'primary') => {
    const baseClasses =
      'inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200';
    const variantClasses = {
      primary:
        'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 shadow-sm hover:shadow',
      secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300',
      outline: 'border-2 border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50',
    };
    return cn(baseClasses, variantClasses[variant]);
  };

  return (
    <EmptyStateEnhanced {...props}>
      <div className="flex flex-col items-center gap-4">
        {(actions.length > 0 || secondaryActions.length > 0) && (
          <div className="flex flex-wrap items-center justify-center gap-3">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                disabled={action.disabled}
                className={getButtonClasses(action.variant)}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
            {secondaryActions.map((action, index) => (
              <button
                key={`secondary-${index}`}
                onClick={action.onClick}
                disabled={action.disabled}
                className={getButtonClasses(action.variant || 'outline')}
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        )}

        {showExampleLink && onViewExample && (
          <button
            onClick={onViewExample}
            className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium transition-colors"
          >
            <Play className="w-4 h-4" />
            {exampleLabel || t('viewExample')}
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </EmptyStateEnhanced>
  );
}

// ============================================
// 搜索无结果空状态组件
// ============================================

interface EmptyStateSearchProps extends Omit<EmptyStateEnhancedProps, 'type' | 'children'> {
  searchTerm?: string;
  onClearSearch: () => void;
  suggestions?: string[];
  onSuggestionClick?: (suggestion: string) => void;
}

export function EmptyStateSearch({
  searchTerm,
  onClearSearch,
  suggestions = [],
  onSuggestionClick,
  ...props
}: EmptyStateSearchProps) {
  const t = useTranslations('emptyState');

  return (
    <EmptyStateEnhanced {...props} type="search">
      <div className="flex flex-col items-center gap-4">
        {searchTerm && (
          <p className="text-sm text-gray-500">
            {t('noResultsFor')} &quot;
            <span className="font-medium text-gray-700">{searchTerm}</span>&quot;
          </p>
        )}

        <button
          onClick={onClearSearch}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          {t('clearSearch')}
        </button>

        {suggestions.length > 0 && onSuggestionClick && (
          <div className="mt-4">
            <p className="text-sm text-gray-500 mb-2">{t('trySearching')}</p>
            <div className="flex flex-wrap justify-center gap-2">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => onSuggestionClick(suggestion)}
                  className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </EmptyStateEnhanced>
  );
}
