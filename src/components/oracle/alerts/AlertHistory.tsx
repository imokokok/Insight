'use client';

import { useTranslations } from '@/i18n';
import { DashboardCard } from '@/components/oracle/data-display/DashboardCard';
import { AnomalyEvent, AnomalyStats } from './types';
import { formatDuration } from './anomalyUtils';

interface AlertHistoryProps {
  anomalies: AnomalyEvent[];
  stats: AnomalyStats;
}

export function AlertHistory({ anomalies, stats }: AlertHistoryProps) {
  const t = useTranslations();

  return (
    <DashboardCard title={t('anomalyAlert.historyTitle')}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50  p-4">
            <div className="text-sm text-gray-600 mb-2">{t('anomalyAlert.last24Hours')}</div>
            <div className="text-3xl font-bold text-gray-900">
              {anomalies.filter((a) => Date.now() - a.timestamp < 24 * 60 * 60 * 1000).length}
            </div>
          </div>

          <div className="bg-gray-50  p-4">
            <div className="text-sm text-gray-600 mb-2">{t('anomalyAlert.last7Days')}</div>
            <div className="text-3xl font-bold text-gray-900">
              {anomalies.filter((a) => Date.now() - a.timestamp < 7 * 24 * 60 * 60 * 1000).length}
            </div>
          </div>

          <div className="bg-gray-50  p-4">
            <div className="text-sm text-gray-600 mb-2">{t('anomalyAlert.avgResolutionTime')}</div>
            <div className="text-3xl font-bold text-gray-900">
              {stats.avgResolutionTime > 0 ? formatDuration(stats.avgResolutionTime, t) : '--'}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            {t('anomalyAlert.typeDistribution')}
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{t('anomalyAlert.type_price_spike')}</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200  h-2">
                  <div
                    className="bg-primary-600 h-2 "
                    style={{
                      width: `${stats.totalAnomalies > 0 ? (stats.priceSpikeCount / stats.totalAnomalies) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900 w-12 text-right">
                  {stats.priceSpikeCount}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">
                {t('anomalyAlert.type_price_deviation')}
              </span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200  h-2">
                  <div
                    className="bg-purple-600 h-2 "
                    style={{
                      width: `${stats.totalAnomalies > 0 ? (stats.priceDeviationCount / stats.totalAnomalies) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900 w-12 text-right">
                  {stats.priceDeviationCount}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{t('anomalyAlert.type_data_delay')}</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200  h-2">
                  <div
                    className="bg-indigo-600 h-2 "
                    style={{
                      width: `${stats.totalAnomalies > 0 ? (stats.dataDelayCount / stats.totalAnomalies) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900 w-12 text-right">
                  {stats.dataDelayCount}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{t('anomalyAlert.type_price_drop')}</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200  h-2">
                  <div
                    className="bg-pink-600 h-2 "
                    style={{
                      width: `${stats.totalAnomalies > 0 ? (stats.priceDropCount / stats.totalAnomalies) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900 w-12 text-right">
                  {stats.priceDropCount}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            {t('anomalyAlert.severityDistribution')}
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{t('anomalyAlert.severity_high')}</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200  h-2">
                  <div
                    className="bg-danger-600 h-2 "
                    style={{
                      width: `${stats.totalAnomalies > 0 ? (stats.highSeverityCount / stats.totalAnomalies) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900 w-12 text-right">
                  {stats.highSeverityCount}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{t('anomalyAlert.severity_medium')}</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200  h-2">
                  <div
                    className="bg-warning-600 h-2 "
                    style={{
                      width: `${stats.totalAnomalies > 0 ? (stats.mediumSeverityCount / stats.totalAnomalies) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900 w-12 text-right">
                  {stats.mediumSeverityCount}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{t('anomalyAlert.severity_low')}</span>
              <div className="flex items-center gap-2">
                <div className="w-32 bg-gray-200  h-2">
                  <div
                    className="bg-warning-600 h-2 "
                    style={{
                      width: `${stats.totalAnomalies > 0 ? (stats.lowSeverityCount / stats.totalAnomalies) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900 w-12 text-right">
                  {stats.lowSeverityCount}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}
