import { getAllProtocolsWithDynamicData } from '@/lib/protocols/dynamicData';
import {
  findAffectedProtocols,
  resetAffectedProtocolsCacheForTests,
} from '@/lib/risk/findAffectedProtocols';
import { Blockchain } from '@/types/oracle';

jest.mock('@/lib/protocols/dynamicData', () => ({
  getAllProtocolsWithDynamicData: jest.fn(),
}));

const mockedGetAllProtocols = getAllProtocolsWithDynamicData as jest.MockedFunction<
  typeof getAllProtocolsWithDynamicData
>;

describe('findAffectedProtocols cache', () => {
  beforeEach(() => {
    resetAffectedProtocolsCacheForTests();
    jest.clearAllMocks();
  });

  it('coalesces data reads but materializes caller-specific risk text on every call', async () => {
    let resolveProtocols!: (value: unknown) => void;
    mockedGetAllProtocols.mockReturnValue(
      new Promise((resolve) => {
        resolveProtocols = resolve;
      }) as ReturnType<typeof getAllProtocolsWithDynamicData>
    );

    const first = findAffectedProtocols('usdc', {
      buildRiskSummary: () => 'first caller wording',
    });
    const second = findAffectedProtocols('USDC', {
      buildRiskSummary: () => 'second caller wording',
    });

    expect(mockedGetAllProtocols).toHaveBeenCalledTimes(1);
    resolveProtocols([
      {
        id: 'aave-v3-ethereum',
        name: 'Aave V3',
        chain: Blockchain.ETHEREUM,
        protocolType: 'lending',
        tvlUsd: 1,
        assets: [{ symbol: 'USDC', liquidationThreshold: 1.1 }],
      },
    ]);

    const [firstResult, secondResult] = await Promise.all([first, second]);
    expect(firstResult[0]?.riskSummary).toBe('first caller wording');
    expect(secondResult[0]?.riskSummary).toBe('second caller wording');
    expect(mockedGetAllProtocols).toHaveBeenCalledTimes(1);

    const cached = await findAffectedProtocols('USDC', {
      buildRiskSummary: () => 'third caller wording',
    });
    expect(cached[0]?.riskSummary).toBe('third caller wording');
    expect(mockedGetAllProtocols).toHaveBeenCalledTimes(1);
  });
});
