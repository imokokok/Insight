'use client';

import { useTranslations } from 'next-intl';
import { useDIANetworkStats, useDIADataSourceVerification } from '@/hooks/useDIAData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
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

export function DIARiskView() {
  const t = useTranslations('dia');
  const { networkStats, isLoading: isStatsLoading } = useDIANetworkStats();
  const { dataSourceVerification: verificationData, isLoading: isVerificationLoading } = useDIADataSourceVerification();

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
        return <CheckCircle className="w-5 h-5 text-emerald-600" />;
      case 'medium':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case 'high':
        return <AlertCircle className="w-5 h-5 text-rose-600" />;
      default:
        return <Shield className="w-5 h-5 text-gray-600" />;
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
      {/* 风险指标概览 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 网络正常运行时间 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('risk.uptime')}</p>
                {isStatsLoading ? (
                  <Skeleton className="h-8 w-20 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-gray-900">
                    {networkStats?.uptime?.toFixed(2) ?? '99.99'}%
                  </p>
                )}
              </div>
              <div className="p-3 bg-indigo-50 rounded-lg">
                <Activity className="w-5 h-5 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 数据质量 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('risk.dataQuality')}</p>
                {isStatsLoading ? (
                  <Skeleton className="h-8 w-20 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-gray-900">
                    {networkStats?.dataQuality?.toFixed(0) ?? '98'}%
                  </p>
                )}
              </div>
              <div className="p-3 bg-indigo-50 rounded-lg">
                <Database className="w-5 h-5 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 预言机多样性 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('risk.oracleDiversity')}</p>
                {isStatsLoading ? (
                  <Skeleton className="h-8 w-20 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-gray-900">
                    {networkStats?.oracleDiversity ?? '12'}
                  </p>
                )}
              </div>
              <div className="p-3 bg-indigo-50 rounded-lg">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 平均置信度 */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('risk.avgConfidence')}</p>
                {isStatsLoading ? (
                  <Skeleton className="h-8 w-20 mt-1" />
                ) : (
                  <p className="text-2xl font-bold text-gray-900">
                    {networkStats?.avgConfidence?.toFixed(0) ?? '95'}%
                  </p>
                )}
              </div>
              <div className="p-3 bg-indigo-50 rounded-lg">
                <TrendingUp className="w-5 h-5 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 风险评估面板 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            {t('risk.assessment')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 整体风险等级 */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-600">{t('risk.overallLevel')}</span>
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 text-sm font-medium rounded-full border ${getRiskLevelColor(
                networkStats?.riskLevel ?? 'low'
              )}`}
            >
              {getRiskLevelIcon(networkStats?.riskLevel ?? 'low')}
              {t(`risk.level.${networkStats?.riskLevel ?? 'low'}`)}
            </span>
          </div>

          {/* 风险因素列表 */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-gray-700">{t('risk.factors')}</h4>
            {riskFactors.map((factor) => (
              <div
                key={factor.key}
                className="flex items-center justify-between p-3 border border-gray-100 rounded-md"
              >
                <span className="text-sm text-gray-600">
                  {t(`risk.factor.${factor.key}`)}
                </span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${getRiskLevelColor(factor.severity)}`}
                >
                  {t(`risk.severity.${factor.severity}`)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 数据验证状态 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-indigo-600" />
            {t('risk.verification')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isVerificationLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : (
            <div className="space-y-3">
              {(verificationData ?? []).map((source: { sourceId: string; status: string; timestamp: number }, index: number) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border border-gray-100 rounded-md"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        source.status === 'verified'
                          ? 'bg-emerald-500'
                          : source.status === 'pending'
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                      }`}
                    />
                    <span className="text-sm font-medium text-gray-700">
                      {source.sourceId}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-gray-400">
                      {t('risk.lastVerified')}: {new Date(source.timestamp).toLocaleDateString()}
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default DIARiskView;
