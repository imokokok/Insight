'use client';

import { useState, useMemo } from 'react';
import { useCrossChainData } from '../useCrossChainData';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import { chainNames, chainColors, calculateRollingCorrelation } from '../utils';
import { Blockchain } from '@/types/oracle';

interface RollingCorrelationChartProps {
  data: ReturnType<typeof useCrossChainData>;
}

const WINDOW_SIZES = [
  { value: 30, label: '30' },
  { value: 50, label: '50' },
  { value: 100, label: '100' },
];

interface ChartDataPoint {
  index: number;
  [key: string]: number | string;
}

export function RollingCorrelationChart({ data }: RollingCorrelationChartProps) {
  const { filteredChains, chartData } = data;
  const [windowSize, setWindowSize] = useState(30);
  const [hiddenLines, setHiddenLines] = useState<Set<string>>(new Set());

  // Generate unique chain pairs for rolling correlation
  const chainPairs = useMemo(() => {
    const pairs: { chainX: Blockchain; chainY: Blockchain; key: string }[] = [];
    for (let i = 0; i < filteredChains.length; i++) {
      for (let j = i + 1; j < filteredChains.length; j++) {
        const chainX = filteredChains[i];
        const chainY = filteredChains[j];
        pairs.push({
          chainX,
          chainY,
          key: `${chainX}-${chainY}`,
        });
      }
    }
    return pairs;
  }, [filteredChains]);

  // Calculate rolling correlation data
  const rollingCorrelationData = useMemo(() => {
    if (chainPairs.length === 0 || chartData.length === 0) return [];

    // Get aligned price arrays for each chain
    const chainPrices: Partial<Record<Blockchain, number[]>> = {};
    filteredChains.forEach((chain) => {
      chainPrices[chain] = chartData
        .map((point) => point[chain] as number | undefined)
        .filter((p): p is number => p !== undefined && !isNaN(p));
    });

    // Calculate rolling correlations for each pair
    const pairCorrelations: Record<string, { timestamp: number; correlation: number }[]> = {};
    chainPairs.forEach(({ chainX, chainY, key }) => {
      const pricesX = chainPrices[chainX] || [];
      const pricesY = chainPrices[chainY] || [];
      if (pricesX.length >= windowSize && pricesY.length >= windowSize) {
        pairCorrelations[key] = calculateRollingCorrelation(pricesX, pricesY, windowSize);
      }
    });

    // Find the maximum length among all correlation arrays
    const maxLength = Math.max(...Object.values(pairCorrelations).map((arr) => arr.length), 0);

    // Build chart data points
    const dataPoints: ChartDataPoint[] = [];
    for (let i = 0; i < maxLength; i++) {
      const point: ChartDataPoint = { index: i };
      chainPairs.forEach(({ key }) => {
        const correlations = pairCorrelations[key];
        if (correlations && correlations[i]) {
          point[key] = correlations[i].correlation;
        }
      });
      dataPoints.push(point);
    }

    return dataPoints;
  }, [chainPairs, chartData, filteredChains, windowSize]);

  // Get color for a chain pair
  const getPairColor = (chainX: Blockchain, chainY: Blockchain): string => {
    // Blend the two chain colors
    const color1 = chainColors[chainX];
    const color2 = chainColors[chainY];
    return color1 || color2 || '#666';
  };

  // Determine stroke style based on correlation value
  const getStrokeStyle = (value: number | undefined): { width: number; opacity: number } => {
    if (value === undefined) return { width: 1, opacity: 0.3 };
    const absValue = Math.abs(value);
    if (absValue > 0.8 || absValue < 0.2) {
      return { width: 3, opacity: 1 };
    }
    return { width: 1.5, opacity: 0.7 };
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

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ dataKey: string; value: number; color: string }>;
    label?: number;
  }) => {
    if (!active || !payload || payload.length === 0) return null;

    const validPayload = payload.filter((p) => p.value !== undefined && !isNaN(p.value));
    if (validPayload.length === 0) return null;

    return (
      <div className="bg-white border border-gray-200 shadow-lg p-3 min-w-[200px]">
        <p className="text-gray-600 text-xs mb-2 font-medium border-b border-gray-100 pb-1">
          数据点 #{label}
        </p>
        {validPayload.map((entry, index: number) => {
          const pairKey = entry.dataKey;
          const pair = chainPairs.find((p) => p.key === pairKey);
          if (!pair) return null;
          const { width } = getStrokeStyle(entry.value);
          const isHighlighted = width > 2;
          return (
            <div key={index} className="mb-1.5 pb-1.5 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-0.5"
                  style={{
                    backgroundColor: entry.color,
                    height: isHighlighted ? '3px' : '1.5px',
                  }}
                />
                <span className="text-xs text-gray-700">
                  {chainNames[pair.chainX]} - {chainNames[pair.chainY]}
                </span>
              </div>
              <div
                className={`text-xs pl-5 font-mono ${
                  isHighlighted ? 'font-semibold text-gray-900' : 'text-gray-600'
                }`}
              >
                r = {Number(entry.value).toFixed(4)}
                {isHighlighted && (
                  <span className="ml-1 text-[10px] text-orange-500">
                    {Math.abs(entry.value) > 0.8 ? '(强相关)' : '(弱相关)'}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (chainPairs.length === 0) {
    return null;
  }

  return (
    <div className="mb-8 pb-8 border-b border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide">
            滚动相关性时序图
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            展示不同链对之间价格相关性的动态变化。窗口大小: {windowSize} 个数据点
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">窗口大小:</span>
          <div className="flex items-center gap-1 border border-gray-200 rounded">
            {WINDOW_SIZES.map((option) => (
              <button
                key={option.value}
                onClick={() => setWindowSize(option.value)}
                className={`px-3 py-1 text-xs transition-colors ${
                  windowSize === option.value
                    ? 'bg-gray-900 text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={rollingCorrelationData}
              margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="index"
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => `#${value}`}
                label={{ value: '时间序列', position: 'insideBottom', offset: -5, fontSize: 12 }}
              />
              <YAxis
                domain={[-1, 1]}
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => value.toFixed(1)}
                width={40}
                label={{
                  value: '相关系数',
                  angle: -90,
                  position: 'insideLeft',
                  fontSize: 12,
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend onClick={handleLegendClick} />

              {/* Reference lines for correlation thresholds */}
              <ReferenceLine y={0.8} stroke="#10B981" strokeDasharray="5 5" strokeOpacity={0.5} />
              <ReferenceLine y={-0.8} stroke="#10B981" strokeDasharray="5 5" strokeOpacity={0.5} />
              <ReferenceLine y={0.2} stroke="#F59E0B" strokeDasharray="5 5" strokeOpacity={0.3} />
              <ReferenceLine y={-0.2} stroke="#F59E0B" strokeDasharray="5 5" strokeOpacity={0.3} />
              <ReferenceLine y={0} stroke="#6B7280" strokeDasharray="3 3" />

              {chainPairs.map(({ chainX, chainY, key }) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={`${chainNames[chainX]} - ${chainNames[chainY]}`}
                  stroke={getPairColor(chainX, chainY)}
                  strokeWidth={2}
                  dot={false}
                  hide={hiddenLines.has(key)}
                  strokeOpacity={0.8}
                  activeDot={{ r: 4, strokeWidth: 0 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Legend for thresholds */}
        <div className="mt-4 flex items-center justify-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-green-500" style={{ height: '3px' }} />
            <span className="text-gray-600">|r| &gt; 0.8 (强相关)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-gray-400" style={{ height: '1.5px' }} />
            <span className="text-gray-600">0.2 ≤ |r| ≤ 0.8 (中等相关)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5 bg-yellow-500" style={{ height: '3px' }} />
            <span className="text-gray-600">|r| &lt; 0.2 (弱相关)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
