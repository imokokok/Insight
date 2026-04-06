'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';


import {
  useTechnicalIndicators,
  type IndicatorDataPoint,
  useUMARealtimePrice,
  type UMAPriceData,
} from '@/hooks';
import { type BaseOracleClient } from '@/lib/oracles/base';
import { TellorClient } from '@/lib/oracles/tellor';
import { UMAClient } from '@/lib/oracles/uma';
import {
  downsampleData,
  shouldDownsample,
  getDownsamplingMetrics,
  type AdaptiveDownsampleConfig,
  type DataPoint,
} from '@/lib/utils/downsampling';
import { createLogger } from '@/lib/utils/logger';
import { useGlobalTimeRange } from '@/stores/uiStore';
import { type Blockchain } from '@/types/oracle';

import {
  calculatePriceRange,
  calculateVolumeRange,
  calculatePriceChange,
  detectAnomalies,
} from './chartUtils';
import { type DataGranularity, type TimeRange } from './priceChartConfig';
import {
  generateHistoricalData,
  convertHistoricalPricePoints,
  generateDataWithGranularity,
} from './priceChartUtils';
import { useChartState, type AnomalyPoint } from './useChartState';

const logger = createLogger('usePriceChartData');

interface UsePriceChartDataProps {
  client: BaseOracleClient;
  symbol: string;
  chain?: Blockchain;
  defaultPrice?: number;
  enableRealtime?: boolean;
  downsamplingConfig?: AdaptiveDownsampleConfig;
  autoDownsample?: boolean;
  isMobile: boolean;
}

interface UsePriceChartDataReturn {
  data: IndicatorDataPoint[];
  comparisonData: IndicatorDataPoint[];
  rawData: IndicatorDataPoint[];
  setRawData: React.Dispatch<React.SetStateAction<IndicatorDataPoint[]>>;
  isLoading: boolean;
  currentPrice: number;
  setCurrentPrice: React.Dispatch<React.SetStateAction<number>>;
  granularity: DataGranularity;
  setGranularity: React.Dispatch<React.SetStateAction<DataGranularity>>;
  comparison: {
    enabled: boolean;
    period1Start: string;
    period1End: string;
    period2Start: string;
    period2End: string;
  };
  setComparison: React.Dispatch<
    React.SetStateAction<{
      enabled: boolean;
      period1Start: string;
      period1End: string;
      period2Start: string;
      period2End: string;
    }>
  >;
  anomalies: AnomalyPoint[];
  setAnomalies: React.Dispatch<React.SetStateAction<AnomalyPoint[]>>;
  isRefreshing: boolean;
  setIsRefreshing: React.Dispatch<React.SetStateAction<boolean>>;
  chartOpacity: number;
  setChartOpacity: React.Dispatch<React.SetStateAction<number>>;
  brushStartIndex: number | undefined;
  setBrushStartIndex: React.Dispatch<React.SetStateAction<number | undefined>>;
  brushEndIndex: number | undefined;
  setBrushEndIndex: React.Dispatch<React.SetStateAction<number | undefined>>;
  isTransitioning: boolean;
  setIsTransitioning: React.Dispatch<React.SetStateAction<boolean>>;
  abortControllerRef: React.MutableRefObject<AbortController | null>;
  lastRealtimeUpdateRef: React.MutableRefObject<number>;
  priceRange: { min: number; max: number };
  volumeRange: { min: number; max: number };
  priceChange: { value: number; percent: number };
  detectedAnomalies: AnomalyPoint[];
  isTellorClient: boolean;
  isUMAClient: boolean;
  umaRealtimePrice: { confidence: number } | null;
  umaConnectionStatus: string;
  showMA7: boolean;
  showMA14: boolean;
  showMA30: boolean;
  showMA60: boolean;
  showMA20: boolean;
  showBollingerBands: boolean;
  showRSI: boolean;
  showMACD: boolean;
  showVolume: boolean;
  toggleMA7: () => void;
  toggleMA14: () => void;
  toggleMA30: () => void;
  toggleMA60: () => void;
  toggleMA20: () => void;
  toggleBollingerBands: () => void;
  toggleRSI: () => void;
  toggleMACD: () => void;
  toggleVolume: () => void;
  indicatorsLoaded: boolean;
  fetchData: () => Promise<void>;
  fetchComparisonData: () => Promise<void>;
  applyDownsampling: (data: DataPoint[]) => DataPoint[];
  handlePriceUpdate: (priceData: UMAPriceData) => void;
  chartState: ReturnType<typeof useChartState>;
  calculateIndicatorsFn: (data: IndicatorDataPoint[]) => IndicatorDataPoint[];
}

export function usePriceChartData({
  client,
  symbol,
  chain,
  defaultPrice,
  enableRealtime = true,
  downsamplingConfig,
  autoDownsample = true,
  isMobile,
}: UsePriceChartDataProps): UsePriceChartDataReturn {
  const globalTimeRange = useGlobalTimeRange();
  const timeRange = globalTimeRange;

  const isTellorClient = client instanceof TellorClient;
  const isUMAClient = client instanceof UMAClient;

  const chartState = useChartState();
  const {
    rawData,
    setRawData,
    data,
    setData,
    comparisonData,
    setComparisonData,
    isLoading,
    setIsLoading,
    currentPrice,
    setCurrentPrice,
    granularity,
    setGranularity,
    comparison,
    setComparison,
    anomalies,
    setAnomalies,
    isRefreshing,
    setIsRefreshing,
    chartOpacity,
    setChartOpacity,
    brushStartIndex,
    setBrushStartIndex,
    brushEndIndex,
    setBrushEndIndex,
    isTransitioning,
    setIsTransitioning,
    abortControllerRef,
    lastRealtimeUpdateRef,
  } = chartState;

  const {
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

  useEffect(() => {
    if (rawData.length > 0) {
      const dataWithIndicators = calculateIndicatorsFn(rawData);
      setData(dataWithIndicators);
    }
  }, [rawData, calculateIndicatorsFn, setData]);

  // Initialize currentPrice with defaultPrice if provided
  useEffect(() => {
    if (defaultPrice !== undefined && defaultPrice > 0 && currentPrice === 0) {
      setCurrentPrice(defaultPrice);
    }
  }, [defaultPrice, currentPrice, setCurrentPrice]);

  const applyDownsampling = useCallback(
    (data: DataPoint[]) => {
      if (!autoDownsample) {
        return data;
      }

      const dataLength = data.length;
      if (!shouldDownsample(dataLength, 500)) {
        logger.debug('Data size within limits, skipping downsampling', {
          dataLength,
          threshold: 500,
        });
        return data;
      }

      const startTime = performance.now();
      const downsampled = downsampleData(data, {
        preservePeaks: true,
        preserveTrends: true,
        ...downsamplingConfig,
      });
      const processingTime = performance.now() - startTime;

      const metrics = getDownsamplingMetrics(dataLength, downsampled.length, processingTime);

      logger.info('Downsampling applied', {
        originalPoints: dataLength,
        downsampledPoints: downsampled.length,
        compressionRatio: `${metrics.compressionRatio.toFixed(1)}%`,
        processingTime: `${processingTime.toFixed(2)}ms`,
        efficiency: metrics.efficiency,
      });

      return downsampled;
    },
    [autoDownsample, downsamplingConfig]
  );

  const fetchData = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsRefreshing(true);
    setChartOpacity(0.3);
    setIsLoading(true);
    try {
      const priceData = await client.getPrice(symbol, chain);

      if (abortController.signal.aborted) return;

      setCurrentPrice(priceData.price);

      if (isTellorClient) {
        const tellorClient = client as TellorClient;
        const periodHours = {
          '1H': 1,
          '24H': 24,
          '7D': 24 * 7,
          '30D': 24 * 30,
          '90D': 24 * 90,
          '1Y': 24 * 365,
          ALL: 24 * 365,
        }[timeRange];
        const historicalPrices = await tellorClient.getHistoricalPrices(symbol, chain, periodHours);
        if (historicalPrices.length > 0) {
          const chartData: IndicatorDataPoint[] = historicalPrices.map((point) => ({
            time: new Date(point.timestamp).toLocaleTimeString('zh-CN', {
              hour: '2-digit',
              minute: '2-digit',
            }),
            timestamp: point.timestamp,
            price: point.price,
            volume: 0,
            open: point.price,
            high: point.price,
            low: point.price,
            close: point.price,
          }));
          const downsampledData = applyDownsampling(chartData);
          setRawData(downsampledData);
        } else {
          const historicalData = generateHistoricalData(priceData.price, timeRange);
          const downsampledData = applyDownsampling(historicalData);
          setRawData(downsampledData);
        }
      } else {
        const historicalData = generateHistoricalData(priceData.price, timeRange);
        const downsampledData = applyDownsampling(historicalData);
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
      setRawData(applyDownsampling(fallbackData));
    } finally {
      if (!abortController.signal.aborted) {
        setIsLoading(false);
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
    isTellorClient,
    abortControllerRef,
    setIsRefreshing,
    setChartOpacity,
    setIsLoading,
    setCurrentPrice,
    setRawData,
    applyDownsampling,
  ]);

  const fetchComparisonData = useCallback(async () => {
    if (
      !comparison.period1Start ||
      !comparison.period1End ||
      !comparison.period2Start ||
      !comparison.period2End
    )
      return;

    setIsLoading(true);
    try {
      const priceData = await client.getPrice(symbol, chain);
      setCurrentPrice(priceData.price);

      const period1Start = new Date(comparison.period1Start);
      const period1End = new Date(comparison.period1End);
      const period2Start = new Date(comparison.period2Start);
      const period2End = new Date(comparison.period2End);

      {
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

        setRawData(applyDownsampling(period1Data));
        setComparisonData(
          applyDownsampling(period2Data.map((d) => ({ ...d, isComparison: true })))
        );
      }
    } catch (error) {
      logger.error(
        'Error fetching comparison data',
        error instanceof Error ? error : new Error(String(error))
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    comparison,
    client,
    symbol,
    chain,
    granularity,
    setIsLoading,
    setCurrentPrice,
    setRawData,
    setComparisonData,
    applyDownsampling,
  ]);

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

        const newPoint: IndicatorDataPoint = {
          time: newTime,
          timestamp: newTimestamp,
          price: newPrice,
          volume: lastPoint.volume * (0.9 + Math.random() * 0.2),
          open: lastPoint.close || lastPoint.price,
          high:
            Math.max(lastPoint.close || lastPoint.price, newPrice) * (1 + Math.random() * 0.005),
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
      enabled: isUMAClient && enableRealtime,
      onPriceUpdate: handlePriceUpdate,
    });

  const priceRange = useMemo(
    () => calculatePriceRange(data, comparisonData, comparison.enabled),
    [data, comparisonData, comparison.enabled]
  );

  const volumeRange = useMemo(
    () => calculateVolumeRange(data, comparisonData, comparison.enabled),
    [data, comparisonData, comparison.enabled]
  );

  const priceChange = useMemo(() => calculatePriceChange(data), [data]);

  const detectedAnomalies = useMemo(() => detectAnomalies(data, true), [data]);

  return {
    data,
    comparisonData,
    rawData,
    setRawData,
    isLoading,
    currentPrice,
    setCurrentPrice,
    granularity,
    setGranularity,
    comparison,
    setComparison,
    anomalies,
    setAnomalies,
    isRefreshing,
    setIsRefreshing,
    chartOpacity,
    setChartOpacity,
    brushStartIndex,
    setBrushStartIndex,
    brushEndIndex,
    setBrushEndIndex,
    isTransitioning,
    setIsTransitioning,
    abortControllerRef,
    lastRealtimeUpdateRef,
    priceRange,
    volumeRange,
    priceChange,
    detectedAnomalies,
    isTellorClient,
    isUMAClient,
    umaRealtimePrice,
    umaConnectionStatus,
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
    indicatorsLoaded,
    fetchData,
    fetchComparisonData,
    applyDownsampling,
    handlePriceUpdate,
    chartState,
    calculateIndicatorsFn,
  };
}
