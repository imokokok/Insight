'use client';

import { useMemo } from 'react';

import { Clock, CheckCircle, Shield, AlertTriangle, Info } from 'lucide-react';

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
 * 格式化时间差
 */
function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffSeconds = Math.max(0, Math.floor((now.getTime() - new Date(date).getTime()) / 1000));

  if (diffSeconds < 60) return `${diffSeconds}秒前`;
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}分钟前`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}小时前`;
  return `${Math.floor(diffSeconds / 86400)}天前`;
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
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const progress = Math.min(100, Math.max(0, value));
  const dashoffset = circumference - (progress / 100) * circumference;
  const level = getQualityLevel(value);
  const colors = getQualityColorConfig(level);

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
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('text-lg font-bold', colors.text)}>{value}</span>
          <span className="text-xs text-gray-400">分</span>
        </div>
      )}
    </div>
  );
}

/**
 * 紧凑评分卡片组件
 */
interface CompactScoreCardProps {
  title: string;
  score: number;
  icon: React.ReactNode;
  description: string;
  details: React.ReactNode;
  rightContent: string;
}

function CompactScoreCard({ title, score, icon, description, details, rightContent }: CompactScoreCardProps) {
  const level = getQualityLevel(score);
  const colors = getQualityColorConfig(level);

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
          'flex items-center justify-between gap-4 px-4 py-3 rounded-lg border transition-all duration-200',
          'bg-white dark:bg-gray-800',
          colors.border,
          colors.borderDark,
          'hover:shadow-md cursor-pointer min-w-[200px] flex-1'
        )}
      >
        {/* 左侧：图标和标题 */}
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', colors.bgLight, colors.bgDark)}>
            <span className={cn('w-5 h-5 block', colors.text)}>{icon}</span>
          </div>
          <div>
            <span className="text-xs text-gray-500 dark:text-gray-400 block">{title}</span>
            <span className="text-xs text-gray-600 dark:text-gray-400 mt-0.5 block">{rightContent}</span>
          </div>
        </div>

        {/* 右侧：分数和状态 */}
        <div className="flex flex-col items-end">
          <span className={cn('text-lg font-bold leading-none', colors.text)}>{score}</span>
          <span className="text-[10px] text-gray-400 mt-1">
            {level === 'excellent' ? '优秀' : level === 'good' ? '良好' : '需改进'}
          </span>
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

function ScoreCard({ title, score, icon, description, details, compact }: ScoreCardProps) {
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
              <p className={cn('text-2xl font-bold mt-0.5', colors.text)}>{score}分</p>
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
            {level === 'excellent' ? '优秀' : level === 'good' ? '良好' : '需改进'}
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

function QualityDashboard({ scores, compact }: QualityDashboardProps) {
  const level = getQualityLevel(scores.overall);
  const colors = getQualityColorConfig(level);

  if (compact) {
    return (
      <Tooltip
        content={
          <div className="space-y-2">
            <p className="font-medium">综合质量评分</p>
            <div className="space-y-1 text-sm text-gray-300">
              <p>新鲜度: {scores.freshness}分</p>
              <p>完整度: {scores.completeness}分</p>
              <p>可靠性: {scores.reliability}分</p>
            </div>
          </div>
        }
        placement="top"
      >
        <div
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl border',
            'bg-white dark:bg-gray-800',
            colors.border,
            colors.borderDark
          )}
        >
          <CircularProgress value={scores.overall} size={56} strokeWidth={5} showValue={true} />
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">综合评分</p>
            <p className={cn('text-lg font-bold', colors.text)}>
              {level === 'excellent' ? '优秀' : level === 'good' ? '良好' : '需改进'}
            </p>
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
          <CircularProgress value={scores.overall} size={100} strokeWidth={8} />
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
          <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100">数据质量评估</h4>
          <p className={cn('text-3xl font-bold mt-1', colors.text)}>{scores.overall}分</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {level === 'excellent'
              ? '数据质量优秀，可以放心使用'
              : level === 'good'
                ? '数据质量良好，建议关注细节'
                : '数据质量需要改进，请检查数据源'}
          </p>

          {/* 各维度进度条 */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-12">新鲜度</span>
              <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-500', colors.bg)}
                  style={{ width: `${scores.freshness}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-600 w-8">{scores.freshness}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-12">完整度</span>
              <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-500', colors.bg)}
                  style={{ width: `${scores.completeness}%` }}
                />
              </div>
              <span className="text-xs font-medium text-gray-600 w-8">{scores.completeness}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-12">可靠性</span>
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
    return (
      <div className={cn('flex flex-wrap items-center gap-2', className)}>
        <CompactScoreCard
          title="新鲜度"
          score={scores.freshness}
          icon={<Clock className="w-4 h-4" />}
          description="基于数据最后更新时间计算，反映数据的实时性"
          details={
            <div className="space-y-1 text-sm">
              <p>最后更新: {formatTimeAgo(freshness.lastUpdated)}</p>
              <p>更新时间: {new Date(freshness.lastUpdated).toLocaleString('zh-CN')}</p>
            </div>
          }
          rightContent={formatTimeAgo(freshness.lastUpdated)}
        />
        <CompactScoreCard
          title="完整度"
          score={scores.completeness}
          icon={<CheckCircle className="w-4 h-4" />}
          description="基于数据请求成功率计算，反映数据的完整性"
          details={
            <div className="space-y-1 text-sm">
              <p>成功请求: {completeness.successCount.toLocaleString()}</p>
              <p>总请求数: {completeness.totalCount.toLocaleString()}</p>
              <p>
                成功率:{' '}
                {completeness.totalCount > 0
                  ? ((completeness.successCount / completeness.totalCount) * 100).toFixed(1)
                  : 0}
                %
              </p>
            </div>
          }
          rightContent={`${completeness.successCount}/${completeness.totalCount}`}
        />
        <CompactScoreCard
          title="可靠性"
          score={scores.reliability}
          icon={<Shield className="w-4 h-4" />}
          description="基于历史准确率和响应成功率综合计算"
          details={
            <div className="space-y-1 text-sm">
              <p>历史准确率: {reliability.historicalAccuracy}%</p>
              <p>响应成功率: {reliability.responseSuccessRate}%</p>
            </div>
          }
          rightContent={`${reliability.historicalAccuracy}%`}
        />
        <QualityDashboard scores={scores} compact />
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* 综合仪表盘 */}
      <QualityDashboard scores={scores} />

      {/* 各维度评分卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ScoreCard
          title="新鲜度"
          score={scores.freshness}
          icon={<Clock className="w-5 h-5" />}
          description="基于数据最后更新时间计算，反映数据的实时性"
          details={
            <div className="space-y-1 text-sm">
              <p>最后更新: {formatTimeAgo(freshness.lastUpdated)}</p>
              <p>更新时间: {new Date(freshness.lastUpdated).toLocaleString('zh-CN')}</p>
              <p className="text-gray-400 mt-2">
                评分规则: 1分钟内100分，5分钟内70-100分，10分钟内50-70分
              </p>
            </div>
          }
        />
        <ScoreCard
          title="完整度"
          score={scores.completeness}
          icon={<CheckCircle className="w-5 h-5" />}
          description="基于数据请求成功率计算，反映数据的完整性"
          details={
            <div className="space-y-1 text-sm">
              <p>成功请求: {completeness.successCount.toLocaleString()}</p>
              <p>总请求数: {completeness.totalCount.toLocaleString()}</p>
              <p>
                成功率:{' '}
                {completeness.totalCount > 0
                  ? ((completeness.successCount / completeness.totalCount) * 100).toFixed(2)
                  : 0}
                %
              </p>
            </div>
          }
        />
        <ScoreCard
          title="可靠性"
          score={scores.reliability}
          icon={<Shield className="w-5 h-5" />}
          description="基于历史准确率和响应成功率综合计算"
          details={
            <div className="space-y-1 text-sm">
              <p>历史准确率: {reliability.historicalAccuracy}%</p>
              <p>响应成功率: {reliability.responseSuccessRate}%</p>
              <p className="text-gray-400 mt-2">权重: 历史准确率60% + 响应成功率40%</p>
            </div>
          }
        />
      </div>
    </div>
  );
}

export default DataQualityIndicators;
