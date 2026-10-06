import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { createServiceRoleClient } from '@/lib/supabase/server';

import { type X402Config } from '../config';
import {
  handlePaidPreTradeRequest,
  hasAuthCredentials,
  isPaidRequest,
  toNextResponse,
} from '../guard';
import { getX402HttpServer } from '../resourceServer';

const mockInsert = jest.fn(async () => ({ error: null }));

jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: jest.fn(() => ({
    from: () => ({ insert: mockInsert }),
  })),
}));

jest.mock('../resourceServer', () => ({
  getX402HttpServer: jest.fn(),
}));

// Minimal next/server stub: Next 16's NextRequest/NextResponse define read-only
// getters that clash with the repo's jsdom Request polyfill (jest.setup.ts).
// The guard only needs NextResponse.json / new NextResponse / after().
jest.mock('next/server', () => {
  class NextResponse {
    status: number;
    headers: Headers;
    private bodyText: string;

    constructor(body: string | null, init?: { status?: number; headers?: Record<string, string> }) {
      this.status = init?.status ?? 200;
      this.headers = new Headers(init?.headers);
      this.bodyText = body ?? '';
    }

    static json(data: unknown, init?: { status?: number; headers?: Record<string, string> }) {
      return new NextResponse(JSON.stringify(data), {
        ...init,
        headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
      });
    }

    json() {
      return Promise.resolve(this.bodyText ? JSON.parse(this.bodyText) : null);
    }

    clone() {
      return this;
    }
  }

  return { NextResponse, after: (fn: () => unknown) => void Promise.resolve().then(fn) };
});

const mockedGetServer = getX402HttpServer as jest.Mock;

// jest.config.js sets resetMocks: true, which wipes factory-installed
// implementations before every test — re-prime the service-role client and
// the insert recorder so audit assertions observe real calls.
beforeEach(() => {
  (createServiceRoleClient as jest.Mock).mockImplementation(() => ({
    from: () => ({ insert: mockInsert }),
  }));
  mockInsert.mockImplementation(async () => ({ error: null }));
});

const CFG: X402Config = {
  enabled: true,
  network: 'eip155:84532',
  payTo: '0xAbC0000000000000000000000000000000000001',
  amountAtomic: '20000',
  priceUsd: 0.02,
  facilitatorUrl: 'https://x402.org/facilitator',
  facilitatorTimeoutMs: 15_000,
  maxTimeoutSeconds: 60,
};

function makeRequest(headers: Record<string, string> = {}): NextRequest {
  // Duck-typed instead of `new NextRequest(...)`: Next 16's NextRequest defines
  // a read-only `url` getter that clashes with the repo's jsdom Request
  // polyfill (jest.setup.ts). The guard only touches headers + nextUrl.
  return {
    headers: new Headers(headers),
    nextUrl: new URL(
      'https://oracleinsight.xyz/api/v1/safety/pre-trade?asset=ETH&chainId=1&action=swap&tradeAmountUsd=1000'
    ),
    method: 'GET',
  } as unknown as NextRequest;
}

const OK_BUSINESS = () => Promise.resolve(NextResponse.json({ ok: true }, { status: 200 }));

describe('x402 guard', () => {
  describe('header detection', () => {
    it('detects the v2 PAYMENT-SIGNATURE header', () => {
      expect(isPaidRequest(makeRequest({ 'payment-signature': 'abc' }))).toBe(true);
      expect(isPaidRequest(makeRequest())).toBe(false);
    });

    it('does not treat the legacy v1 X-PAYMENT header as payment', () => {
      expect(isPaidRequest(makeRequest({ 'x-payment': 'legacy' }))).toBe(false);
    });

    it('detects API-key credentials for the legacy path', () => {
      expect(hasAuthCredentials(makeRequest({ 'x-api-key': 'isk_...' }))).toBe(true);
      expect(hasAuthCredentials(makeRequest({ authorization: 'Bearer isk_...' }))).toBe(true);
      expect(hasAuthCredentials(makeRequest())).toBe(false);
    });
  });

  describe('toNextResponse', () => {
    it('maps instructions status, headers, and JSON body', async () => {
      const res = toNextResponse({
        status: 402,
        headers: { 'PAYMENT-REQUIRED': 'quoted' },
        body: { accepts: [] },
      });
      expect(res.status).toBe(402);
      expect(res.headers.get('PAYMENT-REQUIRED')).toBe('quoted');
      const body = await res.json();
      expect(body).toEqual({ accepts: [] });
    });
  });

  describe('handlePaidPreTradeRequest', () => {
    it('returns the core 402 quote without running the business handler', async () => {
      const processHTTPRequest = jest.fn().mockResolvedValue({
        type: 'payment-error',
        response: {
          status: 402,
          headers: { 'PAYMENT-REQUIRED': 'quote' },
          body: { error: 'payment required' },
        },
      });
      mockedGetServer.mockResolvedValue({ processHTTPRequest });

      const business = jest.fn(OK_BUSINESS);
      const res = await handlePaidPreTradeRequest(makeRequest(), CFG, business);

      expect(res.status).toBe(402);
      expect(res.headers.get('PAYMENT-REQUIRED')).toBe('quote');
      expect(business).not.toHaveBeenCalled();
    });

    it('settles after a 2xx business response and attaches settlement headers', async () => {
      const processHTTPRequest = jest.fn().mockResolvedValue({
        type: 'payment-verified',
        cancellationDispatcher: {},
        paymentPayload: { x402Version: 2 },
        paymentRequirements: { scheme: 'exact', amount: '20000' },
      });
      const processSettlement = jest.fn().mockResolvedValue({
        success: true,
        transaction: '0xtxhash',
        payer: '0xpayer',
        // CDP v2 settle responses omit `amount`; the guard must fall back to
        // the configured atomic charge so audit rows keep their amount.
        amount: undefined,
        network: 'eip155:84532',
        headers: { 'PAYMENT-RESPONSE': 'receipt' },
        requirements: {},
      });
      mockedGetServer.mockResolvedValue({ processHTTPRequest, processSettlement });

      const business = jest.fn(() =>
        Promise.resolve(NextResponse.json({ ok: true, data: { verdict: 'PASS' } }, { status: 200 }))
      );
      mockInsert.mockClear();
      const res = await handlePaidPreTradeRequest(makeRequest(), CFG, business);
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(business).toHaveBeenCalledTimes(1);
      expect(processSettlement).toHaveBeenCalledTimes(1);
      expect(res.status).toBe(200);
      expect(res.headers.get('PAYMENT-RESPONSE')).toBe('receipt');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'settled',
          tx_hash: '0xtxhash',
          payer: '0xpayer',
          amount_usdc: '0.02',
          network: 'eip155:84532',
          verdict: 'PASS',
        })
      );
    });

    it('skips settlement when the business response is non-2xx', async () => {
      const processHTTPRequest = jest.fn().mockResolvedValue({
        type: 'payment-verified',
        cancellationDispatcher: {},
        paymentPayload: { x402Version: 2 },
        paymentRequirements: { scheme: 'exact', amount: '20000' },
      });
      const processSettlement = jest.fn();
      mockedGetServer.mockResolvedValue({ processHTTPRequest, processSettlement });

      const business = jest.fn(() =>
        Promise.resolve(NextResponse.json({ ok: false }, { status: 500 }))
      );
      const res = await handlePaidPreTradeRequest(makeRequest(), CFG, business);

      expect(res.status).toBe(500);
      expect(processSettlement).not.toHaveBeenCalled();
      expect(res.headers.get('PAYMENT-RESPONSE')).toBeNull();
    });

    it('attaches failure settlement headers but keeps the 200 business response', async () => {
      const processHTTPRequest = jest.fn().mockResolvedValue({
        type: 'payment-verified',
        cancellationDispatcher: {},
        paymentPayload: { x402Version: 2 },
        paymentRequirements: { scheme: 'exact', amount: '20000' },
      });
      const processSettlement = jest.fn().mockResolvedValue({
        success: false,
        errorReason: 'insufficient_funds',
        headers: { 'PAYMENT-RESPONSE': 'failed-receipt' },
        response: { status: 402, headers: {}, body: {} },
      });
      mockedGetServer.mockResolvedValue({ processHTTPRequest, processSettlement });

      const res = await handlePaidPreTradeRequest(makeRequest(), CFG, OK_BUSINESS);

      // The check completed; the client was not charged. Fail the settlement
      // on the header so the client can retry payment without re-running.
      expect(res.status).toBe(200);
      expect(res.headers.get('PAYMENT-RESPONSE')).toBe('failed-receipt');
    });
  });
});
