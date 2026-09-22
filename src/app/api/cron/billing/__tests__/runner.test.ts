/** @jest-environment node */
import { cleanupIncompleteSubscriptions, downgradeExpiredSubscriptions } from '@/lib/api/apiKey';
import { addMonthlyCredits } from '@/lib/billing/creditWallet';

import { runBilling } from '../runner';

jest.mock('@/lib/api/apiKey', () => ({
  cleanupIncompleteSubscriptions: jest.fn(),
  downgradeExpiredSubscriptions: jest.fn(),
}));
jest.mock('@/lib/billing/creditWallet', () => ({ addMonthlyCredits: jest.fn() }));

beforeEach(() => {
  jest.mocked(downgradeExpiredSubscriptions).mockResolvedValue({ downgraded: 0 });
  jest.mocked(cleanupIncompleteSubscriptions).mockResolvedValue({ cleanedUp: 0 });
});

it('fails billing when the credit grant outcome is unknown, but accepts a confirmed zero', async () => {
  jest.mocked(addMonthlyCredits).mockResolvedValueOnce(null).mockResolvedValueOnce(0);
  expect((await runBilling()).status).toBe(500);
  expect(await runBilling()).toMatchObject({ status: 200, body: { data: { creditsGranted: 0 } } });
});
