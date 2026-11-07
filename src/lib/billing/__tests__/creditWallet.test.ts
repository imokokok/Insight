import { createServiceRoleClient } from '@/lib/supabase/server';

import {
  consumeCredits,
  makeMeteringKey,
  precheckCredits,
  recordWaivedCredit,
} from '../creditWallet';

jest.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: jest.fn() }));

it('maps the snake_case precheck payload onto CreditPrecheck', async () => {
  const rpc = jest.fn();
  jest.mocked(createServiceRoleClient).mockReturnValue({ rpc } as never);
  rpc.mockResolvedValueOnce({
    data: { ok: true, balance: 20, cost: 7, budget: 8, used: 6, budget_warning: true },
    error: null,
  });
  expect(await precheckCredits('key', 7)).toEqual({
    ok: true,
    balance: 20,
    cost: 7,
    budget: 8,
    used: 6,
    budgetWarning: true,
  });

  rpc.mockResolvedValueOnce({
    data: { ok: true, balance: 20, cost: 1, budget: null, used: 0, budget_warning: false },
    error: null,
  });
  expect(await precheckCredits('key', 1)).toEqual({
    ok: true,
    balance: 20,
    cost: 1,
    budget: undefined,
    used: 0,
    budgetWarning: false,
  });
});

it('distinguishes confirmed charges and replays from uncertain database outcomes', async () => {
  const rpc = jest.fn();
  jest.mocked(createServiceRoleClient).mockReturnValue({ rpc } as never);
  rpc.mockResolvedValueOnce({ data: { ok: true, balance: 45, cost: 5 }, error: null });
  expect(await consumeCredits('key', 5, 'request-1')).toEqual({
    ok: true,
    confirmed: true,
    balance: 45,
    cost: 5,
  });
  rpc.mockResolvedValueOnce({ data: { ok: true, idempotent: true, balance: 45 }, error: null });
  expect(await consumeCredits('key', 5, 'request-1')).toMatchObject({
    confirmed: true,
    idempotent: true,
  });
  rpc.mockResolvedValueOnce({ data: null, error: { message: 'timeout after possible commit' } });
  expect(await consumeCredits('key', 5, 'request-2')).toEqual({ ok: true, confirmed: false });
  rpc.mockRejectedValueOnce(new Error('network lost'));
  expect(await consumeCredits('key', 5, 'request-3')).toEqual({ ok: true, confirmed: false });
  rpc.mockResolvedValueOnce({ data: {}, error: null });
  expect(await consumeCredits('key', 5, 'request-4')).toEqual({ ok: true, confirmed: false });
});

it('queues a pending settlement instead of silently giving the call away', async () => {
  const rpc = jest.fn();
  jest.mocked(createServiceRoleClient).mockReturnValue({ rpc } as never);
  rpc.mockResolvedValueOnce({ data: null, error: { message: 'DB unavailable' } });
  rpc.mockResolvedValueOnce({ data: { ok: true }, error: null });

  const outcome = await consumeCredits('key', 5, 'request-db-down', '/api/v1/coverage', {
    reason: '/api/v1/coverage',
  });

  expect(outcome).toEqual({ ok: true, confirmed: false });
  expect(rpc).toHaveBeenNthCalledWith(
    2,
    'record_pending_settlement',
    expect.objectContaining({
      p_key_id: 'key',
      p_cost: 5,
      p_metering_key: 'request-db-down',
      p_error: 'DB unavailable',
    })
  );
});

it('writes a waive-prefixed 0-delta row and reports failure without throwing', async () => {
  const rpc = jest.fn();
  jest.mocked(createServiceRoleClient).mockReturnValue({ rpc } as never);
  rpc.mockResolvedValueOnce({ data: { ok: true }, error: null });

  expect(
    await recordWaivedCredit({
      keyId: 'key',
      meteringKey: 'rest:key',
      reason: 'insufficient_data',
      ref: '/api/v1/prices/batch',
    })
  ).toBe(true);
  expect(rpc).toHaveBeenCalledWith(
    'record_waived_credit',
    expect.objectContaining({
      p_metering_key: 'waive:rest:key',
      p_source: 'free',
      p_reason: 'insufficient_data',
    })
  );

  rpc.mockResolvedValueOnce({ data: null, error: { message: 'down' } });
  expect(
    await recordWaivedCredit({
      keyId: 'key',
      meteringKey: 'rest:key-2',
      reason: 'timeout',
    })
  ).toBe(false);
});

it('uses unambiguous random identifiers for distinct logical calls', () => {
  const keys = new Set(Array.from({ length: 100 }, () => makeMeteringKey('rest:key')));
  expect(keys.size).toBe(100);
  for (const key of keys) expect(key).toMatch(/^rest:key:[0-9a-f-]{36}$/);
});

/**
 * Minimal chainable stand-in for a Supabase query builder. Each table returns
 * one fixed result; `maybeSingle` and awaiting the builder resolve it.
 */
function tableBuilder(result: unknown) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    gt: () => chain,
    in: () => chain,
    order: () => chain,
    maybeSingle: async () => ({ data: result, error: null }),
    then: (resolve: (value: unknown) => void, reject: (reason: unknown) => void) =>
      Promise.resolve({ data: result, error: null }).then(resolve, reject),
  };
  return chain;
}

function clientWithLedger(input: {
  balance: number | string;
  lots: Array<{ id: number; delta: number; source: string | null }>;
  rpc: jest.Mock;
}) {
  return {
    rpc: input.rpc,
    from: (table: string) => {
      if (table === 'api_keys') return tableBuilder({ user_id: 'user-1' });
      if (table === 'credit_wallet') return tableBuilder({ balance: input.balance });
      if (table === 'credit_ledger') return tableBuilder(input.lots);
      return tableBuilder(null);
    },
  };
}

it('attributes a charge to the oldest unexhausted lot and records the split', async () => {
  const rpc = jest
    .fn()
    .mockResolvedValue({ data: { ok: true, balance: 120, cost: 30 }, error: null });
  jest.mocked(createServiceRoleClient).mockReturnValue(
    clientWithLedger({
      balance: 120,
      lots: [
        { id: 10, delta: 100, source: 'signup' },
        { id: 11, delta: 50, source: 'subscription' },
      ],
      rpc,
    }) as never
  );

  // Granted 150, balance 120 → 30 already consumed out of the first lot.
  await consumeCredits('key', 30, 'request-fifo', '/api/v1/prices', { reason: 'prices' });

  expect(rpc).toHaveBeenCalledWith(
    'consume_credits',
    expect.objectContaining({
      p_source: 'free',
      p_meta: { allocations: [{ lotId: 10, source: 'free', amount: 30 }] },
    })
  );
});

it('splits across lots and reports the largest share as the row source', async () => {
  const rpc = jest
    .fn()
    .mockResolvedValue({ data: { ok: true, balance: 60, cost: 25 }, error: null });
  jest.mocked(createServiceRoleClient).mockReturnValue(
    clientWithLedger({
      balance: 60,
      lots: [
        { id: 10, delta: 100, source: 'signup' },
        { id: 11, delta: 50, source: 'subscription' },
      ],
      rpc,
    }) as never
  );

  // Granted 150, balance 60 → 90 consumed. Lot 10 has 10 left, so this
  // 25-credit charge takes 10 from the signup lot and 15 from the plan lot.
  await consumeCredits('key', 25, 'request-split', '/api/v1/prices', { reason: 'prices' });

  expect(rpc).toHaveBeenCalledWith(
    'consume_credits',
    expect.objectContaining({
      p_source: 'subscription',
      p_meta: {
        allocations: [
          { lotId: 10, source: 'free', amount: 10 },
          { lotId: 11, source: 'subscription', amount: 15 },
        ],
      },
    })
  );
});

it('leaves the source null when the funding lots predate source tracking', async () => {
  const rpc = jest
    .fn()
    .mockResolvedValue({ data: { ok: true, balance: 80, cost: 20 }, error: null });
  jest.mocked(createServiceRoleClient).mockReturnValue(
    clientWithLedger({
      balance: 100,
      lots: [{ id: 9, delta: 120, source: null }],
      rpc,
    }) as never
  );

  await consumeCredits('key', 20, 'request-legacy', '/api/v1/prices', { reason: 'prices' });

  expect(rpc).toHaveBeenCalledWith(
    'consume_credits',
    expect.objectContaining({
      p_source: null,
      p_meta: { allocations: [{ lotId: 9, source: null, amount: 20 }] },
    })
  );
});
