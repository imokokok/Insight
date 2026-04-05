'use client';

import { useState, useCallback, useMemo } from 'react';

import { MoreOptionsDropdown } from '@/components/oracle/shared/MoreOptionsDropdown';
import { useTranslations } from '@/i18n';
import { chartColors, baseColors, semanticColors } from '@/lib/config/colors';
import { type ChartExportData } from '@/lib/utils/chartExport';
import { createLogger } from '@/lib/utils/logger';

import { ChartExportButton } from '../forms/ChartExportButton';

import {
  type DataGranularity,
  type ComparisonPeriod,
  getGranularityConfig,
  type ConfidenceLevel,
} from './PriceChart/priceChartConfig';

const logger = createLogger('OracleChartToolbar');

export type OracleChartToolbarSize = 'sm' | 'md' | 'lg';
export type ToolbarButtonVariant = 'default' | 'active' | 'danger' | 'success';

export interface ToolbarButton {
  id: string;
  icon: React.ReactNode;
  label: string;
  tooltip: string;
  onClick: () => void;
  variant?: ToolbarButtonVariant;
  isActive?: boolean;
  disabled?: boolean;
  badge?: number | string;
  shortcut?: string;
}

export interface ToolbarGroup {
  id: string;
  title?: string;
  buttons: ToolbarButton[];
}

export interface TechnicalIndicators {
  showMA7?: boolean;
  showMA14?: boolean;
  showMA30?: boolean;
  showMA60?: boolean;
  showMA20?: boolean;
  showBollingerBands?: boolean;
  showRSI?: boolean;
  showMACD?: boolean;
  showVolume?: boolean;
}

export interface TechnicalIndicatorToggles {
  onToggleMA7?: () => void;
  onToggleMA14?: () => void;
  onToggleMA30?: () => void;
  onToggleMA60?: () => void;
  onToggleMA20?: () => void;
  onToggleBollingerBands?: () => void;
  onToggleRSI?: () => void;
  onToggleMACD?: () => void;
  onToggleVolume?: () => void;
}

export interface OracleChartToolbarProps
  extends Partial<TechnicalIndicators>, Partial<TechnicalIndicatorToggles> {
  symbol: string;
  currentPrice: number;
  priceChange: { value: number; percent: number };
  chartContainerRef: React.RefObject<HTMLDivElement>;
  exportData: ChartExportData[];
  groups?: ToolbarGroup[];
  customButtons?: ToolbarButton[];
  granularity?: DataGranularity;
  onGranularityChange?: (granularity: DataGranularity) => void;
  showComparisonPanel?: boolean;
  onToggleComparisonPanel?: () => void;
  comparison?: ComparisonPeriod;
  onComparisonChange?: (comparison: ComparisonPeriod) => void;
  onApplyComparison?: () => void;
  onCancelComparison?: () => void;
  anomalyDetectionEnabled?: boolean;
  showPredictionInterval?: boolean;
  confidenceLevel?: ConfidenceLevel;
  anomaliesCount?: number;
  onToggleAnomalyDetection?: () => void;
  onTogglePredictionInterval?: () => void;
  onConfidenceLevelChange?: (level: ConfidenceLevel) => void;
  onShowAnomalyStats?: () => void;
  onRefresh?: () => void;
  onFullscreen?: () => void;
  isFullscreen?: boolean;
  isMobile?: boolean;
  isLoading?: boolean;
  isUMAClient?: boolean;
  realtimeEnabled?: boolean;
  umaConnectionStatus?: 'connected' | 'connecting' | 'reconnecting' | 'disconnected';
  umaRealtimePrice?: { confidence: number } | null;
  showExport?: boolean;
  showFullscreen?: boolean;
  showRefresh?: boolean;
  showSettings?: boolean;
  showGranularity?: boolean;
  showTechnicalIndicators?: boolean;
  className?: string;
  children?: React.ReactNode;
}

// eslint-disable-next-line max-lines-per-function, complexity
export function OracleChartToolbar({
  symbol,
  currentPrice,
  priceChange,
  chartContainerRef,
  exportData,
  groups = [],
  customButtons: _customButtons = [],
  granularity = 'hour',
  onGranularityChange,
  showMA7 = false,
  showMA14 = false,
  showMA30 = false,
  showMA60: _showMA60,
  showMA20: _showMA20,
  showBollingerBands = false,
  showRSI = false,
  showMACD = false,
  showVolume = false,
  onToggleMA7,
  onToggleMA14,
  onToggleMA30,
  onToggleMA60: _onToggleMA60,
  onToggleMA20: _onToggleMA20,
  onToggleBollingerBands,
  onToggleRSI,
  onToggleMACD,
  onToggleVolume,
  showComparisonPanel = false,
  onToggleComparisonPanel,
  comparison,
  onComparisonChange,
  onApplyComparison,
  onCancelComparison,
  anomalyDetectionEnabled = false,
  showPredictionInterval = false,
  confidenceLevel = 95,
  anomaliesCount = 0,
  onToggleAnomalyDetection,
  onTogglePredictionInterval,
  onConfidenceLevelChange,
  onShowAnomalyStats,
  onRefresh,
  onFullscreen,
  isFullscreen = false,
  isMobile = false,
  isLoading: _isLoading = false,
  isUMAClient = false,
  realtimeEnabled = false,
  umaConnectionStatus = 'disconnected',
  umaRealtimePrice,
  showExport = true,
  showFullscreen = true,
  showRefresh = true,
  showSettings: _showSettings = false,
  showGranularity = true,
  showTechnicalIndicators = true,
  className = '',
  children,
}: OracleChartToolbarProps) {
  const t = useTranslations();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const GRANULARITY_CONFIG = getGranularityConfig(t);
  const hasChartRef = !!chartContainerRef;

  const connectionStatusText = useMemo(() => {
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
  }, [umaConnectionStatus, t]);

  const connectionStatusClass = useMemo(() => {
    switch (umaConnectionStatus) {
      case 'connected':
        return { backgroundColor: semanticColors.success.DEFAULT, animation: 'pulse' };
      case 'connecting':
      case 'reconnecting':
        return { backgroundColor: semanticColors.warning.DEFAULT, animation: 'pulse' };
      default:
        return { backgroundColor: semanticColors.danger.DEFAULT };
    }
  }, [umaConnectionStatus]);

  const handleRefresh = useCallback(() => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    logger.info('Refreshing chart data');

    onRefresh?.();

    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000);
  }, [isRefreshing, onRefresh]);

  const handleFullscreen = useCallback(() => {
    if (!chartContainerRef.current) return;

    if (!isFullscreen) {
      chartContainerRef.current.requestFullscreen?.().catch((err) => {
        logger.error('Error entering fullscreen:', err);
      });
    } else {
      document.exitFullscreen?.().catch((err) => {
        logger.error('Error exiting fullscreen:', err);
      });
    }

    onFullscreen?.();
  }, [chartContainerRef, isFullscreen, onFullscreen]);

  return (
    <div className={`flex flex-col gap-2 ${isMobile ? 'mb-2' : 'mb-3'} ${className}`}>
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
          {showRefresh && onRefresh && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg border transition-all duration-200 disabled:opacity-50"
              style={{
                borderColor: baseColors.gray[200],
                color: baseColors.gray[600],
              }}
              title={t('chartToolbar.buttons.refresh')}
            >
              <svg
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          )}

          {showFullscreen && onFullscreen && (
            <button
              onClick={handleFullscreen}
              className={cn(
                'p-2 rounded-lg border transition-all duration-200',
                isFullscreen ? 'bg-blue-50 border-blue-200' : ''
              )}
              style={{
                borderColor: isFullscreen ? baseColors.primary[300] : baseColors.gray[200],
                color: isFullscreen ? baseColors.primary[700] : baseColors.gray[600],
              }}
              title={
                isFullscreen
                  ? t('chartToolbar.buttons.exitFullscreen')
                  : t('chartToolbar.buttons.fullscreen')
              }
            >
              {isFullscreen ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                  />
                </svg>
              )}
            </button>
          )}

          {onToggleComparisonPanel && onToggleAnomalyDetection && (
            <MoreOptionsDropdown
              showComparisonPanel={showComparisonPanel}
              comparisonEnabled={comparison?.enabled ?? false}
              anomalyDetectionEnabled={anomalyDetectionEnabled}
              showPredictionInterval={showPredictionInterval}
              confidenceLevel={confidenceLevel}
              anomaliesCount={anomaliesCount}
              onToggleComparison={onToggleComparisonPanel}
              onToggleAnomalyDetection={onToggleAnomalyDetection}
              onTogglePredictionInterval={onTogglePredictionInterval ?? (() => {})}
              onConfidenceLevelChange={onConfidenceLevelChange ?? (() => {})}
              onShowAnomalyStats={onShowAnomalyStats ?? (() => {})}
              compact={isMobile}
            />
          )}

          {showExport && hasChartRef && (
            <ChartExportButton
              chartRef={chartContainerRef}
              data={exportData}
              filename={`${symbol.toLowerCase()}-chart`}
              compact={isMobile}
            />
          )}
        </div>
      </div>

      {showGranularity && onGranularityChange && !isMobile && (
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

      {showTechnicalIndicators && onToggleMA7 && onToggleBollingerBands && (
        <div className={`flex flex-wrap items-center gap-2 ${isMobile ? 'gap-1' : ''}`}>
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
            {!isMobile && onToggleBollingerBands && (
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
            {onToggleMA7 && (
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
                <span
                  className="w-2 h-2"
                  style={{ backgroundColor: chartColors.recharts.warning }}
                />
                {t('priceChart.ma7')}
              </button>
            )}
            {!isMobile && onToggleMA14 && (
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
            {!isMobile && onToggleMA30 && (
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

            {!isMobile && onToggleRSI && onToggleMACD && onToggleVolume && (
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
      )}

      {groups.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 pt-2 border-t border-gray-200">
          {groups.map((group) => (
            <div key={group.id} className="flex items-center gap-2">
              {group.title && !isMobile && (
                <span className="text-xs font-medium text-gray-500 mr-1">{group.title}:</span>
              )}
              <div className="flex items-center gap-1">
                {group.buttons.map((button) => (
                  <button
                    key={button.id}
                    onClick={button.onClick}
                    disabled={button.disabled}
                    className={cn(
                      isMobile ? 'p-2' : 'px-3 py-2',
                      'inline-flex items-center gap-1.5 rounded-lg border font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-sm',
                      isMobile ? 'min-w-[36px] min-h-[36px] justify-center' : '',
                      button.isActive ? 'bg-blue-50 border-blue-200' : ''
                    )}
                    style={{
                      backgroundColor: button.isActive ? baseColors.primary[100] : 'transparent',
                      color: button.isActive ? baseColors.primary[700] : baseColors.gray[600],
                      borderColor: button.isActive ? baseColors.primary[300] : baseColors.gray[200],
                    }}
                    title={button.tooltip}
                  >
                    <span className={isMobile ? 'w-4 h-4' : 'w-4 h-4'}>{button.icon}</span>
                    {!isMobile && <span className="hidden sm:inline">{button.label}</span>}
                    {button.badge !== undefined && (
                      <span
                        className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full text-white"
                        style={{
                          backgroundColor:
                            button.variant === 'danger'
                              ? semanticColors.danger.DEFAULT
                              : baseColors.primary[500],
                        }}
                      >
                        {button.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {children && <div className="pt-2 border-t border-gray-200">{children}</div>}

      {showComparisonPanel &&
        comparison &&
        onComparisonChange &&
        onApplyComparison &&
        onCancelComparison && (
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

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export default OracleChartToolbar;
