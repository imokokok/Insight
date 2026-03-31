'use client';

import { useState, useMemo } from 'react';

import {
  Shield,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

import { useTranslations } from '@/i18n';

import { type RiskMetrics } from '../types';

interface RiskDashboardProps {
  data: RiskMetrics | null;
  loading?: boolean;
}

export default function RiskDashboard({ data, loading = false }: RiskDashboardProps) {
  const t = useTranslations('marketOverview.risk');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));

  // 切换展开状态
  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  // 获取风险等级样式
  const getRiskLevelStyle = (level: string | undefined) => {
    switch (level) {
      case 'low':
        return 'bg-success-100 text-success-700 border-success-200';
      case 'medium':
        return 'bg-warning-100 text-warning-700 border-warning-200';
      case 'high':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'critical':
        return 'bg-danger-100 text-danger-700 border-danger-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // 获取风险等级标签
  const getRiskLevelLabel = (level: string | undefined) => {
    const labels: Record<string, string> = {
      low: t('lowRisk'),
      medium: t('mediumRisk'),
      high: t('highRisk'),
      critical: t('criticalRisk'),
    };
    return (level && labels[level]) || level || '-';
  };

  // 获取趋势图标
  const getTrendIcon = (trend: 'stable' | 'up' | 'down' | undefined) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-success-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-danger-500" />;
      case 'stable':
      default:
        return <Activity className="w-4 h-4 text-gray-400" />;
    }
  };

  // 计算风险分布
  const riskDistribution = useMemo(() => {
    if (!data) return [];
    return [
      { level: 'low', count: data.lowRiskCount || 0, color: 'bg-success-500' },
      { level: 'medium', count: data.mediumRiskCount || 0, color: 'bg-warning-500' },
      { level: 'high', count: data.highRiskCount || 0, color: 'bg-orange-500' },
      { level: 'critical', count: data.criticalRiskCount || 0, color: 'bg-danger-500' },
    ];
  }, [data]);

  // 格式化百分比
  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  // 格式化时间
  const formatTime = (timestamp?: number) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="py-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent animate-spin" />
          <span className="text-gray-500 text-sm">{t('loading')}</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-8 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">{t('noData')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Overall Risk Level */}
      <div className="p-4 bg-gray-50 border border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary-500" />
            <span className="font-medium text-gray-900">{t('overallRiskLevel')}</span>
          </div>
          <span
            className={`px-3 py-1 text-sm font-medium border ${getRiskLevelStyle(data.overallRiskLevel)}`}
          >
            {getRiskLevelLabel(data.overallRiskLevel)}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500">{t('riskScore')}:</span>
            <span className="font-semibold text-gray-900">{data.riskScore?.toFixed(1) || '-'}</span>
            <span className="text-gray-400">/100</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500">{t('trend')}:</span>
            {getTrendIcon(data.riskTrend)}
          </div>
        </div>
      </div>

      {/* Risk Distribution */}
      <div className="border border-gray-200">
        <button
          onClick={() => toggleSection('distribution')}
          className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
        >
          <span className="font-medium text-gray-900">{t('riskDistribution')}</span>
          {expandedSections.has('distribution') ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>
        {expandedSections.has('distribution') && (
          <div className="p-3 border-t border-gray-100">
            <div className="space-y-2">
              {riskDistribution.map((item) => (
                <div key={item.level} className="flex items-center gap-3">
                  <div className={`w-3 h-3 ${item.color}`} />
                  <span className="flex-1 text-sm text-gray-600">
                    {getRiskLevelLabel(item.level)}
                  </span>
                  <span className="text-sm font-medium text-gray-900">{item.count}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{t('totalAssets')}</span>
                <span className="font-medium text-gray-900">{data.totalAssets || 0}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Key Risk Metrics */}
      <div className="border border-gray-200">
        <button
          onClick={() => toggleSection('metrics')}
          className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
        >
          <span className="font-medium text-gray-900">{t('keyMetrics')}</span>
          {expandedSections.has('metrics') ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>
        {expandedSections.has('metrics') && (
          <div className="p-3 border-t border-gray-100 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                  <Info className="w-3 h-3" />
                  {t('volatilityIndex')}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-semibold text-gray-900">
                    {data.volatilityIndex?.toFixed(2) || '-'}
                  </span>
                  {data.volatilityChange !== undefined && (
                    <span
                      className={`text-xs ${data.volatilityChange >= 0 ? 'text-success-600' : 'text-danger-600'}`}
                    >
                      {formatPercent(data.volatilityChange)}
                    </span>
                  )}
                </div>
              </div>
              <div className="p-3 bg-gray-50">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                  <AlertTriangle className="w-3 h-3" />
                  {t('maxDrawdown')}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-semibold text-gray-900">
                    {data.maxDrawdown ? `${data.maxDrawdown.toFixed(2)}%` : '-'}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-gray-50">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                  <Activity className="w-3 h-3" />
                  {t('sharpeRatio')}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-semibold text-gray-900">
                    {data.sharpeRatio?.toFixed(2) || '-'}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-gray-50">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                  <Shield className="w-3 h-3" />
                  {t('var95')}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg font-semibold text-gray-900">
                    {data.var95 ? `${data.var95.toFixed(2)}%` : '-'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Risk Alerts */}
      {data.recentAlerts && data.recentAlerts.length > 0 && (
        <div className="border border-gray-200">
          <button
            onClick={() => toggleSection('alerts')}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900">{t('recentAlerts')}</span>
              <span className="px-2 py-0.5 text-xs font-medium bg-warning-100 text-warning-700">
                {data.recentAlerts.length}
              </span>
            </div>
            {expandedSections.has('alerts') ? (
              <ChevronUp className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </button>
          {expandedSections.has('alerts') && (
            <div className="p-3 border-t border-gray-100 space-y-2">
              {data.recentAlerts.slice(0, 5).map((alert, index) => (
                <div
                  key={index}
                  className={`p-2.5 border-l-2 ${getRiskLevelStyle(alert.level).replace('bg-', 'border-').split(' ')[2]}`}
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-warning-500 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{alert.message}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatTime(alert.timestamp)}
                        </span>
                        <span>{getRiskLevelLabel(alert.level)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Last Updated */}
      <div className="pt-2 border-t border-gray-100">
        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Clock className="w-3 h-3" />
          <span>
            {t('lastUpdated')}: {formatTime(data.lastUpdated)}
          </span>
        </div>
      </div>
    </div>
  );
}
