'use client';

import React, { useState } from 'react';
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
  Plus,
  ExternalLink,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
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
      primary: 'bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm hover:shadow',
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
            className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
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
// 快速开始空状态组件
// ============================================

export interface QuickStartItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  badge?: string;
}

interface EmptyStateQuickStartProps extends Omit<EmptyStateEnhancedProps, 'children'> {
  items: QuickStartItem[];
  title?: string;
  description?: string;
}

export function EmptyStateQuickStart({
  items,
  title,
  description,
  ...props
}: EmptyStateQuickStartProps) {
  const t = useTranslations('emptyState');

  return (
    <EmptyStateEnhanced {...props} type="new" title={title} description={description}>
      <div className="w-full max-w-2xl">
        <p className="text-sm font-medium text-gray-700 mb-4">{t('quickStart')}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={item.onClick}
              className="flex items-start gap-3 p-4 text-left bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-all group"
            >
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-100 transition-colors">
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{item.title}</span>
                  {item.badge && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500 mt-1">{item.description}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>
    </EmptyStateEnhanced>
  );
}

// ============================================
// 示例数据空状态组件
// ============================================

export interface ExampleDataItem {
  id: string;
  name: string;
  description: string;
  data: unknown;
}

interface EmptyStateWithExamplesProps extends Omit<EmptyStateEnhancedProps, 'children'> {
  examples: ExampleDataItem[];
  onLoadExample: (data: unknown) => void;
  title?: string;
  description?: string;
}

export function EmptyStateWithExamples({
  examples,
  onLoadExample,
  title,
  description,
  ...props
}: EmptyStateWithExamplesProps) {
  const t = useTranslations('emptyState');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <EmptyStateEnhanced {...props} type="data" title={title} description={description}>
      <div className="w-full max-w-2xl">
        <p className="text-sm font-medium text-gray-700 mb-4">{t('tryExampleData')}</p>
        <div className="space-y-2">
          {examples.map((example) => (
            <button
              key={example.id}
              onClick={() => {
                setSelectedId(example.id);
                onLoadExample(example.data);
              }}
              disabled={selectedId === example.id}
              className={cn(
                'w-full flex items-center gap-4 p-4 text-left border rounded-lg transition-all',
                selectedId === example.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
              )}
            >
              <div
                className={cn(
                  'p-2 rounded-lg',
                  selectedId === example.id
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-gray-100 text-gray-500'
                )}
              >
                <Database className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <span className="font-medium text-gray-900">{example.name}</span>
                <p className="text-sm text-gray-500">{example.description}</p>
              </div>
              {selectedId === example.id ? (
                <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />
              ) : (
                <ArrowRight className="w-5 h-5 text-gray-400" />
              )}
            </button>
          ))}
        </div>
      </div>
    </EmptyStateEnhanced>
  );
}

// ============================================
// 错误重试空状态组件
// ============================================

interface EmptyStateErrorProps extends Omit<EmptyStateEnhancedProps, 'type' | 'children'> {
  error?: Error | string;
  onRetry: () => void;
  onContactSupport?: () => void;
  showDetails?: boolean;
}

export function EmptyStateError({
  error,
  onRetry,
  onContactSupport,
  showDetails = false,
  ...props
}: EmptyStateErrorProps) {
  const t = useTranslations('emptyState');
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await onRetry();
    } finally {
      setIsRetrying(false);
    }
  };

  const errorMessage = typeof error === 'string' ? error : error?.message;

  return (
    <EmptyStateEnhanced {...props} type="error">
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={cn('w-4 h-4', isRetrying && 'animate-spin')} />
            {isRetrying ? t('retrying') : t('retry')}
          </button>
          {onContactSupport && (
            <button
              onClick={onContactSupport}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              {t('contactSupport')}
            </button>
          )}
        </div>

        {showDetails && errorMessage && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg max-w-md">
            <p className="text-sm text-red-700 font-medium mb-1">{t('errorDetails')}</p>
            <p className="text-sm text-red-600 break-all">{errorMessage}</p>
          </div>
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
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
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

// ============================================
// 离线空状态组件
// ============================================

interface EmptyStateOfflineProps extends Omit<EmptyStateEnhancedProps, 'type' | 'children'> {
  onRetry: () => void;
  lastSyncedAt?: Date;
}

export function EmptyStateOffline({ onRetry, lastSyncedAt, ...props }: EmptyStateOfflineProps) {
  const t = useTranslations('emptyState');

  return (
    <EmptyStateEnhanced {...props} type="offline">
      <div className="flex flex-col items-center gap-4">
        {lastSyncedAt && (
          <p className="text-sm text-gray-500">
            {t('lastSynced')}: {lastSyncedAt.toLocaleString()}
          </p>
        )}
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          {t('retryConnection')}
        </button>
      </div>
    </EmptyStateEnhanced>
  );
}

// ============================================
// 预配置的空状态组件
// ============================================

interface NoDataEmptyStateProps {
  onRefresh?: () => void;
  onCreate?: () => void;
  className?: string;
}

export function NoDataEmptyState({ onRefresh, onCreate, className }: NoDataEmptyStateProps) {
  const t = useTranslations('emptyState');

  const actions: ActionButton[] = [];
  if (onCreate) {
    actions.push({
      label: t('createNew'),
      onClick: onCreate,
      variant: 'primary',
      icon: <Plus className="w-4 h-4" />,
    });
  }

  const secondaryActions: ActionButton[] = [];
  if (onRefresh) {
    secondaryActions.push({
      label: t('refresh'),
      onClick: onRefresh,
      variant: 'outline',
      icon: <RefreshCw className="w-4 h-4" />,
    });
  }

  return (
    <EmptyStateWithActions
      type="data"
      actions={actions}
      secondaryActions={secondaryActions}
      className={className}
    />
  );
}

interface EmptyFavoritesStateProps {
  onBrowseItems: () => void;
  className?: string;
}

export function EmptyFavoritesState({ onBrowseItems, className }: EmptyFavoritesStateProps) {
  const t = useTranslations('emptyState');

  return (
    <EmptyStateWithActions
      type="folder"
      title={t('favorites.title')}
      description={t('favorites.description')}
      actions={[
        {
          label: t('favorites.browse'),
          onClick: onBrowseItems,
          variant: 'primary',
          icon: <ExternalLink className="w-4 h-4" />,
        },
      ]}
      className={className}
    />
  );
}

interface EmptySearchResultsStateProps {
  searchTerm: string;
  onClearSearch: () => void;
  popularSearches?: string[];
  onSearchSuggestion?: (term: string) => void;
  className?: string;
}

export function EmptySearchResultsState({
  searchTerm,
  onClearSearch,
  popularSearches,
  onSearchSuggestion,
  className,
}: EmptySearchResultsStateProps) {
  return (
    <EmptyStateSearch
      searchTerm={searchTerm}
      onClearSearch={onClearSearch}
      suggestions={popularSearches}
      onSuggestionClick={onSearchSuggestion}
      className={className}
    />
  );
}

// ============================================
// 引导式空状态组件
// ============================================

interface GuidedEmptyStateProps extends Omit<EmptyStateEnhancedProps, 'children'> {
  steps: Array<{
    title: string;
    description: string;
    action?: {
      label: string;
      onClick: () => void;
    };
  }>;
  currentStep?: number;
}

export function GuidedEmptyState({ steps, currentStep = 0, ...props }: GuidedEmptyStateProps) {
  return (
    <EmptyStateEnhanced {...props} type="new">
      <div className="w-full max-w-lg">
        <div className="relative">
          {/* Progress line */}
          <div className="absolute left-4 top-8 bottom-8 w-0.5 bg-gray-200">
            <div
              className="absolute top-0 left-0 w-full bg-blue-500 transition-all duration-500"
              style={{ height: `${(currentStep / (steps.length - 1)) * 100}%` }}
            />
          </div>

          {/* Steps */}
          <div className="space-y-6">
            {steps.map((step, index) => {
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              const isPending = index > currentStep;

              return (
                <div
                  key={index}
                  className={cn(
                    'relative flex gap-4 transition-opacity duration-300',
                    isPending && 'opacity-50'
                  )}
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium z-10 flex-shrink-0',
                      isCompleted && 'bg-emerald-500 text-white',
                      isActive && 'bg-blue-600 text-white ring-4 ring-blue-100',
                      isPending && 'bg-gray-200 text-gray-500'
                    )}
                  >
                    {isCompleted ? <Sparkles className="w-4 h-4" /> : index + 1}
                  </div>
                  <div className="flex-1 pt-1">
                    <h4 className={cn('font-medium', isActive ? 'text-gray-900' : 'text-gray-700')}>
                      {step.title}
                    </h4>
                    <p className="text-sm text-gray-500 mt-1">{step.description}</p>
                    {isActive && step.action && (
                      <button
                        onClick={step.action.onClick}
                        className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        {step.action.label}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </EmptyStateEnhanced>
  );
}
