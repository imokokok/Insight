'use client';

import { useEffect, useMemo, useCallback, useRef, memo } from 'react';

import { ChartSkeleton } from '@/components/ui';
import { useBrushZoom } from '@/hooks';
import { useTranslations } from '@/i18n';
import { baseColors } from '@/lib/config/colors';
import { type BaseOracleClient } from '@/lib/oracles/base';
import { type ChartExportData } from '@/lib/utils/chartExport';
import { type AdaptiveDownsampleConfig } from '@/lib/utils/downsampling';
import { createLogger } from '@/lib/utils/logger';
import {
  useSelectedTimeRange,
  useTimeRangeCallback,
  useSyncEnabled,
  type SelectedTimeRange,
} from '@/stores/uiStore';
import { type Blockchain } from '@/types/oracle';

import { ChartCanvas } from './ChartCanvas';
import { ChartLegend } from './ChartLegend';
import { calculateChartHeights } from './chartUtils';
import { calculatePredictionIntervals } from './priceChartUtils';
import { usePriceChartData } from './usePriceChartData';
import { useChartSettings, useScreenSize } from './usePriceChartSettings';

const logger = createLogger('PriceChart');

interface PriceChartProps {
  client: BaseOracleClient;
  symbol: string;
  chain?: Blockchain;
  height?: number;
  showToolbar?: boolean;
  defaultPrice?: number;
  enableRealtime?: boolean;
  downsamplingConfig?: AdaptiveDownsampleConfig;
  autoDownsample?: boolean;
}

function PriceChartBase({
  client,
  symbol,
  chain,
  height = 600,
  showToolbar = true,
  defaultPrice,
  enableRealtime = true,
  downsamplingConfig,
  autoDownsample = true,
}: PriceChartProps) {
  const _t = useTranslations();
  const screenSize = useScreenSize();
  const selectedTimeRange = useSelectedTimeRange();
  const { registerTimeRangeCallback, unregisterTimeRangeCallback } = useTimeRangeCallback();
  const syncEnabled = useSyncEnabled();
  const {
    settings: chartSettings,
    updateSettings: _updateChartSettings,
    isLoaded: _chartSettingsLoaded,
  } = useChartSettings();

  const isMobile = screenSize === 'mobile';
  const _realtimeEnabled = enableRealtime;
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const { anomalyDetectionEnabled, showPredictionInterval, confidenceLevel } = chartSettings;

  const {
    data,
    comparisonData,
    isLoading,
    currentPrice: _currentPrice,
    granularity: _granularity,
    setGranularity: _setGranularity,
    comparison,
    setComparison: _setComparison,
    anomalies,
    setAnomalies,
    isRefreshing,
    chartOpacity,
    setChartOpacity,
    brushStartIndex,
    setBrushStartIndex,
    brushEndIndex,
    setBrushEndIndex,
    isTransitioning: _isTransitioning,
    setIsTransitioning,
    abortControllerRef,
    priceRange,
    volumeRange,
    priceChange: _priceChange,
    detectedAnomalies,
    showMA7,
    showMA14,
    showMA30,
    showMA60,
    showMA20,
    showBollingerBands,
    showRSI,
    showMACD,
    showVolume,
    toggleMA7: _toggleMA7,
    toggleMA14: _toggleMA14,
    toggleMA30: _toggleMA30,
    toggleMA60: _toggleMA60,
    toggleMA20: _toggleMA20,
    toggleBollingerBands: _toggleBollingerBands,
    toggleRSI: _toggleRSI,
    toggleMACD: _toggleMACD,
    toggleVolume: _toggleVolume,
    indicatorsLoaded,
    fetchData,
    fetchComparisonData,
    chartState,
  } = usePriceChartData({
    client,
    symbol,
    chain,
    defaultPrice,
    enableRealtime,
    downsamplingConfig,
    autoDownsample,
    isMobile,
  });

  const {
    showComparisonPanel: _showComparisonPanel,
    setShowComparisonPanel: _setShowComparisonPanel,
    showAnomalyStats,
    setShowAnomalyStats: _setShowAnomalyStats,
    setBrushRange,
    handleBrushChange,
    handleComparisonApply: _handleComparisonApply,
    cancelComparison: _cancelComparison,
    chartType,
  } = chartState;

  const brushZoom = useBrushZoom({
    dataLength: data.length,
    defaultRange: isMobile ? 0.5 : 0.3,
    minVisiblePoints: isMobile ? 5 : 10,
  });

  const chartHeights = useMemo(
    () => calculateChartHeights(height, showToolbar, isMobile, showRSI, showMACD),
    [height, showToolbar, isMobile, showRSI, showMACD]
  );

  useEffect(() => {
    setAnomalies(detectedAnomalies);
  }, [detectedAnomalies, setAnomalies]);

  const dataWithPrediction = useMemo(() => {
    if (!showPredictionInterval || data.length === 0) return data;
    return calculatePredictionIntervals(data, 20, confidenceLevel);
  }, [data, showPredictionInterval, confidenceLevel]);

  const onBrushChange = useCallback(
    (range: { startIndex?: number; endIndex?: number }) => {
      handleBrushChange(range, brushZoom);
    },
    [handleBrushChange, brushZoom]
  );

  useEffect(() => {
    if (!syncEnabled || !selectedTimeRange || data.length === 0) return;

    const { startTime, endTime } = selectedTimeRange;

    setIsTransitioning(true);
    setChartOpacity(0.5);

    const startIndex = data.findIndex((d) => d.timestamp >= startTime);
    const endIndex = data.findIndex((d) => d.timestamp >= endTime);

    if (startIndex !== -1 && endIndex !== -1) {
      const targetStartIndex = Math.max(0, startIndex);
      const targetEndIndex = Math.min(data.length - 1, endIndex);

      requestAnimationFrame(() => {
        setBrushStartIndex(targetStartIndex);
        setBrushEndIndex(targetEndIndex);
        setBrushRange({ startIndex: targetStartIndex, endIndex: targetEndIndex });

        setTimeout(() => {
          setChartOpacity(1);
          setIsTransitioning(false);
        }, 300);
      });
    } else {
      setChartOpacity(1);
      setIsTransitioning(false);
    }
  }, [
    selectedTimeRange,
    data,
    syncEnabled,
    setIsTransitioning,
    setChartOpacity,
    setBrushStartIndex,
    setBrushEndIndex,
    setBrushRange,
  ]);

  useEffect(() => {
    const handleTimeRangeChange = (range: SelectedTimeRange) => {
      logger.info('Time range changed from external source', { range });
    };

    registerTimeRangeCallback(handleTimeRangeChange);
    return () => unregisterTimeRangeCallback(handleTimeRangeChange);
  }, [registerTimeRangeCallback, unregisterTimeRangeCallback]);

  useEffect(() => {
    if (comparison.enabled) {
      fetchComparisonData();
    } else {
      fetchData();
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData, fetchComparisonData, comparison.enabled, abortControllerRef]);

  const _exportData: ChartExportData[] = useMemo(
    () =>
      data.map((d) => ({
        time: d.time,
        timestamp: d.timestamp,
        price: d.price,
        volume: d.volume,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
        ma7: d.ma7,
        rsi: d.rsi,
        macd: d.macd,
      })),
    [data]
  );

  if (isLoading || !indicatorsLoaded) {
    return <ChartSkeleton height={height} showToolbar={showToolbar} variant="price" />;
  }

  return (
    <div className="h-full flex flex-col">
      <div
        ref={chartContainerRef}
        className={`flex-1 min-h-0 transition-all duration-300 ${isRefreshing ? 'ring-2' : ''} ${isMobile ? 'p-1' : 'p-2 sm:p-4'}`}
        style={{
          opacity: chartOpacity,
          backgroundColor: baseColors.gray[50],
          boxShadow: isRefreshing ? `0 0 0 2px ${baseColors.primary[400]}80` : undefined,
        }}
      >
        <ChartCanvas
          data={data}
          dataWithPrediction={dataWithPrediction}
          comparisonData={comparisonData}
          chartType={chartType}
          isMobile={isMobile}
          chartHeights={chartHeights}
          priceRange={priceRange}
          volumeRange={volumeRange}
          showVolume={showVolume}
          showBollingerBands={showBollingerBands}
          showPredictionInterval={showPredictionInterval}
          showMA7={showMA7}
          showMA14={showMA14}
          showMA30={showMA30}
          showMA60={showMA60}
          showMA20={showMA20}
          showRSI={showRSI}
          showMACD={showMACD}
          comparisonEnabled={comparison.enabled}
          anomalyDetectionEnabled={anomalyDetectionEnabled}
          anomalies={anomalies}
          brushStartIndex={brushStartIndex}
          brushEndIndex={brushEndIndex}
          onBrushChange={onBrushChange}
        />
      </div>

      {showAnomalyStats && anomalyDetectionEnabled && anomalies.length > 0 && (
        <div className="mt-4"></div>
      )}

      <ChartLegend
        chartType={chartType}
        isMobile={isMobile}
        comparisonEnabled={comparison.enabled}
        showMA7={showMA7}
        showBollingerBands={showBollingerBands}
        showRSI={showRSI}
        showMACD={showMACD}
        showVolume={showVolume}
        anomalyDetectionEnabled={anomalyDetectionEnabled}
        anomaliesCount={anomalies.length}
      />
    </div>
  );
}

function arePropsEqual(prevProps: PriceChartProps, nextProps: PriceChartProps): boolean {
  return (
    prevProps.client === nextProps.client &&
    prevProps.symbol === nextProps.symbol &&
    prevProps.chain === nextProps.chain &&
    prevProps.height === nextProps.height &&
    prevProps.showToolbar === nextProps.showToolbar &&
    prevProps.defaultPrice === nextProps.defaultPrice &&
    prevProps.enableRealtime === nextProps.enableRealtime &&
    prevProps.autoDownsample === nextProps.autoDownsample &&
    prevProps.downsamplingConfig === nextProps.downsamplingConfig
  );
}

const PriceChart = memo(PriceChartBase, arePropsEqual);

export { PriceChart };
export { PriceChart as default };
