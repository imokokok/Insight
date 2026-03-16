'use client';

import { useState, useMemo } from 'react';
import { useI18n } from '@/lib/i18n/provider';
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
import { chartColors, semanticColors, baseColors } from '@/lib/config/colors';

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
  const { t } = useI18n();
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
    return color1 || color2 || baseColors.gray[500];
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
      <div className="bg-white border p-3 min-w-[200px]" style={{ borderColor: baseColors.gray[200] }}>
        <p className="text-xs mb-2 font-medium border-b pb-1" style={{ color: baseColors.gray[600], borderColor: baseColors.gray[100] }}>
          {t('crossChain.dataPoint')} #{label}
        </p>
        {validPayload.map((entry, index: number) => {
          const pairKey = entry.dataKey;
          const pair = chainPairs.find((p) => p.key === pairKey);
          if (!pair) return null;
          const { width } = getStrokeStyle(entry.value);
          const isHighlighted = width > 2;
          return (
            <div key={index} className="mb-1.5 pb-1.5 border-b last:border-0" style={{ borderColor: baseColors.gray[100] }}>
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-0.5"
                  style={{
                    backgroundColor: entry.color,
                    height: isHighlighted ? '3px' : '1.5px',
                  }}
                />
                <span className="text-xs" style={{ color: baseColors.gray[700] }}>
                  {chainNames[pair.chainX]} - {chainNames[pair.chainY]}
                </span>
              </div>
              <div
                className="text-xs pl-5 font-mono"
                style={{ color: isHighlighted ? baseColors.gray[900] : baseColors.gray[600], fontWeight: isHighlighted ? 600 : 400 }}
              >
                r = {Number(entry.value).toFixed(4)}
                {isHighlighted && (
                  <span className="ml-1 text-[10px]" style={{ color: semanticColors.warning.main }}>
                    {Math.abs(entry.value) > 0.8
                      ? `(${t('crossChain.strongCorrelation')})`
                      : `(${t('crossChain.weakCorrelation')})`}
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
    <div id="rolling" className="mb-8 pb-8 border-b" style={{ borderColor: baseColors.gray[200] }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-medium uppercase tracking-wide" style={{ color: baseColors.gray[900] }}>
            {t('crossChain.rollingCorrelationChart')}
          </h3>
          <p className="text-xs mt-1" style={{ color: baseColors.gray[500] }}>
            {t('crossChain.windowSize')}: {windowSize}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: baseColors.gray[500] }}>{t('crossChain.windowSize')}:</span>
          <div className="flex items-center gap-1 border" style={{ borderColor: baseColors.gray[200] }}>
            {WINDOW_SIZES.map((option) => (
              <button
                key={option.value}
                onClick={() => setWindowSize(option.value)}
                className={`px-3 py-1 text-xs transition-colors ${
                  windowSize === option.value
                    ? 'text-white'
                    : 'border border-transparent'
                }`}
                style={{
                  backgroundColor: windowSize === option.value ? baseColors.gray[900] : 'transparent',
                  color: windowSize === option.value ? baseColors.gray[50] : baseColors.gray[600],
                  borderColor: windowSize === option.value ? baseColors.gray[900] : 'transparent'
                }}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 border" style={{ backgroundColor: baseColors.gray[50], borderColor: baseColors.gray[200] }}>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={rollingCorrelationData}
              margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.recharts.grid} />
              <XAxis
                dataKey="index"
                tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                tickFormatter={(value) => `#${value}`}
                stroke={chartColors.recharts.axis}
                label={{
                  value: t('crossChain.timeSeries'),
                  position: 'insideBottom',
                  offset: -5,
                  fontSize: 12,
                  fill: chartColors.recharts.tick
                }}
              />
              <YAxis
                domain={[-1, 1]}
                tick={{ fontSize: 11, fill: chartColors.recharts.tick }}
                tickFormatter={(value) => value.toFixed(1)}
                width={40}
                stroke={chartColors.recharts.axis}
                label={{
                  value: t('crossChain.correlationCoefficient'),
                  angle: -90,
                  position: 'insideLeft',
                  fontSize: 12,
                  fill: chartColors.recharts.tick
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend onClick={handleLegendClick} />

              {/* Reference lines for correlation thresholds */}
              <ReferenceLine
                y={0.8}
                stroke={semanticColors.success.main}
                strokeDasharray="5 5"
                strokeOpacity={0.5}
              />
              <ReferenceLine
                y={-0.8}
                stroke={semanticColors.success.main}
                strokeDasharray="5 5"
                strokeOpacity={0.5}
              />
              <ReferenceLine
                y={0.2}
                stroke={semanticColors.warning.main}
                strokeDasharray="5 5"
                strokeOpacity={0.3}
              />
              <ReferenceLine
                y={-0.2}
                stroke={semanticColors.warning.main}
                strokeDasharray="5 5"
                strokeOpacity={0.3}
              />
              <ReferenceLine
                y={0}
                stroke={chartColors.recharts.secondaryAxis}
                strokeDasharray="3 3"
              />

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
            <div className="w-6 h-0.5" style={{ backgroundColor: semanticColors.success.main, height: '3px' }} />
            <span style={{ color: baseColors.gray[600] }}>
              |r| &gt; 0.8 ({t('crossChain.strongCorrelation')})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5" style={{ backgroundColor: baseColors.gray[400], height: '1.5px' }} />
            <span style={{ color: baseColors.gray[600] }}>0.2 ≤ |r| ≤ 0.8</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-0.5" style={{ backgroundColor: semanticColors.warning.main, height: '3px' }} />
            <span style={{ color: baseColors.gray[600] }}>|r| &lt; 0.2 ({t('crossChain.weakCorrelation')})</span>
          </div>
        </div>
      </div>
    </div>
  );
}
