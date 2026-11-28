import { TelegramScenarioInputSchema } from './scenario-assessment';

describe('Telegram read-only scenario contract', () => {
  it('accepts declared Base Aave what-if values', () => {
    expect(
      TelegramScenarioInputSchema.safeParse({
        scenario: 'base_lending',
        input: {
          protocolId: 'aave-v3-base',
          action: 'borrow',
          collateralSymbol: 'WETH',
          loanSymbol: 'USDC',
          collateralValueUsd: 5_000,
          debtValueUsd: 1_200,
        },
      }).success
    ).toBe(true);
  });

  it('accepts supported Hyperliquid BTC and ETH what-if positions', () => {
    expect(
      TelegramScenarioInputSchema.safeParse({
        scenario: 'hyperliquid_perps',
        input: {
          protocolId: 'hyperliquid-perps-mainnet',
          action: 'open_long',
          assetSymbol: 'BTC',
          marginAssetSymbol: 'USDC',
          sizeUsd: 600,
          marginValueUsd: 300,
        },
      }).success
    ).toBe(true);
  });

  it('accepts only reviewed Base Aerodrome profile inputs without recipients', () => {
    const valid = {
      scenario: 'dex_swap',
      input: {
        profileId: 'base-aerodrome-slipstream-weth-usdc-cl100',
        direction: 'token0-to-token1',
        amountIn: '0.01',
      },
    };
    expect(TelegramScenarioInputSchema.safeParse(valid).success).toBe(true);
    expect(
      TelegramScenarioInputSchema.safeParse({
        ...valid,
        input: { ...valid.input, recipient: '0x1111111111111111111111111111111111111111' },
      }).success
    ).toBe(false);
    expect(
      TelegramScenarioInputSchema.safeParse({
        ...valid,
        input: {
          ...valid.input,
          transaction: { to: '0x1111111111111111111111111111111111111111', data: '0x' },
        },
      }).success
    ).toBe(false);
  });

  it('rejects unsupported networks, assets, protocols, and user-supplied expiry fields', () => {
    expect(
      TelegramScenarioInputSchema.safeParse({
        scenario: 'hyperliquid_perps',
        input: {
          protocolId: 'hyperliquid-perps-mainnet',
          action: 'open_short',
          assetSymbol: 'HYPE',
          marginAssetSymbol: 'USDC',
          sizeUsd: 600,
          marginValueUsd: 300,
          expiresAfter: 123,
        },
      }).success
    ).toBe(false);
    expect(
      TelegramScenarioInputSchema.safeParse({
        scenario: 'hyperliquid_perps',
        input: {
          protocolId: 'hyperliquid-perps-mainnet',
          action: 'open_short',
          assetSymbol: 'HYPE',
          marginAssetSymbol: 'USDC',
          sizeUsd: 600,
          marginValueUsd: 300,
        },
      }).success
    ).toBe(false);
    expect(
      TelegramScenarioInputSchema.safeParse({
        scenario: 'dex_swap',
        input: {
          profileId: 'ethereum-unreviewed-pool',
          direction: 'token0-to-token1',
          amountIn: '1',
        },
      }).success
    ).toBe(false);
  });
});
