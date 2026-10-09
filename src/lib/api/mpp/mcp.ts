import { createHash } from 'node:crypto';

import { McpError, type CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { HTTPFacilitatorClient, getFacilitatorResponseError } from '@x402/core/server';
import { Errors, Expires } from 'mppx';
import { Mppx, Transport, evm } from 'mppx/server';

import { createCdpAuthHeaders } from '@/lib/api/x402/cdpAuth';
import { type X402Config, tokenNameForNetwork, usdcForNetwork } from '@/lib/api/x402/config';
import { atomicUnitsToUsdc, recordX402Settlement } from '@/lib/api/x402/guard';
import { createLogger } from '@/lib/utils/logger';

import { MPP_MCP_TOOL } from './config';

import type { Transport as MppTransport } from 'mppx/server';
import type { Facilitator as MppFacilitator } from 'mppx/x402';

const logger = createLogger('mpp-mcp');

type MppSdkTransport = ReturnType<typeof Transport.mcpSdk>;
type MppSdkExtra = Parameters<MppSdkTransport['getCredential']>[0];

export interface MppMcpCallInput {
  name: string;
  args: Record<string, unknown>;
  extra: MppSdkExtra;
  runBusiness: () => Promise<CallToolResult>;
}

export type MppMcpCallHandler = (input: MppMcpCallInput) => Promise<CallToolResult>;

function createMppMcpServer(cfg: X402Config, secretKey: string) {
  const facilitator = new HTTPFacilitatorClient({
    url: cfg.facilitatorUrl,
    timeoutMs: cfg.facilitatorTimeoutMs,
    ...(cfg.facilitatorCdpAuth
      ? { createAuthHeaders: createCdpAuthHeaders(cfg.facilitatorCdpAuth) }
      : {}),
  });

  const transport: MppTransport.McpSdk = Transport.mcpSdk();
  return Mppx.create({
    methods: [
      evm.charge({
        authorization: { name: tokenNameForNetwork(cfg.network), version: '2' },
        chainId: Number(cfg.network.slice('eip155:'.length)),
        currency: usdcForNetwork(cfg.network) as `0x${string}`,
        decimals: 6,
        recipient: cfg.payTo as `0x${string}`,
        x402: {
          facilitator: facilitator as unknown as MppFacilitator,
          maxTimeoutSeconds: cfg.maxTimeoutSeconds,
        },
      }),
    ],
    secretKey,
    transport,
  });
}

type MppMcpServer = ReturnType<typeof createMppMcpServer>;

let cachedServer: MppMcpServer | null = null;
let cachedServerKey = '';

function getServer(cfg: X402Config, secretKey: string): MppMcpServer {
  const key = JSON.stringify({
    network: cfg.network,
    payTo: cfg.payTo.toLowerCase(),
    facilitatorUrl: cfg.facilitatorUrl,
    facilitatorTimeoutMs: cfg.facilitatorTimeoutMs,
    facilitatorCdpAuth: cfg.facilitatorCdpAuth,
    maxTimeoutSeconds: cfg.maxTimeoutSeconds,
    secretKey,
  });
  if (cachedServer && cachedServerKey === key) return cachedServer;

  cachedServer = createMppMcpServer(cfg, secretKey);
  cachedServerKey = key;
  return cachedServer;
}

function scopeForCall(name: string, args: Record<string, unknown>): string {
  const serialized = canonicalJson({ name, args }, new WeakSet<object>());
  const digest = createHash('sha256').update(serialized).digest('hex');
  return `mcp:${name}:${digest}`;
}

function canonicalJson(value: unknown, ancestors: WeakSet<object>): string {
  if (value === null) return 'null';
  if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) {
    if (ancestors.has(value)) throw new Error('Cyclic MCP arguments are invalid');
    ancestors.add(value);
    const serialized = `[${value.map((item) => canonicalJson(item, ancestors)).join(',')}]`;
    ancestors.delete(value);
    return serialized;
  }
  if (typeof value === 'object') {
    if (ancestors.has(value)) throw new Error('Cyclic MCP arguments are invalid');
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error('MCP arguments must use plain JSON objects');
    }
    ancestors.add(value);
    const record = value as Record<string, unknown>;
    const serialized = `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key], ancestors)}`)
      .join(',')}}`;
    ancestors.delete(value);
    return serialized;
  }
  throw new Error('MCP arguments must contain only JSON values');
}

function newRequestId(): string {
  return `req_${crypto.randomUUID().replace(/-/g, '')}`;
}

function audit(
  cfg: X402Config,
  requestId: string,
  status: Parameters<typeof recordX402Settlement>[0]['status'],
  values: Partial<Parameters<typeof recordX402Settlement>[0]> = {}
): void {
  recordX402Settlement({
    requestId,
    protocol: 'mpp',
    status,
    network: cfg.network,
    surface: 'mcp',
    resource: `mcp:${MPP_MCP_TOOL}`,
    ...values,
  });
}

function payerFromCredential(credential: { payload?: unknown }): string | undefined {
  const payload: unknown = credential.payload;
  if (
    payload &&
    typeof payload === 'object' &&
    'from' in payload &&
    typeof payload.from === 'string'
  ) {
    return payload.from;
  }
  return undefined;
}

/**
 * MPP paid MCP pilot. Validation runs before the tool; the EVM authorization is
 * broadcast only after the tool returns a non-error result. The challenge scope
 * hashes the tool name and complete JSON arguments so it cannot be replayed for
 * a different safety check.
 */
export function createMppMcpCallHandler(cfg: X402Config, secretKey: string): MppMcpCallHandler {
  const server = getServer(cfg, secretKey);

  return async ({ name, args, extra, runBusiness }) => {
    if (name !== MPP_MCP_TOOL) {
      throw new McpError(-32602, `MPP payment is not enabled for tool: ${name}`);
    }

    const requestId = newRequestId();
    const startedAt = Date.now();
    const scope = scopeForCall(name, args);
    const routeOptions = {
      amount: atomicUnitsToUsdc(cfg.amountAtomic),
      description: 'Insight Pre-Trade Safety Check',
      expires: Expires.seconds(cfg.maxTimeoutSeconds),
      scope,
    };
    const routeBinding = { request: { amount: routeOptions.amount }, scope };

    let credential: ReturnType<typeof server.transport.getCredential>;
    try {
      credential = server.transport.getCredential(extra);
    } catch {
      credential = null;
    }

    if (!credential) {
      const challenge = await server.challenge.evm.charge(routeOptions);
      audit(cfg, requestId, 'quote_issued', {
        amountUsdc: routeOptions.amount,
        responseTimeMs: Date.now() - startedAt,
      });
      throw await server.transport.respondChallenge({ challenge, input: extra });
    }

    let validation: Awaited<ReturnType<typeof server.validateCredential>>;
    try {
      validation = await server.validateCredential(credential, routeBinding);
    } catch (error) {
      const facilitatorError = getFacilitatorResponseError(error);
      if (facilitatorError) {
        audit(cfg, requestId, 'verify_failed', {
          responseTimeMs: Date.now() - startedAt,
          errorReason: facilitatorError.name,
        });
        logger.warn('MPP MCP facilitator validation unavailable', {
          requestId,
          error: facilitatorError.name,
        });
        throw new McpError(-32603, 'MPP payment verification is temporarily unavailable', {
          httpStatus: 502,
        });
      }

      if (!(error instanceof Errors.PaymentError)) throw error;

      audit(cfg, requestId, 'payment_rejected', {
        responseTimeMs: Date.now() - startedAt,
        errorReason: error.name,
      });
      const challenge = await server.challenge.evm.charge(routeOptions);
      throw await server.transport.respondChallenge({ challenge, error, input: extra });
    }

    const payer = payerFromCredential(validation.credential);
    audit(cfg, requestId, 'payment_verified', {
      amountUsdc: routeOptions.amount,
      payer,
      responseTimeMs: Date.now() - startedAt,
    });

    const businessStartedAt = Date.now();
    let businessResult: CallToolResult;
    try {
      businessResult = await runBusiness();
    } catch (error) {
      audit(cfg, requestId, 'business_failed', {
        responseTimeMs: Date.now() - businessStartedAt,
        errorReason: `handler_error:${error instanceof Error ? error.name : 'unknown'}`,
      });
      throw error;
    }

    if (businessResult.isError) {
      audit(cfg, requestId, 'business_failed', {
        responseTimeMs: Date.now() - businessStartedAt,
        errorReason: 'mcp_tool_error',
      });
      return businessResult;
    }

    audit(cfg, requestId, 'business_succeeded', {
      amountUsdc: routeOptions.amount,
      responseTimeMs: Date.now() - businessStartedAt,
    });

    const settlementStartedAt = Date.now();
    try {
      const receipt = await server.broadcastCredential(validation.credential, routeBinding);
      const txHash =
        'reference' in receipt && typeof receipt.reference === 'string'
          ? receipt.reference
          : undefined;
      audit(cfg, requestId, 'settled', {
        txHash,
        payer,
        amountUsdc: routeOptions.amount,
        asset: usdcForNetwork(cfg.network),
        responseTimeMs: Date.now() - settlementStartedAt,
        verdict: MPP_MCP_TOOL,
      });

      return server.transport.respondReceipt({
        challengeId: validation.challenge.id,
        credential: validation.credential,
        input: extra,
        receipt,
        response: businessResult,
      });
    } catch (error) {
      audit(cfg, requestId, 'settlement_failed', {
        payer,
        responseTimeMs: Date.now() - settlementStartedAt,
        errorReason: error instanceof Error ? error.name : 'unknown',
      });
      logger.warn('MPP MCP settlement failed after successful tool call', {
        requestId,
        error: error instanceof Error ? error.name : 'unknown',
      });
      return businessResult;
    }
  };
}
