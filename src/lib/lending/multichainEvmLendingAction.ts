/** Strict, direct-call decoder for reviewed Polygon, Arbitrum and BNB lenders. */

import { decodeFunctionData, encodeAbiParameters, encodeFunctionData, keccak256 } from 'viem';
import { z } from 'zod';

import {
  ARBITRUM_CHAIN_ID,
  BASE_CHAIN_ID,
  BNB_CHAIN_ID,
  POLYGON_CHAIN_ID,
  aaveV3EvmMarket,
  aaveV3EvmUnderlyingForSymbol,
  COMPOUND_V3_ARBITRUM_COMET,
  COMPOUND_V3_ARBITRUM_USDC,
  compoundV3ArbitrumAssetForSymbol,
  DOLOMITE_ARBITRUM_MARGIN,
  eulerV2EvmMarket,
  fluidVaultT1EvmMarket,
  isAaveV3EvmProtocolId,
  isCompoundV3EvmProtocolId,
  isDolomiteProtocolId,
  isEulerV2EvmProtocolId,
  isFluidVaultT1ProtocolId,
  isListaMoolahProtocolId,
  isMorphoBlueEvmProtocolId,
  isVenusNativeMarket,
  lendingProtocolChainId,
  LISTA_MOOLAH_BNB,
  morphoBlueEvmMarket,
  venusCoreMarketForSymbol,
  type MultichainEvmLendingChainId,
} from './multichainEvmLendingProtocols';

const AddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);
const HexSchema = z.string().regex(/^0x(?:[a-fA-F0-9]{2})*$/);
const UintSchema = z.union([
  z.string().regex(/^0$|^[1-9][0-9]*$/),
  z.number().int().nonnegative().safe(),
]);

export const MultichainEvmLendingChainIdSchema = z.union([
  z.literal(POLYGON_CHAIN_ID),
  z.literal(ARBITRUM_CHAIN_ID),
  z.literal(BNB_CHAIN_ID),
  z.literal(BASE_CHAIN_ID),
]);
export const MultichainEvmLendingProtocolIdSchema = z.enum([
  'aave-v3-polygon',
  'aave-v3-arbitrum',
  'aave-v3-bnb',
  'venus-core-bnb',
  'compound-v3-arbitrum',
  'morpho-blue-arbitrum',
  'morpho-blue-polygon',
  'lista-moolah-bnb',
  'euler-v2-base',
  'euler-v2-arbitrum',
  'dolomite-arbitrum',
  'fluid-vault-t1-base',
  'fluid-vault-t1-arbitrum',
]);
export const MultichainEvmLendingActionSchema = z.enum(['supply', 'borrow']);
export type MultichainEvmLendingProtocolId = z.infer<typeof MultichainEvmLendingProtocolIdSchema>;
export type MultichainEvmLendingAction = z.infer<typeof MultichainEvmLendingActionSchema>;

export const MultichainEvmLendingExactTransactionSchema = z
  .object({
    chainId: MultichainEvmLendingChainIdSchema,
    from: AddressSchema,
    to: AddressSchema,
    data: HexSchema,
    nonce: UintSchema,
    value: UintSchema.optional().default(0),
  })
  .strict();
export type MultichainEvmLendingExactTransaction = z.infer<
  typeof MultichainEvmLendingExactTransactionSchema
>;

const AAVE_POOL_ABI = [
  {
    type: 'function',
    name: 'supply',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'onBehalfOf', type: 'address' },
      { name: 'referralCode', type: 'uint16' },
    ],
    outputs: [],
  },
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

const VENUS_BEP20_ABI = [
  {
    type: 'function',
    name: 'mint',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'mintAmount', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'borrow',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'borrowAmount', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;
const VENUS_BNB_ABI = [
  {
    type: 'function',
    name: 'mint',
    stateMutability: 'payable',
    inputs: [],
    outputs: [],
  },
  VENUS_BEP20_ABI[1],
] as const;

const COMPOUND_V3_COMET_ABI = [
  {
    type: 'function',
    name: 'supply',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'asset', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
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

/** The direct (non-EVC-batched) EVault calls published by Euler. */
const EULER_V2_EVAULT_ABI = [
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
const EULER_V2_EVC_ABI = [
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

/**
 * Fluid T1 is deliberately constrained to collateral-only `operate`: no
 * withdrawal, no borrowing, no native value, and no receiver substitution.
 * T2/T3/T4 have materially different calldata and are outside this profile.
 */
const FLUID_VAULT_T1_ABI = [
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

/**
 * Dolomite's core `operate` profile is intentionally restricted to one
 * sender-owned account and one Deposit or Withdraw action. This excludes
 * trades, external calls, account transfers, and delegated operators.
 */
const DOLOMITE_MARGIN_ABI = [
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

const MORPHO_STYLE_ABI = [
  {
    type: 'function',
    name: 'supply',
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
      { name: 'data', type: 'bytes' },
    ],
    outputs: [],
  },
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

type MorphoMarketParams = {
  loanToken: `0x${string}`;
  collateralToken: `0x${string}`;
  oracle: `0x${string}`;
  irm: `0x${string}`;
  lltv: bigint;
};

export interface MultichainEvmLendingDecodedAction {
  protocolId: MultichainEvmLendingProtocolId;
  action: MultichainEvmLendingAction;
  target: `0x${string}`;
  calldataHash: `0x${string}`;
  amount: string;
  account: `0x${string}`;
  receiver: `0x${string}` | null;
  asset: `0x${string}` | null;
  marketId: `0x${string}` | null;
}

type ExpectedScope = {
  protocolId: MultichainEvmLendingProtocolId;
  action: MultichainEvmLendingAction;
  collateralSymbol?: string;
  loanSymbol?: string;
  marketId?: string;
  /** Required for permissionless Euler EVaults; verified live by the guard. */
  marketAddress?: string;
  /** Required for an Euler EVC collateral-deposit-and-borrow batch. */
  collateralVaultAddress?: string;
  /** Required for Dolomite's sender-owned exact operate profile. */
  collateralMarketId?: string;
  loanMarketId?: string;
  accountNumber?: string;
};

function address(value: string): `0x${string}` {
  return value.toLowerCase() as `0x${string}`;
}
function requireCanonicalCalldata(
  data: `0x${string}`,
  abi: readonly unknown[],
  functionName: string,
  args: readonly unknown[] = []
): void {
  const canonical = encodeFunctionData({ abi, functionName, args });
  if (canonical.toLowerCase() !== data.toLowerCase()) {
    throw new Error('Exact call calldata is not canonical ABI encoding');
  }
}
function expectedAaveChain(
  protocolId: MultichainEvmLendingProtocolId
): MultichainEvmLendingChainId {
  if (!isAaveV3EvmProtocolId(protocolId)) throw new Error('Expected an Aave V3 protocol');
  return aaveV3EvmMarket(protocolId).chainId;
}

function morphoMarketId(params: MorphoMarketParams): `0x${string}` {
  return keccak256(
    encodeAbiParameters(
      [
        { type: 'address' },
        { type: 'address' },
        { type: 'address' },
        { type: 'address' },
        { type: 'uint256' },
      ],
      [params.loanToken, params.collateralToken, params.oracle, params.irm, params.lltv]
    )
  );
}

function requireMorphoMarket(
  params: MorphoMarketParams,
  expectedMarketId: string | undefined
): `0x${string}` {
  if (!expectedMarketId) throw new Error('Exact isolated-market call requires a declared marketId');
  const marketId = morphoMarketId(params);
  if (marketId.toLowerCase() !== expectedMarketId.toLowerCase()) {
    throw new Error('Exact call market parameters do not match the declared marketId');
  }
  return marketId;
}

function decodeCompoundV3ArbitrumCall(
  transaction: MultichainEvmLendingExactTransaction,
  expected: ExpectedScope,
  target: `0x${string}`,
  data: `0x${string}`,
  calldataHash: `0x${string}`
): MultichainEvmLendingDecodedAction {
  if (transaction.chainId !== ARBITRUM_CHAIN_ID || target !== COMPOUND_V3_ARBITRUM_COMET) {
    throw new Error('Exact call target is not the reviewed Compound V3 Arbitrum Comet');
  }
  if (BigInt(transaction.value) !== 0n) {
    throw new Error('Compound V3 guard accepts only a zero-value direct Comet call');
  }
  const decoded = decodeFunctionData({ abi: COMPOUND_V3_COMET_ABI, data });
  const expectedFunction = expected.action === 'supply' ? 'supply' : 'withdraw';
  if (decoded.functionName !== expectedFunction) {
    throw new Error('Exact call selector does not match the declared Compound V3 action');
  }
  requireCanonicalCalldata(data, COMPOUND_V3_COMET_ABI, decoded.functionName, decoded.args);
  const [asset, amount] = decoded.args as unknown as [`0x${string}`, bigint];
  const declaredSymbol =
    expected.action === 'supply' ? expected.collateralSymbol : expected.loanSymbol;
  const expectedAsset = declaredSymbol ? compoundV3ArbitrumAssetForSymbol(declaredSymbol) : null;
  if (amount <= 0n || !expectedAsset || address(asset) !== expectedAsset) {
    throw new Error('Compound V3 asset or amount does not match the reviewed guard scope');
  }
  if (expected.action === 'borrow' && address(asset) !== COMPOUND_V3_ARBITRUM_USDC) {
    throw new Error('Compound V3 Arbitrum direct borrow may withdraw only native USDC');
  }
  return {
    protocolId: expected.protocolId,
    action: expected.action,
    target,
    calldataHash,
    amount: amount.toString(),
    account: address(transaction.from),
    receiver: expected.action === 'borrow' ? address(transaction.from) : null,
    asset: address(asset),
    marketId: null,
  };
}

function decodeMorphoStyleCall(
  transaction: MultichainEvmLendingExactTransaction,
  expected: ExpectedScope,
  target: `0x${string}`,
  data: `0x${string}`,
  calldataHash: `0x${string}`
): MultichainEvmLendingDecodedAction {
  const lista = isListaMoolahProtocolId(expected.protocolId);
  if (!lista && !isMorphoBlueEvmProtocolId(expected.protocolId)) {
    throw new Error('Expected an isolated-market lending protocol');
  }
  const expectedTarget = lista
    ? LISTA_MOOLAH_BNB
    : morphoBlueEvmMarket(expected.protocolId as 'morpho-blue-polygon' | 'morpho-blue-arbitrum')
        .morpho;
  if (
    transaction.chainId !== lendingProtocolChainId(expected.protocolId) ||
    target !== expectedTarget ||
    BigInt(transaction.value) !== 0n
  ) {
    throw new Error('Exact call is outside the reviewed isolated-market deployment');
  }
  const decoded = decodeFunctionData({ abi: MORPHO_STYLE_ABI, data });
  const expectedFunction =
    lista && expected.action === 'supply' ? 'supplyCollateral' : expected.action;
  if (decoded.functionName !== expectedFunction) {
    throw new Error('Exact call selector does not match the declared isolated-market action');
  }
  requireCanonicalCalldata(data, MORPHO_STYLE_ABI, decoded.functionName, decoded.args);
  if (decoded.functionName === 'supplyCollateral') {
    const [marketParams, assets, onBehalf, callbackData] = decoded.args as unknown as [
      MorphoMarketParams,
      bigint,
      `0x${string}`,
      `0x${string}`,
    ];
    const marketId = requireMorphoMarket(marketParams, expected.marketId);
    if (assets <= 0n || callbackData !== '0x' || address(onBehalf) !== address(transaction.from)) {
      throw new Error(
        'Lista collateral supply must be positive, callback-free, and only for the sender'
      );
    }
    return {
      protocolId: expected.protocolId,
      action: expected.action,
      target,
      calldataHash,
      amount: assets.toString(),
      account: address(onBehalf),
      receiver: null,
      asset: address(marketParams.collateralToken),
      marketId,
    };
  }
  const [marketParams, assets, shares, onBehalf, fifth] = decoded.args as unknown as [
    MorphoMarketParams,
    bigint,
    bigint,
    `0x${string}`,
    `0x${string}`,
  ];
  const marketId = requireMorphoMarket(marketParams, expected.marketId);
  if ((assets === 0n && shares === 0n) || (assets !== 0n && shares !== 0n)) {
    throw new Error('Exact isolated-market call must set exactly one of assets or shares');
  }
  if (address(onBehalf) !== address(transaction.from)) {
    throw new Error('Exact isolated-market call must operate only for the transaction sender');
  }
  if (decoded.functionName === 'supply' && fifth !== '0x') {
    throw new Error(
      'Exact isolated-market supply callback data is outside the direct-call profile'
    );
  }
  if (decoded.functionName === 'borrow' && address(fifth) !== address(transaction.from)) {
    throw new Error('Exact isolated-market borrow receiver must be the transaction sender');
  }
  return {
    protocolId: expected.protocolId,
    action: expected.action,
    target,
    calldataHash,
    amount: (assets === 0n ? shares : assets).toString(),
    account: address(onBehalf),
    receiver: decoded.functionName === 'borrow' ? address(fifth) : null,
    asset: address(marketParams.loanToken),
    marketId,
  };
}

function requireDolomiteMarketId(value: string | undefined, label: string): bigint {
  if (!value || !/^(?:0|[1-9][0-9]*)$/.test(value)) {
    throw new Error(`Dolomite exact call requires a declared ${label}`);
  }
  return BigInt(value);
}

function decodeDolomiteCall(
  transaction: MultichainEvmLendingExactTransaction,
  expected: ExpectedScope,
  target: `0x${string}`,
  data: `0x${string}`,
  calldataHash: `0x${string}`
): MultichainEvmLendingDecodedAction {
  if (
    transaction.chainId !== ARBITRUM_CHAIN_ID ||
    target !== DOLOMITE_ARBITRUM_MARGIN ||
    BigInt(transaction.value) !== 0n
  ) {
    throw new Error('Dolomite exact call is outside the reviewed Arbitrum margin deployment');
  }
  const decoded = decodeFunctionData({ abi: DOLOMITE_MARGIN_ABI, data });
  if (decoded.functionName !== 'operate') {
    throw new Error('Dolomite exact call must use the canonical operate selector');
  }
  requireCanonicalCalldata(data, DOLOMITE_MARGIN_ABI, decoded.functionName, decoded.args);
  const [accounts, actions] = decoded.args as unknown as [
    readonly { owner: `0x${string}`; number: bigint }[],
    readonly {
      actionType: bigint | number;
      accountId: bigint;
      amount: { sign: boolean; denomination: bigint | number; ref: bigint | number; value: bigint };
      primaryMarketId: bigint;
      secondaryMarketId: bigint;
      otherAddress: `0x${string}`;
      otherAccountId: bigint;
      data: `0x${string}`;
    }[],
  ];
  const sender = address(transaction.from);
  const accountNumber =
    expected.accountNumber === undefined ? null : BigInt(expected.accountNumber);
  if (
    accounts.length !== 1 ||
    actions.length !== 1 ||
    accountNumber === null ||
    address(accounts[0].owner) !== sender ||
    accounts[0].number !== accountNumber
  ) {
    throw new Error(
      'Dolomite exact call must operate on exactly one sender-owned declared account'
    );
  }
  const action = actions[0];
  const marketId =
    expected.action === 'supply'
      ? requireDolomiteMarketId(expected.collateralMarketId, 'collateralMarketId')
      : requireDolomiteMarketId(expected.loanMarketId, 'loanMarketId');
  const actionType = expected.action === 'supply' ? 0n : 1n;
  if (
    BigInt(action.actionType) !== actionType ||
    action.accountId !== 0n ||
    !action.amount.sign ||
    BigInt(action.amount.denomination) !== 0n ||
    BigInt(action.amount.ref) !== 0n ||
    action.amount.value <= 0n ||
    action.primaryMarketId !== marketId ||
    action.secondaryMarketId !== 0n ||
    address(action.otherAddress) !== sender ||
    action.otherAccountId !== 0n ||
    action.data !== '0x'
  ) {
    throw new Error(
      'Dolomite operate arguments are outside the reviewed single-market direct profile'
    );
  }
  return {
    protocolId: expected.protocolId,
    action: expected.action,
    target,
    calldataHash,
    amount: action.amount.value.toString(),
    account: sender,
    receiver: expected.action === 'borrow' ? sender : null,
    asset: null,
    marketId: null,
  };
}

function decodeFluidVaultT1Call(
  transaction: MultichainEvmLendingExactTransaction,
  expected: ExpectedScope,
  target: `0x${string}`,
  data: `0x${string}`,
  calldataHash: `0x${string}`
): MultichainEvmLendingDecodedAction {
  if (!isFluidVaultT1ProtocolId(expected.protocolId) || !expected.marketAddress) {
    throw new Error('Fluid exact call requires a declared T1 vault address');
  }
  const market = fluidVaultT1EvmMarket(expected.protocolId);
  if (
    expected.action !== 'supply' ||
    transaction.chainId !== market.chainId ||
    target !== address(expected.marketAddress) ||
    BigInt(transaction.value) !== 0n
  ) {
    throw new Error('Fluid exact call is outside the reviewed T1 collateral-only profile');
  }
  const decoded = decodeFunctionData({ abi: FLUID_VAULT_T1_ABI, data });
  if (decoded.functionName !== 'operate') {
    throw new Error('Fluid T1 supply must use the canonical operate selector');
  }
  requireCanonicalCalldata(data, FLUID_VAULT_T1_ABI, decoded.functionName, decoded.args);
  const [_nftId, newCol, newDebt, recipient] = decoded.args as readonly [
    bigint,
    bigint,
    bigint,
    `0x${string}`,
  ];
  const sender = address(transaction.from);
  const zero = '0x0000000000000000000000000000000000000000';
  if (
    newCol <= 0n ||
    newDebt !== 0n ||
    (address(recipient) !== sender && address(recipient) !== zero)
  ) {
    throw new Error(
      'Fluid T1 supply must add positive collateral without debt or receiver substitution'
    );
  }
  return {
    protocolId: expected.protocolId,
    action: 'supply',
    target,
    calldataHash,
    amount: newCol.toString(),
    account: sender,
    receiver: null,
    asset: null,
    marketId: null,
  };
}

/**
 * Decode only one canonical direct call.  Delegation, batching, non-zero
 * foreign value, and receiver substitution are all intentionally excluded.
 */
// eslint-disable-next-line complexity -- one exhaustive dispatcher preserves the fail-closed protocol boundary.
export function decodeMultichainEvmLendingExactCall(
  rawTransaction: MultichainEvmLendingExactTransaction,
  expected: ExpectedScope
): MultichainEvmLendingDecodedAction {
  const transaction = MultichainEvmLendingExactTransactionSchema.parse(rawTransaction);
  const data = transaction.data as `0x${string}`;
  const target = address(transaction.to);
  const value = BigInt(transaction.value);
  const calldataHash = keccak256(data);

  if (isAaveV3EvmProtocolId(expected.protocolId)) {
    const market = aaveV3EvmMarket(expected.protocolId);
    if (transaction.chainId !== expectedAaveChain(expected.protocolId)) {
      throw new Error('Exact call chain does not match the reviewed Aave V3 deployment');
    }
    if (target !== address(market.pool) || value !== 0n) {
      throw new Error('Aave guard accepts only a zero-value direct Pool call');
    }
    const decoded = decodeFunctionData({ abi: AAVE_POOL_ABI, data });
    if (decoded.functionName !== expected.action) {
      throw new Error('Exact call selector does not match the declared lending action');
    }
    requireCanonicalCalldata(data, AAVE_POOL_ABI, decoded.functionName, decoded.args);
    if (decoded.functionName === 'supply') {
      const [asset, amount, onBehalfOf] = decoded.args;
      const expectedAsset = expected.collateralSymbol
        ? aaveV3EvmUnderlyingForSymbol(expected.protocolId, expected.collateralSymbol)
        : null;
      if (amount <= 0n || !expectedAsset || address(asset) !== expectedAsset) {
        throw new Error('Aave supply asset or amount does not match the reviewed guard scope');
      }
      if (address(onBehalfOf) !== address(transaction.from)) {
        throw new Error('Aave supply must be made only for the transaction sender');
      }
      return {
        protocolId: expected.protocolId,
        action: expected.action,
        target,
        calldataHash,
        amount: amount.toString(),
        account: address(onBehalfOf),
        receiver: null,
        asset: address(asset),
        marketId: null,
      };
    }
    const [asset, amount, interestRateMode, _referralCode, onBehalfOf] = decoded.args;
    const expectedAsset = expected.loanSymbol
      ? aaveV3EvmUnderlyingForSymbol(expected.protocolId, expected.loanSymbol)
      : null;
    if (
      amount <= 0n ||
      !expectedAsset ||
      address(asset) !== expectedAsset ||
      interestRateMode !== 2n
    ) {
      throw new Error(
        'Aave borrow must use the reviewed asset, a positive amount, and variable mode'
      );
    }
    if (address(onBehalfOf) !== address(transaction.from)) {
      throw new Error('Aave borrow must be made only for the transaction sender');
    }
    return {
      protocolId: expected.protocolId,
      action: expected.action,
      target,
      calldataHash,
      amount: amount.toString(),
      account: address(onBehalfOf),
      receiver: address(onBehalfOf),
      asset: address(asset),
      marketId: null,
    };
  }

  if (isCompoundV3EvmProtocolId(expected.protocolId)) {
    return decodeCompoundV3ArbitrumCall(transaction, expected, target, data, calldataHash);
  }

  if (isDolomiteProtocolId(expected.protocolId)) {
    return decodeDolomiteCall(transaction, expected, target, data, calldataHash);
  }

  if (isFluidVaultT1ProtocolId(expected.protocolId)) {
    return decodeFluidVaultT1Call(transaction, expected, target, data, calldataHash);
  }

  if (isEulerV2EvmProtocolId(expected.protocolId)) {
    const market = eulerV2EvmMarket(expected.protocolId);
    if (
      transaction.chainId !== market.chainId ||
      BigInt(transaction.value) !== 0n ||
      !expected.marketAddress
    ) {
      throw new Error(
        'Euler exact call is outside the reviewed chain or has non-zero native value'
      );
    }
    if (expected.action === 'supply') {
      if (target !== address(expected.marketAddress)) {
        throw new Error('Euler exact call target does not match the reviewed EVault address');
      }
      const decoded = decodeFunctionData({ abi: EULER_V2_EVAULT_ABI, data });
      if (decoded.functionName !== 'deposit') {
        throw new Error('Euler supply exact call must be the canonical EVault deposit selector');
      }
      requireCanonicalCalldata(data, EULER_V2_EVAULT_ABI, decoded.functionName, decoded.args);
      const [amount, receiver] = decoded.args;
      if (address(receiver) !== address(transaction.from) || amount <= 0n) {
        throw new Error('Euler direct supply must be positive and mint shares only to the sender');
      }
      return {
        protocolId: expected.protocolId,
        action: expected.action,
        target,
        calldataHash,
        amount: amount.toString(),
        account: address(transaction.from),
        receiver: address(receiver),
        asset: null,
        marketId: null,
      };
    }
    if (!expected.collateralVaultAddress || target !== address(market.evc)) {
      throw new Error(
        'Euler borrow must target the reviewed chain EVC with an explicit collateral EVault'
      );
    }
    const decoded = decodeFunctionData({ abi: EULER_V2_EVC_ABI, data });
    if (decoded.functionName !== 'batch') {
      throw new Error('Euler borrow must use the canonical EVC batch selector');
    }
    requireCanonicalCalldata(data, EULER_V2_EVC_ABI, decoded.functionName, decoded.args);
    const [items] = decoded.args as unknown as [
      readonly {
        targetContract: `0x${string}`;
        onBehalfOfAccount: `0x${string}`;
        value: bigint;
        data: `0x${string}`;
      }[],
    ];
    if (items.length !== 4) {
      throw new Error('Euler borrow must contain exactly the reviewed four-step EVC batch');
    }
    const sender = address(transaction.from);
    const zero = '0x0000000000000000000000000000000000000000';
    const collateralVault = address(expected.collateralVaultAddress);
    const borrowVault = address(expected.marketAddress);
    const [enableCollateral, depositCollateral, enableController, borrow] = items;
    const expectedEnableCollateral = encodeFunctionData({
      abi: EULER_V2_EVC_ABI,
      functionName: 'enableCollateral',
      args: [sender, collateralVault],
    });
    const expectedEnableController = encodeFunctionData({
      abi: EULER_V2_EVC_ABI,
      functionName: 'enableController',
      args: [sender, borrowVault],
    });
    if (
      address(enableCollateral.targetContract) !== address(market.evc) ||
      address(enableCollateral.onBehalfOfAccount) !== zero ||
      enableCollateral.value !== 0n ||
      enableCollateral.data.toLowerCase() !== expectedEnableCollateral.toLowerCase() ||
      address(depositCollateral.targetContract) !== collateralVault ||
      address(depositCollateral.onBehalfOfAccount) !== sender ||
      depositCollateral.value !== 0n ||
      address(enableController.targetContract) !== address(market.evc) ||
      address(enableController.onBehalfOfAccount) !== zero ||
      enableController.value !== 0n ||
      enableController.data.toLowerCase() !== expectedEnableController.toLowerCase() ||
      address(borrow.targetContract) !== borrowVault ||
      address(borrow.onBehalfOfAccount) !== sender ||
      borrow.value !== 0n
    ) {
      throw new Error('Euler EVC batch does not match the reviewed collateral-and-borrow order');
    }
    const deposit = decodeFunctionData({ abi: EULER_V2_EVAULT_ABI, data: depositCollateral.data });
    const borrowCall = decodeFunctionData({ abi: EULER_V2_EVAULT_ABI, data: borrow.data });
    if (deposit.functionName !== 'deposit' || borrowCall.functionName !== 'borrow') {
      throw new Error('Euler EVC batch must deposit collateral before borrowing');
    }
    requireCanonicalCalldata(depositCollateral.data, EULER_V2_EVAULT_ABI, 'deposit', deposit.args);
    requireCanonicalCalldata(borrow.data, EULER_V2_EVAULT_ABI, 'borrow', borrowCall.args);
    const [collateralAmount, collateralReceiver] = deposit.args;
    const [borrowAmount, borrowReceiver] = borrowCall.args;
    if (
      collateralAmount <= 0n ||
      borrowAmount <= 0n ||
      address(collateralReceiver) !== sender ||
      address(borrowReceiver) !== sender
    ) {
      throw new Error(
        'Euler EVC batch must keep both collateral and borrowed assets with the sender'
      );
    }
    return {
      protocolId: expected.protocolId,
      action: 'borrow',
      target,
      calldataHash,
      amount: borrowAmount.toString(),
      account: sender,
      receiver: sender,
      asset: null,
      marketId: null,
    };
  }

  if (
    isMorphoBlueEvmProtocolId(expected.protocolId) ||
    isListaMoolahProtocolId(expected.protocolId)
  ) {
    return decodeMorphoStyleCall(transaction, expected, target, data, calldataHash);
  }

  if (expected.protocolId !== 'venus-core-bnb' || transaction.chainId !== BNB_CHAIN_ID) {
    throw new Error('Exact call protocol and chain are inconsistent');
  }
  const symbol = expected.action === 'supply' ? expected.collateralSymbol : expected.loanSymbol;
  const expectedMarket = symbol ? venusCoreMarketForSymbol(symbol) : null;
  if (!expectedMarket || target !== expectedMarket) {
    throw new Error('Exact call target is outside the reviewed Venus Core Pool market set');
  }
  const nativeMarket = isVenusNativeMarket(target);
  const decoded = decodeFunctionData({ abi: nativeMarket ? VENUS_BNB_ABI : VENUS_BEP20_ABI, data });
  const expectedFunction = expected.action === 'supply' ? 'mint' : 'borrow';
  if (decoded.functionName !== expectedFunction) {
    throw new Error('Exact call selector does not match the declared Venus action');
  }
  requireCanonicalCalldata(
    data,
    nativeMarket ? VENUS_BNB_ABI : VENUS_BEP20_ABI,
    decoded.functionName,
    decoded.args
  );
  const amount =
    nativeMarket && decoded.functionName === 'mint' ? value : (decoded.args[0] as bigint);
  if (amount <= 0n) throw new Error('Venus exact call amount must be greater than zero');
  if (nativeMarket ? decoded.functionName !== 'mint' && value !== 0n : value !== 0n) {
    throw new Error('Only vBNB mint may carry native transaction value');
  }
  return {
    protocolId: expected.protocolId,
    action: expected.action,
    target,
    calldataHash,
    amount: amount.toString(),
    account: address(transaction.from),
    receiver: decoded.functionName === 'borrow' ? address(transaction.from) : null,
    asset: null,
    marketId: null,
  };
}
