'use client';

import { DashboardCard } from './DashboardCard';
import { useI18n } from '@/lib/i18n/provider';

interface StakingData {
  totalStaked: number;
  stakingApr: number;
  stakerCount: number;
}

interface StakingMetricsPanelProps {
  data: StakingData;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(0)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString();
}

export function StakingMetricsPanel({ data }: StakingMetricsPanelProps) {
  const { t } = useI18n();

  return (
    <DashboardCard title={t('stakingMetrics.title')}>
      <div className="space-y-4">
        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <span className="text-sm text-gray-600">{t('stakingMetrics.totalStaked')}</span>
          <span className="text-lg font-semibold text-gray-900">
            {formatNumber(data.totalStaked)} API3
          </span>
        </div>

        <div className="flex items-center justify-between py-3 border-b border-gray-100 bg-green-50 -mx-5 px-5">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{t('stakingMetrics.stakingApr')}</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
              {t('stakingMetrics.hot')}
            </span>
          </div>
          <span className="text-2xl font-bold text-green-600">{data.stakingApr}%</span>
        </div>

        <div className="flex items-center justify-between py-3 border-b border-gray-100">
          <span className="text-sm text-gray-600">{t('stakingMetrics.stakerCount')}</span>
          <span className="text-lg font-semibold text-gray-900">
            {data.stakerCount.toLocaleString()}
          </span>
        </div>

        <div className="pt-2">
          <button className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md">
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
