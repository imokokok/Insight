import {
  MONAD_CHAIN_ID,
  MONAD_UNISWAP_V3_WMON_USDC,
  monadUniswapV3WmonUsdcProfile,
  uniswapArithmeticMeanTick,
  wmonUsdcPriceFromTick,
} from '../monadUniswapV3';

describe('Monad Uniswap V3 market math', () => {
  it('pins the reviewed market to Monad and its 15-minute observation window', () => {
    expect(MONAD_CHAIN_ID).toBe(143);
    expect(MONAD_UNISWAP_V3_WMON_USDC.feeTier).toBe(3_000);
    expect(MONAD_UNISWAP_V3_WMON_USDC.twapWindowSeconds).toBe(900);
    expect(MONAD_UNISWAP_V3_WMON_USDC.token0Symbol).toBe('WMON');
    expect(MONAD_UNISWAP_V3_WMON_USDC.token1Symbol).toBe('USDC');
    expect(monadUniswapV3WmonUsdcProfile()).toMatchObject({
      id: 'monad-uniswap-v3-wmon-usdc',
      chainId: 143,
      venue: 'uniswap-v3',
      market: 'MON/USDC',
    });
  });

  it('uses floor division for negative Uniswap TWAP ticks', () => {
    // JavaScript bigint division alone produces -314_830 here, which is wrong
    // for Uniswap's arithmetic mean because it truncates toward zero.
    expect(uniswapArithmeticMeanTick(0n, -283_347_001n, 900)).toBe(-314_831);
    expect(uniswapArithmeticMeanTick(0n, 283_347_001n, 900)).toBe(314_830);
  });

  it('orients the tick as USDC per WMON using both token decimal scales', () => {
    expect(wmonUsdcPriceFromTick(-314_841)).toBeCloseTo(0.0212477391, 10);
  });

  it('rejects a tick outside Uniswap V3 bounds', () => {
    expect(() => wmonUsdcPriceFromTick(887_273)).toThrow('invalid tick');
  });
});
