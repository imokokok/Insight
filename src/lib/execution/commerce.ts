/**
 * Protocol-neutral commercial terms for a prepared execution.
 *
 * Commerce is descriptive evidence, never execution authority.  In
 * particular, a venue-native fee must be visible before the user signs and a
 * post-trade estimate is deliberately distinct from venue-reported revenue.
 */

export const EXECUTION_COMMERCE_SCHEMA = 'execution.commerce.v1' as const;
export const EXECUTION_COMMERCE_EVENT_SCHEMA = 'execution.commerce-event.v1' as const;

export type MeteringClass = 'C1' | 'C2' | 'C3' | 'C4';

export type VenueNativeFeeTerms = {
  kind: 'venue-native';
  venue: string;
  beneficiary: `0x${string}`;
  /** A venue-defined integer unit. Hyperliquid uses tenths of a basis point. */
  unit: 'tenths-of-basis-point';
  rate: number;
  maximumRate: number;
  /** The service never treats an unsigned caller assertion as approval. */
  approval: 'USER_SIGNATURE_REQUIRED_OR_UNVERIFIED';
  settlement: 'VENUE_RECONCILIATION_REQUIRED';
};

export type ExecutionCommercialTerms = {
  schema: typeof EXECUTION_COMMERCE_SCHEMA;
  productId: 'verified-execution';
  metering: {
    preflight: MeteringClass;
    observation: MeteringClass;
    evidenceExport: MeteringClass;
  };
  venueFee: VenueNativeFeeTerms | null;
};

export type VenueNativeFeeEstimate = {
  schema: typeof EXECUTION_COMMERCE_EVENT_SCHEMA;
  type: 'VENUE_FEE_ESTIMATED';
  venue: string;
  reference: { account: string; clientOrderId: string };
  observedAt: string;
  filledNotionalUsd: string;
  estimatedFeeUsd: string;
  rate: number;
  unit: 'tenths-of-basis-point';
  settlement: 'VENUE_RECONCILIATION_REQUIRED';
  caveats: readonly string[];
};

export type VenueNativeFeeReconciliation = {
  schema: typeof EXECUTION_COMMERCE_EVENT_SCHEMA;
  type: 'VENUE_FEE_RECONCILED';
  venue: string;
  reference: { account: string; clientOrderId: string };
  estimatedFeeUsd: string;
  reportedFeeUsd: string;
  varianceUsd: string;
  reportedAt: string;
  reportReference: string;
  caveats: readonly string[];
};

const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const DECIMAL = /^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,30})?$/;

export function noVenueFeeCommercialTerms(): ExecutionCommercialTerms {
  return {
    schema: EXECUTION_COMMERCE_SCHEMA,
    productId: 'verified-execution',
    metering: { preflight: 'C3', observation: 'C4', evidenceExport: 'C4' },
    venueFee: null,
  };
}

/** Validate terms before returning them across an adapter boundary. */
export function createExecutionCommercialTerms(
  value: ExecutionCommercialTerms
): ExecutionCommercialTerms {
  if (
    !value ||
    value.schema !== EXECUTION_COMMERCE_SCHEMA ||
    value.productId !== 'verified-execution' ||
    !value.metering ||
    !['C1', 'C2', 'C3', 'C4'].includes(value.metering.preflight) ||
    !['C1', 'C2', 'C3', 'C4'].includes(value.metering.observation) ||
    !['C1', 'C2', 'C3', 'C4'].includes(value.metering.evidenceExport)
  ) {
    throw new TypeError('Execution commercial terms are invalid.');
  }
  const fee = value.venueFee;
  if (fee === null) return value;
  if (
    fee.kind !== 'venue-native' ||
    !/^[a-z0-9][a-z0-9._-]{1,63}$/.test(fee.venue) ||
    !ADDRESS.test(fee.beneficiary) ||
    fee.unit !== 'tenths-of-basis-point' ||
    !Number.isSafeInteger(fee.rate) ||
    !Number.isSafeInteger(fee.maximumRate) ||
    fee.rate < 1 ||
    fee.maximumRate < fee.rate ||
    fee.approval !== 'USER_SIGNATURE_REQUIRED_OR_UNVERIFIED' ||
    fee.settlement !== 'VENUE_RECONCILIATION_REQUIRED'
  ) {
    throw new TypeError('Execution venue fee terms are invalid.');
  }
  return {
    ...value,
    venueFee: { ...fee, beneficiary: fee.beneficiary.toLowerCase() as `0x${string}` },
  };
}

/**
 * This is an accounting estimate from observed fills only.  It intentionally
 * does not claim that Hyperliquid accepted, accrued, or paid a builder fee;
 * consumers must reconcile that with the venue's builder-fill export.
 */
export function estimateVenueNativeFee(input: {
  terms: ExecutionCommercialTerms;
  venue: string;
  reference: { account: string; clientOrderId: string };
  observedAt: string;
  filledNotionalUsd: string;
}): VenueNativeFeeEstimate | null {
  const terms = createExecutionCommercialTerms(input.terms);
  const fee = terms.venueFee;
  if (!fee || fee.venue !== input.venue) return null;
  if (!DECIMAL.test(input.filledNotionalUsd) || !Number.isFinite(Date.parse(input.observedAt))) {
    throw new TypeError('Observed venue fee inputs are invalid.');
  }
  const filledNotionalUsd = normalizeDecimal(input.filledNotionalUsd);
  // One tenth of a basis point is 1 / 100,000 of notional. Keep the result
  // decimal-exact so a downstream accounting ledger never inherits a float.
  const estimatedFeeUsd = multiplyDecimalByRatio(filledNotionalUsd, fee.rate, 100_000);
  return {
    schema: EXECUTION_COMMERCE_EVENT_SCHEMA,
    type: 'VENUE_FEE_ESTIMATED',
    venue: input.venue,
    reference: {
      account: input.reference.account.toLowerCase(),
      clientOrderId: input.reference.clientOrderId.toLowerCase(),
    },
    observedAt: input.observedAt,
    filledNotionalUsd,
    estimatedFeeUsd,
    rate: fee.rate,
    unit: fee.unit,
    settlement: fee.settlement,
    caveats: [
      'This is an estimate derived from observed fill notional, not proof of a venue-reported builder payout.',
      'Reconcile against the venue builder-fill export before recognizing revenue.',
    ],
  };
}

/**
 * Join an adapter's observed-notional estimate with a venue-produced fill
 * report. The caller must retain the source report independently; its compact
 * identifier is included here for audit and webhook/ledger consumers.
 */
export function reconcileVenueNativeFee(input: {
  estimate: VenueNativeFeeEstimate;
  reportedFeeUsd: string;
  reportedAt: string;
  reportReference: string;
}): VenueNativeFeeReconciliation {
  const { estimate } = input;
  if (
    estimate.schema !== EXECUTION_COMMERCE_EVENT_SCHEMA ||
    estimate.type !== 'VENUE_FEE_ESTIMATED' ||
    !/^[a-z0-9][a-z0-9._-]{1,63}$/.test(estimate.venue) ||
    !DECIMAL.test(estimate.filledNotionalUsd) ||
    !DECIMAL.test(estimate.estimatedFeeUsd) ||
    !Number.isFinite(Date.parse(estimate.observedAt)) ||
    typeof estimate.reference?.account !== 'string' ||
    typeof estimate.reference?.clientOrderId !== 'string' ||
    !DECIMAL.test(input.reportedFeeUsd) ||
    !Number.isFinite(Date.parse(input.reportedAt)) ||
    !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/.test(input.reportReference)
  ) {
    throw new TypeError('Venue fee reconciliation input is invalid.');
  }
  return {
    schema: EXECUTION_COMMERCE_EVENT_SCHEMA,
    type: 'VENUE_FEE_RECONCILED',
    venue: estimate.venue,
    reference: { ...estimate.reference },
    estimatedFeeUsd: estimate.estimatedFeeUsd,
    reportedFeeUsd: normalizeDecimal(input.reportedFeeUsd),
    varianceUsd: subtractDecimal(normalizeDecimal(input.reportedFeeUsd), estimate.estimatedFeeUsd),
    reportedAt: input.reportedAt,
    reportReference: input.reportReference,
    caveats: [
      'Venue-reported revenue is reconciled to an observed-notional estimate; fee timing, rebates, and report completeness remain venue-specific.',
    ],
  };
}

function normalizeDecimal(value: string): string {
  const [whole, fraction = ''] = value.split('.');
  const normalizedWhole = whole.replace(/^0+(?=\d)/, '');
  const normalizedFraction = fraction.replace(/0+$/, '');
  return normalizedFraction ? `${normalizedWhole}.${normalizedFraction}` : normalizedWhole;
}

function decimalParts(value: string): { integer: bigint; scale: number } {
  const [whole, fraction = ''] = normalizeDecimal(value).split('.');
  return { integer: BigInt(`${whole}${fraction}`), scale: fraction.length };
}

function formatScaledDecimal(integer: bigint, scale: number): string {
  const sign = integer < 0n ? '-' : '';
  const digits = (integer < 0n ? -integer : integer).toString().padStart(scale + 1, '0');
  const whole = scale === 0 ? digits : digits.slice(0, -scale);
  const fraction = scale === 0 ? '' : digits.slice(-scale).replace(/0+$/, '');
  return `${sign}${whole}${fraction ? `.${fraction}` : ''}`;
}

function multiplyDecimalByRatio(value: string, numerator: number, denominator: number): string {
  const parsed = decimalParts(value);
  return formatScaledDecimal(
    parsed.integer * BigInt(numerator),
    parsed.scale + decimalPlaces(denominator)
  );
}

function subtractDecimal(left: string, right: string): string {
  const a = decimalParts(left);
  const b = decimalParts(right);
  const scale = Math.max(a.scale, b.scale);
  const aInteger = a.integer * 10n ** BigInt(scale - a.scale);
  const bInteger = b.integer * 10n ** BigInt(scale - b.scale);
  return formatScaledDecimal(aInteger - bInteger, scale);
}

function decimalPlaces(value: number): number {
  const text = String(value);
  const fraction = text.split('.')[1];
  if (fraction) return fraction.length;
  let divisor = value;
  let places = 0;
  while (divisor > 1 && divisor % 10 === 0) {
    divisor /= 10;
    places += 1;
  }
  if (divisor !== 1) throw new TypeError('Venue fee denominator must be a decimal power of ten.');
  return places;
}
