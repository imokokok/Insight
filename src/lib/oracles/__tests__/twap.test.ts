import { TWAPClient } from '@/lib/oracles/clients/twap';
import { TWAP_POOL_ADDRESSES } from '@/lib/oracles/constants/twapConstants';
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
});
