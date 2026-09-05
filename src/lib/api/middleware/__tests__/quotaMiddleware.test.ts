import type { NextRequest } from 'next/server';

import { precheckCredits } from '@/lib/billing/creditWallet';
import { CREDIT_EXHAUSTED_RETRY_AFTER_SECONDS } from '@/lib/billing/metering';

import { createQuotaMiddleware } from '../quotaMiddleware';

jest.mock('@/lib/billing/creditWallet', () => ({
  makeMeteringKey: jest.fn(() => 'metering-key'),
  precheckCredits: jest.fn(),
}));

jest.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  }),
}));

const mockedPrecheck = precheckCredits as jest.MockedFunction<typeof precheckCredits>;

describe('quota middleware credit exhaustion', () => {
  it('marks a 402 as non-retryable and tells polling clients when to retry', async () => {
    mockedPrecheck.mockResolvedValue({
      ok: false,
      reason: 'INSUFFICIENT_CREDITS',
      balance: 0,
    });

    const middleware = createQuotaMiddleware({}, { apiKeyId: 'key-1', plan: 'developer' });
    const result = await middleware({
      nextUrl: new URL('https://www.oracleinsight.xyz/api/v1/oracle-watch?symbol=VVV'),
      headers: new Headers(),
    } as NextRequest);

    expect(result.success).toBe(false);
    if (result.success) throw new Error('Expected a rejected quota result');

    expect(result.response.status).toBe(402);
    expect(result.response.headers.get('Retry-After')).toBe(
      String(CREDIT_EXHAUSTED_RETRY_AFTER_SECONDS)
    );
    expect(result.response.headers.get('X-Credit-Denied')).toBe('INSUFFICIENT_CREDITS');

    const body = await result.response.json();
    expect(body.error.retryable).toBe(false);
  });
});
