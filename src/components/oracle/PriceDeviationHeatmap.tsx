'use client';

import { useState, useMemo } from 'react';
import { DashboardCard } from './DashboardCard';
import { OracleProvider } from '@/lib/types/oracle';

export interface PriceDeviationDataPoint {
  timestamp: number;
  oracleName: string;
  deviationPercent: number;
  price: number;
}

export interface TimeRange {
  start: number;
  end: number;
}

interface PriceDeviationHeatmapProps {
  data: PriceDeviationDataPoint[];
  timeRange?: TimeRange;
  className?: string;
}

const oracleColors: Record<string, string> = {
  Chainlink: '#375BD2',
  'Band Protocol': '#9B51E0',
  UMA: '#FF6B6B',
  'Pyth Network': '#EC4899',
  API3: '#10B981',
};

const getDeviationColor = (deviation: number): string => {
  const absDeviation = Math.abs(deviation);
  if (absDeviation < 0.1) return '#10B981';
  if (absDeviation < 0.25) return '#34D399';
  if (absDeviation < 0.5) return '#6EE7B7';
  if (absDeviation < 0.75) return '#FCD34D';
  if (absDeviation < 1) return '#FBBF24';
  if (absDeviation < 1.5) return '#F59E0B';
  if (absDeviation < 2) return '#EF4444';
  if (absDeviation < 3) return '#DC2626';
  return '#B91C1C';
};

const getDeviationTextColor = (deviation: number): string => {
  const absDeviation = Math.abs(deviation);
  if (absDeviation < 0.75) return 'text-gray-800';
  return 'text-white';
};

const formatTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

const formatFullTimestamp = (timestamp: number): string => {
  const date = new Date(timestamp);
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
};

export function PriceDeviationHeatmap({
  data,
  timeRange,
  className = '',
}: PriceDeviationHeatmapProps) {
  const [hoveredCell, setHoveredCell] = useState<{
    timestamp: number;
    oracleName: string;
    deviation: number;
    price: number;
  } | null>(null);

  const { heatmapData, oracles, timestamps, maxDeviation } = useMemo(() => {
    const filteredData = timeRange
      ? data.filter((d) => d.timestamp >= timeRange.start && d.timestamp <= timeRange.end)
      : data;

    const oracleSet = new Set<string>();
    const timestampSet = new Set<number>();

    filteredData.forEach((d) => {
      oracleSet.add(d.oracleName);
      timestampSet.add(d.timestamp);
    });

    const oracles = Array.from(oracleSet);
    const timestamps = Array.from(timestampSet).sort((a, b) => a - b);

    const heatmapMap = new Map<string, PriceDeviationDataPoint>();
    filteredData.forEach((d) => {
      heatmapMap.set(`${d.oracleName}-${d.timestamp}`, d);
    });

    const maxDev = Math.max(...filteredData.map((d) => Math.abs(d.deviationPercent)), 0.01);

    return {
      heatmapData: heatmapMap,
      oracles,
      timestamps,
      maxDeviation: maxDev,
    };
  }, [data, timeRange]);

  const stats = useMemo(() => {
    const filteredData = timeRange
      ? data.filter((d) => d.timestamp >= timeRange.start && d.timestamp <= timeRange.end)
      : data;

    if (filteredData.length === 0) {
      return {
        avgDeviation: 0,
        maxDeviation: 0,
        minDeviation: 0,
        anomalyCount: 0,
      };
    }

    const deviations = filteredData.map((d) => d.deviationPercent);
    const avgDeviation = deviations.reduce((a, b) => a + b, 0) / deviations.length;
    const maxDeviation = Math.max(...deviations.map(Math.abs));
    const minDeviation = Math.min(...deviations.map(Math.abs));
    const anomalyCount = deviations.filter((d) => Math.abs(d) > 1).length;

    return {
      avgDeviation,
      maxDeviation,
      minDeviation,
      anomalyCount,
    };
  }, [data, timeRange]);

  const getCellData = (oracle: string, timestamp: number) => {
    return heatmapData.get(`${oracle}-${timestamp}`);
  };

  const colorLegend = [
    { color: '#10B981', label: '< 0.1%', range: '极低' },
    { color: '#34D399', label: '0.1-0.25%', range: '低' },
    { color: '#6EE7B7', label: '0.25-0.5%', range: '较低' },
    { color: '#FCD34D', label: '0.5-0.75%', range: '中等' },
    { color: '#FBBF24', label: '0.75-1%', range: '较高' },
    { color: '#F59E0B', label: '1-1.5%', range: '高' },
    { color: '#EF4444', label: '1.5-2%', range: '很高' },
    { color: '#DC2626', label: '2-3%', range: '极高' },
    { color: '#B91C1C', label: '> 3%', range: '异常' },
  ];

  return (
    <DashboardCard
      title="价格偏差热力图"
      className={className}
      headerAction={
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>时间点: {timestamps.length}</span>
          <span>预言机: {oracles.length}</span>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-xs text-blue-600 mb-1">平均偏差</p>
            <p className="text-xl font-bold text-blue-700">
              {stats.avgDeviation.toFixed(3)}%
            </p>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <p className="text-xs text-red-600 mb-1">最大偏差</p>
            <p className="text-xl font-bold text-red-700">
              {stats.maxDeviation.toFixed(3)}%
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-xs text-green-600 mb-1">最小偏差</p>
            <p className="text-xl font-bold text-green-700">
              {stats.minDeviation.toFixed(3)}%
            </p>
          </div>
          <div className="bg-yellow-50 rounded-lg p-3 text-center">
            <p className="text-xs text-yellow-600 mb-1">异常数据点</p>
            <p className="text-xl font-bold text-yellow-700">{stats.anomalyCount}</p>
          </div>
        </div>

        <div className="relative overflow-x-auto">
          <div className="min-w-fit">
            <div className="flex">
              <div className="w-28 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex gap-1 mb-2">
                  {timestamps.map((ts) => (
                    <div
                      key={ts}
                      className="flex-1 min-w-[40px] text-center text-xs text-gray-500"
                    >
                      {formatTimestamp(ts)}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              {oracles.map((oracle) => (
                <div key={oracle} className="flex items-center">
                  <div className="w-28 flex-shrink-0 pr-3 flex items-center">
                    <div
                      className="w-3 h-3 rounded-full mr-2 flex-shrink-0"
                      style={{ backgroundColor: oracleColors[oracle] || '#6B7280' }}
                    />
                    <span className="text-sm text-gray-700 truncate">{oracle}</span>
                  </div>
                  <div className="flex-1 flex gap-1">
                    {timestamps.map((ts) => {
                      const cellData = getCellData(oracle, ts);
                      const deviation = cellData?.deviationPercent ?? 0;
                      const hasData = cellData !== undefined;

                      return (
                        <div
                          key={`${oracle}-${ts}`}
                          className={`flex-1 min-w-[40px] aspect-square rounded-md flex items-center justify-center text-xs font-medium cursor-pointer transition-all hover:scale-110 hover:z-10 hover:ring-2 hover:ring-gray-400 ${
                            hasData ? getDeviationTextColor(deviation) : 'bg-gray-100'
                          }`}
                          style={{
                            backgroundColor: hasData
                              ? getDeviationColor(deviation)
                              : '#F3F4F6',
                          }}
                          onMouseEnter={() =>
                            hasData &&
                            setHoveredCell({
                              timestamp: ts,
                              oracleName: oracle,
                              deviation,
                              price: cellData.price,
                            })
                          }
                          onMouseLeave={() => setHoveredCell(null)}
                        >
                          {hasData && Math.abs(deviation) < 0.5 ? (
                            <span className="opacity-0">.</span>
                          ) : hasData ? (
                            deviation > 0 ? '+' : ''
                          ) : (
                            '-'
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {hoveredCell && (
            <div className="absolute left-1/2 top-0 transform -translate-x-1/2 -translate-y-full mb-2 bg-gray-900 text-white text-xs rounded-lg px-4 py-3 z-20 shadow-xl min-w-[200px]">
              <div className="font-semibold text-sm mb-2">{hoveredCell.oracleName}</div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">时间:</span>
                  <span>{formatFullTimestamp(hoveredCell.timestamp)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">价格:</span>
                  <span className="font-mono">${hoveredCell.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">偏差:</span>
                  <span
                    className={`font-mono font-semibold ${
                      Math.abs(hoveredCell.deviation) > 1 ? 'text-red-400' : 'text-green-400'
                    }`}
                  >
                    {hoveredCell.deviation > 0 ? '+' : ''}
                    {hoveredCell.deviation.toFixed(4)}%
                  </span>
                </div>
              </div>
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                <div className="border-8 border-transparent border-t-gray-900" />
              </div>
            </div>
          )}
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-xs text-gray-600 mb-2 font-medium">偏差程度图例</div>
          <div className="flex flex-wrap items-center gap-2">
            {colorLegend.map((item) => (
              <div key={item.label} className="flex items-center gap-1">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-gray-600">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">偏差分布</h4>
            <div className="space-y-2">
              {colorLegend.map((item) => {
                const count = Array.from(heatmapData.values()).filter((d) => {
                  const abs = Math.abs(d.deviationPercent);
                  const ranges = [0, 0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3];
                  const idx = colorLegend.indexOf(item);
                  return abs >= ranges[idx] && (idx === ranges.length - 1 || abs < ranges[idx + 1]);
                }).length;
                const total = heatmapData.size || 1;
                const percentage = ((count / total) * 100).toFixed(1);

                return (
                  <div key={item.label} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="flex-1 text-xs text-gray-600">{item.range}</div>
                    <div className="w-24 bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                    <div className="w-16 text-right text-xs text-gray-500">
                      {count} ({percentage}%)
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">预言机偏差排名</h4>
            <div className="space-y-2">
              {oracles
                .map((oracle) => {
                  const oracleData = Array.from(heatmapData.values()).filter(
                    (d) => d.oracleName === oracle
                  );
                  const avgDev =
                    oracleData.reduce((sum, d) => sum + Math.abs(d.deviationPercent), 0) /
                    (oracleData.length || 1);
                  return { oracle, avgDev };
                })
                .sort((a, b) => b.avgDev - a.avgDev)
                .slice(0, 5)
                .map((item, idx) => (
                  <div key={item.oracle} className="flex items-center gap-2">
                    <span className="w-5 text-xs text-gray-400 font-medium">{idx + 1}</span>
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: oracleColors[item.oracle] || '#6B7280' }}
                    />
                    <span className="flex-1 text-sm text-gray-700 truncate">{item.oracle}</span>
                    <span
                      className={`text-sm font-mono font-medium ${
                        item.avgDev > 1 ? 'text-red-600' : 'text-green-600'
                      }`}
                    >
                      {item.avgDev.toFixed(4)}%
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {stats.anomalyCount > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <h4 className="text-sm font-semibold text-red-800 mb-1">
                  检测到高偏差数据点
                </h4>
                <p className="text-xs text-red-700">
                  发现 {stats.anomalyCount} 个偏差超过 1% 的数据点，建议关注这些异常数据。
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardCard>
  );
}
