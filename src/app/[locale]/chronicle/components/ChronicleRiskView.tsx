'use client';

import { useTranslations } from 'next-intl';
import { ChronicleRiskViewProps } from '../types';

export function ChronicleRiskView({
  scuttlebutt,
  isLoading,
}: ChronicleRiskViewProps) {
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
  const lastAuditTimestamp = scuttlebutt?.lastAuditTimestamp;

  const mitigationMeasures = [
    { name: 'chronicle.risk.mitigationMeasures.scuttlebuttVerification', effectiveness: 96 },
    { name: 'chronicle.risk.mitigationMeasures.validatorRotation', effectiveness: 92 },
    { name: 'chronicle.risk.mitigationMeasures.multiChainValidation', effectiveness: 89 },
    { name: 'chronicle.risk.mitigationMeasures.thresholdSignature', effectiveness: 94 },
    { name: 'chronicle.risk.mitigationMeasures.decentralizedGovernance', effectiveness: 87 },
    { name: 'chronicle.risk.mitigationMeasures.monitoring', effectiveness: 93 },
  ];

  const getRiskColor = (score: number) => {
    if (score >= 90) return 'bg-emerald-500 text-emerald-700';
    if (score >= 70) return 'bg-amber-500 text-amber-700';
    if (score >= 50) return 'bg-orange-500 text-orange-700';
    return 'bg-red-500 text-red-700';
  };

  const getRiskLabel = (score: number) => {
    if (score >= 90) return t('chronicle.risk.lowRisk');
    if (score >= 70) return t('chronicle.risk.mediumRisk');
    if (score >= 50) return t('chronicle.risk.highRisk');
    return t('chronicle.risk.criticalRisk');
  };

  return (
    <div className="space-y-4">
      {/* Overall Risk Overview */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{t('chronicle.risk.overviewTitle')}</h3>
            <p className="text-sm text-gray-500 mt-1">{t('chronicle.risk.overviewDescription')}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">{t('chronicle.risk.overallRiskScore')}</span>
              <span
                className={`px-3 py-1 text-sm font-medium border rounded ${
                  riskData.overallRiskScore >= 90
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : riskData.overallRiskScore >= 70
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-red-50 text-red-700 border-red-200'
                }`}
              >
                {getRiskLabel(riskData.overallRiskScore)}
              </span>
            </div>
            <div className="flex items-end justify-end gap-1 mt-2">
              <span
                className={`text-4xl font-bold ${
                  riskData.overallRiskScore >= 90
                    ? 'text-emerald-600'
                    : riskData.overallRiskScore >= 70
                      ? 'text-amber-600'
                      : 'text-red-600'
                }`}
              >
                {riskData.overallRiskScore}
              </span>
              <span className="text-lg text-gray-500 mb-1">/100</span>
            </div>
          </div>
        </div>

        <div className="w-full bg-gray-200 h-3 rounded-full">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${getRiskColor(riskData.overallRiskScore).split(' ')[0]}`}
            style={{ width: `${riskData.overallRiskScore}%` }}
          />
        </div>
      </div>

      {/* Four Dimension Score Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { title: t('chronicle.risk.dataQuality'), score: riskData.dataQualityScore, desc: t('chronicle.risk.dataQualityDesc') },
          { title: t('chronicle.risk.validatorConcentration'), score: riskData.validatorConcentration, desc: t('chronicle.risk.validatorConcentrationDesc') },
          { title: t('chronicle.risk.priceDeviation'), score: riskData.priceDeviation, desc: t('chronicle.risk.priceDeviationDesc') },
          { title: t('chronicle.risk.systemStability'), score: riskData.systemStability, desc: t('chronicle.risk.systemStabilityDesc') },
        ].map((item, index) => (
          <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-xs text-gray-500 mb-1">{item.title}</p>
            <p className="text-2xl font-bold text-gray-900">{item.score}</p>
            <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
            <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2">
              <div
                className={`h-1.5 rounded-full ${getRiskColor(item.score).split(' ')[0]}`}
                style={{ width: `${item.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Mitigation Measures */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('chronicle.risk.mitigationMeasures')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {mitigationMeasures.map((measure, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-700">{t(measure.name)}</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
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

      {/* Scuttlebutt Security Integration */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('chronicle.risk.scuttlebuttIntegration')}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className={`p-3 rounded-full ${securityLevel === 'high' ? 'bg-emerald-100' : 'bg-amber-100'}`}>
              <svg className={`w-6 h-6 ${securityLevel === 'high' ? 'text-emerald-600' : 'text-amber-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('chronicle.risk.securityLevel')}</p>
              <p className="text-xl font-bold text-gray-900 capitalize">{securityLevel}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className={`p-3 rounded-full ${verificationStatus === 'verified' ? 'bg-emerald-100' : 'bg-amber-100'}`}>
              <svg className={`w-6 h-6 ${verificationStatus === 'verified' ? 'text-emerald-600' : 'text-amber-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('chronicle.risk.verificationStatus')}</p>
              <p className="text-xl font-bold text-gray-900 capitalize">{verificationStatus}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
            <div className="p-3 bg-blue-100 rounded-full">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('chronicle.risk.lastAudit')}</p>
              <p className="text-xl font-bold text-gray-900">
                {lastAuditTimestamp
                  ? new Date(lastAuditTimestamp).toLocaleDateString()
                  : '7 days ago'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Score & Incident Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">{t('chronicle.risk.auditScore')}</p>
          <p className="text-2xl font-bold text-gray-900">{auditScore}</p>
          <p className="text-xs text-gray-500 mt-1">{t('chronicle.risk.auditScoreDesc')}</p>
          <div className="w-full bg-gray-200 h-1.5 rounded-full mt-2">
            <div
              className="h-1.5 rounded-full bg-emerald-500"
              style={{ width: `${auditScore}%` }}
            />
          </div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('chronicle.risk.incidentSummary')}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 bg-emerald-100 rounded-full">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('chronicle.risk.incidents30d')}</p>
                <p className="text-xl font-bold text-gray-900">{riskData.incidentCount30d}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
              <div className="p-2 bg-blue-100 rounded-full">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-500">{t('chronicle.risk.lastIncident')}</p>
                <p className="text-lg font-bold text-gray-900">{riskData.lastIncident}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Factors */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">{t('chronicle.risk.riskFactors')}</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <svg className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-emerald-800">
                {t('chronicle.risk.factor1Title')}
              </p>
              <p className="text-xs text-emerald-600 mt-1">{t('chronicle.risk.factor1Desc')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
            <svg className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-emerald-800">
                {t('chronicle.risk.factor2Title')}
              </p>
              <p className="text-xs text-emerald-600 mt-1">{t('chronicle.risk.factor2Desc')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-amber-800">
                {t('chronicle.risk.factor3Title')}
              </p>
              <p className="text-xs text-amber-600 mt-1">{t('chronicle.risk.factor3Desc')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
