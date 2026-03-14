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
} from 'recharts';
import { OracleProvider } from '@/types/oracle';
import { DashboardCard } from '../common/DashboardCard';
import { useI18n } from '@/lib/i18n/provider';
import { chartColors } from '@/lib/config/colors';
import { calculateATR, calculateTrueRange } from '@/lib/indicators';
import type { PriceDataPoint } from '@/lib/indicators';

export interface OraclePriceHistory {
  oracle: OracleProvider;
  prices: PriceDataPoint[];
}

export interface ATRIndicatorProps {
  data: OraclePriceHistory[];
  oracleNames?: Partial<Record<OracleProvider, string>>;
  className?: string;
  defaultPeriod?: number;
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

interface ATRResult {
  timestamp: string;
  rawTimestamp: number;
  price: number;
  tr: number;
  atr: number;
  atrPercent: number;
  upperChannel: number;
  lowerChannel: number;
  volatilityLevel: 'low' | 'medium' | 'high' | 'extreme';
}

function getVolatilityLevel(atrPercent: number): 'low' | 'medium' | 'high' | 'extreme' {
  if (atrPercent < 0.5) return 'low';
  if (atrPercent < 1.0) return 'medium';
  if (atrPercent < 2.0) return 'high';
  return 'extreme';
}

function getVolatilityColor(level: 'low' | 'medium' | 'high' | 'extreme'): string {
  switch (level) {
    case 'low':
      return chartColors.semantic.success;
    case 'medium':
      return chartColors.semantic.warning;
    case 'high':
      return chartColors.semantic.danger;
    case 'extreme':
      return '#991B1B';
  }
}

export function ATRIndicator({
  data,
  oracleNames: customOracleNames,
  className,
  defaultPeriod = 14,
}: ATRIndicatorProps) {
  const { t } = useI18n();
  const oracleNames = { ...DEFAULT_ORACLE_NAMES, ...customOracleNames };
  const [selectedOracle, setSelectedOracle] = useState<OracleProvider>(
    data[0]?.oracle || OracleProvider.CHAINLINK
  );
  const [period, setPeriod] = useState(defaultPeriod);
  const [showChannels, setShowChannels] = useState(true);

  const selectedOracleData = useMemo(() => {
    return data.find((d) => d.oracle === selectedOracle);
  }, [data, selectedOracle]);

  const chartData = useMemo(() => {
    if (!selectedOracleData) return [];

    const sortedPrices = [...selectedOracleData.prices].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

    const { tr, atr } = calculateATR(sortedPrices, period);

    return sortedPrices.map((point, index) => {
      const currentATR = atr[index];
      const atrPercent =
        !isNaN(currentATR) && point.price > 0 ? (currentATR / point.price) * 100 : 0;

      const volatilityLevel = getVolatilityLevel(atrPercent);

      return {
        timestamp: new Date(point.timestamp || 0).toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        rawTimestamp: point.timestamp || 0,
        price: point.price,
        tr: tr[index],
        atr: currentATR,
        atrPercent: atrPercent,
        upperChannel: point.price + currentATR * 2,
        lowerChannel: point.price - currentATR * 2,
        volatilityLevel,
      };
    });
  }, [selectedOracleData, period]);

  const stats = useMemo(() => {
    if (chartData.length === 0) return null;

    const validATR = chartData.filter((d) => !isNaN(d.atr));
    const validATRPercent = chartData.filter((d) => !isNaN(d.atrPercent));

    const avgATR = validATR.reduce((sum, d) => sum + d.atr, 0) / (validATR.length || 1);
    const avgATRPercent =
      validATRPercent.reduce((sum, d) => sum + d.atrPercent, 0) / (validATRPercent.length || 1);

    const lastPoint = chartData[chartData.length - 1];

    return {
      currentATR: lastPoint.atr,
      currentATRPercent: lastPoint.atrPercent,
      avgATR,
      avgATRPercent,
      maxATR: Math.max(...validATR.map((d) => d.atr)),
      volatilityLevel: lastPoint.volatilityLevel,
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
            <span className="text-sm font-medium">${data.price.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">真实波幅 (TR)</span>
            <span className="text-sm font-medium">${data.tr.toFixed(4)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">ATR ({period})</span>
            <span className="text-sm font-bold text-blue-600">${data.atr.toFixed(4)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">ATR %</span>
            <span className="text-sm font-bold text-blue-600">{data.atrPercent.toFixed(4)}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600">波动等级</span>
            <span
              className="text-xs font-medium px-2 py-0.5 rounded"
              style={{
                backgroundColor: `${getVolatilityColor(data.volatilityLevel)}20`,
                color: getVolatilityColor(data.volatilityLevel),
              }}
            >
              {data.volatilityLevel === 'low'
                ? '低'
                : data.volatilityLevel === 'medium'
                  ? '中'
                  : data.volatilityLevel === 'high'
                    ? '高'
                    : '极高'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  if (!selectedOracleData) {
    return (
      <DashboardCard title="ATR 平均真实波幅" className={className}>
        <div className="h-80 flex items-center justify-center text-gray-400">暂无数据</div>
      </DashboardCard>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardCard title="ATR 平均真实波幅" className={className}>
        <div className="space-y-6">
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
                <option value={7}>7</option>
                <option value={14}>14</option>
                <option value={21}>21</option>
                <option value={28}>28</option>
              </select>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showChannels}
                onChange={(e) => setShowChannels(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">显示ATR通道</span>
            </label>
          </div>

          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-1">当前 ATR</p>
                <p className="text-xl font-bold text-blue-600">${stats.currentATR.toFixed(4)}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-1">ATR %</p>
                <p className="text-xl font-bold text-purple-600">
                  {stats.currentATRPercent.toFixed(4)}%
                </p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-1">平均 ATR</p>
                <p className="text-xl font-bold text-amber-600">${stats.avgATR.toFixed(4)}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-1">波动等级</p>
                <p
                  className="text-xl font-bold"
                  style={{ color: getVolatilityColor(stats.volatilityLevel) }}
                >
                  {stats.volatilityLevel === 'low'
                    ? '低'
                    : stats.volatilityLevel === 'medium'
                      ? '中'
                      : stats.volatilityLevel === 'high'
                        ? '高'
                        : '极高'}
                </p>
              </div>
            </div>
          )}

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">价格与ATR通道</h4>
            <div style={{ height: 350 }}>
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

                  {showChannels && (
                    <>
                      <Area
                        type="monotone"
                        dataKey="upperChannel"
                        stroke="none"
                        fill={chartColors.recharts.primary}
                        fillOpacity={0.1}
                        name="上轨 (Price + 2×ATR)"
                      />
                      <Area
                        type="monotone"
                        dataKey="lowerChannel"
                        stroke="none"
                        fill={chartColors.recharts.white}
                        fillOpacity={1}
                        name="下轨 (Price - 2×ATR)"
                      />
                    </>
                  )}

                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke={ORACLE_COLORS[selectedOracle]}
                    strokeWidth={2}
                    dot={false}
                    name="价格"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">ATR 趋势 ({period}周期)</h4>
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
                    tickFormatter={(value) => `$${value.toFixed(2)}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="atr" stroke={chartColors.recharts.primary} fill={chartColors.recharts.primary} fillOpacity={0.2} name="ATR" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">真实波幅 (TR)</h4>
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
                    tickFormatter={(value) => `$${value.toFixed(2)}`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="tr" fill={chartColors.recharts.warning} name="真实波幅" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">ATR 指标说明</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>
                • <strong>真实波幅 (TR)</strong>: max(High-Low, |High-Previous Close|, |Low-Previous
                Close|)
              </li>
              <li>
                • <strong>ATR</strong>: TR的n周期指数移动平均，反映市场波动性
              </li>
              <li>
                • <strong>ATR %</strong>: ATR占当前价格的百分比，便于不同价格资产的比较
              </li>
              <li>
                • <strong>ATR通道</strong>: 基于ATR的价格通道，用于识别价格突破和支撑/阻力位
              </li>
              <li>• ATR上升表示波动性增加，ATR下降表示市场趋于平静</li>
            </ul>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
