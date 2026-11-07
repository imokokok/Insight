/**
 * Product 24h cap tests.
 *
 * These pin the numbers a flat $0.50/$0.55 price depends on, and the refusal
 * contract the routes translate into HTTP 429 + Retry-After. Changing a limit
 * must be a deliberate edit here as well as in productLimits.ts.
 */

import { rateLimitStore } from '@/lib/api/middleware/rateLimitStore';
import { createServiceRoleClient } from '@/lib/supabase/server';

import {
  assertOpenLifecycleSlot,
  assertOpenWindowSlot,
  consumePollRate,
  ProductLimitError,
  PRODUCT_24H_LIMITS,
  productLimitMessage,
} from '../productLimits';

jest.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: jest.fn() }));
jest.mock('@/lib/api/middleware/rateLimitStore', () => ({
  rateLimitStore: { increment: jest.fn() },
}));

const mockCreateClient = createServiceRoleClient as jest.MockedFunction<
  typeof createServiceRoleClient
>;
const mockIncrement = rateLimitStore.increment as jest.Mock;

/** A count-only query stub: `.select().eq().eq().gt()` resolves the count. */
function mockCount(count: number | null, message?: string): void {
  const query = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockResolvedValue({ count, error: message ? { message } : null }),
  };
  mockCreateClient.mockReturnValue({
    from: jest.fn().mockReturnValue(query),
  } as unknown as ReturnType<typeof createServiceRoleClient>);
}

const NOW = Date.parse('2026-11-07T00:00:00.000Z');

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Date, 'now').mockReturnValue(NOW);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('PRODUCT_24H_LIMITS', () => {
  it('pins the public cap values', () => {
    expect(PRODUCT_24H_LIMITS).toEqual({
      maxOpenWindowsPerKey: 5,
      maxOpenLifecyclesPerKey: 3,
      maxPollsPerMinute: 10,
      pollRateWindowMs: 60_000,
    });
  });
});

describe('assertOpenWindowSlot', () => {
  it('allows a key with fewer than 5 open windows', async () => {
    mockCount(4);
    await expect(assertOpenWindowSlot('key-1')).resolves.toBeUndefined();
  });

  it('refuses the 5th open window with no Retry-After', async () => {
    mockCount(5);
    const error = await assertOpenWindowSlot('key-1').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ProductLimitError);
    expect(error).toMatchObject({
      scope: 'open_windows',
      limit: 5,
      current: 5,
      retryAfterSeconds: null,
      retryAfterBasis: 'recheck',
    });
  });

  it('does not count inventory for keyless x402 buyers', async () => {
    await expect(assertOpenWindowSlot(null)).resolves.toBeUndefined();
    expect(mockCreateClient).not.toHaveBeenCalled();
  });

  it('fails closed when the count query errors', async () => {
    mockCount(null, 'database unavailable');
    await expect(assertOpenWindowSlot('key-1')).rejects.toThrow('Product slot count failed');
  });
});

describe('assertOpenLifecycleSlot', () => {
  it('allows 2 open lifecycles and refuses the 3rd', async () => {
    mockCount(2);
    await expect(assertOpenLifecycleSlot('key-1')).resolves.toBeUndefined();

    mockCount(3);
    await expect(assertOpenLifecycleSlot('key-1')).rejects.toMatchObject({
      scope: 'open_lifecycles',
      limit: 3,
      current: 3,
      retryAfterBasis: 'recheck',
    });
  });
});

describe('consumePollRate', () => {
  it('allows 10 polls in the rolling minute', async () => {
    mockIncrement.mockResolvedValue({ count: 10, resetTime: NOW + 60_000 });
    await expect(consumePollRate('key:key-1')).resolves.toBeUndefined();
    expect(mockIncrement).toHaveBeenCalledWith('product:oww:poll:key:key-1', 60_000);
  });

  it('refuses the 11th poll and derives Retry-After from the counter reset', async () => {
    mockIncrement.mockResolvedValue({ count: 11, resetTime: NOW + 42_000 });
    const error = await consumePollRate('key:key-1').catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ProductLimitError);
    expect(error).toMatchObject({
      scope: 'poll_rate',
      limit: 10,
      current: 11,
      retryAfterSeconds: 42,
      retryAfterBasis: 'rate_window',
    });
  });

  it('never returns less than a 1 second Retry-After', async () => {
    mockIncrement.mockResolvedValue({ count: 11, resetTime: NOW - 5_000 });
    await expect(consumePollRate('key:key-1')).rejects.toMatchObject({
      retryAfterSeconds: 1,
    });
  });

  it('renders concurrency refusals without a retry delay', () => {
    const message = productLimitMessage(
      new ProductLimitError('open_windows', 5, 5, null, 'recheck')
    );
    expect(message).toContain('open_windows');
    expect(message).toContain('limit 5');
    expect(message).toContain('No Retry-After');
    expect(message).toContain('24h expiry');
    expect(message).not.toMatch(/Retry after \d+s/);
  });

  it('renders the poll-rate retry window in the MCP error message', () => {
    const message = productLimitMessage(
      new ProductLimitError('poll_rate', 10, 11, 42, 'rate_window')
    );
    expect(message).toContain('Retry after 42s');
    expect(message).toContain('rolling minute');
  });
});
