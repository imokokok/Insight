'use client';

import { useTranslations } from '@/i18n';
import type { ExportOptions } from '@/lib/utils/chartExport';

export interface SupportedFormat {
  format: ExportOptions['format'];
  label: string;
  descriptionKey: string;
  requiresChartRef: boolean;
}

export interface FormatMenuProps {
  supportedFormats: SupportedFormat[];
  hasChartRef: boolean;
  hasMultipleCharts: boolean;
  hasAvailableCharts: boolean;
  onFormatSelect: (format: ExportOptions['format']) => void;
  onBatchExport: () => void;
  onOpenSettings: () => void;
  onOpenPreview: () => void;
  compact?: boolean;
}

export function FormatMenu({
  supportedFormats,
  hasChartRef,
  hasMultipleCharts,
  hasAvailableCharts,
  onFormatSelect,
  onBatchExport,
  onOpenSettings,
  onOpenPreview,
  compact = false,
}: FormatMenuProps) {
  const t = useTranslations();

  if (compact) {
    return (
      <div className="absolute top-full mt-2 right-0 w-56 bg-white border border-gray-200 py-1 z-50">
        {supportedFormats.map((format) => {
          const isDisabled = format.requiresChartRef && !hasChartRef && !hasMultipleCharts;

          return (
            <button
              key={format.format}
              onClick={() => onFormatSelect(format.format)}
              disabled={isDisabled}
              className={`w-full px-4 py-2.5 text-left transition-colors ${
                isDisabled ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{format.label}</span>
                <span className="text-xs text-gray-400">{format.format.toUpperCase()}</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{t(format.descriptionKey)}</p>
            </button>
          );
        })}
        {hasAvailableCharts && (
          <>
            <div className="border-t border-gray-100 my-1" />
            <button
              onClick={onBatchExport}
              className="w-full px-4 py-2.5 text-left transition-colors text-gray-700 hover:bg-gray-50"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{t('priceChart.export.batchExport')}</span>
                <span className="text-xs text-gray-400">ZIP</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {t('priceChart.export.batchExportDescription')}
              </p>
            </button>
          </>
        )}
        <div className="border-t border-gray-100 my-1" />
        <button
          onClick={onOpenSettings}
          className="w-full px-4 py-2.5 text-left transition-colors text-gray-700 hover:bg-gray-50"
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">{t('priceChart.export.settings')}</span>
            <SettingsIcon />
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {t('priceChart.export.settingsDescription')}
          </p>
        </button>
        <button
          onClick={onOpenPreview}
          className="w-full px-4 py-2.5 text-left transition-colors text-gray-700 hover:bg-gray-50"
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">{t('priceChart.export.preview')}</span>
            <PreviewIcon />
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {t('priceChart.export.previewDescription')}
          </p>
        </button>
      </div>
    );
  }

  return (
    <div className="absolute top-full mt-2 right-0 w-80 bg-white border border-gray-200 py-2 z-50">
      <div className="px-4 py-2 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">{t('priceChart.export.title')}</h3>
      </div>
      {supportedFormats.map((format) => {
        const isDisabled = format.requiresChartRef && !hasChartRef && !hasMultipleCharts;

        return (
          <button
            key={format.format}
            onClick={() => onFormatSelect(format.format)}
            disabled={isDisabled}
            className={`w-full px-4 py-3 text-left transition-colors ${
              isDisabled
                ? 'text-gray-400 cursor-not-allowed bg-gray-50'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-100 flex items-center justify-center">
                  <span className="text-xs font-bold text-gray-600">
                    {format.format.toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="font-medium text-gray-900">{format.label}</span>
                  <p className="text-xs text-gray-500 mt-0.5">{t(format.descriptionKey)}</p>
                </div>
              </div>
              {!isDisabled && <ArrowRightIcon />}
            </div>
          </button>
        );
      })}

      {hasAvailableCharts && (
        <>
          <div className="border-t border-gray-100 my-1" />
          <button
            onClick={onBatchExport}
            className="w-full px-4 py-3 text-left transition-colors text-gray-700 hover:bg-gray-50"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 flex items-center justify-center">
                  <BatchIcon />
                </div>
                <div>
                  <span className="font-medium text-gray-900">
                    {t('priceChart.export.batchExport')}
                  </span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {t('priceChart.export.batchExportDescription')}
                  </p>
                </div>
              </div>
              <ArrowRightIcon />
            </div>
          </button>
        </>
      )}

      <div className="border-t border-gray-100 my-1" />

      <button
        onClick={onOpenSettings}
        className="w-full px-4 py-3 text-left transition-colors text-gray-700 hover:bg-gray-50"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 flex items-center justify-center">
              <SettingsIcon className="text-primary-600" />
            </div>
            <div>
              <span className="font-medium text-gray-900">{t('priceChart.export.settings')}</span>
              <p className="text-xs text-gray-500 mt-0.5">
                {t('priceChart.export.settingsDescription')}
              </p>
            </div>
          </div>
          <ArrowRightIcon />
        </div>
      </button>

      <button
        onClick={onOpenPreview}
        className="w-full px-4 py-3 text-left transition-colors text-gray-700 hover:bg-gray-50"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-success-100 flex items-center justify-center">
              <PreviewIcon className="text-success-600" />
            </div>
            <div>
              <span className="font-medium text-gray-900">{t('priceChart.export.preview')}</span>
              <p className="text-xs text-gray-500 mt-0.5">
                {t('priceChart.export.previewDescription')}
              </p>
            </div>
          </div>
          <ArrowRightIcon />
        </div>
      </button>
    </div>
  );
}

function SettingsIcon({ className = 'text-gray-400' }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function PreviewIcon({ className = 'text-gray-400' }: { className?: string }) {
  return (
    <svg className={`w-4 h-4 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function BatchIcon() {
  return (
    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
      />
    </svg>
  );
}
