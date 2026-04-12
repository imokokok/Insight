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
  Lightbulb,
} from 'lucide-react';

import { useTranslations } from '@/i18n';
import { cn } from '@/lib/utils';

// ============================================
// 基础空状态组件
// ============================================

type EmptyStateType =
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
