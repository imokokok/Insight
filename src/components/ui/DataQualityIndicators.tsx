'use client';

import { useMemo } from 'react';

import { Clock, CheckCircle, Shield, AlertTriangle, Info } from 'lucide-react';

import { useTranslations } from '@/i18n';
import { semanticColors } from '@/lib/config/colors';
import { cn } from '@/lib/utils';

import { Tooltip } from './Tooltip';

// ============================================
// 类型定义
// ============================================

export interface FreshnessData {
  lastUpdated: Date;
  score?: number;
}

export interface CompletenessData {
  successCount: number;
  totalCount: number;
  score?: number;
}

export interface ReliabilityData {
  historicalAccuracy: number;
  responseSuccessRate: number;
  score?: number;
}

export interface DataQualityIndicatorsProps {
  freshness: FreshnessData;
  completeness: CompletenessData;
  reliability: ReliabilityData;
  compact?: boolean;
  className?: string;
}

export interface QualityScore {
  freshness: number;
  completeness: number;
  reliability: number;
  overall: number;
}

export type QualityLevel = 'excellent' | 'good' | 'poor';

// ============================================
// 常量配置
// ============================================

const QUALITY_THRESHOLDS = {
  excellent: 80,
  good: 50,
} as const;

const FRESHNESS_THRESHOLDS = {
  excellent: 60, // 1分钟内
  good: 300, // 5分钟内
  warning: 600, // 10分钟内
} as const;

// ============================================
// 辅助函数
// ============================================

/**
 * 获取质量等级
 */
function getQualityLevel(score: number): QualityLevel {
  if (score >= QUALITY_THRESHOLDS.excellent) return 'excellent';
  if (score >= QUALITY_THRESHOLDS.good) return 'good';
  return 'poor';
}

/**
 * 获取质量等级对应的颜色配置
 */
function getQualityColorConfig(level: QualityLevel) {
  const configs = {
    excellent: {
      bg: 'bg-emerald-500',
      bgLight: 'bg-emerald-50',
      bgDark: 'bg-emerald-900/20',
      text: 'text-emerald-600',
      textDark: 'text-emerald-400',
      border: 'border-emerald-200',
      borderDark: 'border-emerald-800',
      gradient: 'from-emerald-500 to-emerald-600',
      shadow: 'shadow-emerald-500/20',
      color: semanticColors.success.DEFAULT,
    },
    good: {
      bg: 'bg-amber-500',
      bgLight: 'bg-amber-50',
      bgDark: 'bg-amber-900/20',
      text: 'text-amber-600',
      textDark: 'text-amber-400',
      border: 'border-amber-200',
      borderDark: 'border-amber-800',
      gradient: 'from-amber-500 to-amber-600',
      shadow: 'shadow-amber-500/20',
      color: semanticColors.warning.DEFAULT,
    },
    poor: {
      bg: 'bg-red-500',
      bgLight: 'bg-red-50',
      bgDark: 'bg-red-900/20',
      text: 'text-red-600',
      textDark: 'text-red-400',
      border: 'border-red-200',
      borderDark: 'border-red-800',
      gradient: 'from-red-500 to-red-600',
      shadow: 'shadow-red-500/20',
      color: semanticColors.danger.DEFAULT,
    },
  };
  return configs[level];
}

/**
 * 计算新鲜度评分
 * 基于最后更新时间，越近分数越高
 */
function calculateFreshnessScore(lastUpdated: Date): number {
  const now = new Date();
  const diffSeconds = Math.max(
    0,
    Math.floor((now.getTime() - new Date(lastUpdated).getTime()) / 1000)
  );

  if (diffSeconds <= FRESHNESS_THRESHOLDS.excellent) return 100;
  if (diffSeconds <= FRESHNESS_THRESHOLDS.good) {
    return Math.round(
      100 -
        ((diffSeconds - FRESHNESS_THRESHOLDS.excellent) /
          (FRESHNESS_THRESHOLDS.good - FRESHNESS_THRESHOLDS.excellent)) *
          30
    );
  }
  if (diffSeconds <= FRESHNESS_THRESHOLDS.warning) {
    return Math.round(
      70 -
        ((diffSeconds - FRESHNESS_THRESHOLDS.good) /
          (FRESHNESS_THRESHOLDS.warning - FRESHNESS_THRESHOLDS.good)) *
          20
    );
  }
  return Math.max(0, Math.round(50 - (diffSeconds - FRESHNESS_THRESHOLDS.warning) / 60));
}

/**
 * 计算完整度评分
 * 基于成功率百分比
 */
function calculateCompletenessScore(successCount: number, totalCount: number): number {
  if (totalCount === 0) return 0;
  return Math.round((successCount / totalCount) * 100);
}

/**
 * 计算可靠性评分
 * 综合历史准确率和响应成功率
 */
function calculateReliabilityScore(
  historicalAccuracy: number,
  responseSuccessRate: number
): number {
  return Math.round(historicalAccuracy * 0.6 + responseSuccessRate * 0.4);
}

/**
 * 格式化时间差 - 使用翻译函数
 */
function formatTimeAgo(
  date: Date,
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  const now = new Date();
  const diffSeconds = Math.max(0, Math.floor((now.getTime() - new Date(date).getTime()) / 1000));

  if (diffSeconds < 60) return t('dataQuality.secondsAgo', { seconds: diffSeconds });
  if (diffSeconds < 3600)
    return t('dataQuality.minutesAgo', { minutes: Math.floor(diffSeconds / 60) });
  if (diffSeconds < 86400)
    return t('dataQuality.hoursAgo', { hours: Math.floor(diffSeconds / 3600) });
  return t('dataQuality.daysAgo', { days: Math.floor(diffSeconds / 86400) });
}

// ============================================
// 子组件
// ============================================

/**
 * 圆形进度条组件
 */
interface CircularProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  showValue?: boolean;
}

function CircularProgress({
  value,
  size = 80,
  strokeWidth = 6,
  className,
  showValue = true,
  t,
}: CircularProgressProps & {
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(100, Math.max(0, value));
  const dashoffset = circumference - (progress / 100) * circumference;
  const level = getQualityLevel(value);
  const colors = getQualityColorConfig(level);

  // 根据数值位数调整字体大小
  const valueStr = value.toString();
  const fontSize =
    valueStr.length >= 3 ? 'text-sm' : valueStr.length >= 2 ? 'text-base' : 'text-lg';

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* 背景圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200 dark:text-gray-700"
        />
        {/* 进度圆环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashoffset}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {showValue && (
        <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
          <span className={cn('font-bold', fontSize, colors.text)}>{value}</span>
          {valueStr.length < 3 && (
            <span className="text-[8px] text-gray-400 mt-0.5">{t('dataQuality.score')}</span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 紧凑评分卡片组件 - 高密度信息展示
 */
interface CompactScoreCardProps {
  title: string;
  score: number;
  icon: React.ReactNode;
  description: string;
  details: React.ReactNode;
  primaryMetric: { label: string; value: string };
  secondaryMetric?: { label: string; value: string };
  trend?: 'up' | 'down' | 'stable';
}

function CompactScoreCard({
  title,
  score,
  icon,
  description,
  details,
  primaryMetric,
  secondaryMetric,
  trend,
}: CompactScoreCardProps) {
  const level = getQualityLevel(score);
  const colors = getQualityColorConfig(level);

  const trendIcon =
    trend === 'up' ? (
      <svg
        className="w-3 h-3 text-emerald-500"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M5 10l7-7m0 0l7 7m-7-7v18"
        />
      </svg>
    ) : trend === 'down' ? (
      <svg className="w-3 h-3 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M19 14l-7 7m0 0l-7-7m7 7V3"
        />
      </svg>
    ) : (
      <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
      </svg>
    );

  return (
    <Tooltip
      content={
        <div className="space-y-2">
          <p className="font-medium">{title}</p>
          <p className="text-gray-300">{description}</p>
          <div className="pt-2 border-t border-gray-700">{details}</div>
        </div>
      }
      placement="top"
    >
      <div
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all duration-200 h-full',
          'bg-white dark:bg-gray-800',
          colors.border,
          colors.borderDark,
          'hover:shadow-md cursor-pointer'
        )}
      >
        {/* 左侧：图标 */}
        <div className={cn('p-1.5 rounded-lg flex-shrink-0', colors.bgLight, colors.bgDark)}>
          <span className={cn('w-4 h-4 block', colors.text)}>{icon}</span>
        </div>

        {/* 中间：标题和指标 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{title}</span>
            {trendIcon}
          </div>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {primaryMetric.value}
            </span>
            {secondaryMetric && (
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                {secondaryMetric.label} {secondaryMetric.value}
              </span>
            )}
          </div>
        </div>

        {/* 右侧：分数和进度条 */}
        <div className="flex flex-col items-end gap-1">
          <span className={cn('text-base font-bold leading-none', colors.text)}>{score}</span>
          <div className="w-10 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div className={cn('h-full rounded-full', colors.bg)} style={{ width: `${score}%` }} />
          </div>
        </div>
      </div>
    </Tooltip>
  );
}

/**
 * 评分卡片组件
 */
interface ScoreCardProps {
  title: string;
  score: number;
  icon: React.ReactNode;
  description: string;
  details: React.ReactNode;
  compact?: boolean;
}

function ScoreCard({
  title,
  score,
  icon,
  description,
  details,
  compact,
  t,
}: ScoreCardProps & { t: (key: string, params?: Record<string, string | number>) => string }) {
  const level = getQualityLevel(score);
  const colors = getQualityColorConfig(level);

  if (compact) {
    return (
      <Tooltip
        content={
          <div className="space-y-2">
            <p className="font-medium">{title}</p>
            <p className="text-gray-300">{description}</p>
            <div className="pt-2 border-t border-gray-700">{details}</div>
          </div>
        }
        placement="top"
      >
        <div
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200',
            'bg-white dark:bg-gray-800',
            colors.border,
            colors.borderDark,
            'hover:shadow-md cursor-pointer'
          )}
        >
          <div className={cn('p-1.5 rounded-md', colors.bgLight, colors.bgDark)}>
            <span className={cn('w-4 h-4', colors.text)}>{icon}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">{title}</span>
            <span className={cn('text-sm font-bold', colors.text)}>{score}</span>
          </div>
        </div>
      </Tooltip>
    );
  }

  return (
    <Tooltip
      content={
        <div className="space-y-2 max-w-xs">
          <p className="font-medium">{description}</p>
          <div className="pt-2 border-t border-gray-700">{details}</div>
        </div>
      }
      placement="top"
    >
      <div
        className={cn(
          'relative overflow-hidden rounded-xl border p-4 transition-all duration-200',
          'bg-white dark:bg-gray-800',
          colors.border,
          colors.borderDark,
          'hover:shadow-lg cursor-pointer group'
        )}
      >
        {/* 顶部装饰条 */}
        <div
          className={cn('absolute top-0 left-0 right-0 h-1 bg-gradient-to-r', colors.gradient)}
        />

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'p-2.5 rounded-xl transition-transform duration-200 group-hover:scale-110',
                colors.bgLight,
                colors.bgDark
              )}
            >
              <span className={cn('w-5 h-5 block', colors.text)}>{icon}</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
              <p className={cn('text-2xl font-bold mt-0.5', colors.text)}>
                {score}
                {t('dataQuality.score')}
              </p>
            </div>
          </div>
          <div
            className={cn(
              'px-2 py-1 rounded-full text-xs font-medium',
              colors.bgLight,
              colors.bgDark,
              colors.text
            )}
          >
            {level === 'excellent'
              ? t('dataQuality.excellent')
              : level === 'good'
                ? t('dataQuality.good')
                : t('dataQuality.critical')}
          </div>
        </div>
      </div>
    </Tooltip>
  );
}

/**
 * 综合质量仪表盘组件
 */
interface QualityDashboardProps {
  scores: QualityScore;
  compact?: boolean;
}

function QualityDashboard({
  scores,
  compact,
  t,
}: QualityDashboardProps & {
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const level = getQualityLevel(scores.overall);
  const colors = getQualityColorConfig(level);

  if (compact) {
    return (
      <Tooltip
        content={
          <div className="space-y-2">
            <p className="font-medium">{t('dataQuality.overallScore')}</p>
            <div className="space-y-1 text-sm text-gray-300">
              <p>
                {t('dataQuality.freshness')}: {scores.freshness}
                {t('dataQuality.score')}
              </p>
              <p>
                {t('dataQuality.completeness')}: {scores.completeness}
                {t('dataQuality.score')}
              </p>
              <p>
                {t('dataQuality.reliability')}: {scores.reliability}
                {t('dataQuality.score')}
              </p>
            </div>
          </div>
        }
        placement="top"
      >
        <div
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-lg border h-full',
            'bg-white dark:bg-gray-800',
            colors.border,
            colors.borderDark,
            'hover:shadow-md cursor-pointer transition-all duration-200'
          )}
        >
          <CircularProgress
            value={scores.overall}
            size={44}
            strokeWidth={4}
            showValue={true}
            t={t}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
              {t('dataQuality.overallScore')}
            </p>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <span className={cn('text-sm font-bold', colors.text)}>
                {level === 'excellent'
                  ? t('dataQuality.excellent')
                  : level === 'good'
                    ? t('dataQuality.good')
                    : t('dataQuality.critical')}
              </span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                {scores.overall}
                {t('dataQuality.score')}
              </span>
            </div>
            {/* 迷你三维度进度条 */}
            <div className="flex items-center gap-1 mt-1.5">
              <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full',
                    scores.freshness >= 80
                      ? 'bg-emerald-500'
                      : scores.freshness >= 50
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                  )}
                  style={{ width: `${scores.freshness}%` }}
                />
              </div>
              <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full',
                    scores.completeness >= 80
                      ? 'bg-emerald-500'
                      : scores.completeness >= 50
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                  )}
                  style={{ width: `${scores.completeness}%` }}
                />
              </div>
              <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full',
                    scores.reliability >= 80
                      ? 'bg-emerald-500'
                      : scores.reliability >= 50
                        ? 'bg-amber-500'
                        : 'bg-red-500'
                  )}
                  style={{ width: `${scores.reliability}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </Tooltip>
    );
  }

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border p-6',
        'bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900',
        colors.border,
        colors.borderDark
      )}
    >
      {/* 背景装饰 */}
      <div
        className={cn('absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-10', colors.bg)}
      />

      <div className="relative flex items-center gap-6">
        <div className="relative">
          <CircularProgress value={scores.overall} size={100} strokeWidth={8} t={t} />
          <div
            className={cn(
              'absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center',
              'bg-white dark:bg-gray-800 shadow-md',
              colors.text
            )}
          >
            {level === 'excellent' ? (
              <CheckCircle className="w-5 h-5" />
            ) : level === 'good' ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <Info className="w-5 h-5" />
            )}
          </div>
        </div>

        <div className="flex-1">
          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {t('dataQuality.qualityAssessment')}
          </h4>
          <p className={cn('text-3xl font-bold mt-1', colors.text)}>
            {scores.overall}
            {t('dataQuality.score')}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {level === 'excellent'
              ? t('dataQuality.qualityExcellent')
              : level === 'good'
                ? t('dataQuality.qualityGood')
                : t('dataQuality.qualityPoor')}
          </p>

          {/* 各维度进度条 */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-12">{t('dataQuality.freshness')}</span>
              <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-500', colors.bg)}
                  style={{ width: `${scores.freshness}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-600 w-8">{scores.freshness}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-12">{t('dataQuality.completeness')}</span>
              <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-500', colors.bg)}
                  style={{ width: `${scores.completeness}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-600 w-8">{scores.completeness}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-12">{t('dataQuality.reliability')}</span>
              <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-500', colors.bg)}
                  style={{ width: `${scores.reliability}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-600 w-8">{scores.reliability}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// 主组件
// ============================================

export function DataQualityIndicators({
  freshness,
  completeness,
  reliability,
  compact = false,
  className,
}: DataQualityIndicatorsProps) {
  const t = useTranslations();

  // 计算各维度评分
  const scores: QualityScore = useMemo(() => {
    const freshnessScore = freshness.score ?? calculateFreshnessScore(freshness.lastUpdated);
    const completenessScore =
      completeness.score ??
      calculateCompletenessScore(completeness.successCount, completeness.totalCount);
    const reliabilityScore =
      reliability.score ??
      calculateReliabilityScore(reliability.historicalAccuracy, reliability.responseSuccessRate);

    const overall = Math.round((freshnessScore + completenessScore + reliabilityScore) / 3);

    return {
      freshness: freshnessScore,
      completeness: completenessScore,
      reliability: reliabilityScore,
      overall,
    };
  }, [freshness, completeness, reliability]);

  if (compact) {
    const completenessRate =
      completeness.totalCount > 0
        ? ((completeness.successCount / completeness.totalCount) * 100).toFixed(1)
        : '0';

    return (
      <div className={cn('grid grid-cols-2 lg:grid-cols-4 gap-2', className)}>
        <CompactScoreCard
          title={t('dataQuality.freshness')}
          score={scores.freshness}
          icon={<Clock className="w-4 h-4" />}
          description={t('dataQuality.freshnessTrendDesc')}
          details={
            <div className="space-y-1 text-sm">
              <p>
                {t('dataQuality.lastUpdated')}: {formatTimeAgo(freshness.lastUpdated, t)}
              </p>
              <p>
                {t('dataQuality.updatedAt')}: {new Date(freshness.lastUpdated).toLocaleString()}
              </p>
              <p className="text-gray-400 mt-1">
                {t('dataQuality.score')}: {scores.freshness}
                {t('dataQuality.score')}
              </p>
            </div>
          }
          primaryMetric={{ label: '', value: formatTimeAgo(freshness.lastUpdated, t) }}
          secondaryMetric={{ label: t('dataQuality.updatedAt'), value: '' }}
          trend="stable"
        />
        <CompactScoreCard
          title={t('dataQuality.completeness')}
          score={scores.completeness}
          icon={<CheckCircle className="w-4 h-4" />}
          description={t('dataQuality.completenessDesc')}
          details={
            <div className="space-y-1 text-sm">
              <p>
                {t('dataQuality.success')}: {completeness.successCount.toLocaleString()}
              </p>
              <p>
                {t('dataQuality.total')}: {completeness.totalCount.toLocaleString()}
              </p>
              <p>
                {t('dataQuality.successRate')}: {completenessRate}%
              </p>
            </div>
          }
          primaryMetric={{ label: '', value: `${completenessRate}%` }}
          secondaryMetric={{
            label: t('dataQuality.success'),
            value: `${completeness.successCount}/${completeness.totalCount}`,
          }}
          trend={scores.completeness >= 95 ? 'up' : scores.completeness >= 80 ? 'stable' : 'down'}
        />
        <CompactScoreCard
          title={t('dataQuality.reliability')}
          score={scores.reliability}
          icon={<Shield className="w-4 h-4" />}
          description={t('dataQuality.reliabilityDesc')}
          details={
            <div className="space-y-1 text-sm">
              <p>
                {t('dataQuality.historicalAccuracy')}: {reliability.historicalAccuracy.toFixed(1)}%
              </p>
              <p>
                {t('dataQuality.responseSuccessRate')}: {reliability.responseSuccessRate.toFixed(1)}
                %
              </p>
              <p className="text-gray-400 mt-1">
                {t('dataQuality.weight')}: {t('dataQuality.weightDescription')}
              </p>
            </div>
          }
          primaryMetric={{ label: '', value: `${reliability.historicalAccuracy.toFixed(1)}%` }}
          secondaryMetric={{
            label: t('dataQuality.responseSuccessRate'),
            value: `${reliability.responseSuccessRate.toFixed(0)}%`,
          }}
          trend={scores.reliability >= 90 ? 'up' : scores.reliability >= 70 ? 'stable' : 'down'}
        />
        <QualityDashboard scores={scores} compact t={t} />
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* 综合仪表盘 */}
      <QualityDashboard scores={scores} t={t} />

      {/* 各维度评分卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ScoreCard
          title={t('dataQuality.freshness')}
          score={scores.freshness}
          icon={<Clock className="w-5 h-5" />}
          description={t('dataQuality.freshnessTrendDesc')}
          details={
            <div className="space-y-1 text-sm">
              <p>
                {t('dataQuality.lastUpdated')}: {formatTimeAgo(freshness.lastUpdated, t)}
              </p>
              <p>
                {t('dataQuality.updatedAt')}: {new Date(freshness.lastUpdated).toLocaleString()}
              </p>
              <p className="text-gray-400 mt-2">{t('dataQuality.scoringRules')}</p>
            </div>
          }
          t={t}
        />
        <ScoreCard
          title={t('dataQuality.completeness')}
          score={scores.completeness}
          icon={<CheckCircle className="w-5 h-5" />}
          description={t('dataQuality.completenessDesc')}
          details={
            <div className="space-y-1 text-sm">
              <p>
                {t('dataQuality.success')}: {completeness.successCount.toLocaleString()}
              </p>
              <p>
                {t('dataQuality.total')}: {completeness.totalCount.toLocaleString()}
              </p>
              <p>
                {t('dataQuality.successRate')}:{' '}
                {completeness.totalCount > 0
                  ? ((completeness.successCount / completeness.totalCount) * 100).toFixed(2)
                  : 0}
                %
              </p>
            </div>
          }
          t={t}
        />
        <ScoreCard
          title={t('dataQuality.reliability')}
          score={scores.reliability}
          icon={<Shield className="w-5 h-5" />}
          description={t('dataQuality.reliabilityDesc')}
          details={
            <div className="space-y-1 text-sm">
              <p>
                {t('dataQuality.historicalAccuracy')}: {reliability.historicalAccuracy.toFixed(1)}%
              </p>
              <p>
                {t('dataQuality.responseSuccessRate')}: {reliability.responseSuccessRate.toFixed(1)}
                %
              </p>
              <p className="text-gray-400 mt-2">
                {t('dataQuality.weight')}: {t('dataQuality.weightDescription')}
              </p>
            </div>
          }
          t={t}
        />
      </div>
    </div>
  );
}

export default DataQualityIndicators;
