import {
  BASE_CHAIN_ID,
  BASE_UNISWAP_V3_WETH_USDC,
  baseUniswapV3WethUsdcProfile,
} from '../baseUniswapV3';

describe('Base Uniswap V3 market profile', () => {
  it('pins the reviewed Base WETH/USDC market identity', () => {
    expect(BASE_CHAIN_ID).toBe(8453);
    expect(BASE_UNISWAP_V3_WETH_USDC).toMatchObject({
      feeTier: 3_000,
      token0Symbol: 'WETH',
      token1Symbol: 'USDC',
      twapWindowSeconds: 1_800,
    });
    expect(baseUniswapV3WethUsdcProfile()).toMatchObject({
      id: 'base-uniswap-v3-weth-usdc',
      chainId: 8453,
      venue: 'uniswap-v3',
      market: 'WETH/USDC',
      quoteAmountsToken0: [1, 10, 100],
    });
  });
});
