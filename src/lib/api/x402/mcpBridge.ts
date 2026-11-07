import { after } from 'next/server';

import { type HTTPAdapter, type HTTPResponseInstructions } from '@x402/core/server';

import { applyCreditBillingHeaders } from '@/lib/billing/billingHeaders';
import { isFreeVerifyCall } from '@/lib/billing/freeVerify';
import { getMcpToolBillableItems } from '@/lib/billing/metering';
import {
  getMcpToolCreditCostForCall,
  isEntitlementCoveredMcpTool,
  PRODUCT_MCP_TOOL_USD_PRICES,
} from '@/lib/billing/productPricing';
import { enqueueReputationAnchor } from '@/lib/erc8004/reputationAnchor';
import { createLogger } from '@/lib/utils/logger';

import {
  x402ConfigForPaymentScope,
  x402PaymentScopeForMcpTool,
  type X402PaymentScope,
} from './capabilityPayment';
import { type X402Config, usdToAtomicUnits, X402_CREDIT_USD, X402_MCP_ROUTE } from './config';
import {
  atomicUnitsToUsdc,
  logBazaarExtensionStatus,
  paymentAuditFields,
  recordX402Settlement,
  x402AcquisitionSource,
  x402OnboardingHeaders,
  x402ResponseBody,
} from './guard';
import {
  coreUsdAmountFromAtomic,
  createHypercoreFacilitatorClient,
  hypercorePayloadFromHeader,
  type HypercoreX402Config,
} from './hypercore';
import { BASE_AGENT_SWAP_GUARD_MCP_TOOL_NAME, getMcpX402HttpServer } from './resourceServer';

const logger = createLogger('x402-mcp-bridge');

// Directory crawlers legitimately ask for unsigned quotes before deciding to
// pay. Sample those routine events, but keep every signed rejection and every
// completed-payment lifecycle event visible to operators.
const UNSIGNED_MCP_QUOTE_LOG_SAMPLE_EVERY = 100;
let unsignedMcpQuoteLogCount = 0;

function logUnsignedMcpQuoteSample(
  event: 'indexer quote issued' | 'payment quote issued',
  fields: { requestId: string; priceAtomic: string; toolName?: string }
): void {
  unsignedMcpQuoteLogCount += 1;
  if (
    unsignedMcpQuoteLogCount !== 1 &&
    unsignedMcpQuoteLogCount % UNSIGNED_MCP_QUOTE_LOG_SAMPLE_EVERY !== 0
  ) {
    return;
  }
  logger.info(`x402 MCP ${event}`, {
    ...fields,
    sampleEvery: UNSIGNED_MCP_QUOTE_LOG_SAMPLE_EVERY,
    sampleOrdinal: unsignedMcpQuoteLogCount,
  });
}

/**
 * x402 pay-per-call bridge for the MCP streamable-HTTP endpoint.
 *
 * Unauthenticated `tools/call` requests on /api/mcp are metered on-chain via
 * x402 v2 instead of credit wallets:
 *   1. no PAYMENT-SIGNATURE → a 402 quote whose amount is derived from the
 *      tool's metering class (the "pricing bridge": 1 credit = $0.001,
 *      anchored to the REST pre-trade tier's $0.02 for C3);
 *   2. valid PAYMENT-SIGNATURE → the JSON-RPC call is dispatched first and
 *      settlement runs only after a 2xx response whose JSON-RPC result is not
 *      `isError` — a failed tool call never charges.
 *
 * Both POSTs in the 402 handshake carry the identical JSON-RPC body, so the
 * tool name (and therefore the price) is stable across quote and settle.
 */

/** Minimal HTTPAdapter bridge from a plain Request into the x402 core server. */
class PlainRequestAdapter implements HTTPAdapter {
  constructor(private readonly request: Request) {}

  getHeader(name: string): string | undefined {
    return this.request.headers.get(name) ?? undefined;
  }

  getMethod(): string {
    return this.request.method;
  }

  getPath(): string {
    // The route is fixed: /api/mcp is served both by the Next.js route and by
    // the standalone MCP HTTP server, whose URLs differ in origin/port.
    return X402_MCP_ROUTE;
  }

  getUrl(): string {
    return this.request.url;
  }

  getAcceptHeader(): string {
    return this.request.headers.get('accept') ?? '';
  }

  getUserAgent(): string {
    return this.request.headers.get('user-agent') ?? '';
  }

  getQueryParams(): Record<string, string> {
    return Object.fromEntries(new URL(this.request.url).searchParams.entries());
  }
}

/** Translate x402 HTTP response instructions into a plain Response. */
export function toResponse(instructions: HTTPResponseInstructions): Response {
  const body = x402ResponseBody(instructions);
  const payload = typeof body === 'string' ? body : JSON.stringify(body);
  return new Response(payload, {
    status: instructions.status,
    headers: instructions.headers ?? {},
  });
}

/**
 * USDC atomic units (6 decimals) for one call of `toolName`: the product list
 * price for a product begin tool, otherwise credit cost × the per-credit USD
 * factor, floored onto the micro-dollar grid with integer math. A zero/negative
 * result can only come from a zero cost, which the metering table never
 * produces (C1 = 2); still guarded so a misconfigured table can never mint a
 * free-quote.
 */
export function priceAtomicForTool(toolName: string, args?: unknown): string {
  if (isFreeVerifyCall(toolName, args)) return '0';
  const productUsd = PRODUCT_MCP_TOOL_USD_PRICES[toolName];
  if (productUsd !== undefined) {
    // Product purchases quote the plan's USD list price directly — the same
    // value the REST begin route charges — never a per-call class price.
    return usdToAtomicUnits(productUsd);
  }
  // Batch tools charge per requested item, so the quote must scale with the
  // item count carried in the arguments. Non-batch tools are one item.
  const microUsd = Math.round(
    getMcpToolCreditCostForCall(toolName, args) * X402_CREDIT_USD * 1_000_000
  );
  return String(Math.max(1, microUsd));
}

/**
 * Quote an unauthenticated GET probe of the MCP endpoint. Directory indexers
 * (CDP Bazaar's validator among them) probe the resource URL with GET and
 * require the x402 402 challenge; the streamable transport's protocol 405
 * reads as "unindexable" to them. The challenge mirrors the canonical POST
 * tools/call quote for the flagship tool so the discovery metadata keeps the
 * resource's real method and shape; the actual per-tool price is still issued
 * by the POST handshake, where the requested tool name is known.
 */
export async function handleMcpIndexerQuote(request: Request, cfg: X402Config): Promise<Response> {
  const requestId = newRequestId();
  const price = priceAtomicForTool(REPUTATION_OPT_IN_TOOL);
  const httpServer = await getMcpX402HttpServer(cfg, price);
  const result = await httpServer.processHTTPRequest({
    adapter: new PlainRequestAdapter(request),
    path: X402_MCP_ROUTE,
    method: 'POST',
  });
  if (result.type !== 'payment-error' || request.headers.has('payment-signature')) {
    return new Response(
      JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Method not allowed.' },
        id: null,
      }),
      { status: 405, headers: { 'Content-Type': 'application/json', Allow: 'POST' } }
    );
  }
  // A directory's initial GET is only a non-binding quote. Persisting every
  // crawl through after() keeps the Vercel function alive for a Supabase
  // write without adding settlement evidence. Match the REST x402 guard:
  // audit signatures that were rejected and all verified/settled payments,
  // but leave an unsigned quote to request logs and edge metrics.
  logUnsignedMcpQuoteSample('indexer quote issued', { requestId, priceAtomic: price });
  return attachRequestId(attachOnboardingHeaders(toResponse(result.response)), requestId);
}

/**
 * True when the JSON-RPC response represents a failed tool execution
 * (`result.isError` or a JSON-RPC-level `error`). Best-effort: an
 * unparseable body counts as failed — never charge on ambiguity.
 */
async function isMcpToolFailure(response: Response): Promise<boolean> {
  try {
    const body = (await response.clone().json()) as {
      error?: unknown;
      result?: { isError?: unknown };
    };
    if (body?.error != null) return true;
    return body?.result?.isError === true;
  } catch {
    return true;
  }
}

/** ERC-8004 reputation opt-in declared in the tool arguments (pre-trade tool only). */
const REPUTATION_OPT_IN_TOOL = 'pre_trade_safety_check';

/**
 * Read the caller's ERC-8004 reputation opt-in from the JSON-RPC arguments
 * without consuming the original request (the transport still needs the body,
 * hence the clone). Returns a no-op result for every other tool, a missing or
 * invalid agentId, or an unparseable body — anchoring then never happens.
 */
async function extractReputationOptIn(
  request: Request,
  toolName: string
): Promise<{ optedIn: boolean; agentId: number | null }> {
  if (toolName !== REPUTATION_OPT_IN_TOOL) return { optedIn: false, agentId: null };
  try {
    const body = (await request.clone().json()) as {
      params?: { arguments?: { reputationOptIn?: unknown; reputationAgentId?: unknown } };
    };
    const args = body?.params?.arguments;
    if (!args || args.reputationOptIn !== true) return { optedIn: false, agentId: null };
    const agentId = Number(args.reputationAgentId);
    if (!Number.isInteger(agentId) || agentId <= 0) return { optedIn: false, agentId: null };
    return { optedIn: true, agentId };
  } catch {
    return { optedIn: false, agentId: null };
  }
}

/** Read JSON-RPC arguments from a clone so the MCP transport retains the body. */
async function extractMcpToolArguments(request: Request): Promise<unknown> {
  try {
    const body = (await request.clone().json()) as { params?: { arguments?: unknown } };
    return body?.params?.arguments;
  } catch {
    return undefined;
  }
}

function unavailablePaymentScopeResponse(
  toolName: string,
  scope: X402PaymentScope | null
): Response {
  const scopeLabel = scope?.label ?? 'the declared execution chain';
  return new Response(
    JSON.stringify({
      error: 'X402_PAYMENT_RAIL_UNAVAILABLE',
      message: `${toolName} requires a matching x402 payment rail for ${scopeLabel}; Insight will not substitute another chain.`,
    }),
    {
      status: 503,
      headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Lift the verdict and attestation UID from the pre-trade tool's markdown
 * result text (best-effort clone of the JSON-RPC response). The verdict line
 * is `**Verdict: <emoji> PASS**`; the UID line is `- UID: 0x…64-hex…`. A parse
 * failure or absent fields simply anchor with `unknown` / a zero hash.
 */
async function extractMcpVerdictAndUid(
  response: Response
): Promise<{ verdict?: string; attestationUid?: string }> {
  try {
    const body = (await response.clone().json()) as {
      result?: { content?: Array<{ type?: unknown; text?: unknown }> };
    };
    const text = (body?.result?.content ?? [])
      .filter((part) => part?.type === 'text' && typeof part.text === 'string')
      .map((part) => part.text as string)
      .join('\n');
    const uidMatch = text.match(/UID:\s*(0x[0-9a-fA-F]{64})/);
    const verdictMatch = text.match(/Verdict:\s*(?:[^*\n]*?)\b(PASS|CAUTION|DANGER|BLOCK)\b/);
    return { verdict: verdictMatch?.[1], attestationUid: uidMatch?.[1] };
  } catch {
    return {};
  }
}

function newRequestId(): string {
  return `req_${crypto.randomUUID().replace(/-/g, '')}`;
}

function attachRequestId(response: Response, requestId: string): Response {
  response.headers.set('X-Request-Id', requestId);
  return response;
}

/**
 * Attach the same advisory onboarding headers the REST x402 guard emits. The
 * MCP endpoint is the surface agents actually probe first; without these, a
 * bare 402 there gives a machine client no install command and no wallet-free
 * credit path, even though the REST route does. Hints only — the payment body,
 * price, accepts[] and verify/settle path are untouched. Signed-but-rejected
 * requests keep the exact x402 lifecycle response shape, as on REST.
 */
function attachOnboardingHeaders(response: Response): Response {
  for (const [name, value] of Object.entries(x402OnboardingHeaders())) {
    response.headers.set(name, value);
  }
  return response;
}

function encodePaymentHeader(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64');
}

/** Canonical `X-Credit-*` receipt for an x402-paid MCP call. */
function attachX402BillingReceipt(
  response: Response,
  input: {
    toolName: string;
    priceCredits: number;
    priceAtomic: string;
    items: number;
    status: 'quote' | 'charged' | 'not_charged';
    exemption?: string;
  }
): void {
  applyCreditBillingHeaders(response.headers, {
    costCredits: input.priceCredits,
    balance: null,
    balanceAfter: null,
    status:
      input.exemption === 'insufficient_data'
        ? 'waived'
        : input.exemption
          ? 'not_charged'
          : input.status,
  });
  // The on-chain quote is the authoritative USD amount; keep it exact rather
  // than recomputing from the credits list price.
  response.headers.set('X-Credit-Price-USD', atomicUnitsToUsdc(input.priceAtomic));
}

/**
 * HyperCore Core-USDC lifecycle for MCP calls. Core `usdSend` is not an
 * ERC-20 transfer, so it cannot ride the stock exact-scheme x402 server; this
 * mirrors the REST guard's quote → verify → business → settle ordering with
 * plain Request/Response and the `mcp` audit surface.
 */
async function handleHypercoreMcpCall(input: {
  request: Request;
  config: HypercoreX402Config;
  toolName: string;
  priceAtomic: string;
  priceCredits: number;
  items: number;
  requestId: string;
  acquisitionSource: ReturnType<typeof x402AcquisitionSource>;
  runBusiness: () => Promise<Response>;
}): Promise<Response> {
  const { request, config, toolName, priceAtomic, priceCredits, items, requestId } = input;
  const client = createHypercoreFacilitatorClient(config);
  const paymentPayload = hypercorePayloadFromHeader(
    request.headers.get('payment-signature'),
    config
  );

  // No HyperCore payment attached: issue the canonical 402 quote. This is the
  // path that used to fail with X402_PAYMENT_RAIL_UNAVAILABLE.
  if (!paymentPayload) {
    try {
      const requirement = await client.quote(request.url, coreUsdAmountFromAtomic(priceAtomic));
      const body = {
        x402Version: 2,
        error: 'Payment required',
        resource: {
          url: request.url,
          mimeType: 'application/json',
          serviceName: 'Insight Oracle',
        },
        accepts: [requirement],
      };
      const response = new Response(JSON.stringify(body), {
        status: 402,
        headers: {
          'content-type': 'application/json',
          'payment-required': encodePaymentHeader(body),
          'cache-control': 'no-store',
        },
      });
      attachOnboardingHeaders(response);
      attachX402BillingReceipt(response, {
        toolName,
        priceCredits,
        priceAtomic,
        items,
        status: 'quote',
      });
      logUnsignedMcpQuoteSample('payment quote issued', { requestId, toolName, priceAtomic });
      return attachRequestId(response, requestId);
    } catch (error) {
      logger.warn('HyperCore facilitator quote unavailable for MCP call', {
        requestId,
        toolName,
        error: error instanceof Error ? error.message : String(error),
      });
      return attachRequestId(unavailablePaymentScopeResponse(toolName, null), requestId);
    }
  }

  const startedAt = Date.now();
  let verification: { isValid: boolean; payer?: string; invalidReason?: string };
  try {
    verification = await client.verify(paymentPayload);
  } catch (error) {
    logger.warn('HyperCore facilitator verification unavailable', {
      requestId,
      toolName,
      error: error instanceof Error ? error.message : String(error),
    });
    return attachRequestId(
      new Response(JSON.stringify({ error: 'HYPERCORE_FACILITATOR_UNAVAILABLE', requestId }), {
        status: 503,
        headers: { 'cache-control': 'no-store', 'content-type': 'application/json' },
      }),
      requestId
    );
  }

  if (!verification.isValid) {
    recordX402Settlement({
      requestId,
      status: 'payment_rejected',
      network: config.network,
      surface: 'mcp',
      resource: `mcp:${toolName}`,
      responseTimeMs: Date.now() - startedAt,
      errorReason: verification.invalidReason ?? 'facilitator_rejected_payment',
      acquisitionSource: input.acquisitionSource,
    });
    const body = {
      x402Version: 2,
      error: 'Payment verification failed',
      resource: { url: request.url, mimeType: 'application/json', serviceName: 'Insight Oracle' },
      accepts: [await client.quote(request.url, coreUsdAmountFromAtomic(priceAtomic))],
    };
    const response = new Response(JSON.stringify(body), {
      status: 402,
      headers: {
        'content-type': 'application/json',
        'payment-required': encodePaymentHeader(body),
        'cache-control': 'no-store',
      },
    });
    attachX402BillingReceipt(response, {
      toolName,
      priceCredits,
      priceAtomic,
      items,
      status: 'not_charged',
      exemption: 'payment_rejected',
    });
    return attachRequestId(response, requestId);
  }

  const amountUsdc = coreUsdAmountFromAtomic(priceAtomic);
  recordX402Settlement({
    requestId,
    status: 'payment_verified',
    network: config.network,
    asset: 'USDC',
    amountUsdc,
    payer: verification.payer,
    surface: 'mcp',
    resource: `mcp:${toolName}`,
    responseTimeMs: Date.now() - startedAt,
    acquisitionSource: input.acquisitionSource,
  });

  const businessStartedAt = Date.now();
  let businessResponse: Response;
  try {
    businessResponse = await input.runBusiness();
  } catch (error) {
    recordX402Settlement({
      requestId,
      status: 'business_failed',
      network: config.network,
      asset: 'USDC',
      amountUsdc,
      payer: verification.payer,
      surface: 'mcp',
      resource: `mcp:${toolName}`,
      errorReason: `handler_error:${error instanceof Error ? error.name : 'unknown'}`,
      acquisitionSource: input.acquisitionSource,
    });
    throw error;
  }

  const toolFailed = businessResponse.status < 200 || businessResponse.status >= 300;
  const jsonRpcFailed = toolFailed ? false : await isMcpToolFailure(businessResponse);
  if (toolFailed || jsonRpcFailed) {
    recordX402Settlement({
      requestId,
      status: 'business_failed',
      network: config.network,
      asset: 'USDC',
      amountUsdc,
      payer: verification.payer,
      surface: 'mcp',
      resource: `mcp:${toolName}`,
      errorReason: toolFailed ? `handler_failed:${businessResponse.status}` : 'mcp_tool_error',
      acquisitionSource: input.acquisitionSource,
    });
    attachX402BillingReceipt(businessResponse, {
      toolName,
      priceCredits,
      priceAtomic,
      items,
      status: 'not_charged',
      exemption: 'failed',
    });
    return attachRequestId(businessResponse, requestId);
  }

  let settlement: Awaited<ReturnType<typeof client.settle>>;
  try {
    settlement = await client.settle(paymentPayload);
  } catch (error) {
    logger.warn('HyperCore facilitator settlement unavailable', {
      requestId,
      toolName,
      error: error instanceof Error ? error.message : String(error),
    });
    businessResponse.headers.set(
      'payment-response',
      encodePaymentHeader({
        success: false,
        network: config.network,
        errorReason: 'settlement_pending',
      })
    );
    attachX402BillingReceipt(businessResponse, {
      toolName,
      priceCredits,
      priceAtomic,
      items,
      status: 'not_charged',
      exemption: 'settlement_pending',
    });
    return attachRequestId(businessResponse, requestId);
  }

  businessResponse.headers.set('payment-response', encodePaymentHeader(settlement));
  if (settlement.success) {
    recordX402Settlement({
      requestId,
      status: 'settled',
      network: config.network,
      asset: 'USDC',
      amountUsdc,
      payer: settlement.payer ?? verification.payer,
      txHash: settlement.transaction,
      surface: 'mcp',
      resource: `mcp:${toolName}`,
      responseTimeMs: Date.now() - businessStartedAt,
      verdict: `mcp:${toolName}`,
      acquisitionSource: input.acquisitionSource,
    });
    attachX402BillingReceipt(businessResponse, {
      toolName,
      priceCredits,
      priceAtomic,
      items,
      status: 'charged',
    });
  } else {
    recordX402Settlement({
      requestId,
      status: 'settlement_failed',
      network: config.network,
      asset: 'USDC',
      amountUsdc,
      payer: settlement.payer ?? verification.payer,
      surface: 'mcp',
      resource: `mcp:${toolName}`,
      responseTimeMs: Date.now() - businessStartedAt,
      errorReason: settlement.errorReason ?? 'settlement_pending',
      acquisitionSource: input.acquisitionSource,
    });
    attachX402BillingReceipt(businessResponse, {
      toolName,
      priceCredits,
      priceAtomic,
      items,
      status: 'not_charged',
      exemption: 'settlement_failed',
    });
  }
  return attachRequestId(businessResponse, requestId);
}

export interface McpPaidCallInput {
  request: Request;
  cfg: X402Config;
  toolName: string;
  /** Dispatch the JSON-RPC body through the MCP transport. */
  runBusiness: () => Promise<Response>;
}

/**
 * Run the x402 lifecycle for one MCP tools/call. Mirrors
 * handlePaidPreTradeRequest: quote on payment-error, business first, settle
 * only on a successful tool result. Never throws on payment failure paths —
 * only a genuine internal error propagates.
 */
export async function handleMcpPaidToolCall({
  request,
  cfg,
  toolName,
  runBusiness,
}: McpPaidCallInput): Promise<Response> {
  const requestId = newRequestId();
  // In-window product tools (poll/close/guard/receipt/close-summary) are
  // covered by the purchase that returned their one-time token; the token in
  // the tool arguments is the entitlement check and fails closed without it.
  // No x402 lifecycle runs, so a window buyer is never re-charged per call.
  if (isEntitlementCoveredMcpTool(toolName)) {
    return attachRequestId(await runBusiness(), requestId);
  }
  const args = await extractMcpToolArguments(request);
  // Offline verification kinds need no upstream read, so they are free. A
  // caller that still attaches a payment signature is rejected explicitly
  // instead of silently settling a zero-value transfer.
  if (isFreeVerifyCall(toolName, args)) {
    if (request.headers.has('payment-signature')) {
      return attachRequestId(
        new Response(
          JSON.stringify({
            jsonrpc: '2.0',
            error: {
              code: -32000,
              message: 'This verification kind is free; do not attach a payment-signature.',
            },
            id: null,
          }),
          { status: 400, headers: { 'content-type': 'application/json' } }
        ),
        requestId
      );
    }
    return attachRequestId(await runBusiness(), requestId);
  }
  const priceAtomic = priceAtomicForTool(toolName, args);
  const priceCredits = getMcpToolCreditCostForCall(toolName, args);
  const billableItems = getMcpToolBillableItems(toolName, args);
  const paymentScope = x402PaymentScopeForMcpTool(toolName, args);
  const paymentConfig = paymentScope ? x402ConfigForPaymentScope(cfg, paymentScope) : null;
  if (!paymentConfig) {
    return attachRequestId(unavailablePaymentScopeResponse(toolName, paymentScope), requestId);
  }

  // HyperCore Core-USDC has its own verify/settle lifecycle; it must never be
  // routed through the stock EVM x402 server.
  if (paymentScope?.kind === 'hypercore') {
    if (!cfg.hypercore) {
      return attachRequestId(unavailablePaymentScopeResponse(toolName, paymentScope), requestId);
    }
    return handleHypercoreMcpCall({
      request,
      config: cfg.hypercore,
      toolName,
      priceAtomic,
      priceCredits,
      items: billableItems,
      requestId,
      acquisitionSource: x402AcquisitionSource(request),
      runBusiness,
    });
  }

  const isBaseAgentSwapGuard = toolName === BASE_AGENT_SWAP_GUARD_MCP_TOOL_NAME;
  let httpServer: Awaited<ReturnType<typeof getMcpX402HttpServer>>;
  try {
    httpServer = await getMcpX402HttpServer(
      paymentConfig,
      priceAtomic,
      isBaseAgentSwapGuard ? toolName : undefined
    );
  } catch (error) {
    logger.warn('x402 MCP payment rail unavailable', {
      requestId,
      toolName,
      paymentScope: paymentScope?.kind ?? 'undeclared',
      errorName: error instanceof Error ? error.name : 'unknown',
    });
    return attachRequestId(unavailablePaymentScopeResponse(toolName, paymentScope), requestId);
  }
  const acquisitionSource = x402AcquisitionSource(request);
  const requestStartedAt = Date.now();
  // Clone-read before the transport consumes the body in runBusiness.
  const reputation = await extractReputationOptIn(request, toolName);

  const result = await httpServer.processHTTPRequest({
    adapter: new PlainRequestAdapter(request),
    path: X402_MCP_ROUTE,
    method: request.method,
  });

  if (result.type === 'payment-error') {
    const hasPaymentSignature = request.headers.has('payment-signature');
    // A bare quote is not a billing event. It is especially common when a
    // catalog crawler is deciding whether to pay, so do not turn it into an
    // after()-scheduled Supabase insert. A signed but rejected request is
    // materially different and remains an auditable payment lifecycle event.
    if (hasPaymentSignature) {
      recordX402Settlement({
        requestId,
        status: 'payment_rejected',
        network: null,
        surface: 'mcp',
        resource: `mcp:${toolName}`,
        responseTimeMs: Date.now() - requestStartedAt,
        errorReason: 'facilitator_rejected_payment',
        acquisitionSource,
      });
      logger.warn('x402 MCP payment rejected', { requestId, toolName, priceAtomic });
    } else {
      logUnsignedMcpQuoteSample('payment quote issued', { requestId, toolName, priceAtomic });
    }
    const response = toResponse(result.response);
    if (!hasPaymentSignature) {
      attachOnboardingHeaders(response);
    }
    attachX402BillingReceipt(response, {
      toolName,
      priceCredits,
      priceAtomic,
      items: billableItems,
      status: hasPaymentSignature ? 'not_charged' : 'quote',
      exemption: hasPaymentSignature ? 'payment_rejected' : undefined,
    });
    return attachRequestId(response, requestId);
  }

  if (result.type === 'no-payment-required') {
    // The route is registered and protected, so this branch is defensive.
    logger.warn('x402 server classified MCP request as unpaid', { requestId });
    return attachRequestId(
      toResponse({
        status: 402,
        headers: { 'Cache-Control': 'no-store' },
        body: { error: 'X402_PAYMENT_REQUIRED' },
      }),
      requestId
    );
  }

  recordX402Settlement({
    requestId,
    status: 'payment_verified',
    ...paymentAuditFields(result.paymentRequirements),
    surface: 'mcp',
    resource: `mcp:${toolName}`,
    responseTimeMs: Date.now() - requestStartedAt,
    acquisitionSource,
  });

  // payment-verified: dispatch first, settle only on success.
  const businessStartedAt = Date.now();
  let businessResponse: Response;
  try {
    businessResponse = await runBusiness();
  } catch (error) {
    recordX402Settlement({
      requestId,
      status: 'business_failed',
      ...paymentAuditFields(result.paymentRequirements),
      surface: 'mcp',
      resource: `mcp:${toolName}`,
      responseTimeMs: Date.now() - businessStartedAt,
      errorReason: `handler_error:${error instanceof Error ? error.name : 'unknown'}`,
      acquisitionSource,
    });
    throw error;
  }

  const toolFailed = businessResponse.status < 200 || businessResponse.status >= 300;
  const jsonRpcFailed = toolFailed ? false : await isMcpToolFailure(businessResponse);

  if (toolFailed || jsonRpcFailed) {
    // Verified signature but no completed tool result: nothing is charged.
    // Audit as verify-only so the operator can see paid-call failure rates.
    recordX402Settlement({
      requestId,
      status: 'business_failed',
      ...paymentAuditFields(result.paymentRequirements),
      surface: 'mcp',
      resource: `mcp:${toolName}`,
      responseTimeMs: Date.now() - businessStartedAt,
      errorReason: toolFailed ? `handler_failed:${businessResponse.status}` : 'mcp_tool_error',
      acquisitionSource,
    });
    logger.info('x402 MCP business failed, settlement skipped', {
      requestId,
      toolName,
      status: businessResponse.status,
      jsonRpcFailed,
    });
    attachX402BillingReceipt(businessResponse, {
      toolName,
      priceCredits,
      priceAtomic,
      items: billableItems,
      status: 'not_charged',
      exemption: 'failed',
    });
    return attachRequestId(businessResponse, requestId);
  }

  recordX402Settlement({
    requestId,
    status: 'business_succeeded',
    ...paymentAuditFields(result.paymentRequirements),
    surface: 'mcp',
    resource: `mcp:${toolName}`,
    responseTimeMs: Date.now() - businessStartedAt,
    acquisitionSource,
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
    const atomic = settle.amount ?? result.paymentRequirements.amount;
    const requirementAudit = paymentAuditFields(result.paymentRequirements);
    const amountUsdc = requirementAudit.amountUsdc ?? atomicUnitsToUsdc(String(atomic));
    recordX402Settlement({
      requestId,
      status: 'settled',
      txHash: settle.transaction,
      payer: settle.payer,
      amountUsdc,
      network: requirementAudit.network,
      asset: requirementAudit.asset,
      surface: 'mcp',
      resource: `mcp:${toolName}`,
      responseTimeMs: Date.now() - settlementStartedAt,
      // Reuse the verdict column to record which MCP tool was paid for.
      verdict: `mcp:${toolName}`,
      acquisitionSource,
    });

    if (reputation.optedIn && reputation.agentId != null) {
      // Best-effort: parse the result in-request, defer only the DB insert
      // past the response via after() (same pattern as the REST pre-trade
      // hook). enqueueReputationAnchor never throws.
      const observed = await extractMcpVerdictAndUid(businessResponse);
      const anchorInput = {
        requestId,
        payer: settle.payer ?? '',
        agentId: reputation.agentId,
        verdict: observed.verdict,
        attestationUid: observed.attestationUid,
        paymentNetwork: requirementAudit.network,
        paymentTxHash: settle.transaction ?? null,
        amountUsdc,
      };
      try {
        after(() => enqueueReputationAnchor(anchorInput));
      } catch {
        void enqueueReputationAnchor(anchorInput);
      }
    }
  } else {
    recordX402Settlement({
      requestId,
      status: 'settlement_failed',
      ...paymentAuditFields(result.paymentRequirements),
      surface: 'mcp',
      resource: `mcp:${toolName}`,
      responseTimeMs: Date.now() - settlementStartedAt,
      errorReason: settle.errorReason,
      acquisitionSource,
    });
    logger.warn('x402 MCP settlement failed after successful tool call', {
      requestId,
      toolName,
      errorReason: settle.errorReason,
    });
    attachX402BillingReceipt(businessResponse, {
      toolName,
      priceCredits,
      priceAtomic,
      items: billableItems,
      status: 'not_charged',
      exemption: 'settlement_failed',
    });
  }

  if (settle.success) {
    attachX402BillingReceipt(businessResponse, {
      toolName,
      priceCredits,
      priceAtomic,
      items: billableItems,
      status: 'charged',
    });
  }

  return attachRequestId(businessResponse, requestId);
}
