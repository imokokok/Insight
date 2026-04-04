'use client';

/**
 * @fileoverview 智能风险建议面板组件
 * @description 根据风险数据自动生成智能建议，帮助用户快速响应风险情况
 */

import { memo, useMemo } from 'react';

import {
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  Info,
  Shield,
  ShieldAlert,
  WifiOff,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

import type { PriceAnomaly } from '../../hooks/usePriceAnomalyDetection';

// ============================================================================
// 类型定义
// ============================================================================

interface RiskRecommendationsProps {
  /** 异常列表 */
  anomalies: PriceAnomaly[];
  /** 高风险异常数量 */
  highRiskCount: number;
  /** 中风险异常数量 */
  mediumRiskCount: number;
  /** 最大偏差值 */
  maxDeviation: number;
  /** 导出报告回调 */
  onExportReport?: () => void;
  /** 翻译函数 */
  t: (key: string, params?: Record<string, string | number>) => string;
}

type RecommendationPriority = 'critical' | 'warning' | 'info';

interface RecommendationItem {
  /** 优先级 */
  priority: RecommendationPriority;
  /** 图标 */
  icon: React.ReactNode;
  /** 建议标题 */
  title: string;
  /** 详细描述 */
  description: string;
  /** 建议操作 */
  action?: string;
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 获取优先级对应的颜色配置
 */
function getPriorityColorConfig(priority: RecommendationPriority) {
  switch (priority) {
    case 'critical':
      return {
        border: 'border-l-red-500',
        bg: 'bg-red-50',
        iconBg: 'bg-red-100',
        icon: 'text-red-600',
        title: 'text-red-800',
        description: 'text-red-700',
        action: 'bg-red-600 hover:bg-red-700 text-white',
      };
    case 'warning':
      return {
        border: 'border-l-orange-500',
        bg: 'bg-orange-50',
        iconBg: 'bg-orange-100',
        icon: 'text-orange-600',
        title: 'text-orange-800',
        description: 'text-orange-700',
        action: 'bg-orange-600 hover:bg-orange-700 text-white',
      };
    case 'info':
    default:
      return {
        border: 'border-l-blue-500',
        bg: 'bg-blue-50',
        iconBg: 'bg-blue-100',
        icon: 'text-blue-600',
        title: 'text-blue-800',
        description: 'text-blue-700',
        action: 'bg-blue-600 hover:bg-blue-700 text-white',
      };
  }
}

/**
 * 根据风险数据生成建议
 */
function generateRecommendations(
  anomalies: PriceAnomaly[],
  highRiskCount: number,
  mediumRiskCount: number,
  maxDeviation: number,
  t: (key: string, params?: Record<string, string | number>) => string
): RecommendationItem[] {
  const recommendations: RecommendationItem[] = [];

  // 1. 高风险建议
  if (highRiskCount > 0) {
    recommendations.push({
      priority: 'critical',
      icon: <ShieldAlert className="w-5 h-5" />,
      title: t('crossOracle.risk.recommendations.criticalTitle'),
      description: t('crossOracle.risk.recommendations.criticalDesc', { count: highRiskCount }),
      action: t('crossOracle.risk.recommendations.checkDataSource'),
    });

    recommendations.push({
      priority: 'critical',
      icon: <AlertOctagon className="w-5 h-5" />,
      title: t('crossOracle.risk.recommendations.disableOracleTitle'),
      description: t('crossOracle.risk.recommendations.disableOracleDesc'),
      action: t('crossOracle.risk.recommendations.viewOracleList'),
    });
  }

  // 2. 中风险建议
  if (mediumRiskCount > 0) {
    recommendations.push({
      priority: 'warning',
      icon: <AlertTriangle className="w-5 h-5" />,
      title: t('crossOracle.risk.recommendations.monitorMarketTitle'),
      description: t('crossOracle.risk.recommendations.monitorMarketDesc', {
        count: mediumRiskCount,
      }),
      action: t('crossOracle.risk.recommendations.viewMarketData'),
    });
  }

  // 3. 根据最大偏差值生成建议
  if (maxDeviation > 5) {
    recommendations.push({
      priority: 'critical',
      icon: <AlertCircle className="w-5 h-5" />,
      title: t('crossOracle.risk.recommendations.highDeviationTitle'),
      description: t('crossOracle.risk.recommendations.highDeviationDesc', {
        deviation: maxDeviation.toFixed(2),
      }),
      action: t('crossOracle.risk.recommendations.confirmMarket'),
    });
  } else if (maxDeviation > 3) {
    recommendations.push({
      priority: 'warning',
      icon: <Info className="w-5 h-5" />,
      title: t('crossOracle.risk.recommendations.significantDeviationTitle'),
      description: t('crossOracle.risk.recommendations.significantDeviationDesc'),
    });
  }

  // 4. 检查数据延迟
  const delayedAnomalies = anomalies.filter((a) => a.freshnessSeconds > 300);
  if (delayedAnomalies.length > 0) {
    recommendations.push({
      priority: 'warning',
      icon: <WifiOff className="w-5 h-5" />,
      title: t('crossOracle.risk.recommendations.dataDelayTitle'),
      description: t('crossOracle.risk.recommendations.dataDelayDesc', {
        count: delayedAnomalies.length,
      }),
      action: t('crossOracle.risk.recommendations.checkNetwork'),
    });
  }

  // 5. 低风险/正常建议
  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'info',
      icon: <CheckCircle2 className="w-5 h-5" />,
      title: t('crossOracle.risk.recommendations.allClearTitle'),
      description: t('crossOracle.risk.recommendations.allClearDesc'),
    });

    recommendations.push({
      priority: 'info',
      icon: <Shield className="w-5 h-5" />,
      title: t('crossOracle.risk.recommendations.maintainMonitoringTitle'),
      description: t('crossOracle.risk.recommendations.maintainMonitoringDesc'),
    });
  }

  // 6. 通用建议
  if (anomalies.length > 0) {
    recommendations.push({
      priority: 'info',
      icon: <FileText className="w-5 h-5" />,
      title: t('crossOracle.risk.recommendations.documentTitle'),
      description: t('crossOracle.risk.recommendations.documentDesc'),
    });
  }

  return recommendations;
}

/**
 * 优先级排序权重
 */
const PRIORITY_WEIGHT: Record<RecommendationPriority, number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

// ============================================================================
// 建议项组件
// ============================================================================

interface RecommendationCardProps {
  recommendation: RecommendationItem;
  index: number;
  t: (key: string, params?: Record<string, string | number>) => string;
}

function RecommendationCard({ recommendation, index, t }: RecommendationCardProps) {
  const colors = getPriorityColorConfig(recommendation.priority);

  return (
    <div
      className={`
        relative flex items-start gap-4 p-4 rounded-r-xl border border-l-4
        transition-all duration-200 hover:shadow-md
        ${colors.bg} ${colors.border}
      `}
    >
      {/* 序号 */}
      <div className="flex-shrink-0 text-xs text-gray-400 font-mono">#{index + 1}</div>

      {/* 图标 */}
      <div
        className={`
          flex-shrink-0 p-2 rounded-lg
          ${colors.iconBg} ${colors.icon}
        `}
      >
        {recommendation.icon}
      </div>

      {/* 内容 */}
      <div className="flex-1 min-w-0">
        <h4 className={`font-semibold ${colors.title}`}>{recommendation.title}</h4>
        <p className={`text-sm mt-1 ${colors.description}`}>{recommendation.description}</p>

        {/* 操作按钮 */}
        {recommendation.action && (
          <button
            type="button"
            className={`
              mt-3 px-3 py-1.5 text-xs font-medium rounded-lg
              transition-colors duration-200
              ${colors.action}
            `}
          >
            {recommendation.action}
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// 空状态组件
// ============================================================================

function EmptyState({
  t,
}: {
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
        <CheckCircle2 className="w-8 h-8 text-emerald-600" />
      </div>
      <h4 className="text-base font-semibold text-gray-900">
        {t('crossOracle.risk.recommendations.noRecommendations')}
      </h4>
      <p className="text-sm text-gray-500 mt-1 max-w-sm">
        {t('crossOracle.risk.recommendations.noRecommendationsDesc')}
      </p>
    </div>
  );
}

// ============================================================================
// 主组件
// ============================================================================

function RiskRecommendationsComponent({
  anomalies,
  highRiskCount,
  mediumRiskCount,
  maxDeviation,
  onExportReport,
  t,
}: RiskRecommendationsProps) {
  // 生成建议列表
  const recommendations = useMemo(() => {
    const items = generateRecommendations(
      anomalies,
      highRiskCount,
      mediumRiskCount,
      maxDeviation,
      t
    );

    // 按优先级排序
    return items.sort((a, b) => PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority]);
  }, [anomalies, highRiskCount, mediumRiskCount, maxDeviation, t]);

  // 统计各优先级数量
  const priorityCounts = useMemo(() => {
    return {
      critical: recommendations.filter((r) => r.priority === 'critical').length,
      warning: recommendations.filter((r) => r.priority === 'warning').length,
      info: recommendations.filter((r) => r.priority === 'info').length,
    };
  }, [recommendations]);

  // 是否有建议
  const hasRecommendations = recommendations.length > 0;

  return (
    <Card className="overflow-hidden">
      {/* 头部 */}
      <CardHeader className="border-b bg-gray-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {t('crossOracle.risk.recommendations.title')}
              </CardTitle>
              <p className="text-sm text-gray-500 mt-0.5">
                {t('crossOracle.risk.recommendations.subtitle')}
              </p>
            </div>
          </div>

          {/* 优先级统计 */}
          {hasRecommendations && (
            <div className="hidden sm:flex items-center gap-2">
              {priorityCounts.critical > 0 && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                  <AlertOctagon className="w-3 h-3 mr-1" />
                  {priorityCounts.critical}
                </span>
              )}
              {priorityCounts.warning > 0 && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-700">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  {priorityCounts.warning}
                </span>
              )}
              {priorityCounts.info > 0 && (
                <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                  <Info className="w-3 h-3 mr-1" />
                  {priorityCounts.info}
                </span>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      {/* 内容 */}
      <CardContent className="p-6">
        {hasRecommendations ? (
          <div className="space-y-4">
            {/* 建议列表 */}
            <div className="space-y-3">
              {recommendations.map((recommendation, index) => (
                <RecommendationCard
                  key={`${recommendation.priority}-${index}`}
                  recommendation={recommendation}
                  index={index}
                  t={t}
                />
              ))}
            </div>

            {/* 导出报告按钮 */}
            {onExportReport && (
              <div className="pt-4 border-t">
                <Button variant="secondary" className="w-full sm:w-auto" onClick={onExportReport}>
                  <Download className="w-4 h-4 mr-2" />
                  {t('crossOracle.risk.recommendations.exportReport')}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <EmptyState t={t} />
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// 导出
// ============================================================================

export const RiskRecommendations = memo(RiskRecommendationsComponent);
RiskRecommendations.displayName = 'RiskRecommendations';

export default RiskRecommendations;
