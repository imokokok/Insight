import {
  PANCAKE_SWAP_V3_BASE_CODE_IDENTITY,
  PANCAKE_SWAP_V3_BASE_USDC_USDT,
  listReviewedPancakeSwapV3Profiles,
  reviewedPancakeSwapV3Profile,
} from '../pancakeSwapV3';
import { preparePancakeSwapV3ExactInput } from '../pancakeSwapV3Swap';

describe('PancakeSwap V3 Base reviewed profile', () => {
  it('pins the Base USDC/USDT 0.01% profile and every dependency identity', () => {
    const profile = reviewedPancakeSwapV3Profile('base-pancakeswap-v3-usdc-usdt-100');
    expect(profile).toMatchObject({
      chainId: 8453,
      venue: 'pancakeswap-v3',
      market: 'USDC/USDT',
      feeTier: 100,
      pool: PANCAKE_SWAP_V3_BASE_USDC_USDT.pool,
      quoteAmountsToken0: [100, 1_000, 10_000],
    });
    expect(profile.codeIdentity).toEqual({
      factory: PANCAKE_SWAP_V3_BASE_CODE_IDENTITY.factory,
      quoterV2: PANCAKE_SWAP_V3_BASE_CODE_IDENTITY.quoterV2,
      pool: PANCAKE_SWAP_V3_BASE_USDC_USDT.poolCodeHash,
    });
    expect(listReviewedPancakeSwapV3Profiles()).toHaveLength(1);
  });

  it('rejects a deadline before it attempts a quote or router read', async () => {
    await expect(
      preparePancakeSwapV3ExactInput(
        {
          amountIn: '1',
          recipient: '0x1111111111111111111111111111111111111111',
          deadlineUnixSeconds: 100,
          maxSlippageBps: 50,
        },
        { nowUnixSeconds: 100 }
      )
    ).rejects.toThrow('deadline');
  });
});
