'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Brush,
  Cell,
  Legend,
  Area,
  ReferenceLine,
} from 'recharts';
import { useTranslations } from 'next-intl';
import { BaseOracleClient } from '@/lib/oracles/base';
import { BandProtocolClient } from '@/lib/oracles/bandProtocol';
import { UMAClient } from '@/lib/oracles/uma';
import { Blockchain } from '@/types/oracle';
import { TimeRange } from '../../common/TabNavigation';
import { AnomalyMarker } from '../../common/AnomalyMarker';
import { ChartExportData } from '@/utils/chartExport';
import { downsampleData } from '@/utils/downsampling';
import { ChartSkeleton } from '@/components/ui/ChartSkeleton';
import { createLogger } from '@/lib/utils/logger';
import { chartColors, baseColors, semanticColors } from '@/lib/config/colors';
import { useUMARealtimePrice, UMAPriceData } from '@/hooks/useUMARealtime';
import { useTechnicalIndicators, IndicatorDataPoint } from '@/hooks/useTechnicalIndicators';
import { useBrushZoom } from '@/hooks/useChartZoom';
import {
  ChartType,
  DataGranularity,
  getGranularityConfig,
  ConfidenceLevel,
} from './priceChartConfig';
import { useChartSettings, useScreenSize } from './usePriceChartSettings';
import {
  generateHistoricalData,
  convertHistoricalPricePoints,
  generateDataWithGranularity,
  calculatePredictionIntervals,
} from './priceChartUtils';
import { MainChartTooltip, RSITooltip, MACDTooltip, CandlestickShape } from './PriceChartTooltip';
import { ChartToolbar } from './ChartToolbar';
import { useChartState, AnomalyPoint } from './useChartState';
import {
  calculatePriceRange,
  calculateVolumeRange,
  calculatePriceChange,
  detectAnomalies,
  calculateChartHeights,
} from './chartUtils';
import {
  useGlobalTimeRange,
  useSelectedTimeRange,
  useTimeRangeCallback,
  useSyncEnabled,
  SelectedTimeRange,
} from '@/stores/uiStore';

const logger = createLogger('PriceChart');

interface PriceChartProps {
  client: BaseOracleClient;
  symbol: string;
  chain?: Blockchain;
  height?: number;
  showToolbar?: boolean;
  defaultPrice?: number;
  enableRealtime?: boolean;
}

export function PriceChart({
  client,
  symbol,
  chain,
  height = 600,
  showToolbar = true,
  defaultPrice,
  enableRealtime = true,
}: PriceChartProps) {
  const t = useTranslations();
  const screenSize = useScreenSize();
  const GRANULARITY_CONFIG = useMemo(() => getGranularityConfig(t), [t]);
  const globalTimeRange = useGlobalTimeRange();
  const selectedTimeRange = useSelectedTimeRange();
  const { registerTimeRangeCallback, unregisterTimeRangeCallback } = useTimeRangeCallback();
  const syncEnabled = useSyncEnabled();
  const {
    settings: chartSettings,
    updateSettings: updateChartSettings,
    isLoaded: chartSettingsLoaded,
  } = useChartSettings();

  const isMobile = screenSize === 'mobile';
  const isTablet = screenSize === 'tablet';
  const {
    settings: indicatorSettings,
    updateSettings: updateIndicatorSettings,
    calculateIndicators: calculateIndicatorsFn,
    showMA7,
    showMA14,
    showMA30,
    showMA60,
    showMA20,
    showBollingerBands,
    showRSI,
    showMACD,
    showVolume,
    toggleMA7,
    toggleMA14,
    toggleMA30,
    toggleMA60,
    toggleMA20,
    toggleBollingerBands,
    toggleRSI,
    toggleMACD,
    toggleVolume,
    isLoaded: indicatorsLoaded,
  } = useTechnicalIndicators({ isMobile, persistSettings: true });

  const chartState = useChartState();
  const {
    chartType,
    rawData,
    setRawData,
    data,
    setData,
    comparisonData,
    setComparisonData,
    loading,
    setLoading,
    currentPrice,
    setCurrentPrice,
    granularity,
    setGranularity,
    comparison,
    setComparison,
    showComparisonPanel,
    setShowComparisonPanel,
    anomalies,
    setAnomalies,
    showAnomalyStats,
    setShowAnomalyStats,
    isRefreshing,
    setIsRefreshing,
    chartOpacity,
    setChartOpacity,
    brushRange,
    setBrushRange,
    brushStartIndex,
    setBrushStartIndex,
    brushEndIndex,
    setBrushEndIndex,
    isTransitioning,
    setIsTransitioning,
    abortControllerRef,
    lastRealtimeUpdateRef,
    handleBrushChange,
    handleComparisonApply,
    cancelComparison,
  } = chartState;

  const realtimeEnabled = enableRealtime;
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const { anomalyDetectionEnabled, showPredictionInterval, confidenceLevel } = chartSettings;

  const timeRange = globalTimeRange;

  const isBandClient = client instanceof BandProtocolClient;
  const isUMAClient = client instanceof UMAClient;

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
    if (rawData.length > 0) {
      const dataWithIndicators = calculateIndicatorsFn(rawData);
      setData(dataWithIndicators);
    }
  }, [rawData, calculateIndicatorsFn, setData]);

  const handlePriceUpdate = useCallback(
    (priceData: UMAPriceData) => {
      const now = Date.now();
      if (now - lastRealtimeUpdateRef.current < 1000) return;
      lastRealtimeUpdateRef.current = now;

      setCurrentPrice(priceData.price);

      setRawData((prevData) => {
        if (prevData.length === 0) return prevData;

        const lastPoint = prevData[prevData.length - 1];
        const newTimestamp = now;
        const newTime = new Date(newTimestamp).toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

        const newPrice = priceData.price;
        const prices = prevData.slice(-59).map((d) => d.price);
        prices.push(newPrice);

        const newPoint: IndicatorDataPoint = {
          time: newTime,
          timestamp: newTimestamp,
          price: newPrice,
          volume: lastPoint.volume * (0.9 + Math.random() * 0.2),
          open: lastPoint.close || lastPoint.price,
          high: Math.max(lastPoint.close || lastPoint.price, newPrice) * (1 + Math.random() * 0.005),
          low: Math.min(lastPoint.close || lastPoint.price, newPrice) * (1 - Math.random() * 0.005),
          close: newPrice,
        };

        const maxDataPoints = 500;
        const newData = [...prevData, newPoint];
        if (newData.length > maxDataPoints) {
          return newData.slice(newData.length - maxDataPoints);
        }
        return newData;
      });
    },
    [lastRealtimeUpdateRef, setCurrentPrice, setRawData]
  );

  const { priceData: umaRealtimePrice, connectionStatus: umaConnectionStatus } =
    useUMARealtimePrice({
      symbol: isUMAClient ? symbol : undefined,
      enabled: isUMAClient && realtimeEnabled,
      onPriceUpdate: handlePriceUpdate,
    });

  const fetchData = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsRefreshing(true);
    setChartOpacity(0.3);
    setLoading(true);
    try {
      const priceData = await client.getPrice(symbol, chain);

      if (abortController.signal.aborted) return;

      setCurrentPrice(priceData.price);

      if (isBandClient && symbol.toUpperCase() === 'BAND') {
        const bandClient = client as BandProtocolClient;
        const periodMap: Record<TimeRange, '1d' | '7d' | '30d' | '90d' | '1y'> = {
          '1H': '1d',
          '24H': '1d',
          '7D': '7d',
          '30D': '30d',
          '90D': '90d',
          '1Y': '1y',
          ALL: '1y',
        };
        const historicalPoints = await bandClient.getHistoricalBandPrices(periodMap[timeRange]);
        const chartData = convertHistoricalPricePoints(historicalPoints);
        const downsampledData = downsampleData(chartData, {
          preservePeaks: true,
          preserveTrends: true,
        });
        setRawData(downsampledData);
      } else {
        const historicalData = generateHistoricalData(priceData.price, timeRange);
        const downsampledData = downsampleData(historicalData, {
          preservePeaks: true,
          preserveTrends: true,
        });
        setRawData(downsampledData);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;

      logger.error(
        'Error fetching price data',
        error instanceof Error ? error : new Error(String(error))
      );
      const fallbackPrice = defaultPrice || 100;
      setCurrentPrice(fallbackPrice);
      const fallbackData = generateHistoricalData(fallbackPrice, timeRange);
      setRawData(downsampleData(fallbackData, { preservePeaks: true, preserveTrends: true }));
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
        setChartOpacity(1);
        setTimeout(() => setIsRefreshing(false), 300);
      }
    }
  }, [
    chain,
    client,
    symbol,
    timeRange,
    defaultPrice,
    isBandClient,
    abortControllerRef,
    setIsRefreshing,
    setChartOpacity,
    setLoading,
    setCurrentPrice,
    setRawData,
  ]);

  const fetchComparisonData = useCallback(async () => {
    if (
      !comparison.period1Start ||
      !comparison.period1End ||
      !comparison.period2Start ||
      !comparison.period2End
    )
      return;

    setLoading(true);
    try {
      const priceData = await client.getPrice(symbol, chain);
      setCurrentPrice(priceData.price);

      const period1Start = new Date(comparison.period1Start);
      const period1End = new Date(comparison.period1End);
      const period2Start = new Date(comparison.period2Start);
      const period2End = new Date(comparison.period2End);

      if (isBandClient && symbol.toUpperCase() === 'BAND') {
        const bandClient = client as BandProtocolClient;
        const historicalPoints = await bandClient.getHistoricalBandPrices('1y');

        const period1Points = historicalPoints.filter(
          (p) => p.timestamp >= period1Start.getTime() && p.timestamp <= period1End.getTime()
        );
        const period2Points = historicalPoints.filter(
          (p) => p.timestamp >= period2Start.getTime() && p.timestamp <= period2End.getTime()
        );

        const period1Data = convertHistoricalPricePoints(period1Points, false);
        const period2Data = convertHistoricalPricePoints(period2Points, true);

        setRawData(downsampleData(period1Data, { preservePeaks: true, preserveTrends: true }));
        setComparisonData(
          downsampleData(period2Data, { preservePeaks: true, preserveTrends: true })
        );
      } else {
        const period1Data = generateDataWithGranularity(
          priceData.price,
          period1Start,
          period1End,
          granularity
        );
        const period2Data = generateDataWithGranularity(
          priceData.price * 0.95,
          period2Start,
          period2End,
          granularity
        );

        setRawData(downsampleData(period1Data, { preservePeaks: true, preserveTrends: true }));
        setComparisonData(
          downsampleData(
            period2Data.map((d) => ({ ...d, isComparison: true })),
            { preservePeaks: true, preserveTrends: true }
          )
        );
      }
    } catch (error) {
      logger.error(
        'Error fetching comparison data',
        error instanceof Error ? error : new Error(String(error))
      );
    } finally {
      setLoading(false);
    }
  }, [
    comparison,
    client,
    symbol,
    chain,
    granularity,
    isBandClient,
    setLoading,
    setCurrentPrice,
    setRawData,
    setComparisonData,
  ]);

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

  const priceRange = useMemo(
    () => calculatePriceRange(data, comparisonData, comparison.enabled),
    [data, comparisonData, comparison.enabled]
  );

  const volumeRange = useMemo(
    () => calculateVolumeRange(data, comparisonData, comparison.enabled),
    [data, comparisonData, comparison.enabled]
  );

  const priceChange = useMemo(() => calculatePriceChange(data), [data]);

  const detectedAnomalies = useMemo(
    () => detectAnomalies(data, anomalyDetectionEnabled),
    [data, anomalyDetectionEnabled]
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

  const exportData: ChartExportData[] = useMemo(
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

  if (loading || !indicatorsLoaded) {
    return <ChartSkeleton height={height} showToolbar={showToolbar} variant="price" />;
  }

  return (
    <div className="h-full flex flex-col">
      {showToolbar && (
        <ChartToolbar
          symbol={symbol}
          currentPrice={currentPrice}
          priceChange={priceChange}
          chartContainerRef={chartContainerRef as React.RefObject<HTMLDivElement>}
          exportData={exportData}
          granularity={granularity}
          onGranularityChange={setGranularity}
          showMA7={showMA7}
          showMA14={showMA14}
          showMA30={showMA30}
          showMA60={showMA60}
          showMA20={showMA20}
          showBollingerBands={showBollingerBands}
          showRSI={showRSI}
          showMACD={showMACD}
          showVolume={showVolume}
          onToggleMA7={toggleMA7}
          onToggleMA14={toggleMA14}
          onToggleMA30={toggleMA30}
          onToggleMA60={toggleMA60}
          onToggleMA20={toggleMA20}
          onToggleBollingerBands={toggleBollingerBands}
          onToggleRSI={toggleRSI}
          onToggleMACD={toggleMACD}
          onToggleVolume={toggleVolume}
          showComparisonPanel={showComparisonPanel}
          onToggleComparisonPanel={() => setShowComparisonPanel(!showComparisonPanel)}
          comparison={comparison}
          onComparisonChange={setComparison}
          onApplyComparison={handleComparisonApply}
          onCancelComparison={cancelComparison}
          anomalyDetectionEnabled={anomalyDetectionEnabled}
          showPredictionInterval={showPredictionInterval}
          confidenceLevel={confidenceLevel}
          anomaliesCount={anomalies.length}
          onToggleAnomalyDetection={() =>
            updateChartSettings({ anomalyDetectionEnabled: !anomalyDetectionEnabled })
          }
          onTogglePredictionInterval={() =>
            updateChartSettings({ showPredictionInterval: !showPredictionInterval })
          }
          onConfidenceLevelChange={(level) => updateChartSettings({ confidenceLevel: level as ConfidenceLevel })}
          onShowAnomalyStats={() => setShowAnomalyStats(!showAnomalyStats)}
          isMobile={isMobile}
          isUMAClient={isUMAClient}
          realtimeEnabled={realtimeEnabled}
          umaConnectionStatus={umaConnectionStatus as 'connected' | 'connecting' | 'reconnecting' | 'disconnected'}
          umaRealtimePrice={umaRealtimePrice}
        />
      )}

      <div
        ref={chartContainerRef}
        className={`flex-1 min-h-0 transition-all duration-300 ${isRefreshing ? 'ring-2' : ''} ${isMobile ? 'p-1' : 'p-2 sm:p-4'}`}
        style={{
          opacity: chartOpacity,
          backgroundColor: baseColors.gray[50],
          boxShadow: isRefreshing ? `0 0 0 2px ${baseColors.primary[400]}80` : undefined,
        }}
      >
        <ResponsiveContainer width="100%" height={chartHeights.main}>
          <ComposedChart
            data={dataWithPrediction}
            margin={{ top: 10, right: isMobile ? 5 : 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={chartColors.recharts.grid}
              strokeOpacity={0.5}
              vertical={false}
            />

            <XAxis
              dataKey="time"
              stroke={chartColors.recharts.axis}
              tick={{ fontSize: isMobile ? 9 : 11, fill: chartColors.recharts.tick }}
              tickLine={false}
              axisLine={{ stroke: chartColors.recharts.grid, strokeOpacity: 0.5 }}
              minTickGap={isMobile ? 60 : 40}
              hide={showRSI || showMACD}
              interval="preserveStartEnd"
            />

            <YAxis
              yAxisId="price"
              stroke={chartColors.recharts.axis}
              tick={{ fontSize: isMobile ? 9 : 11, fill: chartColors.recharts.tick }}
              tickLine={false}
              axisLine={{ stroke: chartColors.recharts.grid, strokeOpacity: 0.5 }}
              domain={[priceRange.min, priceRange.max]}
              tickFormatter={(value) => `$${Number(value).toFixed(isMobile ? 0 : 2)}`}
              width={isMobile ? 35 : 60}
            />

            <YAxis
              yAxisId="volume"
              orientation="right"
              stroke={chartColors.recharts.axis}
              tick={{ fontSize: isMobile ? 9 : 11, fill: chartColors.recharts.tick }}
              tickLine={false}
              axisLine={false}
              domain={[volumeRange.min, volumeRange.max]}
              hide
            />

            <Tooltip
              content={
                <MainChartTooltip
                  chartType={chartType}
                  showBollingerBands={showBollingerBands}
                  showRSI={showRSI}
                  showMACD={showMACD}
                  isMobile={isMobile}
                />
              }
              cursor={{
                stroke: chartColors.recharts.border,
                strokeWidth: 1,
                strokeDasharray: '4 4',
              }}
            />

            {comparison.enabled && (
              <Legend
                verticalAlign="top"
                height={36}
                formatter={(value) => (
                  <span className="text-xs" style={{ color: baseColors.gray[600] }}>
                    {value === 'price' ? t('priceChart.timePeriod1') : t('priceChart.timePeriod2')}
                  </span>
                )}
              />
            )}

            {showVolume && (
              <Bar
                yAxisId="volume"
                dataKey="volume"
                fill={chartColors.recharts.primaryLight}
                fillOpacity={0.2}
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.close !== undefined &&
                      entry.open !== undefined &&
                      entry.close >= entry.open
                        ? chartColors.semantic.success
                        : chartColors.semantic.danger
                    }
                    fillOpacity={0.3}
                  />
                ))}
              </Bar>
            )}

            {chartType === 'line' && (
              <>
                {showBollingerBands && (
                  <>
                    <Area
                      yAxisId="price"
                      type="monotone"
                      dataKey="bbUpper"
                      stroke="none"
                      fill={chartColors.recharts.purple}
                      fillOpacity={0.1}
                      dot={false}
                      activeDot={false}
                    />
                    <Area
                      yAxisId="price"
                      type="monotone"
                      dataKey="bbLower"
                      stroke="none"
                      fill={chartColors.recharts.white}
                      fillOpacity={1}
                      dot={false}
                      activeDot={false}
                    />
                    <Line
                      yAxisId="price"
                      type="monotone"
                      dataKey="bbUpper"
                      stroke={chartColors.recharts.purple}
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      dot={false}
                      activeDot={false}
                    />
                    <Line
                      yAxisId="price"
                      type="monotone"
                      dataKey="bbMiddle"
                      stroke={chartColors.recharts.purple}
                      strokeWidth={1.5}
                      dot={false}
                      activeDot={false}
                    />
                    <Line
                      yAxisId="price"
                      type="monotone"
                      dataKey="bbLower"
                      stroke={chartColors.recharts.purple}
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      dot={false}
                      activeDot={false}
                    />
                  </>
                )}

                {showPredictionInterval && (
                  <>
                    <Area
                      yAxisId="price"
                      type="monotone"
                      dataKey="predictionUpper"
                      stroke={chartColors.recharts.primaryLight}
                      strokeDasharray="5 5"
                      strokeWidth={1}
                      fill="transparent"
                      dot={false}
                      activeDot={false}
                    />
                    <Area
                      yAxisId="price"
                      type="monotone"
                      dataKey="predictionLower"
                      stroke={chartColors.recharts.primaryLight}
                      strokeDasharray="5 5"
                      strokeWidth={1}
                      fill="transparent"
                      dot={false}
                      activeDot={false}
                    />
                    <Area
                      yAxisId="price"
                      type="monotone"
                      dataKey="predictionUpper"
                      stroke="none"
                      fill={chartColors.recharts.primaryLight}
                      fillOpacity={0.1}
                      dot={false}
                      activeDot={false}
                    />
                  </>
                )}

                <Line
                  yAxisId="price"
                  type="monotone"
                  dataKey="price"
                  stroke={chartColors.recharts.primaryLight}
                  strokeWidth={isMobile ? 1.5 : 2}
                  dot={false}
                  activeDot={{
                    r: isMobile ? 3 : 4,
                    strokeWidth: 0,
                    fill: chartColors.recharts.primaryDark,
                  }}
                  name="price"
                />

                {comparison.enabled && comparisonData.length > 0 && (
                  <Line
                    yAxisId="price"
                    type="monotone"
                    data={comparisonData}
                    dataKey="price"
                    stroke={chartColors.recharts.purple}
                    strokeWidth={isMobile ? 1.5 : 2}
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={{
                      r: isMobile ? 3 : 4,
                      strokeWidth: 0,
                      fill: chartColors.recharts.purpleDark,
                    }}
                    name="comparison"
                  />
                )}

                {showMA7 && (
                  <Line
                    yAxisId="price"
                    type="monotone"
                    dataKey="ma7"
                    stroke={chartColors.recharts.warning}
                    strokeWidth={isMobile ? 1 : 1.5}
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={false}
                    name="MA7"
                  />
                )}
                {showMA14 && (
                  <Line
                    yAxisId="price"
                    type="monotone"
                    dataKey="ma14"
                    stroke={chartColors.recharts.primaryLight}
                    strokeWidth={1.5}
                    strokeDasharray="10 5"
                    dot={false}
                    activeDot={false}
                    name="MA14"
                  />
                )}
                {showMA30 && (
                  <Line
                    yAxisId="price"
                    type="monotone"
                    dataKey="ma30"
                    stroke={chartColors.recharts.purple}
                    strokeWidth={1.5}
                    strokeDasharray="3 3"
                    dot={false}
                    activeDot={false}
                    name="MA30"
                  />
                )}
                {showMA60 && (
                  <Line
                    yAxisId="price"
                    type="monotone"
                    dataKey="ma60"
                    stroke={chartColors.recharts.success}
                    strokeWidth={1.5}
                    strokeDasharray="15 5 3 5"
                    dot={false}
                    activeDot={false}
                    name="MA60"
                  />
                )}
                {showMA20 && (
                  <Line
                    yAxisId="price"
                    type="monotone"
                    dataKey="ma20"
                    stroke={chartColors.recharts.cyan}
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={false}
                    name="MA20"
                  />
                )}
              </>
            )}

            {chartType === 'candlestick' && (
              <Bar yAxisId="price" dataKey="high" shape={<CandlestickShape />} fill="transparent" />
            )}

            {anomalyDetectionEnabled && anomalies.length > 0 && (
              <AnomalyMarker anomalies={anomalies} yAxisId="price" />
            )}

            {!showRSI && !showMACD && (
              <Brush
                dataKey="time"
                height={isMobile ? 20 : 30}
                stroke={chartColors.recharts.primaryLight}
                fill={chartColors.recharts.backgroundLight}
                tickFormatter={() => ''}
                onChange={onBrushChange}
                startIndex={brushStartIndex}
                endIndex={brushEndIndex}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>

        {showRSI && (
          <div className={`${isMobile ? 'mt-1' : 'mt-2'}`}>
            <div className="flex items-center justify-between px-2 mb-1">
              <span
                className={`font-medium ${isMobile ? 'text-[10px]' : 'text-xs'}`}
                style={{ color: baseColors.gray[600] }}
              >
                {t('priceChart.rsi')}
              </span>
              <span
                className={`${isMobile ? 'text-[10px]' : 'text-xs'}`}
                style={{ color: baseColors.gray[400] }}
              >
                {t('priceChart.rsiPeriod')}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={chartHeights.rsi}>
              <ComposedChart
                data={dataWithPrediction}
                margin={{ top: 5, right: isMobile ? 5 : 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={chartColors.recharts.grid}
                  strokeOpacity={0.3}
                  vertical={false}
                />
                <XAxis
                  dataKey="time"
                  stroke={chartColors.recharts.axis}
                  tick={{ fontSize: isMobile ? 9 : 11, fill: chartColors.recharts.tick }}
                  tickLine={false}
                  axisLine={{ stroke: chartColors.recharts.grid, strokeOpacity: 0.5 }}
                  minTickGap={isMobile ? 60 : 40}
                  hide={showMACD}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[0, 100]}
                  stroke={chartColors.recharts.axis}
                  tick={{ fontSize: isMobile ? 9 : 11, fill: chartColors.recharts.tick }}
                  tickLine={false}
                  axisLine={{ stroke: chartColors.recharts.grid, strokeOpacity: 0.5 }}
                  width={isMobile ? 35 : 60}
                  tickCount={5}
                />
                <Tooltip content={<RSITooltip />} />

                <ReferenceLine
                  y={70}
                  stroke={chartColors.rsi.overbought.line}
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
                />
                <ReferenceLine
                  y={30}
                  stroke={chartColors.rsi.oversold.line}
                  strokeDasharray="3 3"
                  strokeOpacity={0.5}
                />
                <ReferenceLine y={50} stroke={chartColors.recharts.grid} strokeOpacity={0.5} />

                <Line
                  type="monotone"
                  dataKey="rsi"
                  stroke={chartColors.rsi.line}
                  strokeWidth={isMobile ? 1 : 1.5}
                  dot={false}
                  activeDot={{ r: isMobile ? 2 : 3, strokeWidth: 0, fill: chartColors.rsi.line }}
                />

                {!showMACD && (
                  <Brush
                    dataKey="time"
                    height={isMobile ? 18 : 25}
                    stroke={chartColors.recharts.primaryLight}
                    fill={chartColors.recharts.backgroundLight}
                    tickFormatter={() => ''}
                    onChange={onBrushChange}
                    startIndex={brushStartIndex}
                    endIndex={brushEndIndex}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {showMACD && (
          <div className={`${isMobile ? 'mt-1' : 'mt-2'}`}>
            <div className="flex items-center justify-between px-2 mb-1">
              <span
                className={`font-medium ${isMobile ? 'text-[10px]' : 'text-xs'}`}
                style={{ color: baseColors.gray[600] }}
              >
                {t('priceChart.macd')}
              </span>
              <span
                className={`${isMobile ? 'text-[10px]' : 'text-xs'}`}
                style={{ color: baseColors.gray[400] }}
              >
                {t('priceChart.macdPeriod')}
              </span>
            </div>
            <ResponsiveContainer width="100%" height={chartHeights.macd}>
              <ComposedChart
                data={dataWithPrediction}
                margin={{ top: 5, right: isMobile ? 5 : 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={chartColors.recharts.grid}
                  strokeOpacity={0.3}
                  vertical={false}
                />
                <XAxis
                  dataKey="time"
                  stroke={chartColors.recharts.axis}
                  tick={{ fontSize: isMobile ? 9 : 11, fill: chartColors.recharts.tick }}
                  tickLine={false}
                  axisLine={{ stroke: chartColors.recharts.grid, strokeOpacity: 0.5 }}
                  minTickGap={isMobile ? 60 : 40}
                  interval="preserveStartEnd"
                />
                <YAxis
                  stroke={chartColors.recharts.axis}
                  tick={{ fontSize: isMobile ? 9 : 11, fill: chartColors.recharts.tick }}
                  tickLine={false}
                  axisLine={{ stroke: chartColors.recharts.grid, strokeOpacity: 0.5 }}
                  width={isMobile ? 35 : 60}
                />
                <Tooltip content={<MACDTooltip />} />

                <ReferenceLine y={0} stroke={chartColors.recharts.grid} strokeOpacity={0.8} />

                <Bar dataKey="macdHistogram" barSize={isMobile ? 1 : 2}>
                  {dataWithPrediction.map((entry, index) => (
                    <Cell
                      key={`macd-cell-${index}`}
                      fill={
                        (entry.macdHistogram || 0) >= 0
                          ? chartColors.macd.histogram.positive
                          : chartColors.macd.histogram.negative
                      }
                    />
                  ))}
                </Bar>

                <Line
                  type="monotone"
                  dataKey="macd"
                  stroke={chartColors.macd.line}
                  strokeWidth={isMobile ? 1 : 1.5}
                  dot={false}
                  activeDot={{ r: isMobile ? 2 : 3, strokeWidth: 0, fill: chartColors.macd.line }}
                />

                <Line
                  type="monotone"
                  dataKey="macdSignal"
                  stroke={chartColors.macd.signal}
                  strokeWidth={isMobile ? 1 : 1.5}
                  dot={false}
                  activeDot={{ r: isMobile ? 2 : 3, strokeWidth: 0, fill: chartColors.macd.signal }}
                />

                <Brush
                  dataKey="time"
                  height={isMobile ? 18 : 25}
                  stroke={chartColors.recharts.primaryLight}
                  fill={chartColors.recharts.backgroundLight}
                  tickFormatter={() => ''}
                  onChange={onBrushChange}
                  startIndex={brushStartIndex}
                  endIndex={brushEndIndex}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {showAnomalyStats && anomalyDetectionEnabled && anomalies.length > 0 && (
        <div className="mt-4"></div>
      )}

      {chartType === 'line' && (
        <div
          className={`flex items-center justify-center gap-4 mt-3 flex-wrap ${isMobile ? 'gap-2' : ''}`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`${isMobile ? 'w-2 h-0.5' : 'w-3 h-0.5'}`}
              style={{ backgroundColor: chartColors.recharts.primary }}
            />
            <span
              className={`${isMobile ? 'text-[10px]' : 'text-xs'}`}
              style={{ color: baseColors.gray[500] }}
            >
              {t('priceChart.price')}
            </span>
          </div>
          {comparison.enabled && (
            <div className="flex items-center gap-2">
              <span
                className={`${isMobile ? 'w-2 h-0.5' : 'w-3 h-0.5'}`}
                style={{ borderTop: `2px dashed ${chartColors.recharts.purple}` }}
              />
              <span
                className={`${isMobile ? 'text-[10px]' : 'text-xs'}`}
                style={{ color: baseColors.gray[500] }}
              >
                {t('priceChart.comparisonPrice')}
              </span>
            </div>
          )}
          {showMA7 && (
            <div className="flex items-center gap-2">
              <span
                className={`${isMobile ? 'w-2 h-0.5' : 'w-3 h-0.5'}`}
                style={{ borderTop: `2px dashed ${chartColors.recharts.warning}` }}
              />
              <span
                className={`${isMobile ? 'text-[10px]' : 'text-xs'}`}
                style={{ color: baseColors.gray[500] }}
              >
                {t('priceChart.ma7')}
              </span>
            </div>
          )}
          {!isMobile && showBollingerBands && (
            <>
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded"
                  style={{
                    backgroundColor: `${chartColors.recharts.purple}1A`,
                    border: `1px dashed ${chartColors.recharts.purple}`,
                  }}
                />
                <span className="text-xs" style={{ color: baseColors.gray[500] }}>
                  {t('priceChart.bollingerBands')}
                </span>
              </div>
            </>
          )}
          {!isMobile && showRSI && (
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-0.5"
                style={{ backgroundColor: semanticColors.success.DEFAULT }}
              />
              <span className="text-xs" style={{ color: baseColors.gray[500] }}>
                {t('priceChart.rsi')}
              </span>
            </div>
          )}
          {!isMobile && showMACD && (
            <>
              <div className="flex items-center gap-2">
                <span className="w-3 h-0.5" style={{ backgroundColor: chartColors.macd.line }} />
                <span className="text-xs" style={{ color: baseColors.gray[500] }}>
                  {t('priceChart.macd')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-0.5" style={{ backgroundColor: chartColors.macd.signal }} />
                <span className="text-xs" style={{ color: baseColors.gray[500] }}>
                  {t('priceChart.signal')}
                </span>
              </div>
            </>
          )}
          {!isMobile && showVolume && (
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded"
                style={{ backgroundColor: `${semanticColors.success.DEFAULT}4D` }}
              />
              <span className="text-xs" style={{ color: baseColors.gray[500] }}>
                {t('priceChart.volume')}
              </span>
            </div>
          )}
          {anomalyDetectionEnabled && anomalies.length > 0 && (
            <div className="flex items-center gap-2">
              <span
                className={`${isMobile ? 'w-2 h-2' : 'w-3 h-3'}`}
                style={{ backgroundColor: semanticColors.danger.DEFAULT }}
              />
              <span
                className={`${isMobile ? 'text-[10px]' : 'text-xs'}`}
                style={{ color: baseColors.gray[500] }}
              >
                {t('priceChart.anomalyPoints')} ({anomalies.length})
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export { PriceChart as default };
