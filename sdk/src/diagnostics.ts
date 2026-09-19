import { encodeAbiParameters, keccak256 } from 'viem';

import type {
  AssessmentDiagnostic,
  FreshnessCheck,
  FreshnessProfile,
  JointEvidenceError,
  PreTradeResult,
} from './types';

const RULES: Record<string, string> = {
  oracle_coverage: 'INSUFFICIENT_COVERAGE',
  quorum: 'INSUFFICIENT_COVERAGE',
  max_provider_deviation_pct: 'MAX_DEVIATION',
  cross_provider_spread_pct: 'CROSS_SPREAD',
  data_stale_seconds: 'STALE_DATA',
  cross_provider_agreement: 'LOW_AGREEMENT',
  stablecoin_depeg_pct: 'STABLECOIN_DEPEG',
  position_to_liquidity_ratio: 'POSITION_VS_LIQUIDITY',
  protocol_buffer_consumed: 'PROTOCOL_BUFFER',
  oracle_independence: 'INSUFFICIENT_INDEPENDENCE',
};
const MISSING = new Set(['INSUFFICIENT_COVERAGE', 'INSUFFICIENT_INDEPENDENCE']);
const MARKET = new Set(['MAX_DEVIATION', 'CROSS_SPREAD', 'LOW_AGREEMENT', 'STABLECOIN_DEPEG']);

/** A display projection; it never changes the API's verdict or establishes signer trust. */
export function diagnosePreTrade(
  result: PreTradeResult | null,
  side: 'source' | 'destination',
  error?: JointEvidenceError,
  freshness?: FreshnessCheck | null
): AssessmentDiagnostic[] {
  if (!result) {
    const budget =
      error?.code === 'INSUFFICIENT_CREDITS' ||
      error?.code === 'CREDIT_BALANCE_INSUFFICIENT' ||
      error?.code === 'PAYMENT_REQUIRED' ||
      error?.status === 402;
    return [
      {
        side,
        category: budget ? 'budget' : 'service',
        code: error?.code ?? 'ASSESSMENT_UNAVAILABLE',
        action: budget ? 'restore_budget' : 'retry',
        origin: 'service_error',
        message: error?.message,
      },
    ];
  }
  const explicit = Array.isArray(result.reasonCodes)
    ? result.reasonCodes.filter((v): v is string => typeof v === 'string')
    : null;
  const codes = [
    ...new Set(
      explicit ??
        result.contributingFactors.flatMap((f) =>
          typeof f.rule === 'string' && RULES[f.rule] ? [RULES[f.rule]] : []
        )
    ),
  ].sort();
  const hash = keccak256(encodeAbiParameters([{ type: 'string[]' }], [codes]));
  const bound =
    typeof result.attestation?.data.reasonCodesHash === 'string' &&
    hash.toLowerCase() === result.attestation.data.reasonCodesHash.toLowerCase();
  const diagnostics: AssessmentDiagnostic[] = codes.map((code) => ({
    side,
    category: MISSING.has(code)
      ? 'evidence_insufficient'
      : code === 'STALE_DATA'
        ? 'freshness'
        : MARKET.has(code)
          ? 'market_risk'
          : 'unknown',
    code,
    action: MISSING.has(code)
      ? 'check_configuration'
      : code === 'STALE_DATA'
        ? 'refresh'
        : 'review',
    origin: bound ? 'reason_codes_hash_bound' : 'response_metadata',
  }));
  if (result.attestation?.data.reasonCodesHash && !bound)
    diagnostics.push({
      side,
      category: 'binding',
      code: 'REASON_CODES_HASH_MISMATCH',
      action: 'review',
      origin: 'local_policy',
    });
  if (
    !result.attestation ||
    typeof result.attestation.signature !== 'string' ||
    !/^0x[0-9a-fA-F]+$/.test(result.attestation.signature)
  )
    diagnostics.push({
      side,
      category: 'evidence_insufficient',
      code: 'SIGNED_PROOF_UNAVAILABLE',
      action: 'retry',
      origin: 'response_metadata',
    });
  if (result.verdict !== 'PASS' && codes.length === 0)
    diagnostics.push({
      side,
      category: 'unknown',
      code: `UNEXPLAINED_${result.verdict}`,
      action: 'review',
      origin: 'response_metadata',
    });
  const scope = result.assessmentScope as
    | { unavailableDimensions?: { dimension: string; reason: string }[] }
    | undefined;
  for (const item of scope?.unavailableDimensions ?? [])
    diagnostics.push({
      side,
      category: 'scope_unavailable',
      code: `UNASSESSED_${item.dimension.toUpperCase()}`,
      message: item.reason,
      action: 'check_configuration',
      origin: 'response_metadata',
    });
  for (const code of freshness?.reasons ?? [])
    diagnostics.push({
      side,
      category: 'freshness',
      code,
      action: 'refresh',
      origin: 'local_policy',
    });
  return diagnostics;
}

export function validateFreshnessProfile(profile: FreshnessProfile): void {
  for (const [key, value] of Object.entries(profile)) {
    if (
      ![
        'maxSourceAgeSeconds',
        'maxAssessmentAgeSeconds',
        'minimumRemainingValiditySeconds',
      ].includes(key) ||
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      value < 0
    ) {
      throw new TypeError(`Freshness ${key} must be a non-negative finite number.`);
    }
  }
}

/** Ages advance from signed checkedAt; a fresh HTTP response cannot reset old source age. */
export function evaluateFreshness(
  result: PreTradeResult,
  profile: FreshnessProfile = {},
  nowSeconds = Math.floor(Date.now() / 1000)
): FreshnessCheck {
  validateFreshnessProfile(profile);
  if (!Number.isFinite(nowSeconds) || nowSeconds < 0)
    throw new TypeError('nowSeconds must be finite non-negative Unix seconds.');
  const data = result.attestation?.data;
  const finite = (v: unknown): number | null =>
    (typeof v === 'number' || (typeof v === 'string' && v.trim() !== '')) &&
    Number.isFinite(Number(v)) &&
    Number(v) >= 0
      ? Number(v)
      : null;
  const checkedAt = finite(data?.checkedAt);
  const validUntil = finite(data?.validUntil);
  const signedAge = finite(data?.maxDataAgeSeconds);
  const age = checkedAt == null ? null : nowSeconds - checkedAt;
  const sourceUnavailable =
    result.assessmentScope?.unavailableDimensions.some(
      (d) => d.dimension === 'source_freshness'
    ) === true;
  const sourceAge =
    signedAge == null || age == null || sourceUnavailable ? null : signedAge + Math.max(0, age);
  const remaining = validUntil == null ? null : validUntil - nowSeconds;
  const reasons: string[] = [];
  if (
    (data?.checkedAt != null && checkedAt == null) ||
    (data?.validUntil != null && validUntil == null) ||
    (checkedAt != null && validUntil != null && validUntil <= checkedAt)
  )
    reasons.push('INVALID_ASSESSMENT_TIME_WINDOW');
  if (age != null && age < 0) reasons.push('ASSESSMENT_FROM_FUTURE');
  if (
    profile.maxAssessmentAgeSeconds !== undefined &&
    (age == null || age > profile.maxAssessmentAgeSeconds)
  )
    reasons.push(age == null ? 'ASSESSMENT_AGE_UNKNOWN' : 'ASSESSMENT_TOO_OLD');
  if (
    profile.maxSourceAgeSeconds !== undefined &&
    (sourceAge == null || sourceAge > profile.maxSourceAgeSeconds)
  )
    reasons.push(sourceAge == null ? 'SOURCE_AGE_UNKNOWN' : 'SOURCE_TOO_OLD');
  if (
    (remaining != null && remaining <= 0) ||
    (profile.minimumRemainingValiditySeconds !== undefined &&
      (remaining == null || remaining < profile.minimumRemainingValiditySeconds))
  )
    reasons.push(remaining == null ? 'VALIDITY_UNKNOWN' : 'INSUFFICIENT_REMAINING_VALIDITY');
  return {
    satisfied: reasons.length === 0,
    checkedAt: nowSeconds,
    reasons,
    assessmentAgeSeconds: age,
    sourceAgeSeconds: sourceAge,
    remainingValiditySeconds: remaining,
  };
}
