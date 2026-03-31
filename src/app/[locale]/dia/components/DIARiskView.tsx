'use client';

import {
  Shield,
  Activity,
  Database,
  Users,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';

import { RiskAssessmentDashboard } from '@/components/oracle/charts/RiskAssessmentDashboard';
import { Skeleton } from '@/components/ui';
import { useDIANetworkStats, useDIADataSourceVerification } from '@/hooks';
import { useTranslations } from '@/i18n';

export function DIARiskView() {
  const t = useTranslations('dia');
  const { networkStats, isLoading: isStatsLoading } = useDIANetworkStats();
  const { dataSourceVerification: verificationData, isLoading: isVerificationLoading } =
    useDIADataSourceVerification();

  const getRiskLevelColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'low':
        return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'medium':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'high':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getRiskLevelIcon = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'low':
        return <CheckCircle className="w-4 h-4 text-emerald-600" />;
      case 'medium':
        return <AlertTriangle className="w-4 h-4 text-amber-600" />;
      case 'high':
        return <AlertCircle className="w-4 h-4 text-rose-600" />;
      default:
        return <Shield className="w-4 h-4 text-gray-600" />;
    }
  };

  const riskFactors = [
    { key: 'dataSource', severity: 'low' },
    { key: 'smartContract', severity: 'low' },
    { key: 'marketManipulation', severity: 'medium' },
    { key: 'networkCongestion', severity: 'low' },
  ];

  return (
    <div className="space-y-6">
      {/* 风险指标概览 - 简洁行内布局 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 网络正常运行时间 */}
        <div className="flex items-center gap-3 py-2">
          <Activity className="w-5 h-5 text-indigo-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-500">{t('risk.uptime')}</p>
            {isStatsLoading ? (
              <Skeleton className="h-7 w-20 mt-0.5" />
            ) : (
              <p className="text-xl font-semibold text-gray-900">
                {networkStats?.uptime?.toFixed(2) ?? '99.99'}%
              </p>
            )}
          </div>
        </div>

        {/* 数据质量 */}
        <div className="flex items-center gap-3 py-2">
          <Database className="w-5 h-5 text-indigo-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-500">{t('risk.dataQuality')}</p>
            {isStatsLoading ? (
              <Skeleton className="h-7 w-20 mt-0.5" />
            ) : (
              <p className="text-xl font-semibold text-gray-900">
                {networkStats?.dataQuality?.toFixed(0) ?? '98'}%
              </p>
            )}
          </div>
        </div>

        {/* 预言机多样性 */}
        <div className="flex items-center gap-3 py-2">
          <Users className="w-5 h-5 text-indigo-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-500">{t('risk.oracleDiversity')}</p>
            {isStatsLoading ? (
              <Skeleton className="h-7 w-20 mt-0.5" />
            ) : (
              <p className="text-xl font-semibold text-gray-900">
                {networkStats?.oracleDiversity ?? '12'}
              </p>
            )}
          </div>
        </div>

        {/* 平均置信度 */}
        <div className="flex items-center gap-3 py-2">
          <TrendingUp className="w-5 h-5 text-indigo-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-500">{t('risk.avgConfidence')}</p>
            {isStatsLoading ? (
              <Skeleton className="h-7 w-20 mt-0.5" />
            ) : (
              <p className="text-xl font-semibold text-gray-900">
                {networkStats?.avgConfidence?.toFixed(0) ?? '95'}%
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 风险评估面板 - 简洁列表布局 */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-4 h-4 text-gray-700" />
          <h3 className="text-sm font-medium text-gray-900">{t('risk.assessment')}</h3>
        </div>

        {/* 整体风险等级 - 行内展示 */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm text-gray-600">{t('risk.overallLevel')}</span>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium rounded-full border ${getRiskLevelColor(
              networkStats?.riskLevel ?? 'low'
            )}`}
          >
            {getRiskLevelIcon(networkStats?.riskLevel ?? 'low')}
            {t(`risk.level.${networkStats?.riskLevel ?? 'low'}`)}
          </span>
        </div>

        {/* 风险因素列表 */}
        <div className="space-y-0">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
            {t('risk.factors')}
          </h4>
          {riskFactors.map((factor) => (
            <div
              key={factor.key}
              className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
            >
              <span className="text-sm text-gray-600">{t(`risk.factor.${factor.key}`)}</span>
              <span
                className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${getRiskLevelColor(factor.severity)}`}
              >
                {t(`risk.severity.${factor.severity}`)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 数据验证状态 - 简洁行内展示 */}
      <div className="border-t border-gray-200 pt-4">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="w-4 h-4 text-gray-700" />
          <h3 className="text-sm font-medium text-gray-900">{t('risk.verification')}</h3>
        </div>

        {isVerificationLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : (
          <div className="space-y-0">
            {(verificationData ?? []).map(
              (source: { sourceId: string; status: string; timestamp: number }, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        source.status === 'verified'
                          ? 'bg-emerald-500'
                          : source.status === 'pending'
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                      }`}
                    />
                    <span className="text-sm text-gray-700">{source.sourceId}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">
                      {new Date(source.timestamp).toLocaleDateString()}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${
                        source.status === 'verified'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : source.status === 'pending'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                      }`}
                    >
                      {t(`risk.status.${source.status}`)}
                    </span>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* 实时风险评估仪表板 */}
      <div className="border-t border-gray-200 pt-8">
        <RiskAssessmentDashboard symbol="DIA" refreshInterval={60000} />
      </div>
    </div>
  );
}

export default DIARiskView;
