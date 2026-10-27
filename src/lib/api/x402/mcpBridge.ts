import { after } from 'next/server';

import { type HTTPAdapter, type HTTPResponseInstructions } from '@x402/core/server';

import { getToolCreditCost } from '@/lib/billing/metering';
import { enqueueReputationAnchor } from '@/lib/erc8004/reputationAnchor';
import { createLogger } from '@/lib/utils/logger';

import { type X402Config, X402_CREDIT_USD, X402_MCP_ROUTE } from './config';
import {
  atomicUnitsToUsdc,
  logBazaarExtensionStatus,
  paymentAuditFields,
  recordX402Settlement,
  x402ResponseBody,
} from './guard';
import { getMcpX402HttpServer } from './resourceServer';

const logger = createLogger('x402-mcp-bridge');

/**
 * x402 pay-per-call bridge for the MCP streamable-HTTP endpoint.
 *
 * Unauthenticated `tools/call` requests on /api/mcp are metered on-chain via
 * x402 v2 instead of credit wallets:
 *   1. no PAYMENT-SIGNATURE → a 402 quote whose USDC amount is derived from
 *      the tool's metering class (the "pricing bridge": 1 credit = $0.004,
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
 * USDC atomic units (6 decimals) for one call of `toolName`: credit cost ×
 * the per-credit USD factor, floored onto the micro-dollar grid with integer
 * math. A zero/negative result can only come from a zero cost, which the
 * metering table never produces (C1 = 0.5); still guarded so a misconfigured
 * table can never mint a free-quote.
 */
export function priceAtomicForTool(toolName: string): string {
  const microUsd = Math.round(getToolCreditCost(toolName) * X402_CREDIT_USD * 1_000_000);
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
  logger.info('x402 MCP indexer probe quote issued', { requestId, priceAtomic: price });
  return attachRequestId(toResponse(result.response), requestId);
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
  const httpServer = await getMcpX402HttpServer(cfg, priceAtomicForTool(toolName));
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
    logger.info('x402 MCP payment required / rejected', {
      requestId,
      toolName,
      priceAtomic: priceAtomicForTool(toolName),
    });
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
      });
    }
    return attachRequestId(toResponse(result.response), requestId);
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
    });
    logger.info('x402 MCP business failed, settlement skipped', {
      requestId,
      toolName,
      status: businessResponse.status,
      jsonRpcFailed,
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
    });
    logger.warn('x402 MCP settlement failed after successful tool call', {
      requestId,
      toolName,
      errorReason: settle.errorReason,
    });
  }

  return attachRequestId(businessResponse, requestId);
}
