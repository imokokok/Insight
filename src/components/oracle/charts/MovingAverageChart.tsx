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
} from 'recharts';
import { OracleProvider } from '@/types/oracle';
import { DashboardCard } from '../common/DashboardCard';
import { useI18n } from '@/lib/i18n/provider';
import { chartColors } from '@/lib/config/colors';
import {
  calculateSMA,
  calculateEMA,
  calculateBollingerBands,
  calculateRollingStdDev,
} from '@/lib/indicators';

export interface PriceDataPoint {
  timestamp: number;
  price: number;
}

export interface OraclePriceHistory {
  oracle: OracleProvider;
  prices: PriceDataPoint[];
}

export interface MovingAverageConfig {
  window: number;
  label: string;
  color: string;
}

export interface MovingAverageChartProps {
  data: OraclePriceHistory[];
  oracleNames?: Partial<Record<OracleProvider, string>>;
  className?: string;
  showBollingerBands?: boolean;
  showRollingStdDev?: boolean;
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
  [OracleProvider.DIA]: '#6366F1',
  [OracleProvider.TELLOR]: '#AA96DA',
  [OracleProvider.CHRONICLE]: '#E11D48',
  [OracleProvider.WINKLINK]: '#FF4D4D',
};

const MA_CONFIGS: MovingAverageConfig[] = [
  { window: 5, label: 'MA5', color: chartColors.recharts.warning },
  { window: 10, label: 'MA10', color: chartColors.recharts.success },
  { window: 20, label: 'MA20', color: chartColors.recharts.purple },
];

interface ChartDataPoint {
  timestamp: string;
  rawTimestamp: number;
  [key: string]: string | number;
}

export function MovingAverageChart({
  data,
  oracleNames: customOracleNames,
  className,
  showBollingerBands: initialShowBollingerBands = true,
  showRollingStdDev = true,
}: MovingAverageChartProps) {
  const { t } = useI18n();
  const oracleNames = { ...DEFAULT_ORACLE_NAMES, ...customOracleNames };
  const [selectedOracle, setSelectedOracle] = useState<OracleProvider>(
    data[0]?.oracle || OracleProvider.CHAINLINK
  );
  const [selectedMA, setSelectedMA] = useState<number[]>([5, 10, 20]);
  const [showEMA, setShowEMA] = useState(false);
  const [showBollingerBands, setShowBollingerBands] = useState(initialShowBollingerBands);

  const selectedOracleData = useMemo(() => {
    return data.find((d) => d.oracle === selectedOracle);
  }, [data, selectedOracle]);

  const chartData = useMemo(() => {
    if (!selectedOracleData) return [];

    const sortedPrices = [...selectedOracleData.prices].sort((a, b) => a.timestamp - b.timestamp);
    const prices = sortedPrices.map((p) => p.price);

    const bollinger = showBollingerBands ? calculateBollingerBands(prices) : null;
    const rollingStdDev = showRollingStdDev ? calculateRollingStdDev(prices, 20) : null;

    return sortedPrices.map((point, index) => {
      const dataPoint: ChartDataPoint = {
        timestamp: new Date(point.timestamp).toLocaleTimeString('zh-CN', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        rawTimestamp: point.timestamp,
        price: point.price,
      };

      selectedMA.forEach((window) => {
        const sma = calculateSMA(prices.slice(0, index + 1), window);
        dataPoint[`SMA${window}`] = sma[index];
      });

      if (showEMA) {
        selectedMA.forEach((window) => {
          const ema = calculateEMA(prices.slice(0, index + 1), window);
          dataPoint[`EMA${window}`] = ema[index];
        });
      }

      if (bollinger) {
        dataPoint.bbUpper = bollinger.upper[index];
        dataPoint.bbMiddle = bollinger.middle[index];
        dataPoint.bbLower = bollinger.lower[index];
      }

      if (rollingStdDev) {
        dataPoint.rollingStdDev = rollingStdDev[index];
      }

      return dataPoint;
    });
  }, [selectedOracleData, selectedMA, showEMA, showBollingerBands, showRollingStdDev]);

  const stats = useMemo(() => {
    if (!selectedOracleData || selectedOracleData.prices.length === 0) {
      return null;
    }

    const prices = selectedOracleData.prices.map((p) => p.price);
    const currentPrice = prices[prices.length - 1];

    const sma5 = calculateSMA(prices, 5);
    const sma10 = calculateSMA(prices, 10);
    const sma20 = calculateSMA(prices, 20);

    const currentSMA5 = sma5[sma5.length - 1];
    const currentSMA10 = sma10[sma10.length - 1];
    const currentSMA20 = sma20[sma20.length - 1];

    let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (currentSMA5 > currentSMA10 && currentSMA10 > currentSMA20) {
      trend = 'bullish';
    } else if (currentSMA5 < currentSMA10 && currentSMA10 < currentSMA20) {
      trend = 'bearish';
    }

    const bb = calculateBollingerBands(prices);
    const lastIdx = prices.length - 1;
    const bbPosition = (currentPrice - bb.lower[lastIdx]) / (bb.upper[lastIdx] - bb.lower[lastIdx]);

    return {
      currentPrice,
      sma5: currentSMA5,
      sma10: currentSMA10,
      sma20: currentSMA20,
      trend,
      bbPosition: bbPosition * 100,
      volatility: calculateRollingStdDev(prices, 20)[lastIdx],
    };
  }, [selectedOracleData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 min-w-[220px]">
        <p className="text-sm font-semibold text-gray-900 mb-2">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-xs text-gray-600">{entry.name}</span>
              <span className="text-sm font-medium font-mono" style={{ color: entry.color }}>
                {typeof entry.value === 'number' ? `$${entry.value.toFixed(2)}` : entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!selectedOracleData) {
    return (
      <DashboardCard title="滑动窗口统计分析" className={className}>
        <div className="h-80 flex items-center justify-center text-gray-400">暂无数据</div>
      </DashboardCard>
    );
  }

  return (
    <div className="space-y-6">
      <DashboardCard title="滑动窗口统计分析" className={className}>
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
              <span className="text-sm text-gray-600">均线:</span>
              <div className="flex gap-1">
                {[5, 10, 20].map((window) => (
                  <button
                    key={window}
                    onClick={() => {
                      setSelectedMA((prev) =>
                        prev.includes(window) ? prev.filter((w) => w !== window) : [...prev, window]
                      );
                    }}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      selectedMA.includes(window)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    MA{window}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showEMA}
                onChange={(e) => setShowEMA(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">显示EMA</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showBollingerBands}
                onChange={(e) => setShowBollingerBands(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-600">布林带</span>
            </label>
          </div>

          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-1">当前价格</p>
                <p className="text-xl font-bold text-blue-600">${stats.currentPrice.toFixed(2)}</p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-1">MA5</p>
                <p className="text-xl font-bold text-amber-600">${stats.sma5.toFixed(2)}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-1">MA10</p>
                <p className="text-xl font-bold text-green-600">${stats.sma10.toFixed(2)}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
                <p className="text-xs text-gray-600 mb-1">MA20</p>
                <p className="text-xl font-bold text-purple-600">${stats.sma20.toFixed(2)}</p>
              </div>
            </div>
          )}

          {stats && (
            <div className="flex items-center gap-4">
              <div
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  stats.trend === 'bullish'
                    ? 'bg-green-100 text-green-700'
                    : stats.trend === 'bearish'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-700'
                }`}
              >
                趋势:{' '}
                {stats.trend === 'bullish' ? '看涨' : stats.trend === 'bearish' ? '看跌' : '中性'}
              </div>
              <div className="text-sm text-gray-600">
                布林带位置: <span className="font-medium">{stats.bbPosition.toFixed(1)}%</span>
              </div>
              <div className="text-sm text-gray-600">
                滚动标准差: <span className="font-medium">${stats.volatility.toFixed(4)}</span>
              </div>
            </div>
          )}

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">价格与移动平均线</h4>
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

                  {showBollingerBands && (
                    <>
                      <Area
                        type="monotone"
                        dataKey="bbUpper"
                        stroke="none"
                        fill={chartColors.recharts.indigo}
                        fillOpacity={0.3}
                        name="布林上轨"
                      />
                      <Area
                        type="monotone"
                        dataKey="bbLower"
                        stroke="none"
                        fill={chartColors.recharts.white}
                        fillOpacity={1}
                        name="布林下轨"
                      />
                      <Line
                        type="monotone"
                        dataKey="bbMiddle"
                        stroke={chartColors.recharts.indigo}
                        strokeWidth={1}
                        strokeDasharray="5 5"
                        dot={false}
                        name="布林中轨 (MA20)"
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

                  {selectedMA.map((window) => {
                    const config = MA_CONFIGS.find((c) => c.window === window);
                    return (
                      <Line
                        key={`SMA${window}`}
                        type="monotone"
                        dataKey={`SMA${window}`}
                        stroke={config?.color || '#6B7280'}
                        strokeWidth={1.5}
                        dot={false}
                        name={`MA${window}`}
                      />
                    );
                  })}

                  {showEMA &&
                    selectedMA.map((window) => (
                      <Line
                        key={`EMA${window}`}
                        type="monotone"
                        dataKey={`EMA${window}`}
                        stroke={chartColors.recharts.pink}
                        strokeWidth={1.5}
                        strokeDasharray="3 3"
                        dot={false}
                        name={`EMA${window}`}
                      />
                    ))}
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {showRollingStdDev && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">滚动标准差 (20周期)</h4>
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={chartData}
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
                      tickFormatter={(value) => `$${value.toFixed(2)}`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="rollingStdDev"
                      stroke={chartColors.recharts.warning}
                      fill={chartColors.recharts.warning}
                      fillOpacity={0.3}
                      name="滚动标准差"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">指标说明</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>
                • <strong>SMA (简单移动平均线)</strong>: n周期内价格的算术平均值，用于平滑价格波动
              </li>
              <li>
                • <strong>EMA (指数移动平均线)</strong>:
                给予近期价格更高权重的移动平均线，对价格变化更敏感
              </li>
              <li>
                • <strong>布林带 (Bollinger Bands)</strong>: 由中轨(MA20)和上下轨(MA20 ±
                2σ)组成，用于衡量价格波动范围
              </li>
              <li>
                • <strong>滚动标准差</strong>: 动态计算n周期内的价格标准差，反映价格波动性变化
              </li>
              <li>
                • <strong>趋势判断</strong>: MA5 &gt; MA10 &gt; MA20 为看涨排列，反之为看跌排列
              </li>
            </ul>
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
