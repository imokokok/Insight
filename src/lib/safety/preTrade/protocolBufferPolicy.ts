import { roundTo } from '@/lib/utils/format';

import type {
  ContributingFactor,
  LendingSafetyAction,
  ProtocolSafetyContext,
  TradeAction,
} from './contracts';
import type { RuleVerdict } from './verdictPolicy';

export const PROTOCOL_BUFFER_THRESHOLDS = { caution: 50, danger: 80 } as const;
export const LENDING_FREEZE_BUFFER_PCT = 95;
export const LENDING_FREEZE_ZSCORE_MIN = 1.0;
const LENDING_ACTIONS: readonly TradeAction[] = ['borrow'];

/** The temporal fields used by the policy, kept transport-independent. */
export interface ProtocolBufferHistory {
  maxDeviationZscore24h: number;
  deviationVelocity3h: number;
}

export interface ProtocolBufferRuleResult {
  verdict: RuleVerdict | null;
  factors: ContributingFactor[];
  warnings: string[];
  actions: LendingSafetyAction[];
}

function buildLendingActions(args: {
  protocolSafety: ProtocolSafetyContext;
  maxDeviationPct: number;
  frozen: boolean;
}): LendingSafetyAction[] {
  const { protocolSafety, maxDeviationPct, frozen } = args;
  const { bufferConsumedPct, criticalDeviationPct, protocolName } = protocolSafety;
  const targetDeviationPct = roundTo(
    criticalDeviationPct * (PROTOCOL_BUFFER_THRESHOLDS.caution / 100),
    2
  );
  const actions: LendingSafetyAction[] = [];
  if (frozen) {
    actions.push({
      type: 'freeze_borrow',
      severity: 'block',
      title: 'New borrowing is frozen',
      detail: `Cross-oracle dispersion currently consumes ${bufferConsumedPct.toFixed(0)}% of ${protocolName}'s max-LTV liquidation buffer. Borrowing now risks forced liquidation on a single provider tick. Wait for oracle consensus to converge.`,
    });
  }
  if (frozen || bufferConsumedPct >= PROTOCOL_BUFFER_THRESHOLDS.danger) {
    actions.push({
      type: 'wait_convergence',
      severity: frozen ? 'danger' : 'caution',
      title: 'Wait for oracle consensus to converge',
      detail: `Do not borrow until cross-oracle deviation falls to ≤ ${targetDeviationPct}% (currently ${maxDeviationPct.toFixed(2)}%). This re-widens the liquidation buffer before you take on debt.`,
      targetDeviationPct,
    });
  }
  if (bufferConsumedPct >= PROTOCOL_BUFFER_THRESHOLDS.caution) {
    actions.push({
      type: 'add_collateral',
      severity: bufferConsumedPct >= PROTOCOL_BUFFER_THRESHOLDS.danger ? 'danger' : 'caution',
      title: 'Add collateral or borrow less',
      detail: `Oracle dispersion already consumes ${bufferConsumedPct.toFixed(0)}% of the liquidation buffer. Add collateral to re-widen it, or keep the new borrow small.`,
      targetBufferPct: PROTOCOL_BUFFER_THRESHOLDS.caution,
    });
  }
  return actions;
}

/** Apply lending-only oracle dispersion limits from max-LTV buffer consumption. */
export function evaluateProtocolBufferRule(args: {
  protocolSafety: ProtocolSafetyContext | null;
  action: TradeAction;
  asset: string;
  maxDeviationPct: number;
  historicalState: ProtocolBufferHistory;
}): ProtocolBufferRuleResult {
  const empty: ProtocolBufferRuleResult = { verdict: null, factors: [], warnings: [], actions: [] };
  if (!args.protocolSafety || !LENDING_ACTIONS.includes(args.action)) return empty;
  const ps = args.protocolSafety;
  const bufferConsumedPct = ps.bufferConsumedPct;
  const result: ProtocolBufferRuleResult = { ...empty };
  const verdict =
    bufferConsumedPct >= PROTOCOL_BUFFER_THRESHOLDS.danger
      ? 'DANGER'
      : bufferConsumedPct >= PROTOCOL_BUFFER_THRESHOLDS.caution
        ? 'CAUTION'
        : null;
  if (verdict) {
    result.verdict = verdict;
    result.factors.push({
      rule: 'protocol_buffer_consumed',
      value: bufferConsumedPct,
      threshold: PROTOCOL_BUFFER_THRESHOLDS[verdict.toLowerCase() as 'caution' | 'danger'],
      triggeredVerdict: verdict,
      message: `Current oracle deviation consumes ${bufferConsumedPct.toFixed(1)}% of ${ps.protocolName}'s max-LTV safety buffer (critical deviation ${ps.criticalDeviationPct.toFixed(2)}%) for ${args.asset}.`,
    });
    result.warnings.push(
      `Oracle deviation vs ${ps.protocolName} liquidation buffer: ${bufferConsumedPct.toFixed(0)}% consumed.`
    );
  }
  const frozen =
    bufferConsumedPct >= LENDING_FREEZE_BUFFER_PCT &&
    (args.historicalState.maxDeviationZscore24h >= LENDING_FREEZE_ZSCORE_MIN ||
      args.historicalState.deviationVelocity3h > 0);
  if (frozen) {
    result.verdict = 'BLOCK';
    result.factors.push({
      rule: 'protocol_buffer_frozen',
      value: bufferConsumedPct,
      threshold: LENDING_FREEZE_BUFFER_PCT,
      triggeredVerdict: 'BLOCK',
      message: `Borrow frozen: cross-oracle dispersion consumes ${bufferConsumedPct.toFixed(1)}% of ${ps.protocolName}'s max-LTV safety buffer and is sustained (z=${args.historicalState.maxDeviationZscore24h.toFixed(2)}, v3h=${args.historicalState.deviationVelocity3h.toFixed(2)}).`,
    });
    result.warnings.push(
      `Borrowing frozen: oracle dispersion consumes ${bufferConsumedPct.toFixed(0)}% of ${ps.protocolName}'s liquidation buffer and is not converging.`
    );
  }
  result.actions = buildLendingActions({
    protocolSafety: ps,
    maxDeviationPct: args.maxDeviationPct,
    frozen,
  });
  return result;
}
