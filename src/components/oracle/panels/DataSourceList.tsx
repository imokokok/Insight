'use client';

import { useTranslations } from 'next-intl';
import { DataSourceReliability, getStatusConfig, getTimeAgo } from './qualityUtils';

interface DataSourceListProps {
  sources: DataSourceReliability[];
}

export function DataSourceList({ sources }: DataSourceListProps) {
  const t = useTranslations();
  const STATUS_CONFIG = getStatusConfig(t);

  const avgAvailability = sources.reduce((sum, s) => sum + s.availability, 0) / sources.length;
  const avgUpdateFrequency =
    sources.reduce((sum, s) => sum + s.updateFrequency, 0) / sources.length;
  const mostRecentUpdate = sources.reduce(
    (latest, s) => (s.lastSuccessfulUpdate > latest ? s.lastSuccessfulUpdate : latest),
    new Date(0)
  );

  return (
    <div className="bg-white border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">
            {t('dataQuality.dataSourceReliability')}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {t('dataQuality.availabilityAndUpdateStatus')}
          </p>
        </div>
        <div className="p-2 bg-green-50">
          <svg
            className="w-5 h-5 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-gray-50 p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">{t('dataQuality.avgAvailability')}</p>
          <p className="text-lg font-bold text-green-600">{avgAvailability.toFixed(2)}%</p>
        </div>
        <div className="bg-gray-50 p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">{t('dataQuality.avgUpdateFrequency')}</p>
          <p className="text-lg font-bold text-gray-900">
            {avgUpdateFrequency.toFixed(0)}
            <span className="text-sm text-gray-500 ml-1">{t('dataQuality.secondsSuffix')}</span>
          </p>
        </div>
        <div className="bg-gray-50 p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">{t('dataQuality.recentUpdate')}</p>
          <p className="text-sm font-bold text-gray-900">{getTimeAgo(mostRecentUpdate, t)}</p>
        </div>
      </div>

      <div className="space-y-2">
        {sources.map((source) => {
          const statusConfig = STATUS_CONFIG[source.status];
          return (
            <div
              key={source.id}
              className="border border-gray-200 p-3 hover:border-gray-300 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900 text-sm">{source.name}</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-medium ${source.trend > 0 ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {source.trend > 0 ? '↑' : '↓'} {Math.abs(source.trend).toFixed(2)}%
                  </span>
                  <span
                    className={`px-2 py-0.5 text-xs font-medium ${statusConfig.lightBg} ${statusConfig.color}`}
                  >
                    {statusConfig.label}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 h-2 bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${statusConfig.bgColor}`}
                    style={{ width: `${source.availability}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-gray-900 w-14 text-right">
                  {source.availability.toFixed(1)}%
                </span>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  {t('dataQuality.updateFrequency')}: {source.updateFrequency}s
                </span>
                <span>
                  {t('dataQuality.lastUpdate')}: {getTimeAgo(source.lastSuccessfulUpdate, t)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
