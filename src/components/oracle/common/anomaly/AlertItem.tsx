'use client';

import { useTranslations } from 'next-intl';
import { AnomalyEvent } from './types';
import {
  PROVIDER_NAMES,
  SEVERITY_COLORS,
  ANOMALY_TYPE_ICONS,
  formatTime,
  formatDuration,
} from './anomalyUtils';

interface AlertItemProps {
  anomaly: AnomalyEvent;
  locale: string;
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
  onClear: (id: string) => void;
}

export function AlertItem({
  anomaly,
  locale,
  onAcknowledge,
  onResolve,
  onClear,
}: AlertItemProps) {
  const t = useTranslations();

  return (
    <div
      className={`border  p-4 ${
        SEVERITY_COLORS[anomaly.severity].border
      } ${anomaly.acknowledged ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded ${SEVERITY_COLORS[anomaly.severity].bg}`}>
            <div className={SEVERITY_COLORS[anomaly.severity].text}>
              {ANOMALY_TYPE_ICONS[anomaly.type]}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded ${
                  SEVERITY_COLORS[anomaly.severity].bg
                } ${SEVERITY_COLORS[anomaly.severity].text}`}
              >
                {t(`anomalyAlert.severity_${anomaly.severity}`)}
              </span>
              <span className="text-sm font-medium text-gray-900">
                {t(`anomalyAlert.type_${anomaly.type}`)}
              </span>
            </div>
            <p className="text-sm text-gray-700 mb-1">{anomaly.message}</p>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>
                {PROVIDER_NAMES[anomaly.provider]} • {anomaly.symbol}
              </span>
              <span>{formatTime(anomaly.timestamp, locale)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!anomaly.acknowledged && (
            <button
              onClick={() => onAcknowledge(anomaly.id)}
              className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              {t('anomalyAlert.acknowledge')}
            </button>
          )}
          {!anomaly.resolved && (
            <button
              onClick={() => onResolve(anomaly.id)}
              className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
            >
              {t('anomalyAlert.resolve')}
            </button>
          )}
          <button
            onClick={() => onClear(anomaly.id)}
            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            {t('anomalyAlert.clear')}
          </button>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div>
            <span className="text-gray-500">{t('anomalyAlert.currentValue')}:</span>
            <span className="ml-1 font-medium">
              ${anomaly.details.currentValue.toFixed(4)}
            </span>
          </div>
          {anomaly.details.expectedValue !== undefined && (
            <div>
              <span className="text-gray-500">{t('anomalyAlert.expectedValue')}:</span>
              <span className="ml-1 font-medium">
                ${anomaly.details.expectedValue.toFixed(4)}
              </span>
            </div>
          )}
          {anomaly.details.deviationPercent !== undefined && (
            <div>
              <span className="text-gray-500">{t('anomalyAlert.deviation')}:</span>
              <span className="ml-1 font-medium">
                {anomaly.details.deviationPercent.toFixed(2)}%
              </span>
            </div>
          )}
          {anomaly.details.delay !== undefined && (
            <div>
              <span className="text-gray-500">{t('anomalyAlert.delay')}:</span>
              <span className="ml-1 font-medium">
                {formatDuration(anomaly.details.delay, t)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
