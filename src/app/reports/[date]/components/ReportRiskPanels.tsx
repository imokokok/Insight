'use client';

import { useMemo } from 'react';

import { CheckCircle2, Minus, TrendingDown, TrendingUp } from 'lucide-react';

import { providerNames } from '@/lib/constants';
import {
  type DailyReportData,
  type DeviationEvent,
  type RiskImpact,
  type StablecoinDepegSummary,
  type WrappedAssetPegSummary,
} from '@/lib/reports/reportService';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/utils/format';

import { getCategoryConfig, getSeverityConfig } from '../ReportDetailPreviews';

import { getReportRiskLevelConfig, PanelInsight } from './ReportShared';

export function DeviationEvents({ report }: { report: DailyReportData }) {
  const { deviationEvents: events, anomalySummary, riskImpacts } = report;

  const topProviders = useMemo(() => {
    return Object.entries(anomalySummary.byProvider)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [anomalySummary.byProvider]);

  const topAssets = useMemo(() => {
    return Object.entries(anomalySummary.byAsset)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [anomalySummary.byAsset]);

  // Map each asset to the user-risk impacts that mention it, so every deviation
  // event can surface affected protocols, chains, and user types directly.
  const impactsByAsset = useMemo(() => {
    const map = new Map<string, RiskImpact[]>();
    for (const impact of riskImpacts ?? []) {
      for (const asset of impact.relatedAssets) {
        const list = map.get(asset) ?? [];
        list.push(impact);
        map.set(asset, list);
      }
    }
    return map;
  }, [riskImpacts]);

  if (events.length === 0) {
    return (
      <div className="flex items-start gap-3 text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg p-4">
        <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium">No material deviations</p>
          <p className="text-xs text-emerald-600/80 mt-0.5">
            All tracked providers stayed within tolerance of the consensus price.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Compact anomaly source summary */}
      {(topProviders.length > 0 || topAssets.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Top affected providers
            </p>
            <div className="flex flex-wrap gap-1.5">
              {topProviders.map(([provider, count]) => (
                <span
                  key={provider}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-white border border-gray-200 text-gray-700"
                >
                  {providerNames[provider as keyof typeof providerNames] ?? provider}
                  <span className="text-gray-400">·</span>
                  <span className="font-tabular">{count}</span>
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Top affected assets
            </p>
            <div className="flex flex-wrap gap-1.5">
              {topAssets.map(([asset, count]) => (
                <span
                  key={asset}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-white border border-gray-200 text-gray-700"
                >
                  {asset}
                  <span className="text-gray-400">·</span>
                  <span className="font-tabular">{count}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {events.slice(0, 8).map((event, index) => {
          const config = getSeverityConfig(event.severity);
          const relatedImpacts = impactsByAsset.get(event.symbol) ?? [];
          const affectedEntities = [...new Set(relatedImpacts.flatMap((i) => i.affectedEntities))];
          const primaryImpact = relatedImpacts[0];
          const eventTime = new Date(event.hour).toLocaleTimeString('en-US', {
            timeZone: 'UTC',
            hour: '2-digit',
            minute: '2-digit',
          });

          return (
            <div
              key={`${event.provider}-${event.symbol}-${event.hour}-${index}`}
              className={cn('rounded-lg border px-4 py-3', config.bg, config.border)}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className={cn('w-2 h-2 rounded-full flex-shrink-0', config.dot)} />
                  <div className="min-w-0">
                    <p className={cn('text-sm font-medium truncate', config.text)}>
                      {providerNames[event.provider] ?? event.provider} · {event.symbol}
                    </p>
                    <p className={cn('text-xs truncate opacity-80', config.text)}>
                      {formatPrice(event.price)} vs consensus {formatPrice(event.consensusPrice)} ·{' '}
                      {eventTime} UTC
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold font-tabular text-gray-900 flex-shrink-0">
                  {event.deviationPct > 0 ? '+' : ''}
                  {event.deviationPct.toFixed(3)}%
                </span>
              </div>

              {affectedEntities.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {affectedEntities.slice(0, 5).map((entity) => (
                    <span
                      key={entity}
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border',
                        config.bg,
                        config.border,
                        config.text
                      )}
                    >
                      {entity}
                    </span>
                  ))}
                  {affectedEntities.length > 5 && (
                    <span className={cn('text-[10px]', config.text)}>
                      +{affectedEntities.length - 5} more
                    </span>
                  )}
                </div>
              )}

              {primaryImpact && (
                <p className={cn('text-xs mt-2 leading-relaxed opacity-90', config.text)}>
                  {primaryImpact.description}
                </p>
              )}
            </div>
          );
        })}
        {events.length > 8 && (
          <p className="text-xs text-gray-500 text-center py-2">+{events.length - 8} more events</p>
        )}
      </div>
    </div>
  );
}

export function DeviationEventsInsight({ report }: { report: DailyReportData }) {
  const { deviationEvents, anomalySummary } = report;
  if (deviationEvents.length === 0) {
    return (
      <PanelInsight tone="good">
        All tracked providers stayed within tolerance of the consensus price.
      </PanelInsight>
    );
  }

  const topProviders = Object.entries(anomalySummary.byProvider)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);
  const topAssets = Object.entries(anomalySummary.byAsset)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2);

  const tone =
    anomalySummary.bySeverity.critical > 0 || anomalySummary.bySeverity.high > 0
      ? 'warning'
      : 'neutral';

  return (
    <PanelInsight tone={tone}>
      {deviationEvents.length} material deviation event(s) recorded. Top sources:{' '}
      {topProviders.map(([p]) => providerNames[p as keyof typeof providerNames] ?? p).join(', ')}
      {' · '}Top assets: {topAssets.map(([a]) => a).join(', ')}.
      {anomalySummary.bySeverity.critical > 0 &&
        ' Audit critical events before using feeds as primary references.'}
    </PanelInsight>
  );
}

export function AnomalyBreakdown({ report }: { report: DailyReportData }) {
  const total = report.anomalySummary.total || 1;
  const severityOrder = ['critical', 'high', 'medium', 'low'] as const;

  return (
    <div className="space-y-3">
      {severityOrder.map((severity) => {
        const count = report.anomalySummary.bySeverity[severity] ?? 0;
        const config = getSeverityConfig(severity);
        const pct = Math.round((count / total) * 100);
        return (
          <div key={severity}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className={cn('w-2 h-2 rounded-full', config.dot)} />
                <span className="text-sm text-gray-700">{config.label}</span>
              </div>
              <span className="text-sm font-semibold text-gray-900 font-tabular">{count}</span>
            </div>
            <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div className={cn('h-full rounded-full', config.dot)} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AnomalyBreakdownInsight({ report }: { report: DailyReportData }) {
  const { bySeverity, total } = report.anomalySummary;
  if (total === 0) {
    return <PanelInsight tone="good">No material anomalies today.</PanelInsight>;
  }
  if (bySeverity.critical > 0) {
    return (
      <PanelInsight tone="warning">
        {bySeverity.critical} critical anomaly/anomalies detected—prioritize affected feeds and
        protocols first.
      </PanelInsight>
    );
  }
  if (bySeverity.high > 0) {
    return (
      <PanelInsight tone="warning">
        {bySeverity.high} high-severity anomaly/anomalies flagged; review before end of day.
      </PanelInsight>
    );
  }
  return (
    <PanelInsight tone="neutral">
      {total} anomaly/anomalies recorded today, mostly lower severity. Keep tracking.
    </PanelInsight>
  );
}

export function PreviousDayComparison({
  comparison,
}: {
  comparison: DailyReportData['previousDayComparison'];
}) {
  if (!comparison || !comparison.reportAvailable) {
    return (
      <p className="text-sm text-gray-500 text-center py-4">No previous day data available.</p>
    );
  }

  const items = [
    {
      label: 'Success rate',
      value: comparison.successRateChangePct,
      unit: 'pp',
      goodWhenPositive: true,
    },
    {
      label: 'Avg deviation',
      value: comparison.avgDeviationChangePct,
      unit: 'pp',
      goodWhenPositive: false,
    },
    { label: 'Anomalies', value: comparison.anomalyChangePct, unit: '%', goodWhenPositive: false },
    {
      label: 'Failed snapshots',
      value: comparison.failedSnapshotsChangePct,
      unit: '%',
      goodWhenPositive: false,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3">
      {items.map((item) => {
        const isPositive = item.value > 0;
        const isNegative = item.value < 0;
        const isGood = item.goodWhenPositive ? isPositive : isNegative;
        const color = isGood
          ? 'text-emerald-600'
          : isNegative || isPositive
            ? 'text-red-600'
            : 'text-gray-500';
        const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
        return (
          <div key={item.label} className="bg-gray-50 rounded-lg p-3">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
              {item.label}
            </p>
            <div
              className={cn('flex items-center gap-1 text-sm font-semibold font-tabular', color)}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>
                {isPositive ? '+' : ''}
                {item.value.toFixed(item.unit === 'pp' || item.unit === '%' ? 2 : 0)}
                {item.unit}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function PreviousDayComparisonInsight({
  comparison,
}: {
  comparison: DailyReportData['previousDayComparison'];
}) {
  if (!comparison || !comparison.reportAvailable) {
    return null;
  }

  const srChange = comparison.successRateChangePct;
  const devChange = comparison.avgDeviationChangePct;
  const anomalyChange = comparison.anomalyChangePct;

  const warnings: string[] = [];
  if (srChange < 0) warnings.push(`success rate down ${Math.abs(srChange).toFixed(1)} pp`);
  if (devChange > 0) warnings.push(`avg deviation up ${devChange.toFixed(3)} pp`);
  if (anomalyChange > 0) warnings.push(`anomalies up ${anomalyChange.toFixed(1)}%`);

  if (warnings.length === 0) {
    return (
      <PanelInsight tone="good">
        Day-over-day metrics are stable or improved vs. the previous day.
      </PanelInsight>
    );
  }

  return (
    <PanelInsight tone="neutral">
      Compared to yesterday: {warnings.join(', ')}. Worth a closer look.
    </PanelInsight>
  );
}

export function UnifiedRiskPanel({ report }: { report: DailyReportData }) {
  const { riskImpacts, stablecoinDepeg, wrappedAssetPeg, deviationEvents, anomalySummary } = report;

  const pegBySymbol = useMemo(() => {
    const map = new Map<string, StablecoinDepegSummary | WrappedAssetPegSummary>();
    stablecoinDepeg.forEach((s) => map.set(s.symbol, s));
    wrappedAssetPeg.forEach((w) => map.set(w.symbol, w));
    return map;
  }, [stablecoinDepeg, wrappedAssetPeg]);

  const eventsByAsset = useMemo(() => {
    const map = new Map<string, DeviationEvent[]>();
    for (const e of deviationEvents) {
      const list = map.get(e.symbol) ?? [];
      list.push(e);
      map.set(e.symbol, list);
    }
    return map;
  }, [deviationEvents]);

  if (riskImpacts.length === 0 && deviationEvents.length === 0) {
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

  return (
    <div className="space-y-5">
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

      <div className="space-y-3">
        {riskImpacts.map((impact, index) => {
          const config = getSeverityConfig(impact.severity);
          const categoryConfig = getCategoryConfig(impact.category);
          const relatedEvents = impact.relatedAssets.flatMap((a) => eventsByAsset.get(a) ?? []);
          const pegInfo = impact.relatedAssets.map((a) => pegBySymbol.get(a)).filter(Boolean)[0];
          return (
            <div
              key={`${impact.category}-${impact.title}-${index}`}
              className={cn('rounded-lg border px-4 py-3', config.bg, config.border)}
            >
              <div className="flex items-start justify-between gap-3">
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
              <p className={cn('text-sm mt-2 leading-relaxed', config.text)}>
                {impact.description}
              </p>

              {pegInfo && (
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider',
                      getReportRiskLevelConfig(pegInfo.riskLevel).bg,
                      getReportRiskLevelConfig(pegInfo.riskLevel).text
                    )}
                  >
                    {getReportRiskLevelConfig(pegInfo.riskLevel).label}
                  </span>
                  <span className={cn('text-xs', config.text)}>
                    Max divergence:{' '}
                    <span className="font-mono font-semibold">
                      {pegInfo.maxDeviationPercent.toFixed(2)}%
                    </span>
                  </span>
                </div>
              )}

              {impact.affectedEntities.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2.5">
                  {impact.affectedEntities.slice(0, 5).map((entity) => (
                    <span
                      key={entity}
                      className={cn(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border',
                        config.bg,
                        config.border,
                        config.text
                      )}
                    >
                      {entity}
                    </span>
                  ))}
                  {impact.affectedEntities.length > 5 && (
                    <span className={cn('text-[10px]', config.text)}>
                      +{impact.affectedEntities.length - 5} more
                    </span>
                  )}
                </div>
              )}

              {relatedEvents.length > 0 && (
                <div className="mt-2.5">
                  <p className={cn('text-xs mb-1.5', config.text)}>
                    {relatedEvents.length} related deviation event
                    {relatedEvents.length > 1 ? 's' : ''}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {relatedEvents.slice(0, 5).map((e, i) => (
                      <span
                        key={`${e.provider}-${e.symbol}-${e.hour}-${i}`}
                        className={cn(
                          'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border',
                          config.bg,
                          config.border,
                          config.text
                        )}
                      >
                        {providerNames[e.provider] ?? e.provider} · {e.symbol}{' '}
                        {e.deviationPct > 0 ? '+' : ''}
                        {e.deviationPct.toFixed(2)}%
                      </span>
                    ))}
                    {relatedEvents.length > 5 && (
                      <span className={cn('text-[10px]', config.text)}>
                        +{relatedEvents.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function UnifiedRiskPanelInsight({ report }: { report: DailyReportData }) {
  const { riskImpacts, stablecoinDepeg, wrappedAssetPeg } = report;
  if (riskImpacts.length === 0 && stablecoinDepeg.length === 0 && wrappedAssetPeg.length === 0) {
    return <PanelInsight tone="good">No material user-facing risks identified today.</PanelInsight>;
  }

  const critical = riskImpacts.filter((i) => i.severity === 'critical').length;
  const high = riskImpacts.filter((i) => i.severity === 'high').length;
  const pegCount = stablecoinDepeg.length + wrappedAssetPeg.length;

  if (critical > 0) {
    return (
      <PanelInsight tone="bad">
        {critical} critical risk impact(s) detected. Review affected protocols and consider
        protective action for exposed positions.
      </PanelInsight>
    );
  }

  if (high > 0) {
    return (
      <PanelInsight tone="warning">
        {high} high-severity risk impact(s) detected. Review affected protocols and consider
        protective action for exposed positions.
      </PanelInsight>
    );
  }

  if (pegCount > 0) {
    const top = [...stablecoinDepeg, ...wrappedAssetPeg].sort(
      (a, b) => b.maxDeviationPercent - a.maxDeviationPercent
    )[0];
    return (
      <PanelInsight tone="warning">
        Peg tracking flagged {pegCount} asset(s). Largest signal: {top.symbol} at{' '}
        {top.maxDeviationPercent.toFixed(2)}% ({top.riskLevel} level).
      </PanelInsight>
    );
  }

  return (
    <PanelInsight tone="neutral">
      {riskImpacts.length} lower-severity risk impact(s) recorded. Continue tracking.
    </PanelInsight>
  );
}
