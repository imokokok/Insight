'use client';

import { useState, useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Publisher, PublisherStatus } from '@/types/oracle';
import { useI18n } from '@/lib/i18n/provider';

interface AnomalyInfo {
  isPriceDeviationAnomaly: boolean;
  isLatencyAnomaly: boolean;
  anomalyTypes: string[];
}

interface PublisherListProps {
  publishers: Publisher[];
  selectedPublisherId?: string;
  onPublisherSelect?: (publisherId: string) => void;
  onAnomalyDetected?: (anomalyCount: number, anomalyDetails: Record<string, AnomalyInfo>) => void;
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

function StatusBadge({ status }: { status: PublisherStatus }) {
  const { t } = useI18n();
  const config = {
    active: { bg: 'bg-green-100', text: 'text-green-700', label: t('publisher.status.active') },
    inactive: { bg: 'bg-gray-100', text: 'text-gray-700', label: t('publisher.status.inactive') },
    degraded: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-700',
      label: t('publisher.status.degraded'),
    },
  };

  const { bg, text, label } = config[status];

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>{label}</span>
  );
}

function ReliabilityStars({ score }: { score: number }) {
  const fullStars = Math.floor(score / 20);
  const hasHalfStar = score % 20 >= 10;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <div className="flex items-center gap-0.5">
      {[...Array(fullStars)].map((_, i) => (
        <svg key={`full-${i}`} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      {hasHalfStar && (
        <svg className="w-4 h-4 text-yellow-400" viewBox="0 0 20 20">
          <defs>
            <linearGradient id="half">
              <stop offset="50%" stopColor="currentColor" />
              <stop offset="50%" stopColor="transparent" />
            </linearGradient>
          </defs>
          <path
            fill="url(#half)"
            stroke="currentColor"
            strokeWidth="1"
            d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
          />
        </svg>
      )}
      {[...Array(emptyStars)].map((_, i) => (
        <svg key={`empty-${i}`} className="w-4 h-4 text-gray-300" viewBox="0 0 20 20">
          <path
            stroke="currentColor"
            strokeWidth="1"
            d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
          />
        </svg>
      ))}
    </div>
  );
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

export function PublisherList({
  publishers = mockPublishers,
  selectedPublisherId,
  onPublisherSelect,
  onAnomalyDetected,
}: PublisherListProps) {
  const { t } = useI18n();
  const [filter, setFilter] = useState<string>('all');

  const anomalyDetection = useMemo(() => {
    if (publishers.length === 0) {
      return { anomalyDetails: {} as Record<string, AnomalyInfo>, anomalyCount: 0 };
    }

    const priceDeviations = publishers.map((p) => p.priceDeviation ?? 0);
    const latencies = publishers.map((p) => p.latency);

    const avgDeviation = priceDeviations.reduce((sum, d) => sum + d, 0) / priceDeviations.length;
    const stdDeviation = Math.sqrt(
      priceDeviations.reduce((sum, d) => sum + Math.pow(d - avgDeviation, 2), 0) /
        priceDeviations.length
    );

    const avgLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;

    const anomalyDetails: Record<string, AnomalyInfo> = {};
    let anomalyCount = 0;

    publishers.forEach((p) => {
      const deviation = p.priceDeviation ?? 0;
      const latency = p.latency;

      const isPriceDeviationAnomaly = deviation > avgDeviation + 2 * stdDeviation;
      const isLatencyAnomaly = latency > avgLatency * 2;

      const anomalyTypes: string[] = [];
      if (isPriceDeviationAnomaly) anomalyTypes.push(t('publisher.priceDeviation'));
      if (isLatencyAnomaly) anomalyTypes.push(t('publisher.latencyAnomaly'));

      if (anomalyTypes.length > 0) {
        anomalyCount++;
      }

      anomalyDetails[p.id] = {
        isPriceDeviationAnomaly,
        isLatencyAnomaly,
        anomalyTypes,
      };
    });

    return { anomalyDetails, anomalyCount };
  }, [publishers, t]);

  useMemo(() => {
    onAnomalyDetected?.(anomalyDetection.anomalyCount, anomalyDetection.anomalyDetails);
  }, [anomalyDetection, onAnomalyDetected]);

  const filteredPublishers = publishers.filter((pub) => {
    if (filter === 'all') return true;
    return pub.status === filter;
  });

  const sortedPublishers = [...filteredPublishers].sort(
    (a, b) => b.reliabilityScore - a.reliabilityScore
  );

  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: sortedPublishers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 150,
    overscan: 3,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">{t('publisher.filterByStatus')}:</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">{t('publisher.allPublishers')}</option>
            <option value="active">{t('publisher.activeOnly')}</option>
            <option value="degraded">{t('publisher.degraded')}</option>
            <option value="inactive">{t('publisher.inactive')}</option>
          </select>
        </div>
        <div className="text-sm text-gray-500">
          {t('publisher.publisherCount', { count: filteredPublishers.length })}
        </div>
      </div>

      {sortedPublishers.length > 0 ? (
        <div ref={parentRef} className="h-[500px] overflow-auto space-y-2">
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const publisher = sortedPublishers[virtualItem.index];
              const anomalyInfo = anomalyDetection.anomalyDetails[publisher.id];
              const hasAnomaly = anomalyInfo && anomalyInfo.anomalyTypes.length > 0;

              return (
                <div
                  key={publisher.id}
                  data-index={virtualItem.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <div
                    onClick={() => onPublisherSelect?.(publisher.id)}
                    className={`p-4 rounded-lg border transition-all cursor-pointer ${
                      hasAnomaly
                        ? 'border-red-400 bg-red-50 hover:border-red-500 hover:bg-red-100'
                        : selectedPublisherId === publisher.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                          {publisher.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-gray-900">{publisher.name}</h4>
                            <StatusBadge status={publisher.status} />
                            {hasAnomaly && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-300">
                                {t('publisher.anomaly')}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {publisher.submissionCount.toLocaleString()}{' '}
                            {t('publisher.submissions')}
                          </p>
                          {hasAnomaly && (
                            <p className="text-xs text-red-600 mt-1">
                              {t('publisher.anomalyTypes')}
                              {anomalyInfo.anomalyTypes.join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 justify-end">
                          <span className="text-lg font-bold text-gray-900">
                            {publisher.reliabilityScore.toFixed(1)}%
                          </span>
                        </div>
                        <ReliabilityStars score={publisher.reliabilityScore} />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs">{t('publisher.latency')}</p>
                        <p
                          className={`font-medium ${anomalyInfo?.isLatencyAnomaly ? 'text-red-600' : 'text-gray-900'}`}
                        >
                          {publisher.latency}ms
                          {anomalyInfo?.isLatencyAnomaly && <span className="ml-1">⚠️</span>}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">{t('publisher.accuracy')}</p>
                        <p className="font-medium text-gray-900">
                          {publisher.accuracy?.toFixed(1) ?? '-'}%
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs">{t('publisher.lastUpdate')}</p>
                        <p className="font-medium text-gray-900">
                          {formatTimeAgo(publisher.lastUpdate)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">{t('publisher.noPublishers')}</div>
      )}
    </div>
  );
}
