'use client';

import React from 'react';
import { useI18n } from '@/lib/i18n/provider';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className = '',
  size = 'md',
}: EmptyStateProps) {
  const { t, locale } = useI18n();
  const isZh = locale === 'zh-CN';

  const sizeClasses = {
    sm: {
      container: 'py-8',
      icon: 'w-10 h-10',
      title: 'text-sm',
      description: 'text-xs',
    },
    md: {
      container: 'py-16',
      icon: 'w-16 h-16',
      title: 'text-lg',
      description: 'text-sm',
    },
    lg: {
      container: 'py-24',
      icon: 'w-20 h-20',
      title: 'text-xl',
      description: 'text-base',
    },
  };

  const classes = sizeClasses[size];

  const defaultIcon = (
    <svg
      className={`${classes.icon} text-gray-300`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );

  return (
    <div
      className={`flex flex-col items-center justify-center text-center ${classes.container} ${className}`}
    >
      <div className="mb-4 p-4 bg-gray-50 rounded-full">{icon || defaultIcon}</div>
      <h3 className={`${classes.title} font-semibold text-gray-900 mb-2`}>
        {title || (isZh ? '暂无数据' : 'No Data Available')}
      </h3>
      <p className={`${classes.description} text-gray-500 max-w-md mb-4`}>
        {description ||
          (isZh
            ? '当前没有可显示的数据，请尝试调整筛选条件或稍后重试'
            : 'No data to display. Try adjusting filters or try again later.')}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// 预定义的空状态变体
export function NoDataEmptyState({
  onRefresh,
  className,
}: {
  onRefresh?: () => void;
  className?: string;
}) {
  const { t, locale } = useI18n();
  const isZh = locale === 'zh-CN';

  return (
    <EmptyState
      title={isZh ? '暂无数据' : 'No Data'}
      description={
        isZh
          ? '当前查询条件下没有数据，请尝试调整参数'
          : 'No data found for current query. Try adjusting parameters.'
      }
      icon={
        <svg
          className="w-16 h-16 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
      }
      action={
        onRefresh
          ? {
              label: isZh ? '刷新数据' : 'Refresh Data',
              onClick: onRefresh,
            }
          : undefined
      }
      className={className}
    />
  );
}

export function NoResultsEmptyState({
  onClear,
  className,
}: {
  onClear?: () => void;
  className?: string;
}) {
  const { t, locale } = useI18n();
  const isZh = locale === 'zh-CN';

  return (
    <EmptyState
      title={isZh ? '无匹配结果' : 'No Results Found'}
      description={
        isZh
          ? '没有找到符合条件的数据，请尝试清除筛选条件'
          : 'No matching results found. Try clearing filters.'
      }
      icon={
        <svg
          className="w-16 h-16 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
      }
      action={
        onClear
          ? {
              label: isZh ? '清除筛选' : 'Clear Filters',
              onClick: onClear,
            }
          : undefined
      }
      className={className}
    />
  );
}

export function ErrorEmptyState({
  onRetry,
  className,
}: {
  onRetry?: () => void;
  className?: string;
}) {
  const { t, locale } = useI18n();
  const isZh = locale === 'zh-CN';

  return (
    <EmptyState
      title={isZh ? '加载失败' : 'Failed to Load'}
      description={
        isZh
          ? '数据加载过程中出现错误，请检查网络连接后重试'
          : 'An error occurred while loading data. Please check your connection and try again.'
      }
      icon={
        <svg
          className="w-16 h-16 text-red-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      }
      action={
        onRetry
          ? {
              label: isZh ? '重试' : 'Retry',
              onClick: onRetry,
            }
          : undefined
      }
      className={className}
    />
  );
}
