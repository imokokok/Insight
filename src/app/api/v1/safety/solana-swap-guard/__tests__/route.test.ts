import type { NextRequest } from 'next/server';

import { z } from 'zod';

import { ApiResponseBuilder } from '@/lib/api/handler';
import { x402ConfigForPaymentScope } from '@/lib/api/x402/capabilityPayment';
import { handlePaidPreTradeRequest, hasAuthCredentials, isPaidRequest } from '@/lib/api/x402/guard';
import { createSolanaSwapGuardDecision } from '@/lib/dex/solanaSwapGuardAttestation';
import { executionAdapterRegistry } from '@/lib/execution/adapters';

import { POST } from '../route';

jest.mock('next/server', () => {
  class NextResponse extends Response {
    static json(data: unknown, init?: ResponseInit) {
      return new NextResponse(JSON.stringify(data), {
        ...init,
        headers: { 'Content-Type': 'application/json', ...(init?.headers as object) },
      });
    }
  }
  return { NextResponse };
});

jest.mock('@/lib/api/handler', () => ({
  // Pass the inner handler straight through so the tests exercise route logic.
  createApiHandler: jest.fn((handler: unknown) => handler),
  createOptionsHandler: jest.fn(() => jest.fn()),
  ApiResponseBuilder: {
    success: jest.fn((data: unknown, extra?: object) => ({ ok: true, data, ...extra })),
    error: jest.fn((code: string, message: string, extra?: object) => ({
      ok: false,
      code,
      message,
      ...extra,
    })),
  },
}));

jest.mock('@/lib/api/x402/capabilityPayment', () => ({
  x402ConfigForPaymentScope: jest.fn(),
  X402_PAYMENT_SCOPE: { solana: 'solana' },
}));

jest.mock('@/lib/api/x402/config', () => ({
  getX402Config: jest.fn(() => ({})),
}));

jest.mock('@/lib/api/x402/guard', () => ({
  handlePaidPreTradeRequest: jest.fn(),
  hasAuthCredentials: jest.fn(() => false),
  isPaidRequest: jest.fn(() => false),
}));

jest.mock('@/lib/dex/solanaSwapGuard', () => ({
  // A permissive real schema keeps the route's own body validation honest.
  SolanaSwapGuardExactInputSchema: z
    .object({
      guard: z.record(z.string(), z.unknown()),
      transaction: z.record(z.string(), z.unknown()),
    })
    .strict(),
}));

jest.mock('@/lib/dex/solanaSwapGuardAttestation', () => ({
  createSolanaSwapGuardDecision: jest.fn(),
}));

jest.mock('@/lib/execution/adapters', () => ({
  executionAdapterRegistry: {
    preflight: jest.fn(),
  },
}));

const mockPreflight = executionAdapterRegistry.preflight as jest.Mock;
const mockDecision = createSolanaSwapGuardDecision as jest.Mock;
const mockPaidRequest = handlePaidPreTradeRequest as jest.Mock;
const mockIsPaid = isPaidRequest as jest.Mock;
const mockHasAuth = hasAuthCredentials as jest.Mock;
const mockConfigForScope = x402ConfigForPaymentScope as jest.Mock;

const GUARD = { verdict: 'ALLOW', checks: [] };
const DECISION = { guard: GUARD, attestation: { payload: { decisionHash: 'hash' } } };
const BODY = { guard: {}, transaction: {} };

function request(jsonBody: unknown): NextRequest {
  return {
    method: 'POST',
    json: async () => jsonBody,
  } as unknown as NextRequest;
}

/**
 * The route forwards its routeContext to the legacy handler; with the real
 * middleware stack mocked away, the handler reads the pre-validated body from
 * the same object.
 */
function legacyContext(body: Record<string, unknown>): never {
  return {
    params: Promise.resolve({}),
    requestId: 'test-request',
    validated: { body },
  } as never;
}

beforeEach(() => {
  jest.clearAllMocks();
  // The jest config resets mocks (including factory implementations) per test.
  (ApiResponseBuilder.success as jest.Mock).mockImplementation((data: unknown, extra?: object) => ({
    ok: true,
    data,
    ...extra,
  }));
  (ApiResponseBuilder.error as jest.Mock).mockImplementation(
    (code: string, message: string, extra?: object) => ({ ok: false, code, message, ...extra })
  );
  mockConfigForScope.mockReturnValue({ scope: 'solana' });
  mockIsPaid.mockReturnValue(false);
  mockHasAuth.mockReturnValue(true);
  mockPreflight.mockResolvedValue({ native: GUARD });
  mockDecision.mockReturnValue(DECISION);
});

describe('POST /api/v1/safety/solana-swap-guard', () => {
  it('assesses one exact unsigned message and returns the decision with no-store caching', async () => {
    const response = await POST(request(BODY), legacyContext(BODY));
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store, must-revalidate');
    const json = (await response.json()) as {
      data: typeof DECISION;
      meta: Record<string, unknown>;
    };
    expect(json.data).toEqual(DECISION);
    expect(json.meta).toMatchObject({
      verdict: 'ALLOW',
      attested: true,
      execution: 'not_performed',
    });
    expect(mockPreflight).toHaveBeenCalledWith('insight.solana.direct-swap-guard.v1', BODY);
    expect(mockDecision).toHaveBeenCalledWith(GUARD, BODY.transaction);
  });

  it('serves the unauthenticated paid flow through the x402 handler', async () => {
    mockHasAuth.mockReturnValue(false);
    const response = new Response('ok');
    mockPaidRequest.mockResolvedValue(response);
    const probe = request(BODY);
    const result = await POST(probe, { params: Promise.resolve({}) });
    expect(mockPaidRequest).toHaveBeenCalledTimes(1);
    expect(result).toBe(response);
    const [passedRequest, config, callback] = mockPaidRequest.mock.calls[0];
    expect(passedRequest).toBe(probe);
    expect(config).toEqual({ scope: 'solana' });
    // The paid callback validates the body before executing the decision.
    const paid = (await callback('req-paid')) as Response;
    expect(paid.status).toBe(200);
    const json = (await paid.json()) as { meta: Record<string, unknown> };
    expect(json.meta).toMatchObject({ verdict: 'ALLOW' });
  });

  it('rejects a malformed paid body with a validation error', async () => {
    mockHasAuth.mockReturnValue(false);
    await POST(request({ guard: {} }), { params: Promise.resolve({}) });
    const [, , callback] = mockPaidRequest.mock.calls[0];
    const bad = (await callback('req-bad')) as Response;
    expect(bad.status).toBe(400);
    const json = (await bad.json()) as { code: string };
    expect(json.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a non-JSON paid body with a validation error', async () => {
    mockHasAuth.mockReturnValue(false);
    await POST(
      {
        method: 'POST',
        json: async () => {
          throw new Error('not json');
        },
      } as unknown as NextRequest,
      { params: Promise.resolve({}) }
    );
    const [, , callback] = mockPaidRequest.mock.calls[0];
    const bad = (await callback('req-json')) as Response;
    expect(bad.status).toBe(400);
    const json = (await bad.json()) as { code: string };
    expect(json.code).toBe('VALIDATION_ERROR');
  });

  it('rejects a schema-invalid paid body and reports failing paths', async () => {
    mockHasAuth.mockReturnValue(false);
    await POST(request({ guard: {}, transaction: 'not-an-object' }), {
      params: Promise.resolve({}),
    });
    const [, , callback] = mockPaidRequest.mock.calls[0];
    const bad = (await callback('req-schema')) as Response;
    expect(bad.status).toBe(400);
    const json = (await bad.json()) as { code: string; details: { issues: string[] } };
    expect(json.code).toBe('VALIDATION_ERROR');
    expect(json.details.issues).toContain('transaction');
  });

  it('skips the x402 flow for credentialed callers', async () => {
    const response = await POST(request(BODY), legacyContext(BODY));
    expect(mockPaidRequest).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
  });

  it('skips the x402 flow when the Solana rail is not configured', async () => {
    mockConfigForScope.mockReturnValue(null);
    const response = await POST(request(BODY), legacyContext(BODY));
    expect(mockPaidRequest).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
  });

  it('serves an authenticated paid request through the x402 handler too', async () => {
    mockIsPaid.mockReturnValue(true);
    const response = new Response('ok');
    mockPaidRequest.mockResolvedValue(response);
    const result = await POST(request(BODY), { params: Promise.resolve({}) });
    expect(mockPaidRequest).toHaveBeenCalledTimes(1);
    expect(result).toBe(response);
  });
});
