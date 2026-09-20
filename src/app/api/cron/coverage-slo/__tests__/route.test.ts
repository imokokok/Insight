/** @jest-environment node */
import { collectCoverageSlo, getCoverageSlo } from '@/lib/coverage/collector';

import { GET } from '../route';

jest.mock('@/lib/coverage/collector', () => ({
  collectCoverageSlo: jest.fn(),
  getCoverageSlo: jest.fn(),
}));
const prior = process.env.CRON_SECRET;
beforeEach(() => {
  process.env.CRON_SECRET = 'test-coverage-cron';
});
afterEach(() => {
  if (prior === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = prior;
});
it('requires actual cron authentication before sampling', async () => {
  const response = await GET(new Request('https://test/api/cron/coverage-slo'));
  expect(response.status).toBe(401);
  expect(collectCoverageSlo).not.toHaveBeenCalled();
});
it('returns durable-sample and measurement-gap alerts to the scheduler', async () => {
  jest.mocked(collectCoverageSlo).mockResolvedValue([]);
  jest.mocked(getCoverageSlo).mockResolvedValue({
    targets: [
      { asset: 'USDC', chain_id: 1, status: 'MEASUREMENT_GAP', signedStatus: 'BELOW_OBJECTIVE' },
    ],
  } as Awaited<ReturnType<typeof getCoverageSlo>>);
  const response = await GET(
    new Request('https://test/api/cron/coverage-slo', {
      headers: { Authorization: 'Bearer test-coverage-cron' },
    })
  );
  expect(response.status).toBe(200);
  expect((await response.json()).alerts).toHaveLength(1);
});
it('fails the run on persistence failure', async () => {
  jest.mocked(collectCoverageSlo).mockRejectedValue(new Error('storage unavailable'));
  const response = await GET(
    new Request('https://test/api/cron/coverage-slo', {
      headers: { Authorization: 'Bearer test-coverage-cron' },
    })
  );
  expect(response.status).toBe(503);
});
