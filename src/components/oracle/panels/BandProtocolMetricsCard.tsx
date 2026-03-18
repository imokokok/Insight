import { useTranslations } from 'next-intl';
import { formatCompactNumber } from '@/lib/utils/format';
import { BandProtocolMetrics } from './types';

export function BandProtocolMetricsCard({ metrics }: { metrics: BandProtocolMetrics }) {
  const t = useTranslations();
  const tokenSymbol = metrics.tokenSymbol || 'BAND';

  return (
    <div className="bg-white border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-gray-900 text-sm font-semibold">
            {t('networkHealth.bandProtocol.title')}
          </p>
          <p className="text-gray-500 text-xs mt-0.5">{t('networkHealth.bandProtocol.subtitle')}</p>
        </div>
        <div className="p-2 bg-purple-50 border border-purple-100">
          <svg
            className="w-5 h-5 text-purple-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm text-gray-500">
              {t('networkHealth.bandProtocol.activeValidators')}
            </span>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">
              {metrics.activeValidators} / {metrics.totalValidators}
            </p>
            <p className="text-xs text-gray-400">
              {((metrics.activeValidators / metrics.totalValidators) * 100).toFixed(1)}%{' '}
              {t('networkHealth.bandProtocol.activePercent')}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm text-gray-500">
              {t('networkHealth.bandProtocol.stakedTokens')}
            </span>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">
              {formatCompactNumber(metrics.stakedAmount)} {tokenSymbol}
            </p>
            <p className="text-xs text-gray-400">
              {t('networkHealth.bandProtocol.stakingRate')} {metrics.stakingRate.toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <span className="text-sm text-gray-500">
              {t('networkHealth.bandProtocol.blockHeight')}
            </span>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">
              {metrics.blockHeight.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400">
              {t('networkHealth.bandProtocol.blockTime')} {metrics.blockTime.toFixed(1)}s
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
            <span className="text-sm text-gray-500">
              {t('networkHealth.bandProtocol.inflationRate')}
            </span>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{metrics.inflationRate.toFixed(2)}%</p>
            <p className="text-xs text-gray-400">
              {t('networkHealth.bandProtocol.annualInflation')}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <span className="text-sm text-gray-500">
              {t('networkHealth.bandProtocol.communityPoolBalance')}
            </span>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">
              {formatCompactNumber(metrics.communityPoolBalance)} {tokenSymbol}
            </p>
            <p className="text-xs text-gray-400">{t('networkHealth.bandProtocol.communityPool')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
