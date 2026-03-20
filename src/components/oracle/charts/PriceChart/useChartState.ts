'use client';

import { useState, useCallback, useRef } from 'react';
import { IndicatorDataPoint } from '@/hooks/useTechnicalIndicators';
import { TimeRange } from '../../common/TabNavigation';
import { DataGranularity, ComparisonPeriod } from './priceChartConfig';

export interface ChartState {
  chartType: 'line' | 'candlestick';
  rawData: IndicatorDataPoint[];
  data: IndicatorDataPoint[];
  comparisonData: IndicatorDataPoint[];
  isLoading: boolean;
  currentPrice: number;
  granularity: DataGranularity;
  comparison: ComparisonPeriod;
  showComparisonPanel: boolean;
  anomalies: AnomalyPoint[];
  showAnomalyStats: boolean;
  isRefreshing: boolean;
  chartOpacity: number;
  brushRange: { startIndex?: number; endIndex?: number };
  brushStartIndex: number | undefined;
  brushEndIndex: number | undefined;
  isTransitioning: boolean;
}

export interface AnomalyPoint {
  timestamp: number;
  price: number;
  deviation: number;
  type: 'spike' | 'drop';
  time: string;
  deviationPercent: number;
  absoluteDeviation: number;
}

export function useChartState() {
  const [chartType] = useState<'line' | 'candlestick'>('line');
  const [rawData, setRawData] = useState<IndicatorDataPoint[]>([]);
  const [data, setData] = useState<IndicatorDataPoint[]>([]);
  const [comparisonData, setComparisonData] = useState<IndicatorDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [granularity, setGranularity] = useState<DataGranularity>('hour');
  const [comparison, setComparison] = useState<ComparisonPeriod>({
    enabled: false,
    period1Start: '',
    period1End: '',
    period2Start: '',
    period2End: '',
  });
  const [showComparisonPanel, setShowComparisonPanel] = useState(false);
  const [anomalies, setAnomalies] = useState<AnomalyPoint[]>([]);
  const [showAnomalyStats, setShowAnomalyStats] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [chartOpacity, setChartOpacity] = useState(1);
  const [brushRange, setBrushRange] = useState<{ startIndex?: number; endIndex?: number }>({});
  const [brushStartIndex, setBrushStartIndex] = useState<number | undefined>(undefined);
  const [brushEndIndex, setBrushEndIndex] = useState<number | undefined>(undefined);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastRealtimeUpdateRef = useRef<number>(Date.now());

  const handleBrushChange = useCallback(
    (
      range: { startIndex?: number; endIndex?: number },
      brushZoom?: { handleBrushChange: (range: { startIndex?: number; endIndex?: number }) => void }
    ) => {
      setBrushRange(range);
      brushZoom?.handleBrushChange(range);
      if (range.startIndex !== undefined && range.endIndex !== undefined) {
        setBrushStartIndex(range.startIndex);
        setBrushEndIndex(range.endIndex);
      }
    },
    []
  );

  const handleComparisonApply = useCallback(() => {
    if (
      comparison.period1Start &&
      comparison.period1End &&
      comparison.period2Start &&
      comparison.period2End
    ) {
      setComparison((prev) => ({ ...prev, enabled: true }));
    }
  }, [comparison]);

  const cancelComparison = useCallback(() => {
    setComparison({
      enabled: false,
      period1Start: '',
      period1End: '',
      period2Start: '',
      period2End: '',
    });
    setShowComparisonPanel(false);
  }, []);

  return {
    chartType,
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
  };
}
