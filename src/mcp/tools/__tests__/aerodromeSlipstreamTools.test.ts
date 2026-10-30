import { getToolCreditCost } from '@/lib/billing/metering';
import { prepareAerodromeSlipstreamExactInput } from '@/lib/dex/aerodromeSlipstreamSwap';

import { prepareAerodromeSlipstreamSwapTool } from '../aerodromeSlipstreamTools';
import { getToolDefinitions } from '../index';

jest.mock('@/lib/dex/aerodromeSlipstreamSwap', () => ({
  prepareAerodromeSlipstreamExactInput: jest.fn(),
}));

const mockedPrepare = prepareAerodromeSlipstreamExactInput as jest.MockedFunction<
  typeof prepareAerodromeSlipstreamExactInput
>;

const args = {
  amountIn: '1.25',
  recipient: '0x1111111111111111111111111111111111111111',
  deadlineUnixSeconds: 1_800_000_000,
  maxSlippageBps: 50,
};

describe('prepare_aerodrome_slipstream_swap MCP tool', () => {
  beforeEach(() => jest.clearAllMocks());

  it('is discoverable, strictly validates a user-controlled transaction request, and uses C3 pricing', () => {
    expect(getToolDefinitions().map((tool) => tool.name)).toContain(
      'prepare_aerodrome_slipstream_swap'
    );
    expect(prepareAerodromeSlipstreamSwapTool.parameters.safeParse(args).success).toBe(true);
    expect(
      prepareAerodromeSlipstreamSwapTool.parameters.safeParse({
        ...args,
        profileId: 'base-aerodrome-slipstream-weth-usdc-cl100',
      }).success
    ).toBe(true);
    expect(
      prepareAerodromeSlipstreamSwapTool.parameters.safeParse({
        ...args,
        profileId: 'unreviewed-aerodrome-pool',
      }).success
    ).toBe(false);
    expect(
      prepareAerodromeSlipstreamSwapTool.parameters.safeParse({ ...args, amountIn: '1e-2' }).success
    ).toBe(false);
    expect(
      prepareAerodromeSlipstreamSwapTool.parameters.safeParse({ ...args, maxSlippageBps: 10_000 })
        .success
    ).toBe(false);
    expect(getToolCreditCost('prepare_aerodrome_slipstream_swap')).toBe(5);
  });

  it('returns unsigned preparation output and the Base execution-receipt handoff', async () => {
    mockedPrepare.mockResolvedValue({
      kind: 'aerodrome-slipstream-exact-input-v1',
      chainId: 8453,
      transaction: { to: '0xBE6D8f0d05cC4be24d5167a3eF062215bE6D18a5', data: '0x12', value: '0x0' },
      approval: {
        token: '0x4200000000000000000000000000000000000006',
        spender: '0xBE6D8f0d05cC4be24d5167a3eF062215bE6D18a5',
        amountRaw: '1',
        data: '0x34',
      },
      exactInput: { deadlineUnixSeconds: 1_800_000_000 },
      quote: { observedAt: '2026-10-31T00:00:00.000Z', venue: 'aerodrome-slipstream' },
      caveats: [],
    } as never);

    const output = JSON.parse(await prepareAerodromeSlipstreamSwapTool.handler(args));

    expect(mockedPrepare).toHaveBeenCalledWith(args);
    expect(output.kind).toBe('aerodrome-slipstream-exact-input-v1');
    expect(output.postSettlement).toMatchObject({
      submitTransactionHashTo: 'execution_receipt',
      sourceAssetId: 'eip155:8453/erc20:0x4200000000000000000000000000000000000006',
      destinationAssetId: 'eip155:8453/erc20:0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    });
  });
});
