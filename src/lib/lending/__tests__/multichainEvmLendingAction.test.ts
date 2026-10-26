import { encodeFunctionData } from 'viem';

import { decodeMultichainEvmLendingExactCall } from '../multichainEvmLendingAction';
import {
  aaveV3EvmMarket,
  aaveV3EvmUnderlyingForSymbol,
  COMPOUND_V3_ARBITRUM_COMET,
  COMPOUND_V3_ARBITRUM_USDC,
  DOLOMITE_ARBITRUM_MARGIN,
  EULER_V2_EVM_MARKETS,
  LISTA_MOOLAH_BNB,
  MORPHO_BLUE_EVM_MARKETS,
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
const COMPOUND_ABI = [
  {
    type: 'function',
    name: 'withdraw',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
] as const;
const EULER_EVAULT_ABI = [
  {
    type: 'function',
    name: 'deposit',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'assets', type: 'uint256' },
      { name: 'receiver', type: 'address' },
    ],
    outputs: [{ name: 'shares', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'borrow',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'receiver', type: 'address' },
    ],
    outputs: [{ name: 'assets', type: 'uint256' }],
  },
] as const;
const EULER_EVC_ABI = [
  {
    type: 'function',
    name: 'batch',
    stateMutability: 'payable',
    inputs: [
      {
        name: 'items',
        type: 'tuple[]',
        components: [
          { name: 'targetContract', type: 'address' },
          { name: 'onBehalfOfAccount', type: 'address' },
          { name: 'value', type: 'uint256' },
          { name: 'data', type: 'bytes' },
        ],
      },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'enableCollateral',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'collateral', type: 'address' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'enableController',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'account', type: 'address' },
      { name: 'controller', type: 'address' },
    ],
    outputs: [],
  },
] as const;
const DOLOMITE_ABI = [
  {
    type: 'function',
    name: 'operate',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'accounts',
        type: 'tuple[]',
        components: [
          { name: 'owner', type: 'address' },
          { name: 'number', type: 'uint256' },
        ],
      },
      {
        name: 'actions',
        type: 'tuple[]',
        components: [
          { name: 'actionType', type: 'uint8' },
          { name: 'accountId', type: 'uint256' },
          {
            name: 'amount',
            type: 'tuple',
            components: [
              { name: 'sign', type: 'bool' },
              { name: 'denomination', type: 'uint8' },
              { name: 'ref', type: 'uint8' },
              { name: 'value', type: 'uint256' },
            ],
          },
          { name: 'primaryMarketId', type: 'uint256' },
          { name: 'secondaryMarketId', type: 'uint256' },
          { name: 'otherAddress', type: 'address' },
          { name: 'otherAccountId', type: 'uint256' },
          { name: 'data', type: 'bytes' },
        ],
      },
    ],
    outputs: [],
  },
] as const;
const FLUID_T1_ABI = [
  {
    type: 'function',
    name: 'operate',
    stateMutability: 'payable',
    inputs: [
      { name: 'nftId_', type: 'uint256' },
      { name: 'newCol_', type: 'int256' },
      { name: 'newDebt_', type: 'int256' },
      { name: 'to_', type: 'address' },
    ],
    outputs: [
      { name: '', type: 'uint256' },
      { name: '', type: 'int256' },
      { name: '', type: 'int256' },
    ],
  },
] as const;
const MORPHO_STYLE_ABI = [
  {
    type: 'function',
    name: 'borrow',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'marketParams',
        type: 'tuple',
        components: [
          { name: 'loanToken', type: 'address' },
          { name: 'collateralToken', type: 'address' },
          { name: 'oracle', type: 'address' },
          { name: 'irm', type: 'address' },
          { name: 'lltv', type: 'uint256' },
        ],
      },
      { name: 'assets', type: 'uint256' },
      { name: 'shares', type: 'uint256' },
      { name: 'onBehalf', type: 'address' },
      { name: 'receiver', type: 'address' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'supplyCollateral',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'marketParams',
        type: 'tuple',
        components: [
          { name: 'loanToken', type: 'address' },
          { name: 'collateralToken', type: 'address' },
          { name: 'oracle', type: 'address' },
          { name: 'irm', type: 'address' },
          { name: 'lltv', type: 'uint256' },
        ],
      },
      { name: 'assets', type: 'uint256' },
      { name: 'onBehalf', type: 'address' },
      { name: 'data', type: 'bytes' },
    ],
    outputs: [],
  },
] as const;
const market = {
  loanToken: '0x2222222222222222222222222222222222222222',
  collateralToken: '0x3333333333333333333333333333333333333333',
  oracle: '0x4444444444444444444444444444444444444444',
  irm: '0x5555555555555555555555555555555555555555',
  lltv: 860_000_000_000_000_000n,
} as const;
const marketId = '0xbc2dd5112ff05e7fb2fca58f560e2cc24b7ebcc643803363afdc5138b81e7ee9' as const;

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

  it('binds Compound V3 Arbitrum borrowing to the native USDC Comet asset', () => {
    const transaction = {
      chainId: 42161 as const,
      from: sender,
      to: COMPOUND_V3_ARBITRUM_COMET,
      nonce: '10',
      value: '0',
      data: encodeFunctionData({
        abi: COMPOUND_ABI,
        functionName: 'withdraw',
        args: [COMPOUND_V3_ARBITRUM_USDC, 1_000_000n],
      }),
    };
    expect(
      decodeMultichainEvmLendingExactCall(transaction, {
        protocolId: 'compound-v3-arbitrum',
        action: 'borrow',
        collateralSymbol: 'WETH',
        loanSymbol: 'USDC',
      })
    ).toMatchObject({ asset: COMPOUND_V3_ARBITRUM_USDC, receiver: sender });
  });

  it('binds a Morpho Blue Arbitrum borrow to its immutable market tuple', () => {
    const transaction = {
      chainId: 42161 as const,
      from: sender,
      to: MORPHO_BLUE_EVM_MARKETS['morpho-blue-arbitrum'].morpho,
      nonce: '11',
      value: '0',
      data: encodeFunctionData({
        abi: MORPHO_STYLE_ABI,
        functionName: 'borrow',
        args: [market, 1n, 0n, sender, sender],
      }),
    };
    expect(
      decodeMultichainEvmLendingExactCall(transaction, {
        protocolId: 'morpho-blue-arbitrum',
        action: 'borrow',
        collateralSymbol: 'WETH',
        loanSymbol: 'USDC',
        marketId,
      })
    ).toMatchObject({ marketId, account: sender, receiver: sender });
  });

  it('binds Lista Moolah supply to callback-free collateral supplied by the sender', () => {
    const transaction = {
      chainId: 56 as const,
      from: sender,
      to: LISTA_MOOLAH_BNB,
      nonce: '12',
      value: '0',
      data: encodeFunctionData({
        abi: MORPHO_STYLE_ABI,
        functionName: 'supplyCollateral',
        args: [market, 2n, sender, '0x'],
      }),
    };
    expect(
      decodeMultichainEvmLendingExactCall(transaction, {
        protocolId: 'lista-moolah-bnb',
        action: 'supply',
        collateralSymbol: 'WBNB',
        loanSymbol: 'USDC',
        marketId,
      })
    ).toMatchObject({ marketId, account: sender, asset: market.collateralToken });
  });

  it('binds an Euler v2 Base direct deposit to the reviewed EVault and sender', () => {
    const vault = '0x6666666666666666666666666666666666666666' as const;
    const transaction = {
      chainId: 8453 as const,
      from: sender,
      to: vault,
      nonce: '13',
      value: '0',
      data: encodeFunctionData({
        abi: EULER_EVAULT_ABI,
        functionName: 'deposit',
        args: [1_000_000n, sender],
      }),
    };
    expect(
      decodeMultichainEvmLendingExactCall(transaction, {
        protocolId: 'euler-v2-base',
        action: 'supply',
        collateralSymbol: 'USDC',
        loanSymbol: 'USDC',
        marketAddress: vault,
      })
    ).toMatchObject({ target: vault, account: sender, receiver: sender, amount: '1000000' });
    expect(() =>
      decodeMultichainEvmLendingExactCall(transaction, {
        protocolId: 'euler-v2-base',
        action: 'supply',
        collateralSymbol: 'USDC',
        loanSymbol: 'USDC',
        marketAddress: '0x7777777777777777777777777777777777777777',
      })
    ).toThrow(/EVault address/);
  });

  it('binds an Euler v2 EVC collateral-deposit-and-borrow batch in exact order', () => {
    const collateralVault = '0x6666666666666666666666666666666666666666' as const;
    const borrowVault = '0x7777777777777777777777777777777777777777' as const;
    const evc = EULER_V2_EVM_MARKETS['euler-v2-base'].evc;
    const zero = '0x0000000000000000000000000000000000000000' as const;
    const transaction = {
      chainId: 8453 as const,
      from: sender,
      to: evc,
      nonce: '14',
      value: '0',
      data: encodeFunctionData({
        abi: EULER_EVC_ABI,
        functionName: 'batch',
        args: [
          [
            {
              targetContract: evc,
              onBehalfOfAccount: zero,
              value: 0n,
              data: encodeFunctionData({
                abi: EULER_EVC_ABI,
                functionName: 'enableCollateral',
                args: [sender, collateralVault],
              }),
            },
            {
              targetContract: collateralVault,
              onBehalfOfAccount: sender,
              value: 0n,
              data: encodeFunctionData({
                abi: EULER_EVAULT_ABI,
                functionName: 'deposit',
                args: [2_000_000n, sender],
              }),
            },
            {
              targetContract: evc,
              onBehalfOfAccount: zero,
              value: 0n,
              data: encodeFunctionData({
                abi: EULER_EVC_ABI,
                functionName: 'enableController',
                args: [sender, borrowVault],
              }),
            },
            {
              targetContract: borrowVault,
              onBehalfOfAccount: sender,
              value: 0n,
              data: encodeFunctionData({
                abi: EULER_EVAULT_ABI,
                functionName: 'borrow',
                args: [1_000_000n, sender],
              }),
            },
          ],
        ],
      }),
    };
    expect(
      decodeMultichainEvmLendingExactCall(transaction, {
        protocolId: 'euler-v2-base',
        action: 'borrow',
        collateralSymbol: 'WETH',
        loanSymbol: 'USDC',
        marketAddress: borrowVault,
        collateralVaultAddress: collateralVault,
      })
    ).toMatchObject({ target: evc, account: sender, receiver: sender, amount: '1000000' });
  });

  it('binds a Dolomite Arbitrum borrow to one declared sender-owned margin account', () => {
    const transaction = {
      chainId: 42161 as const,
      from: sender,
      to: DOLOMITE_ARBITRUM_MARGIN,
      nonce: '15',
      value: '0',
      data: encodeFunctionData({
        abi: DOLOMITE_ABI,
        functionName: 'operate',
        args: [
          [{ owner: sender, number: 7n }],
          [
            {
              actionType: 1,
              accountId: 0n,
              amount: { sign: true, denomination: 0, ref: 0, value: 1_000_000n },
              primaryMarketId: 2n,
              secondaryMarketId: 0n,
              otherAddress: sender,
              otherAccountId: 0n,
              data: '0x',
            },
          ],
        ],
      }),
    };
    expect(
      decodeMultichainEvmLendingExactCall(transaction, {
        protocolId: 'dolomite-arbitrum',
        action: 'borrow',
        collateralSymbol: 'WETH',
        loanSymbol: 'USDC',
        collateralMarketId: '0',
        loanMarketId: '2',
        accountNumber: '7',
      })
    ).toMatchObject({
      target: DOLOMITE_ARBITRUM_MARGIN,
      account: sender,
      receiver: sender,
      amount: '1000000',
    });
    expect(() =>
      decodeMultichainEvmLendingExactCall(transaction, {
        protocolId: 'dolomite-arbitrum',
        action: 'borrow',
        collateralSymbol: 'WETH',
        loanSymbol: 'USDC',
        collateralMarketId: '0',
        loanMarketId: '2',
        accountNumber: '8',
      })
    ).toThrow(/sender-owned declared account/);
  });

  it('binds a Fluid Base T1 vault to a collateral-only direct operate call', () => {
    const vault = '0x8888888888888888888888888888888888888888' as const;
    const transaction = {
      chainId: 8453 as const,
      from: sender,
      to: vault,
      nonce: '16',
      value: '0',
      data: encodeFunctionData({
        abi: FLUID_T1_ABI,
        functionName: 'operate',
        args: [0n, 1_000_000n, 0n, sender],
      }),
    };
    expect(
      decodeMultichainEvmLendingExactCall(transaction, {
        protocolId: 'fluid-vault-t1-base',
        action: 'supply',
        collateralSymbol: 'USDC',
        loanSymbol: 'WETH',
        marketAddress: vault,
      })
    ).toMatchObject({ target: vault, account: sender, amount: '1000000' });
    const withDebt = {
      ...transaction,
      data: encodeFunctionData({
        abi: FLUID_T1_ABI,
        functionName: 'operate',
        args: [0n, 1_000_000n, 1n, sender],
      }),
    };
    expect(() =>
      decodeMultichainEvmLendingExactCall(withDebt, {
        protocolId: 'fluid-vault-t1-base',
        action: 'supply',
        collateralSymbol: 'USDC',
        loanSymbol: 'WETH',
        marketAddress: vault,
      })
    ).toThrow(/without debt/);
  });
});
