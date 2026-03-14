'use client';

import { useState, useMemo } from 'react';
import { Publisher, PublisherStats } from '@/types/oracle';
import { PublisherList } from '../common/PublisherList';
import { PublisherReliabilityScore } from '../common/PublisherReliabilityScore';
import { PublisherContributionPanel } from './PublisherContributionPanel';
import { DashboardCard } from '../common/DashboardCard';
import { useI18n } from '@/lib/i18n/provider';

interface AnomalyInfo {
  isPriceDeviationAnomaly: boolean;
  isLatencyAnomaly: boolean;
  anomalyTypes: string[];
}

// 计算 Pearson 相关系数
function calculateCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  return denominator === 0 ? 0 : numerator / denominator;
}

// 计算相关性矩阵
function calculateCorrelationMatrix(
  publishers: Publisher[],
  publisherStats: Record<string, PublisherStats>
): number[][] {
  const n = publishers.length;
  const matrix: number[][] = Array(n)
    .fill(null)
    .map(() => Array(n).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 1;
      } else {
        const statsI = publisherStats[publishers[i].id];
        const statsJ = publisherStats[publishers[j].id];
        if (statsI?.historicalAccuracy && statsJ?.historicalAccuracy) {
          matrix[i][j] = calculateCorrelation(statsI.historicalAccuracy, statsJ.historicalAccuracy);
        } else {
          matrix[i][j] = 0;
        }
      }
    }
  }

  return matrix;
}

// 根据相关系数获取颜色
function getCorrelationColor(correlation: number): string {
  // 高正相关（绿色）-> 低相关/负相关（红色）
  if (correlation >= 0.8) return 'bg-green-500';
  if (correlation >= 0.6) return 'bg-green-400';
  if (correlation >= 0.4) return 'bg-green-300';
  if (correlation >= 0.2) return 'bg-yellow-300';
  if (correlation >= 0) return 'bg-yellow-200';
  if (correlation >= -0.2) return 'bg-orange-200';
  if (correlation >= -0.4) return 'bg-orange-300';
  if (correlation >= -0.6) return 'bg-red-300';
  if (correlation >= -0.8) return 'bg-red-400';
  return 'bg-red-500';
}

// 根据相关系数获取文本颜色
function getCorrelationTextColor(correlation: number): string {
  if (correlation >= 0.4 || correlation <= -0.4) return 'text-white';
  return 'text-gray-800';
}

// 相关性热力图组件
interface CorrelationHeatmapProps {
  publishers: Publisher[];
  correlationMatrix: number[][];
}

function CorrelationHeatmap({ publishers, correlationMatrix }: CorrelationHeatmapProps) {
  return (
    <div className="p-4">
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* 表头 */}
          <div className="flex">
            <div className="w-24 flex-shrink-0"></div>
            {publishers.map((pub) => (
              <div
                key={pub.id}
                className="w-20 h-12 flex items-center justify-center text-xs font-medium text-gray-600 border-b border-gray-200"
              >
                {pub.name}
              </div>
            ))}
          </div>

          {/* 矩阵内容 */}
          {publishers.map((pub, rowIndex) => (
            <div key={pub.id} className="flex">
              <div className="w-24 h-16 flex items-center justify-start text-xs font-medium text-gray-600 pr-2 border-r border-gray-200">
                {pub.name}
              </div>
              {publishers.map((_, colIndex) => {
                const correlation = correlationMatrix[rowIndex]?.[colIndex] ?? 0;
                const bgColor = getCorrelationColor(correlation);
                const textColor = getCorrelationTextColor(correlation);
                return (
                  <div
                    key={`${rowIndex}-${colIndex}`}
                    className={`w-20 h-16 flex items-center justify-center ${bgColor} ${textColor} text-sm font-semibold transition-all hover:opacity-80 cursor-pointer`}
                    title={`${pub.name} ↔ ${publishers[colIndex].name}: ${correlation.toFixed(2)}`}
                  >
                    {correlation.toFixed(2)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* 图例 */}
      <div className="mt-4 flex items-center justify-center gap-4 text-xs">
        <span className="text-gray-600">Low/Negative</span>
        <div className="flex gap-1">
          <div className="w-6 h-4 bg-red-500 rounded"></div>
          <div className="w-6 h-4 bg-red-400 rounded"></div>
          <div className="w-6 h-4 bg-red-300 rounded"></div>
          <div className="w-6 h-4 bg-orange-300 rounded"></div>
          <div className="w-6 h-4 bg-yellow-200 rounded"></div>
          <div className="w-6 h-4 bg-yellow-300 rounded"></div>
          <div className="w-6 h-4 bg-green-300 rounded"></div>
          <div className="w-6 h-4 bg-green-400 rounded"></div>
          <div className="w-6 h-4 bg-green-500 rounded"></div>
        </div>
        <span className="text-gray-600">High Positive</span>
      </div>
    </div>
  );
}

// 检测关联异常
interface CorrelatedAnomaly {
  publisherIds: string[];
  publisherNames: string[];
  anomalyType: string;
  timestamp: number;
}

function detectCorrelatedAnomalies(
  anomalyDetails: Record<string, AnomalyInfo>,
  publishers: Publisher[]
): CorrelatedAnomaly[] {
  const correlatedAnomalies: CorrelatedAnomaly[] = [];

  // 按异常类型分组
  const priceDeviationAnomalies: string[] = [];
  const latencyAnomalies: string[] = [];

  Object.entries(anomalyDetails).forEach(([publisherId, info]) => {
    if (info.isPriceDeviationAnomaly) {
      priceDeviationAnomalies.push(publisherId);
    }
    if (info.isLatencyAnomaly) {
      latencyAnomalies.push(publisherId);
    }
  });

  // 检测价格偏差关联异常（2个及以上Publisher同时异常）
  if (priceDeviationAnomalies.length >= 2) {
    const publisherNames = priceDeviationAnomalies.map(
      (id) => publishers.find((p) => p.id === id)?.name ?? id
    );
    correlatedAnomalies.push({
      publisherIds: priceDeviationAnomalies,
      publisherNames,
      anomalyType: 'priceDeviation',
      timestamp: Date.now(),
    });
  }

  // 检测延迟关联异常（2个及以上Publisher同时异常）
  if (latencyAnomalies.length >= 2) {
    const publisherNames = latencyAnomalies.map(
      (id) => publishers.find((p) => p.id === id)?.name ?? id
    );
    correlatedAnomalies.push({
      publisherIds: latencyAnomalies,
      publisherNames,
      anomalyType: 'latency',
      timestamp: Date.now(),
    });
  }

  return correlatedAnomalies;
}

const mockPublishers: Publisher[] = [
  {
    id: 'pub-1',
    name: 'Binance',
    reliabilityScore: 98.5,
    latency: 45,
    status: 'active',
    submissionCount: 15420,
    lastUpdate: Date.now() - 5000,
    accuracy: 99.2,
    priceDeviation: 0.02,
    submissionFrequency: 98.7,
  },
  {
    id: 'pub-2',
    name: 'FTX',
    reliabilityScore: 96.8,
    latency: 62,
    status: 'active',
    submissionCount: 12850,
    lastUpdate: Date.now() - 8000,
    accuracy: 97.8,
    priceDeviation: 0.05,
    submissionFrequency: 95.2,
  },
  {
    id: 'pub-3',
    name: 'Coinbase',
    reliabilityScore: 99.1,
    latency: 38,
    status: 'active',
    submissionCount: 18200,
    lastUpdate: Date.now() - 3000,
    accuracy: 99.5,
    priceDeviation: 0.01,
    submissionFrequency: 99.1,
  },
  {
    id: 'pub-4',
    name: 'Kraken',
    reliabilityScore: 94.2,
    latency: 85,
    status: 'degraded',
    submissionCount: 9800,
    lastUpdate: Date.now() - 15000,
    accuracy: 95.1,
    priceDeviation: 0.08,
    submissionFrequency: 92.3,
  },
  {
    id: 'pub-5',
    name: 'OKX',
    reliabilityScore: 97.3,
    latency: 55,
    status: 'active',
    submissionCount: 13600,
    lastUpdate: Date.now() - 6000,
    accuracy: 98.1,
    priceDeviation: 0.03,
    submissionFrequency: 96.8,
  },
];

const mockPublisherStats: Record<string, PublisherStats> = {
  'pub-1': {
    publisherId: 'pub-1',
    historicalAccuracy: [98.5, 99.1, 99.3, 99.0, 99.2, 99.4, 99.2],
    priceDeviations: [0.02, 0.01, 0.03, 0.02, 0.01, 0.02, 0.02],
    submissionFrequency: 98.7,
    averageDeviation: 0.019,
    trend: 'improving',
  },
  'pub-2': {
    publisherId: 'pub-2',
    historicalAccuracy: [96.2, 96.8, 97.1, 96.9, 97.5, 97.8, 97.8],
    priceDeviations: [0.06, 0.05, 0.04, 0.05, 0.05, 0.04, 0.05],
    submissionFrequency: 95.2,
    averageDeviation: 0.049,
    trend: 'stable',
  },
  'pub-3': {
    publisherId: 'pub-3',
    historicalAccuracy: [99.0, 99.2, 99.3, 99.4, 99.5, 99.5, 99.5],
    priceDeviations: [0.02, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01],
    submissionFrequency: 99.1,
    averageDeviation: 0.011,
    trend: 'improving',
  },
  'pub-4': {
    publisherId: 'pub-4',
    historicalAccuracy: [95.5, 95.2, 94.8, 94.5, 94.2, 94.8, 95.1],
    priceDeviations: [0.07, 0.08, 0.09, 0.08, 0.08, 0.07, 0.08],
    submissionFrequency: 92.3,
    averageDeviation: 0.079,
    trend: 'declining',
  },
  'pub-5': {
    publisherId: 'pub-5',
    historicalAccuracy: [97.0, 97.2, 97.4, 97.5, 97.6, 97.8, 98.1],
    priceDeviations: [0.04, 0.03, 0.03, 0.03, 0.03, 0.03, 0.03],
    submissionFrequency: 96.8,
    averageDeviation: 0.032,
    trend: 'improving',
  },
};

interface PublisherAnalysisPanelProps {
  publishers?: Publisher[];
  publisherStats?: Record<string, PublisherStats>;
}

export function PublisherAnalysisPanel({
  publishers = mockPublishers,
  publisherStats = mockPublisherStats,
}: PublisherAnalysisPanelProps) {
  const { t } = useI18n();
  const [selectedPublisherId, setSelectedPublisherId] = useState<string | undefined>(
    publishers[0]?.id
  );
  const [anomalyCount, setAnomalyCount] = useState<number>(0);
  const [anomalyDetails, setAnomalyDetails] = useState<Record<string, AnomalyInfo>>({});

  const selectedPublisher = publishers.find((p) => p.id === selectedPublisherId);
  const selectedStats = selectedPublisherId ? publisherStats[selectedPublisherId] : undefined;

  const activeCount = publishers.filter((p) => p.status === 'active').length;
  const avgReliability =
    publishers.reduce((sum, p) => sum + p.reliabilityScore, 0) / publishers.length;
  const avgLatency = publishers.reduce((sum, p) => sum + p.latency, 0) / publishers.length;

  // 计算相关性矩阵
  const correlationMatrix = useMemo(() => {
    return calculateCorrelationMatrix(publishers, publisherStats);
  }, [publishers, publisherStats]);

  // 检测关联异常
  const correlatedAnomalies = useMemo(() => {
    return detectCorrelatedAnomalies(anomalyDetails, publishers);
  }, [anomalyDetails, publishers]);

  const anomalyTypeStats = useMemo(() => {
    const stats = {
      priceDeviation: 0,
      latency: 0,
    };

    Object.values(anomalyDetails).forEach((info) => {
      if (info.isPriceDeviationAnomaly) stats.priceDeviation++;
      if (info.isLatencyAnomaly) stats.latency++;
    });

    return stats;
  }, [anomalyDetails]);

  const handleAnomalyDetected = (count: number, details: Record<string, AnomalyInfo>) => {
    setAnomalyCount(count);
    setAnomalyDetails(details);
  };

  return (
    <div className="space-y-6">
      {anomalyCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-yellow-800">
                {t('publisherAnalysis.anomalyDetected', { count: anomalyCount })}
              </h4>
              <p className="text-sm text-yellow-700 mt-1">
                {t('publisherAnalysis.anomalyTypeDistribution')}
                {anomalyTypeStats.priceDeviation > 0 && (
                  <span className="ml-1">
                    {t('publisherAnalysis.priceDeviationAnomaly', {
                      count: anomalyTypeStats.priceDeviation,
                    })}
                  </span>
                )}
                {anomalyTypeStats.priceDeviation > 0 && anomalyTypeStats.latency > 0 && (
                  <span className="mx-1">|</span>
                )}
                {anomalyTypeStats.latency > 0 && (
                  <span>
                    {t('publisherAnalysis.latencyAnomaly', { count: anomalyTypeStats.latency })}
                  </span>
                )}
              </p>
              <p className="text-xs text-yellow-600 mt-1">
                {t('publisherAnalysis.anomalyCheckSuggestion')}
              </p>

              {/* 关联异常提示 */}
              {correlatedAnomalies.length > 0 && (
                <div className="mt-3 pt-3 border-t border-yellow-200">
                  <div className="flex items-start gap-2">
                    <svg
                      className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-red-700">关联异常告警</p>
                      {correlatedAnomalies.map((anomaly, index) => (
                        <p key={index} className="text-xs text-red-600 mt-1">
                          {anomaly.anomalyType === 'priceDeviation'
                            ? `价格偏差关联异常: ${anomaly.publisherNames.join(', ')} 同时出现异常`
                            : `延迟关联异常: ${anomaly.publisherNames.join(', ')} 同时出现高延迟`}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-white/20 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-bold">Pyth Network Publishers</h3>
            <p className="text-sm text-white/80">Data source analysis and reliability metrics</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-white/70 text-sm">Active Publishers</p>
            <p className="text-2xl font-bold">
              {activeCount}/{publishers.length}
            </p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-white/70 text-sm">Avg Reliability</p>
            <p className="text-2xl font-bold">{avgReliability.toFixed(1)}%</p>
          </div>
          <div className="bg-white/10 rounded-lg p-3">
            <p className="text-white/70 text-sm">Avg Latency</p>
            <p className="text-2xl font-bold">{avgLatency.toFixed(0)}ms</p>
          </div>
        </div>
      </div>

      <PublisherContributionPanel publishers={publishers} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardCard title="Publisher List">
          <PublisherList
            publishers={publishers}
            selectedPublisherId={selectedPublisherId}
            onPublisherSelect={setSelectedPublisherId}
            onAnomalyDetected={handleAnomalyDetected}
          />
        </DashboardCard>

        <DashboardCard title="Publisher Reliability Score">
          {selectedPublisher ? (
            <PublisherReliabilityScore publisher={selectedPublisher} stats={selectedStats} />
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              Select a publisher to view detailed statistics
            </div>
          )}
        </DashboardCard>
      </div>

      <DashboardCard title="Publisher Correlation Matrix">
        <CorrelationHeatmap publishers={publishers} correlationMatrix={correlationMatrix} />
      </DashboardCard>

      <DashboardCard title="Publisher Comparison">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">
                  Publisher
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                  Reliability
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                  Latency
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                  Accuracy
                </th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-700">
                  Deviation
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-gray-700">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {publishers
                .sort((a, b) => b.reliabilityScore - a.reliabilityScore)
                .map((publisher) => (
                  <tr
                    key={publisher.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                      selectedPublisherId === publisher.id ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => setSelectedPublisherId(publisher.id)}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-semibold text-xs">
                          {publisher.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">{publisher.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-semibold text-gray-900">
                        {publisher.reliabilityScore.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`font-medium ${
                          publisher.latency < 50
                            ? 'text-green-600'
                            : publisher.latency < 80
                              ? 'text-blue-600'
                              : 'text-yellow-600'
                        }`}
                      >
                        {publisher.latency}ms
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-medium text-gray-900">
                        {publisher.accuracy?.toFixed(1) ?? '-'}%
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span
                        className={`font-medium ${
                          (publisher.priceDeviation ?? 0) <= 0.02
                            ? 'text-green-600'
                            : (publisher.priceDeviation ?? 0) <= 0.05
                              ? 'text-blue-600'
                              : 'text-yellow-600'
                        }`}
                      >
                        {publisher.priceDeviation ? `${publisher.priceDeviation.toFixed(2)}%` : '-'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          publisher.status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : publisher.status === 'degraded'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {publisher.status.charAt(0).toUpperCase() + publisher.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </DashboardCard>
    </div>
  );
}
