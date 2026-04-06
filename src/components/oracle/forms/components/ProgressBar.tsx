'use client';

import { useTranslations } from '@/i18n';

export interface ProgressBarProps {
  progress: number;
  status: 'idle' | 'preparing' | 'exporting' | 'completed' | 'error';
  messageKey: string;
  messageParams?: Record<string, string | number>;
  getProgressColor: () => string;
  compact?: boolean;
}

export function ProgressBar({
  progress,
  status,
  messageKey,
  messageParams,
  getProgressColor,
  compact = false,
}: ProgressBarProps) {
  const t = useTranslations();

  if (status === 'idle') return null;

  if (compact) {
    return (
      <div className="absolute top-full mt-2 right-0 w-48 bg-white border border-gray-200 p-2 z-50">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex-1 h-1.5 bg-gray-200 overflow-hidden">
            <div
              className={`h-full ${getProgressColor()} transition-all duration-300`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">{progress}%</span>
        </div>
        <p className="text-xs text-gray-600 truncate">{t(messageKey, messageParams)}</p>
      </div>
    );
  }

  return (
    <div className="absolute top-full mt-2 right-0 w-64 bg-white border border-gray-200 p-3 z-50">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700">
          {status === 'completed'
            ? t('priceChart.export.exportComplete')
            : t('priceChart.export.exporting')}
        </span>
        <span className="text-sm text-gray-500">{progress}%</span>
      </div>
      <div className="h-2 bg-gray-200 overflow-hidden">
        <div
          className={`h-full ${getProgressColor()} transition-all duration-300`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-gray-600 mt-2">{t(messageKey, messageParams)}</p>
    </div>
  );
}
