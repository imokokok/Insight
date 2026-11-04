import {
  PANCAKE_SWAP_V3_BASE_CODE_IDENTITY,
  PANCAKE_SWAP_V3_BASE_USDC_USDT,
  listReviewedPancakeSwapV3Profiles,
  pancakeSwapV3DeploymentForChain,
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
    expect(listReviewedPancakeSwapV3Profiles()).toHaveLength(4);
  });

  it('pins the Monad WMON/USDC 0.05% profile and every dependency identity', () => {
    expect(reviewedPancakeSwapV3Profile('monad-pancakeswap-v3-wmon-usdc-500')).toEqual({
      id: 'monad-pancakeswap-v3-wmon-usdc-500',
      chainId: 143,
      venue: 'pancakeswap-v3',
      market: 'WMON/USDC',
      factory: '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865',
      quoterV2: '0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997',
      pool: '0x63e48b725540a3db24acf6682a29f877808c53f2',
      codeIdentity: {
        factory: '0xf6105f5817b3f67dd0f060fa27c1e23a14d9fca13c6ebd695545ca4d5c0fbe06',
        quoterV2: '0x66711e04817b6da9499b9320b3c61c2d492ca4d78c58a798a7b453ba65feb5a6',
        pool: '0x35fd982b4dd2ca117a46c8ee159413c5fae65feb122ab257c5db26b78604e1be',
      },
      token0: {
        address: '0x3bd359C1119dA7Da1D913D1C4D2B7c461115433A',
        symbol: 'WMON',
        decimals: 18,
      },
      token1: {
        address: '0x754704Bc059F8C67012fEd69BC8A327a5aafb603',
        symbol: 'USDC',
        decimals: 6,
      },
      feeTier: 500,
      twapWindowSeconds: 1_800,
      quoteAmountsToken0: [100, 1_000, 10_000],
      maxSourceAgeSeconds: 120,
      cacheTtlMs: 10_000,
      rpcEndpoints: expect.arrayContaining([expect.stringContaining('rpc.monad.xyz')]),
    });
    expect(pancakeSwapV3DeploymentForChain(143)).toEqual({
      chainId: 143,
      factory: '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865',
      quoterV2: '0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997',
      swapRouter: '0x1b81D678ffb9C0263b24A97847620C99d213eB14',
      routerCodeHash: '0x373f7fcb2fbc8d2e53d0f735b10f9502b34b9b1bce6824de0821f7164eb77d52',
    });
  });

  it('pins the BNB USDT/USDC 0.01% profile and every dependency identity', () => {
    expect(reviewedPancakeSwapV3Profile('bnb-pancakeswap-v3-usdt-usdc-100')).toEqual({
      id: 'bnb-pancakeswap-v3-usdt-usdc-100',
      chainId: 56,
      venue: 'pancakeswap-v3',
      market: 'USDT/USDC',
      factory: '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865',
      quoterV2: '0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997',
      pool: '0x92b7807bf19b7dddf89b706143896d05228f3121',
      codeIdentity: {
        factory: '0x8191d3ab1d55d3da9822199f28865415c99566b6f1aee4a4b16713f57930678c',
        quoterV2: '0x2734833b7d2a656d4797f4a7d959314654749a7424ec473267613ff26424138a',
        pool: '0xc7f2aca72215bdbdca3ee6ae87d5500b09b13f0e6cfe097cd3092ab9e8439f34',
      },
      token0: {
        address: '0x55d398326f99059fF775485246999027B3197955',
        symbol: 'USDT',
        decimals: 18,
      },
      token1: {
        address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
        symbol: 'USDC',
        decimals: 18,
      },
      feeTier: 100,
      twapWindowSeconds: 1800,
      quoteAmountsToken0: [100, 1000, 10000],
      rpcEndpoints: expect.arrayContaining([
        'https://bsc-dataseed.binance.org',
        'https://bsc.publicnode.com',
      ]),
      maxSourceAgeSeconds: 120,
      cacheTtlMs: 10000,
    });
  });

  it('pins the BNB USDT/WBNB 0.01% profile and every dependency identity', () => {
    expect(reviewedPancakeSwapV3Profile('bnb-pancakeswap-v3-usdt-wbnb-100')).toEqual({
      id: 'bnb-pancakeswap-v3-usdt-wbnb-100',
      chainId: 56,
      venue: 'pancakeswap-v3',
      market: 'USDT/WBNB',
      factory: '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865',
      quoterV2: '0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997',
      pool: '0x172fcD41E0913e95784454622d1c3724f546f849',
      codeIdentity: {
        // Reuses the pinned BNB deployment identities; only the pool bytecode
        // hash is new to this profile.
        factory: '0x8191d3ab1d55d3da9822199f28865415c99566b6f1aee4a4b16713f57930678c',
        quoterV2: '0x2734833b7d2a656d4797f4a7d959314654749a7424ec473267613ff26424138a',
        pool: '0x6796316e56ef0dd38755758b3239f271b2398ef028c8200bcf7fc8cc00ae1cfd',
      },
      token0: {
        address: '0x55d398326f99059fF775485246999027B3197955',
        symbol: 'USDT',
        decimals: 18,
      },
      token1: {
        address: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
        symbol: 'WBNB',
        decimals: 18,
      },
      feeTier: 100,
      twapWindowSeconds: 1800,
      quoteAmountsToken0: [100, 1000, 10000],
      rpcEndpoints: expect.arrayContaining([
        'https://bsc-dataseed.binance.org',
        'https://bsc.publicnode.com',
      ]),
      maxSourceAgeSeconds: 120,
      cacheTtlMs: 10000,
    });
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
