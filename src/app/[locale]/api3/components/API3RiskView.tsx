'use client';

import { useTranslations } from 'next-intl';
import { API3RiskAssessmentPanel } from '@/components/oracle/panels/API3RiskAssessmentPanel';
import { API3RiskViewProps } from '../types';

export function API3RiskView({
  staking,
  airnodeStats,
  dapiCoverage,
  isLoading,
}: API3RiskViewProps) {
  const t = useTranslations();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">{t('api3.risk.overallScore')}</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">A+</p>
          <p className="text-xs text-gray-500 mt-1">Low Risk</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">{t('api3.risk.coverageRatio')}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {staking?.coveragePool?.coverageRatio ?? 65}%
          </p>
          <p className="text-xs text-emerald-600 mt-1">Healthy</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">{t('api3.risk.decentralization')}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {airnodeStats?.activeAirnodes ?? 50}+
          </p>
          <p className="text-xs text-emerald-600 mt-1">Well Distributed</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">{t('api3.risk.dataReliability')}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {airnodeStats?.nodeUptime ?? 99.8}%
          </p>
          <p className="text-xs text-emerald-600 mt-1">High</p>
        </div>
      </div>

      <API3RiskAssessmentPanel
        staking={staking || undefined}
        airnodeStats={airnodeStats || undefined}
        dapiCoverage={dapiCoverage || undefined}
      />
    </div>
  );
}
