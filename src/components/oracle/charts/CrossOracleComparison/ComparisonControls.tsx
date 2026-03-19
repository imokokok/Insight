import { useTranslations } from 'next-intl';
import { OracleProvider } from '@/types/oracle';
import { SegmentedControl, DropdownSelect } from '@/components/ui/selectors';
import {
  symbols,
  oracleNames,
  oracleColors,
  OracleGroup,
  ORACLE_GROUPS,
} from './crossOracleConfig';
import { getOracleProvidersSortedByMarketCap } from '@/lib/config/oracles';

interface DeviationAlert {
  provider: OracleProvider;
  name: string;
  deviation: number;
  price: number;
}

interface ComparisonControlsProps {
  selectedSymbol: string;
  selectedOracles: OracleProvider[];
  deviationThreshold: number;
  deviationAlerts: DeviationAlert[];
  autoRefresh: boolean;
  refreshInterval: number;
  selectedGroup: OracleGroup;
  onSymbolChange: (symbol: string) => void;
  onToggleOracle: (provider: OracleProvider) => void;
  onDeviationThresholdChange: (threshold: number) => void;
  onAutoRefreshChange: (enabled: boolean) => void;
  onRefreshIntervalChange: (interval: number) => void;
  onQuickCompare: () => void;
  onGroupChange: (group: OracleGroup) => void;
}

export function ComparisonControls({
  selectedSymbol,
  selectedOracles,
  deviationThreshold,
  deviationAlerts,
  autoRefresh,
  refreshInterval,
  selectedGroup,
  onSymbolChange,
  onToggleOracle,
  onDeviationThresholdChange,
  onAutoRefreshChange,
  onRefreshIntervalChange,
  onQuickCompare,
  onGroupChange,
}: ComparisonControlsProps) {
  const t = useTranslations();

  return (
    <>
      <div className="py-4 border-b border-gray-100">
        <div className="flex flex-col lg:flex-row lg:items-start gap-6">
          <div className="flex-1">
            <SegmentedControl
              label={t('crossOracle.selectTradingPair')}
              options={symbols.map((symbol) => ({
                value: symbol,
                label: `${symbol}/USD`,
              }))}
              value={selectedSymbol}
              onChange={(value) => onSymbolChange(value as string)}
              size="sm"
            />
          </div>

          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">
              {t('crossOracle.selectOraclesTitle')} ({selectedOracles.length}/5)
            </h3>
            <div className="flex flex-wrap gap-2 mb-3">
              {getOracleProvidersSortedByMarketCap().map((provider) => (
                <button
                  key={provider}
                  onClick={() => onToggleOracle(provider)}
                  disabled={!selectedOracles.includes(provider) && selectedOracles.length >= 5}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
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
            <button
              onClick={onQuickCompare}
              className="px-4 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {t('crossOracleComparison.quickCompare')}
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="py-4 border-b border-gray-100">
        <SegmentedControl
          label={t('crossOracle.selectGroup')}
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

      <div className="py-4 border-b border-gray-100">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-sm font-medium text-gray-700">
            {t('crossOracle.priceDeviationThreshold')}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={deviationThreshold}
              onChange={(e) => onDeviationThresholdChange(parseFloat(e.target.value))}
              className="w-32 h-1.5 bg-gray-200 rounded appearance-none cursor-pointer accent-blue-600"
            />
            <input
              type="number"
              min="0.1"
              max="5"
              step="0.1"
              value={deviationThreshold}
              onChange={(e) => onDeviationThresholdChange(parseFloat(e.target.value) || 1)}
              className="w-16 px-2 py-1 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-sm text-gray-500">%</span>
          </div>
        </div>
      </div>

      {deviationAlerts.length > 0 && (
        <div className="py-4 border-b border-amber-100">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-amber-800 mb-2">
                {t('crossOracle.priceDeviationAlert')}
              </h3>
              <div className="space-y-1.5">
                {deviationAlerts.map((alert) => (
                  <div
                    key={alert.provider}
                    className="flex items-center gap-2 text-sm text-amber-700"
                  >
                    <div
                      className="w-2 h-2"
                      style={{ backgroundColor: oracleColors[alert.provider] }}
                    />
                    <span className="font-medium">{alert.name}</span>
                    <span>
                      {t('crossOracleComparison.deviation')} {alert.deviation.toFixed(3)}%
                    </span>
                    <span className="text-amber-600">(${alert.price.toFixed(2)})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="py-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => onAutoRefreshChange(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
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
    </>
  );
}
