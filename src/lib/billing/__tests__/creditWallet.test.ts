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
    source: 'wallet',
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
