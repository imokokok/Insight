import { type HTTPAdapter, type HTTPResponseInstructions } from '@x402/core/server';

import { getToolCreditCost } from '@/lib/billing/metering';
import { createLogger } from '@/lib/utils/logger';

import { type X402Config, X402_CREDIT_USD, X402_MCP_ROUTE } from './config';
import { logBazaarExtensionStatus, recordX402Settlement } from './guard';
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
  const body = instructions.body === undefined ? null : instructions.body;
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

function newRequestId(): string {
  return `req_${crypto.randomUUID().replace(/-/g, '')}`;
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

  const result = await httpServer.processHTTPRequest({
    adapter: new PlainRequestAdapter(request),
    path: X402_MCP_ROUTE,
    method: request.method,
  });

  if (result.type === 'payment-error') {
    logger.info('x402 MCP payment required / rejected', {
      requestId,
      toolName,
      priceAtomic: priceAtomicForTool(toolName),
    });
    return toResponse(result.response);
  }

  if (result.type === 'no-payment-required') {
    // The route is registered and protected, so this branch is defensive.
    logger.warn('x402 server classified MCP request as unpaid', { requestId });
    return toResponse({
      status: 402,
      headers: { 'Cache-Control': 'no-store' },
      body: { error: 'X402_PAYMENT_REQUIRED' },
    });
  }

  // payment-verified: dispatch first, settle only on success.
  let businessResponse: Response;
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

  const toolFailed = businessResponse.status < 200 || businessResponse.status >= 300;
  const jsonRpcFailed = toolFailed ? false : await isMcpToolFailure(businessResponse);

  if (toolFailed || jsonRpcFailed) {
    // Verified signature but no completed tool result: nothing is charged.
    // Audit as verify-only so the operator can see paid-call failure rates.
    recordX402Settlement({
      requestId,
      status: 'verify_failed',
      network: cfg.network,
      errorReason: toolFailed ? `handler_failed:${businessResponse.status}` : 'mcp_tool_error',
    });
    logger.info('x402 MCP business failed, settlement skipped', {
      requestId,
      toolName,
      status: businessResponse.status,
      jsonRpcFailed,
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
    const atomic = settle.amount ?? priceAtomicForTool(toolName);
    const amountUsdc = String(Number(atomic) / 1_000_000);
    recordX402Settlement({
      requestId,
      status: 'settled',
      txHash: settle.transaction,
      payer: settle.payer,
      amountUsdc,
      network: cfg.network,
      // Reuse the verdict column to record which MCP tool was paid for.
      verdict: `mcp:${toolName}`,
    });
  } else {
    recordX402Settlement({
      requestId,
      status: 'settlement_failed',
      network: cfg.network,
      errorReason: settle.errorReason,
    });
    logger.warn('x402 MCP settlement failed after successful tool call', {
      requestId,
      toolName,
      errorReason: settle.errorReason,
    });
  }

  return businessResponse;
}
