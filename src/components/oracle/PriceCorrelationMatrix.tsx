'use client';

import { useState, useMemo } from 'react';
import { DashboardCard } from './DashboardCard';

export interface PriceDataPoint {
  timestamp: number;
  price: number;
}

export interface OraclePriceSeries {
  oracleId: string;
  data: PriceDataPoint[];
}

interface PriceCorrelationMatrixProps {
  data: OraclePriceSeries[];
  oracleNames?: Record<string, string>;
  className?: string;
}

interface CorrelationCell {
  oracle1: string;
  oracle2: string;
  correlation: number;
}

const calculatePearsonCorrelation = (x: number[], y: number[]): number => {
  const n = Math.min(x.length, y.length);

  if (n < 2) {
    return 0;
  }

  const xSlice = x.slice(0, n);
  const ySlice = y.slice(0, n);

  const sumX = xSlice.reduce((a, b) => a + b, 0);
  const sumY = ySlice.reduce((a, b) => a + b, 0);
  const meanX = sumX / n;
  const meanY = sumY / n;

  let numerator = 0;
  let denominatorX = 0;
  let denominatorY = 0;

  for (let i = 0; i < n; i++) {
    const diffX = xSlice[i] - meanX;
    const diffY = ySlice[i] - meanY;
    numerator += diffX * diffY;
    denominatorX += diffX * diffX;
    denominatorY += diffY * diffY;
  }

  const denominator = Math.sqrt(denominatorX * denominatorY);

  if (denominator === 0) {
    return 0;
  }

  const correlation = numerator / denominator;

  return Math.max(-1, Math.min(1, correlation));
};

const getCorrelationColor = (correlation: number): string => {
  const normalizedCorrelation = (correlation + 1) / 2;

  const r = Math.round(normalizedCorrelation * 220);
  const g = Math.round((1 - Math.abs(normalizedCorrelation - 0.5) * 2) * 100);
  const b = Math.round((1 - normalizedCorrelation) * 220);

  return `rgb(${r}, ${g}, ${b})`;
};

const getCorrelationTextColor = (correlation: number): string => {
  const absCorrelation = Math.abs(correlation);
  if (absCorrelation > 0.7) {
    return 'text-white';
  }
  return 'text-gray-800';
};

const getCorrelationLevel = (correlation: number): string => {
  const absCorrelation = Math.abs(correlation);
  if (absCorrelation >= 0.9) return '极强相关';
  if (absCorrelation >= 0.7) return '强相关';
  if (absCorrelation >= 0.5) return '中等相关';
  if (absCorrelation >= 0.3) return '弱相关';
  return '极弱相关';
};

const getCorrelationLevelColor = (correlation: number): string => {
  const absCorrelation = Math.abs(correlation);
  if (absCorrelation >= 0.7) return 'text-green-600';
  if (absCorrelation >= 0.5) return 'text-blue-600';
  if (absCorrelation >= 0.3) return 'text-yellow-600';
  return 'text-gray-600';
};

export function PriceCorrelationMatrix({
  data,
  oracleNames = {},
  className = '',
}: PriceCorrelationMatrixProps) {
  const [hoveredCell, setHoveredCell] = useState<CorrelationCell | null>(null);

  const { correlationMatrix, oracleIds, priceArrays } = useMemo(() => {
    const ids = data.map((d) => d.oracleId);
    const priceArraysMap = new Map<string, number[]>();

    data.forEach((series) => {
      const sortedData = [...series.data].sort((a, b) => a.timestamp - b.timestamp);
      priceArraysMap.set(
        series.oracleId,
        sortedData.map((d) => d.price)
      );
    });

    const matrix: CorrelationCell[][] = [];

    ids.forEach((id1, i) => {
      const row: CorrelationCell[] = [];
      ids.forEach((id2, j) => {
        const prices1 = priceArraysMap.get(id1) || [];
        const prices2 = priceArraysMap.get(id2) || [];
        const correlation = calculatePearsonCorrelation(prices1, prices2);
        row.push({
          oracle1: id1,
          oracle2: id2,
          correlation,
        });
      });
      matrix.push(row);
    });

    return {
      correlationMatrix: matrix,
      oracleIds: ids,
      priceArrays: priceArraysMap,
    };
  }, [data]);

  const stats = useMemo(() => {
    const correlations: number[] = [];
    oracleIds.forEach((id1, i) => {
      oracleIds.forEach((id2, j) => {
        if (i < j) {
          correlations.push(correlationMatrix[i][j].correlation);
        }
      });
    });

    if (correlations.length === 0) {
      return {
        avgCorrelation: 0,
        maxCorrelation: 0,
        minCorrelation: 0,
        highCorrelationCount: 0,
      };
    }

    const avgCorrelation = correlations.reduce((a, b) => a + b, 0) / correlations.length;
    const maxCorrelation = Math.max(...correlations);
    const minCorrelation = Math.min(...correlations);
    const highCorrelationCount = correlations.filter((c) => Math.abs(c) >= 0.7).length;

    return {
      avgCorrelation,
      maxCorrelation,
      minCorrelation,
      highCorrelationCount,
    };
  }, [correlationMatrix, oracleIds]);

  const getOracleName = (id: string): string => {
    return oracleNames[id] || id;
  };

  const colorLegend = [
    { color: 'rgb(110, 50, 220)', label: '-1.0', desc: '完全负相关' },
    { color: 'rgb(160, 100, 180)', label: '-0.5', desc: '负相关' },
    { color: 'rgb(200, 150, 150)', label: '0.0', desc: '无相关' },
    { color: 'rgb(180, 100, 100)', label: '0.5', desc: '正相关' },
    { color: 'rgb(220, 50, 50)', label: '1.0', desc: '完全正相关' },
  ];

  return (
    <DashboardCard
      title="预言机价格相关性矩阵"
      className={className}
      headerAction={
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>预言机数量: {oracleIds.length}</span>
          <span>高相关对: {stats.highCorrelationCount}</span>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-xs text-blue-600 mb-1">平均相关系数</p>
            <p className="text-xl font-bold text-blue-700">{stats.avgCorrelation.toFixed(3)}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3 text-center">
            <p className="text-xs text-green-600 mb-1">最高相关系数</p>
            <p className="text-xl font-bold text-green-700">{stats.maxCorrelation.toFixed(3)}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-3 text-center">
            <p className="text-xs text-red-600 mb-1">最低相关系数</p>
            <p className="text-xl font-bold text-red-700">{stats.minCorrelation.toFixed(3)}</p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3 text-center">
            <p className="text-xs text-purple-600 mb-1">高相关对数量</p>
            <p className="text-xl font-bold text-purple-700">{stats.highCorrelationCount}</p>
          </div>
        </div>

        <div className="relative overflow-x-auto">
          <div className="min-w-fit">
            <div className="flex">
              <div className="w-32 flex-shrink-0" />
              <div className="flex-1">
                <div className="flex gap-1 mb-2">
                  {oracleIds.map((id) => (
                    <div
                      key={id}
                      className="flex-1 min-w-[60px] text-center text-xs text-gray-500 font-medium"
                    >
                      <div className="transform -rotate-45 origin-left whitespace-nowrap">
                        {getOracleName(id)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              {correlationMatrix.map((row, i) => (
                <div key={oracleIds[i]} className="flex items-center">
                  <div className="w-32 flex-shrink-0 pr-3 flex items-center">
                    <span className="text-sm text-gray-700 truncate font-medium">
                      {getOracleName(oracleIds[i])}
                    </span>
                  </div>
                  <div className="flex-1 flex gap-1">
                    {row.map((cell, j) => {
                      const isDiagonal = i === j;
                      const correlation = cell.correlation;

                      return (
                        <div
                          key={`${oracleIds[i]}-${oracleIds[j]}`}
                          className={`flex-1 min-w-[60px] aspect-square rounded-md flex items-center justify-center text-xs font-medium cursor-pointer transition-all hover:scale-110 hover:z-10 hover:ring-2 hover:ring-gray-400 ${getCorrelationTextColor(correlation)}`}
                          style={{
                            backgroundColor: isDiagonal
                              ? '#F3F4F6'
                              : getCorrelationColor(correlation),
                          }}
                          onMouseEnter={() =>
                            !isDiagonal &&
                            setHoveredCell({
                              oracle1: oracleIds[i],
                              oracle2: oracleIds[j],
                              correlation,
                            })
                          }
                          onMouseLeave={() => setHoveredCell(null)}
                        >
                          {isDiagonal ? (
                            <span className="text-gray-400">-</span>
                          ) : (
                            <span className="font-mono">{correlation.toFixed(2)}</span>
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
            <div className="absolute left-1/2 top-0 transform -translate-x-1/2 -translate-y-full mb-2 bg-gray-900 text-white text-xs rounded-lg px-4 py-3 z-20 shadow-xl min-w-[220px]">
              <div className="font-semibold text-sm mb-2">
                {getOracleName(hoveredCell.oracle1)} ↔ {getOracleName(hoveredCell.oracle2)}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">相关系数:</span>
                  <span className="font-mono font-semibold">
                    {hoveredCell.correlation.toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">相关程度:</span>
                  <span className={getCorrelationLevelColor(hoveredCell.correlation)}>
                    {getCorrelationLevel(hoveredCell.correlation)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">相关方向:</span>
                  <span>
                    {hoveredCell.correlation > 0
                      ? '正相关'
                      : hoveredCell.correlation < 0
                        ? '负相关'
                        : '无相关'}
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
          <div className="text-xs text-gray-600 mb-2 font-medium">相关系数图例</div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs text-gray-500">-1.0</span>
            <div className="flex gap-0.5">
              {colorLegend.map((item, index) => (
                <div
                  key={index}
                  className="w-8 h-4 rounded"
                  style={{ backgroundColor: item.color }}
                  title={`${item.label}: ${item.desc}`}
                />
              ))}
            </div>
            <span className="text-xs text-gray-500">1.0</span>
          </div>
          <div className="flex items-center justify-center gap-4 mt-2 text-xs text-gray-500">
            <span>蓝色 = 低相关</span>
            <span>|</span>
            <span>红色 = 高相关</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">相关性分布</h4>
            <div className="space-y-2">
              {[
                { range: '0.9 - 1.0', min: 0.9, max: 1.0 },
                { range: '0.7 - 0.9', min: 0.7, max: 0.9 },
                { range: '0.5 - 0.7', min: 0.5, max: 0.7 },
                { range: '0.3 - 0.5', min: 0.3, max: 0.5 },
                { range: '0.0 - 0.3', min: 0.0, max: 0.3 },
              ].map((item) => {
                const count = correlationMatrix.flat().filter((cell, idx) => {
                  const i = Math.floor(idx / oracleIds.length);
                  const j = idx % oracleIds.length;
                  const absCorr = Math.abs(cell.correlation);
                  return i < j && absCorr >= item.min && absCorr < item.max;
                }).length;
                const total = (oracleIds.length * (oracleIds.length - 1)) / 2 || 1;
                const percentage = ((count / total) * 100).toFixed(1);

                return (
                  <div key={item.range} className="flex items-center gap-2">
                    <div className="w-20 text-xs text-gray-600">{item.range}</div>
                    <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all bg-blue-500"
                        style={{ width: `${percentage}%` }}
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
            <h4 className="text-sm font-semibold text-gray-700 mb-3">最高相关预言机对</h4>
            <div className="space-y-2">
              {correlationMatrix
                .flat()
                .filter((cell, idx) => {
                  const i = Math.floor(idx / oracleIds.length);
                  const j = idx % oracleIds.length;
                  return i < j;
                })
                .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
                .slice(0, 5)
                .map((cell, idx) => (
                  <div key={`${cell.oracle1}-${cell.oracle2}`} className="flex items-center gap-2">
                    <span className="w-5 text-xs text-gray-400 font-medium">{idx + 1}</span>
                    <span className="flex-1 text-sm text-gray-700 truncate">
                      {getOracleName(cell.oracle1)} ↔ {getOracleName(cell.oracle2)}
                    </span>
                    <span
                      className={`text-sm font-mono font-medium ${getCorrelationLevelColor(cell.correlation)}`}
                    >
                      {cell.correlation.toFixed(3)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h4 className="text-sm font-semibold text-blue-800 mb-1">皮尔逊相关系数说明</h4>
              <p className="text-xs text-blue-700">
                皮尔逊相关系数衡量两个预言机价格序列之间的线性相关程度。 系数范围从 -1 到 1，其中 1
                表示完全正相关，-1 表示完全负相关，0 表示无线性相关。
                高相关系数表明预言机价格走势高度一致，数据质量可靠。
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardCard>
  );
}
