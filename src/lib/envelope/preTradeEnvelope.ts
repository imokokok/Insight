/**
 * Pre-trade safety envelope: the conjunction of environment.* receipts an
 * agent must hold before acting.
 *
 * This is the "one pre-trade safety envelope" object from the
 * draft-borthwick-msebenzi-environment-state family discussion: a single
 * verdict over two (or more) independently issued, independently verified
 * receipts. Semantics are conjunction + fail-closed:
 *
 *   verdict = PASS  iff  EVERY member is present, signature-valid, fresh,
 *                      and positive
 *   verdict = BLOCK otherwise — a missing, expired, tampered or negative
 *                      member receipt blocks the action
 *
 * The evaluation is a pure function over per-member facts (each member's
 * fetch/verify layer produces them); no network or clock access happens here,
 * so every red path is unit-testable without mocks. Per-member diagnostics
 * expose WHICH check failed (missing → signature → freshness → positivity)
 * so a consumer can tell "market closed" from "receipt tampered" — the same
 * reason-code discipline the Insight pre-trade gate applies to BLOCKs.
 */

/** Verdicts that allow the action. CAUTION permits a right-sized action per
 * the pre-trade gate semantics; DANGER/BLOCK do not. Matches the allowed set
 * in the environment.price_integrity RFC draft. */
export const ALLOWED_PRICE_VERDICTS = ['PASS', 'CAUTION'] as const;

export const ENVELOPE_SEMANTICS =
  'conjunction: every member receipt must be present, signature-valid, fresh, and positive; any failure blocks the action (fail-closed)';

export type EnvelopeReasonCode =
  | 'price_integrity_missing'
  | 'price_integrity_signature_invalid'
  | 'price_integrity_expired'
  | 'price_integrity_negative_verdict'
  | 'market_state_missing'
  | 'market_state_signature_invalid'
  | 'market_state_expired'
  | 'market_state_not_open';

/** Facts about the Insight OracleSafetyCheck v2 receipt, distilled by the
 * caller from signAttestationV2 + verifyAttestationV2 outputs. */
export interface PriceIntegrityMemberInput {
  /** A signed receipt exists (attester configured + signing succeeded). */
  present: boolean;
  /** EIP-712 signature + uid intact (an expired-but-genuinely-signed receipt
   * still counts as signature-valid — freshness is a separate check). */
  signatureValid: boolean;
  expired: boolean;
  /** Verdict from the signed payload (typed string at the EIP-712 boundary);
   * null when the receipt is absent. Anything outside ALLOWED_PRICE_VERDICTS
   * evaluates negative — unknown verdicts fail closed. */
  verdict: string | null;
}

/** Facts about the Headless Oracle market-state receipt, distilled by the
 * caller from fetchAndVerifyHeadlessMarketState. */
export interface MarketStateMemberInput {
  present: boolean;
  signatureValid: boolean;
  expired: boolean;
  /** Signed market status; null when the receipt is absent. */
  status: string | null;
}

export interface EnvelopeMemberState {
  source: 'environment.price_integrity' | 'environment.market_state';
  present: boolean;
  signatureValid: boolean;
  fresh: boolean;
  positive: boolean;
  /** First failing check, machine-readable; null when the member passes. */
  reasonCode: EnvelopeReasonCode | null;
  /** Human-readable one-liner for the diagnosis. */
  detail: string;
}

export interface PreTradeEnvelopeResult {
  verdict: 'PASS' | 'BLOCK';
  /** Structural constant — the envelope has no fail-open path. */
  failClosed: true;
  semantics: typeof ENVELOPE_SEMANTICS;
  members: {
    priceIntegrity: EnvelopeMemberState;
    marketState: EnvelopeMemberState;
  };
  /** Ordered: price_integrity failures first, market_state second. */
  reasonCodes: EnvelopeReasonCode[];
  evaluatedAt: string;
}

/**
 * Evaluate one member against the check ladder. Shared by both members —
 * the ladder (missing → signature → freshness → positivity) is identical,
 * only the reason codes and the positivity label differ. Leaf-first: this
 * helper is where the semantics live, so both callers cannot drift.
 */
function evaluateMember(
  source: EnvelopeMemberState['source'],
  input: { present: boolean; signatureValid: boolean; expired: boolean; positive: boolean },
  codes: {
    missing: EnvelopeReasonCode;
    signature: EnvelopeReasonCode;
    expired: EnvelopeReasonCode;
    negative: EnvelopeReasonCode;
  },
  positiveLabel: string
): EnvelopeMemberState {
  if (!input.present) {
    return {
      source,
      present: false,
      signatureValid: false,
      fresh: false,
      positive: false,
      reasonCode: codes.missing,
      detail: 'receipt missing or could not be fetched',
    };
  }
  if (!input.signatureValid) {
    return {
      source,
      present: true,
      signatureValid: false,
      fresh: false,
      positive: false,
      reasonCode: codes.signature,
      detail: 'signature failed verification (tampered or forged receipt)',
    };
  }
  if (input.expired) {
    return {
      source,
      present: true,
      signatureValid: true,
      fresh: false,
      positive: false,
      reasonCode: codes.expired,
      detail: 'receipt outside its validity window',
    };
  }
  if (!input.positive) {
    return {
      source,
      present: true,
      signatureValid: true,
      fresh: true,
      positive: false,
      reasonCode: codes.negative,
      detail: `not ${positiveLabel}`,
    };
  }
  return {
    source,
    present: true,
    signatureValid: true,
    fresh: true,
    positive: true,
    reasonCode: null,
    detail: positiveLabel,
  };
}

export function evaluatePreTradeEnvelope(input: {
  priceIntegrity: PriceIntegrityMemberInput;
  marketState: MarketStateMemberInput;
  evaluatedAtMs?: number;
}): PreTradeEnvelopeResult {
  const priceIntegrity = evaluateMember(
    'environment.price_integrity',
    {
      present: input.priceIntegrity.present,
      signatureValid: input.priceIntegrity.signatureValid,
      expired: input.priceIntegrity.expired,
      positive:
        input.priceIntegrity.verdict !== null &&
        (ALLOWED_PRICE_VERDICTS as readonly string[]).includes(input.priceIntegrity.verdict),
    },
    {
      missing: 'price_integrity_missing',
      signature: 'price_integrity_signature_invalid',
      expired: 'price_integrity_expired',
      negative: 'price_integrity_negative_verdict',
    },
    'oracle price integrity verdict within the allowed set (PASS/CAUTION)'
  );

  const marketState = evaluateMember(
    'environment.market_state',
    {
      present: input.marketState.present,
      signatureValid: input.marketState.signatureValid,
      expired: input.marketState.expired,
      // Only a signed OPEN counts as positive. Their own receipts fail-closed
      // to UNKNOWN; anything other than OPEN (CLOSED, HALTED, UNKNOWN, ...)
      // must stop the trade.
      positive: input.marketState.status === 'OPEN',
    },
    {
      missing: 'market_state_missing',
      signature: 'market_state_signature_invalid',
      expired: 'market_state_expired',
      negative: 'market_state_not_open',
    },
    'market OPEN per signed market-state receipt'
  );

  const reasonCodes = [priceIntegrity, marketState]
    .map((m) => m.reasonCode)
    .filter((c): c is EnvelopeReasonCode => c !== null);

  return {
    verdict: reasonCodes.length === 0 ? 'PASS' : 'BLOCK',
    failClosed: true,
    semantics: ENVELOPE_SEMANTICS,
    members: { priceIntegrity, marketState },
    reasonCodes,
    evaluatedAt: new Date(input.evaluatedAtMs ?? Date.now()).toISOString(),
  };
}
