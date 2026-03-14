'use client';

import { useMemo, useState } from 'react';
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  Bar,
  ReferenceLine,
} from 'recharts';
import { OracleProvider } from '@/types/oracle';
import { DashboardCard } from '../common/DashboardCard';
import { useI18n } from '@/lib/i18n/provider';
import { chartColors } from '@/lib/config/colors';

export interface PriceDataPoint {
  timestamp: number;
  price: number;
  high?: number;
  low?: number;
  close?: number;
}

export interface OraclePriceHistory {
  oracle: OracleProvider;
  prices: PriceDataPoint[];
}

export interface BollingerBandsProps {
  data: OraclePriceHistory[];
  oracleNames?: Partial<Record<OracleProvider, string>>;
  className?: string;
  defaultPeriod?: number;
  defaultMultiplier?: number;
}

const DEFAULT_ORACLE_NAMES: Record<OracleProvider, string> = {
  [OracleProvider.CHAINLINK]: 'Chainlink',
  [OracleProvider.BAND_PROTOCOL]: 'Band Protocol',
  [OracleProvider.UMA]: 'UMA',
  [OracleProvider.PYTH]: 'Pyth',
  [OracleProvider.API3]: 'API3',
  [OracleProvider.REDSTONE]: 'RedStone',
};

const ORACLE_COLORS: Record<OracleProvider, string> = {
  [OracleProvider.CHAINLINK]: chartColors.oracle.chainlink,
  [OracleProvider.BAND_PROTOCOL]: chartColors.oracle['band-protocol'],
  [OracleProvider.UMA]: chartColors.oracle.uma,
  [OracleProvider.PYTH]: chartColors.oracle['pyth'],
  [OracleProvider.API3]: chartColors.oracle.api3,
  [OracleProvider.REDSTONE]: chartColors.oracle.redstone,
};

interface BollingerResult {
  timestamp: string;
  rawTimestamp: number;
  price: number;
  middle: number;
  upper: number;
  lower: number;
  bandwidth: number;
  bandwidthPercent: number;
  position: number;
  squeeze: boolean;
  breakout: 'upper' | 'lower' | null;
}

function calculateSMA(prices: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      sma.push(NaN);
    } else {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
  }
  return sma;
}

function calculateStdDev(prices: number[], period: number): number[] {
  const stdDev: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      stdDev.push(NaN);
    } else {
      const slice = prices.slice(i - period + 1, i + 1);
      const mean = slice.reduce((a, b) => a + b, 0) / period;
      const squaredDiffs = slice.map((p) => Math.pow(p - mean, 2));
      const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
      stdDev.push(Math.sqrt(variance));
    }
  }
  return stdDev;
}

function calculateBollingerBands(
  prices: PriceDataPoint[],
  period: number = 20,
  multiplier: number = 2
): BollingerResult[] {
  const sortedPrices = [...prices].sort((a, b) => a.timestamp - b.timestamp);
  const priceValues = sortedPrices.map((p) => p.price);

  const sma = calculateSMA(priceValues, period);
  const stdDev = calculateStdDev(priceValues, period);

  const results: BollingerResult[] = [];
  let previousBandwidth = 0;

  for (let i = 0; i < sortedPrices.length; i++) {
    const middle = sma[i];
    const sd = stdDev[i];
    const upper = middle + sd * multiplier;
    const lower = middle - sd * multiplier;
    const price = priceValues[i];

    const bandwidth = upper - lower;
    const bandwidthPercent = middle > 0 ? (bandwidth / middle) * 100 : 0;

    const position = sd > 0 ? (price - middle) / (sd * multiplier) : 0;

    const squeeze =
      bandwidthPercent < 5 || (previousBandwidth > 0 && bandwidth < previousBandwidth * 0.8);

    let breakout: 'upper' | 'lower' | null = null;
    if (price > upper) breakout = 'upper';
    else if (price < lower) breakout = 'lower';

    results.push({
      timestamp: new Date(sortedPrices[i].timestamp).toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      rawTimestamp: sortedPrices[i].timestamp,
      price,
      middle,
      upper,
      lower,
      bandwidth,
      bandwidthPercent,
      position,
      squeeze,
      breakout,
    });

    previousBandwidth = bandwidth;
  }

  return results;
}

function getPositionDescription(position: number): string {
  if (position > 1) return '超买区';
  if (position > 0.5) return '强势区';
  if (position > -0.5) return '中性区';
  if (position > -1) return '弱势区';
  return '超卖区';
}

function getPositionColor(position: number): string {
  if (position > 1) return chartColors.semantic.danger;
  if (position > 0.5) return chartColors.semantic.warning;
  if (position > -0.5) return chartColors.recharts.tick;
  if (position > -1) return chartColors.semantic.success;
  return '#059669';
}

export function BollingerBands({
  data,
  oracleNames: customOracleNames,
  className,
  defaultPeriod = 20,
  defaultMultiplier = 2,
}: BollingerBandsProps) {
  const { t } = useI18n();
  const oracleNames = { ...DEFAULT_ORACLE_NAMES, ...customOracleNames };
  const [selectedOracle, setSelectedOracle] = useState<OracleProvider>(
    data[0]?.oracle || OracleProvider.CHAINLINK
  );
  const [period, setPeriod] = useState(defaultPeriod);
  const [multiplier, setMultiplier] = useState(defaultMultiplier);
  const [showSqueeze, setShowSqueeze] = useState(true);

  const selectedOracleData = useMemo(() => {
    return data.find((d) => d.oracle === selectedOracle);
  }, [data, selectedOracle]);

  const chartData = useMemo(() => {
    if (!selectedOracleData) return [];
    return calculateBollingerBands(selectedOracleData.prices, period, multiplier);
  }, [selectedOracleData, period, multiplier]);

  const stats = useMemo(() => {
    if (chartData.length === 0) return null;

    const validData = chartData.filter((d) => !isNaN(d.middle));
    const lastPoint = validData[validData.length - 1];

    const avgBandwidth =
      validData.reduce((sum, d) => sum + d.bandwidthPercent, 0) / (validData.length || 1);

    const squeezeCount = validData.filter((d) => d.squeeze).length;
    const squeezePercent = (squeezeCount / validData.length) * 100;

    const upperBreakouts = validData.filter((d) => d.breakout === 'upper').length;
    const lowerBreakouts = validData.filter((d) => d.breakout === 'lower').length;

    const maxBandwidth = Math.max(...validData.map((d) => d.bandwidthPercent));
    const minBandwidth = Math.min(...validData.map((d) => d.bandwidthPercent));

    return {
      currentPosition: lastPoint.position,
      currentBandwidth: lastPoint.bandwidthPercent,
      avgBandwidth,
      squeezePercent,
      upperBreakouts,
      lowerBreakouts,
      maxBandwidth,
      minBandwidth,
      positionDescription: getPositionDescription(lastPoint.position),
    };
  }, [chartData]);

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0].payload;

    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 min-w-[220px]">
        <p className="text-sm font-semibold text-gray-900 mb-2">{data.timestamp}</p>
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">价格</span>
            <span className="text-sm font-bold">${data.price.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">中轨 (SMA{period})</span>
            <span className="text-sm font-medium text-blue-600">${data.middle.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">上轨</span>
            <span className="text-sm font-medium text-green-600">${data.upper.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">下轨</span>
            <span className="text-sm font-medium text-red-600">${data.lower.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">带宽 %</span>
            <span className="text-sm font-medium">{data.bandwidthPercent.toFixed(2)}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">位置系数</span>
            <span
              className="text-sm font-medium"
              style={{ color: getPositionColor(data.position) }}
            >
              {data.position.toFixed(2)}
            </span>
          </div>
          {data.squeeze && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">状态</span>
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-purple-100 text-purple-700">
                挤压
              </span>
            </div>
          )}
          {data.breakout && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">突破</span>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded ${
                  data.breakout === 'upper'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}
              >
                {data.breakout === 'upper' ? '向上突破' : '向下突破'}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!selectedOracleData) {
    return (
      <DashboardCard title="布林带 (Bollinger Bands)" className={className}>
        <div className="h-80 flex items-center justify-center text-gray-400">暂无数据</div>
      </DashboardCard>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardCard title="布林带 (Bollinger Bands)" className={className}>
        <div className="space-y-6">
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">预言机:</span>
              <select
                value={selectedOracle}
                onChange={(e) => setSelectedOracle(e.target.value as OracleProvider)}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {data.map((oracleData) => (
                  <option key={oracleData.oracle} value={oracleData.oracle}>
                    {oracleNames[oracleData.oracle]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">周期:</span>
              <select
                value={period}
                onChange={(e) => setPeriod(Number(e.target.value))}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">标准差倍数:</span>
              <select
                value={multiplier}
                onChange={(e) => setMultiplier(Number(e.target.value))}
                className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1.5}>1.5</option>
                <option value={2}>2</option>
                <option value={2.5}>2.5</option>
                <option value={3}>3</option>
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showSqueeze}
                onChange={(e) => setShowSqueeze(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">高亮挤压区域</span>
            </label>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-1">当前位置</p>
                <p
                  className="text-xl font-bold"
                  style={{ color: getPositionColor(stats.currentPosition) }}
                >
                  {stats.positionDescription}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  系数: {stats.currentPosition.toFixed(2)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-1">带宽 %</p>
                <p className="text-xl font-bold text-purple-600">
                  {stats.currentBandwidth.toFixed(2)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">平均: {stats.avgBandwidth.toFixed(2)}%</p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-1">挤压时间占比</p>
                <p className="text-xl font-bold text-amber-600">
                  {stats.squeezePercent.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">预示潜在突破</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-1">突破统计</p>
                <p className="text-xl font-bold text-green-600">
                  ↑{stats.upperBreakouts} ↓{stats.lowerBreakouts}
                </p>
                <p className="text-xs text-gray-500 mt-1">上/下突破次数</p>
              </div>
            </div>
          )}

          {/* Bollinger Bands Chart */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">布林带价格通道</h4>
            <div style={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                    tickFormatter={(value) => `$${value.toFixed(0)}`}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />

                  {/* Upper Band Area */}
                  <Area
                    type="monotone"
                    dataKey="upper"
                    stroke="none"
                    fill={chartColors.semantic.success}
                    fillOpacity={0.1}
                    name="上轨"
                  />

                  {/* Lower Band Area - creates the band effect */}
                  <Area
                    type="monotone"
                    dataKey="lower"
                    stroke="none"
                    fill={chartColors.recharts.white}
                    fillOpacity={1}
                    name="下轨"
                  />

                  {/* Upper Band Line */}
                  <Line
                    type="monotone"
                    dataKey="upper"
                    stroke={chartColors.semantic.success}
                    strokeWidth={1.5}
                    dot={false}
                    name={`上轨 (SMA${period}+${multiplier}σ)`}
                  />

                  {/* Middle Band (SMA) */}
                  <Line
                    type="monotone"
                    dataKey="middle"
                    stroke={chartColors.recharts.tick}
                    strokeWidth={1.5}
                    strokeDasharray="5 5"
                    dot={false}
                    name={`中轨 (SMA${period})`}
                  />

                  {/* Lower Band Line */}
                  <Line
                    type="monotone"
                    dataKey="lower"
                    stroke={chartColors.semantic.danger}
                    strokeWidth={1.5}
                    dot={false}
                    name={`下轨 (SMA${period}-${multiplier}σ)`}
                  />

                  {/* Price Line */}
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke={ORACLE_COLORS[selectedOracle]}
                    strokeWidth={2.5}
                    dot={(props: any) => {
                      const { cx, cy, payload } = props;
                      if (payload.breakout === 'upper') {
                        return (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={4}
                            fill={chartColors.semantic.success}
                            stroke={chartColors.recharts.white}
                            strokeWidth={2}
                          />
                        );
                      }
                      if (payload.breakout === 'lower') {
                        return (
                          <circle
                            cx={cx}
                            cy={cy}
                            r={4}
                            fill={chartColors.semantic.danger}
                            stroke={chartColors.recharts.white}
                            strokeWidth={2}
                          />
                        );
                      }
                      return <></>;
                    }}
                    name="价格"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bandwidth Chart */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">带宽百分比趋势</h4>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                    tickFormatter={(value) => `${value.toFixed(1)}%`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="bandwidthPercent"
                    stroke={chartColors.recharts.purple}
                    fill={chartColors.recharts.purple}
                    fillOpacity={0.2}
                    name="带宽 %"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Position Chart */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">价格位置系数</h4>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
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
                    domain={[-1.5, 1.5]}
                    tickFormatter={(value) => value.toFixed(1)}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="position"
                    stroke={chartColors.recharts.primary}
                    strokeWidth={2}
                    dot={false}
                    name="位置系数"
                  />
                  <ReferenceLine y={1} stroke={chartColors.semantic.success} strokeDasharray="3 3" label="上轨边界" />
                  <ReferenceLine y={-1} stroke={chartColors.semantic.danger} strokeDasharray="3 3" label="下轨边界" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Explanation */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">布林带指标说明</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>
                • <strong>中轨</strong>: {period}周期简单移动平均线 (SMA{period})
              </li>
              <li>
                • <strong>上轨/下轨</strong>: 中轨 ± {multiplier} × 标准差，包含约
                {multiplier === 2
                  ? '95'
                  : multiplier === 1.5
                    ? '87'
                    : multiplier === 2.5
                      ? '99'
                      : '99.7'}
                %的价格数据
              </li>
              <li>
                • <strong>带宽 %</strong>: (上轨 - 下轨) / 中轨 × 100%，反映波动性大小
              </li>
              <li>
                • <strong>位置系数</strong>: (价格 - 中轨) / ({multiplier} ×
                标准差)，-1到1之间为正常区间
              </li>
              <li>
                • <strong>挤压 (Squeeze)</strong>: 带宽收窄，预示即将出现大行情
              </li>
              <li>
                • <strong>突破</strong>: 价格突破上轨或下轨，可能预示趋势延续或反转
              </li>
            </ul>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
