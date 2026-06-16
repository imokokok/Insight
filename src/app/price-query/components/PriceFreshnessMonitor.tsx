/* eslint-disable max-lines-per-function */
'use client';

import { useMemo, useEffect, useState } from 'react';

import {
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
import { type OracleProvider } from '@/types/oracle';

import { type QueryResult } from '../constants';
import {
  type DataSourceInfo,
  ORACLE_UPDATE_FREQUENCIES,
  REALTIME_ORACLES,
  getDynamicThresholds,
  getFreshnessStatus,
  calculateFreshnessScore,
  calculateConfidenceScore,
  calculateHealthScore,
  getHealthGrade,
  formatFreshness,
  formatExpectedFrequency,
} from '../utils/freshnessUtils';

import { FreshnessIndicator, HealthRing, DistributionBar } from './FreshnessWidgets';

interface PriceFreshnessMonitorProps {
  queryResults: QueryResult[];
  avgPrice: number;
}

export function PriceFreshnessMonitor({ queryResults, avgPrice }: PriceFreshnessMonitorProps) {
  const [now, setNow] = useState(() => Date.now());
  const [updateTimestamps, setUpdateTimestamps] = useState<Map<string, number[]>>(new Map());
  const [healthScoreHistory, setHealthScoreHistory] = useState<number[]>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setNow(Date.now());
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const currentTime = Date.now();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUpdateTimestamps((prev) => {
      const next = new Map(prev);
      queryResults.forEach((result) => {
        if (result.priceData && result.priceData.price > 0) {
          const key = `${result.provider}_${result.chain}`;
          const existing = next.get(key) || [];
          const updated = [...existing, currentTime].slice(-10);
          next.set(key, updated);
        }
      });
      return next;
    });
  }, [queryResults]);

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
        const thresholds = getDynamicThresholds(expectedUpdateFreq, isRealtime);
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

  const rhythmAnomalies = useMemo<
    Map<
      string,
      {
        avgInterval: number;
        expectedInterval: number;
        ratio: number;
        label: string;
        color: string;
      }
    >
  >(() => {
    const anomalies = new Map<
      string,
      {
        avgInterval: number;
        expectedInterval: number;
        ratio: number;
        label: string;
        color: string;
      }
    >();
    dataSources.forEach((ds) => {
      const ts = updateTimestamps.get(ds.key);
      if (ts && ts.length >= 2) {
        const intervals: number[] = [];
        for (let i = 1; i < ts.length; i++) {
          intervals.push((ts[i] - ts[i - 1]) / 1000);
        }
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        const expectedInterval = ds.expectedUpdateFreq;
        const ratio = avgInterval / expectedInterval;
        let label = '';
        let color = '';
        if (ratio > 2) {
          label = 'Irregular';
          color = '#ef4444';
        } else if (ratio > 1.5) {
          label = 'Slow';
          color = '#f59e0b';
        } else if (ratio < 0.5) {
          label = 'Fast';
          color = '#3b82f6';
        }
        anomalies.set(ds.key, { avgInterval, expectedInterval, ratio, label, color });
      }
    });
    return anomalies;
  }, [dataSources, updateTimestamps]);

  const heartbeatLostCount = useMemo(() => {
    return dataSources.filter(
      (d) => d.freshnessStatus === 'stale' || d.freshnessStatus === 'critical'
    ).length;
  }, [dataSources]);

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

  useEffect(() => {
    if (overallStats) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHealthScoreHistory((prev) => [...prev, overallStats.avgHealthScore].slice(-5));
    }
  }, [overallStats]);

  const healthScoreTrend = useMemo<{ arrow: string; color: string } | null>(() => {
    if (healthScoreHistory.length < 2) return null;
    const latest = healthScoreHistory[healthScoreHistory.length - 1];
    const previous = healthScoreHistory[healthScoreHistory.length - 2];
    const diff = latest - previous;
    if (diff > 2) return { arrow: '↑', color: '#10b981' };
    if (diff < -2) return { arrow: '↓', color: '#ef4444' };
    return { arrow: '→', color: '#9ca3af' };
  }, [healthScoreHistory]);

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
            <div className="relative">
              <HealthRing score={overallStats.avgHealthScore} size={90} />
              {healthScoreTrend && (
                <span
                  className="absolute -top-1 -right-1 text-lg font-bold leading-none"
                  style={{ color: healthScoreTrend.color }}
                >
                  {healthScoreTrend.arrow}
                </span>
              )}
            </div>

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
                  {heartbeatLostCount > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-medium">
                      💔 {heartbeatLostCount} Heartbeat{heartbeatLostCount > 1 ? 's' : ''} Lost
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
              <th className="text-center py-2 px-3 font-medium text-gray-500 text-xs">Rhythm</th>
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
                    <div className="flex flex-col items-center gap-0.5">
                      {(() => {
                        const anomaly = rhythmAnomalies.get(source.key);
                        if (!anomaly) {
                          return <span className="text-[10px] text-gray-400">—</span>;
                        }
                        return (
                          <>
                            {anomaly.label && (
                              <span
                                className="text-[10px] font-medium"
                                style={{ color: anomaly.color }}
                              >
                                {anomaly.label}
                              </span>
                            )}
                            <span className="text-[9px] text-gray-500">
                              {anomaly.avgInterval < 60
                                ? `${anomaly.avgInterval.toFixed(1)}s`
                                : anomaly.avgInterval < 3600
                                  ? `${(anomaly.avgInterval / 60).toFixed(1)}m`
                                  : `${(anomaly.avgInterval / 3600).toFixed(1)}h`}{' '}
                              vs{' '}
                              {anomaly.expectedInterval < 60
                                ? `${anomaly.expectedInterval}s`
                                : anomaly.expectedInterval < 3600
                                  ? `${anomaly.expectedInterval / 60}m`
                                  : `${anomaly.expectedInterval / 3600}h`}{' '}
                              expected
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  </td>
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
