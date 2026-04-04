'use client';

/**
 * @fileoverview 数据质量评分仪表盘组件
 * @description 展示综合评分和分项评分，包含环形进度图、评分卡片和改进建议
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

import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/lib/utils';

import { getScoreLevel } from '../hooks/useDataQualityScore';

/**
 * QualityDashboard Props 接口
 */
interface QualityDashboardProps {
  qualityScore: {
    overall: number;
    consistency: number;
    freshness: number;
    completeness: number;
    suggestions: string[];
  };
  isLoading: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}

/**
 * 评分等级配置
 */
const LEVEL_CONFIG = {
  excellent: {
    labelKey: 'quality.excellent',
    defaultLabel: '优秀',
    icon: CheckCircle2,
    colorClass: 'text-green-500',
    bgColorClass: 'bg-green-500',
    lightBgClass: 'bg-green-50',
    borderColorClass: 'border-green-200',
  },
  good: {
    labelKey: 'quality.good',
    defaultLabel: '良好',
    icon: CheckCircle2,
    colorClass: 'text-blue-500',
    bgColorClass: 'bg-blue-500',
    lightBgClass: 'bg-blue-50',
    borderColorClass: 'border-blue-200',
  },
  fair: {
    labelKey: 'quality.fair',
    defaultLabel: '一般',
    icon: AlertTriangle,
    colorClass: 'text-yellow-500',
    bgColorClass: 'bg-yellow-500',
    lightBgClass: 'bg-yellow-50',
    borderColorClass: 'border-yellow-200',
  },
  poor: {
    labelKey: 'quality.poor',
    defaultLabel: '差',
    icon: XCircle,
    colorClass: 'text-red-500',
    bgColorClass: 'bg-red-500',
    lightBgClass: 'bg-red-50',
    borderColorClass: 'border-red-200',
  },
} as const;

/**
 * 维度配置
 */
const DIMENSION_CONFIG = {
  consistency: {
    labelKey: 'quality.consistency',
    defaultLabel: '一致性',
    descriptionKey: 'quality.consistencyDesc',
    defaultDescription: '数据一致性评分',
    icon: TrendingUp,
  },
  freshness: {
    labelKey: 'quality.freshness',
    defaultLabel: '新鲜度',
    descriptionKey: 'quality.freshnessDesc',
    defaultDescription: '数据更新时效性',
    icon: Clock,
  },
  completeness: {
    labelKey: 'quality.completeness',
    defaultLabel: '完整性',
    descriptionKey: 'quality.completenessDesc',
    defaultDescription: '数据获取成功率',
    icon: Database,
  },
} as const;

type DimensionKey = keyof typeof DIMENSION_CONFIG;

/**
 * 获取评分等级对应的配置
 */
function getLevelConfig(score: number) {
  const level = getScoreLevel(score);
  return LEVEL_CONFIG[level];
}

/**
 * 环形进度图组件 Props
 */
interface CircularProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

/**
 * 环形进度图组件
 * 使用 SVG 绘制环形进度条
 */
function CircularProgress({
  value,
  size = 160,
  strokeWidth = 12,
  className,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;
  const config = getLevelConfig(value);

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
          className="text-gray-100"
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
          className={cn('transition-all duration-1000 ease-out', config.bgColorClass)}
        />
      </svg>
    </div>
  );
}

/**
 * 综合评分展示组件
 */
interface OverallScoreProps {
  score: number;
  t: QualityDashboardProps['t'];
}

function OverallScore({ score, t }: OverallScoreProps) {
  const config = getLevelConfig(score);
  const LevelIcon = config.icon;

  return (
    <div className="flex flex-col items-center justify-center p-6">
      {/* 环形进度图 */}
      <div className="relative">
        <CircularProgress value={score} size={180} strokeWidth={14} />
        {/* 中心内容 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('text-5xl font-bold tabular-nums', config.colorClass)}>
            {Math.round(score)}
          </span>
          <span className="text-sm text-gray-400 mt-1">/100</span>
        </div>
      </div>

      {/* 等级标签 */}
      <div
        className={cn(
          'mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium',
          config.lightBgClass,
          config.colorClass
        )}
      >
        <LevelIcon className="w-4 h-4" />
        <span>{t(config.labelKey) || config.defaultLabel}</span>
      </div>

      {/* 综合评分标签 */}
      <div className="mt-4 flex items-center gap-2 text-gray-500">
        <Shield className="w-4 h-4" />
        <span className="text-sm">{t('quality.overall')}</span>
      </div>
    </div>
  );
}

/**
 * 维度评分卡片组件 Props
 */
interface DimensionCardProps {
  dimension: DimensionKey;
  score: number;
  t: QualityDashboardProps['t'];
}

/**
 * 维度评分卡片组件
 */
function DimensionCard({ dimension, score, t }: DimensionCardProps) {
  const config = DIMENSION_CONFIG[dimension];
  const levelConfig = getLevelConfig(score);
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'relative p-4 rounded-xl border transition-all duration-200',
        'hover:shadow-md',
        levelConfig.lightBgClass,
        levelConfig.borderColorClass
      )}
    >
      <div className="flex items-start gap-3">
        {/* 图标 */}
        <div className="p-2.5 rounded-lg bg-white shadow-sm flex-shrink-0">
          <Icon className={cn('w-5 h-5', levelConfig.colorClass)} />
        </div>

        {/* 内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">
              {t(config.labelKey) || config.defaultLabel}
            </span>
            <span className={cn('text-lg font-bold tabular-nums', levelConfig.colorClass)}>
              {Math.round(score)}
            </span>
          </div>

          <p className="text-xs text-gray-500 mb-3">
            {t(config.descriptionKey) || config.defaultDescription}
          </p>

          {/* 进度条 */}
          <div className="w-full bg-white/80 rounded-full overflow-hidden h-2">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-700 ease-out',
                levelConfig.bgColorClass
              )}
              style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
            />
          </div>

          {/* 等级标签 */}
          <div className="mt-2 flex justify-end">
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                levelConfig.lightBgClass,
                levelConfig.colorClass
              )}
            >
              {t(levelConfig.labelKey) || levelConfig.defaultLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 改进建议列表组件 Props
 */
interface SuggestionsListProps {
  suggestions: string[];
  t: QualityDashboardProps['t'];
}

/**
 * 改进建议列表组件
 */
function SuggestionsList({ suggestions, t }: SuggestionsListProps) {
  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-amber-100">
          <Lightbulb className="w-4 h-4 text-amber-600" />
        </div>
        <span className="text-sm font-semibold text-gray-700">
          {t('quality.suggestions')}
        </span>
      </div>
      <div className="space-y-2">
        {suggestions.map((suggestion, index) => (
          <div
            key={index}
            className={cn(
              'flex items-start gap-2 p-3 rounded-lg text-sm',
              'bg-gray-50 hover:bg-gray-100 transition-colors duration-150',
              'border border-gray-100'
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
 * 加载状态骨架屏
 */
function QualityDashboardSkeleton() {
  return (
    <div className="bg-gray-50/50 rounded-xl p-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧综合评分骨架 */}
        <div className="flex flex-col items-center justify-center p-6">
          <Skeleton className="w-44 h-44 rounded-full" />
          <Skeleton className="h-8 w-24 mt-6" />
          <Skeleton className="h-4 w-20 mt-4" />
        </div>
        {/* 右侧维度卡片骨架 */}
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      </div>
      {/* 建议区域骨架 */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <Skeleton className="h-5 w-24 mb-3" />
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-16 w-full rounded-lg mt-2" />
      </div>
    </div>
  );
}

/**
 * 数据质量评分仪表盘组件
 *
 * 功能特性：
 * - 左侧展示综合评分（大数字 + 环形进度图 + 等级标签）
 * - 右侧展示三个维度评分卡片（一致性、新鲜度、完整性）
 * - 底部展示改进建议列表
 * - 根据分数显示不同颜色（优秀绿色、良好蓝色、一般黄色、差红色）
 * - 响应式布局（移动端堆叠）
 * - 支持加载状态
 *
 * @example
 * ```tsx
 * <QualityDashboard
 *   qualityScore={{
 *     overall: 85,
 *     consistency: 88,
 *     freshness: 92,
 *     completeness: 75,
 *     suggestions: ['建议缩短数据刷新间隔'],
 *   }}
 *   isLoading={false}
 *   t={(key) => translations[key]}
 * />
 * ```
 */
export function QualityDashboard({ qualityScore, isLoading, t }: QualityDashboardProps) {
  if (isLoading) {
    return <QualityDashboardSkeleton />;
  }

  const { overall, consistency, freshness, completeness, suggestions } = qualityScore;

  return (
    <div className="bg-gray-50/50 rounded-xl p-5">
      {/* 主内容区域：左侧综合评分 + 右侧维度卡片 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧：综合评分展示 */}
        <div className="bg-white rounded-xl p-4">
          <OverallScore score={overall} t={t} />
        </div>

        {/* 右侧：三维度评分卡片 */}
        <div className="space-y-3">
          <DimensionCard dimension="consistency" score={consistency} t={t} />
          <DimensionCard dimension="freshness" score={freshness} t={t} />
          <DimensionCard dimension="completeness" score={completeness} t={t} />
        </div>
      </div>

      {/* 底部：改进建议区域 */}
      {suggestions && suggestions.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <SuggestionsList suggestions={suggestions} t={t} />
        </div>
      )}
    </div>
  );
}

const MemoizedQualityDashboard = memo(QualityDashboard);
MemoizedQualityDashboard.displayName = 'QualityDashboard';

export default MemoizedQualityDashboard;
