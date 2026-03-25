import { useTranslations } from '@/i18n';
import { SolanaNetworkMetrics } from './types';

export function SolanaNetworkStatusCard({ metrics }: { metrics: SolanaNetworkMetrics }) {
  const t = useTranslations();

  const statusConfig = {
    active: {
      color: 'text-success-600',
      bgColor: 'bg-success-100',
      label: t('pythNetwork.solana.status.active'),
    },
    inactive: {
      color: 'text-danger-600',
      bgColor: 'bg-danger-100',
      label: t('pythNetwork.solana.status.inactive'),
    },
    degraded: {
      color: 'text-warning-600',
      bgColor: 'bg-warning-100',
      label: t('pythNetwork.solana.status.degraded'),
    },
  };

  const status = statusConfig[metrics.pythProgramStatus];

  return (
    <div className="bg-purple-50 border border-purple-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-gray-900 text-sm font-semibold">{t('pythNetwork.solana.title')}</p>
          <p className="text-gray-500 text-xs mt-0.5">{t('pythNetwork.solana.subtitle')}</p>
        </div>
        <div className="p-2 bg-purple-100 border border-purple-200">
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
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between py-2 border-b border-purple-200">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-purple-500"
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
            <span className="text-sm text-gray-600">
              {t('pythNetwork.solana.pythProgramStatus')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-1 text-xs font-medium border ${status.bgColor} ${status.color}`}
            >
              {status.label}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-purple-200">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-purple-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm text-gray-600">
              {t('pythNetwork.solana.blockConfirmationTime')}
            </span>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{metrics.blockConfirmationTime}ms</p>
            <p className="text-xs text-gray-400">{t('pythNetwork.solana.avgConfirmation')}</p>
          </div>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-purple-200">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-purple-500"
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
            <span className="text-sm text-gray-600">{t('pythNetwork.solana.slotHeight')}</span>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">
              {metrics.slotHeight.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400">{t('pythNetwork.solana.currentSlot')}</p>
          </div>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-purple-200">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-purple-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <span className="text-sm text-gray-600">{t('pythNetwork.solana.tps')}</span>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{metrics.tps.toLocaleString()}</p>
            <p className="text-xs text-gray-400">{t('pythNetwork.solana.transactionsPerSecond')}</p>
          </div>
        </div>

        <div className="flex items-center justify-between py-2 border-b border-purple-200">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-purple-500"
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
            <span className="text-sm text-gray-600">{t('pythNetwork.solana.totalStake')}</span>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">
              {(metrics.totalStake / 1000000).toFixed(2)}M SOL
            </p>
            <p className="text-xs text-gray-400">
              {t('pythNetwork.solana.validators')}: {metrics.validatorCount}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-purple-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
              />
            </svg>
            <span className="text-sm text-gray-600">
              {t('pythNetwork.solana.pythProgramAccount')}
            </span>
          </div>
          <div className="text-right">
            <p className="text-xs font-mono text-purple-700 bg-purple-100 px-2 py-1 border border-purple-200">
              {metrics.pythProgramAccount.slice(0, 8)}...{metrics.pythProgramAccount.slice(-8)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
