import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { webcrypto } from 'node:crypto';

import { createServiceRoleClient } from '@/lib/supabase/server';

import { type X402Config } from '../config';
import {
  atomicUnitsToUsdc,
  handlePaidPreTradeRequest,
  hasAuthCredentials,
  isPaidRequest,
  paymentAuditFields,
  toNextResponse,
  x402AcquisitionSource,
} from '../guard';
import { getX402HttpServer } from '../resourceServer';

const mockInsert = jest.fn();
const mockAbortSignal = jest.fn(async () => ({ error: null }));
const incrementRateLimitMock = jest.fn();

function mockSettlementTable() {
  return {
    insert: (row: unknown) => {
      mockInsert(row);
      return { abortSignal: mockAbortSignal };
    },
  };
}

jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: jest.fn(() => ({
    from: () => mockSettlementTable(),
  })),
}));

jest.mock('@/lib/api/middleware/rateLimitStore', () => ({
  rateLimitStore: { increment: (...args: unknown[]) => incrementRateLimitMock(...args) },
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
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
  (createServiceRoleClient as jest.Mock).mockImplementation(() => ({
    from: () => mockSettlementTable(),
  }));
  mockInsert.mockClear();
  mockAbortSignal.mockClear();
  mockAbortSignal.mockImplementation(async () => ({ error: null }));
  incrementRateLimitMock.mockClear();
  incrementRateLimitMock.mockImplementation(async () => ({
    count: 1,
    resetTime: Date.now() + 60_000,
  }));
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
  describe('chain-aware payment audit fields', () => {
    it('formats verified Solana USDC requirements without assuming the EVM network', () => {
      expect(
        paymentAuditFields({
          network: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
          asset: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
          amount: '20000',
        })
      ).toEqual({
        network: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
        asset: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
        amountUsdc: '0.02',
      });
    });

    it('omits unsupported or malformed payment requirements from audit facts', () => {
      expect(
        paymentAuditFields({ network: 'solana:unknown', asset: 'not-a-mint', amount: '20000' })
      ).toEqual({ network: null });
    });

    it('reads 18-decimal BNB Chain requirements on the token grid, not the 6-decimal USDC grid', () => {
      // 0.02 USDT atomic at 18 decimals must audit as 0.02, not 2e13.
      expect(
        paymentAuditFields({
          network: 'eip155:56',
          asset: '0x55d398326f99059fF775485246999027B3197955',
          amount: '20000000000000000',
        })
      ).toEqual({
        network: 'eip155:56',
        asset: '0x55d398326f99059fF775485246999027B3197955',
        amountUsdc: '0.02',
      });
      expect(atomicUnitsToUsdc('20000000000000000', 18)).toBe('0.02');
      expect(atomicUnitsToUsdc('20000')).toBe('0.02');
    });
  });

  describe('header detection', () => {
    it('detects the v2 PAYMENT-SIGNATURE header', () => {
      expect(isPaidRequest(makeRequest({ 'payment-signature': 'abc' }))).toBe(true);
      expect(isPaidRequest(makeRequest())).toBe(false);
    });

    it('does not treat the legacy v1 X-PAYMENT header as payment', () => {
      expect(isPaidRequest(makeRequest({ 'x-payment': 'legacy' }))).toBe(false);
    });

    it('keeps entry attribution bounded and non-identifying', () => {
      expect(x402AcquisitionSource(makeRequest({ 'x-insight-entry-source': 'docs' }))).toBe('docs');
      expect(x402AcquisitionSource(makeRequest({ 'x-insight-entry-source': 'sendaifun' }))).toBe(
        'sendaifun'
      );
      expect(x402AcquisitionSource(makeRequest({ 'x-insight-entry-source': 'wallet_mcp' }))).toBe(
        'wallet_mcp'
      );
      expect(
        x402AcquisitionSource(makeRequest({ 'x-insight-entry-source': 'campaign-42-wallet-abc' }))
      ).toBe('unknown');
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

    it('mirrors a header-encoded 402 challenge into the body for v1 parsers', async () => {
      const challenge = {
        x402Version: 2,
        error: 'Payment required',
        accepts: [
          {
            scheme: 'exact',
            network: 'eip155:8453',
            amount: '2000',
            asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
            payTo: '0x5FBbbCbF2Ade44F5c604E5E55f11945E1ADdD231',
          },
        ],
      };
      const res = toNextResponse({
        status: 402,
        headers: { 'PAYMENT-REQUIRED': Buffer.from(JSON.stringify(challenge)).toString('base64') },
        body: {},
      });
      expect(res.status).toBe(402);
      await expect(res.json()).resolves.toEqual(challenge);
    });

    it('leaves non-402 bodies and undecodable 402 headers untouched', async () => {
      const ok = toNextResponse({
        status: 200,
        headers: { 'PAYMENT-REQUIRED': 'bm9wZQ==' },
        body: { verdict: 'PASS' },
      });
      await expect(ok.json()).resolves.toEqual({ verdict: 'PASS' });

      const bad = toNextResponse({
        status: 402,
        headers: { 'PAYMENT-REQUIRED': '!!!not-base64!!!' },
        body: {},
      });
      await expect(bad.json()).resolves.toEqual({});
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
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(mockInsert).not.toHaveBeenCalled();
    });

    it('rejects quote floods before payment handling', async () => {
      incrementRateLimitMock.mockResolvedValue({
        count: 7,
        resetTime: Date.now() + 60_000,
      });
      const processHTTPRequest = jest.fn();
      mockedGetServer.mockResolvedValue({ processHTTPRequest });

      const res = await handlePaidPreTradeRequest(makeRequest(), CFG, OK_BUSINESS);

      expect(res.status).toBe(429);
      expect(processHTTPRequest).not.toHaveBeenCalled();
      expect(mockedGetServer).not.toHaveBeenCalled();
    });

    it('settles after a 2xx business response and attaches settlement headers', async () => {
      const processHTTPRequest = jest.fn().mockResolvedValue({
        type: 'payment-verified',
        cancellationDispatcher: {},
        paymentPayload: { x402Version: 2 },
        paymentRequirements: {
          scheme: 'exact',
          network: 'eip155:84532',
          asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
          amount: '20000',
        },
      });
      const processSettlement = jest.fn().mockResolvedValue({
        success: true,
        transaction: `0x${'a'.repeat(64)}`,
        payer: `0x${'b'.repeat(40)}`,
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
      const res = await handlePaidPreTradeRequest(
        makeRequest({ 'x-insight-entry-source': 'docs' }),
        CFG,
        business
      );
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(business).toHaveBeenCalledTimes(1);
      expect(processSettlement).toHaveBeenCalledTimes(1);
      expect(res.status).toBe(200);
      expect(res.headers.get('PAYMENT-RESPONSE')).toBe('receipt');
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'settled',
          tx_hash: `0x${'a'.repeat(64)}`,
          payer: `0x${'b'.repeat(40)}`,
          amount_usdc: '0.02',
          network: 'eip155:84532',
          verdict: 'PASS',
          acquisition_source: 'docs',
        })
      );
    });

    it('skips settlement when the business response is non-2xx', async () => {
      const processHTTPRequest = jest.fn().mockResolvedValue({
        type: 'payment-verified',
        cancellationDispatcher: {},
        paymentPayload: { x402Version: 2 },
        paymentRequirements: {
          scheme: 'exact',
          network: 'eip155:84532',
          asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
          amount: '20000',
        },
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
        paymentRequirements: {
          scheme: 'exact',
          network: 'eip155:84532',
          asset: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
          amount: '20000',
        },
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

    it('routes a HyperCore usdSend payload through the self-hosted facilitator without invoking the EVM server', async () => {
      const originalFetch = global.fetch;
      const facilitatorFetch = jest.fn(async (input: RequestInfo | URL) => {
        const url =
          typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        if (url.endsWith('/verify')) {
          return Response.json({ isValid: true, payer: `0x${'b'.repeat(40)}` });
        }
        if (url.endsWith('/settle')) {
          return Response.json({
            success: true,
            transaction: `hcx_${'a'.repeat(32)}`,
            network: 'hyperliquid:mainnet',
            payer: `0x${'b'.repeat(40)}`,
            amount: '0.02',
          });
        }
        throw new Error(`unexpected facilitator request ${url}`);
      });
      global.fetch = facilitatorFetch as unknown as typeof fetch;
      try {
        const config: X402Config = {
          ...CFG,
          hypercore: {
            network: 'hyperliquid:mainnet',
            payTo: '0xdef0000000000000000000000000000000000002',
            facilitatorUrl: 'https://hypercore-facilitator.example',
            merchantId: 'insight',
            merchantSecret: 'a-merchant-secret-that-is-long-enough',
            timeoutMs: 15_000,
            maxTimeoutSeconds: 60,
          },
        };
        const paymentPayload = {
          x402Version: 2,
          accepted: { network: 'hyperliquid:mainnet' },
          payload: { quoteId: 'quote_0123456789abcdefghijklmnopqrstuv' },
        };
        const header = Buffer.from(JSON.stringify(paymentPayload), 'utf8').toString('base64');
        const business = jest.fn(() =>
          Promise.resolve(NextResponse.json({ data: { verdict: 'PASS' } }))
        );
        const response = await handlePaidPreTradeRequest(
          makeRequest({ 'payment-signature': header }),
          config,
          business
        );
        await new Promise((resolve) => setTimeout(resolve, 0));

        expect(business).toHaveBeenCalledTimes(1);
        expect(mockedGetServer).not.toHaveBeenCalled();
        expect(facilitatorFetch).toHaveBeenCalledTimes(2);
        expect(response.headers.get('payment-response')).not.toBeNull();
        expect(mockInsert).toHaveBeenCalledWith(
          expect.objectContaining({
            status: 'settled',
            network: 'hyperliquid:mainnet',
            asset: 'USDC',
            tx_hash: `hcx_${'a'.repeat(32)}`,
          })
        );
      } finally {
        global.fetch = originalFetch;
      }
    });
  });
});
