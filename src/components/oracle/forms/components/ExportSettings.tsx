'use client';

import { useTranslations } from '@/i18n';
import { type ExportSettings, type ExportOptions, type Resolution } from '@/lib/utils/chartExport';

export interface ExportSettingsPanelProps {
  settings: ExportSettings;
  pendingFormat: ExportOptions['format'] | null;
  selectedResolution: Resolution;
  onSettingsChange: (settings: ExportSettings) => void;
  onExport: (format: ExportOptions['format'], resolution: Resolution) => void;
  onClose: () => void;
  generateFilename: () => string;
}

export function ExportSettingsPanel({
  settings,
  pendingFormat,
  selectedResolution,
  onSettingsChange,
  onExport,
  onClose,
  generateFilename,
}: ExportSettingsPanelProps) {
  const t = useTranslations();

  return (
    <div className="absolute top-full mt-2 right-0 w-96 bg-white border border-gray-200 py-4 z-50 max-h-[80vh] overflow-y-auto">
      <div className="px-4 pb-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">{t('priceChart.export.settings')}</h3>
        <p className="text-xs text-gray-500 mt-0.5">{t('priceChart.export.settingsDescription')}</p>
      </div>

      <div className="px-4 py-3 border-b border-gray-100">
        <label className="text-xs font-medium text-gray-700 mb-2 block">
          {t('priceChart.export.range')}
        </label>
        <div className="flex gap-2">
          <button
            onClick={() => onSettingsChange({ ...settings, range: 'current' })}
            className={`flex-1 px-3 py-2 text-xs border transition-colors ${
              settings.range === 'current'
                ? 'bg-primary-50 border-primary-200 text-primary-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t('priceChart.export.currentView')}
          </button>
          <button
            onClick={() => onSettingsChange({ ...settings, range: 'all' })}
            className={`flex-1 px-3 py-2 text-xs border transition-colors ${
              settings.range === 'all'
                ? 'bg-primary-50 border-primary-200 text-primary-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t('priceChart.export.allData')}
          </button>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-gray-100">
        <label className="text-xs font-medium text-gray-700 mb-2 block">
          {t('priceChart.export.dateRange')}
        </label>
        <div className="space-y-2">
          <input
            type="date"
            value={settings.dateRange?.start.toISOString().split('T')[0] || ''}
            onChange={(e) =>
              onSettingsChange({
                ...settings,
                dateRange: {
                  ...settings.dateRange!,
                  start: new Date(e.target.value),
                },
              })
            }
            className="w-full px-3 py-2 text-xs border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <input
            type="date"
            value={settings.dateRange?.end.toISOString().split('T')[0] || ''}
            onChange={(e) =>
              onSettingsChange({
                ...settings,
                dateRange: {
                  ...settings.dateRange!,
                  end: new Date(e.target.value),
                },
              })
            }
            className="w-full px-3 py-2 text-xs border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      <div className="px-4 py-3 border-b border-gray-100">
        <label className="text-xs font-medium text-gray-700 mb-2 block">
          {t('priceChart.export.filenameTemplate')}
        </label>
        <input
          type="text"
          value={settings.filenameTemplate}
          onChange={(e) => onSettingsChange({ ...settings, filenameTemplate: e.target.value })}
          placeholder="{title}_{date}_{time}"
          className="w-full px-3 py-2 text-xs border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <p className="text-xs text-gray-400 mt-1">{t('priceChart.export.filenameTemplateHint')}</p>
      </div>

      <div className="px-4 py-3 border-b border-gray-100">
        <label className="text-xs font-medium text-gray-700 mb-2 block">
          {t('priceChart.export.customFilename')}
        </label>
        <input
          type="text"
          value={settings.customFilename}
          onChange={(e) => onSettingsChange({ ...settings, customFilename: e.target.value })}
          placeholder={generateFilename()}
          className="w-full px-3 py-2 text-xs border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div className="px-4 py-3 border-b border-gray-100">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.includeMetadata}
            onChange={(e) => onSettingsChange({ ...settings, includeMetadata: e.target.checked })}
            className="w-4 h-4 text-primary-600 rounded border-gray-300"
          />
          <span className="text-xs text-gray-700">{t('priceChart.export.includeMetadata')}</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer mt-2">
          <input
            type="checkbox"
            checked={settings.includeWatermark}
            onChange={(e) => onSettingsChange({ ...settings, includeWatermark: e.target.checked })}
            className="w-4 h-4 text-primary-600 rounded border-gray-300"
          />
          <span className="text-xs text-gray-700">{t('priceChart.export.includeWatermark')}</span>
        </label>
      </div>

      <div className="px-4 pt-3 flex gap-2">
        <button
          onClick={onClose}
          className="flex-1 px-4 py-2 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          {t('priceChart.export.cancel')}
        </button>
        <button
          onClick={() => pendingFormat && onExport(pendingFormat, selectedResolution)}
          className="flex-1 px-4 py-2 text-xs text-white bg-primary-600 hover:bg-primary-700 transition-colors"
        >
          {t('priceChart.export.confirmExport')}
        </button>
      </div>
    </div>
  );
}
