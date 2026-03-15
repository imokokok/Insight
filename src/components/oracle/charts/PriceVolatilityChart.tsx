'use client';

import { useMemo, useState } from 'react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { OracleProvider } from '@/types/oracle';
import { TooltipProps } from '@/types/ui/recharts';
import { DashboardCard } from '../common/DashboardCard';
import { VolatilityAlert } from '../common/VolatilityAlert';
import { useI18n } from '@/lib/i18n/provider';
import { chartColors, semanticColors } from '@/lib/config/colors';
import { getOracleColor } from '@/lib/oracles';

export interface PriceDataPoint {
  timestamp: number;
  price: number;
}

export interface OraclePriceHistory {
  oracle: OracleProvider;
  prices: PriceDataPoint[];
}

export interface VolatilityResult {
  oracle: OracleProvider;
  name: string;
  stdDev: number;
  mean: number;
  cv: number;
  minPrice: number;
  maxPrice: number;
  priceRange: number;
}

export interface VolatilityTrendPoint {
  period: string;
  [key: string]: string | number;
}

export interface MultiScaleVolatility {
  shortTerm: number;
  midTerm: number;
  longTerm: number;
}

export interface VolatilityDecomposition {
  timestamp: string;
  shortTerm: number;
  midTerm: number;
  longTerm: number;
  total: number;
}

export interface PriceVolatilityChartProps {
  data: OraclePriceHistory[];
  oracleNames?: Partial<Record<OracleProvider, string>>;
  showTrend?: boolean;
  className?: string;
  alertThreshold?: number;
}

const DEFAULT_ORACLE_NAMES: Record<OracleProvider, string> = {
  [OracleProvider.CHAINLINK]: 'Chainlink',
  [OracleProvider.BAND_PROTOCOL]: 'Band Protocol',
  [OracleProvider.UMA]: 'UMA',
  [OracleProvider.PYTH]: 'Pyth',
  [OracleProvider.API3]: 'API3',
  [OracleProvider.REDSTONE]: 'RedStone',
  [OracleProvider.DIA]: 'DIA',
  [OracleProvider.TELLOR]: 'Tellor',
  [OracleProvider.CHRONICLE]: 'Chronicle',
  [OracleProvider.WINKLINK]: 'WINkLink',
};

const ORACLE_COLORS: Record<OracleProvider, string> = {
  [OracleProvider.CHAINLINK]: chartColors.oracle.chainlink,
  [OracleProvider.BAND_PROTOCOL]: chartColors.oracle['band-protocol'],
  [OracleProvider.UMA]: chartColors.oracle.uma,
  [OracleProvider.PYTH]: chartColors.oracle['pyth'],
  [OracleProvider.API3]: chartColors.oracle.api3,
  [OracleProvider.REDSTONE]: chartColors.oracle.redstone,
  [OracleProvider.DIA]: chartColors.oracle.dia,
  [OracleProvider.TELLOR]: chartColors.oracle.tellor,
  [OracleProvider.CHRONICLE]: chartColors.oracle.chronicle,
  [OracleProvider.WINKLINK]: chartColors.oracle.winklink,
};

const TIME_SCALE_WINDOW = {
  short: 6,
  mid: 24,
  long: 168,
};

const TIME_SCALE_COLORS = {
  short: chartColors.sequence[0],
  mid: chartColors.sequence[1],
  long: chartColors.recharts.purple,
};

const getTimeScaleConfig = (t: (key: string) => string) => ({
  short: { label: t('priceVolatility.timeScale.short'), window: 6, color: TIME_SCALE_COLORS.short },
  mid: { label: t('priceVolatility.timeScale.mid'), window: 24, color: TIME_SCALE_COLORS.mid },
  long: { label: t('priceVolatility.timeScale.long'), window: 168, color: TIME_SCALE_COLORS.long },
});

type TimeScale = 'short' | 'mid' | 'long';

type VolatilityLevelKey = 'extremelyLow' | 'low' | 'medium' | 'high' | 'extremelyHigh';

function getVolatilityLevel(cv: number, t: (key: string) => string): {
  levelKey: VolatilityLevelKey;
  color: string;
  label: string;
} {
  if (cv < 0.5)
    return { levelKey: 'extremelyLow', color: semanticColors.success.DEFAULT, label: t('priceVolatility.level.extremelyLow') };
  if (cv < 1.0) return { levelKey: 'low', color: chartColors.sequence[0], label: t('priceVolatility.level.low') };
  if (cv < 2.0) return { levelKey: 'medium', color: semanticColors.warning.DEFAULT, label: t('priceVolatility.level.medium') };
  if (cv < 5.0) return { levelKey: 'high', color: semanticColors.danger.DEFAULT, label: t('priceVolatility.level.high') };
  return { levelKey: 'extremelyHigh', color: semanticColors.danger.dark, label: t('priceVolatility.level.extremelyHigh') };
}

function calculateStandardDeviation(prices: number[]): number {
  if (prices.length === 0) return 0;
  const mean = prices.reduce((sum, price) => sum + price, 0) / prices.length;
  const squaredDiffs = prices.map((price) => Math.pow(price - mean, 2));
  const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / prices.length;
  return Math.sqrt(variance);
}

function calculateCoefficientOfVariation(stdDev: number, mean: number): number {
  if (mean === 0) return 0;
  return (stdDev / mean) * 100;
}

function calculateVolatility(
  data: OraclePriceHistory[],
  oracleNames: Record<OracleProvider, string>
): VolatilityResult[] {
  return data.map((oracleData) => {
    const prices = oracleData.prices.map((p) => p.price);
    const mean =
      prices.length > 0 ? prices.reduce((sum, price) => sum + price, 0) / prices.length : 0;
    const stdDev = calculateStandardDeviation(prices);
    const cv = calculateCoefficientOfVariation(stdDev, mean);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
    const priceRange = maxPrice - minPrice;

    return {
      oracle: oracleData.oracle,
      name: oracleNames[oracleData.oracle] || oracleData.oracle,
      stdDev,
      mean,
      cv,
      minPrice,
      maxPrice,
      priceRange,
    };
  });
}

function calculateRollingVolatility(
  data: OraclePriceHistory[],
  windowSize: number = 5
): VolatilityTrendPoint[] {
  if (data.length === 0) return [];

  const allTimestamps = new Set<number>();
  data.forEach((oracleData) => {
    oracleData.prices.forEach((p) => allTimestamps.add(p.timestamp));
  });

  const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

  return sortedTimestamps.map((timestamp, index) => {
    const point: VolatilityTrendPoint = {
      period: new Date(timestamp).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    data.forEach((oracleData) => {
      const windowPrices: number[] = [];
      for (let i = Math.max(0, index - windowSize + 1); i <= index; i++) {
        const pricePoint = oracleData.prices.find((p) => p.timestamp === sortedTimestamps[i]);
        if (pricePoint) {
          windowPrices.push(pricePoint.price);
        }
      }

      if (windowPrices.length >= 2) {
        const stdDev = calculateStandardDeviation(windowPrices);
        const mean = windowPrices.reduce((sum, p) => sum + p, 0) / windowPrices.length;
        const cv = calculateCoefficientOfVariation(stdDev, mean);
        point[oracleData.oracle] = Number(cv.toFixed(4));
      } else {
        point[oracleData.oracle] = 0;
      }
    });

    return point;
  });
}

function calculateMultiScaleVolatility(
  data: OraclePriceHistory[],
  timeScale: TimeScale
): VolatilityResult[] {
  const windowSize = TIME_SCALE_WINDOW[timeScale];

  return data.map((oracleData) => {
    const prices = oracleData.prices.map((p) => p.price);
    const windowPrices = prices.slice(-windowSize);
    const mean =
      windowPrices.length > 0
        ? windowPrices.reduce((sum, price) => sum + price, 0) / windowPrices.length
        : 0;
    const stdDev = calculateStandardDeviation(windowPrices);
    const cv = calculateCoefficientOfVariation(stdDev, mean);
    const minPrice = windowPrices.length > 0 ? Math.min(...windowPrices) : 0;
    const maxPrice = windowPrices.length > 0 ? Math.max(...windowPrices) : 0;
    const priceRange = maxPrice - minPrice;

    return {
      oracle: oracleData.oracle,
      name: DEFAULT_ORACLE_NAMES[oracleData.oracle] || oracleData.oracle,
      stdDev,
      mean,
      cv,
      minPrice,
      maxPrice,
      priceRange,
    };
  });
}

function calculateVolatilityDecomposition(data: OraclePriceHistory[]): VolatilityDecomposition[] {
  if (data.length === 0) return [];

  const allTimestamps = new Set<number>();
  data.forEach((oracleData) => {
    oracleData.prices.forEach((p) => allTimestamps.add(p.timestamp));
  });

  const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

  const avgOracle = data[0];
  if (!avgOracle) return [];

  return sortedTimestamps.slice(-20).map((timestamp) => {
    const priceIndex = avgOracle.prices.findIndex((p) => p.timestamp === timestamp);

    const shortTermPrices = avgOracle.prices
      .slice(Math.max(0, priceIndex - 6), priceIndex + 1)
      .map((p) => p.price);
    const midTermPrices = avgOracle.prices
      .slice(Math.max(0, priceIndex - 24), priceIndex + 1)
      .map((p) => p.price);
    const longTermPrices = avgOracle.prices
      .slice(Math.max(0, priceIndex - 168), priceIndex + 1)
      .map((p) => p.price);

    const shortTermCV =
      shortTermPrices.length >= 2
        ? calculateCoefficientOfVariation(
            calculateStandardDeviation(shortTermPrices),
            shortTermPrices.reduce((a, b) => a + b, 0) / shortTermPrices.length
          )
        : 0;
    const midTermCV =
      midTermPrices.length >= 2
        ? calculateCoefficientOfVariation(
            calculateStandardDeviation(midTermPrices),
            midTermPrices.reduce((a, b) => a + b, 0) / midTermPrices.length
          )
        : 0;
    const longTermCV =
      longTermPrices.length >= 2
        ? calculateCoefficientOfVariation(
            calculateStandardDeviation(longTermPrices),
            longTermPrices.reduce((a, b) => a + b, 0) / longTermPrices.length
          )
        : 0;

    const total = shortTermCV + midTermCV + longTermCV;

    return {
      timestamp: new Date(timestamp).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      shortTerm: Number(((shortTermCV / (total || 1)) * 100).toFixed(2)),
      midTerm: Number(((midTermCV / (total || 1)) * 100).toFixed(2)),
      longTerm: Number(((longTermCV / (total || 1)) * 100).toFixed(2)),
      total: Number(total.toFixed(4)),
    };
  });
}

export function PriceVolatilityChart({
  data,
  oracleNames: customOracleNames,
  showTrend = true,
  className,
  alertThreshold = 2.0,
}: PriceVolatilityChartProps) {
  const { t } = useI18n();
  const oracleNames = { ...DEFAULT_ORACLE_NAMES, ...customOracleNames };
  const [selectedTimeScale, setSelectedTimeScale] = useState<TimeScale>('short');

  const volatilityResults = useMemo(
    () => calculateVolatility(data, oracleNames),
    [data, oracleNames]
  );

  const multiScaleVolatility = useMemo(
    () => calculateMultiScaleVolatility(data, selectedTimeScale),
    [data, selectedTimeScale]
  );

  const trendData = useMemo(
    () => (showTrend ? calculateRollingVolatility(data) : []),
    [data, showTrend]
  );

  const decompositionData = useMemo(() => calculateVolatilityDecomposition(data), [data]);

  const timeScaleConfig = useMemo(() => getTimeScaleConfig(t), [t]);

  const chartData = useMemo(
    () =>
      multiScaleVolatility.map((result) => {
        const levelInfo = getVolatilityLevel(result.cv, t);
        return {
          name: result.name,
          cv: Number(result.cv.toFixed(4)),
          stdDev: result.stdDev,
          mean: result.mean,
          oracle: result.oracle,
          levelKey: levelInfo.levelKey,
          levelColor: levelInfo.color,
        };
      }),
    [multiScaleVolatility, t]
  );

  const avgCV = useMemo(() => {
    if (volatilityResults.length === 0) return 0;
    return volatilityResults.reduce((sum, r) => sum + r.cv, 0) / volatilityResults.length;
  }, [volatilityResults]);

  const currentVolatility = useMemo(() => {
    if (multiScaleVolatility.length === 0) return 0;
    return multiScaleVolatility.reduce((sum, r) => sum + r.cv, 0) / multiScaleVolatility.length;
  }, [multiScaleVolatility]);

  interface ChartDataPayload {
    name: string;
    cv: number;
    stdDev: number;
    mean: number;
    oracle: OracleProvider;
    levelKey: VolatilityLevelKey;
    levelColor: string;
  }

  const CustomTooltip = ({ active, payload }: TooltipProps<ChartDataPayload>) => {
    if (!active || !payload || payload.length === 0) return null;

    const dataPoint = payload[0].payload;
    const result = multiScaleVolatility.find((r) => r.oracle === dataPoint.oracle);

    if (!result) return null;

    return (
      <div className="bg-white p-4 rounded border border-gray-200 min-w-[200px]">
        <p className="text-sm font-semibold text-gray-900 mb-3">{dataPoint.name}</p>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">{t('priceVolatility.tooltip.cv')}</span>
            <span className="text-sm font-bold" style={{ color: dataPoint.levelColor }}>
              {result.cv.toFixed(4)}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">{t('priceVolatility.tooltip.stdDev')}</span>
            <span className="text-sm font-medium text-gray-700">${result.stdDev.toFixed(4)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">{t('priceVolatility.tooltip.avgPrice')}</span>
            <span className="text-sm font-medium text-gray-700">${result.mean.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">{t('priceVolatility.tooltip.priceRange')}</span>
            <span className="text-sm font-medium text-gray-700">
              ${result.minPrice.toFixed(2)} - ${result.maxPrice.toFixed(2)}
            </span>
          </div>
          <div className="pt-2 mt-2 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">
                {t('priceVolatility.tooltip.volatilityLevel')}
              </span>
              <span
                className="text-xs font-medium px-2 py-0.5 rounded"
                style={{
                  backgroundColor: `${dataPoint.levelColor}20`,
                  color: dataPoint.levelColor,
                }}
              >
                {t(`priceVolatility.level.${dataPoint.levelKey}`)}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const TrendTooltip = ({ active, payload, label }: TooltipProps<VolatilityTrendPoint>) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div className="bg-white p-3 rounded border border-gray-200">
        <p className="text-xs font-medium text-gray-900 mb-2">{label}</p>
        <div className="space-y-1">
          {payload.map((entry, index: number) => (
            <div key={index} className="flex justify-between items-center gap-4">
              <span className="text-xs text-gray-600">{entry.name}</span>
              <span className="text-xs font-medium" style={{ color: entry.color }}>
                {Number(entry.value).toFixed(4)}%
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const DecompositionTooltip = ({
    active,
    payload,
    label,
  }: TooltipProps<VolatilityDecomposition>) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 rounded border border-gray-200 min-w-[180px]">
        <p className="text-xs font-medium text-gray-900 mb-2">{label}</p>
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">
              {t('priceVolatility.shortTermVolatility')}
            </span>
            <span className="text-xs font-medium text-blue-600">{data.shortTerm.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">{t('priceVolatility.midTermVolatility')}</span>
            <span className="text-xs font-medium text-green-600">{data.midTerm.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">{t('priceVolatility.longTermVolatility')}</span>
            <span className="text-xs font-medium text-purple-600">{data.longTerm.toFixed(1)}%</span>
          </div>
          <div className="pt-1 mt-1 border-t border-gray-100">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">{t('priceVolatility.totalVolatility')}</span>
              <span className="text-xs font-bold text-gray-900">{data.total.toFixed(4)}%</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <VolatilityAlert
        threshold={alertThreshold}
        currentVolatility={currentVolatility}
        className={className}
      />

      <DashboardCard title={t('priceVolatility.title')} className={className}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {(Object.keys(timeScaleConfig) as TimeScale[]).map((scale) => (
                <button
                  key={scale}
                  onClick={() => setSelectedTimeScale(scale)}
                  className={`px-4 py-2 rounded text-sm font-medium transition-all ${
                    selectedTimeScale === scale
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {timeScaleConfig[scale].label}
                </button>
              ))}
            </div>
            <div className="text-xs text-gray-500">
              {t('priceVolatility.windowSize', { window: timeScaleConfig[selectedTimeScale].window })}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-100 border border-gray-200 rounded p-4">
              <p className="text-xs text-gray-600 mb-1">{t('priceVolatility.avgCV')}</p>
              <p className="text-2xl font-bold text-blue-600">{avgCV.toFixed(4)}%</p>
            </div>
            <div className="bg-gray-100 border border-gray-200 rounded p-4">
              <p className="text-xs text-gray-600 mb-1">{t('priceVolatility.minVolatility')}</p>
              <p className="text-2xl font-bold text-green-600">
                {Math.min(...volatilityResults.map((r) => r.cv)).toFixed(4)}%
              </p>
            </div>
            <div className="bg-gray-100 border border-gray-200 rounded p-4">
              <p className="text-xs text-gray-600 mb-1">{t('priceVolatility.maxVolatility')}</p>
              <p className="text-2xl font-bold text-orange-600">
                {Math.max(...volatilityResults.map((r) => r.cv)).toFixed(4)}%
              </p>
            </div>
            <div className="bg-gray-100 border border-gray-200 rounded p-4">
              <p className="text-xs text-gray-600 mb-1">{t('priceVolatility.oracleCount')}</p>
              <p className="text-2xl font-bold text-purple-600">{volatilityResults.length}</p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              {t('priceVolatility.volatilityComparison', { label: timeScaleConfig[selectedTimeScale].label })}
            </h4>
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  layout="vertical"
                  margin={{ top: 20, right: 30, left: 80, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} />
                  <XAxis
                    type="number"
                    stroke={chartColors.recharts.axis}
                    tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                    tickFormatter={(value) => `${value.toFixed(2)}%`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    stroke={chartColors.recharts.axis}
                    tick={{ fontSize: 12, fill: chartColors.recharts.tickDark }}
                    width={80}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="cv" maxBarSize={40}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.levelColor} />
                    ))}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {showTrend && trendData.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">{t('priceVolatility.rollingVolatilityTrend')}</h4>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={trendData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} />
                    <XAxis
                      dataKey="period"
                      stroke={chartColors.recharts.axis}
                      tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                      minTickGap={40}
                    />
                    <YAxis
                      stroke={chartColors.recharts.axis}
                      tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                      tickFormatter={(value) => `${value}%`}
                      width={50}
                    />
                    <Tooltip content={<TrendTooltip />} />
                    <Legend />
                    {data.map((oracleData) => (
                      <Line
                        key={oracleData.oracle}
                        type="monotone"
                        dataKey={oracleData.oracle}
                        name={oracleNames[oracleData.oracle]}
                        stroke={ORACLE_COLORS[oracleData.oracle]}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    ))}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {decompositionData.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">{t('priceVolatility.volatilityDecomposition')}</h4>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={decompositionData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} />
                    <XAxis
                      dataKey="timestamp"
                      stroke={chartColors.recharts.axis}
                      tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                      minTickGap={40}
                    />
                    <YAxis
                      stroke={chartColors.recharts.axis}
                      tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                      tickFormatter={(value) => `${value}%`}
                      width={50}
                    />
                    <Tooltip content={<DecompositionTooltip />} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="longTerm"
                      stackId="1"
                      stroke={timeScaleConfig.long.color}
                      fill={timeScaleConfig.long.color}
                      fillOpacity={0.6}
                      name={t('priceVolatility.longTermVolatility')}
                    />
                    <Area
                      type="monotone"
                      dataKey="midTerm"
                      stackId="1"
                      stroke={timeScaleConfig.mid.color}
                      fill={timeScaleConfig.mid.color}
                      fillOpacity={0.6}
                      name={t('priceVolatility.midTermVolatility')}
                    />
                    <Area
                      type="monotone"
                      dataKey="shortTerm"
                      stackId="1"
                      stroke={timeScaleConfig.short.color}
                      fill={timeScaleConfig.short.color}
                      fillOpacity={0.6}
                      name={t('priceVolatility.shortTermVolatility')}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4">
                <div className="text-center p-3 rounded bg-blue-50">
                  <p className="text-xs text-gray-600 mb-1">{t('priceVolatility.shortTermProportion')}</p>
                  <p className="text-lg font-bold text-blue-600">
                    {decompositionData.length > 0
                      ? (
                          decompositionData.reduce((sum, d) => sum + d.shortTerm, 0) /
                          decompositionData.length
                        ).toFixed(1)
                      : 0}
                    %
                  </p>
                </div>
                <div className="text-center p-3 rounded bg-green-50">
                  <p className="text-xs text-gray-600 mb-1">{t('priceVolatility.midTermProportion')}</p>
                  <p className="text-lg font-bold text-green-600">
                    {decompositionData.length > 0
                      ? (
                          decompositionData.reduce((sum, d) => sum + d.midTerm, 0) /
                          decompositionData.length
                        ).toFixed(1)
                      : 0}
                    %
                  </p>
                </div>
                <div className="text-center p-3 rounded bg-purple-50">
                  <p className="text-xs text-gray-600 mb-1">{t('priceVolatility.longTermProportion')}</p>
                  <p className="text-lg font-bold text-purple-600">
                    {decompositionData.length > 0
                      ? (
                          decompositionData.reduce((sum, d) => sum + d.longTerm, 0) /
                          decompositionData.length
                        ).toFixed(1)
                      : 0}
                    %
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('priceVolatility.table.oracle')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('priceVolatility.table.cv')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('priceVolatility.table.stdDev')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('priceVolatility.table.avgPrice')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('priceVolatility.table.priceRange')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('priceVolatility.table.volatilityLevel')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {multiScaleVolatility.map((result) => {
                  const level = getVolatilityLevel(result.cv, t);
                  return (
                    <tr key={result.oracle} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div
                            className="w-3 h-3  mr-2"
                            style={{ backgroundColor: ORACLE_COLORS[result.oracle] }}
                          />
                          <span className="text-sm font-medium text-gray-900">{result.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-bold" style={{ color: level.color }}>
                          {result.cv.toFixed(4)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-mono">
                        ${result.stdDev.toFixed(4)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-mono">
                        ${result.mean.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-mono">
                        ${result.minPrice.toFixed(2)} - ${result.maxPrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className="text-xs font-medium px-2 py-1 rounded"
                          style={{
                            backgroundColor: `${level.color}20`,
                            color: level.color,
                          }}
                        >
                          {level.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="bg-blue-50 rounded p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">{t('priceVolatility.explanation.title')}</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>
                • <strong>{t('priceVolatility.tooltip.stdDev')}</strong>: {t('priceVolatility.explanation.stdDevDesc')}
              </li>
              <li>
                • <strong>{t('priceVolatility.tooltip.cv')}</strong>: {t('priceVolatility.explanation.cvDesc')}
              </li>
              <li>• {t('priceVolatility.explanation.cvInterpretation')}</li>
              <li>• {t('priceVolatility.explanation.rollingWindowDesc')}</li>
              <li>• {t('priceVolatility.explanation.multiScaleDesc')}</li>
              <li>• {t('priceVolatility.explanation.decompositionDesc')}</li>
            </ul>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
