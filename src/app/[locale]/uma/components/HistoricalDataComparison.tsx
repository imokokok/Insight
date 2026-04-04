'use client';

import { useState, useMemo, useCallback, memo } from 'react';

import {
  Calendar,
  Download,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  DollarSign,
  Users,
  Scale,
  BarChart3,
  Clock,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Area,
  Bar,
  ReferenceLine,
} from 'recharts';

import { useTranslations } from '@/i18n';
import { chartColors, baseColors, semanticColors } from '@/lib/config/colors';
import { type UMANetworkStats } from '@/lib/oracles/uma/types';
import { formatNumber } from '@/lib/utils/format';

export type TimeRangeOption = '24h' | '7d' | '30d' | '90d' | '1y' | 'custom';

export interface HistoricalDataPoint {
  timestamp: number;
  date: string;
  price: number;
  volume: number;
  tvl: number;
  validators: number;
  disputes: number;
  disputeSuccessRate: number;
}

export interface TrendAnalysis {
  direction: 'up' | 'down' | 'stable';
  strength: number;
  supportLevel: number;
  resistanceLevel: number;
  movingAverages: {
    ma7: number;
    ma30: number;
    ma90: number;
  };
  prediction: {
    nextValue: number;
    confidence: number;
    trend: 'bullish' | 'bearish' | 'neutral';
  };
}

export interface HistoricalDataComparisonProps {
  networkStats?: UMANetworkStats | null;
  currentPrice?: number;
  isLoading?: boolean;
}

function useTimeRangeConfig() {
  const t = useTranslations();
  return {
    '24h': {
      label: t('uma.market.timeRange.24h'),
      days: 1,
      description: t('uma.market.timeRange.24h'),
    },
    '7d': {
      label: t('uma.market.timeRange.7d'),
      days: 7,
      description: t('uma.market.timeRange.7d'),
    },
    '30d': {
      label: t('uma.market.timeRange.30d'),
      days: 30,
      description: t('uma.market.timeRange.30d'),
    },
    '90d': {
      label: t('uma.market.timeRange.90d'),
      days: 90,
      description: t('uma.market.timeRange.90d'),
    },
    '1y': {
      label: t('uma.market.timeRange.1y'),
      days: 365,
      description: t('uma.market.timeRange.1y'),
    },
    custom: {
      label: t('uma.market.timeRange.custom'),
      days: 0,
      description: t('uma.market.timeRange.custom'),
    },
  } as const;
}

const CHART_COLORS = {
  price: chartColors.recharts.primary,
  volume: chartColors.recharts.warning,
  tvl: chartColors.recharts.purple,
  validators: chartColors.recharts.success,
  disputes: chartColors.recharts.danger,
  ma7: chartColors.recharts.cyan,
  ma30: chartColors.recharts.pink,
  ma90: chartColors.recharts.indigo,
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number | string; color: string }>;
  label?: string;
  yAxisFormatter?: (value: number) => string;
}

function CustomTooltip({ active, payload, label, yAxisFormatter }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-white p-4 border border-gray-200 rounded-lg min-w-[200px] shadow-lg">
      <p className="text-sm font-semibold mb-2 text-gray-900">{label}</p>
      <div className="space-y-1.5">
        {payload.map((entry, index: number) => (
          <div key={index} className="flex justify-between items-center">
            <span className="text-xs text-gray-600">{entry.name}</span>
            <span className="text-sm font-medium font-mono" style={{ color: entry.color }}>
              {typeof entry.value === 'number' && yAxisFormatter
                ? yAxisFormatter(entry.value)
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function generateHistoricalData(
  days: number,
  currentPrice: number,
  networkStats?: UMANetworkStats | null
): HistoricalDataPoint[] {
  const now = Date.now();
  const data: HistoricalDataPoint[] = [];
  const basePrice = currentPrice || 3.5;
  const baseVolume = 15000000;
  const baseTVL = 50000000;
  const baseValidators = networkStats?.activeValidators || 850;
  const baseDisputes = networkStats?.totalDisputes || 1250;

  for (let i = days - 1; i >= 0; i--) {
    const timestamp = now - i * 24 * 60 * 60 * 1000;
    const date = new Date(timestamp);

    const priceVariation = Math.sin(i * 0.1) * 0.15;
    const price = basePrice * (1 + priceVariation);

    const volumeVariation = Math.sin(i * 0.15) * 0.3;
    const volume = baseVolume * (1 + volumeVariation);

    const tvlVariation = Math.sin(i * 0.05) * 0.1;
    const tvl = baseTVL * (1 + tvlVariation);

    const validatorsVariation = 0;
    const validators = Math.round(baseValidators * (1 + validatorsVariation));

    const disputesVariation = Math.sin(i * 0.2) * 0.2;
    const disputes = Math.round((baseDisputes * (1 + disputesVariation)) / (days / 30));

    const disputeSuccessRate = networkStats?.disputeSuccessRate || 78;

    data.push({
      timestamp,
      date: date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }),
      price: Math.round(price * 100) / 100,
      volume: Math.round(volume),
      tvl: Math.round(tvl),
      validators,
      disputes,
      disputeSuccessRate: Math.round(disputeSuccessRate * 10) / 10,
    });
  }

  return data;
}

function calculateTrendAnalysis(data: HistoricalDataPoint[]): TrendAnalysis {
  if (data.length < 2) {
    return {
      direction: 'stable',
      strength: 0,
      supportLevel: data[0]?.price || 0,
      resistanceLevel: data[0]?.price || 0,
      movingAverages: { ma7: 0, ma30: 0, ma90: 0 },
      prediction: { nextValue: data[0]?.price || 0, confidence: 0, trend: 'neutral' },
    };
  }

  const prices = data.map((d) => d.price);
  const lastPrice = prices[prices.length - 1];
  const firstPrice = prices[0];
  const priceChange = ((lastPrice - firstPrice) / firstPrice) * 100;

  const direction: 'up' | 'down' | 'stable' =
    priceChange > 2 ? 'up' : priceChange < -2 ? 'down' : 'stable';

  const strength = Math.min(100, Math.abs(priceChange) * 10);

  const sortedPrices = [...prices].sort((a, b) => a - b);
  const supportLevel = sortedPrices[Math.floor(sortedPrices.length * 0.1)];
  const resistanceLevel = sortedPrices[Math.floor(sortedPrices.length * 0.9)];

  const calculateMA = (period: number): number => {
    const slice = prices.slice(-period);
    return slice.reduce((sum, p) => sum + p, 0) / slice.length;
  };

  const ma7 = calculateMA(Math.min(7, prices.length));
  const ma30 = calculateMA(Math.min(30, prices.length));
  const ma90 = calculateMA(Math.min(90, prices.length));

  const recentTrend = prices.slice(-5);
  const avgRecentChange =
    recentTrend.slice(1).reduce((sum, p, i) => sum + (p - recentTrend[i]) / recentTrend[i], 0) / 4;

  const predictedNext = lastPrice * (1 + avgRecentChange);
  const confidence = Math.min(95, Math.max(30, 70 - Math.abs(priceChange) * 2));

  let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (ma7 > ma30 && lastPrice > ma7) {
    trend = 'bullish';
  } else if (ma7 < ma30 && lastPrice < ma7) {
    trend = 'bearish';
  }

  return {
    direction,
    strength,
    supportLevel,
    resistanceLevel,
    movingAverages: { ma7, ma30, ma90 },
    prediction: {
      nextValue: Math.round(predictedNext * 100) / 100,
      confidence: Math.round(confidence),
      trend,
    },
  };
}

function TimeRangeSelector({
  selectedRange,
  onRangeChange,
  customDateRange,
  onCustomDateChange,
}: {
  selectedRange: TimeRangeOption;
  onRangeChange: (range: TimeRangeOption) => void;
  customDateRange: { start: Date | null; end: Date | null };
  onCustomDateChange: (range: { start: Date | null; end: Date | null }) => void;
}) {
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const timeRangeConfig = useTimeRangeConfig();

  const ranges: TimeRangeOption[] = ['24h', '7d', '30d', '90d', '1y', 'custom'];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {ranges.map((range) => (
          <button
            key={range}
            onClick={() => {
              onRangeChange(range);
              if (range === 'custom') {
                setShowCustomPicker(true);
              } else {
                setShowCustomPicker(false);
              }
            }}
            className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
              selectedRange === range
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {timeRangeConfig[range].label}
          </button>
        ))}
      </div>

      {showCustomPicker && selectedRange === 'custom' && (
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={customDateRange.start?.toISOString().split('T')[0] || ''}
              onChange={(e) =>
                onCustomDateChange({ ...customDateRange, start: new Date(e.target.value) })
              }
              className="px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <span className="text-gray-400">至</span>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={customDateRange.end?.toISOString().split('T')[0] || ''}
              onChange={(e) =>
                onCustomDateChange({ ...customDateRange, end: new Date(e.target.value) })
              }
              className="px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ChartTypeSelector({
  selectedType,
  onTypeChange,
}: {
  selectedType: 'price' | 'volume' | 'tvl' | 'validators' | 'disputes';
  onTypeChange: (type: 'price' | 'volume' | 'tvl' | 'validators' | 'disputes') => void;
}) {
  const t = useTranslations();
  const types: Array<{
    type: 'price' | 'volume' | 'tvl' | 'validators' | 'disputes';
    label: string;
    icon: React.ReactNode;
  }> = [
    { type: 'price', label: t('uma.market.price'), icon: <DollarSign className="w-4 h-4" /> },
    { type: 'volume', label: t('uma.market.volume24h'), icon: <BarChart3 className="w-4 h-4" /> },
    { type: 'tvl', label: t('uma.ecosystem.tvl'), icon: <Activity className="w-4 h-4" /> },
    { type: 'validators', label: t('uma.validators.title'), icon: <Users className="w-4 h-4" /> },
    { type: 'disputes', label: t('uma.disputes.title'), icon: <Scale className="w-4 h-4" /> },
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
      {types.map((item) => (
        <button
          key={item.type}
          onClick={() => onTypeChange(item.type)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-all ${
            selectedType === item.type
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
}

function ComparisonChart({
  data,
  chartType,
  showMA,
  trendAnalysis,
}: {
  data: HistoricalDataPoint[];
  chartType: 'price' | 'volume' | 'tvl' | 'validators' | 'disputes';
  showMA: boolean;
  trendAnalysis: TrendAnalysis;
}) {
  const t = useTranslations();

  const dataKeyMap = {
    price: 'price',
    volume: 'volume',
    tvl: 'tvl',
    validators: 'validators',
    disputes: 'disputes',
  };

  const yAxisFormatter = (value: number): string => {
    switch (chartType) {
      case 'price':
        return `$${value.toFixed(2)}`;
      case 'volume':
      case 'tvl':
        return `$${(value / 1e6).toFixed(1)}M`;
      case 'validators':
        return value.toString();
      case 'disputes':
        return value.toString();
      default:
        return value.toString();
    }
  };

  const chartData = useMemo(() => {
    return data.map((point, index) => ({
      ...point,
      ma7: showMA && index >= 6 ? trendAnalysis.movingAverages.ma7 : null,
      ma30: showMA && index >= 29 ? trendAnalysis.movingAverages.ma30 : null,
    }));
  }, [data, showMA, trendAnalysis]);

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} />
          <XAxis
            dataKey="date"
            stroke={chartColors.recharts.axis}
            tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
            minTickGap={30}
          />
          <YAxis
            stroke={chartColors.recharts.axis}
            tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
            tickFormatter={yAxisFormatter}
            domain={['auto', 'auto']}
          />
          <RechartsTooltip content={<CustomTooltip yAxisFormatter={yAxisFormatter} />} />
          <Legend />

          {chartType === 'volume' && (
            <Bar
              dataKey="volume"
              fill={CHART_COLORS.volume}
              fillOpacity={0.6}
              name={t('uma.market.volumeLabel')}
              radius={[4, 4, 0, 0]}
            />
          )}

          {chartType !== 'volume' && (
            <Area
              type="monotone"
              dataKey={dataKeyMap[chartType]}
              stroke={CHART_COLORS[chartType]}
              fill={CHART_COLORS[chartType]}
              fillOpacity={0.2}
              name={
                chartType === 'price'
                  ? t('uma.market.priceLabel')
                  : chartType === 'tvl'
                    ? t('uma.market.tvlLabel')
                    : chartType === 'validators'
                      ? t('uma.market.validatorsLabel')
                      : t('uma.market.disputesLabel')
              }
            />
          )}

          {showMA && chartType === 'price' && (
            <>
              <Line
                type="monotone"
                dataKey="ma7"
                stroke={CHART_COLORS.ma7}
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="5 5"
                name="MA7"
              />
              <Line
                type="monotone"
                dataKey="ma30"
                stroke={CHART_COLORS.ma30}
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="10 5"
                name="MA30"
              />
            </>
          )}

          {chartType === 'price' && (
            <>
              <ReferenceLine
                y={trendAnalysis.supportLevel}
                stroke={semanticColors.success.DEFAULT}
                strokeDasharray="3 3"
                label={{ value: t('uma.market.support'), position: 'right', fontSize: 10 }}
              />
              <ReferenceLine
                y={trendAnalysis.resistanceLevel}
                stroke={semanticColors.danger.DEFAULT}
                strokeDasharray="3 3"
                label={{ value: t('uma.market.resistance'), position: 'right', fontSize: 10 }}
              />
            </>
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function TrendIndicator({ trendAnalysis }: { trendAnalysis: TrendAnalysis }) {
  const t = useTranslations();
  const directionConfig = {
    up: {
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      label: t('uma.market.trend.up'),
    },
    down: {
      icon: <TrendingDown className="w-5 h-5" />,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      label: t('uma.market.trend.down'),
    },
    stable: {
      icon: <Minus className="w-5 h-5" />,
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
      label: t('uma.market.trend.stable'),
    },
  };

  const trendConfig = {
    bullish: {
      label: t('uma.market.bullish'),
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
    bearish: { label: t('uma.market.bearish'), color: 'text-red-600', bgColor: 'bg-red-100' },
    neutral: { label: t('uma.market.neutral'), color: 'text-gray-600', bgColor: 'bg-gray-100' },
  };

  const config = directionConfig[trendAnalysis.direction];
  const predictionConfig = trendConfig[trendAnalysis.prediction.trend];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">{t('uma.market.trendDirection')}</p>
          <div className={`flex items-center gap-2 ${config.color}`}>
            {config.icon}
            <span className="font-semibold">{config.label}</span>
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">{t('uma.market.trendStrength')}</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full ${
                  trendAnalysis.strength > 60
                    ? 'bg-emerald-500'
                    : trendAnalysis.strength > 30
                      ? 'bg-amber-500'
                      : 'bg-gray-400'
                }`}
                style={{ width: `${trendAnalysis.strength}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-gray-700">
              {trendAnalysis.strength.toFixed(0)}%
            </span>
          </div>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">{t('uma.market.support')}</p>
          <p className="text-lg font-semibold text-emerald-600">
            ${trendAnalysis.supportLevel.toFixed(2)}
          </p>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 mb-1">{t('uma.market.resistance')}</p>
          <p className="text-lg font-semibold text-red-600">
            ${trendAnalysis.resistanceLevel.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">
              {t('uma.market.trendPrediction')}
            </span>
          </div>
          <span className={`px-2 py-0.5 text-xs font-medium rounded ${predictionConfig.bgColor}`}>
            {predictionConfig.label}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-blue-600 mb-1">{t('uma.market.predictedPrice')}</p>
            <p className="text-lg font-semibold text-blue-900">
              ${trendAnalysis.prediction.nextValue.toFixed(2)}
            </p>
          </div>
          <div>
            <p className="text-xs text-blue-600 mb-1">{t('uma.market.confidence')}</p>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-blue-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500"
                  style={{ width: `${trendAnalysis.prediction.confidence}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-blue-900">
                {trendAnalysis.prediction.confidence}%
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs text-blue-600 mb-1">{t('uma.market.movingAverage')}</p>
            <div className="flex items-center gap-2 text-xs text-blue-700">
              <span>MA7: ${trendAnalysis.movingAverages.ma7.toFixed(2)}</span>
              <span>MA30: ${trendAnalysis.movingAverages.ma30.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DataExporter({
  data,
  timeRange,
}: {
  data: HistoricalDataPoint[];
  timeRange: TimeRangeOption;
}) {
  const t = useTranslations();

  const exportToCSV = useCallback(() => {
    const headers = [
      t('uma.market.date'),
      t('uma.market.price') + '($)',
      t('uma.market.volumeLabel') + '($)',
      'TVL($)',
      t('uma.market.validatorsLabel'),
      t('uma.market.disputesLabel'),
      t('uma.market.disputeSuccessRateLabel') + '(%)',
    ];
    const rows = data.map((d) => [
      d.date,
      d.price,
      d.volume,
      d.tvl,
      d.validators,
      d.disputes,
      d.disputeSuccessRate,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `uma-historical-data-${timeRange}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [data, timeRange, t]);

  const exportToJSON = useCallback(() => {
    const jsonContent = JSON.stringify(
      {
        exportDate: new Date().toISOString(),
        timeRange,
        dataPoints: data.length,
        data,
      },
      null,
      2
    );
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `uma-historical-data-${timeRange}-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [data, timeRange]);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={exportToCSV}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
      >
        <Download className="w-4 h-4" />
        <span>CSV</span>
      </button>
      <button
        onClick={exportToJSON}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
      >
        <Download className="w-4 h-4" />
        <span>JSON</span>
      </button>
    </div>
  );
}

export function HistoricalDataComparison({
  networkStats,
  currentPrice = 3.5,
  isLoading = false,
}: HistoricalDataComparisonProps) {
  const t = useTranslations();
  const timeRangeConfig = useTimeRangeConfig();
  const [selectedRange, setSelectedRange] = useState<TimeRangeOption>('30d');
  const [customDateRange, setCustomDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  const [chartType, setChartType] = useState<
    'price' | 'volume' | 'tvl' | 'validators' | 'disputes'
  >('price');
  const [showMA, setShowMA] = useState(true);

  const days = useMemo(() => {
    if (selectedRange === 'custom' && customDateRange.start && customDateRange.end) {
      return Math.ceil(
        (customDateRange.end.getTime() - customDateRange.start.getTime()) / (1000 * 60 * 60 * 24)
      );
    }
    return timeRangeConfig[selectedRange].days;
  }, [selectedRange, customDateRange, timeRangeConfig]);

  const historicalData = useMemo(() => {
    return generateHistoricalData(days, currentPrice, networkStats);
  }, [days, currentPrice, networkStats]);

  const trendAnalysis = useMemo(() => {
    return calculateTrendAnalysis(historicalData);
  }, [historicalData]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-80 bg-gray-100 rounded-lg animate-pulse" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {t('uma.market.historicalDataComparison')}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {timeRangeConfig[selectedRange].description} ·{' '}
            {t('uma.market.dataPoints', { count: historicalData.length })}
          </p>
        </div>
        <DataExporter data={historicalData} timeRange={selectedRange} />
      </div>

      <div className="p-4 bg-gray-50 rounded-lg">
        <TimeRangeSelector
          selectedRange={selectedRange}
          onRangeChange={setSelectedRange}
          customDateRange={customDateRange}
          onCustomDateChange={setCustomDateRange}
        />
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <ChartTypeSelector selectedType={chartType} onTypeChange={setChartType} />
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showMA}
            onChange={(e) => setShowMA(e.target.checked)}
            className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
          />
          <span className="text-sm text-gray-600">{t('uma.market.showMovingAverage')}</span>
        </label>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <ComparisonChart
          data={historicalData}
          chartType={chartType}
          showMA={showMA && chartType === 'price'}
          trendAnalysis={trendAnalysis}
        />
      </div>

      <div className="border-t border-gray-200 pt-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-gray-400" />
          <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
            {t('uma.market.trendAnalysisAndPrediction')}
          </h4>
        </div>
        <TrendIndicator trendAnalysis={trendAnalysis} />
      </div>

      <div className="p-4 bg-amber-50 rounded-lg border border-amber-100">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-amber-800 mb-1">
              {t('uma.market.disclaimer')}
            </h4>
            <p className="text-xs text-amber-700">{t('uma.market.disclaimerText')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default HistoricalDataComparison;
