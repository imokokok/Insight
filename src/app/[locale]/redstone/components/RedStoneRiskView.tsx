'use client';

import { useTranslations } from 'next-intl';
import { RedStoneRiskViewProps } from '../types';
import { RedStoneRiskAssessmentPanel } from '@/components/oracle/panels/RedStoneRiskAssessmentPanel';

export function RedStoneRiskView({ isLoading }: RedStoneRiskViewProps) {
  const t = useTranslations();

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          {t('redstone.risk.title')}
        </h3>
        <RedStoneRiskAssessmentPanel />
      </div>
    </div>
  );
}
