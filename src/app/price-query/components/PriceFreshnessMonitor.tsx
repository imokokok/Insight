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
  AlertCircle,
  Timer,
  Gauge,
} from 'lucide-react';

import { chartColors } from '@/lib/config/colors';
import { providerNames, chainNames, oracleColors } from '@/lib/constants';
import { getProviderDefaults } from '@/lib/oracles/utils/performanceMetricsConfig';
import { formatPrice } from '@/lib/utils/chartSharedUtils';
import {
  type OracleProvider,
  type PriceData,
  OracleProvider as OracleProviderEnum,
} from '@/types/oracle';

import { type QueryResult } from '../constants';

interface PriceFreshnessMonitorProps {
  queryResults: QueryResult[];
  avgPrice: number;
}

type FreshnessStatus = 'fresh' | 'normal' | 'delayed' | 'critical' | 'stale';

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
  freshnessStatus: FreshnessStatus;
  freshnessScore: number;
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
  updateLagRatio: number;
  isRealtime: boolean;
}

interface FreshnessThresholds {
  fresh: number;
  normal: number;
  delayed: number;
  critical: number;
}

const HEALTH_WEIGHTS = {
  FRESHNESS: 0.4,
  RELIABILITY: 0.3,
  CONSISTENCY: 0.2,
  CONFIDENCE: 0.1,
};

const ORACLE_UPDATE_FREQUENCIES: Record<OracleProvider, number> = {
  pyth: 1,
  redstone: 1,
  supra: 60,
  flare: 90,
  reflector: 300,
  twap: 600,
  winklink: 1800,
  chainlink: 3600,
  api3: 3600,
  dia: 3600,
};

const REALTIME_ORACLES: OracleProvider[] = [OracleProviderEnum.PYTH, OracleProviderEnum.REDSTONE];

function getDynamicThresholds(expectedUpdateFreq: number): FreshnessThresholds {
  return {
    fresh: expectedUpdateFreq * 0.5,
    normal: expectedUpdateFreq * 1.0,
    delayed: expectedUpdateFreq * 2.0,
    critical: expectedUpdateFreq * 4.0,
  };
}

function getFreshnessStatus(seconds: number, thresholds: FreshnessThresholds): FreshnessStatus {
  if (seconds <= thresholds.fresh) return 'fresh';
  if (seconds <= thresholds.normal) return 'normal';
  if (seconds <= thresholds.delayed) return 'delayed';
  if (seconds <= thresholds.critical) return 'critical';
  return 'stale';
}

function getFreshnessColor(status: FreshnessStatus): string {
  switch (status) {
    case 'fresh':
      return '#10b981';
    case 'normal':
      return '#3b82f6';
    case 'delayed':
      return '#f59e0b';
    case 'critical':
      return '#f97316';
    case 'stale':
      return '#ef4444';
  }
}

function getStatusBgColor(status: FreshnessStatus): string {
  switch (status) {
    case 'fresh':
      return 'bg-emerald-50 border-emerald-200';
    case 'normal':
      return 'bg-blue-50 border-blue-200';
    case 'delayed':
      return 'bg-amber-50 border-amber-200';
    case 'critical':
      return 'bg-orange-50 border-orange-200';
    case 'stale':
      return 'bg-red-50 border-red-200';
  }
}

function calculateFreshnessScore(
  seconds: number,
  expectedUpdateFreq: number,
  isRealtime: boolean
): number {
  const ratio = seconds / expectedUpdateFreq;

  if (isRealtime) {
    if (ratio <= 1) return 100;
    if (ratio <= 2) return 90 - (ratio - 1) * 20;
    if (ratio <= 5) return 70 - (ratio - 2) * 10;
    if (ratio <= 10) return 40 - (ratio - 5) * 5;
    return Math.max(0, 15 - (ratio - 10) * 1.5);
  }

  const decayRate = 0.5;
  const score = 100 * Math.exp(-decayRate * ratio);
  return Math.max(0, Math.min(100, Math.round(score)));
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
  freshnessScore: number,
  reliability: number,
  priceDeviationPercent: number,
  confidence: number,
  hasMultipleSources: boolean
): { score: number; factors: DataSourceInfo['healthFactors'] } {
  const consistencyScore = hasMultipleSources
    ? calculateConsistencyScore(priceDeviationPercent)
    : 100;

  let totalScore =
    freshnessScore * HEALTH_WEIGHTS.FRESHNESS +
    reliability * HEALTH_WEIGHTS.RELIABILITY +
    consistencyScore * HEALTH_WEIGHTS.CONSISTENCY +
    confidence * HEALTH_WEIGHTS.CONFIDENCE;

  if (!hasMultipleSources) {
    totalScore =
      freshnessScore * (HEALTH_WEIGHTS.FRESHNESS + HEALTH_WEIGHTS.CONSISTENCY / 2) +
      reliability * HEALTH_WEIGHTS.RELIABILITY +
      confidence * (HEALTH_WEIGHTS.CONFIDENCE + HEALTH_WEIGHTS.CONSISTENCY / 2);
  }

  return {
    score: Math.max(0, Math.min(100, Math.round(totalScore))),
    factors: {
      freshness: freshnessScore,
      reliability,
      consistency: consistencyScore,
      confidence,
    },
  };
}

function getHealthGrade(score: number): { label: string; color: string; level: number } {
  if (score >= 90) return { label: 'Excellent', color: '#10b981', level: 5 };
  if (score >= 80) return { label: 'Good', color: '#3b82f6', level: 4 };
  if (score >= 70) return { label: 'Fair', color: '#f59e0b', level: 3 };
  if (score >= 50) return { label: 'Poor', color: '#f97316', level: 2 };
  return { label: 'Critical', color: '#ef4444', level: 1 };
}

function formatFreshness(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

function formatExpectedFrequency(seconds: number): string {
  if (seconds <= 1) return 'Real-time';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h`;
}

const FreshnessIndicator = memo(function FreshnessIndicator({
  freshnessSeconds,
  freshnessStatus,
  expectedUpdateFreq,
  isRealtime,
}: {
  freshnessSeconds: number;
  freshnessStatus: FreshnessStatus;
  expectedUpdateFreq: number;
  isRealtime: boolean;
}) {
  const ratio = freshnessSeconds / expectedUpdateFreq;
  const progressPercent = Math.min(100, (ratio / 4) * 100);

  return (
    <td className="py-2.5 px-3">
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-1.5">
          {isRealtime && freshnessStatus === 'fresh' && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          )}
          <span
            className="text-xs font-medium font-mono"
            style={{ color: getFreshnessColor(freshnessStatus) }}
          >
            {formatFreshness(freshnessSeconds)}
          </span>
        </div>
        <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${progressPercent}%`,
              backgroundColor: getFreshnessColor(freshnessStatus),
            }}
          />
        </div>
        <span className="text-[9px] text-gray-400">{ratio.toFixed(1)}x expected</span>
      </div>
    </td>
  );
});

const HealthRing = memo(function HealthRing({
  score,
  size = 80,
}: {
  score: number;
  size?: number;
}) {
  const grade = getHealthGrade(score);
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="6"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={grade.color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold" style={{ color: grade.color }}>
          {score}
        </span>
        <span className="text-[9px] text-gray-500">{grade.label}</span>
      </div>
    </div>
  );
});

const DistributionBar = memo(function DistributionBar({
  stats,
}: {
  stats: {
    freshCount: number;
    normalCount: number;
    delayedCount: number;
    criticalCount: number;
    staleCount: number;
    total: number;
  };
}) {
  const { freshCount, normalCount, delayedCount, criticalCount, staleCount, total } = stats;

  return (
    <div className="space-y-2">
      <div className="h-3 flex rounded-full overflow-hidden bg-gray-200 shadow-inner">
        {freshCount > 0 && (
          <div
            className="bg-emerald-500 transition-all relative group"
            style={{ width: `${(freshCount / total) * 100}%` }}
          >
            <div className="absolute inset-0 bg-emerald-400 opacity-0 group-hover:opacity-30 transition-opacity" />
          </div>
        )}
        {normalCount > 0 && (
          <div
            className="bg-blue-500 transition-all relative group"
            style={{ width: `${(normalCount / total) * 100}%` }}
          >
            <div className="absolute inset-0 bg-blue-400 opacity-0 group-hover:opacity-30 transition-opacity" />
          </div>
        )}
        {delayedCount > 0 && (
          <div
            className="bg-amber-500 transition-all relative group"
            style={{ width: `${(delayedCount / total) * 100}%` }}
          >
            <div className="absolute inset-0 bg-amber-400 opacity-0 group-hover:opacity-30 transition-opacity" />
          </div>
        )}
        {criticalCount > 0 && (
          <div
            className="bg-orange-500 transition-all relative group"
            style={{ width: `${(criticalCount / total) * 100}%` }}
          >
            <div className="absolute inset-0 bg-orange-400 opacity-0 group-hover:opacity-30 transition-opacity" />
          </div>
        )}
        {staleCount > 0 && (
          <div
            className="bg-red-500 transition-all relative group"
            style={{ width: `${(staleCount / total) * 100}%` }}
          >
            <div className="absolute inset-0 bg-red-400 opacity-0 group-hover:opacity-30 transition-opacity" />
          </div>
        )}
      </div>
      <div className="flex flex-wrap justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-gray-600">
            Fresh <span className="font-medium text-emerald-700">{freshCount}</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span className="text-gray-600">
            Normal <span className="font-medium text-blue-700">{normalCount}</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span className="text-gray-600">
            Delayed <span className="font-medium text-amber-700">{delayedCount}</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
          <span className="text-gray-600">
            Critical <span className="font-medium text-orange-700">{criticalCount}</span>
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
          <span className="text-gray-600">
            Stale <span className="font-medium text-red-700">{staleCount}</span>
          </span>
        </div>
      </div>
    </div>
  );
});

export function PriceFreshnessMonitor({ queryResults, avgPrice }: PriceFreshnessMonitorProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const hasMultipleSources = queryResults.length > 1;

  const dataSources = useMemo<DataSourceInfo[]>(() => {
    if (queryResults.length === 0) return [];

    return queryResults
      .filter((result) => result.priceData && result.priceData.price > 0)
      .map((result) => {
        const price = result.priceData.price;
        const timestamp = result.priceData.timestamp;
        const freshnessSeconds = Math.max(0, Math.floor((now - timestamp) / 1000));
        const expectedUpdateFreq = ORACLE_UPDATE_FREQUENCIES[result.provider] || 3600;
        const isRealtime = REALTIME_ORACLES.includes(result.provider);
        const thresholds = getDynamicThresholds(expectedUpdateFreq);
        const freshnessStatus = getFreshnessStatus(freshnessSeconds, thresholds);
        const freshnessScore = calculateFreshnessScore(
          freshnessSeconds,
          expectedUpdateFreq,
          isRealtime
        );
        const providerDefaults = getProviderDefaults(result.provider);
        const priceDeviation = Number.isFinite(avgPrice) && avgPrice > 0 ? price - avgPrice : 0;
        const priceDeviationPercent =
          Number.isFinite(avgPrice) && avgPrice > 0 ? (priceDeviation / avgPrice) * 100 : 0;
        const confidence = calculateConfidenceScore(result.priceData);
        const { score, factors } = calculateHealthScore(
          freshnessScore,
          providerDefaults.reliability,
          priceDeviationPercent,
          confidence,
          hasMultipleSources
        );
        const updateLagRatio = freshnessSeconds / expectedUpdateFreq;

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
          freshnessScore,
          reliability: providerDefaults.reliability,
          confidence,
          expectedUpdateFreq,
          healthScore: score,
          healthFactors: factors,
          updateLagRatio,
          isRealtime,
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
    const staleCount = dataSources.filter((d) => d.freshnessStatus === 'stale').length;
    const avgFreshness =
      dataSources.reduce((sum, d) => sum + d.freshnessSeconds, 0) / dataSources.length;
    const avgReliability =
      dataSources.reduce((sum, d) => sum + d.reliability, 0) / dataSources.length;
    const avgConfidence =
      dataSources.reduce((sum, d) => sum + d.confidence, 0) / dataSources.length;
    const realtimeCount = dataSources.filter((d) => d.isRealtime).length;
    const avgLagRatio =
      dataSources.reduce((sum, d) => sum + d.updateLagRatio, 0) / dataSources.length;

    return {
      avgHealthScore: Math.round(avgHealthScore),
      freshCount,
      normalCount,
      delayedCount,
      criticalCount,
      staleCount,
      avgFreshness,
      avgReliability,
      avgConfidence,
      total: dataSources.length,
      hasIssues: delayedCount > 0 || criticalCount > 0 || staleCount > 0,
      hasCritical: criticalCount > 0 || staleCount > 0,
      realtimeCount,
      avgLagRatio,
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
    <div className="space-y-5">
      {overallStats && (
        <div className="bg-gradient-to-br from-slate-50 to-gray-50 rounded-xl p-4 border border-gray-200">
          <div className="flex items-start gap-4">
            <HealthRing score={overallStats.avgHealthScore} size={90} />

            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-gray-600" />
                  <p className="text-sm font-medium text-gray-700">Data Freshness Distribution</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{overallStats.total} sources</span>
                  {overallStats.realtimeCount > 0 && (
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-emerald-500" />
                      {overallStats.realtimeCount} real-time
                    </span>
                  )}
                </div>
              </div>

              <DistributionBar stats={overallStats} />

              <div className="grid grid-cols-3 gap-3 pt-2">
                <div className="bg-white rounded-lg p-2 border border-gray-100">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Timer className="w-3 h-3 text-gray-500" />
                    <span className="text-[10px] text-gray-500">Avg Freshness</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">
                    {formatFreshness(Math.round(overallStats.avgFreshness))}
                  </p>
                </div>
                <div className="bg-white rounded-lg p-2 border border-gray-100">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Activity className="w-3 h-3 text-gray-500" />
                    <span className="text-[10px] text-gray-500">Avg Lag Ratio</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">
                    {overallStats.avgLagRatio.toFixed(2)}x
                  </p>
                </div>
                <div className="bg-white rounded-lg p-2 border border-gray-100">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Shield className="w-3 h-3 text-gray-500" />
                    <span className="text-[10px] text-gray-500">Reliability</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-800">
                    {overallStats.avgReliability.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {overallStats && overallStats.hasIssues && (
        <div
          className={`rounded-lg p-3 border ${
            overallStats.hasCritical
              ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-200'
              : 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-200'
          }`}
        >
          <div className="flex items-start gap-2">
            <AlertCircle
              className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                overallStats.hasCritical ? 'text-red-600' : 'text-amber-600'
              }`}
            />
            <div className="flex-1">
              <p
                className={`text-sm font-medium ${
                  overallStats.hasCritical ? 'text-red-800' : 'text-amber-800'
                }`}
              >
                Data Freshness Issues Detected
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {overallStats.staleCount > 0 && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                    {overallStats.staleCount} Stale
                  </span>
                )}
                {overallStats.criticalCount > 0 && (
                  <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full font-medium">
                    {overallStats.criticalCount} Critical
                  </span>
                )}
                {overallStats.delayedCount > 0 && (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">
                    {overallStats.delayedCount} Delayed
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Consider refreshing data or checking the affected oracle endpoints.
              </p>
            </div>
          </div>
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
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-gray-900">{source.provider}</p>
                          {source.isRealtime && (
                            <span className="px-1 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] rounded font-medium">
                              RT
                            </span>
                          )}
                        </div>
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
                  <FreshnessIndicator
                    freshnessSeconds={source.freshnessSeconds}
                    freshnessStatus={source.freshnessStatus}
                    expectedUpdateFreq={source.expectedUpdateFreq}
                    isRealtime={source.isRealtime}
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

      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-3.5 h-3.5 text-gray-500" />
          <p className="text-xs font-medium text-gray-600">Freshness Algorithm</p>
        </div>
        <p className="text-xs text-gray-500 leading-relaxed">
          Each oracle has a unique expected update frequency. Freshness is calculated as a ratio of
          actual age to expected update interval. Real-time oracles (Pyth, RedStone) use stricter
          thresholds. Health score combines freshness (40%), reliability (30%), price consistency
          (20%), and confidence (10%).
        </p>
        <div className="flex flex-wrap gap-2 mt-2">
          {Object.entries(ORACLE_UPDATE_FREQUENCIES).map(([provider, freq]) => (
            <span
              key={provider}
              className="px-2 py-0.5 bg-white border border-gray-200 rounded text-[10px] text-gray-600"
            >
              {providerNames[provider as OracleProvider] || provider}:{' '}
              <span className="font-medium">{formatExpectedFrequency(freq)}</span>
            </span>
          ))}
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

      {overallStats && !overallStats.hasIssues && hasMultipleSources && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
          <div className="flex items-start gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-emerald-800">All Data Sources Healthy</p>
              <p className="text-xs text-emerald-700 mt-1">
                Avg freshness: {formatFreshness(Math.round(overallStats.avgFreshness))} | Avg lag
                ratio: {overallStats.avgLagRatio.toFixed(2)}x | Avg reliability:{' '}
                {overallStats.avgReliability.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
