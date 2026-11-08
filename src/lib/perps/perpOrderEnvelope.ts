/**
 * @fileoverview Shared plumbing for perp order-envelope adapters.
 *
 * This module owns only venue-neutral pieces used by the Base (Synthetix) and
 * BNB (Aster) prepare adapters: the readiness vocabulary, typed failure
 * classification, bounded upstream queries, exact decimal conversion, and a
 * reference fingerprint of the authoritative guard assessment. Risk rules
 * themselves stay in the existing venue guards (`basePerpGuard`,
 * `bnbPerpGuard`); these adapters never fork them.
 */

import { keccak256, type Hex } from 'viem';
import { z } from 'zod';

import type { RejectedVerdictEvidence } from '@/lib/billing/exemptions';
import { getRpcEndpoints } from '@/lib/execution/rpcEndpoints';
import { canonicalJsonString } from '@/lib/utils/canonicalJson';

/** Readiness of an unsigned order envelope. Mirrors prepare_perp_order. */
export type PerpOrderVerdict = 'READY_TO_SIGN' | 'BLOCK';

/**
 * Typed failures let callers distinguish an unsupported venue market from an
 * upstream outage. Never collapse the former into a generic error.
 */
export type PerpOrderAdapterErrorCode =
  | 'UNSUPPORTED_MARKET'
  | 'UPSTREAM_UNAVAILABLE'
  | 'INVALID_INPUT'
  | 'SLIPPAGE_EXCEEDED';

/**
 * Product-level meaning of an adapter failure. Only a completed risk verdict
 * may be `rejected`; coverage gaps, invalid parameters and upstream failures
 * stay `unavailable` and are never charged.
 */
export type PerpOrderAdapterOutcome = 'rejected' | 'unavailable';

export interface SlippageRejectionContext {
  input_digest: string;
  data_sources: Array<Record<string, unknown>>;
  risk_ruleset_version: string;
}

export class PerpOrderAdapterError extends Error {
  readonly code: PerpOrderAdapterErrorCode;
  readonly outcome: PerpOrderAdapterOutcome;
  readonly evidence: RejectedVerdictEvidence | null;

  constructor(
    code: PerpOrderAdapterErrorCode,
    message: string,
    options: { cause?: unknown; evidence?: RejectedVerdictEvidence | null } = {}
  ) {
    super(message);
    this.name = 'PerpOrderAdapterError';
    this.code = code;
    this.outcome = code === 'SLIPPAGE_EXCEEDED' ? 'rejected' : 'unavailable';
    this.evidence = options.evidence ?? null;
    if (options.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

export const PERP_ORDER_DEFAULT_QUERY_TIMEOUT_MS = 8_000;
export const PERP_ORDER_DEFAULT_QUOTE_VALIDITY_SECONDS = 30;
export const PERP_ORDER_MIN_QUOTE_VALIDITY_SECONDS = 5;
export const PERP_ORDER_MAX_QUOTE_VALIDITY_SECONDS = 120;

export const PerpOrderSideSchema = z.enum(['long', 'short']);
export const PerpOrderTypeSchema = z.enum(['market', 'limit']);
export const PerpOrderSlippageSchema = z.number().int().min(0).max(10_000);

/** The chain head observed while preparing the envelope. */
export interface PerpOrderObservation {
  chainId: number;
  blockNumber: number;
  observedAt: string;
  sourceFreshnessSeconds: number | null;
}

/**
 * A reference to the authoritative guard verdict. `assessmentHash` commits to
 * the complete guard result, so a later change to any guard field is
 * detectable without duplicating the guard's rules here.
 */
export interface PerpOrderRiskReference {
  schema: string;
  protocolId: string;
  verdict: 'ALLOW' | 'CAUTION' | 'BLOCK';
  evaluatedAt: string;
  assessmentHash: Hex;
  reasons: string[];
}

export interface PerpOrderQuoteTerms {
  referencePriceUsd: number;
  /** Worst acceptable fill price, 18-decimal USD integer string. */
  acceptablePrice: string;
  maxSlippageBps: number;
  source: string;
  /** Unix seconds; informational for venues that carry no on-chain expiry. */
  validUntil: number;
}

const POSITIVE_DECIMAL = /^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?$/;
const EIGHTEEN_DECIMALS = 10n ** 18n;

/**
 * Parse caller input with a typed INVALID_INPUT failure instead of leaking a
 * ZodError into a venue-specific call path.
 */
export function parsePerpOrderInput<T>(schema: z.ZodType<T>, raw: unknown): T {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
      .join('; ');
    throw new PerpOrderAdapterError('INVALID_INPUT', `Invalid perp order request: ${issues}`);
  }
  return parsed.data;
}

/**
 * Convert a positive decimal string into 18-decimal integer units. Only plain
 * decimal notation is accepted; exponent notation and >18 fractional digits are
 * rejected instead of rounded.
 */
export function decimalToUnits18(value: string, field: string): bigint {
  if (typeof value !== 'string' || !POSITIVE_DECIMAL.test(value)) {
    throw new PerpOrderAdapterError(
      'INVALID_INPUT',
      `${field} must be a positive decimal string without exponent notation`
    );
  }
  const [whole, fractional = ''] = value.split('.');
  if (fractional.length > 18) {
    throw new PerpOrderAdapterError('INVALID_INPUT', `${field} exceeds 18 decimal places`);
  }
  const units = BigInt(whole!) * EIGHTEEN_DECIMALS + BigInt(fractional.padEnd(18, '0'));
  if (units <= 0n) {
    throw new PerpOrderAdapterError('INVALID_INPUT', `${field} must be greater than zero`);
  }
  return units;
}

/** Canonicalize a positive decimal string without changing its value. */
export function canonicalDecimalText(value: string, field: string): string {
  if (typeof value !== 'string' || !POSITIVE_DECIMAL.test(value)) {
    throw new PerpOrderAdapterError(
      'INVALID_INPUT',
      `${field} must be a positive decimal string without exponent notation`
    );
  }
  const [wholeInput, fractionalInput = ''] = value.split('.');
  const whole = wholeInput!.replace(/^0+(?=\d)/, '');
  const fractional = fractionalInput.replace(/0+$/, '');
  const text = fractional.length > 0 ? `${whole}.${fractional}` : whole;
  if (Number(text) <= 0) {
    throw new PerpOrderAdapterError('INVALID_INPUT', `${field} must be greater than zero`);
  }
  return text;
}

/**
 * Convert a live USD price into 18-decimal units. Prices come from oracle/venue
 * feeds as numbers, so the conversion is pinned to 1e-8 USD precision to avoid
 * binary floating-point artefacts beyond any reviewed tick.
 */
export function priceToUnits18(price: number, field: string): bigint {
  if (!Number.isFinite(price) || price <= 0) {
    throw new PerpOrderAdapterError(
      'UPSTREAM_UNAVAILABLE',
      `${field} is not a usable positive price`
    );
  }
  const fixed = price.toFixed(8);
  const [whole, fractional = ''] = fixed.split('.');
  return BigInt(whole!) * EIGHTEEN_DECIMALS + BigInt(fractional.padEnd(18, '0'));
}

/** Canonical 1e-8 USD price text for venues that accept decimal strings. */
export function priceToDecimalText(price: number, field: string): string {
  if (!Number.isFinite(price) || price <= 0) {
    throw new PerpOrderAdapterError(
      'UPSTREAM_UNAVAILABLE',
      `${field} is not a usable positive price`
    );
  }
  const [whole, fractional = ''] = price.toFixed(8).split('.');
  const trimmed = fractional.replace(/0+$/, '');
  return trimmed.length > 0 ? `${whole}.${trimmed}` : whole!;
}

/** Absolute deviation in basis points. */
export function deviationBps(value: number, reference: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(reference) || reference <= 0) {
    throw new PerpOrderAdapterError(
      'UPSTREAM_UNAVAILABLE',
      'Cannot derive a finite price deviation from the observed quote'
    );
  }
  return (Math.abs(value - reference) / reference) * 10_000;
}

export interface SlippageBoundedPrice {
  referencePrice: number;
  acceptablePrice: number;
  orderType: 'market' | 'limit';
  limitPrice: number | null;
}

/**
 * Resolve the worst acceptable fill price. A market order derives it from the
 * reference price plus the caller's slippage cap; a limit order must itself
 * stay inside that cap. An out-of-band limit fails with SLIPPAGE_EXCEEDED
 * rather than being silently clamped.
 */
export function resolveSlippageBoundedPrice(input: {
  side: 'long' | 'short';
  orderType: 'market' | 'limit';
  referencePrice: number;
  maxSlippageBps: number;
  limitPrice?: string;
  rejectionContext?: SlippageRejectionContext;
}): SlippageBoundedPrice {
  if (!Number.isFinite(input.referencePrice) || input.referencePrice <= 0) {
    throw new PerpOrderAdapterError(
      'UPSTREAM_UNAVAILABLE',
      'The observed reference price is not usable'
    );
  }
  if (input.orderType === 'market' && input.limitPrice !== undefined) {
    throw new PerpOrderAdapterError(
      'INVALID_INPUT',
      'A market order must not declare a limit price'
    );
  }
  if (input.orderType === 'limit' && input.limitPrice === undefined) {
    throw new PerpOrderAdapterError('INVALID_INPUT', 'A limit order must declare a limit price');
  }
  if (input.orderType === 'limit') {
    const limitPrice = Number(input.limitPrice);
    if (!Number.isFinite(limitPrice) || limitPrice <= 0) {
      throw new PerpOrderAdapterError('INVALID_INPUT', 'The limit price must be positive');
    }
    if (deviationBps(limitPrice, input.referencePrice) > input.maxSlippageBps) {
      const observed = deviationBps(limitPrice, input.referencePrice);
      throw new PerpOrderAdapterError(
        'SLIPPAGE_EXCEEDED',
        `Limit price deviates beyond the caller slippage cap of ${input.maxSlippageBps} bps`,
        input.rejectionContext
          ? {
              evidence: {
                reason_code: 'SLIPPAGE_EXCEEDED',
                input_digest: input.rejectionContext.input_digest,
                triggered_threshold: {
                  rule: 'limit_price_deviation_bps',
                  threshold: input.maxSlippageBps,
                  observed,
                },
                data_sources: input.rejectionContext.data_sources,
                risk_ruleset_version: input.rejectionContext.risk_ruleset_version,
              },
            }
          : {}
      );
    }
    return {
      referencePrice: input.referencePrice,
      acceptablePrice: limitPrice,
      orderType: 'limit',
      limitPrice,
    };
  }
  const multiplier =
    input.side === 'long' ? 1 + input.maxSlippageBps / 10_000 : 1 - input.maxSlippageBps / 10_000;
  const acceptablePrice = input.referencePrice * multiplier;
  if (!(acceptablePrice > 0) || !Number.isFinite(acceptablePrice)) {
    throw new PerpOrderAdapterError(
      'INVALID_INPUT',
      'The slippage cap produces an unusable acceptable price'
    );
  }
  return {
    referencePrice: input.referencePrice,
    acceptablePrice,
    orderType: 'market',
    limitPrice: null,
  };
}

/**
 * Bound one upstream query. Timeouts and transport/shape errors become the
 * explicit UPSTREAM_UNAVAILABLE code; a typed adapter error keeps its code.
 */
export async function runPerpOrderQuery<T>(
  label: string,
  timeoutMs: number,
  work: Promise<T>
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(
        new PerpOrderAdapterError(
          'UPSTREAM_UNAVAILABLE',
          `${label} did not respond within ${timeoutMs}ms`
        )
      );
    }, timeoutMs);
  });
  try {
    return await Promise.race([work, timeout]);
  } catch (error) {
    if (error instanceof PerpOrderAdapterError) throw error;
    const message = error instanceof Error ? error.message : 'unknown upstream failure';
    throw new PerpOrderAdapterError('UPSTREAM_UNAVAILABLE', `${label} query failed: ${message}`, {
      cause: error,
    });
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/** Fingerprint the authoritative guard assessment for downstream binding. */
export function buildPerpOrderRiskReference(assessment: {
  schema: string;
  protocolId: string;
  verdict: 'ALLOW' | 'CAUTION' | 'BLOCK';
  evaluatedAt: string;
  reasons: string[];
}): PerpOrderRiskReference {
  const reference = {
    schema: assessment.schema,
    protocolId: assessment.protocolId,
    verdict: assessment.verdict,
    evaluatedAt: assessment.evaluatedAt,
    reasons: assessment.reasons,
  };
  return {
    ...reference,
    assessmentHash: keccak256(new TextEncoder().encode(canonicalJsonString(reference))),
  };
}

/** Hash the canonical serialization of a complete order intent. */
export function perpOrderIntentHash(intent: unknown): Hex {
  return keccak256(new TextEncoder().encode(canonicalJsonString(intent)));
}

/**
 * Read the chain head over JSON-RPC. Endpoint resolution reuses the existing
 * execution endpoint helper; an unsupported chain fails closed.
 */
export async function fetchChainHeadBlockNumber(
  chainId: number,
  signal?: AbortSignal
): Promise<number> {
  const endpoints = getRpcEndpoints(chainId);
  if (!endpoints) {
    throw new PerpOrderAdapterError(
      'UPSTREAM_UNAVAILABLE',
      `No reviewed RPC endpoint is configured for chain ${chainId}`
    );
  }
  let lastError: unknown;
  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] }),
        signal,
      });
      if (!response.ok) {
        lastError = new Error(`RPC ${endpoint} returned HTTP ${response.status}`);
        continue;
      }
      const body: unknown = await response.json();
      const result =
        body !== null && typeof body === 'object'
          ? (body as Record<string, unknown>).result
          : undefined;
      if (typeof result !== 'string') {
        lastError = new Error(`RPC ${endpoint} returned no block number`);
        continue;
      }
      const parsed = Number.parseInt(result, 16);
      if (Number.isSafeInteger(parsed) && parsed > 0) return parsed;
      lastError = new Error(`RPC ${endpoint} returned an unusable block number`);
    } catch (error) {
      lastError = error;
    }
  }
  throw new PerpOrderAdapterError(
    'UPSTREAM_UNAVAILABLE',
    `Every reviewed RPC endpoint failed to return a block number for chain ${chainId}`,
    { cause: lastError }
  );
}
