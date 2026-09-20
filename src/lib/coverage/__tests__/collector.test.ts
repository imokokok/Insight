import { createServiceRoleClient } from '@/lib/supabase/server';

import { collectCoverageSlo, getCoverageSlo } from '../collector';
import { assessCoverage } from '../service';

jest.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: jest.fn() }));
jest.mock('../service', () => ({
  assessCoverage: jest.fn(),
  COVERAGE_POLICY_ID: `0x${'11'.repeat(32)}`,
}));
const upsert = jest.fn();
const maybeSingle = jest.fn();
const rpc = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  const chain = { select: jest.fn(), eq: jest.fn(), maybeSingle, upsert };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  jest
    .mocked(createServiceRoleClient)
    .mockReturnValue({ from: () => chain, rpc } as unknown as ReturnType<
      typeof createServiceRoleClient
    >);
  upsert.mockResolvedValue({ error: null });
  maybeSingle.mockResolvedValue({ error: null, data: null });
});
it('awaits durable failure recording for every target instead of dropping failed probes', async () => {
  jest.mocked(assessCoverage).mockRejectedValue(new Error('provider failure'));
  const results = await collectCoverageSlo();
  expect(results).toHaveLength(4);
  expect(results.every((r) => r.status === 'UNAVAILABLE')).toBe(true);
  const samples = upsert.mock.calls.filter(([row]) => row.target_id);
  expect(samples).toHaveLength(4);
  expect(samples[0][0]).toMatchObject({ status: 'UNAVAILABLE', signed_ready: false, proof: null });
  expect(samples[0][1]).toEqual({ onConflict: 'target_id,slot', ignoreDuplicates: true });
});
it('does not re-probe an already recorded first-attempt slot', async () => {
  maybeSingle.mockResolvedValue({ error: null, data: { slot: 123 } });
  expect((await collectCoverageSlo()).every((r) => r.status === 'ALREADY_RECORDED')).toBe(true);
  expect(assessCoverage).not.toHaveBeenCalled();
});
it('fails the run if enrollment/persistence is unavailable', async () => {
  upsert.mockResolvedValue({ error: { message: 'db error' } });
  await expect(collectCoverageSlo()).rejects.toThrow('ENROLLMENT_FAILED');
});
it('does not turn storage outages into empty healthy statistics', async () => {
  rpc.mockResolvedValue({ data: null, error: { message: 'db error' } });
  await expect(getCoverageSlo()).rejects.toThrow('STORAGE_UNAVAILABLE');
});
