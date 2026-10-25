import { encodeFunctionData } from 'viem';

import { decodeMultichainEvmLendingExactCall } from '../multichainEvmLendingAction';
import {
  aaveV3EvmMarket,
  aaveV3EvmUnderlyingForSymbol,
  VENUS_CORE_POOL_MARKETS,
} from '../multichainEvmLendingProtocols';

const sender = '0x1111111111111111111111111111111111111111' as const;
const AAVE_ABI = [
  {
    type: 'function',
    name: 'borrow',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'interestRateMode', type: 'uint256' },
      { name: 'referralCode', type: 'uint16' },
      { name: 'onBehalfOf', type: 'address' },
    ],
    outputs: [],
  },
] as const;
const VENUS_ABI = [
  {
    type: 'function',
    name: 'mint',
    stateMutability: 'payable',
    inputs: [],
    outputs: [],
  },
] as const;

describe('decodeMultichainEvmLendingExactCall', () => {
  it('binds an Arbitrum Aave borrow to sender, asset, variable rate and Pool', () => {
    const protocolId = 'aave-v3-arbitrum' as const;
    const asset = aaveV3EvmUnderlyingForSymbol(protocolId, 'USDC')!;
    const transaction = {
      chainId: 42161 as const,
      from: sender,
      to: aaveV3EvmMarket(protocolId).pool,
      nonce: '9',
      value: '0',
      data: encodeFunctionData({
        abi: AAVE_ABI,
        functionName: 'borrow',
        args: [asset, 1_000_000n, 2n, 0, sender],
      }),
    };
    expect(
      decodeMultichainEvmLendingExactCall(transaction, {
        protocolId,
        action: 'borrow',
        collateralSymbol: 'WETH',
        loanSymbol: 'USDC',
      })
    ).toMatchObject({ protocolId, action: 'borrow', account: sender, asset, amount: '1000000' });
  });

  it('rejects an Aave fixed-rate borrow', () => {
    const protocolId = 'aave-v3-polygon' as const;
    const asset = aaveV3EvmUnderlyingForSymbol(protocolId, 'USDC')!;
    const transaction = {
      chainId: 137 as const,
      from: sender,
      to: aaveV3EvmMarket(protocolId).pool,
      nonce: '9',
      value: '0',
      data: encodeFunctionData({
        abi: AAVE_ABI,
        functionName: 'borrow',
        args: [asset, 1n, 1n, 0, sender],
      }),
    };
    expect(() =>
      decodeMultichainEvmLendingExactCall(transaction, {
        protocolId,
        action: 'borrow',
        collateralSymbol: 'WETH',
        loanSymbol: 'USDC',
      })
    ).toThrow(/variable mode/);
  });

  it('admits only a payable direct vBNB mint for native BNB supply', () => {
    const transaction = {
      chainId: 56 as const,
      from: sender,
      to: VENUS_CORE_POOL_MARKETS.BNB,
      nonce: '4',
      value: '1000000000000000000',
      data: encodeFunctionData({ abi: VENUS_ABI, functionName: 'mint' }),
    };
    expect(
      decodeMultichainEvmLendingExactCall(transaction, {
        protocolId: 'venus-core-bnb',
        action: 'supply',
        collateralSymbol: 'BNB',
        loanSymbol: 'USDC',
      })
    ).toMatchObject({ target: VENUS_CORE_POOL_MARKETS.BNB, amount: '1000000000000000000' });
  });
});
