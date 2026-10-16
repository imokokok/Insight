import { after, type NextRequest, NextResponse } from 'next/server';

import { type HTTPAdapter, type HTTPResponseInstructions } from '@x402/core/server';
import { z } from 'zod';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { dbCircuitBreaker } from '@/lib/utils/dbCircuitBreaker';
import { createLogger } from '@/lib/utils/logger';

import {
  getX402PaymentOptions,
  SOLANA_DEVNET_CAIP2,
  SOLANA_MAINNET_CAIP2,
  X402_EVM_NETWORK_IDS,
  type X402Config,
} from './config';
import { getX402HttpServer } from './resourceServer';
import { isSolanaPublicKey, isSolanaSignature } from './solanaEncoding';

const logger = createLogger('x402-guard');

/**
 * Request-path payment guard for the x402 keyless paid tier.
 *
 * Three-way dispatch lives in the route file; this module owns everything
 * x402-specific: header detection, the verify→business→settle orchestration
 * (settle only after a 2xx business response, so a failed check never
 * charges), 402 instruction translation, and best-effort settlement audit.
 */

/** Minimal HTTPAdapter bridge from NextRequest into the x402 core server. */
class NextRequestAdapter implements HTTPAdapter {
  constructor(private readonly request: NextRequest) {}

  getHeader(name: string): string | undefined {
    return this.request.headers.get(name) ?? undefined;
  }

  getMethod(): string {
    return this.request.method;
  }

  getPath(): string {
    return this.request.nextUrl.pathname;
  }

  getUrl(): string {
    return this.request.nextUrl.toString();
  }

  getAcceptHeader(): string {
    return this.request.headers.get('accept') ?? '';
  }

  getUserAgent(): string {
    return this.request.headers.get('user-agent') ?? '';
  }

  getQueryParams(): Record<string, string> {
    return Object.fromEntries(this.request.nextUrl.searchParams.entries());
  }
}

/**
 * True when the request carries an x402 v2 payment signature header. v2 uses
 * `PAYMENT-SIGNATURE` (base64 JSON); the legacy v1 `X-PAYMENT` header is
 * deliberately NOT accepted — anonymous v1 agents get a fresh v2 402 quote.
 */
export function isPaidRequest(request: NextRequest): boolean {
  return request.headers.has('payment-signature');
}

/**
 * True when the request looks like it targets the legacy API-key path
 * (x-api-key header, or any Authorization header). Anything with such a
 * header goes to the existing authenticated handler even when the paid tier
 * is armed, so partner integrations are untouched.
 */
export function hasAuthCredentials(request: NextRequest): boolean {
  return request.headers.has('x-api-key') || request.headers.has('authorization');
}

/** Translate x402 HTTP response instructions into a NextResponse. */
export function toNextResponse(instructions: HTTPResponseInstructions): NextResponse {
  const body = instructions.body === undefined ? null : instructions.body;
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  const response = new NextResponse(payload, { status: instructions.status });
  for (const [key, value] of Object.entries(instructions.headers ?? {})) {
    response.headers.set(key, value);
  }
  return response;
}

export interface X402SettlementAudit {
  requestId: string;
  protocol?: 'x402' | 'mpp';
  status:
    | 'quote_issued'
    | 'payment_rejected'
    | 'payment_verified'
    | 'business_failed'
    | 'business_succeeded'
    | 'settled'
    | 'settlement_failed'
    | 'verify_failed';
  surface?: 'rest' | 'mcp' | 'legacy';
  resource?: string;
  responseTimeMs?: number;
  txHash?: string;
  payer?: string;
  amountUsdc?: string;
  network: string | null;
  asset?: string;
  verdict?: string;
  errorReason?: string;
}

const X402SettlementAuditSchema = z
  .object({
    requestId: z.string().regex(/^req_[a-f0-9]{32}$/),
    protocol: z.enum(['x402', 'mpp']).optional(),
    status: z.enum([
      'quote_issued',
      'payment_rejected',
      'payment_verified',
      'business_failed',
      'business_succeeded',
      'settled',
      'settlement_failed',
      'verify_failed',
    ]),
    surface: z.enum(['rest', 'mcp', 'legacy']).optional(),
    resource: z.string().max(512).optional(),
    responseTimeMs: z.number().int().min(0).max(2_147_483_647).optional(),
    txHash: z.string().max(128).optional(),
    payer: z.string().max(64).optional(),
    amountUsdc: z
      .string()
      .regex(/^\d+(?:\.\d{1,6})?$/)
      .optional(),
    network: z
      .enum([...X402_EVM_NETWORK_IDS, SOLANA_MAINNET_CAIP2, SOLANA_DEVNET_CAIP2] as const)
      .nullable(),
    asset: z.string().max(64).optional(),
    verdict: z.string().max(128).optional(),
    errorReason: z.string().max(512).optional(),
  })
  .strict()
  .superRefine((audit, context) => {
    const isSolana = audit.network?.startsWith('solana:') ?? false;
    const valid = (value: string | undefined, validator: (candidate: string) => boolean) =>
      value === undefined || validator(value);

    const validTxHash = valid(
      audit.txHash,
      isSolana ? isSolanaSignature : (value) => /^0x[a-f0-9]{64}$/i.test(value)
    );
    const validPayer = valid(
      audit.payer,
      isSolana ? isSolanaPublicKey : (value) => /^0x[a-f0-9]{40}$/i.test(value)
    );
    const validAsset = valid(
      audit.asset,
      isSolana ? isSolanaPublicKey : (value) => /^0x[a-f0-9]{40}$/i.test(value)
    );

    if (!validTxHash || !validPayer || !validAsset) {
      context.addIssue({
        code: 'custom',
        message: 'x402 audit facts do not match the network format',
      });
    }
    if (audit.network === null && (audit.txHash || audit.payer || audit.asset)) {
      context.addIssue({
        code: 'custom',
        message: 'network is required for chain-specific audit facts',
      });
    }
  });

const SupportedX402NetworkSchema = z.enum([
  ...X402_EVM_NETWORK_IDS,
  SOLANA_MAINNET_CAIP2,
  SOLANA_DEVNET_CAIP2,
] as const);

type SupportedX402Network = z.infer<typeof SupportedX402NetworkSchema>;

interface PaymentRequirementAuditInput {
  network: string;
  asset: string;
  amount: string;
}

/** Convert the verified requirement into chain-aware audit facts. */
export function paymentAuditFields(requirement: PaymentRequirementAuditInput): {
  network: SupportedX402Network | null;
  asset?: string;
  amountUsdc?: string;
} {
  const network = SupportedX402NetworkSchema.safeParse(requirement.network);
  if (!network.success || !/^\d+$/.test(requirement.amount)) {
    logger.warn('x402 payment requirement rejected by audit validation');
    return { network: null };
  }

  const isSolana = network.data.startsWith('solana:');
  const validAsset = isSolana
    ? isSolanaPublicKey(requirement.asset)
    : /^0x[a-fA-F0-9]{40}$/.test(requirement.asset);
  if (!validAsset) {
    logger.warn('x402 payment asset rejected by audit validation', { network: network.data });
    return { network: null };
  }

  try {
    return {
      network: network.data,
      asset: requirement.asset,
      amountUsdc: atomicUnitsToUsdc(requirement.amount),
    };
  } catch {
    logger.warn('x402 payment amount rejected by audit validation', { network: network.data });
    return { network: null };
  }
}

/** A quote can be attributed only when the route advertises one payment option. */
export function quoteAuditFields(
  cfg: X402Config,
  amountOverride?: string
): {
  network: SupportedX402Network | null;
  asset?: string;
  amountUsdc?: string;
} {
  const options = getX402PaymentOptions(cfg, amountOverride);
  if (options.length !== 1) return { network: null };
  const [option] = options;
  return option
    ? paymentAuditFields({
        network: option.network,
        asset: option.asset,
        amount: option.amountAtomic,
      })
    : { network: null };
}

/**
 * Best-effort lifecycle audit row. Uses the service-role client (RLS-denied
 * table) and never throws: billing must not break the paid response path.
 * `after()` extends the serverless lifetime; outside a request work store
 * (unit tests) it degrades to a fire-and-forget promise.
 */
export function recordX402Settlement(audit: X402SettlementAudit): void {
  const validation = X402SettlementAuditSchema.safeParse(audit);
  if (!validation.success) {
    logger.warn('x402 lifecycle audit rejected by validation');
    return;
  }
  const validAudit = validation.data;

  const task = async () => {
    try {
      // Audit is advisory: while the database circuit breaker is open, skip
      // the insert entirely instead of adding a hanging 15s query to the
      // storm (the paid response path must never wait on this write).
      if (!dbCircuitBreaker.claimProbe()) {
        logger.warn('x402 settlement audit skipped (database circuit breaker open)');
        return;
      }
      const client = createServiceRoleClient();
      const { error } = await client.from('x402_settlements').insert({
        request_id: validAudit.requestId,
        protocol: validAudit.protocol ?? 'x402',
        status: validAudit.status,
        tx_hash: validAudit.txHash ?? null,
        payer: validAudit.payer ?? null,
        amount_usdc: validAudit.amountUsdc ?? null,
        network: validAudit.network,
        asset: validAudit.asset ?? null,
        surface: validAudit.surface ?? 'legacy',
        resource: validAudit.resource ?? null,
        response_time_ms: validAudit.responseTimeMs ?? null,
        verdict: validAudit.verdict ?? null,
        error_reason: validAudit.errorReason ?? null,
      });
      if (error) {
        dbCircuitBreaker.recordFailure(error);
        logger.warn('x402 settlement audit insert failed', { error: error.message });
      } else {
        dbCircuitBreaker.recordSuccess();
      }
    } catch (error) {
      dbCircuitBreaker.recordFailure(error);
      // Missing SUPABASE_SERVICE_ROLE_KEY in dev is expected — audit is
      // advisory, never load-bearing.
      logger.warn('x402 settlement audit unavailable', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  try {
    after(task);
  } catch {
    void task();
  }
}

/** Format USDC atomic units without floating-point rounding. */
export function atomicUnitsToUsdc(atomic: string): string {
  const units = BigInt(atomic);
  const whole = units / 1_000_000n;
  const fraction = String(units % 1_000_000n)
    .padStart(6, '0')
    .replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : String(whole);
}

function newRequestId(): string {
  return `req_${crypto.randomUUID().replace(/-/g, '')}`;
}

/**
 * Surface the facilitator's Bazaar indexing verdict. The `EXTENSION-RESPONSES`
 * header on verify/settle responses is the ONLY signal that discovery metadata
 * was accepted (`{"bazaar":{"status":"processing"}}`) or silently rejected
 * (`{"bazaar":{"status":"rejected","rejectedReason":...}}`) — without this log
 * an invalid discovery extension would never be noticed. Best-effort: any
 * decode failure logs the raw header and moves on. Shared with the MCP paid
 * bridge, which settles through the same facilitator stack.
 */
export function logBazaarExtensionStatus(
  requestId: string,
  headers: Record<string, string> | undefined
): void {
  const raw = headers?.['extension-responses'] ?? headers?.['EXTENSION-RESPONSES'];
  if (!raw) {
    return;
  }
  try {
    const decoded = JSON.parse(Buffer.from(raw, 'base64').toString('utf8')) as {
      bazaar?: { status?: string; rejectedReason?: string };
    };
    if (decoded.bazaar?.status === 'rejected') {
      logger.warn('x402 bazaar discovery extension rejected by facilitator', {
        requestId,
        rejectedReason: decoded.bazaar.rejectedReason,
      });
    } else {
      logger.info('x402 bazaar extension status', {
        requestId,
        status: decoded.bazaar?.status ?? 'unknown',
      });
    }
  } catch (error) {
    logger.warn('x402 bazaar extension header undecodable', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Run the x402 lifecycle for one pre-trade request.
 *
 * - No/invalid payment → the core server produces a 402 quote
 *   (`PAYMENT-REQUIRED` header + machine-readable accepts); returned as-is.
 * - Valid payment → `runBusiness` executes, and only a 2xx response triggers
 *   settlement. Settlement headers (`PAYMENT-RESPONSE`, containing the on-chain
 *   tx hash) are attached to the business response. A settlement failure after
 *   a 2xx business result keeps the 200 but carries the failure header, so the
 *   client was not charged and can retry.
 */
export async function handlePaidPreTradeRequest(
  request: NextRequest,
  cfg: X402Config,
  runBusiness: (requestId: string) => Promise<NextResponse>
): Promise<NextResponse> {
  const requestId = newRequestId();
  const httpServer = await getX402HttpServer(cfg);
  const requestStartedAt = Date.now();

  const result = await httpServer.processHTTPRequest({
    adapter: new NextRequestAdapter(request),
    path: request.nextUrl.pathname,
    method: request.method,
  });

  if (result.type === 'payment-error') {
    const hasPaymentSignature = request.headers.has('payment-signature');
    recordX402Settlement({
      requestId,
      status: hasPaymentSignature ? 'payment_rejected' : 'quote_issued',
      // A multi-chain quote or rejected payload has no validated selected chain.
      ...(hasPaymentSignature ? { network: null } : quoteAuditFields(cfg)),
      surface: 'rest',
      resource: request.nextUrl.pathname,
      responseTimeMs: Date.now() - requestStartedAt,
      errorReason: hasPaymentSignature ? 'facilitator_rejected_payment' : undefined,
    });
    logger.info('x402 payment required / rejected', {
      requestId,
      path: request.nextUrl.pathname,
    });
    const response = toNextResponse(result.response);
    response.headers.set('X-Request-Id', requestId);
    return response;
  }

  if (result.type === 'no-payment-required') {
    // The only registered route is protected, so this branch is defensive.
    logger.warn('x402 server classified protected request as unpaid', { requestId });
    const response = toNextResponse({
      status: 402,
      headers: { 'Cache-Control': 'no-store' },
      body: { error: 'X402_PAYMENT_REQUIRED' },
    });
    response.headers.set('X-Request-Id', requestId);
    return response;
  }

  recordX402Settlement({
    requestId,
    status: 'payment_verified',
    ...paymentAuditFields(result.paymentRequirements),
    surface: 'rest',
    resource: request.nextUrl.pathname,
    responseTimeMs: Date.now() - requestStartedAt,
  });

  // payment-verified: business first, settle only on 2xx.
  const businessStartedAt = Date.now();
  let businessResponse: NextResponse;
  try {
    businessResponse = await runBusiness(requestId);
  } catch (error) {
    recordX402Settlement({
      requestId,
      status: 'business_failed',
      ...paymentAuditFields(result.paymentRequirements),
      surface: 'rest',
      resource: request.nextUrl.pathname,
      responseTimeMs: Date.now() - businessStartedAt,
      errorReason: `handler_error:${error instanceof Error ? error.name : 'unknown'}`,
    });
    throw error;
  }

  if (businessResponse.status < 200 || businessResponse.status >= 300) {
    // Payment verified but the check did not complete (4xx/5xx): do not
    // settle. Nothing was charged; audit as a verify-only record so the
    // operator can see how often paid requests fail business-side.
    recordX402Settlement({
      requestId,
      status: 'business_failed',
      ...paymentAuditFields(result.paymentRequirements),
      surface: 'rest',
      resource: request.nextUrl.pathname,
      responseTimeMs: Date.now() - businessStartedAt,
      errorReason: `handler_failed:${businessResponse.status}`,
    });
    logger.info('x402 business response non-2xx, settlement skipped', {
      requestId,
      status: businessResponse.status,
    });
    businessResponse.headers.set('X-Request-Id', requestId);
    return businessResponse;
  }

  recordX402Settlement({
    requestId,
    status: 'business_succeeded',
    ...paymentAuditFields(result.paymentRequirements),
    surface: 'rest',
    resource: request.nextUrl.pathname,
    responseTimeMs: Date.now() - businessStartedAt,
  });

  const settlementStartedAt = Date.now();
  const settle = await httpServer.processSettlement(
    result.paymentPayload,
    result.paymentRequirements
  );

  for (const [key, value] of Object.entries(settle.headers ?? {})) {
    businessResponse.headers.set(key, value);
  }
  logBazaarExtensionStatus(requestId, settle.headers);

  if (settle.success) {
    // The CDP v2 settle response omits `amount`, and the exact scheme always
    // settles the issued requirements, so the configured atomic amount is the
    // deterministic charge. Verdict is lifted from the business body
    // (best-effort clone) so audit rows carry the check outcome.
    const atomic = settle.amount ?? result.paymentRequirements.amount;
    const amountUsdc = atomicUnitsToUsdc(String(atomic));
    const requirementAudit = paymentAuditFields(result.paymentRequirements);
    let verdict: string | undefined;
    try {
      const body = (await businessResponse.clone().json()) as {
        data?: { verdict?: unknown };
        verdict?: unknown;
      };
      const raw = body?.data?.verdict ?? body?.verdict;
      if (typeof raw === 'string') verdict = raw;
    } catch {
      // Body parse is best-effort; the audit row stays useful without it.
    }
    recordX402Settlement({
      requestId,
      status: 'settled',
      txHash: settle.transaction,
      payer: settle.payer,
      amountUsdc,
      network: requirementAudit.network,
      asset: requirementAudit.asset,
      surface: 'rest',
      resource: request.nextUrl.pathname,
      responseTimeMs: Date.now() - settlementStartedAt,
      verdict,
    });
  } else {
    recordX402Settlement({
      requestId,
      status: 'settlement_failed',
      ...paymentAuditFields(result.paymentRequirements),
      surface: 'rest',
      resource: request.nextUrl.pathname,
      responseTimeMs: Date.now() - settlementStartedAt,
      errorReason: settle.errorReason,
    });
    logger.warn('x402 settlement failed after successful check', {
      requestId,
      errorReason: settle.errorReason,
    });
  }

  businessResponse.headers.set('X-Request-Id', requestId);
  return businessResponse;
}
