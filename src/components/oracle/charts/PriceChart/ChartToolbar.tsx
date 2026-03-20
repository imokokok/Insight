'use client';

import { useTranslations } from 'next-intl';
import { ChartExportButton } from '../../forms/ChartExportButton';
import { MoreOptionsDropdown } from '../../common/MoreOptionsDropdown';
import { ChartExportData } from '@/utils/chartExport';
import { chartColors, baseColors, semanticColors } from '@/lib/config/colors';
import {
  DataGranularity,
  ComparisonPeriod,
  getGranularityConfig,
  ConfidenceLevel,
} from './priceChartConfig';

interface ChartToolbarProps {
  symbol: string;
  currentPrice: number;
  priceChange: { value: number; percent: number };
  chartContainerRef: React.RefObject<HTMLDivElement>;
  exportData: ChartExportData[];
  granularity: DataGranularity;
  onGranularityChange: (granularity: DataGranularity) => void;
  showMA7: boolean;
  showMA14: boolean;
  showMA30: boolean;
  showMA60: boolean;
  showMA20: boolean;
  showBollingerBands: boolean;
  showRSI: boolean;
  showMACD: boolean;
  showVolume: boolean;
  onToggleMA7: () => void;
  onToggleMA14: () => void;
  onToggleMA30: () => void;
  onToggleMA60: () => void;
  onToggleMA20: () => void;
  onToggleBollingerBands: () => void;
  onToggleRSI: () => void;
  onToggleMACD: () => void;
  onToggleVolume: () => void;
  showComparisonPanel: boolean;
  onToggleComparisonPanel: () => void;
  comparison: ComparisonPeriod;
  onComparisonChange: (comparison: ComparisonPeriod) => void;
  onApplyComparison: () => void;
  onCancelComparison: () => void;
  anomalyDetectionEnabled: boolean;
  showPredictionInterval: boolean;
  confidenceLevel: ConfidenceLevel;
  anomaliesCount: number;
  onToggleAnomalyDetection: () => void;
  onTogglePredictionInterval: () => void;
  onConfidenceLevelChange: (level: ConfidenceLevel) => void;
  onShowAnomalyStats: () => void;
  isMobile: boolean;
  isUMAClient?: boolean;
  realtimeEnabled?: boolean;
  umaConnectionStatus?: 'connected' | 'connecting' | 'reconnecting' | 'disconnected';
  umaRealtimePrice?: { confidence: number } | null;
}

export function ChartToolbar({
  symbol,
  currentPrice,
  priceChange,
  chartContainerRef,
  exportData,
  granularity,
  onGranularityChange,
  showMA7,
  showMA14,
  showMA30,
  showMA60: _showMA60,
  showMA20: _showMA20,
  showBollingerBands,
  showRSI,
  showMACD,
  showVolume,
  onToggleMA7,
  onToggleMA14,
  onToggleMA30,
  onToggleMA60: _onToggleMA60,
  onToggleMA20: _onToggleMA20,
  onToggleBollingerBands,
  onToggleRSI,
  onToggleMACD,
  onToggleVolume,
  showComparisonPanel,
  onToggleComparisonPanel,
  comparison,
  onComparisonChange,
  onApplyComparison,
  onCancelComparison,
  anomalyDetectionEnabled,
  showPredictionInterval,
  confidenceLevel,
  anomaliesCount,
  onToggleAnomalyDetection,
  onTogglePredictionInterval,
  onConfidenceLevelChange,
  onShowAnomalyStats,
  isMobile,
  isUMAClient = false,
  realtimeEnabled = false,
  umaConnectionStatus = 'disconnected',
  umaRealtimePrice,
}: ChartToolbarProps) {
  const t = useTranslations();
  const GRANULARITY_CONFIG = getGranularityConfig(t);

  const connectionStatusText = (() => {
    switch (umaConnectionStatus) {
      case 'connected':
        return t('priceChart.status.realtime');
      case 'connecting':
        return t('priceChart.status.connecting');
      case 'reconnecting':
        return t('priceChart.status.reconnecting');
      default:
        return t('priceChart.status.disconnected');
    }
  })();

  const connectionStatusClass = (() => {
    switch (umaConnectionStatus) {
      case 'connected':
        return { backgroundColor: semanticColors.success.DEFAULT, animation: 'pulse' };
      case 'connecting':
      case 'reconnecting':
        return { backgroundColor: semanticColors.warning.DEFAULT, animation: 'pulse' };
      default:
        return { backgroundColor: semanticColors.danger.DEFAULT };
    }
  })();

  return (
    <div className={`flex flex-col gap-2 ${isMobile ? 'mb-2' : 'mb-3'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div>
            <span
              className={`font-bold ${isMobile ? 'text-lg' : 'text-2xl'}`}
              style={{ color: baseColors.gray[900] }}
            >
              ${currentPrice.toFixed(4)}
            </span>
            <span
              className="ml-2 text-sm font-medium"
              style={{
                color:
                  priceChange.percent >= 0
                    ? semanticColors.success.dark
                    : semanticColors.danger.dark,
              }}
            >
              {priceChange.percent >= 0 ? '+' : ''}
              {priceChange.percent.toFixed(2)}%
            </span>
          </div>
          {isUMAClient && realtimeEnabled && (
            <div
              className="flex items-center gap-1.5 px-2 py-1"
              style={{ backgroundColor: baseColors.gray[100] }}
            >
              <span
                className={`w-2 h-2 ${connectionStatusClass.animation === 'pulse' ? 'animate-pulse' : ''}`}
                style={{ backgroundColor: connectionStatusClass.backgroundColor }}
              />
              <span className="text-xs" style={{ color: baseColors.gray[600] }}>
                {connectionStatusText}
              </span>
              {umaRealtimePrice && (
                <span className="text-xs" style={{ color: baseColors.gray[500] }}>
                  {t('priceChart.confidence')}: {(umaRealtimePrice.confidence * 100).toFixed(1)}%
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <MoreOptionsDropdown
            showComparisonPanel={showComparisonPanel}
            comparisonEnabled={comparison.enabled}
            anomalyDetectionEnabled={anomalyDetectionEnabled}
            showPredictionInterval={showPredictionInterval}
            confidenceLevel={confidenceLevel}
            anomaliesCount={anomaliesCount}
            onToggleComparison={onToggleComparisonPanel}
            onToggleAnomalyDetection={onToggleAnomalyDetection}
            onTogglePredictionInterval={onTogglePredictionInterval}
            onConfidenceLevelChange={onConfidenceLevelChange}
            onShowAnomalyStats={onShowAnomalyStats}
            compact={isMobile}
          />

          <ChartExportButton
            chartRef={chartContainerRef}
            data={exportData}
            filename={`${symbol.toLowerCase()}-price-chart`}
            compact={isMobile}
          />
        </div>
      </div>

      <div className={`flex flex-wrap items-center gap-2 ${isMobile ? 'gap-1' : ''}`}>
        {!isMobile && (
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: baseColors.gray[500] }}>
              {t('priceChart.granularity')}:
            </span>
            <div
              className="flex items-center gap-1 p-1"
              style={{ backgroundColor: baseColors.gray[100] }}
            >
              {(Object.keys(GRANULARITY_CONFIG) as DataGranularity[]).map((g) => (
                <button
                  key={g}
                  onClick={() => onGranularityChange(g)}
                  className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                  style={{
                    backgroundColor: granularity === g ? baseColors.gray[50] : 'transparent',
                    color: granularity === g ? baseColors.primary[600] : baseColors.gray[600],
                  }}
                  onMouseEnter={(e) => {
                    if (granularity !== g) {
                      e.currentTarget.style.color = baseColors.gray[900];
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (granularity !== g) {
                      e.currentTarget.style.color = baseColors.gray[600];
                    }
                  }}
                >
                  {GRANULARITY_CONFIG[g].label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`${isMobile ? 'text-[10px]' : 'text-xs'}`}
            style={{ color: baseColors.gray[500] }}
          >
            {t('priceChart.indicators')}:
          </span>
          <div
            className={`flex items-center gap-1 p-1 flex-wrap ${isMobile ? 'max-w-[calc(100vw-80px)]' : ''}`}
            style={{ backgroundColor: baseColors.gray[100] }}
          >
            {!isMobile && (
              <button
                onClick={onToggleBollingerBands}
                className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 min-h-[44px] min-w-[44px]"
                style={{
                  backgroundColor: showBollingerBands ? baseColors.gray[50] : 'transparent',
                  color: showBollingerBands ? chartColors.recharts.purple : baseColors.gray[600],
                }}
                onMouseEnter={(e) => {
                  if (!showBollingerBands) e.currentTarget.style.color = baseColors.gray[900];
                }}
                onMouseLeave={(e) => {
                  if (!showBollingerBands) e.currentTarget.style.color = baseColors.gray[600];
                }}
                title={t('priceChart.bollingerBands')}
              >
                <span
                  className="w-2 h-2"
                  style={{ backgroundColor: chartColors.recharts.purple }}
                />
                {t('priceChart.bollingerBands')}
              </button>
            )}
            <button
              onClick={onToggleMA7}
              className={`font-medium rounded-md transition-colors flex items-center gap-1.5 min-h-[44px] min-w-[44px] ${isMobile ? 'text-[10px] px-2' : 'text-xs px-3 py-1.5'}`}
              style={{
                backgroundColor: showMA7 ? baseColors.gray[50] : 'transparent',
                color: showMA7 ? chartColors.recharts.warning : baseColors.gray[600],
              }}
              onMouseEnter={(e) => {
                if (!showMA7) e.currentTarget.style.color = baseColors.gray[900];
              }}
              onMouseLeave={(e) => {
                if (!showMA7) e.currentTarget.style.color = baseColors.gray[600];
              }}
              title={t('priceChart.ma7')}
            >
              <span className="w-2 h-2" style={{ backgroundColor: chartColors.recharts.warning }} />
              {t('priceChart.ma7')}
            </button>
            {!isMobile && (
              <button
                onClick={onToggleMA14}
                className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 min-h-[44px] min-w-[44px]"
                style={{
                  backgroundColor: showMA14 ? baseColors.gray[50] : 'transparent',
                  color: showMA14 ? baseColors.primary[600] : baseColors.gray[600],
                }}
                onMouseEnter={(e) => {
                  if (!showMA14) e.currentTarget.style.color = baseColors.gray[900];
                }}
                onMouseLeave={(e) => {
                  if (!showMA14) e.currentTarget.style.color = baseColors.gray[600];
                }}
                title={t('priceChart.ma14')}
              >
                <span className="w-2 h-2" style={{ backgroundColor: baseColors.primary[500] }} />
                {t('priceChart.ma14')}
              </button>
            )}
            {!isMobile && (
              <button
                onClick={onToggleMA30}
                className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 min-h-[44px] min-w-[44px]"
                style={{
                  backgroundColor: showMA30 ? baseColors.gray[50] : 'transparent',
                  color: showMA30 ? chartColors.recharts.purple : baseColors.gray[600],
                }}
                onMouseEnter={(e) => {
                  if (!showMA30) e.currentTarget.style.color = baseColors.gray[900];
                }}
                onMouseLeave={(e) => {
                  if (!showMA30) e.currentTarget.style.color = baseColors.gray[600];
                }}
                title={t('priceChart.ma30')}
              >
                <span
                  className="w-2 h-2"
                  style={{ backgroundColor: chartColors.recharts.purple }}
                />
                {t('priceChart.ma30')}
              </button>
            )}

            {!isMobile && (
              <>
                <div className="w-px h-4 mx-1" style={{ backgroundColor: baseColors.gray[300] }} />
                <button
                  onClick={onToggleRSI}
                  className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 min-h-[44px] min-w-[44px]"
                  style={{
                    backgroundColor: showRSI ? baseColors.gray[50] : 'transparent',
                    color: showRSI ? semanticColors.success.dark : baseColors.gray[600],
                  }}
                  onMouseEnter={(e) => {
                    if (!showRSI) e.currentTarget.style.color = baseColors.gray[900];
                  }}
                  onMouseLeave={(e) => {
                    if (!showRSI) e.currentTarget.style.color = baseColors.gray[600];
                  }}
                  title={t('priceChart.rsi')}
                >
                  <span
                    className="w-2 h-2"
                    style={{ backgroundColor: semanticColors.success.DEFAULT }}
                  />
                  RSI
                </button>
                <button
                  onClick={onToggleMACD}
                  className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 min-h-[44px] min-w-[44px]"
                  style={{
                    backgroundColor: showMACD ? baseColors.gray[50] : 'transparent',
                    color: showMACD ? semanticColors.danger.dark : baseColors.gray[600],
                  }}
                  onMouseEnter={(e) => {
                    if (!showMACD) e.currentTarget.style.color = baseColors.gray[900];
                  }}
                  onMouseLeave={(e) => {
                    if (!showMACD) e.currentTarget.style.color = baseColors.gray[600];
                  }}
                  title={t('priceChart.macd')}
                >
                  <span
                    className="w-2 h-2"
                    style={{ backgroundColor: semanticColors.danger.DEFAULT }}
                  />
                  MACD
                </button>

                <div className="w-px h-4 mx-1" style={{ backgroundColor: baseColors.gray[300] }} />
                <button
                  onClick={onToggleVolume}
                  className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 min-h-[44px] min-w-[44px]"
                  style={{
                    backgroundColor: showVolume ? baseColors.gray[50] : 'transparent',
                    color: showVolume ? chartColors.recharts.cyan : baseColors.gray[600],
                  }}
                  onMouseEnter={(e) => {
                    if (!showVolume) e.currentTarget.style.color = baseColors.gray[900];
                  }}
                  onMouseLeave={(e) => {
                    if (!showVolume) e.currentTarget.style.color = baseColors.gray[600];
                  }}
                  title={t('priceChart.volume')}
                >
                  <span
                    className="w-2 h-2"
                    style={{ backgroundColor: chartColors.recharts.cyan }}
                  />
                  {t('priceChart.volume')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {showComparisonPanel && (
        <div
          className="p-4"
          style={{
            backgroundColor: baseColors.primary[50],
            border: `1px solid ${baseColors.primary[100]}`,
          }}
        >
          <h4 className="text-sm font-medium mb-3" style={{ color: baseColors.gray[700] }}>
            {t('priceChart.timeComparison')}
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium" style={{ color: baseColors.gray[600] }}>
                {t('priceChart.timePeriod1')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={comparison.period1Start}
                  onChange={(e) =>
                    onComparisonChange({ ...comparison, period1Start: e.target.value })
                  }
                  className="px-2 py-1 text-xs rounded-md focus:outline-none"
                  style={{ border: `1px solid ${baseColors.gray[200]}` }}
                />
                <span className="text-xs" style={{ color: baseColors.gray[400] }}>
                  {t('priceChart.to')}
                </span>
                <input
                  type="date"
                  value={comparison.period1End}
                  onChange={(e) =>
                    onComparisonChange({ ...comparison, period1End: e.target.value })
                  }
                  className="px-2 py-1 text-xs rounded-md focus:outline-none"
                  style={{ border: `1px solid ${baseColors.gray[200]}` }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium" style={{ color: baseColors.gray[600] }}>
                {t('priceChart.timePeriod2')}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={comparison.period2Start}
                  onChange={(e) =>
                    onComparisonChange({ ...comparison, period2Start: e.target.value })
                  }
                  className="px-2 py-1 text-xs rounded-md focus:outline-none"
                  style={{ border: `1px solid ${baseColors.gray[200]}` }}
                />
                <span className="text-xs" style={{ color: baseColors.gray[400] }}>
                  {t('priceChart.to')}
                </span>
                <input
                  type="date"
                  value={comparison.period2End}
                  onChange={(e) =>
                    onComparisonChange({ ...comparison, period2End: e.target.value })
                  }
                  className="px-2 py-1 text-xs rounded-md focus:outline-none"
                  style={{ border: `1px solid ${baseColors.gray[200]}` }}
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={onApplyComparison}
              disabled={
                !comparison.period1Start ||
                !comparison.period1End ||
                !comparison.period2Start ||
                !comparison.period2End
              }
              className="px-3 py-1.5 text-xs font-medium text-white rounded-md min-h-[44px] min-w-[44px]"
              style={{
                backgroundColor:
                  !comparison.period1Start ||
                  !comparison.period1End ||
                  !comparison.period2Start ||
                  !comparison.period2End
                    ? baseColors.gray[300]
                    : baseColors.primary[600],
                cursor:
                  !comparison.period1Start ||
                  !comparison.period1End ||
                  !comparison.period2Start ||
                  !comparison.period2End
                    ? 'not-allowed'
                    : 'pointer',
              }}
            >
              {t('priceChart.startComparison')}
            </button>
            <button
              onClick={onCancelComparison}
              className="px-3 py-1.5 text-xs font-medium rounded-md min-h-[44px] min-w-[44px]"
              style={{
                backgroundColor: baseColors.gray[50],
                border: `1px solid ${baseColors.gray[200]}`,
                color: baseColors.gray[600],
              }}
            >
              {t('priceChart.cancelComparison')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
