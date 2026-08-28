'use client';

import { Activity, AlertTriangle, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';

import type {
  LendingSafetyAction,
  ProtocolSafetyContext,
} from '@/lib/api/services/preTradeSafetyService';

export const ACTION_SEVERITY_STYLE: Record<LendingSafetyAction['severity'], string> = {
  info: 'bg-blue-100 text-blue-700',
  caution: 'bg-amber-100 text-amber-700',
  danger: 'bg-orange-100 text-orange-700',
  block: 'bg-red-100 text-red-700',
};

type PreTradeVerdict = 'PASS' | 'CAUTION' | 'DANGER' | 'BLOCK';

const VERDICT_STYLE: Record<PreTradeVerdict, { label: string; cls: string; summary: string }> = {
  PASS: {
    label: 'PASS',
    cls: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
    summary: 'Oracle data healthy — safe to proceed.',
  },
  CAUTION: {
    label: 'CAUTION',
    cls: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
    summary: 'Minor risk signals — consider reducing size.',
  },
  DANGER: {
    label: 'DANGER',
    cls: 'bg-orange-100 text-orange-700 ring-1 ring-orange-200',
    summary: 'Significant oracle risk — do not act without review.',
  },
  BLOCK: {
    label: 'BLOCK',
    cls: 'bg-red-100 text-red-700 ring-1 ring-red-200',
    summary: 'Critical risk — do not act. Oracle may be manipulated.',
  },
};

/** Risk-score color helper shared by the forward-looking ML risk lines. */
function riskColor(score: number): string {
  if (score >= 0.5) return 'text-red-600';
  if (score >= 0.3) return 'text-amber-600';
  return 'text-emerald-600';
}

/**
 * Lending-path decision panel: renders how much of the protocol's max-LTV
 * liquidation buffer the current cross-oracle dispersion consumes, plus the
 * concrete actions (freeze / wait / add collateral) recommended by the
 * deterministic rule engine, plus the live pre-trade verdict and the
 * forward-looking ML manipulation risk. Renders nothing when the check carried
 * no protocol context (e.g. swap actions).
 *
 * Shared between the pre-trade demo on the /ai page and the live
 * /safety-check position page (where it answers "is it safe to open or
 * increase this borrow right now?").
 */
export function LendingSafetyPanel({
  protocolSafety,
  actions,
  verdict,
  maxDeviationPct,
  crossProviderAgreement,
  participantCount,
  manipulationRiskScore,
  mlScore1h,
  mlScore6h,
  anomalyScore,
}: {
  protocolSafety: ProtocolSafetyContext | null;
  actions: LendingSafetyAction[];
  /** Pre-trade verdict summarizing all oracle signals into one decision. */
  verdict?: PreTradeVerdict;
  /** Live max |deviation from consensus| for the checked asset. */
  maxDeviationPct?: number;
  /** Share of providers agreeing on the consensus price (0..1). */
  crossProviderAgreement?: number;
  participantCount?: number;
  /** Effective manipulation-risk score [0,1] (ML-assisted when a model is active). */
  manipulationRiskScore?: number;
  /** Predictive ML risk, near-term 1h horizon (null when the model is inactive). */
  mlScore1h?: number | null;
  /** Predictive ML risk, strategic 6h horizon (null when the model is inactive). */
  mlScore6h?: number | null;
  /** Model-free 24h baseline anomaly score [0,1]. */
  anomalyScore?: number;
}) {
  // Render when there is a lending context to show OR a live pre-trade verdict
  // (the verdict carries the decision even when the protocol has no buffer
  // context, e.g. an unrecognized protocol still gets a consensus/ML verdict).
  if (!protocolSafety && actions.length === 0 && !verdict) return null;

  const frozen = actions.some((a) => a.type === 'freeze_borrow');
  const bufferPct = protocolSafety?.bufferConsumedPct ?? 0;
  // Visual level matches the backend verdict thresholds so the badge the user
  // sees is the same one the rule engine produced — and crucially, the SAFE
  // state is rendered as a clear "checked and safe" badge, not silence.
  type Level = 'safe' | 'caution' | 'danger' | 'frozen';
  const level: Level = frozen
    ? 'frozen'
    : bufferPct >= 80
      ? 'danger'
      : bufferPct >= 50
        ? 'caution'
        : 'safe';

  const levelConfig = {
    safe: {
      label: '✓ SAFE TO BORROW',
      cls: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
      iconColor: 'text-emerald-600',
      Icon: ShieldCheck,
    },
    caution: {
      label: 'CAUTION',
      cls: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
      iconColor: 'text-amber-600',
      Icon: AlertTriangle,
    },
    danger: {
      label: 'DANGER',
      cls: 'bg-orange-100 text-orange-700 ring-1 ring-orange-200',
      iconColor: 'text-orange-600',
      Icon: ShieldAlert,
    },
    frozen: {
      label: '✕ FROZEN',
      cls: 'bg-red-100 text-red-700 ring-1 ring-red-200',
      iconColor: 'text-red-600',
      Icon: ShieldX,
    },
  }[level];

  return (
    <div
      className={`rounded-2xl border p-5 ${
        frozen ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'
      }`}
    >
      <div className="flex items-center gap-2 mb-3">
        <levelConfig.Icon className={`w-5 h-5 ${levelConfig.iconColor}`} />
        <h4 className="text-sm font-semibold text-slate-900">
          {protocolSafety
            ? `Lending Safety · ${protocolSafety.protocolName}`
            : 'Pre-Trade Safety Check'}
        </h4>
        {protocolSafety && (
          <span
            className={`ml-auto px-2.5 py-0.5 text-[10px] font-bold uppercase rounded-full tracking-wide ${levelConfig.cls}`}
          >
            {levelConfig.label}
          </span>
        )}
      </div>

      {verdict && (
        <div className="mb-3 flex items-start gap-2.5 rounded-xl bg-slate-50 border border-slate-200 p-3">
          <span
            className={`shrink-0 px-2 py-0.5 text-[10px] font-bold uppercase rounded-md tracking-wide ${VERDICT_STYLE[verdict].cls}`}
          >
            Pre-Trade {VERDICT_STYLE[verdict].label}
          </span>
          <div className="min-w-0">
            <p className="text-xs text-slate-700">{VERDICT_STYLE[verdict].summary}</p>
            {(maxDeviationPct !== undefined ||
              crossProviderAgreement !== undefined ||
              participantCount !== undefined) && (
              <p className="mt-1 text-[11px] font-mono text-slate-500">
                {maxDeviationPct !== undefined && (
                  <span
                    className={
                      Math.abs(maxDeviationPct) >= 3 ? 'text-red-600 font-semibold' : undefined
                    }
                  >
                    dev {maxDeviationPct.toFixed(2)}%
                  </span>
                )}
                {maxDeviationPct !== undefined && crossProviderAgreement !== undefined && ' · '}
                {crossProviderAgreement !== undefined && (
                  <span
                    className={
                      crossProviderAgreement < 0.85 ? 'text-red-600 font-semibold' : undefined
                    }
                  >
                    agreement {(crossProviderAgreement * 100).toFixed(0)}%
                  </span>
                )}
                {participantCount !== undefined && <span> · {participantCount} providers</span>}
              </p>
            )}
          </div>
        </div>
      )}

      {protocolSafety && <BufferConsumptionBar safety={protocolSafety} />}

      {(mlScore1h !== null || mlScore6h !== null || anomalyScore !== undefined) && (
        <div className="mt-3 rounded-xl bg-slate-50 border border-slate-200 p-3">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Activity className="w-3 h-3" />
            Forward-looking oracle risk
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
            {(mlScore1h !== null || mlScore6h !== null) && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">ML 1h / 6h</span>
                <span
                  className={`font-mono font-semibold ${riskColor(
                    Math.max(mlScore1h ?? 0, mlScore6h ?? 0)
                  )}`}
                >
                  {mlScore1h?.toFixed(2) ?? '—'} / {mlScore6h?.toFixed(2) ?? '—'}
                </span>
              </div>
            )}
            {anomalyScore !== undefined && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Anomaly (24h)</span>
                <span className={`font-mono font-semibold ${riskColor(anomalyScore)}`}>
                  {anomalyScore.toFixed(2)}
                </span>
              </div>
            )}
          </div>
          {manipulationRiskScore !== undefined && (
            <p className="mt-1.5 text-[11px] text-slate-500">
              Manipulation risk{' '}
              <span className={`font-mono font-semibold ${riskColor(manipulationRiskScore)}`}>
                {manipulationRiskScore.toFixed(2)}
              </span>
            </p>
          )}
        </div>
      )}

      {actions.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Recommended actions
          </p>
          {actions.map((action, i) => (
            <LendingActionRow key={`${action.type}-${i}`} action={action} />
          ))}
        </div>
      )}
    </div>
  );
}

export function BufferConsumptionBar({ safety }: { safety: ProtocolSafetyContext }) {
  const pct = Math.min(100, Math.max(0, safety.bufferConsumedPct));
  const barColor =
    pct >= 95
      ? 'bg-red-600'
      : pct >= 80
        ? 'bg-orange-500'
        : pct >= 50
          ? 'bg-amber-500'
          : 'bg-emerald-500';

  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1.5 gap-3">
        <span className="text-slate-600">
          Oracle dispersion consumes{' '}
          <span className="font-mono font-semibold text-slate-900">{pct.toFixed(1)}%</span> of{' '}
          {safety.protocolName}&apos;s max-LTV liquidation buffer
        </span>
        <span className="font-mono text-slate-400 shrink-0">
          critical {safety.criticalDeviationPct.toFixed(2)}%
        </span>
      </div>
      <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">
        Liquidation triggers when collateral drops {safety.criticalDeviationPct.toFixed(2)}% — the
        current cross-oracle deviation already covers {pct.toFixed(1)}% of that distance.
      </p>
    </div>
  );
}

function LendingActionRow({ action }: { action: LendingSafetyAction }) {
  return (
    <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-100">
      <span
        className={`shrink-0 mt-0.5 px-1.5 py-0.5 text-[10px] font-bold uppercase rounded ${ACTION_SEVERITY_STYLE[action.severity]}`}
      >
        {action.severity}
      </span>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-800">{action.title}</p>
        <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{action.detail}</p>
        {(action.targetDeviationPct !== undefined || action.targetBufferPct !== undefined) && (
          <p className="text-[10px] font-mono text-slate-400 mt-1">
            {action.targetDeviationPct !== undefined &&
              `target deviation < ${action.targetDeviationPct.toFixed(2)}%`}
            {action.targetDeviationPct !== undefined && action.targetBufferPct !== undefined
              ? ' · '
              : ''}
            {action.targetBufferPct !== undefined &&
              `buffer ≤ ${action.targetBufferPct.toFixed(0)}%`}
          </p>
        )}
      </div>
    </div>
  );
}
