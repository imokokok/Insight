import { baseDexVenueDefinition } from '../baseDexVenues';
import { QUICKSWAP_V2_BASE_USDC_USDT, quickSwapV2AmountOut } from '../quickSwapV2';

describe('QuickSwap V2 Base reviewed-pair boundary', () => {
  it('uses the reviewed USDC/USDT pair and V2 fee arithmetic without treating it as enabled execution', () => {
    expect(QUICKSWAP_V2_BASE_USDC_USDT.pair).toBe('0x7fb81993af9c46a5b487be991f44feed77e82074');
    expect(QUICKSWAP_V2_BASE_USDC_USDT.feeBps).toBe(30);
    expect(quickSwapV2AmountOut(1_000_000n, 1_000_000_000n, 1_000_000_000n)).toBe(996_006n);
    expect(baseDexVenueDefinition('quickswap-v2').capabilities.exactInputPreparation).toBe(
      'review-required'
    );
  });
});
