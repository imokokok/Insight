'use client';

import { useState, useMemo, useEffect } from 'react';
import { useI18n } from '@/lib/i18n/provider';
import { Publisher } from '@/lib/types/oracle';

export interface DataQualityScorePanelProps {
  symbol?: string;
  className?: string;
}

export interface QualityDimension {
  name: string;
  score: number;
  weight: number;
  description: string;
  trend: 'up' | 'down' | 'stable';
  details: string;
}

export interface HistoricalScore {
  timestamp: number;
  score: number;
}

export interface QualityAlert {
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: number;
}

type ScoreLevel = 'excellent' | 'good' | 'fair' | 'poor';

const SCORE_THRESHOLDS = {
  excellent: 80,
  good: 60,
  fair: 40,
};

const WEIGHTS = {
  confidenceInterval: 0.3,
  publisherReliability: 0.3,
  updateLatency: 0.2,
  crossChainConsistency: 0.2,
};

function getScoreLevel(score: number): ScoreLevel {
  if (score >= SCORE_THRESHOLDS.excellent) return 'excellent';
  if (score >= SCORE_THRESHOLDS.good) return 'good';
  if (score >= SCORE_THRESHOLDS.fair) return 'fair';
  return 'poor';
}

function getScoreColor(score: number): string {
  const level = getScoreLevel(score);
  switch (level) {
    case 'excellent':
      return 'text-green-600';
    case 'good':
      return 'text-blue-600';
    case 'fair':
      return 'text-yellow-600';
    case 'poor':
      return 'text-red-600';
  }
}

function getScoreBgColor(score: number): string {
  const level = getScoreLevel(score);
  switch (level) {
    case 'excellent':
      return 'bg-green-50';
    case 'good':
      return 'bg-blue-50';
    case 'fair':
      return 'bg-yellow-50';
    case 'poor':
      return 'bg-red-50';
  }
}

function getScoreRingColor(score: number): string {
  const level = getScoreLevel(score);
  switch (level) {
    case 'excellent':
      return '#22C55E';
    case 'good':
      return '#3B82F6';
    case 'fair':
      return '#EAB308';
    case 'poor':
      return '#EF4444';
  }
}

function getScoreLabel(level: ScoreLevel, t: (key: string) => string): string {
  switch (level) {
    case 'excellent':
      return t('pythNetwork.dataQuality.excellent');
    case 'good':
      return t('pythNetwork.dataQuality.good');
    case 'fair':
      return t('pythNetwork.dataQuality.fair');
    case 'poor':
      return t('pythNetwork.dataQuality.poor');
  }
}

function CircularProgress({
  score,
  size = 160,
  strokeWidth = 12,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreRingColor(score);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          className="text-gray-200"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className="transition-all duration-1000 ease-out"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke={color}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-4xl font-bold ${getScoreColor(score)}`}>{score.toFixed(0)}</span>
        <span className="text-sm text-gray-500">/ 100</span>
      </div>
    </div>
  );
}

function TrendIndicator({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  if (trend === 'up') {
    return (
      <div className="flex items-center gap-1 text-green-600">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 10l7-7m0 0l7 7m-7-7v18"
          />
        </svg>
      </div>
    );
  }
  if (trend === 'down') {
    return (
      <div className="flex items-center gap-1 text-red-600">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1 text-gray-400">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14" />
      </svg>
    </div>
  );
}

function DimensionCard({ dimension, index }: { dimension: QualityDimension; index: number }) {
  const progressColor =
    dimension.score >= 80
      ? 'bg-green-500'
      : dimension.score >= 60
        ? 'bg-blue-500'
        : dimension.score >= 40
          ? 'bg-yellow-500'
          : 'bg-red-500';

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-900">{dimension.name}</span>
            <span className="text-xs text-gray-400">
              权重 {Math.round(dimension.weight * 100)}%
            </span>
          </div>
          <p className="text-xs text-gray-500">{dimension.description}</p>
        </div>
        <TrendIndicator trend={dimension.trend} />
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
            style={{ width: `${Math.min(100, dimension.score)}%` }}
          />
        </div>
        <span className={`text-lg font-bold ${getScoreColor(dimension.score)}`}>
          {dimension.score.toFixed(0)}
        </span>
      </div>
      <p className="text-xs text-gray-500 mt-2">{dimension.details}</p>
    </div>
  );
}

function AlertBanner({ alert }: { alert: QualityAlert }) {
  const bgColor =
    alert.type === 'error'
      ? 'bg-red-50 border-red-200'
      : alert.type === 'warning'
        ? 'bg-yellow-50 border-yellow-200'
        : 'bg-blue-50 border-blue-200';
  const textColor =
    alert.type === 'error'
      ? 'text-red-800'
      : alert.type === 'warning'
        ? 'text-yellow-800'
        : 'text-blue-800';
  const iconColor =
    alert.type === 'error'
      ? 'text-red-600'
      : alert.type === 'warning'
        ? 'text-yellow-600'
        : 'text-blue-600';

  return (
    <div className={`${bgColor} border rounded-lg p-4`}>
      <div className="flex items-start gap-3">
        <svg
          className={`w-5 h-5 ${iconColor} flex-shrink-0 mt-0.5`}
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
          <p className={`text-sm font-medium ${textColor}`}>{alert.message}</p>
          <p className="text-xs text-gray-500 mt-1">{new Date(alert.timestamp).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
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
  },
  {
    id: 'pub-2',
    name: 'Coinbase',
    reliabilityScore: 99.1,
    latency: 38,
    status: 'active',
    submissionCount: 18200,
    lastUpdate: Date.now() - 3000,
    accuracy: 99.5,
    priceDeviation: 0.01,
  },
  {
    id: 'pub-3',
    name: 'Kraken',
    reliabilityScore: 94.2,
    latency: 85,
    status: 'degraded',
    submissionCount: 9800,
    lastUpdate: Date.now() - 15000,
    accuracy: 95.1,
    priceDeviation: 0.08,
  },
  {
    id: 'pub-4',
    name: 'OKX',
    reliabilityScore: 97.3,
    latency: 55,
    status: 'active',
    submissionCount: 13600,
    lastUpdate: Date.now() - 6000,
    accuracy: 98.1,
    priceDeviation: 0.03,
  },
  {
    id: 'pub-5',
    name: 'FTX',
    reliabilityScore: 96.8,
    latency: 62,
    status: 'active',
    submissionCount: 12850,
    lastUpdate: Date.now() - 8000,
    accuracy: 97.8,
    priceDeviation: 0.05,
  },
];

function generateConfidenceIntervalData(): {
  avgWidth: number;
  stability: number;
  aboveThreshold: number;
} {
  const baseWidth = 0.15;
  const variance = Math.random() * 0.1;
  const avgWidth = baseWidth + variance;
  const stability = 85 + Math.random() * 15;
  const aboveThreshold = Math.random() * 10;
  return { avgWidth, stability, aboveThreshold };
}

function generateLatencyData(): { avgLatency: number; p99Latency: number; outliers: number } {
  const avgLatency = 50 + Math.random() * 100;
  const p99Latency = avgLatency * 1.5 + Math.random() * 50;
  const outliers = Math.random() * 5;
  return { avgLatency, p99Latency, outliers };
}

function generateCrossChainData(): { maxDeviation: number; avgDeviation: number; chains: number } {
  const maxDeviation = 0.05 + Math.random() * 0.3;
  const avgDeviation = maxDeviation * 0.6;
  const chains = 3;
  return { maxDeviation, avgDeviation, chains };
}

export function DataQualityScorePanel({
  symbol = 'BTC/USD',
  className = '',
}: DataQualityScorePanelProps) {
  const { t } = useI18n();
  const [historicalScores, setHistoricalScores] = useState<HistoricalScore[]>([]);
  const [alerts, setAlerts] = useState<QualityAlert[]>([]);

  const dimensions = useMemo<QualityDimension[]>(() => {
    const confidenceData = generateConfidenceIntervalData();
    const latencyData = generateLatencyData();
    const crossChainData = generateCrossChainData();

    const avgPublisherReliability =
      mockPublishers.reduce((sum, p) => sum + p.reliabilityScore, 0) / mockPublishers.length;
    const activePublishers = mockPublishers.filter((p) => p.status === 'active').length;

    const confidenceScore = Math.max(
      0,
      Math.min(100, (1 - confidenceData.avgWidth / 0.5) * 50 + confidenceData.stability * 0.5)
    );
    const publisherScore = avgPublisherReliability * (activePublishers / mockPublishers.length);
    const latencyScore = Math.max(
      0,
      Math.min(100, 100 - latencyData.avgLatency / 2 - latencyData.outliers * 2)
    );
    const crossChainScore = Math.max(0, Math.min(100, 100 - crossChainData.maxDeviation * 200));

    return [
      {
        name: t('pythNetwork.dataQuality.confidenceInterval'),
        score: confidenceScore,
        weight: WEIGHTS.confidenceInterval,
        description: t('pythNetwork.dataQuality.confidenceIntervalDesc'),
        trend:
          confidenceData.aboveThreshold < 5
            ? 'up'
            : confidenceData.aboveThreshold > 15
              ? 'down'
              : 'stable',
        details: t('pythNetwork.dataQuality.confidenceIntervalDetails', {
          avgWidth: confidenceData.avgWidth.toFixed(4),
          stability: confidenceData.stability.toFixed(1),
        }),
      },
      {
        name: t('pythNetwork.dataQuality.publisherReliability'),
        score: publisherScore,
        weight: WEIGHTS.publisherReliability,
        description: t('pythNetwork.dataQuality.publisherReliabilityDesc'),
        trend:
          avgPublisherReliability > 97 ? 'up' : avgPublisherReliability < 95 ? 'down' : 'stable',
        details: t('pythNetwork.dataQuality.publisherReliabilityDetails', {
          avg: avgPublisherReliability.toFixed(1),
          active: activePublishers,
          total: mockPublishers.length,
        }),
      },
      {
        name: t('pythNetwork.dataQuality.updateLatency'),
        score: latencyScore,
        weight: WEIGHTS.updateLatency,
        description: t('pythNetwork.dataQuality.updateLatencyDesc'),
        trend:
          latencyData.avgLatency < 80 ? 'up' : latencyData.avgLatency > 120 ? 'down' : 'stable',
        details: t('pythNetwork.dataQuality.updateLatencyDetails', {
          avg: latencyData.avgLatency.toFixed(0),
          p99: latencyData.p99Latency.toFixed(0),
        }),
      },
      {
        name: t('pythNetwork.dataQuality.crossChainConsistency'),
        score: crossChainScore,
        weight: WEIGHTS.crossChainConsistency,
        description: t('pythNetwork.dataQuality.crossChainConsistencyDesc'),
        trend:
          crossChainData.maxDeviation < 0.1
            ? 'up'
            : crossChainData.maxDeviation > 0.25
              ? 'down'
              : 'stable',
        details: t('pythNetwork.dataQuality.crossChainConsistencyDetails', {
          max: (crossChainData.maxDeviation * 100).toFixed(2),
          chains: crossChainData.chains,
        }),
      },
    ];
  }, [t]);

  const overallScore = useMemo(() => {
    return dimensions.reduce((sum, dim) => sum + dim.score * dim.weight, 0);
  }, [dimensions]);

  const scoreLevel = getScoreLevel(overallScore);

  useEffect(() => {
    const now = Date.now();
    const initialHistory: HistoricalScore[] = [];
    for (let i = 24; i >= 0; i--) {
      initialHistory.push({
        timestamp: now - i * 3600000,
        score: overallScore - 5 + Math.random() * 10,
      });
    }
    setHistoricalScores(initialHistory);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setHistoricalScores((prev) => {
        const newHistory = [...prev.slice(1), { timestamp: Date.now(), score: overallScore }];
        return newHistory;
      });
    }, 60000);

    return () => clearInterval(interval);
  }, [overallScore]);

  useEffect(() => {
    const newAlerts: QualityAlert[] = [];

    if (historicalScores.length >= 2) {
      const recentScores = historicalScores.slice(-5);
      const avgRecent = recentScores.reduce((sum, s) => sum + s.score, 0) / recentScores.length;
      const olderScores = historicalScores.slice(-10, -5);
      if (olderScores.length > 0) {
        const avgOlder = olderScores.reduce((sum, s) => sum + s.score, 0) / olderScores.length;
        if (avgRecent < avgOlder - 5) {
          newAlerts.push({
            type: 'warning',
            message: t('pythNetwork.dataQuality.decliningTrend', {
              percent: (((avgOlder - avgRecent) / avgOlder) * 100).toFixed(1),
            }),
            timestamp: Date.now(),
          });
        }
      }
    }

    const confidenceDim = dimensions[0];
    if (confidenceDim.score < 60) {
      newAlerts.push({
        type: 'error',
        message: t('pythNetwork.dataQuality.lowConfidenceScore'),
        timestamp: Date.now(),
      });
    }

    const publisherDim = dimensions[1];
    if (publisherDim.trend === 'down') {
      newAlerts.push({
        type: 'warning',
        message: t('pythNetwork.dataQuality.publisherReliabilityDeclining'),
        timestamp: Date.now(),
      });
    }

    setAlerts(newAlerts.slice(0, 3));
  }, [historicalScores, dimensions, t]);

  const scoreChange = useMemo(() => {
    if (historicalScores.length < 2) return 0;
    const current = overallScore;
    const previous = historicalScores[historicalScores.length - 2]?.score ?? current;
    return current - previous;
  }, [overallScore, historicalScores]);

  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-6 ${className}`}>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {t('pythNetwork.dataQuality.title')}
            </h3>
            <p className="text-sm text-gray-500 mt-1">{t('pythNetwork.dataQuality.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">{symbol}</span>
            <span className="px-2 py-0.5 bg-pink-100 text-pink-700 text-xs font-medium rounded-full">
              Pyth
            </span>
          </div>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="mb-6 space-y-3">
          {alerts.map((alert, index) => (
            <AlertBanner key={index} alert={alert} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl">
          <CircularProgress score={overallScore} />
          <div className="mt-4 text-center">
            <div className="flex items-center justify-center gap-2">
              <span className={`text-sm font-medium ${getScoreColor(overallScore)}`}>
                {getScoreLabel(scoreLevel, t)}
              </span>
              {scoreChange !== 0 && (
                <span className={`text-xs ${scoreChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {scoreChange > 0 ? '+' : ''}
                  {scoreChange.toFixed(1)}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {t('pythNetwork.dataQuality.compositeScore')}
            </p>
          </div>
        </div>

        <div className="lg:col-span-2 grid grid-cols-2 gap-4">
          {dimensions.map((dimension, index) => (
            <DimensionCard key={index} dimension={dimension} index={index} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className={`rounded-lg p-4 ${getScoreBgColor(dimensions[0].score)}`}>
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-5 h-5 text-pink-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <span className="text-sm font-medium text-gray-700">
              {t('pythNetwork.dataQuality.avgConfidenceWidth')}
            </span>
          </div>
          <p className={`text-2xl font-bold ${getScoreColor(dimensions[0].score)}`}>
            {(dimensions[0].score * 0.002).toFixed(4)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {t('pythNetwork.dataQuality.targetThreshold')}: 0.25
          </p>
        </div>

        <div className={`rounded-lg p-4 ${getScoreBgColor(dimensions[1].score)}`}>
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-5 h-5 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <span className="text-sm font-medium text-gray-700">
              {t('pythNetwork.dataQuality.activePublishers')}
            </span>
          </div>
          <p className={`text-2xl font-bold ${getScoreColor(dimensions[1].score)}`}>
            {mockPublishers.filter((p) => p.status === 'active').length}/{mockPublishers.length}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {t('pythNetwork.dataQuality.avgReliability')}: {dimensions[1].score.toFixed(1)}%
          </p>
        </div>

        <div className={`rounded-lg p-4 ${getScoreBgColor(dimensions[2].score)}`}>
          <div className="flex items-center gap-2 mb-2">
            <svg
              className="w-5 h-5 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <span className="text-sm font-medium text-gray-700">
              {t('pythNetwork.dataQuality.avgLatency')}
            </span>
          </div>
          <p className={`text-2xl font-bold ${getScoreColor(dimensions[2].score)}`}>
            {(100 - dimensions[2].score) * 2}ms
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {t('pythNetwork.dataQuality.p99Latency')}:{' '}
            {((100 - dimensions[2].score) * 3).toFixed(0)}ms
          </p>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          {t('pythNetwork.dataQuality.scoreHistory')}
        </h4>
        <div className="flex items-end gap-1 h-16">
          {historicalScores.slice(-24).map((score, index) => {
            const height = Math.max(10, (score.score / 100) * 100);
            const color =
              score.score >= 80
                ? 'bg-green-400'
                : score.score >= 60
                  ? 'bg-blue-400'
                  : score.score >= 40
                    ? 'bg-yellow-400'
                    : 'bg-red-400';
            return (
              <div
                key={index}
                className={`flex-1 ${color} rounded-t transition-all duration-300`}
                style={{ height: `${height}%` }}
                title={`${score.score.toFixed(1)} - ${new Date(score.timestamp).toLocaleTimeString()}`}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>24h ago</span>
          <span>now</span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-4 gap-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-xs text-gray-600">
            {t('pythNetwork.dataQuality.excellent')} (≥80)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-xs text-gray-600">{t('pythNetwork.dataQuality.good')} (60-79)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span className="text-xs text-gray-600">{t('pythNetwork.dataQuality.fair')} (40-59)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-xs text-gray-600">
            {t('pythNetwork.dataQuality.poor')} (&lt;40)
          </span>
        </div>
      </div>
    </div>
  );
}
