'use client';

import { Shield, CheckCircle, Clock, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';

import { useTranslations } from '@/i18n';

import { type ChronicleRiskViewProps } from '../types';

export function ChronicleRiskView({ scuttlebutt, isLoading }: ChronicleRiskViewProps) {
  const t = useTranslations();

  // Default mock data
  const riskData = {
    overallRiskScore: 88,
    dataQualityScore: 92,
    validatorConcentration: 85,
    priceDeviation: 90,
    systemStability: 87,
    lastIncident: '15 days ago',
    incidentCount30d: 0,
  };

  // Get audit score from scuttlebutt data if available
  const auditScore = scuttlebutt?.auditScore ?? 98;
  const securityLevel = scuttlebutt?.securityLevel ?? 'high';
  const verificationStatus = scuttlebutt?.verificationStatus ?? 'verified';

  const mitigationMeasures = [
    { name: t('chronicle.risk.mitigationMeasures.scuttlebuttVerification'), effectiveness: 96 },
    { name: t('chronicle.risk.mitigationMeasures.validatorRotation'), effectiveness: 92 },
    { name: t('chronicle.risk.mitigationMeasures.multiChainValidation'), effectiveness: 89 },
    { name: t('chronicle.risk.mitigationMeasures.thresholdSignature'), effectiveness: 94 },
    { name: t('chronicle.risk.mitigationMeasures.decentralizedGovernance'), effectiveness: 87 },
    { name: t('chronicle.risk.mitigationMeasures.monitoring'), effectiveness: 93 },
  ];

  const getRiskColor = (score: number) => {
    if (score >= 90) return 'bg-emerald-500';
    if (score >= 70) return 'bg-amber-500';
    if (score >= 50) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getRiskLabel = (score: number) => {
    if (score >= 90) return t('chronicle.risk.lowRisk');
    if (score >= 70) return t('chronicle.risk.mediumRisk');
    if (score >= 50) return t('chronicle.risk.highRisk');
    return t('chronicle.risk.criticalRisk');
  };

  const getRiskTextColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 70) return 'text-amber-600';
    if (score >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-8">
      {/* 整体风险评分 - 简洁进度条展示 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-medium text-gray-900">
              {t('chronicle.risk.overviewTitle')}
            </h3>
            <p className="text-sm text-gray-500 mt-1">{t('chronicle.risk.overviewDescription')}</p>
          </div>
          <div className="text-right">
            <span className={`text-3xl font-bold ${getRiskTextColor(riskData.overallRiskScore)}`}>
              {riskData.overallRiskScore}
            </span>
            <span className="text-lg text-gray-400 ml-1">/100</span>
            <p className={`text-sm font-medium ${getRiskTextColor(riskData.overallRiskScore)}`}>
              {getRiskLabel(riskData.overallRiskScore)}
            </p>
          </div>
        </div>
        <div className="w-full bg-gray-100 h-3 rounded-full">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${getRiskColor(riskData.overallRiskScore)}`}
            style={{ width: `${riskData.overallRiskScore}%` }}
          />
        </div>
      </div>

      {/* 分隔线 */}
      <div className="border-t border-gray-200" />

      {/* 四个维度分数 - 内联4列布局 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: t('chronicle.risk.dataQuality'), score: riskData.dataQualityScore },
          {
            title: t('chronicle.risk.validatorConcentration'),
            score: riskData.validatorConcentration,
          },
          { title: t('chronicle.risk.priceDeviation'), score: riskData.priceDeviation },
          { title: t('chronicle.risk.systemStability'), score: riskData.systemStability },
        ].map((item, index) => (
          <div key={index} className="py-2">
            <p className="text-sm text-gray-500 mb-1">{item.title}</p>
            <div className="flex items-baseline gap-2">
              <p className={`text-2xl font-semibold ${getRiskTextColor(item.score)}`}>
                {item.score}
              </p>
              <span className="text-sm text-gray-400">/100</span>
            </div>
            <div className="w-full bg-gray-100 h-1.5 rounded-full mt-2">
              <div
                className={`h-1.5 rounded-full ${getRiskColor(item.score)}`}
                style={{ width: `${item.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 分隔线 */}
      <div className="border-t border-gray-200" />

      {/* 风险缓解措施 - 紧凑列表布局 */}
      <div>
        <h3 className="text-base font-medium text-gray-900 mb-4">
          {t('chronicle.risk.mitigationMeasuresTitle')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {mitigationMeasures.map((measure, index) => (
            <div key={index} className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-700">{measure.name}</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${measure.effectiveness}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500">{measure.effectiveness}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 分隔线 */}
      <div className="border-t border-gray-200" />

      {/* Scuttlebutt 集成信息 - 简洁3列图标展示 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="flex items-center gap-4">
          <div
            className={`p-3 rounded-full ${securityLevel === 'high' ? 'bg-emerald-100' : 'bg-amber-100'}`}
          >
            <Shield
              className={`w-5 h-5 ${securityLevel === 'high' ? 'text-emerald-600' : 'text-amber-600'}`}
            />
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('chronicle.risk.securityLevel')}</p>
            <p className="text-lg font-semibold text-gray-900 capitalize">
              {securityLevel === 'high' ? t('chronicle.securityLevel.high') : securityLevel === 'medium' ? t('chronicle.securityLevel.medium') : t('chronicle.securityLevel.low')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div
            className={`p-3 rounded-full ${verificationStatus === 'verified' ? 'bg-emerald-100' : 'bg-amber-100'}`}
          >
            <CheckCircle
              className={`w-5 h-5 ${verificationStatus === 'verified' ? 'text-emerald-600' : 'text-amber-600'}`}
            />
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('chronicle.risk.verificationStatus')}</p>
            <p className="text-lg font-semibold text-gray-900 capitalize">
              {verificationStatus === 'verified' ? t('chronicle.verificationStatus.verified') : verificationStatus === 'pending' ? t('chronicle.verificationStatus.pending') : t('chronicle.verificationStatus.failed')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-full">
            <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('chronicle.risk.lastAudit')}</p>
            <p className="text-lg font-semibold text-gray-900">{t('chronicle.timeAgo.days', { count: 7 }) || '7 days ago'}</p>
          </div>
        </div>
      </div>

      {/* 分隔线 */}
      <div className="border-t border-gray-200" />

      {/* 事件摘要 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-100 rounded-full">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('chronicle.risk.incidents30d')}</p>
            <p className="text-2xl font-semibold text-gray-900">{riskData.incidentCount30d}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-100 rounded-full">
            <AlertCircle className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">{t('chronicle.risk.lastIncident')}</p>
            <p className="text-lg font-semibold text-gray-900">{riskData.lastIncident}</p>
          </div>
        </div>
      </div>

      {/* 分隔线 */}
      <div className="border-t border-gray-200" />

      {/* 风险因素列表 - 图标+描述行布局 */}
      <div>
        <h3 className="text-base font-medium text-gray-900 mb-4">
          {t('chronicle.risk.riskFactors')}
        </h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3 py-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">{t('chronicle.risk.factor1Title')}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t('chronicle.risk.factor1Desc')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 py-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">{t('chronicle.risk.factor2Title')}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t('chronicle.risk.factor2Desc')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 py-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">{t('chronicle.risk.factor3Title')}</p>
              <p className="text-xs text-gray-500 mt-0.5">{t('chronicle.risk.factor3Desc')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
