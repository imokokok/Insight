'use client';

import { useMemo } from 'react';

import { CheckCircle2, Info } from 'lucide-react';

import { chainNames } from '@/lib/constants';
import {
  type DailyReportData,
  type ProtocolLiquidationRisk,
  type ProtocolLiquidationScenario,
} from '@/lib/reports/reportService';
import { cn } from '@/lib/utils';
import type { Blockchain } from '@/types/oracle';

import { PanelInsight } from './ReportShared';

export function HealthScoreGauge({ report }: { report: DailyReportData }) {
  const { metrics } = report;
  const score = useMemo(() => {
    const successScore = metrics.overallSuccessRate;
    const deviationScore = Math.max(0, 100 - (metrics.avgDeviationPct / 0.5) * 100);
    const anomalyScore =
      metrics.totalSnapshots > 0
        ? Math.max(0, 100 - (metrics.totalAnomalies / metrics.totalSnapshots) * 500)
        : 100;
    return Math.round(successScore * 0.5 + deviationScore * 0.3 + anomalyScore * 0.2);
  }, [metrics]);

  const config =
    score >= 95
      ? { label: 'Healthy', color: 'text-emerald-600', bg: 'bg-emerald-500' }
      : score >= 85
        ? { label: 'Good', color: 'text-emerald-600', bg: 'bg-emerald-500' }
        : score >= 70
          ? { label: 'Fair', color: 'text-amber-600', bg: 'bg-amber-500' }
          : { label: 'At Risk', color: 'text-red-600', bg: 'bg-red-500' };

  const circumference = 2 * Math.PI * 36;
  const offset = circumference * (1 - score / 100);

  return (
    <div className="flex items-center gap-5">
      <div className="relative w-24 h-24 flex-shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" className="fill-none stroke-gray-100" strokeWidth="8" />
          <circle
            cx="40"
            cy="40"
            r="36"
            className={cn('fill-none transition-all duration-500', config.bg)}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('text-xl font-bold font-tabular', config.color)}>{score}</span>
          <span className="text-[10px] text-gray-500 uppercase tracking-wider">Health</span>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-semibold', config.color)}>{config.label}</p>
        <p className="text-xs text-gray-500 mt-1 leading-relaxed">
          Composite score based on {metrics.overallSuccessRate.toFixed(1)}% success rate,{' '}
          {metrics.avgDeviationPct.toFixed(3)}% avg deviation, and {metrics.totalAnomalies}{' '}
          anomalies.
        </p>
      </div>
    </div>
  );
}

export function OracleHealthSummary({ report }: { report: DailyReportData }) {
  const { metrics, anomalySummary } = report;

  const summary = useMemo(() => {
    const topProviderEntry = Object.entries(anomalySummary.byProvider).sort(
      (a, b) => b[1] - a[1]
    )[0];
    const topProvider = topProviderEntry?.[0];
    const topProviderCount = topProviderEntry?.[1] ?? 0;

    const topAssetEntry = Object.entries(anomalySummary.byAsset).sort((a, b) => b[1] - a[1])[0];
    const topAsset = topAssetEntry?.[0];

    if (metrics.criticalEvents > 0) {
      const providerPhrase = topProvider ? ` ${topProvider} contributed the most` : '';
      const assetPhrase = topAsset ? `, mainly on ${topAsset}` : '';
      return `Detected ${metrics.criticalEvents} critical oracle event${metrics.criticalEvents > 1 ? 's' : ''} today.${providerPhrase}${assetPhrase}. Positions relying on these price sources face elevated liquidation uncertainty.`;
    }

    if (metrics.highEvents > 0) {
      return `Detected ${metrics.highEvents} high-risk oracle event${metrics.highEvents > 1 ? 's' : ''} today${topProvider ? `, with ${topProvider} showing the most anomalies` : ''}. Review if your collateral or borrow assets are affected.`;
    }

    if (metrics.totalAnomalies > 0 && topProviderCount > 0) {
      return `${metrics.totalAnomalies} minor oracle anomaly${metrics.totalAnomalies > 1 ? 'ies' : 'y'} today${topProvider ? `, mostly from ${topProvider}` : ''}. Overall network health remains acceptable.`;
    }

    if (metrics.avgDeviationPct > 0.5) {
      return `Average cross-provider deviation reached ${metrics.avgDeviationPct.toFixed(3)}% today. If your position uses a single oracle source, actual liquidation prices may differ from estimates.`;
    }

    return `Oracle network is healthy today. No material delays, outages, or consensus deviations that would meaningfully affect liquidation risk.`;
  }, [metrics, anomalySummary]);

  const tone =
    metrics.criticalEvents === 0 && metrics.highEvents === 0 && metrics.totalAnomalies === 0
      ? 'good'
      : 'warning';

  return <PanelInsight tone={tone}>{summary}</PanelInsight>;
}

export function NetworkHealthInsight({ report }: { report: DailyReportData }) {
  const { metrics } = report;
  const score = useMemo(() => {
    const successScore = metrics.overallSuccessRate;
    const deviationScore = Math.max(0, 100 - (metrics.avgDeviationPct / 0.5) * 100);
    const anomalyScore =
      metrics.totalSnapshots > 0
        ? Math.max(0, 100 - (metrics.totalAnomalies / metrics.totalSnapshots) * 500)
        : 100;
    return Math.round(successScore * 0.5 + deviationScore * 0.3 + anomalyScore * 0.2);
  }, [metrics]);

  if (score >= 95) {
    return <PanelInsight tone="good">Network health is excellent today.</PanelInsight>;
  }
  if (score >= 85) {
    return (
      <PanelInsight tone="neutral">Network health is good. Continue normal tracking.</PanelInsight>
    );
  }
  if (score >= 70) {
    return (
      <PanelInsight tone="warning">
        Network health is fair; review the flagged risks and deviation events below.
      </PanelInsight>
    );
  }
  return (
    <PanelInsight tone="bad">
      Network health is at risk; prioritize critical events and worst-performing providers.
    </PanelInsight>
  );
}

export function ProtocolLiquidationRiskPanel({ risks }: { risks: ProtocolLiquidationRisk[] }) {
  if (risks.length === 0) {
    return (
      <div className="flex items-start gap-3 text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-lg p-4">
        <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium">No liquidation stress-test data</p>
          <p className="text-xs text-emerald-600/80 mt-0.5">
            No integrated lending protocols could be stress-tested for this report period.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 leading-relaxed">
        Representative positions across integrated lending protocols are stress-tested at 1%, 3%,
        and 5% oracle deviation. Joint-deviation scenarios (all collaterals drop and all borrows
        rise together) are the primary risk indicator; single-asset drops are shown for reference.
      </p>
      <div className="space-y-3">
        {risks.slice(0, 6).map((risk) => (
          <ProtocolLiquidationRiskCard key={risk.protocolId} risk={risk} />
        ))}
      </div>
    </div>
  );
}

export function ProtocolLiquidationRiskPanelInsight({
  risks,
}: {
  risks: ProtocolLiquidationRisk[];
}) {
  if (risks.length === 0) {
    return null;
  }

  const riskiest = risks[0];
  const liquidatedScenario = riskiest.scenarios.find((s) => s.isJoint && s.status === 'liquidated');
  const worstWarningScenario = riskiest.scenarios
    .filter((s) => s.isJoint && (s.status === 'warning' || s.status === 'critical'))
    .sort((a, b) => a.healthFactor - b.healthFactor)[0];

  if (liquidatedScenario) {
    return (
      <PanelInsight tone="warning">
        {riskiest.protocolName} ({riskiest.chain}) is most leveraged-sensitive: a{' '}
        {liquidatedScenario.label} joint deviation would liquidate the benchmark position. Consider
        widening Health Factor or reducing borrow exposure.
      </PanelInsight>
    );
  }

  if (worstWarningScenario) {
    return (
      <PanelInsight tone="warning">
        {riskiest.protocolName} ({riskiest.chain}) has the smallest buffer. Under a{' '}
        {worstWarningScenario.label} joint deviation, Health Factor drops to{' '}
        {worstWarningScenario.healthFactor.toFixed(2)}.
      </PanelInsight>
    );
  }

  return (
    <PanelInsight tone="good">
      All tracked protocols maintain safe buffers under the tested joint-deviation scenarios.
    </PanelInsight>
  );
}

function ProtocolLiquidationRiskCard({ risk }: { risk: ProtocolLiquidationRisk }) {
  const jointScenarios = risk.scenarios
    .filter((s) => s.isJoint)
    .sort((a, b) => a.deviationPercent - b.deviationPercent);
  const singleScenarios = risk.scenarios
    .filter((s) => !s.isJoint)
    .sort((a, b) => a.deviationPercent - b.deviationPercent);

  const hfColor =
    risk.currentHealthFactor < 1
      ? 'text-gray-500'
      : risk.currentHealthFactor < 1.05
        ? 'text-red-600'
        : risk.currentHealthFactor < 1.2
          ? 'text-amber-600'
          : 'text-emerald-600';

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">{risk.protocolName}</h3>
            <span className="text-xs text-gray-500">
              {chainNames[risk.chain as Blockchain] ?? risk.chain}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            {risk.collaterals.map((c) => `${c.amount} ${c.symbol}`).join(' + ')} collateral /{' '}
            {risk.borrows.map((b) => `${b.amount} ${b.symbol}`).join(' + ')} debt
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Current HF</p>
          <p className={cn('text-sm font-semibold font-mono', hfColor)}>
            {risk.currentHealthFactor.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <ScenarioTable title="Joint deviation" scenarios={jointScenarios} variant="primary" />
        <ScenarioTable title="Single-asset drop" scenarios={singleScenarios} variant="secondary" />
      </div>

      <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
        <Info className="w-3.5 h-3.5 flex-shrink-0" />
        Joint liquidation threshold: {Math.abs(risk.jointCriticalDeviationPercent).toFixed(2)}%
        major-equiv
        {risk.worstSingleAssetDeviation && (
          <span className="hidden sm:inline">
            {' '}
            · Worst single-asset move: {risk.worstSingleAssetDeviation.symbol}{' '}
            {risk.worstSingleAssetDeviation.direction === 'down' ? '↓' : '↑'}
            {Math.abs(risk.worstSingleAssetDeviation.criticalDeviationPercent).toFixed(2)}%
          </span>
        )}
      </div>
    </div>
  );
}

function ScenarioStatusBadge({ status }: { status: ProtocolLiquidationScenario['status'] }) {
  const config = {
    safe: { label: 'Safe', bg: 'bg-emerald-100', text: 'text-emerald-700' },
    warning: { label: 'Warning', bg: 'bg-amber-100', text: 'text-amber-700' },
    critical: { label: 'Critical', bg: 'bg-red-100', text: 'text-red-700' },
    liquidated: { label: 'Liquidated', bg: 'bg-gray-800', text: 'text-white' },
  }[status];

  return (
    <span
      className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', config.bg, config.text)}
    >
      {config.label}
    </span>
  );
}

function ScenarioTable({
  title,
  scenarios,
  variant,
}: {
  title: string;
  scenarios: ProtocolLiquidationScenario[];
  variant: 'primary' | 'secondary';
}) {
  if (scenarios.length === 0) return null;
  const isPrimary = variant === 'primary';

  return (
    <div
      className={cn(
        'rounded-lg p-3',
        isPrimary ? 'bg-primary-50/50 border border-primary-100' : 'bg-gray-50'
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <h4
          className={cn('text-xs font-semibold', isPrimary ? 'text-primary-900' : 'text-gray-500')}
        >
          {title}
        </h4>
        {isPrimary && (
          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary-100 text-primary-700">
            Primary
          </span>
        )}
      </div>
      <div className="space-y-2">
        {scenarios.map((s) => (
          <div key={s.label} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900 w-16">{s.label}</span>
              <ScenarioStatusBadge status={s.status} />
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              <span>
                HF <span className="font-mono text-gray-900">{s.healthFactor.toFixed(2)}</span>
              </span>
              {s.status !== 'safe' && (
                <span>
                  Buffer{' '}
                  <span className="font-mono text-gray-900">
                    {s.distanceToLiquidationPercent.toFixed(2)}%
                  </span>
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
