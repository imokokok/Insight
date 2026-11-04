/**
 * Execution preflight — the chain-neutral decision layer.
 *
 * `preTradeSafetyCheck` remains the source of truth for oracle safety. This
 * module gives agents one stable decision contract above that low-level
 * assessment: may this action proceed with the evidence supplied right now?
 *
 * A result is deliberately narrow. It says whether the *data inputs* are
 * sufficient for the declared action; it never certifies contract safety,
 * custody, profitability, or transaction execution.
 */

import {
  preTradeSafetyCheck,
  type PreTradeSafetyInput,
  type PreTradeSafetyResult,
} from '@/lib/api/services/preTradeSafetyService';
import { getBlockchainByChainId } from '@/lib/oracles/constants/chainMapping';
import { OracleProvider } from '@/types/oracle';

export type ExecutionPreflightVerdict = 'allow' | 'caution' | 'block';
export type ExecutionPreflightGateStatus = 'passed' | 'caution' | 'failed' | 'not_assessed';

export type ExecutionPreflightRequest = PreTradeSafetyInput;

export interface ExecutionPreflightResult {
  /**
   * Final gate for the declared action. `allow` requires a passing oracle
   * safety verdict AND a caller-provided venue quote that passed assessment.
   * No quote means the result can never be stronger than `caution`.
   */
  verdict: ExecutionPreflightVerdict;
  recommendation: 'proceed' | 'review_before_execution' | 'do_not_execute';
  action: PreTradeSafetyInput['action'];
  asset: string;
  destinationAsset: string | null;
  chain: {
    id: number;
    name: string | null;
    profile: 'monad_pyth' | 'generic' | 'chain_agnostic';
  };
  gates: {
    /** Existing multi-source oracle safety decision, never weakened here. */
    oracleSafety: {
      status: ExecutionPreflightGateStatus;
      verdict: PreTradeSafetyResult['verdict'];
      participantCount: number;
      crossProviderAgreement: number;
      staleDataRisk: boolean;
    };
    /**
     * Venue/route quote evidence. It becomes a hard preflight gate only when
     * a caller asks Insight to assess it by supplying decisionInput.
     */
    venueQuote: {
      status: ExecutionPreflightGateStatus;
      requested: boolean;
      eligibleToProceed: boolean | null;
    };
    /** Monad-specific signal is surfaced as evidence, not a substitute for quorum. */
    nativeOracle: {
      provider: OracleProvider.PYTH | null;
      status: ExecutionPreflightGateStatus;
      source: string | null;
      dataAgeSeconds: number | null;
      onChainVerified: boolean;
    };
  };
  reasons: string[];
  requiredBeforeAllow: string[];
  /** The detailed, backward-compatible oracle assessment and its attestation. */
  assessment: PreTradeSafetyResult;
  evaluatedAt: string;
}

function oracleGateStatus(verdict: PreTradeSafetyResult['verdict']): ExecutionPreflightGateStatus {
  if (verdict === 'PASS') return 'passed';
  if (verdict === 'CAUTION') return 'caution';
  return 'failed';
}

function nativeOracleGate(
  result: PreTradeSafetyResult,
  chainId: number
): ExecutionPreflightResult['gates']['nativeOracle'] {
  if (chainId !== 143) {
    return {
      provider: null,
      status: 'not_assessed' as const,
      source: null,
      dataAgeSeconds: null,
      onChainVerified: false,
    };
  }

  const pyth = result.providerPrices[OracleProvider.PYTH];
  if (!pyth || pyth.status !== 'success') {
    return {
      provider: OracleProvider.PYTH,
      status: 'failed' as const,
      source: pyth?.source ?? null,
      dataAgeSeconds: pyth?.dataAgeSeconds ?? null,
      onChainVerified: false,
    };
  }

  return {
    provider: OracleProvider.PYTH,
    status: pyth.isStale ? ('caution' as const) : ('passed' as const),
    source: pyth.source ?? null,
    dataAgeSeconds: pyth.dataAgeSeconds,
    onChainVerified: true,
  };
}

/**
 * Compose a machine-actionable decision without changing the established
 * pre-trade rule engine. This is intentionally fail-closed:
 *
 * - DANGER/BLOCK oracle assessments always block.
 * - A missing venue quote cannot become ALLOW.
 * - A supplied quote which fails its own input-sufficiency check blocks.
 */
export function composeExecutionPreflight(
  input: ExecutionPreflightRequest,
  assessment: PreTradeSafetyResult
): ExecutionPreflightResult {
  const oracleStatus = oracleGateStatus(assessment.verdict);
  const quote = assessment.decisionInputAssessment;
  const venueQuote = {
    requested: input.decisionInput !== undefined,
    eligibleToProceed: quote?.eligibleToProceed ?? null,
    status:
      input.decisionInput === undefined
        ? ('not_assessed' as const)
        : quote?.eligibleToProceed
          ? ('passed' as const)
          : ('failed' as const),
  };
  const nativeOracle = nativeOracleGate(assessment, input.chainId);

  const reasons = [...assessment.warnings];
  const requiredBeforeAllow: string[] = [];
  let verdict: ExecutionPreflightVerdict;

  if (oracleStatus === 'failed') {
    verdict = 'block';
    reasons.unshift(`Oracle safety verdict is ${assessment.verdict}.`);
  } else if (venueQuote.status === 'failed') {
    verdict = 'block';
    reasons.unshift('The supplied venue quote did not meet the declared decision-input policy.');
  } else if (oracleStatus === 'caution') {
    verdict = 'caution';
    reasons.unshift('Oracle safety requires review before execution.');
  } else if (venueQuote.status !== 'passed') {
    verdict = 'caution';
    requiredBeforeAllow.push(
      'Supply a fresh venue quote, timestamp, and explicit tolerance policy for decision-input assessment.'
    );
    reasons.unshift(
      'Oracle inputs passed, but no verified venue quote was supplied for this action.'
    );
  } else {
    verdict = 'allow';
    reasons.unshift(
      'Oracle inputs and the supplied venue quote satisfy the declared preflight policy.'
    );
  }

  if (nativeOracle.status === 'failed') {
    // The Monad profile promises Pyth Core evidence. Other chain profiles do
    // not have this gate. Do not relabel an independently healthy generic
    // assessment as an allow when the profile's native observation is absent.
    if (input.chainId === 143 && verdict === 'allow') {
      verdict = 'caution';
      reasons.unshift('Monad Pyth Core evidence is unavailable for this preflight.');
    }
    requiredBeforeAllow.push('Restore a fresh, readable Monad Pyth Core observation.');
  } else if (nativeOracle.status === 'caution') {
    if (input.chainId === 143 && verdict === 'allow') {
      verdict = 'caution';
      reasons.unshift('Monad Pyth Core evidence is stale for this preflight.');
    }
    requiredBeforeAllow.push(
      'Wait for a fresh Monad Pyth Core update or obtain independent confirmation.'
    );
  }

  const blockchain = getBlockchainByChainId(input.chainId);
  return {
    verdict,
    recommendation:
      verdict === 'allow'
        ? 'proceed'
        : verdict === 'caution'
          ? 'review_before_execution'
          : 'do_not_execute',
    action: input.action,
    asset: input.asset.toUpperCase(),
    destinationAsset: input.destinationAsset?.toUpperCase() ?? null,
    chain: {
      id: input.chainId,
      name: blockchain ?? null,
      profile:
        input.chainId === 143 ? 'monad_pyth' : input.chainId > 0 ? 'generic' : 'chain_agnostic',
    },
    gates: {
      oracleSafety: {
        status: oracleStatus,
        verdict: assessment.verdict,
        participantCount: assessment.participantCount,
        crossProviderAgreement: assessment.crossProviderAgreement,
        staleDataRisk: assessment.staleDataRisk,
      },
      venueQuote,
      nativeOracle,
    },
    reasons: [...new Set(reasons)],
    requiredBeforeAllow: [...new Set(requiredBeforeAllow)],
    assessment,
    evaluatedAt: assessment.evaluatedAt,
  };
}

/** Run the existing safety engine and return the chain-neutral preflight contract. */
export async function assessExecutionPreflight(
  input: ExecutionPreflightRequest,
  options?: Parameters<typeof preTradeSafetyCheck>[1],
  deadlineOptions?: Parameters<typeof preTradeSafetyCheck>[2]
): Promise<ExecutionPreflightResult> {
  const safetyInput = {
    ...input,
    // v3 binds quorum + independence thresholds into any available attestation.
    // The preflight layer never downgrades a caller who explicitly requested a
    // different schema version.
    schemaVersion: input.schemaVersion ?? 3,
  };
  const assessment = deadlineOptions
    ? await preTradeSafetyCheck(safetyInput, options, deadlineOptions)
    : await preTradeSafetyCheck(safetyInput, options);
  return composeExecutionPreflight(input, assessment);
}
