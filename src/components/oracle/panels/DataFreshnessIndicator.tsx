import { useTranslations } from 'next-intl';

export function DataFreshnessIndicator({
  lastUpdated,
  latency,
}: {
  lastUpdated: Date;
  latency: number;
}) {
  const t = useTranslations();

  const getLatencyColor = (ms: number) => {
    if (ms < 100)
      return {
        color: 'text-green-600',
        bgColor: 'bg-green-500',
        label: t('networkHealth.dataFreshness.excellent'),
      };
    if (ms < 500)
      return {
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-500',
        label: t('networkHealth.dataFreshness.good'),
      };
    return {
      color: 'text-red-600',
      bgColor: 'bg-red-500',
      label: t('networkHealth.dataFreshness.slow'),
    };
  };

  const latencyStatus = getLatencyColor(latency);

  const getTimeAgo = () => {
    const seconds = Math.floor((new Date().getTime() - lastUpdated.getTime()) / 1000);
    if (seconds < 60) return `${seconds}${t('networkHealth.dataFreshness.secondsAgo')}`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}${t('networkHealth.dataFreshness.minutesAgo')}`;
    const hours = Math.floor(minutes / 60);
    return `${hours}${t('networkHealth.dataFreshness.hoursAgo')}`;
  };

  return (
    <div className="bg-white border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="min-w-0 flex-1">
          <p className="text-gray-900 text-sm font-semibold truncate">
            {t('networkHealth.dataFreshness.title')}
          </p>
          <p className="text-gray-500 text-xs mt-0.5 truncate">
            {t('networkHealth.dataFreshness.subtitle')}
          </p>
        </div>
        <div className="p-2 bg-gray-100 border border-gray-200 flex-shrink-0 ml-3">
          <svg
            className="w-5 h-5 text-gray-500"
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
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between py-2 border-b border-gray-100 gap-3">
          <div className="flex items-center gap-2 flex-shrink-0">
            <svg
              className="w-4 h-4 text-gray-400 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2"
              />
            </svg>
            <span className="text-sm text-gray-500 whitespace-nowrap">
              {t('networkHealth.dataFreshness.lastUpdated')}
            </span>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-medium text-gray-900">
              {lastUpdated.toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </p>
            <p className="text-xs text-gray-400">{getTimeAgo()}</p>
          </div>
        </div>

        <div className="flex items-center justify-between py-2 gap-3">
          <div className="flex items-center gap-2 flex-shrink-0">
            <svg
              className="w-4 h-4 text-gray-400 flex-shrink-0"
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
            <span className="text-sm text-gray-500 whitespace-nowrap">
              {t('networkHealth.dataFreshness.dataLatency')}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`relative flex h-2.5 w-2.5 flex-shrink-0`}>
              <span
                className={`animate-ping absolute inline-flex h-full w-full ${latencyStatus.bgColor} opacity-75`}
              ></span>
              <span className={`relative inline-flex h-2.5 w-2.5 ${latencyStatus.bgColor}`}></span>
            </span>
            <span className={`text-sm font-semibold ${latencyStatus.color} whitespace-nowrap`}>
              {latency}ms
            </span>
            <span
              className={`text-xs px-2 py-0.5 border border-gray-200 bg-gray-100 ${latencyStatus.color} whitespace-nowrap hidden sm:inline`}
            >
              {latencyStatus.label}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
