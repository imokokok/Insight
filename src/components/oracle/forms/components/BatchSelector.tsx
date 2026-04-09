'use client';

import { DropdownSelect } from '@/components/ui';
import { useTranslations } from '@/i18n';
import { type Resolution, RESOLUTION_CONFIG, type BatchExportItem } from '@/lib/utils/chartExport';

export interface BatchSelectorProps {
  availableCharts: Array<{
    id: string;
    name: string;
    chartRef: React.RefObject<HTMLElement | HTMLDivElement | null>;
    data: unknown[];
  }>;
  selectedCharts: Set<string>;
  selectedResolution: Resolution;
  isExporting: boolean;
  onToggleChart: (chartId: string) => void;
  onResolutionChange: (resolution: Resolution) => void;
  onExport: () => void;
  onCancel: () => void;
}

export function BatchSelector({
  availableCharts,
  selectedCharts,
  selectedResolution,
  isExporting,
  onToggleChart,
  onResolutionChange,
  onExport,
  onCancel,
}: BatchSelectorProps) {
  const t = useTranslations();

  return (
    <div className="absolute top-full mt-2 right-0 w-80 bg-white border border-gray-200 py-4 z-50 max-h-[80vh] overflow-y-auto">
      <div className="px-4 pb-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">
          {t('priceChart.export.batchExport')}
        </h3>
        <p className="text-xs text-gray-500 mt-0.5">
          {t('priceChart.export.batchExportDescription')}
        </p>
      </div>

      <div className="px-4 py-3 border-b border-gray-100">
        <label className="text-xs font-medium text-gray-700 mb-2 block">
          {t('priceChart.export.resolution')}
        </label>
        <DropdownSelect
          options={(Object.keys(RESOLUTION_CONFIG) as Resolution[]).map((res) => ({
            value: res,
            label: t(RESOLUTION_CONFIG[res].labelKey),
          }))}
          value={selectedResolution}
          onChange={(value) => onResolutionChange(value as Resolution)}
        />
      </div>

      <div className="px-4 py-3">
        <label className="text-xs font-medium text-gray-700 mb-2 block">
          {t('priceChart.export.selectCharts')} ({selectedCharts.size}{' '}
          {t('priceChart.export.selected')})
        </label>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {availableCharts.map((chart) => (
            <label
              key={chart.id}
              className="flex items-center gap-2 p-2 hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedCharts.has(chart.id)}
                onChange={() => onToggleChart(chart.id)}
                className="w-4 h-4 text-primary-600 rounded border-gray-300"
              />
              <span className="text-xs text-gray-700">{chart.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="px-4 pt-3 border-t border-gray-100 flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 px-4 py-2 text-xs text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          {t('priceChart.export.cancel')}
        </button>
        <button
          onClick={onExport}
          disabled={selectedCharts.size === 0 || isExporting}
          className="flex-1 px-4 py-2 text-xs text-white bg-primary-600 hover:bg-primary-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          {isExporting
            ? t('priceChart.export.exporting')
            : `${t('priceChart.export.title')} (${selectedCharts.size})`}
        </button>
      </div>
    </div>
  );
}
