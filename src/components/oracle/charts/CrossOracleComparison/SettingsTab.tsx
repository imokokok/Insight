'use client';

import { SegmentedControl, DropdownSelect } from '@/components/ui';
import { useTranslations } from '@/i18n';
import { getOracleProvidersSortedByMarketCap } from '@/lib/config/oracles';
import { OracleProvider } from '@/types/oracle';

import { symbols, oracleNames, oracleColors, type OracleGroup } from './crossOracleConfig';

interface DeviationAlert {
  provider: OracleProvider;
  name: string;
  deviation: number;
  price: number;
}

interface SettingsTabProps {
  selectedSymbol: string;
  selectedOracles: OracleProvider[];
  deviationThreshold: number;
  deviationAlerts: DeviationAlert[];
  autoRefresh: boolean;
  refreshInterval: number;
  selectedGroup: OracleGroup;
  lastUpdated: Date | null;
  exportData: {
    symbol: string;
    timestamp: string;
    oracles: Array<{
      provider: string;
      price: number;
      confidence?: number;
      responseTime: number;
      deviation: number;
    }>;
    statistics?: {
      avg: number;
      max: number;
      min: number;
      range: number;
      stdDev: number;
      median: number;
    };
  };
  chartRef: React.RefObject<HTMLDivElement | null>;
  onSymbolChange: (symbol: string) => void;
  onToggleOracle: (provider: OracleProvider) => void;
  onDeviationThresholdChange: (threshold: number) => void;
  onAutoRefreshChange: (enabled: boolean) => void;
  onRefreshIntervalChange: (interval: number) => void;
  onQuickCompare: () => void;
  onGroupChange: (group: OracleGroup) => void;
  onManualRefresh: () => void;
  isLoading: boolean;
}

export function SettingsTab({
  selectedSymbol,
  selectedOracles,
  deviationThreshold,
  deviationAlerts,
  autoRefresh,
  refreshInterval,
  selectedGroup,
  lastUpdated,
  exportData: _exportData,
  chartRef: _chartRef,
  onSymbolChange,
  onToggleOracle,
  onDeviationThresholdChange,
  onAutoRefreshChange,
  onRefreshIntervalChange,
  onQuickCompare,
  onGroupChange,
  onManualRefresh,
  isLoading,
}: SettingsTabProps) {
  const t = useTranslations();

  return (
    <div className="space-y-6">
      {/* 交易对选择 */}
      <div className="pb-6 border-b border-gray-100">
        <h3 className="text-xs font-normal text-gray-500 mb-4">
          {t('crossOracle.selectTradingPair')}
        </h3>
        <SegmentedControl
          options={symbols.map((symbol) => ({
            value: symbol,
            label: `${symbol}/USD`,
          }))}
          value={selectedSymbol}
          onChange={(value) => onSymbolChange(value as string)}
          size="sm"
        />
      </div>

      {/* 预言机选择 */}
      <div className="pb-6 border-b border-gray-100">
        <h3 className="text-xs font-normal text-gray-500 mb-4">
          {t('crossOracle.selectOraclesTitle')} ({selectedOracles.length}/5)
        </h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {getOracleProvidersSortedByMarketCap()
            .filter((provider) => provider !== OracleProvider.WINKLINK)
            .map((provider) => (
              <button
                key={provider}
                onClick={() => onToggleOracle(provider)}
                disabled={!selectedOracles.includes(provider) && selectedOracles.length >= 5}
                className={`px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  selectedOracles.includes(provider)
                    ? 'text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
                style={{
                  backgroundColor: selectedOracles.includes(provider)
                    ? oracleColors[provider]
                    : undefined,
                }}
              >
                {oracleNames[provider]}
              </button>
            ))}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onQuickCompare}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
          >
            {t('crossOracleComparison.quickCompare')}
          </button>
        </div>
      </div>

      {/* 分组选择 */}
      <div className="pb-6 border-b border-gray-100">
        <h3 className="text-xs font-normal text-gray-500 mb-4">{t('crossOracle.selectGroup')}</h3>
        <SegmentedControl
          options={[
            { value: 'ALL', label: t('crossOracle.groups.all') },
            { value: 'HIGH_FREQUENCY', label: t('crossOracle.groups.highFrequency') },
            { value: 'STANDARD', label: t('crossOracle.groups.standard') },
          ]}
          value={selectedGroup}
          onChange={(value) => onGroupChange(value as OracleGroup)}
          size="sm"
        />
      </div>

      {/* 偏差阈值设置 */}
      <div className="pb-6 border-b border-gray-100">
        <h3 className="text-xs font-normal text-gray-500 mb-4">
          {t('crossOracle.priceDeviationThreshold')}
        </h3>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={deviationThreshold}
            onChange={(e) => onDeviationThresholdChange(parseFloat(e.target.value))}
            className="w-32 h-1 bg-gray-200 rounded appearance-none cursor-pointer accent-gray-900"
          />
          <input
            type="number"
            min="0.1"
            max="5"
            step="0.1"
            value={deviationThreshold}
            onChange={(e) => onDeviationThresholdChange(parseFloat(e.target.value) || 1)}
            className="w-16 px-2 py-1 border-0 border-b border-gray-200 text-sm focus:ring-0 focus:border-gray-900 bg-transparent"
          />
          <span className="text-sm text-gray-500">%</span>
        </div>
        {deviationAlerts.length > 0 && (
          <div className="mt-3 py-2 px-3 bg-amber-50/50 border-l-2 border-amber-400">
            <p className="text-xs text-amber-800">
              {t('crossOracle.priceDeviationAlert')}: {deviationAlerts.length}
            </p>
          </div>
        )}
      </div>

      {/* 自动刷新设置 */}
      <div className="pb-6 border-b border-gray-100">
        <h3 className="text-xs font-normal text-gray-500 mb-4">{t('crossOracle.autoRefresh')}</h3>
        <div className="flex flex-col gap-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => onAutoRefreshChange(e.target.checked)}
              className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900"
            />
            <span className="text-sm text-gray-700">{t('crossOracle.enableAutoRefresh')}</span>
          </label>
          {autoRefresh && (
            <DropdownSelect
              options={[
                { value: '10000', label: '10s' },
                { value: '30000', label: '30s' },
                { value: '60000', label: '1m' },
                { value: '300000', label: '5m' },
              ]}
              value={String(refreshInterval)}
              onChange={(value) => onRefreshIntervalChange(Number(value))}
            />
          )}
        </div>
      </div>

      {/* 手动刷新和导出 */}
      <div>
        <h3 className="text-xs font-normal text-gray-500 mb-4">{t('crossOracle.actions')}</h3>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {t('time.lastUpdated')}: {lastUpdated ? lastUpdated.toLocaleTimeString() : '-'}
            </span>
            <button
              onClick={onManualRefresh}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              {isLoading ? t('status.loading') : t('actions.refresh')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
