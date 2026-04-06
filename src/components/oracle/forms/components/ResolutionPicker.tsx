'use client';

import { useTranslations } from '@/i18n';
import { type Resolution, RESOLUTION_CONFIG } from '@/lib/utils/chartExport';

export interface ResolutionPickerProps {
  selectedResolution: Resolution;
  onSelect: (resolution: Resolution) => void;
  compact?: boolean;
}

export function ResolutionPicker({
  selectedResolution,
  onSelect,
  compact = false,
}: ResolutionPickerProps) {
  const t = useTranslations();

  if (compact) {
    return (
      <div className="absolute top-full mt-2 right-0 w-48 bg-white border border-gray-200 py-2 z-50">
        <div className="px-3 py-1.5 border-b border-gray-100">
          <span className="text-xs font-medium text-gray-700">
            {t('priceChart.export.selectResolution')}
          </span>
        </div>
        {(Object.keys(RESOLUTION_CONFIG) as Resolution[]).map((res) => (
          <button
            key={res}
            onClick={() => onSelect(res)}
            className={`w-full px-3 py-2 text-left text-sm transition-colors ${
              selectedResolution === res
                ? 'bg-primary-50 text-primary-600'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            {t(RESOLUTION_CONFIG[res].labelKey)}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="absolute top-full mt-2 right-0 w-64 bg-white border border-gray-200 py-2 z-50">
      <div className="px-4 py-2 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">
          {t('priceChart.export.selectResolution')}
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">{t('priceChart.export.settingsDescription')}</p>
      </div>
      <div className="py-1">
        {(Object.keys(RESOLUTION_CONFIG) as Resolution[]).map((res) => (
          <button
            key={res}
            onClick={() => onSelect(res)}
            className={`w-full px-4 py-3 text-left transition-colors ${
              selectedResolution === res
                ? 'bg-primary-50 text-primary-600'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{t(RESOLUTION_CONFIG[res].labelKey)}</span>
              {selectedResolution === res && (
                <svg
                  className="w-4 h-4 text-primary-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
