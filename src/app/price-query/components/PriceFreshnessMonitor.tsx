'use client';

import { useMemo, useEffect, useState, memo } from 'react';

import {
  Clock,
  AlertTriangle,
  CheckCircle,
  Info,
  TrendingUp,
  TrendingDown,
  Activity,
  Shield,
  Zap,
} from 'lucide-react';

import { FRESHNESS_THRESHOLDS } from '@/app/cross-oracle/thresholds';
import { chartColors } from '@/lib/config/colors';
import { providerNames, chainNames, oracleColors } from '@/lib/constants';
import { getProviderDefaults } from '@/lib/oracles/utils/performanceMetricsConfig';
import { formatPrice } from '@/lib/utils/chartSharedUtils';
import { formatRelativeTime } from '@/lib/utils/format';
import { type OracleProvider, type PriceData } from '@/types/oracle';

import { type QueryResult } from '../constants';

interface PriceFreshnessMonitorProps {
  queryResults: QueryResult[];
  avgPrice: number;
}

interface DataSourceInfo {
  key: string;
  provider: string;
  providerKey: OracleProvider;
  chain: string;
  price: number;
  priceDeviation: number;
  priceDeviationPercent: number;
  timestamp: number;
  freshnessSeconds: number;
  freshnessStatus: 'fresh' | 'normal' | 'delayed' | 'critical';
  reliability: number;
  confidence: number;
  expectedUpdateFreq: number;
  healthScore: number;
  healthFactors: {
    freshness: number;
    reliability: number;
    consistency: number;
    confidence: number;
  };
}

const { FRESH, NORMAL, DELAYED } = FRESHNESS_THRESHOLDS;

const HEALTH_WEIGHTS = {
  FRESHNESS: 0.4,
  RELIABILITY: 0.3,
  CONSISTENCY: 0.2,
  CONFIDENCE: 0.1,
};

function getFreshnessStatus(seconds: number): DataSourceInfo['freshnessStatus'] {
  if (seconds <= FRESH) return 'fresh';
  if (seconds <= NORMAL) return 'normal';
  if (seconds <= DELAYED) return 'delayed';
  return 'critical';
}

function getFreshnessColor(status: DataSourceInfo['freshnessStatus']): string {
  switch (status) {
    case 'fresh':
      return '#10b981';
    case 'normal':
      return '#3b82f6';
    case 'delayed':
      return '#f59e0b';
    case 'critical':
      return '#ef4444';
  }
}

function calculateFreshnessScore(
  status: DataSourceInfo['freshnessStatus'],
  seconds: number
): number {
  switch (status) {
    case 'fresh':
      return 100;
    case 'normal':
      return 85;
    case 'delayed':
      return 60;
    case 'critical':
      if (seconds > 300) return 20;
      return 30;
  }
}

function calculateConsistencyScore(deviationPercent: number): number {
  const absDeviation = Math.abs(deviationPercent);
  if (absDeviation < 0.1) return 100;
  if (absDeviation < 0.3) return 95;
  if (absDeviation < 0.5) return 90;
  if (absDeviation < 1) return 70;
  if (absDeviation < 2) return 50;
  if (absDeviation < 5) return 30;
  return 10;
}

function calculateConfidenceScore(priceData: PriceData): number {
  if (priceData.confidence !== undefined && priceData.confidence !== null) {
    if (priceData.confidence <= 1) {
      return Math.round(priceData.confidence * 100);
    }
    return Math.min(100, Math.max(0, priceData.confidence));
  }
  return 95;
}

function calculateHealthScore(
  freshnessStatus: DataSourceInfo['freshnessStatus'],
  freshnessSeconds: number,
  reliability: number,
  priceDeviationPercent: number,
  confidence: number,
  hasMultipleSources: boolean
): { score: number; factors: DataSourceInfo['healthFactors'] } {
  const freshnessScore = calculateFreshnessScore(freshnessStatus, freshnessSeconds);
  const reliabilityScore = reliability;
  const consistencyScore = hasMultipleSources
    ? calculateConsistencyScore(priceDeviationPercent)
    : 100;
  const confidenceScore = confidence;

  let totalScore =
    freshnessScore * HEALTH_WEIGHTS.FRESHNESS +
    reliabilityScore * HEALTH_WEIGHTS.RELIABILITY +
    consistencyScore * HEALTH_WEIGHTS.CONSISTENCY +
    confidenceScore * HEALTH_WEIGHTS.CONFIDENCE;

  if (!hasMultipleSources) {
    totalScore =
      freshnessScore * (HEALTH_WEIGHTS.FRESHNESS + HEALTH_WEIGHTS.CONSISTENCY / 2) +
      reliabilityScore * HEALTH_WEIGHTS.RELIABILITY +
      confidenceScore * (HEALTH_WEIGHTS.CONFIDENCE + HEALTH_WEIGHTS.CONSISTENCY / 2);
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(totalScore))),
    factors: {
      freshness: freshnessScore,
      reliability: reliabilityScore,
      consistency: consistencyScore,
      confidence: confidenceScore,
    },
  };
}

function getHealthGrade(score: number): { label: string; color: string } {
  if (score >= 90) return { label: 'Excellent', color: '#10b981' };
  if (score >= 80) return { label: 'Good', color: '#3b82f6' };
  if (score >= 70) return { label: 'Fair', color: '#f59e0b' };
  if (score >= 60) return { label: 'Poor', color: '#f97316' };
  return { label: 'Critical', color: '#ef4444' };
}

const FreshnessCell = memo(function FreshnessCell({
  freshnessSeconds,
  freshnessStatus,
  timestamp,
}: {
  freshnessSeconds: number;
  freshnessStatus: DataSourceInfo['freshnessStatus'];
  timestamp: number;
}) {
  return (
    <td className="py-2.5 px-3">
      <div className="flex flex-col items-center">
        <span className="text-xs font-medium" style={{ color: getFreshnessColor(freshnessStatus) }}>
          {freshnessSeconds}s ago
        </span>
        <span className="text-[10px] text-gray-400">{formatRelativeTime(timestamp)}</span>
      </div>
    </td>
  );
});

export function PriceFreshnessMonitor({ queryResults, avgPrice }: PriceFreshnessMonitorProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const hasMultipleSources = queryResults.length > 1;

  const dataSources = useMemo<DataSourceInfo[]>(() => {
    if (queryResults.length === 0) return [];
    if (!Number.isFinite(avgPrice) || avgPrice <= 0) return [];

    return queryResults
      .filter((result) => result.priceData && result.priceData.price > 0)
      .map((result) => {
        const price = result.priceData.price;
        const timestamp = result.priceData.timestamp;
        const freshnessSeconds = Math.max(0, Math.floor((now - timestamp) / 1000));
        const freshnessStatus = getFreshnessStatus(freshnessSeconds);
        const providerDefaults = getProviderDefaults(result.provider);
        const priceDeviation = price - avgPrice;
        const priceDeviationPercent = (priceDeviation / avgPrice) * 100;
        const confidence = calculateConfidenceScore(result.priceData);
        const { score, factors } = calculateHealthScore(
          freshnessStatus,
          freshnessSeconds,
          providerDefaults.reliability,
          priceDeviationPercent,
          confidence,
          hasMultipleSources
        );

        return {
          key: `${result.provider}_${result.chain}`,
          provider: providerNames[result.provider] || result.provider,
          providerKey: result.provider,
          chain: chainNames[result.chain] || result.chain,
          price,
          priceDeviation,
          priceDeviationPercent,
          timestamp,
          freshnessSeconds,
          freshnessStatus,
          reliability: providerDefaults.reliability,
          confidence,
          expectedUpdateFreq: providerDefaults.updateFrequency,
          healthScore: score,
          healthFactors: factors,
        };
      })
      .sort((a, b) => b.healthScore - a.healthScore);
  }, [queryResults, avgPrice, now, hasMultipleSources]);

  const overallStats = useMemo(() => {
    if (dataSources.length === 0) return null;

    const avgHealthScore =
      dataSources.reduce((sum, d) => sum + d.healthScore, 0) / dataSources.length;
    const freshCount = dataSources.filter((d) => d.freshnessStatus === 'fresh').length;
    const normalCount = dataSources.filter((d) => d.freshnessStatus === 'normal').length;
    const delayedCount = dataSources.filter((d) => d.freshnessStatus === 'delayed').length;
    const criticalCount = dataSources.filter((d) => d.freshnessStatus === 'critical').length;
    const avgFreshness =
      dataSources.reduce((sum, d) => sum + d.freshnessSeconds, 0) / dataSources.length;
    const avgReliability =
      dataSources.reduce((sum, d) => sum + d.reliability, 0) / dataSources.length;
    const avgConfidence =
      dataSources.reduce((sum, d) => sum + d.confidence, 0) / dataSources.length;

    const excellentCount = dataSources.filter((d) => d.healthScore >= 90).length;
    const goodCount = dataSources.filter((d) => d.healthScore >= 80 && d.healthScore < 90).length;
    const fairCount = dataSources.filter((d) => d.healthScore >= 70 && d.healthScore < 80).length;
    const poorCount = dataSources.filter((d) => d.healthScore < 70).length;

    return {
      avgHealthScore: Math.round(avgHealthScore),
      freshCount,
      normalCount,
      delayedCount,
      criticalCount,
      avgFreshness,
      avgReliability,
      avgConfidence,
      total: dataSources.length,
      hasIssues: delayedCount > 0 || criticalCount > 0,
      excellentCount,
      goodCount,
      fairCount,
      poorCount,
    };
  }, [dataSources]);

  if (dataSources.length === 0) {
    return (
      <div className="h-[200px] flex flex-col items-center justify-center text-gray-400">
        <Info className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm">No data available</p>
        <p className="text-xs mt-1 text-gray-500">Query prices to see data freshness analysis</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {overallStats && (
        <div className={`grid ${hasMultipleSources ? 'grid-cols-5' : 'grid-cols-4'} gap-3`}>
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg p-3 text-center border border-emerald-100">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              <p className="text-xs text-emerald-600 font-medium">Health Score</p>
            </div>
            <p className="text-2xl font-bold text-emerald-700">{overallStats.avgHealthScore}</p>
            <p className="text-[10px] text-emerald-500">
              {getHealthGrade(overallStats.avgHealthScore).label}
            </p>
          </div>
          <div className="bg-emerald-50 rounded-lg p-3 text-center border border-emerald-100">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Zap className="w-3.5 h-3.5 text-emerald-600" />
              <p className="text-xs text-emerald-600 font-medium">Fresh</p>
            </div>
            <p className="text-xl font-bold text-emerald-700">{overallStats.freshCount}</p>
            <p className="text-[10px] text-emerald-500">&lt;{FRESH}s</p>
          </div>
          <div className="bg-blue-50 rounded-lg p-3 text-center border border-blue-100">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Activity className="w-3.5 h-3.5 text-blue-600" />
              <p className="text-xs text-blue-600 font-medium">Normal</p>
            </div>
            <p className="text-xl font-bold text-blue-700">{overallStats.normalCount}</p>
            <p className="text-[10px] text-blue-500">
              {FRESH}-{NORMAL}s
            </p>
          </div>
          <div className="bg-amber-50 rounded-lg p-3 text-center border border-amber-100">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <p className="text-xs text-amber-600 font-medium">Delayed</p>
            </div>
            <p className="text-xl font-bold text-amber-700">{overallStats.delayedCount}</p>
            <p className="text-[10px] text-amber-500">
              {NORMAL}-{DELAYED}s
            </p>
          </div>
          {hasMultipleSources && (
            <div className="bg-red-50 rounded-lg p-3 text-center border border-red-100">
              <div className="flex items-center justify-center gap-1 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                <p className="text-xs text-red-600 font-medium">Critical</p>
              </div>
              <p className="text-xl font-bold text-red-700">{overallStats.criticalCount}</p>
              <p className="text-[10px] text-red-500">&gt;{DELAYED}s</p>
            </div>
          )}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-3 font-medium text-gray-500 text-xs">Oracle</th>
              <th className="text-right py-2 px-3 font-medium text-gray-500 text-xs">Price</th>
              {hasMultipleSources && (
                <th className="text-right py-2 px-3 font-medium text-gray-500 text-xs">
                  Deviation
                </th>
              )}
              <th className="text-center py-2 px-3 font-medium text-gray-500 text-xs">Freshness</th>
              <th className="text-center py-2 px-3 font-medium text-gray-500 text-xs">
                Reliability
              </th>
              <th className="text-center py-2 px-3 font-medium text-gray-500 text-xs">Health</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {dataSources.map((source) => {
              const grade = getHealthGrade(source.healthScore);
              return (
                <tr key={source.key} className="hover:bg-gray-50 transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor:
                            oracleColors[source.providerKey] || chartColors.recharts.primary,
                        }}
                      />
                      <div>
                        <p className="font-medium text-gray-900">{source.provider}</p>
                        <p className="text-xs text-gray-500">{source.chain}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="font-mono font-medium text-gray-900">
                      {formatPrice(source.price)}
                    </span>
                  </td>
                  {hasMultipleSources && (
                    <td className="py-2.5 px-3 text-right">
                      <span
                        className={`inline-flex items-center gap-0.5 text-xs font-medium ${
                          Math.abs(source.priceDeviationPercent) > 1
                            ? 'text-red-600'
                            : Math.abs(source.priceDeviationPercent) > 0.5
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                        }`}
                      >
                        {source.priceDeviationPercent > 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : source.priceDeviationPercent < 0 ? (
                          <TrendingDown className="w-3 h-3" />
                        ) : null}
                        {source.priceDeviationPercent > 0 ? '+' : ''}
                        {source.priceDeviationPercent.toFixed(4)}%
                      </span>
                    </td>
                  )}
                  <FreshnessCell
                    freshnessSeconds={source.freshnessSeconds}
                    freshnessStatus={source.freshnessStatus}
                    timestamp={source.timestamp}
                  />
                  <td className="py-2.5 px-3">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${source.reliability}%`,
                            backgroundColor:
                              source.reliability >= 99.5
                                ? '#10b981'
                                : source.reliability >= 99
                                  ? '#3b82f6'
                                  : '#f59e0b',
                          }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-500 mt-0.5">
                        {source.reliability}%
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex flex-col items-center">
                      <div
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border"
                        style={{
                          borderColor: grade.color,
                          backgroundColor: `${grade.color}15`,
                          color: grade.color,
                        }}
                      >
                        {source.healthScore >= 80 ? (
                          <CheckCircle className="w-3 h-3" />
                        ) : (
                          <AlertTriangle className="w-3 h-3" />
                        )}
                        {source.healthScore}
                      </div>
                      <span className="text-[10px] text-gray-400 mt-0.5">{grade.label}</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <div className="bg-gray-50 rounded px-2 py-1.5 flex items-center justify-between">
          <span className="text-gray-500">Freshness Weight</span>
          <span className="font-medium text-gray-700">
            {Math.round(HEALTH_WEIGHTS.FRESHNESS * 100)}%
          </span>
        </div>
        <div className="bg-gray-50 rounded px-2 py-1.5 flex items-center justify-between">
          <span className="text-gray-500">Reliability Weight</span>
          <span className="font-medium text-gray-700">
            {Math.round(HEALTH_WEIGHTS.RELIABILITY * 100)}%
          </span>
        </div>
        <div className="bg-gray-50 rounded px-2 py-1.5 flex items-center justify-between">
          <span className="text-gray-500">Consistency Weight</span>
          <span className="font-medium text-gray-700">
            {Math.round(HEALTH_WEIGHTS.CONSISTENCY * 100)}%
          </span>
        </div>
        <div className="bg-gray-50 rounded px-2 py-1.5 flex items-center justify-between">
          <span className="text-gray-500">Confidence Weight</span>
          <span className="font-medium text-gray-700">
            {Math.round(HEALTH_WEIGHTS.CONFIDENCE * 100)}%
          </span>
        </div>
      </div>

      {!hasMultipleSources && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800">Single Data Source</p>
              <p className="text-xs text-blue-700 mt-1">
                Only one oracle selected. Select multiple oracles to see price deviation comparison
                and more meaningful freshness analysis.
              </p>
            </div>
          </div>
        </div>
      )}

      {overallStats && overallStats.hasIssues && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">Data Freshness Issues Detected</p>
              <p className="text-xs text-amber-700 mt-1">
                {overallStats.criticalCount > 0 && (
                  <span className="text-red-600 font-medium">
                    {overallStats.criticalCount} data source(s) critically delayed.{' '}
                  </span>
                )}
                {overallStats.delayedCount > 0 && (
                  <span>{overallStats.delayedCount} data source(s) showing delays. </span>
                )}
                Consider refreshing data or checking the affected oracles.
              </p>
            </div>
          </div>
        </div>
      )}

      {overallStats && !overallStats.hasIssues && hasMultipleSources && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-emerald-800">All Data Sources Healthy</p>
              <p className="text-xs text-emerald-700 mt-1">
                Avg freshness: {overallStats.avgFreshness.toFixed(1)}s | Avg reliability:{' '}
                {overallStats.avgReliability.toFixed(1)}% | Avg confidence:{' '}
                {overallStats.avgConfidence.toFixed(0)}%
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
