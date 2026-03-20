'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useCrossChainData } from '../useCrossChainData';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  chainNames,
  chainColors,
  calculateRollingVolatility,
  calculateVolatilityCone,
  calculatePearsonCorrelation,
  type RollingVolatilityPoint,
  type VolatilityConePoint,
} from '../utils';
import { Blockchain } from '@/types/oracle';
import { chartColors, semanticColors } from '@/lib/config/colors';
import { DropdownSelect } from '@/components/ui/selectors';


interface VolatilitySurfaceProps {
  data: ReturnType<typeof useCrossChainData>;
}

const VOLATILITY_WINDOW_SIZES = [
  { value: 20, label: '20' },
  { value: 50, label: '50' },
  { value: 100, label: '100' },
];

interface VolatilityChartDataPoint {
  index: number;
  time: string;
  [key: string]: number | string;
}

interface VolatilityCorrelationData {
  chainX: Blockchain;
  chainY: Blockchain;
  correlation: number;
}

export function VolatilitySurface({ data }: VolatilitySurfaceProps) {
  const t = useTranslations();
  const { filteredChains, chartData, historicalPrices } = data;
  const [volatilityWindowSize, setVolatilityWindowSize] = useState(50);
  const [hiddenLines, setHiddenLines] = useState<Set<string>>(new Set());
  const [selectedConeChain, setSelectedConeChain] = useState<Blockchain | null>(null);

  // 计算各链的滚动波动率
  const rollingVolatilityData = useMemo(() => {
    if (chartData.length === 0) return [];

    const chainVolatilities: Partial<Record<Blockchain, RollingVolatilityPoint[]>> = {};

    filteredChains.forEach((chain) => {
      const prices = chartData
        .map((point) => point[chain] as number | undefined)
        .filter((p): p is number => p !== undefined && !isNaN(p) && p > 0);

      if (prices.length >= volatilityWindowSize) {
        chainVolatilities[chain] = calculateRollingVolatility(prices, volatilityWindowSize);
      }
    });

    // 找到最大长度
    const maxLength = Math.max(
      ...Object.values(chainVolatilities).map((arr) => arr?.length || 0),
      0
    );

    // 构建图表数据点
    const dataPoints: VolatilityChartDataPoint[] = [];
    for (let i = 0; i < maxLength; i++) {
      const chartPoint = chartData[i + volatilityWindowSize];
      const point: VolatilityChartDataPoint = {
        index: i,
        time: chartPoint?.time || `#${i}`,
      };

      filteredChains.forEach((chain) => {
        const volatilities = chainVolatilities[chain];
        if (volatilities && volatilities[i]) {
          point[chain] = volatilities[i].volatility;
        }
      });

      dataPoints.push(point);
    }

    return dataPoints;
  }, [chartData, filteredChains, volatilityWindowSize]);

  // 计算波动率相关性矩阵
  const volatilityCorrelationMatrix = useMemo(() => {
    const correlations: VolatilityCorrelationData[] = [];

    // 获取各链的波动率序列
    const chainVolatilitySeries: Partial<Record<Blockchain, number[]>> = {};
    filteredChains.forEach((chain) => {
      const prices = chartData
        .map((point) => point[chain] as number | undefined)
        .filter((p): p is number => p !== undefined && !isNaN(p) && p > 0);

      if (prices.length >= volatilityWindowSize) {
        const vols = calculateRollingVolatility(prices, volatilityWindowSize);
        chainVolatilitySeries[chain] = vols.map((v) => v.volatility);
      }
    });

    // 计算两两相关性
    for (let i = 0; i < filteredChains.length; i++) {
      for (let j = i + 1; j < filteredChains.length; j++) {
        const chainX = filteredChains[i];
        const chainY = filteredChains[j];
        const volsX = chainVolatilitySeries[chainX] || [];
        const volsY = chainVolatilitySeries[chainY] || [];

        if (volsX.length > 0 && volsY.length > 0) {
          const correlation = calculatePearsonCorrelation(volsX, volsY);
          correlations.push({
            chainX,
            chainY,
            correlation: isNaN(correlation) ? 0 : correlation,
          });
        }
      }
    }

    return correlations;
  }, [chartData, filteredChains, volatilityWindowSize]);

  // 计算波动率锥数据
  const volatilityConeData = useMemo(() => {
    const targetChain = selectedConeChain || filteredChains[0];
    if (!targetChain) return [];

    const prices = historicalPrices[targetChain]?.map((p) => p.price) || [];
    if (prices.length < 50) return [];

    return calculateVolatilityCone(prices, [10, 20, 30, 50, 100]);
  }, [historicalPrices, filteredChains, selectedConeChain]);

  // 获取波动率颜色
  const getVolatilityLevelColor = (volatility: number): string => {
    if (volatility < 30) return semanticColors.success.DEFAULT;
    if (volatility < 60) return semanticColors.warning.DEFAULT;
    return semanticColors.danger.DEFAULT;
  };

  const getCorrelationColor = (correlation: number): string => {
    const absCorr = Math.abs(correlation);
    if (absCorr >= 0.7) return chartColors.recharts.primary;
    if (absCorr >= 0.4) return chartColors.recharts.primaryLight;
    if (absCorr >= 0.2) return chartColors.semantic.neutral;
    return chartColors.recharts.grid;
  };

  const handleLegendClick = (e: unknown) => {
    const dataKey = (e as { dataKey?: string | number })?.dataKey;
    if (typeof dataKey === 'string') {
      const newSet = new Set(hiddenLines);
      if (newSet.has(dataKey)) newSet.delete(dataKey);
      else newSet.add(dataKey);
      setHiddenLines(newSet);
    }
  };

  const VolatilityTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ dataKey: string; value: number; color: string }>;
    label?: string | number;
  }) => {
    if (!active || !payload || payload.length === 0) return null;

    const validPayload = payload.filter(
      (p) =>
        p.value !== undefined && !isNaN(p.value) && filteredChains.includes(p.dataKey as Blockchain)
    );
    if (validPayload.length === 0) return null;

    // 按波动率排序
    const sortedPayload = [...validPayload].sort((a, b) => (b.value || 0) - (a.value || 0));

    return (
      <div className="bg-white border border-gray-200 p-3 min-w-[220px]">
        <p className="text-gray-600 text-xs mb-2 font-medium border-b border-gray-100 pb-1">
          {typeof label === 'string'
            ? label
            : t('crossChain.dataPointLabel', { index: label ?? 0 })}
        </p>
        {sortedPayload.map((entry, index: number) => {
          const chain = entry.dataKey as Blockchain;
          const volatility = entry.value || 0;
          const level =
            volatility < 30
              ? t('crossChain.lowVolatility')
              : volatility < 60
                ? t('crossChain.mediumVolatility')
                : t('crossChain.highVolatility');
          return (
            <div key={index} className="mb-1.5 pb-1.5 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3" style={{ backgroundColor: entry.color }} />
                <span className="text-xs text-gray-700">{chainNames[chain]}</span>
              </div>
              <div className="text-xs pl-5 font-mono flex items-center gap-2">
                <span
                  className="font-semibold"
                  style={{ color: getVolatilityLevelColor(volatility) }}
                >
                  {volatility.toFixed(2)}%
                </span>
                <span className="text-gray-400">({level})</span>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const ConeTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: ReadonlyArray<{
      dataKey: string;
      value: number;
      color?: string;
      payload?: VolatilityConePoint;
    }>;
  }) => {
    if (!active || !payload || payload.length === 0) return null;

    const data = payload[0]?.payload;
    if (!data) return null;

    return (
      <div className="bg-white border border-gray-200 p-3 min-w-[180px]">
        <p className="text-gray-600 text-xs mb-2 font-medium border-b border-gray-100 pb-1">
          {t('crossChain.windowSize')}: {data.windowSize}
        </p>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500">{t('crossChain.maxValue')}:</span>
            <span className="font-mono text-danger-600">{data.maxVolatility.toFixed(2)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t('crossChain.p90')}:</span>
            <span className="font-mono">{data.p90.toFixed(2)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t('crossChain.p75')}:</span>
            <span className="font-mono">{data.p75.toFixed(2)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t('crossChain.median')}:</span>
            <span className="font-mono font-semibold">{data.medianVolatility.toFixed(2)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t('crossChain.mean')}:</span>
            <span className="font-mono">{data.meanVolatility.toFixed(2)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t('crossChain.p25')}:</span>
            <span className="font-mono">{data.p25.toFixed(2)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t('crossChain.p10')}:</span>
            <span className="font-mono">{data.p10.toFixed(2)}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">{t('crossChain.minValue')}:</span>
            <span className="font-mono text-success-600">{data.minVolatility.toFixed(2)}%</span>
          </div>
        </div>
      </div>
    );
  };

  if (filteredChains.length === 0) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* 滚动波动率时序图 */}
      <div className="mb-8 pb-8 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide">
              {t('crossChain.rollingVolatility')}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {t('crossChain.windowSize')}: {volatilityWindowSize}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">{t('crossChain.windowSize')}:</span>
            <div className="flex items-center gap-1 border border-gray-200">
              {VOLATILITY_WINDOW_SIZES.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setVolatilityWindowSize(option.value)}
                  className={`px-3 py-1 text-xs transition-colors ${
                    volatilityWindowSize === option.value
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-600 hover:border-gray-300 border border-transparent'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 border border-gray-200">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={rollingVolatilityData}
                margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => `${value.toFixed(0)}%`}
                  width={50}
                  label={{
                    value: t('crossChain.annualizedVolatility'),
                    angle: -90,
                    position: 'insideLeft',
                    fontSize: 12,
                  }}
                />
                <RechartsTooltip content={<VolatilityTooltip />} />
                <Legend onClick={handleLegendClick} />

                <ReferenceLine
                  y={30}
                  stroke={semanticColors.success.DEFAULT}
                  strokeDasharray="5 5"
                  strokeOpacity={0.5}
                />
                <ReferenceLine
                  y={60}
                  stroke={semanticColors.warning.DEFAULT}
                  strokeDasharray="5 5"
                  strokeOpacity={0.5}
                />

                {filteredChains.map((chain) => (
                  <Line
                    key={chain}
                    type="monotone"
                    dataKey={chain}
                    name={chainNames[chain]}
                    stroke={chainColors[chain]}
                    strokeWidth={2}
                    dot={false}
                    hide={hiddenLines.has(chain)}
                    strokeOpacity={0.8}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* 波动率水平说明 */}
          <div className="mt-4 flex items-center justify-center gap-6 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-success-500" />
              <span className="text-gray-600">&lt; 30% ({t('crossChain.lowVolatility')})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-warning-500" />
              <span className="text-gray-600">30% - 60% ({t('crossChain.mediumVolatility')})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-0.5 bg-danger-500" />
              <span className="text-gray-600">&gt; 60% ({t('crossChain.highVolatility')})</span>
            </div>
          </div>
        </div>
      </div>

      {/* 波动率相关性矩阵 */}
      <div className="mb-8 pb-8 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide mb-4">
          {t('crossChain.volatilityCorrelationMatrix')}
        </h3>
        <p className="text-xs text-gray-500 mb-4">{t('crossChain.volatilityCorrelationMatrix')}</p>

        <div className="overflow-x-auto">
          <div className="min-w-full">
            <div className="flex">
              <div className="w-24 shrink-0" />
              {filteredChains.map((chain) => (
                <div key={chain} className="flex-1 min-w-20 text-center px-1 py-2">
                  <span className="text-xs font-medium text-gray-600">{chainNames[chain]}</span>
                </div>
              ))}
            </div>
            {filteredChains.map((chainX) => (
              <div key={chainX} className="flex">
                <div className="w-24 shrink-0 flex items-center py-1">
                  <span className="text-xs font-medium text-gray-600">{chainNames[chainX]}</span>
                </div>
                {filteredChains.map((chainY) => {
                  if (chainX === chainY) {
                    return (
                      <div
                        key={`${chainX}-${chainY}`}
                        className="flex-1 min-w-20 h-12 flex items-center justify-center px-0.5 bg-gray-100"
                      >
                        <span className="text-xs font-medium text-gray-400">-</span>
                      </div>
                    );
                  }

                  const correlationData = volatilityCorrelationMatrix.find(
                    (c) =>
                      (c.chainX === chainX && c.chainY === chainY) ||
                      (c.chainX === chainY && c.chainY === chainX)
                  );
                  const correlation = correlationData?.correlation ?? 0;
                  const bgColor = getCorrelationColor(correlation);
                  const textColor = Math.abs(correlation) > 0.4 ? 'text-white' : 'text-gray-900';

                  return (
                    <div
                      key={`${chainX}-${chainY}`}
                      className="flex-1 min-w-20 h-12 flex items-center justify-center px-0.5 cursor-pointer transition-transform hover:scale-105"
                      style={{ backgroundColor: bgColor }}
                      title={`${chainNames[chainX]} vs ${chainNames[chainY]}: r = ${correlation.toFixed(4)}`}
                    >
                      <span className={`text-xs font-medium ${textColor}`}>
                        {correlation.toFixed(2)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
            <div className="mt-4 flex items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">
                  {t('crossChain.correlationStrength')}:
                </span>
                <div
                  className="w-32 h-3"
                  style={{
                    background: `linear-gradient(to right, ${chartColors.recharts.grid}, ${chartColors.semantic.neutral}, ${chartColors.recharts.primaryLight}, ${chartColors.recharts.primary})`,
                  }}
                />
                <span className="text-xs text-gray-500">{t('crossChain.weakToStrong')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 波动率锥分析 */}
      <div className="mb-8 pb-8 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide">
              {t('crossChain.volatilityConeAnalysis')}
            </h3>
            <p className="text-xs text-gray-500 mt-1">{t('crossChain.volatilityConeDesc')}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{t('crossChain.selectChain')}:</span>
            <DropdownSelect<Blockchain>
              options={filteredChains.map((chain) => ({
                value: chain,
                label: chainNames[chain],
              }))}
              value={selectedConeChain || filteredChains[0] || ('' as Blockchain)}
              onChange={(value) => setSelectedConeChain(value)}
              className="w-40"
            />
          </div>
        </div>

        <div className="bg-gray-50 p-4 border border-gray-200">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={volatilityConeData}
                margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} />
                <XAxis
                  dataKey="windowSize"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => `${value}`}
                  label={{
                    value: t('crossChain.windowSize'),
                    position: 'insideBottom',
                    offset: -5,
                    fontSize: 12,
                  }}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(value) => `${value.toFixed(0)}%`}
                  width={50}
                  label={{
                    value: t('crossChain.annualizedVolatility'),
                    angle: -90,
                    position: 'insideLeft',
                    fontSize: 12,
                  }}
                />
                <RechartsTooltip content={<ConeTooltip />} />

                <Area
                  type="monotone"
                  dataKey="maxVolatility"
                  stroke="none"
                  fill={semanticColors.danger.light}
                  fillOpacity={0.3}
                />
                <Area
                  type="monotone"
                  dataKey="p90"
                  stroke="none"
                  fill={semanticColors.warning.light}
                  fillOpacity={0.4}
                />
                <Area
                  type="monotone"
                  dataKey="p75"
                  stroke="none"
                  fill={semanticColors.info.light}
                  fillOpacity={0.5}
                />
                <Area
                  type="monotone"
                  dataKey="medianVolatility"
                  stroke="none"
                  fill={semanticColors.success.light}
                  fillOpacity={0.6}
                />

                <Line
                  type="monotone"
                  dataKey="maxVolatility"
                  stroke={semanticColors.danger.dark}
                  strokeWidth={1}
                  dot={false}
                  strokeDasharray="3 3"
                />
                <Line
                  type="monotone"
                  dataKey="p90"
                  stroke={semanticColors.warning.DEFAULT}
                  strokeWidth={1}
                  dot={false}
                  strokeDasharray="3 3"
                />
                <Line
                  type="monotone"
                  dataKey="p75"
                  stroke={chartColors.recharts.primaryLight}
                  strokeWidth={1}
                  dot={false}
                  strokeDasharray="3 3"
                />
                <Line
                  type="monotone"
                  dataKey="medianVolatility"
                  stroke={semanticColors.success.DEFAULT}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="meanVolatility"
                  stroke={chartColors.recharts.indigo}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  strokeDasharray="5 5"
                />
                <Line
                  type="monotone"
                  dataKey="p25"
                  stroke={chartColors.recharts.primaryLight}
                  strokeWidth={1}
                  dot={false}
                  strokeDasharray="3 3"
                />
                <Line
                  type="monotone"
                  dataKey="p10"
                  stroke={semanticColors.warning.main}
                  strokeWidth={1}
                  dot={false}
                  strokeDasharray="3 3"
                />
                <Line
                  type="monotone"
                  dataKey="minVolatility"
                  stroke={semanticColors.success.dark}
                  strokeWidth={1}
                  dot={false}
                  strokeDasharray="3 3"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* 图例说明 */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-success-600" style={{ height: '2px' }} />
              <span className="text-gray-600">{t('crossChain.median')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-indigo-500" style={{ height: '2px' }} />
              <span className="text-gray-600">{t('crossChain.mean')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-primary-500" style={{ height: '1px' }} />
              <span className="text-gray-600">25%/75%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-warning-500" style={{ height: '1px' }} />
              <span className="text-gray-600">10%/90%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-danger-600" style={{ height: '1px' }} />
              <span className="text-gray-600">{t('crossChain.maxValue')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-success-600" style={{ height: '1px' }} />
              <span className="text-gray-600">{t('crossChain.minValue')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
