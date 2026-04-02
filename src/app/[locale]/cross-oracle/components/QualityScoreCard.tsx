'use client';

/**
 * @fileoverview 数据质量评分卡片组件
 * @description 显示数据质量的四个维度评分（一致性、新鲜度、完整性、综合评分）和改进建议
 */

import { memo } from 'react';

import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Clock,
  Database,
  Shield,
  Lightbulb,
  ChevronRight,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { cn } from '@/lib/utils';

import { getScoreLevel, getScoreColor, getScoreBgColor } from '../hooks/useDataQualityScore';
import { type DataQualityScore } from '../types/index';

/**
 * 评分维度配置
 */
const DIMENSION_CONFIG = {
  consistency: {
    label: '一致性',
    description: '数据一致性评分',
    icon: TrendingUp,
    color: 'blue',
  },
  freshness: {
    label: '新鲜度',
    description: '数据更新时效性',
    icon: Clock,
    color: 'emerald',
  },
  completeness: {
    label: '完整性',
    description: '数据获取成功率',
    icon: Database,
    color: 'purple',
  },
  overall: {
    label: '综合评分',
    description: '数据质量综合评估',
    icon: Shield,
    color: 'amber',
  },
} as const;

type DimensionKey = keyof typeof DIMENSION_CONFIG;

/**
 * 评分等级配置
 */
const LEVEL_CONFIG = {
  excellent: {
    label: '优秀',
    icon: CheckCircle2,
    color: 'text-success-500',
    bgColor: 'bg-success-50',
    borderColor: 'border-success-200',
  },
  good: {
    label: '良好',
    icon: CheckCircle2,
    color: 'text-primary-500',
    bgColor: 'bg-primary-50',
    borderColor: 'border-primary-200',
  },
  fair: {
    label: '一般',
    icon: AlertTriangle,
    color: 'text-warning-500',
    bgColor: 'bg-warning-50',
    borderColor: 'border-warning-200',
  },
  poor: {
    label: '较差',
    icon: XCircle,
    color: 'text-danger-500',
    bgColor: 'bg-danger-50',
    borderColor: 'border-danger-200',
  },
} as const;

/**
 * 环形进度条组件 Props
 */
interface CircularProgressProps {
  /** 进度值 0-100 */
  value: number;
  /** 尺寸 */
  size?: number;
  /** 线宽 */
  strokeWidth?: number;
  /** 颜色类名 */
  colorClass?: string;
  /** 是否显示数值 */
  showValue?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * 环形进度条组件
 */
function CircularProgress({
  value,
  size = 64,
  strokeWidth = 4,
  colorClass,
  showValue = true,
  className,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  const defaultColorClass = getScoreBgColor(value);
  const progressColor = colorClass || defaultColorClass;

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="transform -rotate-90">
        {/* 背景圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200"
        />
        {/* 进度圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn('transition-all duration-700 ease-out', progressColor)}
        />
      </svg>
      {/* 中心数值 */}
      {showValue && (
        <span className={cn('absolute text-sm font-bold tabular-nums', getScoreColor(value))}>
          {Math.round(value)}
        </span>
      )}
    </div>
  );
}

/**
 * 线性进度条组件 Props
 */
interface LinearProgressProps {
  /** 进度值 0-100 */
  value: number;
  /** 颜色类名 */
  colorClass?: string;
  /** 高度 */
  height?: number;
  /** 是否显示数值 */
  showValue?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * 线性进度条组件
 */
function LinearProgress({
  value,
  colorClass,
  height = 8,
  showValue = true,
  className,
}: LinearProgressProps) {
  const defaultColorClass = getScoreBgColor(value);
  const progressColor = colorClass || defaultColorClass;

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-gray-500">评分</span>
        {showValue && (
          <span className={cn('text-xs font-semibold tabular-nums', getScoreColor(value))}>
            {Math.round(value)}%
          </span>
        )}
      </div>
      <div className="w-full bg-gray-200 rounded-full overflow-hidden" style={{ height }}>
        <div
          className={cn('h-full rounded-full transition-all duration-700 ease-out', progressColor)}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}

/**
 * 评分维度卡片 Props
 */
interface DimensionCardProps {
  /** 维度键名 */
  dimension: DimensionKey;
  /** 评分值 */
  score: number;
  /** 是否为主要维度（使用环形进度条） */
  isPrimary?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * 评分维度卡片
 */
function DimensionCard({ dimension, score, isPrimary = false, className }: DimensionCardProps) {
  const config = DIMENSION_CONFIG[dimension];
  const Icon = config.icon;
  const level = getScoreLevel(score);
  const levelConfig = LEVEL_CONFIG[level];
  const LevelIcon = levelConfig.icon;

  return (
    <div
      className={cn(
        'relative p-4 rounded-lg border transition-all duration-200',
        'hover:shadow-sm',
        levelConfig.bgColor,
        levelConfig.borderColor,
        className
      )}
    >
      <div className="flex items-start gap-3">
        {/* 图标 */}
        <div
          className={cn(
            'p-2 rounded-lg flex-shrink-0',
            dimension === 'overall' ? 'bg-white shadow-sm' : 'bg-white/80'
          )}
        >
          <Icon
            className={cn('w-5 h-5', dimension === 'overall' ? levelConfig.color : 'text-gray-600')}
          />
        </div>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">{config.label}</span>
            <LevelIcon className={cn('w-4 h-4', levelConfig.color)} />
          </div>

          <p className="text-xs text-gray-500 mb-2">{config.description}</p>

          {/* 进度条 */}
          {isPrimary ? (
            <div className="mt-2">
              <LinearProgress value={score} showValue={false} height={6} />
            </div>
          ) : (
            <div className="flex items-center gap-3 mt-2">
              <CircularProgress value={score} size={48} strokeWidth={3} showValue />
              <div className="flex-1">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                    levelConfig.bgColor,
                    levelConfig.color
                  )}
                >
                  {levelConfig.label}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 主要维度的分数显示 */}
      {isPrimary && (
        <div className="mt-3 pt-3 border-t border-gray-200/50">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-gray-500">综合评分</span>
            <span className={cn('text-2xl font-bold tabular-nums', getScoreColor(score))}>
              {Math.round(score)}
              <span className="text-sm font-normal text-gray-400 ml-0.5">/100</span>
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 改进建议列表 Props
 */
interface SuggestionsListProps {
  /** 建议数组 */
  suggestions: string[];
  /** 自定义类名 */
  className?: string;
}

/**
 * 改进建议列表
 */
function SuggestionsList({ suggestions, className }: SuggestionsListProps) {
  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="w-4 h-4 text-amber-500" />
        <span className="text-sm font-medium text-gray-700">改进建议</span>
      </div>
      <div className="space-y-2">
        {suggestions.map((suggestion, index) => (
          <div
            key={index}
            className={cn(
              'flex items-start gap-2 p-2.5 rounded-lg text-sm',
              'bg-gray-50 hover:bg-gray-100 transition-colors duration-150'
            )}
          >
            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
            <span className="text-gray-600 leading-relaxed">{suggestion}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 质量评分卡片 Props
 */
export interface QualityScoreCardProps {
  /** 数据质量评分数据 */
  score: DataQualityScore;
  /** 标题 */
  title?: string;
  /** 是否显示建议 */
  showSuggestions?: boolean;
  /** 布局变体 */
  variant?: 'default' | 'compact';
  /** 自定义类名 */
  className?: string;
  /** 加载状态 */
  isLoading?: boolean;
}

/**
 * 加载状态骨架屏
 */
function QualityScoreCardSkeleton({ variant = 'default' }: { variant?: 'default' | 'compact' }) {
  const isCompact = variant === 'compact';

  return (
    <Card className={cn('animate-pulse', isCompact ? 'p-4' : 'p-5')}>
      <div className="h-5 bg-gray-200 rounded w-1/3 mb-4" />
      <div className={cn('grid gap-4', isCompact ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-4')}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-lg" />
        ))}
      </div>
    </Card>
  );
}

/**
 * 质量评分卡片组件
 *
 * 功能特性：
 * - 显示四个维度的评分：一致性、新鲜度、完整性、综合评分
 * - 使用环形进度条和线性进度条展示
 * - 根据分数显示不同颜色（优秀/良好/一般/较差）
 * - 显示改进建议列表
 * - 支持紧凑布局
 * - 支持加载状态
 *
 * @example
 * ```tsx
 * // 基础用法
 * <QualityScoreCard
 *   score={{
 *     consistency: 85,
 *     freshness: 92,
 *     completeness: 78,
 *     overall: 85,
 *     suggestions: ['建议缩短数据刷新间隔'],
 *   }}
 * />
 *
 * // 紧凑布局
 * <QualityScoreCard
 *   score={score}
 *   variant="compact"
 *   showSuggestions={false}
 * />
 *
 * // 加载状态
 * <QualityScoreCard isLoading={true} />
 * ```
 */
export function QualityScoreCard({
  score,
  title = '数据质量评分',
  showSuggestions = true,
  variant = 'default',
  className,
  isLoading = false,
}: QualityScoreCardProps) {
  if (isLoading) {
    return <QualityScoreCardSkeleton variant={variant} />;
  }

  const isCompact = variant === 'compact';
  const { consistency, freshness, completeness, overall, suggestions } = score;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary-500" />
          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* 评分网格 */}
        <div
          className={cn(
            'grid gap-3',
            isCompact ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
          )}
        >
          {/* 综合评分 - 主要维度 */}
          <div className={cn(!isCompact && 'sm:col-span-2 lg:col-span-1')}>
            <DimensionCard dimension="overall" score={overall} isPrimary />
          </div>

          {/* 一致性评分 */}
          <DimensionCard dimension="consistency" score={consistency} />

          {/* 新鲜度评分 */}
          <DimensionCard dimension="freshness" score={freshness} />

          {/* 完整性评分 */}
          <DimensionCard dimension="completeness" score={completeness} />
        </div>

        {/* 改进建议 */}
        {showSuggestions && suggestions && suggestions.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <SuggestionsList suggestions={suggestions} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const MemoizedQualityScoreCard = memo(QualityScoreCard);
MemoizedQualityScoreCard.displayName = 'QualityScoreCard';

export default MemoizedQualityScoreCard;
