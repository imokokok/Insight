import { consumeCredits, makeMeteringKey, recordWaivedCredit } from '@/lib/billing/creditWallet';

import { consumeMcpQuota } from '../middleware';

jest.mock('@/lib/billing/creditWallet', () => ({
  consumeCredits: jest.fn(),
  makeMeteringKey: jest.fn(() => 'metering-key'),
  precheckCredits: jest.fn(),
  recordWaivedCredit: jest.fn(),
}));

const mockedConsumeCredits = consumeCredits as jest.MockedFunction<typeof consumeCredits>;
const mockedMakeMeteringKey = makeMeteringKey as jest.MockedFunction<typeof makeMeteringKey>;
const mockedRecordWaivedCredit = recordWaivedCredit as jest.MockedFunction<
  typeof recordWaivedCredit
>;

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

    expect(result).toEqual(
      expect.objectContaining({
        allowed: false,
        reason: 'INSUFFICIENT_CREDITS',
        cost: 40,
        charged: 0,
        source: 'credits',
      })
    );
    expect(mockedConsumeCredits).toHaveBeenCalledWith(
      'key-1',
      40,
      'metering-key',
      '/mcp/tools/agent_begin_trade',
      expect.objectContaining({ reason: 'agent_begin_trade' })
    );
    expect(mockedRecordWaivedCredit).not.toHaveBeenCalled();
  });

  it('records an entitlement-covered call as a 0-delta subscription waiver', async () => {
    mockedMakeMeteringKey.mockReturnValue('metering-key');
    mockedConsumeCredits.mockClear();

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
      'oracle_watch_window_poll'
    );

    expect(result).toEqual(
      expect.objectContaining({ allowed: true, cost: 0, charged: 0, source: 'entitlement' })
    );
    expect(mockedConsumeCredits).not.toHaveBeenCalled();
    expect(mockedRecordWaivedCredit).toHaveBeenCalledTimes(1);
    expect(mockedRecordWaivedCredit).toHaveBeenCalledWith(
      expect.objectContaining({
        keyId: 'key-1',
        meteringKey: 'metering-key',
        source: 'subscription',
        reason: 'tool_free',
      })
    );
  });
});
