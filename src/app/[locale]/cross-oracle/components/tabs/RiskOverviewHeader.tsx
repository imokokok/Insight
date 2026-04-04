'use client';

/**
 * @fileoverview 风险概览头部组件
 * @description 紧凑展示风险概览信息：异常数量、最大偏差、风险评分、风险分布
 */

import React, { memo } from 'react';

import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  Activity,
  BarChart3,
} from 'lucide-react';

import { cn } from '@/lib/utils';

// ============================================================================
// 类型定义
// ============================================================================

interface RiskOverviewHeaderProps {
  /** 异常数量 */
  anomalyCount: number;
  /** 最大偏差百分比 */
  maxDeviation: number;
  /** 风险评分 0-100 */
  riskScore: number;
  /** 高风险数量 */
  highRiskCount: number;
  /** 中风险数量 */
  mediumRiskCount: number;
  /** 低风险数量 */
  lowRiskCount: number;
  /** 是否安全状态 */
  isSafe: boolean;
  /** 国际化翻译函数 */
  t: (key: string, params?: Record<string, string | number>) => string;
  className?: string;
}

// ============================================================================
// 辅助函数
// ============================================================================

type RiskLevelKey = 'normal' | 'high' | 'medium' | 'low';

/**
 * 获取风险等级配置
 */
function getRiskLevelConfig(
  isSafe: boolean,
  riskScore: number,
  highRiskCount: number,
  mediumRiskCount: number,
  t: (key: string) => string
): {
  icon: React.ReactNode;
  labelKey: RiskLevelKey;
  label: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
} {
  if (isSafe) {
    return {
      icon: <ShieldCheck className="w-6 h-6" />,
      labelKey: 'normal',
      label: t('crossOracle.risk.normal'),
      colorClass: 'text-emerald-600',
      bgClass: 'bg-emerald-50',
      borderClass: 'border-emerald-200',
    };
  }

  if (highRiskCount > 0 || riskScore >= 70) {
    return {
      icon: <ShieldAlert className="w-6 h-6" />,
      labelKey: 'high',
      label: t('crossOracle.risk.high'),
      colorClass: 'text-red-600',
      bgClass: 'bg-red-50',
      borderClass: 'border-red-200',
    };
  }

  if (mediumRiskCount > 0 || riskScore >= 40) {
    return {
      icon: <AlertTriangle className="w-6 h-6" />,
      labelKey: 'medium',
      label: t('crossOracle.risk.medium'),
      colorClass: 'text-orange-600',
      bgClass: 'bg-orange-50',
      borderClass: 'border-orange-200',
    };
  }

  return {
    icon: <AlertCircle className="w-6 h-6" />,
    labelKey: 'low',
    label: t('crossOracle.risk.low'),
    colorClass: 'text-yellow-600',
    bgClass: 'bg-yellow-50',
    borderClass: 'border-yellow-200',
  };
}

/**
 * 获取风险评分颜色
 */
function getRiskScoreColor(score: number): string {
  if (score >= 70) return 'text-red-600';
  if (score >= 40) return 'text-orange-600';
  if (score >= 20) return 'text-yellow-600';
  return 'text-emerald-600';
}

/**
 * 获取风险评分背景色
 */
function getRiskScoreBgColor(score: number): string {
  if (score >= 70) return 'bg-red-100';
  if (score >= 40) return 'bg-orange-100';
  if (score >= 20) return 'bg-yellow-100';
  return 'bg-emerald-100';
}

// ============================================================================
// 子组件
// ============================================================================

interface MetricItemProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  colorClass?: string;
}

function MetricItem({ icon, label, value, colorClass = 'text-gray-900' }: MetricItemProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="p-1.5 rounded-md bg-gray-100">{icon}</div>
      <div>
        <div className="text-xs text-gray-500">{label}</div>
        <div className={cn('text-sm font-semibold tabular-nums', colorClass)}>{value}</div>
      </div>
    </div>
  );
}

interface RiskDistributionItemProps {
  label: string;
  count: number;
  colorClass: string;
}

function RiskDistributionItem({ label, count, colorClass }: RiskDistributionItemProps) {
  if (count === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      <span className={cn('w-2 h-2 rounded-full', colorClass.replace('text-', 'bg-'))} />
      <span className="text-xs text-gray-600">
        {label} <span className={cn('font-semibold tabular-nums', colorClass)}>{count}</span>
      </span>
    </div>
  );
}

// ============================================================================
// 主组件
// ============================================================================

function RiskOverviewHeaderComponent({
  anomalyCount,
  maxDeviation,
  riskScore,
  highRiskCount,
  mediumRiskCount,
  lowRiskCount,
  isSafe,
  t,
  className,
}: RiskOverviewHeaderProps) {
  const riskConfig = getRiskLevelConfig(isSafe, riskScore, highRiskCount, mediumRiskCount, t);
  const riskScoreColor = getRiskScoreColor(riskScore);
  const riskScoreBg = getRiskScoreBgColor(riskScore);

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4 px-4 py-3 rounded-lg border',
        'h-[72px]',
        riskConfig.bgClass,
        riskConfig.borderClass,
        className
      )}
    >
      {/* 左侧：风险等级指示器 */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div
          className={cn(
            'flex items-center justify-center w-12 h-12 rounded-full bg-white shadow-sm',
            riskConfig.colorClass
          )}
        >
          {riskConfig.icon}
        </div>
        <div>
          <div className={cn('text-sm font-semibold', riskConfig.colorClass)}>
            {riskConfig.label}
          </div>
          <div className="text-xs text-gray-500">
            {isSafe
              ? t('crossOracle.risk.dataConsistent')
              : t('crossOracle.risk.requiresAttention')}
          </div>
        </div>
      </div>

      {/* 中间：关键指标 */}
      <div className="hidden sm:flex items-center gap-6">
        <MetricItem
          icon={<Activity className="w-4 h-4 text-gray-600" />}
          label={t('crossOracle.risk.anomalyCount')}
          value={anomalyCount.toString()}
          colorClass={anomalyCount > 0 ? 'text-amber-600' : 'text-emerald-600'}
        />
        <MetricItem
          icon={<TrendingUp className="w-4 h-4 text-gray-600" />}
          label={t('crossOracle.risk.maxDeviation')}
          value={`${maxDeviation.toFixed(2)}%`}
          colorClass={
            maxDeviation > 5
              ? 'text-red-600'
              : maxDeviation > 2
                ? 'text-orange-600'
                : 'text-emerald-600'
          }
        />
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-gray-100">
            <BarChart3 className="w-4 h-4 text-gray-600" />
          </div>
          <div>
            <div className="text-xs text-gray-500">{t('crossOracle.risk.riskScore')}</div>
            <div className="flex items-center gap-1.5">
              <span className={cn('text-sm font-semibold tabular-nums', riskScoreColor)}>
                {riskScore}
              </span>
              <span className="text-xs text-gray-400">/100</span>
            </div>
          </div>
          {/* 风险评分进度条 */}
          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden ml-1">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-300',
                riskScoreColor.replace('text-', 'bg-')
              )}
              style={{ width: `${riskScore}%` }}
            />
          </div>
        </div>
      </div>

      {/* 右侧：风险分布 */}
      <div className="hidden md:flex items-center gap-4 flex-shrink-0">
        <div className="text-xs text-gray-500 mr-1">{t('crossOracle.risk.distribution')}</div>
        <div className="flex items-center gap-3">
          <RiskDistributionItem
            label={t('crossOracle.risk.high')}
            count={highRiskCount}
            colorClass="text-red-600"
          />
          <RiskDistributionItem
            label={t('crossOracle.risk.medium')}
            count={mediumRiskCount}
            colorClass="text-orange-600"
          />
          <RiskDistributionItem
            label={t('crossOracle.risk.low')}
            count={lowRiskCount}
            colorClass="text-yellow-600"
          />
        </div>
      </div>

      {/* 移动端简化显示 */}
      <div className="flex sm:hidden items-center gap-3">
        <div className={cn('px-2 py-1 rounded text-xs font-semibold bg-white/80', riskScoreColor)}>
          {riskScore}/100
        </div>
        {anomalyCount > 0 && (
          <div className="text-xs text-gray-600">
            {anomalyCount} {t('crossOracle.risk.anomalies')}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 导出
// ============================================================================

export const RiskOverviewHeader = memo(RiskOverviewHeaderComponent);
RiskOverviewHeader.displayName = 'RiskOverviewHeader';

export default RiskOverviewHeader;
