import { NextResponse, type NextRequest } from 'next/server';

import { HTTPFacilitatorClient, getFacilitatorResponseError } from '@x402/core/server';
import { Credential, Errors, Expires } from 'mppx';
import { Mppx, evm } from 'mppx/server';

import { createCdpAuthHeaders } from '@/lib/api/x402/cdpAuth';
import { type X402Config, tokenNameForNetwork, usdcForNetwork } from '@/lib/api/x402/config';
import {
  atomicUnitsToUsdc,
  recordX402Settlement,
  type X402SettlementAudit,
} from '@/lib/api/x402/guard';
import { createLogger } from '@/lib/utils/logger';

import type { Facilitator as MppFacilitator } from 'mppx/x402';

const logger = createLogger('mpp-pretrade');
const MPP_RESOURCE = 'pre-trade-safety-check';

function createMppServer(cfg: X402Config, secretKey: string) {
  const httpFacilitator = new HTTPFacilitatorClient({
    url: cfg.facilitatorUrl,
    timeoutMs: cfg.facilitatorTimeoutMs,
    ...(cfg.facilitatorCdpAuth
      ? { createAuthHeaders: createCdpAuthHeaders(cfg.facilitatorCdpAuth) }
      : {}),
  });

  return Mppx.create({
    methods: [
      evm.charge({
        authorization: { name: tokenNameForNetwork(cfg.network), version: '2' },
        chainId: getChainId(cfg.network),
        currency: usdcForNetwork(cfg.network) as `0x${string}`,
        decimals: 6,
        recipient: cfg.payTo as `0x${string}`,
        x402: {
          // Both clients implement the same verify/settle wire contract. The
          // assertion bridges incompatible optional-field types from their
          // separately versioned x402 protocol declarations.
          facilitator: httpFacilitator as unknown as MppFacilitator,
          maxTimeoutSeconds: cfg.maxTimeoutSeconds,
        },
      }),
    ],
    // Pin the MPP realm to the production hostname. mppx otherwise resolves
    // VERCEL_URL, which leaks the internal deployment host into challenges.
    realm: 'www.oracleinsight.xyz',
    secretKey,
  });
}

type MppServer = ReturnType<typeof createMppServer>;

let cachedServer: MppServer | null = null;
let cachedServerKey = '';

function getChainId(network: X402Config['network']): number {
  return Number(network.slice('eip155:'.length));
}

function getServer(cfg: X402Config, secretKey: string): MppServer {
  const key = JSON.stringify({
    network: cfg.network,
    payTo: cfg.payTo.toLowerCase(),
    facilitatorUrl: cfg.facilitatorUrl,
    secretKey,
  });
  if (cachedServer && cachedServerKey === key) return cachedServer;

  cachedServer = createMppServer(cfg, secretKey);
  cachedServerKey = key;
  return cachedServer;
}

function getRouteOptions(request: Request, cfg: X402Config) {
  return {
    amount: atomicUnitsToUsdc(cfg.amountAtomic),
    description: 'Insight Pre-Trade Safety Check',
    expires: Expires.seconds(cfg.maxTimeoutSeconds),
    // Bind the payment authorization to the complete request URL so it cannot
    // be replayed for a different asset, action, trade size, or chain query.
    scope: request.url,
  };
}

async function issueMppChallenge(
  server: MppServer,
  options: ReturnType<typeof getRouteOptions>,
  request: Request
): Promise<Response> {
  const result = await server.evm.charge(options)(request);
  if (result.status !== 402) {
    throw new Error('Expected MPP to issue a payment challenge');
  }
  return result.challenge;
}

function newRequestId(): string {
  return `req_${crypto.randomUUID().replace(/-/g, '')}`;
}

function withCors(response: Response): NextResponse {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Cache-Control', 'no-store');
  headers.set(
    'Access-Control-Expose-Headers',
    'X-Request-Id, Retry-After, PAYMENT-REQUIRED, PAYMENT-RESPONSE, WWW-Authenticate, Payment-Receipt, Payment-Settlement-Status'
  );
  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function attachRequestId(response: Response, requestId: string): NextResponse {
  response.headers.set('X-Request-Id', requestId);
  return withCors(response);
}

function mergeChallenges(x402Response: Response, mppResponse: Response): NextResponse {
  const headers = new Headers(x402Response.headers);
  const mppChallenge = mppResponse.headers.get('WWW-Authenticate');
  if (mppChallenge) headers.append('WWW-Authenticate', mppChallenge);
  headers.set('Cache-Control', 'no-store');
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set(
    'Access-Control-Expose-Headers',
    'X-Request-Id, PAYMENT-REQUIRED, PAYMENT-RESPONSE, WWW-Authenticate, Payment-Receipt, Payment-Settlement-Status'
  );
  return new NextResponse(x402Response.body, {
    status: x402Response.status,
    statusText: x402Response.statusText,
    headers,
  });
}

function audit(
  cfg: X402Config,
  requestId: string,
  status: X402SettlementAudit['status'],
  values: Partial<X402SettlementAudit> = {}
): void {
  recordX402Settlement({
    requestId,
    protocol: 'mpp',
    status,
    network: cfg.network,
    surface: 'rest',
    resource: MPP_RESOURCE,
    ...values,
  });
}

export function hasMppCredential(request: Request): boolean {
  const authorization = request.headers.get('authorization');
  return authorization !== null && Credential.extractPaymentScheme(authorization) !== null;
}

export function hasConflictingPaymentCredentials(request: Request): boolean {
  return (
    hasMppCredential(request) &&
    (request.headers.has('payment-signature') || request.headers.has('x-api-key'))
  );
}

export async function issueMppPreTradeQuote(
  request: NextRequest,
  cfg: X402Config,
  secretKey: string,
  issueX402Quote: () => Promise<NextResponse>
): Promise<NextResponse> {
  const startedAt = Date.now();
  const server = getServer(cfg, secretKey);
  const options = getRouteOptions(request, cfg);
  const mppChallenge = await issueMppChallenge(server, options, request);
  const x402Response = await issueX402Quote();
  // Both audit rows describe challenges issued by this one HTTP response.
  // Reuse x402's request id so aggregate quote volume counts the request once.
  const requestId = x402Response.headers.get('X-Request-Id') ?? newRequestId();

  audit(cfg, requestId, 'quote_issued', {
    amountUsdc: atomicUnitsToUsdc(cfg.amountAtomic),
    responseTimeMs: Date.now() - startedAt,
  });

  return mergeChallenges(x402Response, mppChallenge);
}

export async function handleMppPaidPreTradeRequest(
  request: NextRequest,
  cfg: X402Config,
  secretKey: string,
  runBusiness: (requestId: string) => Promise<NextResponse>
): Promise<NextResponse> {
  if (hasConflictingPaymentCredentials(request)) {
    return withCors(
      NextResponse.json(
        { error: 'Choose one payment method: API key, MPP credential, or x402 payment signature.' },
        { status: 400 }
      )
    );
  }

  const server = getServer(cfg, secretKey);
  const options = getRouteOptions(request, cfg);
  const requestId = newRequestId();
  const startedAt = Date.now();

  let credential: ReturnType<typeof Credential.fromRequest>;
  try {
    credential = Credential.fromRequest(request);
  } catch {
    const challenge = await issueMppChallenge(server, options, request);
    audit(cfg, requestId, 'payment_rejected', {
      responseTimeMs: Date.now() - startedAt,
      errorReason: 'malformed_mpp_credential',
    });
    return attachRequestId(challenge, requestId);
  }

  const routeBinding = { request: { amount: options.amount }, scope: options.scope };
  let validation: Awaited<ReturnType<typeof server.validateCredential>>;
  try {
    // This checks challenge binding, expiry, EIP-3009 signature, and the
    // facilitator's verify endpoint without broadcasting or consuming funds.
    validation = await server.validateCredential(credential, routeBinding);
  } catch (error) {
    const facilitatorError = getFacilitatorResponseError(error);
    if (facilitatorError) {
      audit(cfg, requestId, 'verify_failed', {
        responseTimeMs: Date.now() - startedAt,
        errorReason: facilitatorError.name,
      });
      logger.warn('MPP facilitator validation unavailable', {
        requestId,
        error: facilitatorError.name,
      });
      return attachRequestId(
        NextResponse.json(
          { error: 'MPP payment verification is temporarily unavailable' },
          {
            status: 502,
            headers: { 'Retry-After': '5' },
          }
        ),
        requestId
      );
    }

    if (!(error instanceof Errors.PaymentError)) throw error;

    audit(cfg, requestId, 'payment_rejected', {
      responseTimeMs: Date.now() - startedAt,
      errorReason: error.name,
    });
    const challenge = await issueMppChallenge(server, options, request);
    return attachRequestId(challenge, requestId);
  }

  const payer =
    validation.credential.payload &&
    typeof validation.credential.payload === 'object' &&
    'from' in validation.credential.payload &&
    typeof validation.credential.payload.from === 'string'
      ? validation.credential.payload.from
      : undefined;

  audit(cfg, requestId, 'payment_verified', {
    amountUsdc: atomicUnitsToUsdc(cfg.amountAtomic),
    payer,
    responseTimeMs: Date.now() - startedAt,
  });

  const businessStartedAt = Date.now();
  let businessResponse: NextResponse;
  try {
    businessResponse = await runBusiness(requestId);
  } catch (error) {
    audit(cfg, requestId, 'business_failed', {
      responseTimeMs: Date.now() - businessStartedAt,
      errorReason: `handler_error:${error instanceof Error ? error.name : 'unknown'}`,
    });
    throw error;
  }

  if (businessResponse.status < 200 || businessResponse.status >= 300) {
    audit(cfg, requestId, 'business_failed', {
      responseTimeMs: Date.now() - businessStartedAt,
      errorReason: `handler_failed:${businessResponse.status}`,
    });
    businessResponse.headers.set('X-Request-Id', requestId);
    return withCors(businessResponse);
  }

  audit(cfg, requestId, 'business_succeeded', {
    amountUsdc: atomicUnitsToUsdc(cfg.amountAtomic),
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
      amountUsdc: atomicUnitsToUsdc(cfg.amountAtomic),
      asset: usdcForNetwork(cfg.network),
      responseTimeMs: Date.now() - settlementStartedAt,
      verdict: 'pre_trade_safety_check',
    });

    const response = server.transport.respondReceipt({
      challengeId: validation.challenge.id,
      credential: validation.credential,
      input: request,
      receipt,
      response: businessResponse,
    });
    response.headers.set('X-Request-Id', requestId);
    return withCors(response);
  } catch (error) {
    audit(cfg, requestId, 'settlement_failed', {
      payer,
      responseTimeMs: Date.now() - settlementStartedAt,
      errorReason: error instanceof Error ? error.name : 'unknown',
    });
    logger.error(
      'MPP settlement failed after successful pre-trade check',
      error instanceof Error ? error : new Error(String(error)),
      { requestId }
    );
    businessResponse.headers.set('X-Request-Id', requestId);
    businessResponse.headers.set('Payment-Settlement-Status', 'failed');
    return withCors(businessResponse);
  }
}
