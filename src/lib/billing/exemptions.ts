/**
 * Billing exemptions for results that carry no usable conclusion.
 *
 * A tool that returns no usable data is not a delivered product, so it must
 * never be charged. "Free" is not one outcome, though: the ledger `reason` and
 * `X-Credit-Zero-Reason` must say which kind of zero the caller got.
 *
 *   - `insufficient_data` — an evidence grade explicitly says the inputs were
 *     insufficient to conclude. The data was measured and judged unusable.
 *   - `upstream_failed` — a batch returned no successful item at all, i.e.
 *     every lookup failed upstream. The data may exist; the sources did not
 *     answer. Kept separate so a ledger cannot confuse "no data" with "all
 *     upstreams down".
 *   - `timeout` — upstream/chain deadline (`UPSTREAM_TIMEOUT`), also unbilled.
 *   - `tool_free` — the tool or verification kind is zero-priced by design
 *     (offline verification: signature + digest, no live upstream read). Unlike
 *     the reasons above this is a price decision, not a data-quality outcome.
 *   - `rejected_without_evidence` — the result claimed `rejected` but did not
 *     carry all five reproducibility items. An unreproducible refusal is not a
 *     verdict: it degrades to `unavailable` and is never charged.
 */

export const UPSTREAM_TIMEOUT_CODE = 'UPSTREAM_TIMEOUT';

/** Zero-charge reasons emitted in `X-Credit-Zero-Reason` and `credit_ledger.reason`. */
export const BILLING_ZERO_REASONS = {
  insufficientData: 'insufficient_data',
  upstreamFailed: 'upstream_failed',
  rejectedWithoutEvidence: 'rejected_without_evidence',
  timeout: 'timeout',
  toolFree: 'tool_free',
  windowIncluded: 'window_included',
  lifecycleIncluded: 'lifecycle_included',
} as const;

export type BillingZeroReason = (typeof BILLING_ZERO_REASONS)[keyof typeof BILLING_ZERO_REASONS];

/**
 * Zero-charge reasons that describe a deterministic terminal outcome. A retry
 * of the same logical request may be served from the replay cache for these;
 * `timeout` and transient failures must always be re-attempted.
 */
const DETERMINISTIC_ZERO_REASONS: readonly BillingZeroReason[] = [
  BILLING_ZERO_REASONS.insufficientData,
  BILLING_ZERO_REASONS.upstreamFailed,
];

export function isDeterministicZeroReason(reason: string | undefined): reason is BillingZeroReason {
  return reason !== undefined && DETERMINISTIC_ZERO_REASONS.includes(reason as BillingZeroReason);
}

/**
 * Classify a REST batch by its usable-row count. Zero usable rows means every
 * requested item failed upstream; an uninspectable body returns `undefined`
 * (the caller keeps the normal charge).
 */
export function classifyBatchZeroReason(usableRows: number | null): BillingZeroReason | undefined {
  return usableRows === 0 ? BILLING_ZERO_REASONS.upstreamFailed : undefined;
}

/** Signals an evidence/verdict explicitly graded as insufficient to conclude. */
const INSUFFICIENT_DATA_PATTERN = /\bINSUFFICIENT_DATA\b/;

/** Batch tools say exactly this when every requested item failed. */
const NO_SUCCESSFUL_DATA_PATTERN = /\bNo successful (?:prices|results|quotes)\b/i;

/**
 * Structured product outcome carried by a tool result. `rejected` is a formed
 * judgement and therefore billable even when the transport marks the result as
 * an error; `unavailable` means no judgement was formed and is never billed.
 */
const PRODUCT_OUTCOME_MARKER_PATTERN = /\[(rejected|unavailable):/;

const JSON_REJECTED_PATTERN = /"(?:decision|productOutcome)"\s*:\s*"rejected"/;
const JSON_UNAVAILABLE_PATTERN = /"(?:decision|productOutcome)"\s*:\s*"unavailable"/;

export type StructuredProductOutcome = 'rejected' | 'unavailable';

/**
 * The five reproducibility items a `rejected` verdict must carry. Product
 * contract: a refusal missing any item is not reproducible and must degrade to
 * `unavailable` instead of being sold.
 */
export const REJECTED_EVIDENCE_ITEMS = [
  'reason_code',
  'input_digest',
  'triggered_threshold',
  'data_sources',
  'risk_ruleset_version',
] as const;

export type RejectedEvidenceItem = (typeof REJECTED_EVIDENCE_ITEMS)[number];

/**
 * Producer-side shape of a rejected verdict's reproducibility package. The
 * billing gate still judges it with `missingRejectedEvidenceItems`; this type
 * only keeps the producing layers honest about which fields they must supply.
 */
export type RejectedVerdictEvidence = {
  reason_code: string;
  input_digest: string;
  triggered_threshold: Record<string, unknown>;
  data_sources: Array<Record<string, unknown>>;
  risk_ruleset_version: string;
};

const REJECTED_EVIDENCE_ALIASES: Readonly<Record<RejectedEvidenceItem, readonly string[]>> = {
  reason_code: ['reason_code', 'reasonCode'],
  input_digest: ['input_digest', 'inputDigest'],
  triggered_threshold: ['triggered_threshold', 'triggeredThreshold'],
  data_sources: ['data_sources', 'dataSources'],
  risk_ruleset_version: ['risk_ruleset_version', 'riskRulesetVersion'],
};

export type ProductOutcomeAssessment = {
  /** Effective outcome after the evidence-completeness gate. */
  outcome: StructuredProductOutcome | null;
  /** Items absent from a claimed rejection; empty for a complete rejection. */
  missingEvidence: RejectedEvidenceItem[];
  /** True when a claimed rejection was downgraded to `unavailable`. */
  downgradedFromRejected: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMeaningfulEvidenceValue(value: unknown): boolean {
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value === 'boolean') return true;
  if (Array.isArray(value)) return value.length > 0 && value.every((item) => item != null);
  if (isRecord(value)) return Object.keys(value).length > 0;
  return false;
}

/** Which of the five reproducibility items are absent or empty. */
export function missingRejectedEvidenceItems(evidence: unknown): RejectedEvidenceItem[] {
  if (!isRecord(evidence)) return [...REJECTED_EVIDENCE_ITEMS];
  return REJECTED_EVIDENCE_ITEMS.filter(
    (item) =>
      !REJECTED_EVIDENCE_ALIASES[item].some((key) => isMeaningfulEvidenceValue(evidence[key]))
  );
}

function parseJsonRecord(resultText: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(resultText);
    return isRecord(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function unavailableAssessment(parsed: Record<string, unknown> | null): ProductOutcomeAssessment {
  const downgrade = parsed?.unavailable;
  if (
    isRecord(downgrade) &&
    downgrade.downgradeReason === BILLING_ZERO_REASONS.rejectedWithoutEvidence
  ) {
    const listed = Array.isArray(downgrade.missing)
      ? downgrade.missing.filter(
          (item): item is RejectedEvidenceItem =>
            typeof item === 'string' &&
            (REJECTED_EVIDENCE_ITEMS as readonly string[]).includes(item)
        )
      : [];
    return {
      outcome: 'unavailable',
      missingEvidence: listed.length > 0 ? listed : [...REJECTED_EVIDENCE_ITEMS],
      downgradedFromRejected: true,
    };
  }
  return { outcome: 'unavailable', missingEvidence: [], downgradedFromRejected: false };
}

/**
 * Assess the structured product outcome, applying the rejection-evidence
 * gate. Both spellings are understood: the adapter marker `[rejected:...]`
 * (which carries no payload and is therefore always incomplete) and a JSON
 * verdict carrying `evidence`. A downgraded envelope produced upstream (server
 * then settlement gate) is recognised so its waiver reason survives the
 * second entry point.
 */
export function assessProductOutcome(resultText: string): ProductOutcomeAssessment {
  const marker = PRODUCT_OUTCOME_MARKER_PATTERN.exec(resultText);
  if (marker) {
    if (marker[1] === 'unavailable') {
      return { outcome: 'unavailable', missingEvidence: [], downgradedFromRejected: false };
    }
    return {
      outcome: 'unavailable',
      missingEvidence: [...REJECTED_EVIDENCE_ITEMS],
      downgradedFromRejected: true,
    };
  }

  const parsed = parseJsonRecord(resultText);
  const declared = parsed?.decision ?? parsed?.productOutcome;
  if (declared === 'unavailable') {
    return unavailableAssessment(parsed);
  }
  if (declared === 'rejected') {
    const missingEvidence = missingRejectedEvidenceItems(parsed?.evidence);
    if (missingEvidence.length > 0) {
      return { outcome: 'unavailable', missingEvidence, downgradedFromRejected: true };
    }
    return { outcome: 'rejected', missingEvidence: [], downgradedFromRejected: false };
  }
  // A non-JSON body can still carry a decision marker (for example a transport
  // error wrapper); without a parseable evidence object it cannot be billable.
  if (JSON_REJECTED_PATTERN.test(resultText)) {
    return {
      outcome: 'unavailable',
      missingEvidence: [...REJECTED_EVIDENCE_ITEMS],
      downgradedFromRejected: true,
    };
  }
  if (JSON_UNAVAILABLE_PATTERN.test(resultText)) {
    return { outcome: 'unavailable', missingEvidence: [], downgradedFromRejected: false };
  }
  return { outcome: null, missingEvidence: [], downgradedFromRejected: false };
}

/**
 * Read the effective product outcome from the structured result itself.
 * Incomplete rejections already resolve to `unavailable` here.
 */
export function structuredProductOutcome(resultText: string): StructuredProductOutcome | null {
  return assessProductOutcome(resultText).outcome;
}

/**
 * Build the customer-facing `unavailable` envelope used when a claimed
 * rejection lacks any of the five reproducibility items. The caller must keep
 * seeing "no conclusion was formed", never an unreproducible refusal.
 */
export function rejectedEvidenceDowngradeEnvelope(
  missingEvidence: readonly RejectedEvidenceItem[]
): string {
  return JSON.stringify({
    decision: 'unavailable',
    readiness: 'no-execution-package',
    chargeable: false,
    unavailable: {
      reasonCode: 'INSUFFICIENT_DATA',
      missing: missingEvidence,
      downgradedFrom: 'rejected',
      downgradeReason: BILLING_ZERO_REASONS.rejectedWithoutEvidence,
    },
  });
}

/** True when the evidence itself was graded insufficient to conclude. */
export function isInsufficientDataResult(resultText: string): boolean {
  return INSUFFICIENT_DATA_PATTERN.test(resultText);
}

/** True when every requested batch item failed — an upstream failure, not "no data". */
export function isAllItemsFailedResult(resultText: string): boolean {
  return NO_SUCCESSFUL_DATA_PATTERN.test(resultText);
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return `${error.name} ${error.message}`;
  }
  return String(error);
}

/** Detect AbortError / TimeoutError / ETIMEDOUT and explicit timeout wording. */
export function isUpstreamTimeoutError(error: unknown): boolean {
  const message = errorMessage(error);
  return (
    /\b(?:AbortError|TimeoutError|ETIMEDOUT|ESOCKETTIMEDOUT|UND_ERR_CONNECT_TIMEOUT)\b/i.test(
      message
    ) || /\b(?:timed?\s*out|timeout|deadline exceeded)\b/i.test(message)
  );
}
