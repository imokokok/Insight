import type { NextRequest } from 'next/server';

import { ApiResponseBuilder } from '@/lib/api/handler';
import {
  SOLANA_SWAP_GUARD_ATTESTATION_SCHEMA,
  SOLANA_SWAP_GUARD_VALID_FOR_SECONDS,
  verifySolanaSwapGuardDecision,
} from '@/lib/dex/solanaSwapGuardAttestation';
import { solanaEvidenceSignerPublicKey } from '@/lib/execution/solanaEvidence';

import { GET, POST } from '../route';

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

jest.mock('@/lib/dex/solanaSwapGuardAttestation', () => ({
  SOLANA_SWAP_GUARD_ATTESTATION_SCHEMA: 'insight.solana-swap-guard-decision.v1',
  SOLANA_SWAP_GUARD_VALID_FOR_SECONDS: 300,
  verifySolanaSwapGuardDecision: jest.fn(),
}));

jest.mock('@/lib/execution/solanaEvidence', () => ({
  solanaEvidenceSignerPublicKey: jest.fn(),
}));

const mockVerify = verifySolanaSwapGuardDecision as jest.Mock;
const mockAttester = solanaEvidenceSignerPublicKey as jest.Mock;

function post(body: Record<string, unknown>): Promise<Response> {
  return POST(
    { method: 'POST' } as unknown as NextRequest,
    {
      requestId: 'test-request',
      validated: { body },
    } as never
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  // The jest config resets mocks (including factory implementations) per test.
  (ApiResponseBuilder.success as jest.Mock).mockImplementation((data: unknown, extra?: object) => ({
    ok: true,
    data,
    ...extra,
  }));
  mockAttester.mockReturnValue('AttesterPubkey1111111111111111111111111111111');
});

describe('POST /api/v1/safety/solana-swap-guard/verify', () => {
  it('verifies a presented decision and reports validity metadata', async () => {
    const verification = { valid: true, expired: false, reason: 'verified' };
    mockVerify.mockReturnValue(verification);
    const response = await post({ decision: { schema: 'insight.solana-swap-guard-decision.v1' } });
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    const json = (await response.json()) as {
      data: typeof verification;
      meta: Record<string, unknown>;
    };
    expect(json.data).toEqual(verification);
    expect(json.meta).toEqual({ valid: true, expired: false });
    expect(mockVerify).toHaveBeenCalledWith({ schema: 'insight.solana-swap-guard-decision.v1' });
  });

  it('reports invalid and expired decisions without erroring', async () => {
    mockVerify.mockReturnValue({ valid: false, expired: true, reason: 'EXPIRED' });
    const response = await post({ decision: {} });
    expect(response.status).toBe(200);
    const json = (await response.json()) as {
      data: { valid: boolean };
      meta: Record<string, unknown>;
    };
    expect(json.data.valid).toBe(false);
    expect(json.meta).toMatchObject({ valid: false, expired: true });
  });
});

describe('GET /api/v1/safety/solana-swap-guard/verify', () => {
  it('discovers a configured attester with its descriptor', async () => {
    const response = await GET(
      { method: 'GET' } as unknown as NextRequest,
      {
        requestId: 'test-request',
      } as never
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    const json = (await response.json()) as {
      data: {
        attester: string | null;
        attestationEnabled: boolean;
        attestationStatus: string;
        descriptor: Record<string, unknown>;
      };
    };
    expect(json.data).toEqual({
      attester: 'AttesterPubkey1111111111111111111111111111111',
      attestationEnabled: true,
      attestationStatus: 'READY',
      descriptor: {
        schema: SOLANA_SWAP_GUARD_ATTESTATION_SCHEMA,
        algorithm: 'ed25519',
        validForSeconds: SOLANA_SWAP_GUARD_VALID_FOR_SECONDS,
      },
    });
  });

  it('reports an unconfigured attester as not enabled', async () => {
    mockAttester.mockReturnValue(null);
    const response = await GET(
      { method: 'GET' } as unknown as NextRequest,
      {
        requestId: 'test-request',
      } as never
    );
    const json = (await response.json()) as {
      data: { attester: string | null; attestationEnabled: boolean; attestationStatus: string };
    };
    expect(json.data).toMatchObject({
      attester: null,
      attestationEnabled: false,
      attestationStatus: 'UNCONFIGURED',
    });
  });
});
