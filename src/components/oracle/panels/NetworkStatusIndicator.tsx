import { useTranslations } from 'next-intl';
import { NetworkStatus } from './types';

const getStatusConfig = (t: (key: string) => string) => ({
  online: {
    color: 'green',
    bgColor: 'bg-green-500',
    textColor: 'text-green-600',
    borderColor: 'border-green-200',
    bgGradient: 'from-green-50 to-green-100',
    label: t('networkHealth.status.online'),
    pulseColor: 'bg-green-400',
  },
  warning: {
    color: 'yellow',
    bgColor: 'bg-yellow-500',
    textColor: 'text-yellow-600',
    borderColor: 'border-yellow-200',
    bgGradient: 'from-yellow-50 to-yellow-100',
    label: t('networkHealth.status.warning'),
    pulseColor: 'bg-yellow-400',
  },
  offline: {
    color: 'red',
    bgColor: 'bg-red-500',
    textColor: 'text-red-600',
    borderColor: 'border-red-200',
    bgGradient: 'from-red-50 to-red-100',
    label: t('networkHealth.status.offline'),
    pulseColor: 'bg-red-400',
  },
});

export function NetworkStatusIndicator({ status }: { status: NetworkStatus }) {
  const t = useTranslations();
  const statusConfig = getStatusConfig(t);
  const config = statusConfig[status];

  return (
    <div className={`bg-white border ${config.borderColor} p-5`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">
            {t('networkHealth.networkStatus')}
          </p>
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className={`relative flex h-4 w-4`}>
                <span
                  className={`animate-ping absolute inline-flex h-full w-full ${config.pulseColor} opacity-75`}
                ></span>
                <span className={`relative inline-flex h-4 w-4 ${config.bgColor}`}></span>
              </span>
            </div>
            <span className={`text-2xl font-bold ${config.textColor}`}>{config.label}</span>
          </div>
          <p className="text-gray-400 text-xs mt-2">
            {t('networkHealth.monitoring')} • {t('networkHealth.lastCheck')}: {t('time.justNow')}
          </p>
        </div>
        <div className={`p-4 ${config.bgColor} bg-opacity-20`}>
          <svg
            className={`w-8 h-8 ${config.textColor}`}
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
        </div>
      </div>
    </div>
  );
}
