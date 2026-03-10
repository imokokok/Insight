'use client';

import { useState } from 'react';
import { Publisher, PublisherStats } from '@/lib/types/oracle';
import { PublisherList } from './PublisherList';
import { PublisherReliabilityScore } from './PublisherReliabilityScore';
import { PublisherContributionPanel } from './PublisherContributionPanel';
import { DashboardCard } from './DashboardCard';

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
  const [selectedPublisherId, setSelectedPublisherId] = useState<string | undefined>(
    publishers[0]?.id
  );

  const selectedPublisher = publishers.find((p) => p.id === selectedPublisherId);
  const selectedStats = selectedPublisherId ? publisherStats[selectedPublisherId] : undefined;

  const activeCount = publishers.filter((p) => p.status === 'active').length;
  const avgReliability =
    publishers.reduce((sum, p) => sum + p.reliabilityScore, 0) / publishers.length;
  const avgLatency = publishers.reduce((sum, p) => sum + p.latency, 0) / publishers.length;

  return (
    <div className="space-y-6">
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
