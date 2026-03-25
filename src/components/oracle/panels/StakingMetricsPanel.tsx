'use client';

import { DashboardCard } from '../common/DashboardCard';
import { useTranslations } from '@/i18n';
import { formatNumber } from '@/lib/utils/format';

interface StakingData {
  totalStaked: number;
  stakingApr: number;
  stakerCount: number;
}

interface StakingMetricsPanelProps {
  data: StakingData;
}

export function StakingMetricsPanel({ data }: StakingMetricsPanelProps) {
  const t = useTranslations();

  return (
    <DashboardCard title={t('stakingMetrics.title')}>
      <div className="space-y-4">
        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <span className="text-sm text-gray-600">{t('stakingMetrics.totalStaked')}</span>
          <span className="text-lg font-semibold text-gray-900">
            {formatNumber(data.totalStaked, true)} API3
          </span>
        </div>

        <div className="flex items-center justify-between py-3 border-b border-gray-100 bg-success-50 -mx-5 px-5">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{t('stakingMetrics.stakingApr')}</span>
            <span className="inline-flex items-center px-2 py-0.5  text-xs font-medium bg-success-100 text-success-700">
              {t('stakingMetrics.hot')}
            </span>
          </div>
          <span className="text-2xl font-bold text-success-600">{data.stakingApr}%</span>
        </div>

        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <span className="text-sm text-gray-600">{t('stakingMetrics.stakerCount')}</span>
          <span className="text-lg font-semibold text-gray-900">
            {data.stakerCount.toLocaleString()}
          </span>
        </div>

        <div className="pt-2">
          <button className="w-full py-3 px-4 bg-gray-100 border border-gray-200 text-white font-medium  hover:from-blue-700 hover:to-indigo-700 transition-all duration-200  hover:">
            {t('stakingMetrics.stakeNow')}
          </button>
          <p className="text-xs text-gray-400 text-center mt-2">
            {t('stakingMetrics.stakeDescription')}
          </p>
        </div>
      </div>
    </DashboardCard>
  );
}
