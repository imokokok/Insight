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
it('keeps historical SLO alerts separate from a healthy latest sample', async () => {
  jest.mocked(collectCoverageSlo).mockResolvedValue([]);
  jest.mocked(getCoverageSlo).mockResolvedValue({
    targets: [
      {
        asset: 'USDC',
        chain_id: 1,
        status: 'MEASUREMENT_GAP',
        signedStatus: 'BELOW_OBJECTIVE',
        latest: { status: 'PASS', signedReady: true, reasons: [] },
      },
    ],
  } as Awaited<ReturnType<typeof getCoverageSlo>>);
  const response = await GET(
    new Request('https://test/api/cron/coverage-slo', {
      headers: { Authorization: 'Bearer test-coverage-cron' },
    })
  );
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.alerts).toHaveLength(1);
  expect(body.latestAlerts).toEqual([]);
});
it('reports an unhealthy latest sample independently of the rolling SLO', async () => {
  jest.mocked(collectCoverageSlo).mockResolvedValue([]);
  jest.mocked(getCoverageSlo).mockResolvedValue({
    targets: [
      {
        asset: 'USDC',
        chain_id: 8453,
        status: 'HEALTHY',
        signedStatus: 'HEALTHY',
        latest: {
          status: 'INSUFFICIENT_COVERAGE',
          signedReady: false,
          reasons: ['INSUFFICIENT_COVERAGE'],
        },
      },
    ],
  } as Awaited<ReturnType<typeof getCoverageSlo>>);
  const response = await GET(
    new Request('https://test/api/cron/coverage-slo', {
      headers: { Authorization: 'Bearer test-coverage-cron' },
    })
  );

  const body = await response.json();
  expect(body.alerts).toEqual([]);
  expect(body.latestAlerts).toEqual([
    {
      asset: 'USDC',
      chainId: 8453,
      status: 'INSUFFICIENT_COVERAGE',
      signedReady: false,
      reasons: ['INSUFFICIENT_COVERAGE'],
    },
  ]);
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
