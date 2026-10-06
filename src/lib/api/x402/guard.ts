import { after, type NextRequest, NextResponse } from 'next/server';

import { type HTTPAdapter, type HTTPResponseInstructions } from '@x402/core/server';

import { createServiceRoleClient } from '@/lib/supabase/server';
import { createLogger } from '@/lib/utils/logger';

import { type X402Config } from './config';
import { getX402HttpServer } from './resourceServer';

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
  status: 'settled' | 'settlement_failed' | 'verify_failed';
  txHash?: string;
  payer?: string;
  amountUsdc?: string;
  network: string;
  asset?: string;
  verdict?: string;
  errorReason?: string;
}

/**
 * Best-effort settlement audit row. Uses the service-role client (RLS-denied
 * table) and never throws: billing must not break the paid response path.
 * `after()` extends the serverless lifetime; outside a request work store
 * (unit tests) it degrades to a fire-and-forget promise.
 */
export function recordX402Settlement(audit: X402SettlementAudit): void {
  const task = async () => {
    try {
      const client = createServiceRoleClient();
      const { error } = await client.from('x402_settlements').insert({
        request_id: audit.requestId,
        status: audit.status,
        tx_hash: audit.txHash ?? null,
        payer: audit.payer ?? null,
        amount_usdc: audit.amountUsdc ?? null,
        network: audit.network,
        asset: audit.asset ?? null,
        verdict: audit.verdict ?? null,
        error_reason: audit.errorReason ?? null,
      });
      if (error) {
        logger.warn('x402 settlement audit insert failed', { error: error.message });
      }
    } catch (error) {
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
  runBusiness: () => Promise<NextResponse>
): Promise<NextResponse> {
  const requestId = newRequestId();
  const httpServer = await getX402HttpServer(cfg);

  const result = await httpServer.processHTTPRequest({
    adapter: new NextRequestAdapter(request),
    path: request.nextUrl.pathname,
    method: request.method,
  });

  if (result.type === 'payment-error') {
    logger.info('x402 payment required / rejected', {
      requestId,
      path: request.nextUrl.pathname,
    });
    return toNextResponse(result.response);
  }

  if (result.type === 'no-payment-required') {
    // The only registered route is protected, so this branch is defensive.
    logger.warn('x402 server classified protected request as unpaid', { requestId });
    return toNextResponse({
      status: 402,
      headers: { 'Cache-Control': 'no-store' },
      body: { error: 'X402_PAYMENT_REQUIRED' },
    });
  }

  // payment-verified: business first, settle only on 2xx.
  let businessResponse: NextResponse;
  try {
    businessResponse = await runBusiness();
  } catch (error) {
    recordX402Settlement({
      requestId,
      status: 'verify_failed',
      network: cfg.network,
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
      status: 'verify_failed',
      network: cfg.network,
      errorReason: `handler_failed:${businessResponse.status}`,
    });
    logger.info('x402 business response non-2xx, settlement skipped', {
      requestId,
      status: businessResponse.status,
    });
    return businessResponse;
  }

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
    const atomic = settle.amount ?? cfg.amountAtomic;
    const amountUsdc = String(Number(atomic) / 1_000_000);
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
      network: cfg.network,
      verdict,
    });
  } else {
    recordX402Settlement({
      requestId,
      status: 'settlement_failed',
      network: cfg.network,
      errorReason: settle.errorReason,
    });
    logger.warn('x402 settlement failed after successful check', {
      requestId,
      errorReason: settle.errorReason,
    });
  }

  return businessResponse;
}
