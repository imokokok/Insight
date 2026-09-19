import { createServiceRoleClient } from '@/lib/supabase/server';

import { consumeCredits, makeMeteringKey } from '../creditWallet';

jest.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: jest.fn() }));

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

it('uses unambiguous random identifiers for distinct logical calls', () => {
  const keys = new Set(Array.from({ length: 100 }, () => makeMeteringKey('rest:key')));
  expect(keys.size).toBe(100);
  for (const key of keys) expect(key).toMatch(/^rest:key:[0-9a-f-]{36}$/);
});
