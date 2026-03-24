'use client';

import { useTranslations } from 'next-intl';

export function BandProtocolRiskView() {
  const t = useTranslations();

  const riskMetrics = [
    {
      category: t('bandProtocol.risk.networkSecurity'),
      score: 92,
      status: 'low',
      description: t('bandProtocol.risk.networkSecurityDesc'),
    },
    {
      category: t('bandProtocol.risk.dataReliability'),
      score: 95,
      status: 'low',
      description: t('bandProtocol.risk.dataReliabilityDesc'),
    },
    {
      category: t('bandProtocol.risk.validatorDiversity'),
      score: 78,
      status: 'medium',
      description: t('bandProtocol.risk.validatorDiversityDesc'),
    },
    {
      category: t('bandProtocol.risk.smartContractRisk'),
      score: 88,
      status: 'low',
      description: t('bandProtocol.risk.smartContractRiskDesc'),
    },
    {
      category: t('bandProtocol.risk.centralizationRisk'),
      score: 72,
      status: 'medium',
      description: t('bandProtocol.risk.centralizationRiskDesc'),
    },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 75) return 'text-blue-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  const getProgressColor = (score: number) => {
    if (score >= 90) return 'bg-emerald-500';
    if (score >= 75) return 'bg-blue-500';
    if (score >= 60) return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      low: 'bg-emerald-100 text-emerald-700',
      medium: 'bg-amber-100 text-amber-700',
      high: 'bg-red-100 text-red-700',
    };
    return styles[status] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {t('bandProtocol.risk.assessmentOverview')}
          </h3>
          <div className="space-y-4">
            {riskMetrics.map((metric) => (
              <div key={metric.category}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {metric.category}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded ${getStatusBadge(
                        metric.status
                      )}`}
                    >
                      {t(`bandProtocol.risk.${metric.status}Risk`)}
                    </span>
                  </div>
                  <span className={`text-lg font-bold ${getScoreColor(metric.score)}`}>
                    {metric.score}/100
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${getProgressColor(metric.score)}`}
                    style={{ width: `${metric.score}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{metric.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              {t('bandProtocol.risk.overallScore')}
            </h3>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-emerald-100 mb-3">
                <span className="text-3xl font-bold text-emerald-600">85</span>
              </div>
              <p className="text-sm text-gray-600">{t('bandProtocol.risk.outOf100')}</p>
              <p className="text-sm font-medium text-emerald-600 mt-1">
                {t('bandProtocol.risk.lowRisk')}
              </p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              {t('bandProtocol.risk.lastAssessment')}
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('bandProtocol.risk.assessmentDate')}</span>
                <span className="font-medium">2024-03-15</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('bandProtocol.risk.nextAssessment')}</span>
                <span className="font-medium">2024-04-15</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">{t('bandProtocol.risk.assessor')}</span>
                <span className="font-medium">Insight Team</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {t('bandProtocol.risk.securityFeatures')}
          </h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-emerald-500 mt-0.5">✓</span>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {t('bandProtocol.risk.tendermintConsensus')}
                </p>
                <p className="text-xs text-gray-500">
                  {t('bandProtocol.risk.tendermintConsensusDesc')}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-emerald-500 mt-0.5">✓</span>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {t('bandProtocol.risk.slashingMechanism')}
                </p>
                <p className="text-xs text-gray-500">
                  {t('bandProtocol.risk.slashingMechanismDesc')}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-emerald-500 mt-0.5">✓</span>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {t('bandProtocol.risk.multiSig')}
                </p>
                <p className="text-xs text-gray-500">{t('bandProtocol.risk.multiSigDesc')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-emerald-500 mt-0.5">✓</span>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {t('bandProtocol.risk.audits')}
                </p>
                <p className="text-xs text-gray-500">{t('bandProtocol.risk.auditsDesc')}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            {t('bandProtocol.risk.riskMitigation')}
          </h3>
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-gray-900">
                {t('bandProtocol.risk.diversification')}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {t('bandProtocol.risk.diversificationDesc')}
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <p className="text-sm font-medium text-gray-900">
                {t('bandProtocol.risk.monitoring')}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {t('bandProtocol.risk.monitoringDesc')}
              </p>
            </div>
            <div className="p-3 bg-amber-50 rounded-lg">
              <p className="text-sm font-medium text-gray-900">
                {t('bandProtocol.risk.updates')}
              </p>
              <p className="text-xs text-gray-600 mt-1">{t('bandProtocol.risk.updatesDesc')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
