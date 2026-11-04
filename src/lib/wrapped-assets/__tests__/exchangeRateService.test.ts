import { getChainlinkRPCConfig } from '@/lib/oracles/services/chainlinkDataSources';
import { RpcClientWithFallback } from '@/lib/oracles/utils/rpcClientWithFallback';
import { lstExchangeRateService } from '@/lib/wrapped-assets/exchangeRateService';

jest.mock('@/lib/oracles/services/chainlinkDataSources', () => ({
  getChainlinkRPCConfig: jest.fn(),
}));

jest.mock('@/lib/oracles/utils/rpcClientWithFallback', () => ({
  RpcClientWithFallback: jest.fn(() => ({ ethCall: jest.fn() })),
}));

const mockGetChainlinkRPCConfig = jest.mocked(getChainlinkRPCConfig);
const mockRpcClient = jest.mocked(RpcClientWithFallback);
const mockEthCall = (mockRpcClient.mock.results[0]?.value as { ethCall: jest.Mock }).ethCall;

function encodedUint(value: bigint): `0x${string}` {
  return `0x${value.toString(16).padStart(64, '0')}`;
}

describe('LST exchange-rate service', () => {
  beforeEach(() => {
    lstExchangeRateService.clearCache();
    mockEthCall.mockReset();
    mockGetChainlinkRPCConfig.mockReset();
    mockGetChainlinkRPCConfig.mockReturnValue({ endpoints: ['https://rpc.example.test'] });
  });

  it('coalesces concurrent cache misses into one bounded RPC call', async () => {
    let resolveRpc!: (value: string) => void;
    mockEthCall.mockReturnValue(
      new Promise<string>((resolve) => {
        resolveRpc = resolve;
      })
    );

    const first = lstExchangeRateService.getExchangeRate('wstETH');
    const second = lstExchangeRateService.getExchangeRate('wstETH');

    expect(mockEthCall).toHaveBeenCalledTimes(1);
    expect(mockEthCall.mock.calls[0]?.[4]).toBeInstanceOf(AbortSignal);
    resolveRpc(encodedUint(10n ** 18n));

    await expect(Promise.all([first, second])).resolves.toEqual([1, 1]);
    await expect(lstExchangeRateService.getExchangeRate('wstETH')).resolves.toBe(1);
    expect(mockEthCall).toHaveBeenCalledTimes(1);
  });
});
