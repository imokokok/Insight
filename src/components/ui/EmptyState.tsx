'use client';

import React from 'react';
import { Search, Database, AlertCircle, FileX, Inbox } from 'lucide-react';
import { Button } from './Button';

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

const defaultMessages = {
  search: {
    title: '未找到结果',
    description: '尝试调整搜索关键词或筛选条件',
  },
  data: {
    title: '暂无数据',
    description: '数据正在加载中，请稍后再试',
  },
  error: {
    title: '加载失败',
    description: '数据加载时出现问题，请稍后重试',
  },
  filter: {
    title: '没有符合条件的数据',
    description: '尝试调整筛选条件查看更多数据',
  },
  default: {
    title: '暂无内容',
    description: '这里还没有任何内容',
  },
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
  const Icon = icons[type];
  const messages = defaultMessages[type];

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 flex items-center justify-center">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {title || messages.title}
      </h3>
      <p className="text-sm text-gray-500 max-w-sm mb-6">
        {description || messages.description}
      </p>
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
  return (
    <EmptyState
      type="data"
      actionLabel={onRefresh ? '刷新' : undefined}
      onAction={onRefresh}
      className={className}
    />
  );
}
