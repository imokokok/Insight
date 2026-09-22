import { createServiceRoleClient } from '@/lib/supabase/server';

import { collectCoverageSlo, getCoverageAlertChanges, getCoverageSlo } from '../collector';
import { assessCoverage } from '../service';

jest.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: jest.fn() }));
jest.mock('../service', () => ({
  assessCoverage: jest.fn(),
  COVERAGE_POLICY_ID: `0x${'11'.repeat(32)}`,
}));
const upsert = jest.fn();
const maybeSingle = jest.fn();
const rpc = jest.fn();
const history = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  const chain = { select: jest.fn(), eq: jest.fn(), in: jest.fn(), maybeSingle, upsert };
  chain.select.mockReturnValue(chain);
  chain.eq.mockReturnValue(chain);
  chain.in.mockReturnValue({ gte: () => ({ lt: history }) });
  jest
    .mocked(createServiceRoleClient)
    .mockReturnValue({ from: () => chain, rpc } as unknown as ReturnType<
      typeof createServiceRoleClient
    >);
  upsert.mockResolvedValue({ error: null });
  maybeSingle.mockResolvedValue({ error: null, data: null });
  history.mockResolvedValue({ error: null, data: [] });
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
it('keeps old policy evidence without counting its stopped targets as current gaps', async () => {
  const counts = {
    expected: 1,
    observed: 1,
    data_ready: 1,
    signed_ready: 1,
    unavailable: 0,
    missing: 0,
    objective_bps: 9900,
  };
  rpc.mockResolvedValue({
    error: null,
    data: [
      { ...counts, id: 'old', policy_id: `0x${'22'.repeat(32)}` },
      { ...counts, id: 'current', policy_id: `0x${'11'.repeat(32)}` },
    ],
  });
  expect((await getCoverageSlo()).targets.map((target) => target.id)).toEqual(['current']);
});
it('opens one incident after two bad slots and records recovery after two good slots', async () => {
  const id = `ETH:8453:0x${'11'.repeat(32)}`;
  const slot = 9000;
  const sample = [{ asset: 'ETH', chainId: 8453, slot, status: 'INSUFFICIENT_COVERAGE' }];
  const summary = (status: string, signedReady: boolean) =>
    ({
      targets: [
        {
          id,
          latest: { slot, status, signedReady, reasons: ['INSUFFICIENT_COVERAGE'] },
        },
      ],
    }) as Awaited<ReturnType<typeof getCoverageSlo>>;

  const record = (recordSlot: number, status: string) => ({
    target_id: id,
    slot: recordSlot,
    status,
    signed_ready: status === 'PASS',
  });
  history.mockResolvedValue({ error: null, data: [record(slot - 900, 'PASS')] });
  expect(
    (await getCoverageAlertChanges(sample, summary('INSUFFICIENT_COVERAGE', false))).newFailures
  ).toEqual([]);

  history.mockResolvedValue({
    error: null,
    data: [record(slot - 900, 'INSUFFICIENT_COVERAGE'), record(slot - 1800, 'PASS')],
  });
  expect(
    (await getCoverageAlertChanges(sample, summary('INSUFFICIENT_COVERAGE', false))).newFailures
  ).toHaveLength(1);
  history.mockResolvedValue({
    error: null,
    data: [
      record(slot - 900, 'INSUFFICIENT_COVERAGE'),
      record(slot - 1800, 'INSUFFICIENT_COVERAGE'),
    ],
  });
  expect(
    (await getCoverageAlertChanges(sample, summary('INSUFFICIENT_COVERAGE', false))).newFailures
  ).toEqual([]);
  history.mockResolvedValue({
    error: null,
    data: [
      record(slot - 900, 'INSUFFICIENT_COVERAGE'),
      record(slot - 1800, 'PASS'),
      record(slot - 2700, 'INSUFFICIENT_COVERAGE'),
    ],
  });
  expect(
    (await getCoverageAlertChanges(sample, summary('INSUFFICIENT_COVERAGE', false))).newFailures
  ).toEqual([]);
  expect(
    (await getCoverageAlertChanges([{ ...sample[0], status: 'PASS' }], summary('PASS', true)))
      .recoveries
  ).toEqual([]);
  history.mockResolvedValue({
    error: null,
    data: [
      record(slot - 900, 'PASS'),
      record(slot - 1800, 'INSUFFICIENT_COVERAGE'),
      record(slot - 2700, 'INSUFFICIENT_COVERAGE'),
    ],
  });
  expect(
    (await getCoverageAlertChanges([{ ...sample[0], status: 'PASS' }], summary('PASS', true)))
      .recoveries
  ).toEqual([{ asset: 'ETH', chainId: 8453 }]);
  expect(
    await getCoverageAlertChanges(
      [{ ...sample[0], status: 'ALREADY_RECORDED' }],
      summary('INSUFFICIENT_COVERAGE', false)
    )
  ).toEqual({ newFailures: [], recoveries: [] });
});
it('fails closed when prior incident history is unavailable', async () => {
  history.mockResolvedValue({ error: { message: 'offline' }, data: null });
  const sample = [{ asset: 'ETH', chainId: 8453, slot: 9000, status: 'PASS' }];
  await expect(
    getCoverageAlertChanges(sample, { targets: [] } as Awaited<ReturnType<typeof getCoverageSlo>>)
  ).rejects.toThrow('COVERAGE_ALERT_HISTORY_UNAVAILABLE');
});
