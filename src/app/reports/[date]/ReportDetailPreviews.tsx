'use client';

import { ArrowLeftRight, CheckCircle2, Coins, Globe, Radio, ShieldAlert } from 'lucide-react';

import { chainNames, oracleColors, providerNames } from '@/lib/constants';
import {
  type DailyReportData,
  type ProtocolLiquidationRisk,
  type ProviderRanking,
  type RiskImpact,
} from '@/lib/reports/reportService';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/utils/format';
import type { Blockchain } from '@/types/oracle';

export function getSeverityConfig(severity: string) {
  switch (severity) {
    case 'critical':
      return {
        label: 'Critical',
        dot: 'bg-red-500',
        text: 'text-red-700',
        bg: 'bg-red-50',
        border: 'border-red-100',
      };
    case 'high':
      return {
        label: 'High',
        dot: 'bg-orange-500',
        text: 'text-orange-700',
        bg: 'bg-orange-50',
        border: 'border-orange-100',
      };
    case 'medium':
      return {
        label: 'Medium',
        dot: 'bg-amber-500',
        text: 'text-amber-700',
        bg: 'bg-amber-50',
        border: 'border-amber-100',
      };
    default:
      return {
        label: 'Low',
        dot: 'bg-emerald-500',
        text: 'text-emerald-700',
        bg: 'bg-emerald-50',
        border: 'border-emerald-100',
      };
  }
}

export function getCategoryConfig(category: RiskImpact['category']) {
  switch (category) {
    case 'liquidation':
      return { label: 'Liquidation', icon: ShieldAlert };
    case 'stablecoin_depeg':
      return { label: 'Stablecoin', icon: Coins };
    case 'wrapped_asset':
      return { label: 'Wrapped', icon: ArrowLeftRight };
    case 'oracle_reliability':
      return { label: 'Reliability', icon: Radio };
    case 'systemic':
      return { label: 'Systemic', icon: Globe };
  }
}

export function RiskSummaryPreview({ report }: { report: DailyReportData }) {
  const { riskImpacts, stablecoinDepeg, wrappedAssetPeg, anomalySummary } = report;

  if (riskImpacts.length === 0) {
    return (
      <div className="flex items-start gap-3 text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg p-4">
        <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium">No material risks identified</p>
          <p className="text-xs text-emerald-600/80 mt-0.5">
            Oracle data stayed within tolerance bands that would typically affect DeFi positions.
          </p>
        </div>
      </div>
    );
  }

  const topImpacts = riskImpacts.slice(0, 3);
  const pegAssets = [...stablecoinDepeg, ...wrappedAssetPeg].sort(
    (a, b) => b.maxDeviationPercent - a.maxDeviationPercent
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-gray-900">
          {riskImpacts.length} risk{riskImpacts.length !== 1 ? 's' : ''} identified
        </span>
        {anomalySummary.bySeverity.critical > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-red-50 text-red-700 border border-red-100">
            {anomalySummary.bySeverity.critical} critical
          </span>
        )}
        {anomalySummary.bySeverity.high > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-orange-50 text-orange-700 border border-orange-100">
            {anomalySummary.bySeverity.high} high
          </span>
        )}
        {anomalySummary.bySeverity.medium > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-100">
            {anomalySummary.bySeverity.medium} medium
          </span>
        )}
      </div>

      <div className="space-y-2">
        {topImpacts.map((impact, index) => {
          const config = getSeverityConfig(impact.severity);
          const categoryConfig = getCategoryConfig(impact.category);
          return (
            <div
              key={`${impact.category}-${impact.title}-${index}`}
              className={cn(
                'flex items-start justify-between gap-3 rounded-lg border px-3 py-2.5',
                config.bg,
                config.border
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <categoryConfig.icon className={cn('w-4 h-4 flex-shrink-0', config.text)} />
                <p className={cn('text-sm font-medium truncate', config.text)}>{impact.title}</p>
              </div>
              <span
                className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider flex-shrink-0',
                  config.bg,
                  config.text
                )}
              >
                {config.label}
              </span>
            </div>
          );
        })}
      </div>

      {riskImpacts.length > 3 && (
        <p className="text-xs text-gray-500">
          +{riskImpacts.length - 3} more risk{riskImpacts.length - 3 > 1 ? 's' : ''} in full view.
        </p>
      )}

      {pegAssets.length > 0 && (
        <p className="text-xs text-gray-500">
          Largest peg divergence:{' '}
          <span className="font-semibold text-gray-900">{pegAssets[0].symbol}</span> at{' '}
          {pegAssets[0].maxDeviationPercent.toFixed(2)}%.
        </p>
      )}
    </div>
  );
}

export function DeviationEventsPreview({ report }: { report: DailyReportData }) {
  const { deviationEvents, anomalySummary } = report;

  if (deviationEvents.length === 0) {
    return (
      <div className="flex items-start gap-3 text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg p-4">
        <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium">No significant deviations recorded</p>
          <p className="text-xs text-emerald-600/80 mt-0.5">
            Oracle prices stayed close to consensus across all hourly snapshots.
          </p>
        </div>
      </div>
    );
  }

  const topEvents = deviationEvents.slice(0, 3);

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 leading-relaxed">
        <span className="font-semibold text-gray-900">{deviationEvents.length}</span> snapshot
        {deviationEvents.length !== 1 ? 's' : ''} where a provider diverged from consensus. These
        raw deviation signals feed into the risk summary above and can precede liquidations or peg
        breaks.
      </p>

      <div className="space-y-2">
        {topEvents.map((e, index) => {
          const color = oracleColors[e.provider] ?? '#9CA3AF';
          return (
            <div
              key={`${e.provider}-${e.symbol}-${e.hour}-${index}`}
              className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="text-sm font-medium text-gray-900 truncate">
                  {providerNames[e.provider] ?? e.provider} · {e.symbol}
                </span>
              </div>
              <div className="text-right flex-shrink-0 pl-4">
                <p className="text-xs text-gray-500">Deviation</p>
                <p
                  className={cn(
                    'text-sm font-semibold font-mono',
                    e.deviationPct >= 1
                      ? 'text-red-600'
                      : e.deviationPct >= 0.5
                        ? 'text-amber-600'
                        : 'text-emerald-600'
                  )}
                >
                  {e.deviationPct > 0 ? '+' : ''}
                  {e.deviationPct.toFixed(2)}%
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {deviationEvents.length > 3 && (
        <p className="text-xs text-gray-500">
          +{deviationEvents.length - 3} more event{deviationEvents.length - 3 > 1 ? 's' : ''} in
          full view.
        </p>
      )}

      {anomalySummary.total > 0 && (
        <p className="text-xs text-gray-500">
          Total anomalies flagged today:{' '}
          <span className="font-semibold text-gray-900">{anomalySummary.total}</span>.
        </p>
      )}
    </div>
  );
}

export function LiquidationRiskPreview({ risks }: { risks: ProtocolLiquidationRisk[] }) {
  if (risks.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-4">
        No liquidation stress-test data available.
      </p>
    );
  }

  const topRisks = risks.slice(0, 2);

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 leading-relaxed">
        The most leveraged-sensitive protocols today. Expand to see all stress-test scenarios.
      </p>
      {topRisks.map((risk) => {
        const hfColor =
          risk.currentHealthFactor < 1
            ? 'text-gray-500'
            : risk.currentHealthFactor < 1.05
              ? 'text-red-600'
              : risk.currentHealthFactor < 1.2
                ? 'text-amber-600'
                : 'text-emerald-600';
        return (
          <div
            key={risk.protocolId}
            className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-900">{risk.protocolName}</h3>
                <span className="text-xs text-gray-500">
                  {chainNames[risk.chain as Blockchain] ?? risk.chain}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Joint liquidation threshold:{' '}
                {Math.abs(risk.jointCriticalDeviationPercent).toFixed(2)}% major-equiv
              </p>
            </div>
            <div className="text-right flex-shrink-0 pl-4">
              <p className="text-xs text-gray-500">Current HF</p>
              <p className={cn('text-sm font-semibold font-mono', hfColor)}>
                {risk.currentHealthFactor.toFixed(2)}
              </p>
            </div>
          </div>
        );
      })}
      {risks.length > 2 && (
        <p className="text-xs text-gray-500">
          +{risks.length - 2} more protocol{risks.length - 2 > 1 ? 's' : ''} in full view.
        </p>
      )}
    </div>
  );
}

export function ProviderPerformancePreview({ rankings }: { rankings: ProviderRanking[] }) {
  if (rankings.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-4">
        No provider performance data available.
      </p>
    );
  }

  const abnormal = rankings.filter(
    (r) => r.anomalyCount > 0 || r.successRate < 95 || r.avgDeviationPct >= 0.5
  );
  const worstSuccess = rankings.reduce((min, r) => (r.successRate < min.successRate ? r : min));
  const worstDeviation = rankings.reduce((max, r) =>
    r.avgDeviationPct > max.avgDeviationPct ? r : max
  );
  const totalAnomalies = rankings.reduce((sum, r) => sum + r.anomalyCount, 0);

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 leading-relaxed">
        {abnormal.length > 0 ? (
          <>
            <span className="font-semibold text-gray-900">{abnormal.length}</span> of{' '}
            <span className="font-semibold text-gray-900">{rankings.length}</span> providers showed
            anomalies today. Provider-level drift or downtime widens price ranges and can feed stale
            prices into lending liquidations and stablecoin/wrapped-asset peg checks.
          </>
        ) : (
          <>
            All {rankings.length} providers operated within normal bands today. Keep an eye on the
            highest-deviation feeds below, as even small drift compounds during volatile market
            hours.
          </>
        )}
      </p>

      <div className="space-y-2">
        {abnormal.length > 0 ? (
          <>
            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: oracleColors[worstSuccess.provider] ?? '#9CA3AF' }}
                />
                <span className="text-sm font-medium text-gray-900 truncate">
                  {providerNames[worstSuccess.provider] ?? worstSuccess.provider}
                </span>
              </div>
              <div className="text-right flex-shrink-0 pl-4">
                <p className="text-xs text-gray-500">Lowest success</p>
                <p
                  className={cn(
                    'text-sm font-semibold font-mono',
                    worstSuccess.successRate >= 95 ? 'text-amber-600' : 'text-red-600'
                  )}
                >
                  {worstSuccess.successRate.toFixed(1)}%
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: oracleColors[worstDeviation.provider] ?? '#9CA3AF' }}
                />
                <span className="text-sm font-medium text-gray-900 truncate">
                  {providerNames[worstDeviation.provider] ?? worstDeviation.provider}
                </span>
              </div>
              <div className="text-right flex-shrink-0 pl-4">
                <p className="text-xs text-gray-500">Largest avg deviation</p>
                <p
                  className={cn(
                    'text-sm font-semibold font-mono',
                    worstDeviation.avgDeviationPct >= 0.5 ? 'text-red-600' : 'text-amber-600'
                  )}
                >
                  {worstDeviation.avgDeviationPct.toFixed(3)}%
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: oracleColors[worstDeviation.provider] ?? '#9CA3AF' }}
              />
              <span className="text-sm font-medium text-gray-900 truncate">
                {providerNames[worstDeviation.provider] ?? worstDeviation.provider}
              </span>
            </div>
            <div className="text-right flex-shrink-0 pl-4">
              <p className="text-xs text-gray-500">Largest avg deviation</p>
              <p
                className={cn(
                  'text-sm font-semibold font-mono',
                  worstDeviation.avgDeviationPct >= 0.5 ? 'text-red-600' : 'text-emerald-600'
                )}
              >
                {worstDeviation.avgDeviationPct.toFixed(3)}%
              </p>
            </div>
          </div>
        )}
      </div>

      {totalAnomalies > 0 && (
        <p className="text-xs text-gray-500">
          Total anomaly snapshots:{' '}
          <span className="font-semibold text-gray-900">{totalAnomalies}</span>. Expand to review
          every provider’s score, latency, and anomaly count.
        </p>
      )}
    </div>
  );
}

export function AssetPerformancePreview({ assets }: { assets: DailyReportData['topAssets'] }) {
  if (assets.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-4">No asset performance data available.</p>
    );
  }

  const abnormal = assets.filter((a) => a.volatilityPct >= 0.5 || a.maxDeviationPct >= 0.5);
  const mostVolatile = assets.reduce((max, a) => (a.volatilityPct > max.volatilityPct ? a : max));
  const worstDeviation = assets.reduce((max, a) =>
    a.maxDeviationPct > max.maxDeviationPct ? a : max
  );

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 leading-relaxed">
        {abnormal.length > 0 ? (
          <>
            <span className="font-semibold text-gray-900">{abnormal.length}</span> of{' '}
            <span className="font-semibold text-gray-900">{assets.length}</span> tracked assets
            showed notable volatility or cross-provider deviation. Large divergences between oracle
            sources can trigger cascading liquidations and break stablecoin/wrapped-asset pegs.
          </>
        ) : (
          <>
            Assets were relatively stable across tracked oracle sources. The most volatile and
            highest-deviation assets below are still worth tracking before opening or adjusting DeFi
            positions.
          </>
        )}
      </p>

      <div className="space-y-2">
        {abnormal.slice(0, 3).map((asset) => (
          <div
            key={asset.symbol}
            className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">{asset.symbol}</p>
              <p className="text-xs text-gray-500">
                Consensus {formatPrice(asset.avgConsensusPrice)}
              </p>
            </div>
            <div className="flex items-center gap-4 flex-shrink-0 pl-4">
              <div className="text-right">
                <p className="text-xs text-gray-500">Volatility</p>
                <p
                  className={cn(
                    'text-sm font-semibold font-mono',
                    asset.volatilityPct >= 1
                      ? 'text-red-600'
                      : asset.volatilityPct >= 0.5
                        ? 'text-amber-600'
                        : 'text-emerald-600'
                  )}
                >
                  {asset.volatilityPct.toFixed(2)}%
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500">Max dev</p>
                <p
                  className={cn(
                    'text-sm font-semibold font-mono',
                    asset.maxDeviationPct >= 1
                      ? 'text-red-600'
                      : asset.maxDeviationPct >= 0.5
                        ? 'text-amber-600'
                        : 'text-emerald-600'
                  )}
                >
                  {asset.maxDeviationPct.toFixed(3)}%
                </p>
              </div>
            </div>
          </div>
        ))}

        {abnormal.length === 0 && (
          <div className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">{mostVolatile.symbol}</p>
              <p className="text-xs text-gray-500">Most volatile today</p>
            </div>
            <div className="text-right flex-shrink-0 pl-4">
              <p className="text-xs text-gray-500">Volatility</p>
              <p className="text-sm font-semibold font-mono text-emerald-600">
                {mostVolatile.volatilityPct.toFixed(2)}%
              </p>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-500">
        Highest cross-provider deviation:{' '}
        <span className="font-semibold text-gray-900">{worstDeviation.symbol}</span> at{' '}
        {worstDeviation.maxDeviationPct.toFixed(3)}%. Expand to see full price ranges and provider
        coverage.
      </p>
    </div>
  );
}

export function FailureBreakdownPreview({
  breakdown,
}: {
  breakdown: DailyReportData['failureBreakdown'];
}) {
  if (!breakdown || breakdown.length === 0) return null;

  const totalFailures = breakdown.reduce((sum, item) => sum + item.failureCount, 0);
  const topItems = breakdown.slice(0, 3);

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600 leading-relaxed">
        <span className="font-semibold text-gray-900">{breakdown.length}</span> provider-asset pair
        {breakdown.length !== 1 ? 's' : ''} failed to fetch prices, totaling{' '}
        <span className="font-semibold text-gray-900">{totalFailures}</span> failure
        {totalFailures !== 1 ? 's' : ''}. Missing feeds can force protocols to use stale or fallback
        prices, raising liquidation and peg risks.
      </p>

      <div className="space-y-2">
        {topItems.map((item) => (
          <div
            key={`${item.provider}-${item.symbol}`}
            className="flex items-start justify-between rounded-lg border border-gray-200 p-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">
                {providerNames[item.provider] ?? item.provider} · {item.symbol}
              </p>
              {item.topError && <p className="text-xs text-gray-500 truncate">{item.topError}</p>}
            </div>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-50 text-red-700 border border-red-100 flex-shrink-0">
              {item.failureCount}
            </span>
          </div>
        ))}
      </div>

      {breakdown.length > 3 && (
        <p className="text-xs text-gray-500">
          +{breakdown.length - 3} more pair{breakdown.length - 3 > 1 ? 's' : ''} in full view.
        </p>
      )}
    </div>
  );
}
