'use client';

import { useState, useEffect, useMemo, useCallback, useRef, memo } from 'react';
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
import { BaseOracleClient } from '@/lib/oracles/base';
import { BandProtocolClient, HistoricalPricePoint } from '@/lib/oracles/bandProtocol';
import { UMAClient } from '@/lib/oracles/uma';
import { Blockchain } from '@/lib/types/oracle';
import { TimeRange } from './TabNavigation';
import { AnomalyMarker, AnomalyPoint } from './AnomalyMarker';
import { ChartExportButton } from './ChartExportButton';
import { MoreOptionsDropdown } from './MoreOptionsDropdown';
import { useTimeRange, SelectedTimeRange } from '@/contexts/TimeRangeContext';
import { ChartExportData } from '@/utils/chartExport';
import { downsampleData } from '@/utils/downsampling';
import { ChartSkeleton } from '@/components/ui/ChartSkeleton';
import { createLogger } from '@/lib/utils/logger';
import { chartColors } from '@/lib/config/colors';
import { useUMARealtimePrice, UMAPriceData } from '@/hooks/useUMARealtime';
import { useTechnicalIndicators, IndicatorDataPoint } from '@/hooks/useTechnicalIndicators';
import { useChartZoom, useBrushZoom } from '@/hooks/useChartZoom';

const logger = createLogger('PriceChart');

const CHART_SETTINGS_STORAGE_KEY = 'priceChart_settings';

interface ChartSettings {
  anomalyDetectionEnabled: boolean;
  showPredictionInterval: boolean;
  confidenceLevel: ConfidenceLevel;
  comparisonEnabled: boolean;
}

function loadChartSettings(): ChartSettings | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(CHART_SETTINGS_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    logger.warn('Failed to load chart settings', e instanceof Error ? e : new Error(String(e)));
  }
  return null;
}

function saveChartSettings(settings: ChartSettings): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CHART_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    logger.warn('Failed to save chart settings', e instanceof Error ? e : new Error(String(e)));
  }
}

function useChartSettings() {
  const [settings, setSettings] = useState<ChartSettings>({
    anomalyDetectionEnabled: true,
    showPredictionInterval: false,
    confidenceLevel: 95,
    comparisonEnabled: false,
  });
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = loadChartSettings();
    if (saved) {
      setSettings((prev) => ({ ...prev, ...saved }));
    }
    setIsLoaded(true);
  }, []);

  const updateSettings = useCallback((updates: Partial<ChartSettings>) => {
    setSettings((prev) => {
      const newSettings = { ...prev, ...updates };
      saveChartSettings(newSettings);
      return newSettings;
    });
  }, []);

  return { settings, updateSettings, isLoaded };
}

type ScreenSize = 'mobile' | 'tablet' | 'desktop';

function useScreenSize(): ScreenSize {
  const [screenSize, setScreenSize] = useState<ScreenSize>('desktop');

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setScreenSize('mobile');
      } else if (width < 1024) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return screenSize;
}

type ChartType = 'line' | 'candlestick';
type DataGranularity = 'minute' | 'hour' | 'day';
type ConfidenceLevel = 90 | 95 | 99;

interface TimeRangeOption {
  value: TimeRange;
  label: string;
  hours: number;
}

interface ComparisonPeriod {
  enabled: boolean;
  period1Start: string;
  period1End: string;
  period2Start: string;
  period2End: string;
}

const TIME_RANGE_OPTIONS: TimeRangeOption[] = [
  { value: '1H', label: '1H', hours: 1 },
  { value: '24H', label: '24H', hours: 24 },
  { value: '7D', label: '7D', hours: 24 * 7 },
  { value: '30D', label: '30D', hours: 24 * 30 },
  { value: '90D', label: '90D', hours: 24 * 90 },
  { value: '1Y', label: '1Y', hours: 24 * 365 },
];

const TIME_RANGE_CONFIG: Record<TimeRange, { hours: number; interval: number; label: string }> = {
  '1H': { hours: 1, interval: 2, label: '1小时' },
  '24H': { hours: 24, interval: 30, label: '24小时' },
  '7D': { hours: 24 * 7, interval: 4, label: '7天' },
  '30D': { hours: 24 * 30, interval: 24, label: '30天' },
  '90D': { hours: 24 * 90, interval: 72, label: '90天' },
  '1Y': { hours: 24 * 365, interval: 168, label: '1年' },
  ALL: { hours: 24 * 365 * 2, interval: 336, label: '全部' },
};

const GRANULARITY_CONFIG: Record<DataGranularity, { intervalMinutes: number; label: string }> = {
  minute: { intervalMinutes: 1, label: '分钟' },
  hour: { intervalMinutes: 60, label: '小时' },
  day: { intervalMinutes: 1440, label: '天' },
};

const CONFIDENCE_Z_SCORES: Record<ConfidenceLevel, number> = {
  90: 1.645,
  95: 1.96,
  99: 2.576,
};

function calculatePredictionIntervals(
  data: IndicatorDataPoint[],
  windowSize: number = 20,
  confidenceLevel: ConfidenceLevel
): IndicatorDataPoint[] {
  const zScore = CONFIDENCE_Z_SCORES[confidenceLevel];

  return data.map((point, index) => {
    if (index < windowSize - 1) {
      return {
        ...point,
        predictionUpper: point.price,
        predictionLower: point.price,
        predictionMean: point.price,
      };
    }

    const windowData = data.slice(index - windowSize + 1, index + 1);
    const prices = windowData.map((d) => d.price);

    const mean = prices.reduce((sum, p) => sum + p, 0) / windowSize;

    const squaredDiffs = prices.map((p) => Math.pow(p - mean, 2));
    const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / windowSize;
    const stdDev = Math.sqrt(variance);

    const upper = mean + zScore * stdDev;
    const lower = mean - zScore * stdDev;

    return {
      ...point,
      predictionUpper: upper,
      predictionLower: lower,
      predictionMean: mean,
    };
  });
}

function generateHistoricalData(basePrice: number, timeRange: TimeRange): IndicatorDataPoint[] {
  const config = TIME_RANGE_CONFIG[timeRange];
  const now = Date.now();
  const dataPoints: IndicatorDataPoint[] = [];

  const totalMinutes = config.hours * 60;
  const dataCount = Math.min(Math.floor(totalMinutes / config.interval), 500);

  let currentPrice = basePrice;
  const volatility = 0.015;

  for (let i = dataCount; i >= 0; i--) {
    const timestamp = now - i * config.interval * 60 * 1000;
    const date = new Date(timestamp);

    const change = (Math.random() - 0.5) * 2 * volatility;
    const open = currentPrice;
    const close = currentPrice * (1 + change);
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);

    const volumeBase = 1000000 + Math.random() * 2000000;
    const volume = Math.floor(volumeBase * (1 + Math.abs(change) * 10));

    let timeLabel: string;
    if (config.hours <= 24) {
      timeLabel = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (config.hours <= 24 * 7) {
      timeLabel = date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
      });
    } else {
      timeLabel = date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    }

    dataPoints.push({
      time: timeLabel,
      timestamp,
      price: close,
      volume,
      open,
      high,
      low,
      close,
    });

    currentPrice = close;
  }

  return dataPoints;
}

function convertHistoricalPricePoints(
  points: HistoricalPricePoint[],
  isComparison: boolean = false
): IndicatorDataPoint[] {
  return points.map((point) => {
    const date = new Date(point.timestamp);
    let timeLabel: string;
    const hoursDiff = (Date.now() - point.timestamp) / (1000 * 60 * 60);

    if (hoursDiff <= 24) {
      timeLabel = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (hoursDiff <= 24 * 7) {
      timeLabel = date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
      });
    } else {
      timeLabel = date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    }

    return {
      time: timeLabel,
      timestamp: point.timestamp,
      price: point.price,
      volume: point.volume,
      open: point.open,
      high: point.high,
      low: point.low,
      close: point.close,
      ma7: point.ma7,
      ma20: point.ma20,
      isComparison,
    };
  });
}

function generateDataWithGranularity(
  basePrice: number,
  startDate: Date,
  endDate: Date,
  granularity: DataGranularity
): IndicatorDataPoint[] {
  const dataPoints: IndicatorDataPoint[] = [];
  const granularityConfig = GRANULARITY_CONFIG[granularity];
  const intervalMs = granularityConfig.intervalMinutes * 60 * 1000;

  const startTime = startDate.getTime();
  const endTime = endDate.getTime();
  let currentPrice = basePrice;
  const volatility = 0.015;

  for (let timestamp = startTime; timestamp <= endTime; timestamp += intervalMs) {
    const date = new Date(timestamp);
    const change = (Math.random() - 0.5) * 2 * volatility;
    const open = currentPrice;
    const close = currentPrice * (1 + change);
    const high = Math.max(open, close) * (1 + Math.random() * 0.01);
    const low = Math.min(open, close) * (1 - Math.random() * 0.01);

    const volumeBase = 1000000 + Math.random() * 2000000;
    const volume = Math.floor(volumeBase * (1 + Math.abs(change) * 10));

    let timeLabel: string;
    if (granularity === 'minute') {
      timeLabel = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } else if (granularity === 'hour') {
      timeLabel = date.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
      });
    } else {
      timeLabel = date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
    }

    dataPoints.push({
      time: timeLabel,
      timestamp,
      price: close,
      volume,
      open,
      high,
      low,
      close,
    });

    currentPrice = close;
  }

  return dataPoints;
}

// ==================== Tooltip 组件 ====================

const MainChartTooltip = memo(function MainChartTooltip({
  active,
  payload,
  label,
  chartType,
  showBollingerBands,
  showRSI,
  showMACD,
  isMobile,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string; payload: IndicatorDataPoint }>;
  label?: string;
  chartType: ChartType;
  showBollingerBands: boolean;
  showRSI: boolean;
  showMACD: boolean;
  isMobile?: boolean;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  const isUp = data.close !== undefined && data.open !== undefined ? data.close >= data.open : true;

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-xl ${isMobile ? 'p-2 max-w-[200px]' : 'p-3 max-w-xs'}`}>
      <p className={`text-gray-600 mb-2 font-medium ${isMobile ? 'text-[10px]' : 'text-xs'}`}>{label}</p>

      {chartType === 'candlestick' && data.open !== undefined ? (
        <div className="space-y-1">
          <div className={`flex justify-between gap-4 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
            <span className="text-gray-500">开盘:</span>
            <span className="text-gray-900 font-mono">${data.open.toFixed(4)}</span>
          </div>
          <div className={`flex justify-between gap-4 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
            <span className="text-gray-500">最高:</span>
            <span className="text-green-600 font-mono">${data.high?.toFixed(4)}</span>
          </div>
          <div className={`flex justify-between gap-4 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
            <span className="text-gray-500">最低:</span>
            <span className="text-red-600 font-mono">${data.low?.toFixed(4)}</span>
          </div>
          <div className={`flex justify-between gap-4 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
            <span className="text-gray-500">收盘:</span>
            <span className={`font-mono ${isUp ? 'text-green-600' : 'text-red-600'}`}>
              ${data.close?.toFixed(4)}
            </span>
          </div>
        </div>
      ) : (
        <div className={`flex justify-between gap-4 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
          <span className="text-gray-500">价格:</span>
          <span className="text-blue-600 font-mono">${data.price.toFixed(4)}</span>
        </div>
      )}

      {data.ma7 !== undefined && chartType === 'line' && (
        <div className={`flex justify-between gap-4 mt-1 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
          <span className="text-gray-500">MA7:</span>
          <span className="text-amber-600 font-mono">${data.ma7.toFixed(4)}</span>
        </div>
      )}

      {!isMobile && data.ma14 !== undefined && chartType === 'line' && (
        <div className="flex justify-between gap-4 text-xs mt-1">
          <span className="text-gray-500">MA14:</span>
          <span className="text-blue-600 font-mono">${data.ma14.toFixed(4)}</span>
        </div>
      )}

      {!isMobile && data.ma30 !== undefined && chartType === 'line' && (
        <div className="flex justify-between gap-4 text-xs mt-1">
          <span className="text-gray-500">MA30:</span>
          <span className="text-purple-600 font-mono">${data.ma30.toFixed(4)}</span>
        </div>
      )}

      {showBollingerBands && !isMobile && data.bbUpper !== undefined && (
        <div className="space-y-1 mt-2 pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-400 font-medium">布林带</p>
          <div className="flex justify-between gap-4 text-xs">
            <span className="text-gray-500">上轨:</span>
            <span className="text-purple-500 font-mono">${data.bbUpper.toFixed(4)}</span>
          </div>
          <div className="flex justify-between gap-4 text-xs">
            <span className="text-gray-500">中轨:</span>
            <span className="text-purple-400 font-mono">${data.bbMiddle?.toFixed(4)}</span>
          </div>
          <div className="flex justify-between gap-4 text-xs">
            <span className="text-gray-500">下轨:</span>
            <span className="text-purple-500 font-mono">${data.bbLower?.toFixed(4)}</span>
          </div>
        </div>
      )}

      {data.predictionUpper !== undefined && data.predictionLower !== undefined && data.predictionUpper !== null && data.predictionLower !== null && (
        <div className={`space-y-1 mt-2 pt-2 border-t border-gray-200 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">预测上界:</span>
            <span className="text-blue-600 font-mono">${Number(data.predictionUpper).toFixed(4)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">预测下界:</span>
            <span className="text-blue-600 font-mono">${Number(data.predictionLower).toFixed(4)}</span>
          </div>
        </div>
      )}

      <div className={`flex justify-between gap-4 mt-2 pt-2 border-t border-gray-200 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
        <span className="text-gray-500">成交量:</span>
        <span className="text-gray-700 font-mono">{(data.volume / 1000000).toFixed(2)}M</span>
      </div>

      {showRSI && !isMobile && data.rsi !== undefined && (
        <div className="flex justify-between gap-4 text-xs mt-1">
          <span className="text-gray-500">RSI:</span>
          <span className={`font-mono ${data.rsi > 70 ? 'text-red-500' : data.rsi < 30 ? 'text-green-500' : 'text-gray-700'}`}>
            {data.rsi.toFixed(2)}
          </span>
        </div>
      )}

      {showMACD && !isMobile && data.macd !== undefined && (
        <div className="space-y-1 mt-2 pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-400 font-medium">MACD</p>
          <div className="flex justify-between gap-4 text-xs">
            <span className="text-gray-500">MACD:</span>
            <span className="text-blue-600 font-mono">{data.macd.toFixed(4)}</span>
          </div>
          <div className="flex justify-between gap-4 text-xs">
            <span className="text-gray-500">信号:</span>
            <span className="text-orange-600 font-mono">{data.macdSignal?.toFixed(4)}</span>
          </div>
          <div className="flex justify-between gap-4 text-xs">
            <span className="text-gray-500">柱状:</span>
            <span className={`font-mono ${(data.macdHistogram || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {data.macdHistogram?.toFixed(4)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

const RSITooltip = memo(function RSITooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string; payload: IndicatorDataPoint }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0]?.payload;
  if (!data || data.rsi === undefined) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-2 shadow-xl">
      <p className="text-gray-600 text-xs mb-1 font-medium">{label}</p>
      <div className="flex justify-between gap-4 text-xs">
        <span className="text-gray-500">RSI:</span>
        <span className={`font-mono font-medium ${data.rsi > 70 ? 'text-red-500' : data.rsi < 30 ? 'text-green-500' : 'text-gray-900'}`}>
          {data.rsi.toFixed(2)}
        </span>
      </div>
    </div>
  );
});

const MACDTooltip = memo(function MACDTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string; payload: IndicatorDataPoint }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-2 shadow-xl">
      <p className="text-gray-600 text-xs mb-1 font-medium">{label}</p>
      <div className="space-y-1">
        <div className="flex justify-between gap-4 text-xs">
          <span className="text-gray-500">MACD:</span>
          <span className="text-blue-600 font-mono">{data.macd?.toFixed(4)}</span>
        </div>
        <div className="flex justify-between gap-4 text-xs">
          <span className="text-gray-500">信号:</span>
          <span className="text-orange-600 font-mono">{data.macdSignal?.toFixed(4)}</span>
        </div>
        <div className="flex justify-between gap-4 text-xs">
          <span className="text-gray-500">柱状:</span>
          <span className={`font-mono ${(data.macdHistogram || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {data.macdHistogram?.toFixed(4)}
          </span>
        </div>
      </div>
    </div>
  );
});

const CandlestickShape = memo(function CandlestickShape(props: {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  payload?: IndicatorDataPoint;
}) {
  const { x = 0, y = 0, width = 0, payload } = props;
  if (!payload) return null;

  const { open, high, low, close } = payload;
  if (open === undefined || high === undefined || low === undefined || close === undefined) {
    return null;
  }

  const isUp = close >= open;
  const color = isUp ? '#10b981' : '#f43f5e';
  const bodyHeight = Math.abs(close - open);

  const centerX = x + width / 2;

  return (
    <g>
      <line
        x1={centerX}
        y1={y}
        x2={centerX}
        y2={y + (props.height || 0)}
        stroke={color}
        strokeWidth={1}
      />
      <rect
        x={x + width * 0.2}
        y={y + (isUp ? 0 : (props.height || 0) * 0.5)}
        width={width * 0.6}
        height={Math.max(bodyHeight, 2)}
        fill={color}
        rx={1}
      />
    </g>
  );
});

// ==================== 主组件 ====================

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
  const screenSize = useScreenSize();
  const { globalTimeRange, selectedTimeRange, registerTimeRangeCallback, unregisterTimeRangeCallback, syncEnabled } = useTimeRange();
  const { settings: chartSettings, updateSettings: updateChartSettings, isLoaded: chartSettingsLoaded } = useChartSettings();
  
  // 使用新的技术指标 Hook
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

  const [chartType] = useState<ChartType>('line');
  const [rawData, setRawData] = useState<IndicatorDataPoint[]>([]);
  const [data, setData] = useState<IndicatorDataPoint[]>([]);
  const [comparisonData, setComparisonData] = useState<IndicatorDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const realtimeEnabled = enableRealtime;
  const abortControllerRef = useRef<AbortController | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const lastRealtimeUpdateRef = useRef<number>(Date.now());

  // 同步缩放状态
  const [brushRange, setBrushRange] = useState<{ startIndex?: number; endIndex?: number }>({});
  const [brushStartIndex, setBrushStartIndex] = useState<number | undefined>(undefined);
  const [brushEndIndex, setBrushEndIndex] = useState<number | undefined>(undefined);
  const [isTransitioning, setIsTransitioning] = useState(false);

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

  const {
    anomalyDetectionEnabled,
    showPredictionInterval,
    confidenceLevel,
  } = chartSettings;

  const timeRange = globalTimeRange;

  const isBandClient = client instanceof BandProtocolClient;
  const isUMAClient = client instanceof UMAClient;

  // 使用 BrushZoom Hook
  const brushZoom = useBrushZoom({
    dataLength: data.length,
    defaultRange: isMobile ? 0.5 : 0.3, // 移动端默认显示更多数据
    minVisiblePoints: isMobile ? 5 : 10,
  });

  // 计算图表高度分配 - 移动端优化
  const chartHeights = useMemo(() => {
    // 移动端最小高度限制
    const minHeight = isMobile ? 300 : 400;
    const availableHeight = Math.max(minHeight, height - (showToolbar ? (isMobile ? 140 : 180) : 0));
    const gap = isMobile ? 4 : 8;

    if (showRSI && showMACD) {
      const mainHeight = Math.floor((availableHeight - gap * 2) * 0.6);
      const subHeight = Math.floor((availableHeight - gap * 2) * 0.2);
      return { main: Math.max(mainHeight, isMobile ? 180 : 240), rsi: Math.max(subHeight, isMobile ? 60 : 80), macd: Math.max(subHeight, isMobile ? 60 : 80) };
    } else if (showRSI || showMACD) {
      const mainHeight = Math.floor((availableHeight - gap) * 0.7);
      const subHeight = Math.floor((availableHeight - gap) * 0.3);
      return { main: Math.max(mainHeight, isMobile ? 200 : 280), rsi: showRSI ? Math.max(subHeight, isMobile ? 80 : 100) : 0, macd: showMACD ? Math.max(subHeight, isMobile ? 80 : 100) : 0 };
    } else {
      return { main: availableHeight, rsi: 0, macd: 0 };
    }
  }, [height, showToolbar, isMobile, showRSI, showMACD]);

  // 使用技术指标 Hook 计算指标
  useEffect(() => {
    if (rawData.length > 0) {
      const dataWithIndicators = calculateIndicatorsFn(rawData);
      setData(dataWithIndicators);
    }
  }, [rawData, calculateIndicatorsFn]);

  // UMA 实时价格数据订阅
  const handlePriceUpdate = useCallback((priceData: UMAPriceData) => {
    const now = Date.now();
    if (now - lastRealtimeUpdateRef.current < 1000) return;
    lastRealtimeUpdateRef.current = now;

    setCurrentPrice(priceData.price);

    setRawData((prevData) => {
      if (prevData.length === 0) return prevData;

      const lastPoint = prevData[prevData.length - 1];
      const newTimestamp = now;
      const newTime = new Date(newTimestamp).toLocaleTimeString('zh-CN', {
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
  }, []);

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
  }, [chain, client, symbol, timeRange, defaultPrice, isBandClient]);

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
  }, [comparison, client, symbol, chain, granularity, isBandClient]);

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
  }, [fetchData, fetchComparisonData, comparison.enabled]);

  const handleComparisonApply = useCallback(() => {
    if (
      comparison.period1Start &&
      comparison.period1End &&
      comparison.period2Start &&
      comparison.period2End
    ) {
      setComparison((prev) => ({ ...prev, enabled: true }));
    }
  }, [comparison.period1Start, comparison.period1End, comparison.period2Start, comparison.period2End]);

  const priceRange = useMemo(() => {
    if (data.length === 0) return { min: 0, max: 100 };
    const allData = comparison.enabled ? [...data, ...comparisonData] : data;
    const prices = allData.map((d) => d.price);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const padding = (max - min) * 0.1;
    return { min: min - padding, max: max + padding };
  }, [data, comparisonData, comparison.enabled]);

  const volumeRange = useMemo(() => {
    if (data.length === 0) return { min: 0, max: 1000000 };
    const allData = comparison.enabled ? [...data, ...comparisonData] : data;
    const volumes = allData.map((d) => d.volume);
    const max = Math.max(...volumes);
    return { min: 0, max: max * 3 };
  }, [data, comparisonData, comparison.enabled]);

  const priceChange = useMemo(() => {
    if (data.length < 2) return { value: 0, percent: 0 };
    const first = data[0].price;
    const last = data[data.length - 1].price;
    const change = last - first;
    const percent = (change / first) * 100;
    return { value: change, percent };
  }, [data]);

  const detectedAnomalies = useMemo(() => {
    if (!anomalyDetectionEnabled || data.length < 10) return [];

    const prices = data.map((d) => d.price);
    const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const squaredDiffs = prices.map((p) => Math.pow(p - mean, 2));
    const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / prices.length;
    const stdDev = Math.sqrt(variance);

    const anomalyThreshold = 2 * stdDev;

    const detected: AnomalyPoint[] = [];

    data.forEach((point) => {
      const deviation = Math.abs(point.price - mean);
      if (deviation > anomalyThreshold) {
        const deviationInSigma = deviation / stdDev;
        const deviationPercent = ((point.price - mean) / mean) * 100;

        detected.push({
          timestamp: point.timestamp,
          price: point.price,
          deviation: deviationInSigma,
          type: point.price > mean ? 'spike' : 'drop',
          time: point.time,
          deviationPercent: Math.abs(deviationPercent),
          absoluteDeviation: deviation,
        });
      }
    });

    return detected;
  }, [data, anomalyDetectionEnabled]);

  useEffect(() => {
    setAnomalies(detectedAnomalies);
  }, [detectedAnomalies]);

  const dataWithPrediction = useMemo(() => {
    if (!showPredictionInterval || data.length === 0) return data;
    return calculatePredictionIntervals(data, 20, confidenceLevel);
  }, [data, showPredictionInterval, confidenceLevel]);

  // 处理 Brush 变化（同步缩放）
  const handleBrushChange = useCallback((range: { startIndex?: number; endIndex?: number }) => {
    setBrushRange(range);
    brushZoom.handleBrushChange(range);
    if (range.startIndex !== undefined && range.endIndex !== undefined) {
      setBrushStartIndex(range.startIndex);
      setBrushEndIndex(range.endIndex);
    }
  }, [brushZoom]);

  // 监听 TimeRangeContext 的时间范围变化
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
  }, [selectedTimeRange, data, syncEnabled]);

  // 注册时间范围变化回调
  useEffect(() => {
    const handleTimeRangeChange = (range: SelectedTimeRange) => {
      logger.info('Time range changed from external source', { range });
    };

    registerTimeRangeCallback(handleTimeRangeChange);
    return () => unregisterTimeRangeCallback(handleTimeRangeChange);
  }, [registerTimeRangeCallback, unregisterTimeRangeCallback]);

  if (loading || !indicatorsLoaded) {
    return <ChartSkeleton height={height} showToolbar={showToolbar} variant="price" />;
  }

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

  const connectionStatusText = useMemo(() => {
    switch (umaConnectionStatus) {
      case 'connected':
        return '实时';
      case 'connecting':
        return '连接中';
      case 'reconnecting':
        return '重连中';
      default:
        return '断开';
    }
  }, [umaConnectionStatus]);

  const connectionStatusClass = useMemo(() => {
    switch (umaConnectionStatus) {
      case 'connected':
        return 'bg-green-500 animate-pulse';
      case 'connecting':
      case 'reconnecting':
        return 'bg-yellow-500 animate-pulse';
      default:
        return 'bg-red-500';
    }
  }, [umaConnectionStatus]);

  return (
    <div className="h-full flex flex-col">
      {showToolbar && (
        <div className={`flex flex-col gap-2 ${isMobile ? 'mb-2' : 'mb-3'}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div>
                <span className={`font-bold text-gray-900 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                  ${currentPrice.toFixed(4)}
                </span>
                <span
                  className={`ml-2 text-sm font-medium ${
                    priceChange.percent >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {priceChange.percent >= 0 ? '+' : ''}
                  {priceChange.percent.toFixed(2)}%
                </span>
              </div>
              {isUMAClient && realtimeEnabled && (
                <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded-full">
                  <span className={`w-2 h-2 rounded-full ${connectionStatusClass}`} />
                  <span className="text-xs text-gray-600">{connectionStatusText}</span>
                  {umaRealtimePrice && (
                    <span className="text-xs text-gray-500">
                      置信度: {(umaRealtimePrice.confidence * 100).toFixed(1)}%
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
                anomaliesCount={anomalies.length}
                onToggleComparison={() => setShowComparisonPanel(!showComparisonPanel)}
                onToggleAnomalyDetection={() =>
                  updateChartSettings({ anomalyDetectionEnabled: !anomalyDetectionEnabled })
                }
                onTogglePredictionInterval={() =>
                  updateChartSettings({ showPredictionInterval: !showPredictionInterval })
                }
                onConfidenceLevelChange={(level) => updateChartSettings({ confidenceLevel: level })}
                onShowAnomalyStats={() => setShowAnomalyStats(!showAnomalyStats)}
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

          {/* 指标控制面板 - 移动端优化 */}
          <div className={`flex flex-wrap items-center gap-2 ${isMobile ? 'gap-1' : ''}`}>
            {!isMobile && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">粒度:</span>
                <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                  {(Object.keys(GRANULARITY_CONFIG) as DataGranularity[]).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGranularity(g)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${
                        granularity === g
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      {GRANULARITY_CONFIG[g].label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-gray-500 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>指标:</span>
              <div className={`flex items-center gap-1 bg-gray-100 rounded-lg p-1 flex-wrap ${isMobile ? 'max-w-[calc(100vw-80px)]' : ''}`}>
                {/* 主图指标 */}
                {!isMobile && (
                  <button
                    onClick={toggleBollingerBands}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 min-h-[44px] min-w-[44px] ${
                      showBollingerBands
                        ? 'bg-white text-purple-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    title="布林带"
                  >
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    布林带
                  </button>
                )}
                <button
                  onClick={toggleMA7}
                  className={`px-3 py-1.5 font-medium rounded-md transition-colors flex items-center gap-1.5 min-h-[44px] min-w-[44px] ${isMobile ? 'text-[10px] px-2' : 'text-xs'} ${
                    showMA7
                      ? 'bg-white text-amber-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                  title="7日移动平均线"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  MA7
                </button>
                {!isMobile && (
                  <button
                    onClick={toggleMA14}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 min-h-[44px] min-w-[44px] ${
                      showMA14
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    title="14日移动平均线"
                  >
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    MA14
                  </button>
                )}
                {!isMobile && (
                  <button
                    onClick={toggleMA30}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 min-h-[44px] min-w-[44px] ${
                      showMA30
                        ? 'bg-white text-indigo-600 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    title="30日移动平均线"
                  >
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    MA30
                  </button>
                )}

                {/* 副图指标 - 仅桌面端显示 */}
                {!isMobile && (
                  <>
                    <div className="w-px h-4 bg-gray-300 mx-1" />
                    <button
                      onClick={toggleRSI}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 min-h-[44px] min-w-[44px] ${
                        showRSI
                          ? 'bg-white text-green-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                      title="相对强弱指标"
                    >
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      RSI
                    </button>
                    <button
                      onClick={toggleMACD}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 min-h-[44px] min-w-[44px] ${
                        showMACD
                          ? 'bg-white text-red-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                      title="指数平滑异同移动平均线"
                    >
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      MACD
                    </button>

                    {/* 成交量 */}
                    <div className="w-px h-4 bg-gray-300 mx-1" />
                    <button
                      onClick={toggleVolume}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 min-h-[44px] min-w-[44px] ${
                        showVolume
                          ? 'bg-white text-cyan-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                      title="成交量"
                    >
                      <span className="w-2 h-2 rounded-full bg-cyan-500" />
                      成交量
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {showComparisonPanel && (
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
              <h4 className="text-sm font-medium text-gray-700 mb-3">时间段对比</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-gray-600 font-medium">时间段 1</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={comparison.period1Start}
                      onChange={(e) =>
                        setComparison((prev) => ({ ...prev, period1Start: e.target.value }))
                      }
                      className="px-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                    <span className="text-xs text-gray-400">至</span>
                    <input
                      type="date"
                      value={comparison.period1End}
                      onChange={(e) =>
                        setComparison((prev) => ({ ...prev, period1End: e.target.value }))
                      }
                      className="px-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-600 font-medium">时间段 2</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={comparison.period2Start}
                      onChange={(e) =>
                        setComparison((prev) => ({ ...prev, period2Start: e.target.value }))
                      }
                      className="px-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                    <span className="text-xs text-gray-400">至</span>
                    <input
                      type="date"
                      value={comparison.period2End}
                      onChange={(e) =>
                        setComparison((prev) => ({ ...prev, period2End: e.target.value }))
                      }
                      className="px-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={handleComparisonApply}
                  disabled={
                    !comparison.period1Start ||
                    !comparison.period1End ||
                    !comparison.period2Start ||
                    !comparison.period2End
                  }
                  className="px-3 py-1.5 text-xs font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed min-h-[44px] min-w-[44px]"
                >
                  开始对比
                </button>
                <button
                  onClick={() => {
                    setComparison({
                      enabled: false,
                      period1Start: '',
                      period1End: '',
                      period2Start: '',
                      period2End: '',
                    });
                    setShowComparisonPanel(false);
                  }}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-md hover:bg-gray-50 min-h-[44px] min-w-[44px]"
                >
                  取消对比
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div
        ref={chartContainerRef}
        className={`flex-1 min-h-0 bg-gray-50 rounded-lg transition-all duration-300 ${isRefreshing ? 'ring-2 ring-blue-400 ring-opacity-50' : ''} ${isMobile ? 'p-1' : 'p-2 sm:p-4'}`}
        style={{ opacity: chartOpacity }}
      >
        {/* 主图区域 */}
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
              minTickGap={isMobile ? 60 : 30}
              hide={showRSI || showMACD}
              interval={isMobile ? 'preserveStartEnd' : 0}
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
                  <span className="text-xs text-gray-600">
                    {value === 'price' ? '时间段 1' : '时间段 2'}
                  </span>
                )}
              />
            )}

            {/* 成交量 */}
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
                {/* 布林带 */}
                {showBollingerBands && (
                  <>
                    <Area
                      yAxisId="price"
                      type="monotone"
                      dataKey="bbUpper"
                      stroke="none"
                      fill="#a855f7"
                      fillOpacity={0.1}
                      dot={false}
                      activeDot={false}
                    />
                    <Area
                      yAxisId="price"
                      type="monotone"
                      dataKey="bbLower"
                      stroke="none"
                      fill="#ffffff"
                      fillOpacity={1}
                      dot={false}
                      activeDot={false}
                    />
                    <Line
                      yAxisId="price"
                      type="monotone"
                      dataKey="bbUpper"
                      stroke="#a855f7"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                      dot={false}
                      activeDot={false}
                    />
                    <Line
                      yAxisId="price"
                      type="monotone"
                      dataKey="bbMiddle"
                      stroke="#c084fc"
                      strokeWidth={1.5}
                      dot={false}
                      activeDot={false}
                    />
                    <Line
                      yAxisId="price"
                      type="monotone"
                      dataKey="bbLower"
                      stroke="#a855f7"
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

                {/* 价格线 */}
                <Line
                  yAxisId="price"
                  type="monotone"
                  dataKey="price"
                  stroke={chartColors.recharts.primaryLight}
                  strokeWidth={isMobile ? 1.5 : 2}
                  dot={false}
                  activeDot={{ r: isMobile ? 3 : 4, strokeWidth: 0, fill: chartColors.recharts.primaryDark }}
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
                    activeDot={{ r: isMobile ? 3 : 4, strokeWidth: 0, fill: chartColors.recharts.purpleDark }}
                    name="comparison"
                  />
                )}

                {/* 移动平均线 */}
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
                    stroke="#3b82f6"
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
                    stroke="#8b5cf6"
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
                    stroke="#22c55e"
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
                    stroke="#06b6d4"
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

            {/* Brush - 移动端优化高度 */}
            {!showRSI && !showMACD && (
              <Brush
                dataKey="time"
                height={isMobile ? 20 : 30}
                stroke={chartColors.recharts.primaryLight}
                fill={chartColors.recharts.backgroundLight}
                tickFormatter={() => ''}
                onChange={handleBrushChange}
                startIndex={brushStartIndex}
                endIndex={brushEndIndex}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>

        {/* RSI 副图 */}
        {showRSI && (
          <div className={`${isMobile ? 'mt-1' : 'mt-2'}`}>
            <div className="flex items-center justify-between px-2 mb-1">
              <span className={`font-medium text-gray-600 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>RSI</span>
              <span className={`text-gray-400 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>14周期</span>
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
                  minTickGap={isMobile ? 60 : 30}
                  hide={showMACD}
                  interval={isMobile ? 'preserveStartEnd' : 0}
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

                <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.5} />
                <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="3 3" strokeOpacity={0.5} />
                <ReferenceLine y={50} stroke={chartColors.recharts.grid} strokeOpacity={0.5} />

                <Line
                  type="monotone"
                  dataKey="rsi"
                  stroke="#22c55e"
                  strokeWidth={isMobile ? 1 : 1.5}
                  dot={false}
                  activeDot={{ r: isMobile ? 2 : 3, strokeWidth: 0, fill: '#22c55e' }}
                />

                {!showMACD && (
                  <Brush
                    dataKey="time"
                    height={isMobile ? 18 : 25}
                    stroke={chartColors.recharts.primaryLight}
                    fill={chartColors.recharts.backgroundLight}
                    tickFormatter={() => ''}
                    onChange={handleBrushChange}
                    startIndex={brushStartIndex}
                    endIndex={brushEndIndex}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* MACD 副图 */}
        {showMACD && (
          <div className={`${isMobile ? 'mt-1' : 'mt-2'}`}>
            <div className="flex items-center justify-between px-2 mb-1">
              <span className={`font-medium text-gray-600 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>MACD</span>
              <span className={`text-gray-400 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>12,26,9</span>
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
                  minTickGap={isMobile ? 60 : 30}
                  interval={isMobile ? 'preserveStartEnd' : 0}
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
                      fill={(entry.macdHistogram || 0) >= 0 ? '#22c55e' : '#ef4444'}
                    />
                  ))}
                </Bar>

                <Line
                  type="monotone"
                  dataKey="macd"
                  stroke="#3b82f6"
                  strokeWidth={isMobile ? 1 : 1.5}
                  dot={false}
                  activeDot={{ r: isMobile ? 2 : 3, strokeWidth: 0, fill: '#3b82f6' }}
                />

                <Line
                  type="monotone"
                  dataKey="macdSignal"
                  stroke="#f97316"
                  strokeWidth={isMobile ? 1 : 1.5}
                  dot={false}
                  activeDot={{ r: isMobile ? 2 : 3, strokeWidth: 0, fill: '#f97316' }}
                />

                <Brush
                  dataKey="time"
                  height={isMobile ? 18 : 25}
                  stroke={chartColors.recharts.primaryLight}
                  fill={chartColors.recharts.backgroundLight}
                  tickFormatter={() => ''}
                  onChange={handleBrushChange}
                  startIndex={brushStartIndex}
                  endIndex={brushEndIndex}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {showAnomalyStats && anomalyDetectionEnabled && anomalies.length > 0 && (
        <div className="mt-4">
          {/* AnomalyStatsPanel component would go here */}
        </div>
      )}

      {/* 图例 - 移动端简化 */}
      {chartType === 'line' && (
        <div className={`flex items-center justify-center gap-4 mt-3 flex-wrap ${isMobile ? 'gap-2' : ''}`}>
          <div className="flex items-center gap-2">
            <span className={`bg-blue-500 rounded-full ${isMobile ? 'w-2 h-0.5' : 'w-3 h-0.5'}`} />
            <span className={`text-gray-500 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>价格</span>
          </div>
          {comparison.enabled && (
            <div className="flex items-center gap-2">
              <span
                className={`bg-purple-500 rounded-full ${isMobile ? 'w-2 h-0.5' : 'w-3 h-0.5'}`}
                style={{ borderTop: '2px dashed #8b5cf6' }}
              />
              <span className={`text-gray-500 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>对比价格</span>
            </div>
          )}
          {showMA7 && (
            <div className="flex items-center gap-2">
              <span
                className={`bg-amber-500 rounded-full border-dashed ${isMobile ? 'w-2 h-0.5' : 'w-3 h-0.5'}`}
                style={{ borderTop: '2px dashed #f59e0b' }}
              />
              <span className={`text-gray-500 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>MA7</span>
            </div>
          )}
          {!isMobile && showBollingerBands && (
            <>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-purple-500/10 border border-purple-500 border-dashed rounded" />
                <span className="text-xs text-gray-500">布林带</span>
              </div>
            </>
          )}
          {!isMobile && showRSI && (
            <div className="flex items-center gap-2">
              <span className="w-3 h-0.5 bg-green-500 rounded-full" />
              <span className="text-xs text-gray-500">RSI</span>
            </div>
          )}
          {!isMobile && showMACD && (
            <>
              <div className="flex items-center gap-2">
                <span className="w-3 h-0.5 bg-blue-500 rounded-full" />
                <span className="text-xs text-gray-500">MACD</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-0.5 bg-orange-500 rounded-full" />
                <span className="text-xs text-gray-500">信号</span>
              </div>
            </>
          )}
          {!isMobile && showVolume && (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500/30 rounded" />
              <span className="text-xs text-gray-500">成交量</span>
            </div>
          )}
          {anomalyDetectionEnabled && anomalies.length > 0 && (
            <div className="flex items-center gap-2">
              <span className={`bg-red-500 rounded-full ${isMobile ? 'w-2 h-2' : 'w-3 h-3'}`} />
              <span className={`text-gray-500 ${isMobile ? 'text-[10px]' : 'text-xs'}`}>异常点 ({anomalies.length})</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
