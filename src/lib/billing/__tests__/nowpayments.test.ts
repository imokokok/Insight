/**
 * Real (un-mocked) unit tests for NOWPayments signature verification.
 *
 * The webhook route test (src/app/api/billing/webhook/__tests__/route.test.ts)
 * mocks `parseIpnEvent`, so the actual HMAC-SHA512 + recursive-key-sort
 * verification logic in nowpayments.ts was never exercised. This file loads
 * the real module (with a test IPN secret injected via process.env) and
 * verifies the crypto path end-to-end.
 */

import { createHmac } from 'node:crypto';

import type * as NowPayments from '@/lib/billing/nowpayments';

// Silence logger output during tests.
jest.mock('@/lib/utils/logger', () => ({
  normalizeError: (e: unknown) => (e instanceof Error ? e : new Error(String(e))),
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

const TEST_IPN_SECRET = 'test-ipn-secret-key-0123456789';

type NowPaymentsModule = typeof NowPayments;

/**
 * Load the real nowpayments module in an isolated module registry so that
 * NOWPAYMENTS_CONFIG picks up the env vars set just before. Without
 * isolation the module-level `NOWPAYMENTS_CONFIG` constant would be cached
 * from the first load with stale env.
 */
function loadNowpayments(env: { ipnSecret?: string; apiKey?: string } = {}): NowPaymentsModule {
  process.env.NOWPAYMENTS_IPN_SECRET = env.ipnSecret ?? TEST_IPN_SECRET;
  process.env.NOWPAYMENTS_API_KEY = env.apiKey ?? 'test-api-key';
  process.env.NOWPAYMENTS_TEST_MODE = 'false';
  // Reset the module registry so NOWPAYMENTS_CONFIG (a module-level constant
  // computed at first load from process.env) re-reads the env vars set above.
  jest.resetModules();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@/lib/billing/nowpayments') as NowPaymentsModule;
}

/**
 * Reproduce NOWPayments' signing convention: HMAC-SHA512 of the recursively
 * key-sorted, whitespace-free JSON serialization. Must match the logic in
 * nowpayments.ts exactly so that valid signatures verify.
 */
function sortObjectDeep<T>(obj: T): T {
  if (Array.isArray(obj)) return obj.map(sortObjectDeep) as unknown as T;
  if (obj && typeof obj === 'object') {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(obj as Record<string, unknown>).sort()) {
      sorted[key] = sortObjectDeep((obj as Record<string, unknown>)[key]);
    }
    return sorted as unknown as T;
  }
  return obj;
}

function signPayload(payload: object, ipnSecret: string = TEST_IPN_SECRET): string {
  const sortedJson = JSON.stringify(sortObjectDeep(payload));
  return createHmac('sha512', ipnSecret).update(sortedJson).digest('hex');
}

describe('NOWPayments nowpayments.ts', () => {
  describe('verifyIpnSignature', () => {
    it('accepts a correctly signed payload', () => {
      const { verifyIpnSignature } = loadNowpayments();
      const payload = { payment_id: 'pay_1', payment_status: 'confirmed', invoice_id: 'inv_1' };
      const body = JSON.stringify(payload);
      expect(verifyIpnSignature(body, signPayload(payload))).toBe(true);
    });

    it('rejects a tampered payload (status changed after signing)', () => {
      const { verifyIpnSignature } = loadNowpayments();
      const sig = signPayload({ payment_id: 'pay_1', payment_status: 'confirmed' });
      const tamperedBody = JSON.stringify({ payment_id: 'pay_1', payment_status: 'refunded' });
      expect(verifyIpnSignature(tamperedBody, sig)).toBe(false);
    });

    it('rejects when signature header is null', () => {
      const { verifyIpnSignature } = loadNowpayments();
      expect(verifyIpnSignature('{"a":1}', null)).toBe(false);
    });

    it('rejects when signature header is empty', () => {
      const { verifyIpnSignature } = loadNowpayments();
      expect(verifyIpnSignature('{"a":1}', '')).toBe(false);
    });

    it('rejects invalid JSON body', () => {
      const { verifyIpnSignature } = loadNowpayments();
      const sig = createHmac('sha512', TEST_IPN_SECRET).update('garbage').digest('hex');
      expect(verifyIpnSignature('not valid json', sig)).toBe(false);
    });

    it('accepts an unsorted body — the verifier sorts keys internally', () => {
      const { verifyIpnSignature } = loadNowpayments();
      // Keys deliberately out of alphabetical order; NOWPayments sends bodies
      // in arbitrary order, so the verifier MUST sort before HMAC.
      const unsortedBody = JSON.stringify({ zebra: 'z', apple: 'a', mango: 'm' });
      const sig = signPayload({ zebra: 'z', apple: 'a', mango: 'm' });
      expect(verifyIpnSignature(unsortedBody, sig)).toBe(true);
    });

    it('recursively sorts nested objects and arrays', () => {
      const { verifyIpnSignature } = loadNowpayments();
      const payload = {
        payment_id: 'pay_2',
        order: { items: [{ price: 10, name: 'x' }], total: 10 },
        status: 'confirmed',
      };
      const body = JSON.stringify(payload);
      expect(verifyIpnSignature(body, signPayload(payload))).toBe(true);
    });

    it('rejects a signature produced with a different IPN secret', () => {
      const { verifyIpnSignature } = loadNowpayments();
      const payload = { payment_id: 'pay_3', payment_status: 'confirmed' };
      const body = JSON.stringify(payload);
      const wrongSecretSig = signPayload(payload, 'a-completely-different-secret');
      expect(verifyIpnSignature(body, wrongSecretSig)).toBe(false);
    });

    it('returns false when IPN secret is not configured', () => {
      const { verifyIpnSignature } = loadNowpayments({ ipnSecret: '' });
      const payload = { payment_id: 'pay_4', payment_status: 'confirmed' };
      const sig = signPayload(payload);
      // Empty env var → NOWPAYMENTS_CONFIG.ipnSecret is null → verification
      // short-circuits to false (no crash).
      expect(verifyIpnSignature(JSON.stringify(payload), sig)).toBe(false);
    });
  });

  describe('parseIpnEvent', () => {
    it('extracts payment_id and payment_status from a signed event', () => {
      const { parseIpnEvent } = loadNowpayments();
      const payload = { payment_id: 'pay_5', payment_status: 'finished', invoice_id: 'inv_5' };
      const body = JSON.stringify(payload);
      const headers = new Headers({ 'x-nowpayments-sig': signPayload(payload) });
      const event = parseIpnEvent(body, headers);
      expect(event).not.toBeNull();
      expect(event!.id).toBe('pay_5');
      expect(event!.type).toBe('finished');
      expect((event!.data as Record<string, unknown>).invoice_id).toBe('inv_5');
    });

    it('returns null when signature is invalid', () => {
      const { parseIpnEvent } = loadNowpayments();
      const body = JSON.stringify({ payment_id: 'x', payment_status: 'confirmed' });
      const headers = new Headers({ 'x-nowpayments-sig': 'deadbeef' });
      expect(parseIpnEvent(body, headers)).toBeNull();
    });

    it('returns null when x-nowpayments-sig header is absent', () => {
      const { parseIpnEvent } = loadNowpayments();
      const payload = { payment_id: 'pay_6', payment_status: 'confirmed' };
      const body = JSON.stringify(payload);
      const headers = new Headers(); // no signature header
      expect(parseIpnEvent(body, headers)).toBeNull();
    });

    it('returns null when payment_id is missing', () => {
      const { parseIpnEvent } = loadNowpayments();
      const payload = { payment_status: 'confirmed', invoice_id: 'inv_7' };
      const body = JSON.stringify(payload);
      const headers = new Headers({ 'x-nowpayments-sig': signPayload(payload) });
      expect(parseIpnEvent(body, headers)).toBeNull();
    });

    it('returns null when payment_status is missing', () => {
      const { parseIpnEvent } = loadNowpayments();
      const payload = { payment_id: 'pay_8', invoice_id: 'inv_8' };
      const body = JSON.stringify(payload);
      const headers = new Headers({ 'x-nowpayments-sig': signPayload(payload) });
      expect(parseIpnEvent(body, headers)).toBeNull();
    });

    it('coerces a numeric payment_id to string', () => {
      const { parseIpnEvent } = loadNowpayments();
      const payload = { payment_id: 12345, payment_status: 'confirmed' };
      const body = JSON.stringify(payload);
      const headers = new Headers({ 'x-nowpayments-sig': signPayload(payload) });
      const event = parseIpnEvent(body, headers);
      expect(event).not.toBeNull();
      expect(event!.id).toBe('12345');
      expect(event!.type).toBe('confirmed');
    });
  });

  describe('createInvoice', () => {
    it('returns an error (not a throw) when API key is not configured', async () => {
      const { createInvoice } = loadNowpayments({ apiKey: '' });
      const result = await createInvoice({
        priceAmount: 49,
        orderId: 'order-1',
        description: 'test',
        ipnCallbackUrl: 'https://example.com/webhook',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel',
      });
      expect('error' in result).toBe(true);
      if ('error' in result) {
        expect(result.error).toMatch(/not configured/i);
      }
    });
  });
});
