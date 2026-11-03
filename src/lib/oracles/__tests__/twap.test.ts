import { decodeFunctionData, encodeAbiParameters, encodeFunctionResult } from 'viem';

import { TWAPClient } from '@/lib/oracles/clients/twap';
import { TWAP_POOL_ADDRESSES } from '@/lib/oracles/constants/twapConstants';
import { twapOnChainService } from '@/lib/oracles/services/twapOnChainService';
import { MULTICALL3_ABI, MULTICALL3_ADDRESS } from '@/lib/oracles/utils/multicall3';
import { Blockchain } from '@/types/oracle';

describe('TWAPClient', () => {
  it('supports Ethereum WETH through its own USDC/WETH pool identity', () => {
    const client = new TWAPClient();

    expect(client.isSymbolSupported('WETH', Blockchain.ETHEREUM)).toBe(true);
    expect(TWAP_POOL_ADDRESSES.WETH[1]).toEqual({
      address: '0x88e6A0c2dDD26FEEb64F039a2c41296FcB3f5640',
      feeTier: 500,
      token0: 'USDC',
      token1: 'WETH',
    });
  });

  it('supports USDC on Base through the verified WETH/USDC pool', () => {
    const client = new TWAPClient();

    expect(client.isSymbolSupported('USDC', Blockchain.BASE)).toBe(true);
    expect(TWAP_POOL_ADDRESSES.USDC[8453]).toEqual({
      address: '0x6c561B446416E1A00E8E93E221854d6eA4171372',
      feeTier: 3000,
      token0: 'WETH',
      token1: 'USDC',
    });
  });

  it('combines same-chain pool reads into one snapshot Multicall request', async () => {
    const slot0 = encodeAbiParameters(
      [
        { type: 'uint160' },
        { type: 'int24' },
        { type: 'uint16' },
        { type: 'uint16' },
        { type: 'uint16' },
        { type: 'uint8' },
        { type: 'bool' },
      ],
      [1n, 0, 0, 0, 0, 0, true]
    );
    const liquidity = encodeAbiParameters([{ type: 'uint128' }], [1000000000000000000n]);
    const observe = encodeAbiParameters(
      [{ type: 'int56[]' }, { type: 'uint160[]' }],
      [
        [0n, 0n],
        [0n, 0n],
      ]
    );
    global.fetch = jest.fn(async (_: unknown, options?: RequestInit) => {
      const request = JSON.parse(String(options?.body));
      expect(request.params[0].to.toLowerCase()).toBe(MULTICALL3_ADDRESS.toLowerCase());
      const decoded = decodeFunctionData({ abi: MULTICALL3_ABI, data: request.params[0].data });
      const calls = decoded.args?.[0] as readonly unknown[];
      const data = encodeFunctionResult({
        abi: MULTICALL3_ABI,
        functionName: 'aggregate3',
        result: calls.map((_, index) => ({
          success: true,
          returnData: [slot0, liquidity, observe][index % 3],
        })),
      });
      return {
        ok: true,
        json: async () => ({ jsonrpc: '2.0', id: request.id, result: data }),
      } as Response;
    });

    const results = await twapOnChainService.getSnapshotPricesBatch([
      { id: 'eth', symbol: 'ETH', chainId: 1 },
      { id: 'weth', symbol: 'WETH', chainId: 1 },
    ]);

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(results).toEqual([
      expect.objectContaining({ id: 'eth', error: null, data: expect.any(Object) }),
      expect.objectContaining({ id: 'weth', error: null, data: expect.any(Object) }),
    ]);
  });
});
