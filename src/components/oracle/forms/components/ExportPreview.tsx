'use client';

import { useTranslations } from '@/i18n';
import { type ExportSettings, type ChartExportData } from '@/lib/utils/chartExport';

export interface ExportPreviewProps {
  settings: ExportSettings;
  generateFilename: () => string;
  getFilteredData: () => ChartExportData[];
  onClose: () => void;
}

export function ExportPreview({
  settings,
  generateFilename,
  getFilteredData,
  onClose,
}: ExportPreviewProps) {
  const t = useTranslations();

  return (
    <div className="absolute top-full mt-2 right-0 w-80 bg-white border border-gray-200 py-4 z-50">
      <div className="px-4 pb-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">{t('priceChart.export.preview')}</h3>
      </div>
      <div className="px-4 py-3 space-y-3">
        <div className="text-xs">
          <span className="text-gray-500">{t('priceChart.export.filename')}:</span>
          <span className="text-gray-900 ml-2">{generateFilename()}</span>
        </div>
        <div className="text-xs">
          <span className="text-gray-500">{t('priceChart.export.dataRange')}:</span>
          <span className="text-gray-900 ml-2">
            {settings.range === 'current'
              ? t('priceChart.export.currentView')
              : t('priceChart.export.allData')}
          </span>
        </div>
        <div className="text-xs">
          <span className="text-gray-500">{t('priceChart.export.recordCount')}:</span>
          <span className="text-gray-900 ml-2">{getFilteredData().length}</span>
        </div>
        {settings.dateRange && (
          <div className="text-xs">
            <span className="text-gray-500">{t('priceChart.export.dateRange')}:</span>
            <span className="text-gray-900 ml-2">
              {settings.dateRange.start.toLocaleDateString()} -{' '}
              {settings.dateRange.end.toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
      <div className="px-4 pt-3 border-t border-gray-100">
        <button
          onClick={onClose}
          className="w-full px-4 py-2 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          {t('priceChart.export.close')}
        </button>
      </div>
    </div>
  );
}
