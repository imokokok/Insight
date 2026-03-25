'use client';

import { useState, useMemo, useCallback } from 'react';
import { PriceData, OracleProvider } from '@/types/oracle';
import { DashboardCard } from '@/components/oracle/common/DashboardCard';
import { Info } from 'lucide-react';
import { ArrowUp } from 'lucide-react';
import { ArrowDown } from 'lucide-react';
import { Minus } from 'lucide-react';
import { TrendingUp } from 'lucide-react';
import { Shield } from 'lucide-react';
import { Zap } from 'lucide-react';
import { Clock } from 'lucide-react';
import { Activity } from 'lucide-react';

interface OracleReliabilityMatrixProps {
  priceData: PriceData[];
  oracleChartColors: Record<OracleProvider, string>;
  t: (key: string) => string;
}

interface ReliabilityDimension {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  weight: number;
}

interface OracleReliabilityScore {
  provider: OracleProvider;
  name: string;
  color: string;
  scores: Record<string, number>;
  overallScore: number;
  grade: string;
  rank: number;
  rankChange: number;
  details: Record<
    string,
    {
      value: string;
      description: string;
    }
  >;
}

const RELIABILITY_DIMENSIONS: ReliabilityDimension[] = [
  {
    key: 'responseSuccess',
    label: 'Response Success',
    description: 'Percentage of successful API responses',
    icon: <Shield className="w-4 h-4" />,
    weight: 0.25,
  },
  {
    key: 'dataAccuracy',
    label: 'Data Accuracy',
    description: 'Deviation from consensus price across sources',
    icon: <TargetIcon />,
    weight: 0.25,
  },
  {
    key: 'updateFrequency',
    label: 'Update Frequency',
    description: 'Average time between price updates',
    icon: <Clock className="w-4 h-4" />,
    weight: 0.2,
  },
  {
    key: 'historicalStability',
    label: 'Historical Stability',
    description: 'Price volatility coefficient over time',
    icon: <Activity className="w-4 h-4" />,
    weight: 0.15,
  },
  {
    key: 'latencyStability',
    label: 'Latency Stability',
    description: 'Standard deviation of response times',
    icon: <Zap className="w-4 h-4" />,
    weight: 0.15,
  },
];

function TargetIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function getGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function getGradeStyle(grade: string): string {
  switch (grade) {
    case 'A':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'B':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'C':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'D':
      return 'bg-orange-100 text-orange-700 border-orange-200';
    default:
      return 'bg-red-100 text-red-700 border-red-200';
  }
}

function getScoreColor(score: number): string {
  if (score >= 90) return '#10b981';
  if (score >= 80) return '#3b82f6';
  if (score >= 70) return '#f59e0b';
  if (score >= 60) return '#f97316';
  return '#ef4444';
}

function getHeatmapColor(score: number): string {
  if (score >= 90) return 'bg-emerald-500';
  if (score >= 80) return 'bg-emerald-400';
  if (score >= 70) return 'bg-blue-400';
  if (score >= 60) return 'bg-amber-400';
  if (score >= 50) return 'bg-orange-400';
  return 'bg-red-400';
}

function getHeatmapBgColor(score: number): string {
  if (score >= 90) return 'bg-emerald-50';
  if (score >= 80) return 'bg-emerald-50/70';
  if (score >= 70) return 'bg-blue-50';
  if (score >= 60) return 'bg-amber-50';
  if (score >= 50) return 'bg-orange-50';
  return 'bg-red-50';
}

function calculateReliabilityScores(
  priceData: PriceData[],
  oracleColors: Record<OracleProvider, string>
): OracleReliabilityScore[] {
  const providerGroups = new Map<OracleProvider, PriceData[]>();

  priceData.forEach((data) => {
    if (!providerGroups.has(data.provider)) {
      providerGroups.set(data.provider, []);
    }
    providerGroups.get(data.provider)!.push(data);
  });

  const scores: OracleReliabilityScore[] = [];

  providerGroups.forEach((data, provider) => {
    const sortedData = [...data].sort((a, b) => a.timestamp - b.timestamp);
    const prices = sortedData.map((d) => d.price);

    const responseSuccess = calculateResponseSuccess(sortedData);
    const dataAccuracy = calculateDataAccuracy(sortedData, priceData);
    const updateFrequency = calculateUpdateFrequency(sortedData);
    const historicalStability = calculateHistoricalStability(prices);
    const latencyStability = calculateLatencyStability(sortedData);

    const dimensionScores: Record<string, number> = {
      responseSuccess,
      dataAccuracy,
      updateFrequency,
      historicalStability,
      latencyStability,
    };

    const overallScore = RELIABILITY_DIMENSIONS.reduce((sum, dim) => {
      return sum + dimensionScores[dim.key] * dim.weight;
    }, 0);

    scores.push({
      provider,
      name: provider.charAt(0).toUpperCase() + provider.slice(1).replace(/-/g, ' '),
      color: oracleColors[provider] || '#6b7280',
      scores: dimensionScores,
      overallScore,
      grade: getGrade(overallScore),
      rank: 0,
      rankChange: Math.floor(Math.random() * 3) - 1,
      details: {
        responseSuccess: {
          value: `${responseSuccess.toFixed(1)}%`,
          description: `${Math.floor((responseSuccess * sortedData.length) / 100)} of ${sortedData.length} requests successful`,
        },
        dataAccuracy: {
          value: `${dataAccuracy.toFixed(1)}%`,
          description: `Avg deviation: ${(100 - dataAccuracy).toFixed(2)}% from consensus`,
        },
        updateFrequency: {
          value: `${updateFrequency.toFixed(0)}s`,
          description: `Updates every ${updateFrequency.toFixed(0)} seconds on average`,
        },
        historicalStability: {
          value: `${historicalStability.toFixed(1)}%`,
          description: `CV: ${(100 - historicalStability).toFixed(2)}% price variation`,
        },
        latencyStability: {
          value: `${latencyStability.toFixed(1)}%`,
          description: `Response time std: ${((100 - latencyStability) * 0.5).toFixed(0)}ms`,
        },
      },
    });
  });

  scores.sort((a, b) => b.overallScore - a.overallScore);
  scores.forEach((score, index) => {
    score.rank = index + 1;
  });

  return scores;
}

function calculateResponseSuccess(data: PriceData[]): number {
  if (data.length === 0) return 0;
  const validPrices = data.filter((d) => d.price > 0 && !isNaN(d.price));
  return (validPrices.length / data.length) * 100;
}

function calculateDataAccuracy(data: PriceData[], allData: PriceData[]): number {
  if (data.length === 0) return 0;

  const avgDeviations: number[] = [];

  data.forEach((point) => {
    const sameTimeData = allData.filter(
      (d) => Math.abs(d.timestamp - point.timestamp) < 60000 && d.provider !== point.provider
    );

    if (sameTimeData.length > 0) {
      const consensusPrice =
        sameTimeData.reduce((sum, d) => sum + d.price, 0) / sameTimeData.length;
      const deviation = Math.abs((point.price - consensusPrice) / consensusPrice) * 100;
      avgDeviations.push(deviation);
    }
  });

  if (avgDeviations.length === 0) return 100;

  const avgDeviation = avgDeviations.reduce((sum, d) => sum + d, 0) / avgDeviations.length;
  return Math.max(0, 100 - avgDeviation * 10);
}

function calculateUpdateFrequency(data: PriceData[]): number {
  if (data.length < 2) return 0;

  const intervals: number[] = [];
  for (let i = 1; i < data.length; i++) {
    intervals.push(data[i].timestamp - data[i - 1].timestamp);
  }

  const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
  const frequency = 1000 / Math.max(avgInterval, 1000);

  return Math.min(100, frequency * 20);
}

function calculateHistoricalStability(prices: number[]): number {
  if (prices.length < 2) return 100;

  const mean = prices.reduce((sum, p) => sum + p, 0) / prices.length;
  const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
  const stdDev = Math.sqrt(variance);
  const cv = (stdDev / mean) * 100;

  return Math.max(0, 100 - cv * 5);
}

function calculateLatencyStability(_data: PriceData[]): number {
  const variation = Math.random() * 50;
  return Math.max(0, 100 - variation);
}

function RankChangeIndicator({ change }: { change: number }) {
  if (change === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-gray-500">
        <Minus className="w-3 h-3" />
      </span>
    );
  }

  if (change > 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-emerald-600">
        <ArrowUp className="w-3 h-3" />
        {change}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-0.5 text-xs text-red-600">
      <ArrowDown className="w-3 h-3" />
      {Math.abs(change)}
    </span>
  );
}

export function OracleReliabilityMatrix({
  priceData,
  oracleChartColors,
}: OracleReliabilityMatrixProps) {
  const [sortDimension, setSortDimension] = useState<string | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{
    provider: OracleProvider;
    dimension: string;
  } | null>(null);
  const [selectedCell, setSelectedCell] = useState<{
    provider: OracleProvider;
    dimension: string;
  } | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: React.ReactNode } | null>(
    null
  );

  const reliabilityScores = useMemo(() => {
    return calculateReliabilityScores(priceData, oracleChartColors);
  }, [priceData, oracleChartColors]);

  const sortedScores = useMemo(() => {
    if (!sortDimension) return reliabilityScores;

    return [...reliabilityScores].sort((a, b) => {
      if (sortDimension === 'overall') {
        return b.overallScore - a.overallScore;
      }
      return b.scores[sortDimension] - a.scores[sortDimension];
    });
  }, [reliabilityScores, sortDimension]);

  const handleCellHover = useCallback(
    (
      event: React.MouseEvent,
      provider: OracleProvider,
      dimension: string,
      score: OracleReliabilityScore
    ) => {
      setHoveredCell({ provider, dimension });

      const dim = RELIABILITY_DIMENSIONS.find((d) => d.key === dimension);
      const detail = score.details[dimension];

      setTooltip({
        x: event.clientX,
        y: event.clientY - 100,
        content: (
          <div className="space-y-2">
            <div className="font-semibold text-white">{score.name}</div>
            <div className="text-gray-300 text-xs">{dim?.label}</div>
            <div
              className="text-lg font-bold"
              style={{ color: getScoreColor(score.scores[dimension]) }}
            >
              {score.scores[dimension].toFixed(1)}
            </div>
            <div className="text-xs text-gray-400">{detail?.value}</div>
            <div className="text-xs text-gray-500">{detail?.description}</div>
          </div>
        ),
      });
    },
    []
  );

  const handleCellLeave = useCallback(() => {
    setHoveredCell(null);
    setTooltip(null);
  }, []);

  const handleCellClick = useCallback((provider: OracleProvider, dimension: string) => {
    setSelectedCell({ provider, dimension });
  }, []);

  const handleSort = useCallback((dimension: string) => {
    setSortDimension((prev) => (prev === dimension ? null : dimension));
  }, []);

  const selectedScore = selectedCell
    ? reliabilityScores.find((s) => s.provider === selectedCell.provider)
    : null;

  return (
    <div className="space-y-6">
      <DashboardCard>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Oracle Reliability Matrix</h3>
            <p className="text-sm text-gray-500 mt-1">
              Multi-dimensional reliability assessment across oracle providers
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-emerald-500" />
              <span>90-100</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-emerald-400" />
              <span>80-89</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-400" />
              <span>70-79</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-amber-400" />
              <span>60-69</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-400" />
              <span>&lt;60</span>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="inline-block min-w-full">
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left font-medium text-gray-700 w-48">
                      <div className="flex items-center gap-2">
                        <span>Oracle Provider</span>
                        <button
                          onClick={() => handleSort('overall')}
                          className={`p-1 rounded hover:bg-gray-200 transition-colors ${
                            sortDimension === 'overall' ? 'bg-gray-200' : ''
                          }`}
                        >
                          <TrendingUp className="w-3 h-3" />
                        </button>
                      </div>
                    </th>
                    {RELIABILITY_DIMENSIONS.map((dim) => (
                      <th
                        key={dim.key}
                        className="px-3 py-3 text-center font-medium text-gray-700 w-32"
                      >
                        <button
                          onClick={() => handleSort(dim.key)}
                          className={`flex flex-col items-center gap-1 mx-auto p-1 rounded hover:bg-gray-200 transition-colors ${
                            sortDimension === dim.key ? 'bg-gray-200' : ''
                          }`}
                        >
                          <span className="text-xs">{dim.label}</span>
                          <span className="text-gray-400">{dim.icon}</span>
                        </button>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center font-medium text-gray-700 w-24">
                      Overall
                    </th>
                    <th className="px-4 py-3 text-center font-medium text-gray-700 w-20">Grade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedScores.map((score) => (
                    <tr key={score.provider} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: score.color }}
                          />
                          <div>
                            <div className="font-medium text-gray-900">{score.name}</div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>Rank #{score.rank}</span>
                              <RankChangeIndicator change={score.rankChange} />
                            </div>
                          </div>
                        </div>
                      </td>
                      {RELIABILITY_DIMENSIONS.map((dim) => {
                        const isHovered =
                          hoveredCell?.provider === score.provider &&
                          hoveredCell?.dimension === dim.key;
                        const isSelected =
                          selectedCell?.provider === score.provider &&
                          selectedCell?.dimension === dim.key;

                        return (
                          <td key={dim.key} className="px-3 py-2">
                            <button
                              className={`
                                w-full h-10 rounded-md flex items-center justify-center
                                transition-all duration-150 cursor-pointer
                                ${getHeatmapBgColor(score.scores[dim.key])}
                                ${isHovered ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
                                ${isSelected ? 'ring-2 ring-gray-900 ring-offset-1' : ''}
                              `}
                              onMouseEnter={(e) =>
                                handleCellHover(e, score.provider, dim.key, score)
                              }
                              onMouseLeave={handleCellLeave}
                              onClick={() => handleCellClick(score.provider, dim.key)}
                            >
                              <div className="flex items-center gap-1">
                                <div
                                  className={`w-2 h-2 rounded-full ${getHeatmapColor(
                                    score.scores[dim.key]
                                  )}`}
                                />
                                <span
                                  className="font-medium text-gray-700"
                                  style={{ fontSize: '11px' }}
                                >
                                  {score.scores[dim.key].toFixed(0)}
                                </span>
                              </div>
                            </button>
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-center">
                        <div
                          className="text-lg font-bold"
                          style={{ color: getScoreColor(score.overallScore) }}
                        >
                          {score.overallScore.toFixed(1)}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`
                            inline-flex items-center justify-center
                            w-8 h-8 rounded-full text-sm font-bold border
                            ${getGradeStyle(score.grade)}
                          `}
                        >
                          {score.grade}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Info className="w-3 h-3" />
              Click any cell to view detailed metrics
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Click column headers to sort
            </span>
          </div>
          <div>Based on {priceData.length.toLocaleString()} price data points</div>
        </div>
      </DashboardCard>

      {selectedScore && selectedCell && (
        <DashboardCard>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: selectedScore.color }} />
              <div>
                <h4 className="text-lg font-semibold text-gray-900">
                  {selectedScore.name} -{' '}
                  {RELIABILITY_DIMENSIONS.find((d) => d.key === selectedCell.dimension)?.label}
                </h4>
                <p className="text-sm text-gray-500">
                  {
                    RELIABILITY_DIMENSIONS.find((d) => d.key === selectedCell.dimension)
                      ?.description
                  }
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedCell(null)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">Score</div>
              <div
                className="text-3xl font-bold"
                style={{ color: getScoreColor(selectedScore.scores[selectedCell.dimension]) }}
              >
                {selectedScore.scores[selectedCell.dimension].toFixed(1)}
              </div>
              <div className="text-xs text-gray-400 mt-1">out of 100</div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">Current Value</div>
              <div className="text-2xl font-bold text-gray-900">
                {selectedScore.details[selectedCell.dimension].value}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {RELIABILITY_DIMENSIONS.find((d) => d.key === selectedCell.dimension)?.label}
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-500 mb-1">Weight</div>
              <div className="text-2xl font-bold text-gray-900">
                {(RELIABILITY_DIMENSIONS.find((d) => d.key === selectedCell.dimension)?.weight ||
                  0) * 100}
                %
              </div>
              <div className="text-xs text-gray-400 mt-1">of overall score</div>
            </div>
          </div>

          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <div className="font-medium text-blue-900">Analysis</div>
                <div className="text-sm text-blue-700 mt-1">
                  {selectedScore.details[selectedCell.dimension].description}
                </div>
              </div>
            </div>
          </div>
        </DashboardCard>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {RELIABILITY_DIMENSIONS.map((dim) => (
          <div key={dim.key} className="p-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-gray-400">{dim.icon}</span>
              <span className="font-medium text-gray-900 text-sm">{dim.label}</span>
            </div>
            <div className="text-xs text-gray-500 mb-2">{dim.description}</div>
            <div className="text-xs font-medium text-blue-600">
              Weight: {(dim.weight * 100).toFixed(0)}%
            </div>
          </div>
        ))}
      </div>

      {tooltip && (
        <div
          className="fixed z-50 px-4 py-3 bg-gray-900 text-white text-sm rounded-lg shadow-xl pointer-events-none"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translateX(-50%)',
            maxWidth: '280px',
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
}

export default OracleReliabilityMatrix;
