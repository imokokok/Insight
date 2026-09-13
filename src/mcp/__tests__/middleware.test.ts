import { consumeCredits, makeMeteringKey } from '@/lib/billing/creditWallet';

import { consumeMcpQuota } from '../middleware';

jest.mock('@/lib/billing/creditWallet', () => ({
  consumeCredits: jest.fn(),
  makeMeteringKey: jest.fn(() => 'metering-key'),
  precheckCredits: jest.fn(),
}));

const mockedConsumeCredits = consumeCredits as jest.MockedFunction<typeof consumeCredits>;
const mockedMakeMeteringKey = makeMeteringKey as jest.MockedFunction<typeof makeMeteringKey>;

describe('consumeMcpQuota', () => {
  it('surfaces an authoritative concurrent charge rejection', async () => {
    mockedMakeMeteringKey.mockReturnValue('metering-key');
    mockedConsumeCredits.mockResolvedValue({ ok: false, reason: 'INSUFFICIENT_CREDITS' });

    const result = await consumeMcpQuota(
      {
        type: 'apikey',
        userId: 'user-1',
        apiKey: {
          keyId: 'key-1',
          userId: 'user-1',
          plan: 'pro',
          rateLimit: 100,
        },
      } as never,
      'agent_begin_trade'
    );

    expect(result).toEqual({ allowed: false, reason: 'INSUFFICIENT_CREDITS' });
    expect(mockedConsumeCredits).toHaveBeenCalledWith(
      'key-1',
      10,
      'metering-key',
      '/mcp/tools/agent_begin_trade'
    );
  });
});
