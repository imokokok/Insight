'use client';

import { useState, useMemo, useCallback } from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
} from 'recharts';
import { OracleProvider } from '@/types/oracle';
import type { PriceDataForTechnicalAnalysis } from '@/types/oracle/price';
import { DashboardCard } from '../common/DashboardCard';
import { useTranslations } from 'next-intl';
import { chartColors, baseColors, semanticColors } from '@/lib/config/colors';


type TimeWindow = '1h' | '6h' | '24h' | '7d' | '30d';

interface OraclePriceData {
  provider: OracleProvider;
  data: PriceDataForTechnicalAnalysis[];
}

interface CorrelationResult {
  pair: [OracleProvider, OracleProvider];
  correlation: number;
  sampleSize: number;
  confidence: number;
  interpretation: 'very-strong' | 'strong' | 'moderate' | 'weak' | 'very-weak';
}

interface ScatterDataPoint {
  x: number;
  y: number;
  timestamp: number;
}

const oracleNames: Record<OracleProvider, string> = {
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

const oracleColors: Record<OracleProvider, string> = {
  [OracleProvider.CHAINLINK]: chartColors.oracle.chainlink,
  [OracleProvider.BAND_PROTOCOL]: chartColors.oracle['band-protocol'],
  [OracleProvider.UMA]: chartColors.oracle.uma,
  [OracleProvider.PYTH]: chartColors.oracle.pyth,
  [OracleProvider.API3]: chartColors.oracle.api3,
  [OracleProvider.REDSTONE]: chartColors.oracle.redstone,
  [OracleProvider.DIA]: chartColors.oracle.dia,
  [OracleProvider.TELLOR]: chartColors.oracle.tellor,
  [OracleProvider.CHRONICLE]: chartColors.oracle.chronicle,
  [OracleProvider.WINKLINK]: chartColors.oracle.winklink,
};

/**
 * 计算皮尔逊相关系数
 * r = Σ((x - x̄)(y - ȳ)) / √(Σ(x - x̄)² * Σ(y - ȳ)²)
 */
function calculatePearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;

  const n = x.length;
  const xMean = x.reduce((sum, val) => sum + val, 0) / n;
  const yMean = y.reduce((sum, val) => sum + val, 0) / n;

  let numerator = 0;
  let xDenominator = 0;
  let yDenominator = 0;

  for (let i = 0; i < n; i++) {
    const xDiff = x[i] - xMean;
    const yDiff = y[i] - yMean;
    numerator += xDiff * yDiff;
    xDenominator += xDiff * xDiff;
    yDenominator += yDiff * yDiff;
  }

  const denominator = Math.sqrt(xDenominator * yDenominator);
  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * 获取相关性解释
 */
function getCorrelationInterpretation(correlation: number): CorrelationResult['interpretation'] {
  const abs = Math.abs(correlation);
  if (abs >= 0.9) return 'very-strong';
  if (abs >= 0.7) return 'strong';
  if (abs >= 0.5) return 'moderate';
  if (abs >= 0.3) return 'weak';
  return 'very-weak';
}

/**
 * 获取相关性颜色
 */
function getCorrelationColor(correlation: number): string {
  const abs = Math.abs(correlation);
  if (abs >= 0.9) return semanticColors.success.DEFAULT; // 绿色 - 非常强
  if (abs >= 0.7) return semanticColors.info.DEFAULT; // 蓝色 - 强
  if (abs >= 0.5) return semanticColors.warning.DEFAULT; // 黄色 - 中等
  if (abs >= 0.3) return chartColors.chart.amber; // 橙色 - 弱
  return semanticColors.danger.DEFAULT; // 红色 - 非常弱
}

/**
 * 获取相关性标签
 */
function getCorrelationLabel(interpretation: CorrelationResult['interpretation']): string {
  const labels: Record<CorrelationResult['interpretation'], string> = {
    'very-strong': '非常强',
    strong: '强',
    moderate: '中等',
    weak: '弱',
    'very-weak': '非常弱',
  };
  return labels[interpretation];
}

interface CorrelationAnalysisProps {
  data: OraclePriceData[];
  className?: string;
}

export function CorrelationAnalysis({ data, className }: CorrelationAnalysisProps) {
  const t = useTranslations();
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('24h');
  const [selectedPair, setSelectedPair] = useState<[OracleProvider, OracleProvider] | null>(null);
  const [showScatterPlot, setShowScatterPlot] = useState(true);

  // 根据时间窗口过滤数据
  const filteredData = useMemo(() => {
    const now = Date.now();
    const windowMs = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
    }[timeWindow];

    return data.map((oracle) => ({
      ...oracle,
      data: oracle.data.filter((point) => now - point.timestamp <= windowMs),
    }));
  }, [data, timeWindow]);

  // 计算所有预言机对的相关性
  const correlations = useMemo((): CorrelationResult[] => {
    const results: CorrelationResult[] = [];
    const providers = filteredData.map((d) => d.provider);

    for (let i = 0; i < providers.length; i++) {
      for (let j = i + 1; j < providers.length; j++) {
        const provider1 = providers[i];
        const provider2 = providers[j];

        const data1 = filteredData.find((d) => d.provider === provider1)?.data || [];
        const data2 = filteredData.find((d) => d.provider === provider2)?.data || [];

        // 对齐时间戳
        const alignedData = alignDataByTimestamp(data1, data2);

        if (alignedData.length >= 10) {
          const prices1 = alignedData.map((d) => d.price1);
          const prices2 = alignedData.map((d) => d.price2);

          const correlation = calculatePearsonCorrelation(prices1, prices2);
          const interpretation = getCorrelationInterpretation(correlation);

          // 计算置信度（简化计算，基于样本大小）
          const confidence = Math.min(100, (alignedData.length / 100) * 100 + 50);

          results.push({
            pair: [provider1, provider2],
            correlation,
            sampleSize: alignedData.length,
            confidence,
            interpretation,
          });
        }
      }
    }

    return results.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  }, [filteredData]);

  // 对齐两个数据源的时间戳
  function alignDataByTimestamp(
    data1: PriceDataForTechnicalAnalysis[],
    data2: PriceDataForTechnicalAnalysis[]
  ): Array<{ timestamp: number; price1: number; price2: number }> {
    const aligned: Array<{ timestamp: number; price1: number; price2: number }> = [];
    const tolerance = 60000; // 1分钟容差

    for (const point1 of data1) {
      const matchingPoint = data2.find(
        (p) => Math.abs(p.timestamp - point1.timestamp) <= tolerance
      );
      if (matchingPoint) {
        aligned.push({
          timestamp: point1.timestamp,
          price1: point1.price,
          price2: matchingPoint.price,
        });
      }
    }

    return aligned;
  }

  // 获取选中的散点图数据
  const scatterData = useMemo((): ScatterDataPoint[] => {
    if (!selectedPair) return [];

    const [p1, p2] = selectedPair;
    const data1 = filteredData.find((d) => d.provider === p1)?.data || [];
    const data2 = filteredData.find((d) => d.provider === p2)?.data || [];

    const aligned = alignDataByTimestamp(data1, data2);
    return aligned.map((d) => ({
      x: d.price1,
      y: d.price2,
      timestamp: d.timestamp,
    }));
  }, [selectedPair, filteredData]);

  // 计算回归线
  const regressionLine = useMemo(() => {
    if (scatterData.length < 2) return null;

    const n = scatterData.length;
    const sumX = scatterData.reduce((sum, p) => sum + p.x, 0);
    const sumY = scatterData.reduce((sum, p) => sum + p.y, 0);
    const sumXY = scatterData.reduce((sum, p) => sum + p.x * p.y, 0);
    const sumXX = scatterData.reduce((sum, p) => sum + p.x * p.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    const minX = Math.min(...scatterData.map((p) => p.x));
    const maxX = Math.max(...scatterData.map((p) => p.x));

    return {
      slope,
      intercept,
      minX,
      maxX,
    };
  }, [scatterData]);

  // 生成热力图数据
  const heatmapData = useMemo(() => {
    const providers = filteredData.map((d) => d.provider);
    const matrix: Array<{ x: OracleProvider; y: OracleProvider; value: number }> = [];

    for (const p1 of providers) {
      for (const p2 of providers) {
        if (p1 === p2) {
          matrix.push({ x: p1, y: p2, value: 1 });
        } else {
          const correlation = correlations.find(
            (c) => (c.pair[0] === p1 && c.pair[1] === p2) || (c.pair[0] === p2 && c.pair[1] === p1)
          );
          matrix.push({
            x: p1,
            y: p2,
            value: correlation?.correlation || 0,
          });
        }
      }
    }

    return matrix;
  }, [correlations, filteredData]);

  const handleCellClick = useCallback(
    (x: OracleProvider, y: OracleProvider) => {
      if (x !== y) {
        setSelectedPair([x, y]);
      }
    },
    [setSelectedPair]
  );

  return (
    <div className={`space-y-6 ${className}`}>
      <DashboardCard title="相关性分析">
        <div className="space-y-6">
          {/* 时间窗口选择 */}
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">时间窗口:</span>
            <div className="flex gap-2">
              {(['1h', '6h', '24h', '7d', '30d'] as TimeWindow[]).map((window) => (
                <button
                  key={window}
                  onClick={() => setTimeWindow(window)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                    timeWindow === window
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {window === '1h' && '1小时'}
                  {window === '6h' && '6小时'}
                  {window === '24h' && '24小时'}
                  {window === '7d' && '7天'}
                  {window === '30d' && '30天'}
                </button>
              ))}
            </div>
          </div>

          {/* 相关性热力图 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-4">相关性热力图</h4>
            <div className="overflow-x-auto">
              <div className="inline-block">
                {/* 表头 */}
                <div className="flex">
                  <div className="w-32"></div>
                  {filteredData.map((oracle) => (
                    <div
                      key={oracle.provider}
                      className="w-24 text-center text-xs font-medium text-gray-600 py-2"
                    >
                      {oracleNames[oracle.provider]}
                    </div>
                  ))}
                </div>
                {/* 热力图行 */}
                {filteredData.map((oracleY) => (
                  <div key={oracleY.provider} className="flex">
                    <div className="w-32 flex items-center text-xs font-medium text-gray-600 px-2">
                      {oracleNames[oracleY.provider]}
                    </div>
                    {filteredData.map((oracleX) => {
                      const cell = heatmapData.find(
                        (h) => h.x === oracleX.provider && h.y === oracleY.provider
                      );
                      const value = cell?.value || 0;
                      const isDiagonal = oracleX.provider === oracleY.provider;

                      return (
                        <div
                          key={`${oracleX.provider}-${oracleY.provider}`}
                          onClick={() =>
                            !isDiagonal && handleCellClick(oracleX.provider, oracleY.provider)
                          }
                          className={`w-24 h-16 flex flex-col items-center justify-center m-0.5 rounded ${
                            isDiagonal
                              ? 'bg-gray-200 cursor-default'
                              : 'cursor-pointer hover:ring-2 hover:ring-primary-500'
                          }`}
                          style={{
                            backgroundColor: isDiagonal
                              ? baseColors.gray[200]
                              : getCorrelationColor(value),
                            opacity: isDiagonal ? 0.5 : Math.abs(value) * 0.8 + 0.2,
                          }}
                        >
                          <span
                            className={`text-sm font-bold ${
                              Math.abs(value) > 0.5 ? 'text-white' : 'text-gray-800'
                            }`}
                          >
                            {value.toFixed(3)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* 图例 */}
            <div className="flex items-center gap-4 mt-4 text-sm">
              <span className="text-gray-600">相关性强度:</span>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: semanticColors.success.DEFAULT }}
                ></div>
                <span>非常强 (≥0.9)</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: semanticColors.info.DEFAULT }}
                ></div>
                <span>强 (0.7-0.9)</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: semanticColors.warning.DEFAULT }}
                ></div>
                <span>中等 (0.5-0.7)</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: chartColors.chart.amber }}
                ></div>
                <span>弱 (0.3-0.5)</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: semanticColors.danger.DEFAULT }}
                ></div>
                <span>非常弱 (&lt;0.3)</span>
              </div>
            </div>
          </div>

          {/* 相关性列表 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-4">相关性详情</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      预言机对
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      相关系数
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      相关性强度
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      样本数量
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      置信度
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {correlations.map((corr) => (
                    <tr
                      key={`${corr.pair[0]}-${corr.pair[1]}`}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedPair(corr.pair)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center">
                            <div
                              className="w-3 h-3 rounded mr-1"
                              style={{ backgroundColor: oracleColors[corr.pair[0]] }}
                            />
                            <span className="text-sm font-medium">{oracleNames[corr.pair[0]]}</span>
                          </div>
                          <span className="text-gray-400">vs</span>
                          <div className="flex items-center">
                            <div
                              className="w-3 h-3 rounded mr-1"
                              style={{ backgroundColor: oracleColors[corr.pair[1]] }}
                            />
                            <span className="text-sm font-medium">{oracleNames[corr.pair[1]]}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className="text-sm font-bold font-mono"
                          style={{ color: getCorrelationColor(corr.correlation) }}
                        >
                          {corr.correlation.toFixed(4)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className="inline-flex items-center px-2.5 py-0.5  text-xs font-medium"
                          style={{
                            backgroundColor: `${getCorrelationColor(corr.correlation)}20`,
                            color: getCorrelationColor(corr.correlation),
                          }}
                        >
                          {getCorrelationLabel(corr.interpretation)}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                        {corr.sampleSize.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded overflow-hidden">
                            <div
                              className="h-full bg-primary-500 rounded"
                              style={{ width: `${corr.confidence}%` }}
                            />
                          </div>
                          <span className="text-sm text-gray-600">
                            {corr.confidence.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPair(corr.pair);
                          }}
                          className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                        >
                          查看散点图
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </DashboardCard>

      {/* 散点图 */}
      {selectedPair && scatterData.length > 0 && (
        <DashboardCard
          title={`散点图: ${oracleNames[selectedPair[0]]} vs ${oracleNames[selectedPair[1]]}`}
          headerAction={
            <button
              onClick={() => setSelectedPair(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          }
        >
          <div className="space-y-4">
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name={oracleNames[selectedPair[0]]}
                    tickFormatter={(value) => `$${value.toFixed(2)}`}
                    label={{
                      value: oracleNames[selectedPair[0]],
                      position: 'bottom',
                      offset: 0,
                    }}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name={oracleNames[selectedPair[1]]}
                    tickFormatter={(value) => `$${value.toFixed(2)}`}
                    label={{
                      value: oracleNames[selectedPair[1]],
                      angle: -90,
                      position: 'insideLeft',
                    }}
                  />
                  <RechartsTooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    formatter={(value: unknown, name: unknown): [string, string] => [
                      `$${Number(value).toFixed(4)}`,
                      String(name),
                    ]}
                    labelFormatter={() => ''}
                  />
                  {/* 回归线 */}
                  {regressionLine && (
                    <ReferenceLine
                      segment={[
                        {
                          x: regressionLine.minX,
                          y: regressionLine.slope * regressionLine.minX + regressionLine.intercept,
                        },
                        {
                          x: regressionLine.maxX,
                          y: regressionLine.slope * regressionLine.maxX + regressionLine.intercept,
                        },
                      ]}
                      stroke={semanticColors.danger.DEFAULT}
                      strokeDasharray="5 5"
                    />
                  )}
                  {/* 完美相关参考线 */}
                  <ReferenceLine
                    segment={[
                      {
                        x: Math.min(...scatterData.map((d) => d.x)),
                        y: Math.min(...scatterData.map((d) => d.x)),
                      },
                      {
                        x: Math.max(...scatterData.map((d) => d.x)),
                        y: Math.max(...scatterData.map((d) => d.x)),
                      },
                    ]}
                    stroke={semanticColors.success.DEFAULT}
                    strokeDasharray="3 3"
                    strokeOpacity={0.5}
                  />
                  <Scatter
                    name="价格数据点"
                    data={scatterData}
                    fill={oracleColors[selectedPair[1]]}
                    fillOpacity={0.6}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            {/* 统计信息 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded p-3">
                <p className="text-xs text-gray-500">样本数量</p>
                <p className="text-lg font-semibold text-gray-900">
                  {scatterData.length.toLocaleString()}
                </p>
              </div>
              <div className="bg-gray-50 rounded p-3">
                <p className="text-xs text-gray-500">相关系数</p>
                <p
                  className="text-lg font-semibold"
                  style={{
                    color: getCorrelationColor(
                      correlations.find(
                        (c) =>
                          (c.pair[0] === selectedPair[0] && c.pair[1] === selectedPair[1]) ||
                          (c.pair[0] === selectedPair[1] && c.pair[1] === selectedPair[0])
                      )?.correlation || 0
                    ),
                  }}
                >
                  {correlations
                    .find(
                      (c) =>
                        (c.pair[0] === selectedPair[0] && c.pair[1] === selectedPair[1]) ||
                        (c.pair[0] === selectedPair[1] && c.pair[1] === selectedPair[0])
                    )
                    ?.correlation.toFixed(4) || '-'}
                </p>
              </div>
              {regressionLine && (
                <>
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-xs text-gray-500">回归斜率</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {regressionLine.slope.toFixed(4)}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-xs text-gray-500">回归截距</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {regressionLine.intercept.toFixed(4)}
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* 说明 */}
            <div className="bg-primary-50 rounded p-4 text-sm text-primary-800">
              <p className="font-medium mb-2">图表说明:</p>
              <ul className="space-y-1 ml-4">
                <li>• 每个点代表同一时间点两个预言机的价格数据</li>
                <li>• 红色虚线: 线性回归线，表示价格趋势关系</li>
                <li>• 绿色虚线: 完美相关参考线 (y=x)</li>
                <li>• 点越集中在回归线附近，相关性越强</li>
              </ul>
            </div>
          </div>
        </DashboardCard>
      )}

      {/* 皮尔逊相关系数说明 */}
      <DashboardCard title="皮尔逊相关系数说明">
        <div className="text-sm text-gray-700 space-y-4">
          <p>
            皮尔逊相关系数（Pearson Correlation
            Coefficient）用于衡量两个变量之间的线性相关程度，取值范围为 -1 到 1。
          </p>
          <div className="bg-gray-50 rounded p-4 font-mono text-center">
            r = Σ((x - x̄)(y - ȳ)) / √(Σ(x - x̄)² × Σ(y - ȳ)²)
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 bg-success-50 rounded">
              <p className="font-bold text-success-700">0.9 - 1.0</p>
              <p className="text-xs text-success-600">非常强正相关</p>
            </div>
            <div className="text-center p-3 bg-primary-50 rounded">
              <p className="font-bold text-primary-700">0.7 - 0.9</p>
              <p className="text-xs text-primary-600">强正相关</p>
            </div>
            <div className="text-center p-3 bg-warning-50 rounded">
              <p className="font-bold text-warning-700">0.5 - 0.7</p>
              <p className="text-xs text-warning-600">中等正相关</p>
            </div>
            <div className="text-center p-3 bg-warning-50 rounded">
              <p className="font-bold text-orange-700">0.3 - 0.5</p>
              <p className="text-xs text-warning-600">弱正相关</p>
            </div>
            <div className="text-center p-3 bg-danger-50 rounded">
              <p className="font-bold text-danger-700">0.0 - 0.3</p>
              <p className="text-xs text-danger-600">极弱/无相关</p>
            </div>
          </div>
          <p className="text-gray-500 text-xs">
            注:
            负值表示负相关，绝对值越大表示相关性越强。在预言机价格分析中，高相关性通常表示预言机之间的价格发现机制较为一致。
          </p>
        </div>
      </DashboardCard>
    </div>
  );
}
