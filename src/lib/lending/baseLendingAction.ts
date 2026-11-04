/**
 * Exact-call parsing for the narrow Base lending surface that the guard can
 * attest in v1. It is intentionally not a generic calldata decoder: an
 * unknown target, selector, non-zero call value, or delegated batch call is
 * rejected instead of being described optimistically.
 */

import { AaveV3Base } from '@aave-dao/aave-address-book';
import { decodeFunctionData, encodeAbiParameters, encodeFunctionData, keccak256 } from 'viem';
import { z } from 'zod';

import {
  COMPOUND_V3_BASE_COMET,
  COMPOUND_V3_BASE_USDC,
  moonwellBaseMarketForSymbol,
  compoundV3BaseAssetForSymbol,
} from './baseLendingProtocols';

export const BASE_CHAIN_ID = 8453;
export const MORPHO_BLUE_BASE = '0xbbbbbbbbbb9cc5e90e3b3af64bdaf62c37eeffcb' as const;

const AddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);
const HexSchema = z.string().regex(/^0x(?:[a-fA-F0-9]{2})*$/);
const UintSchema = z.union([
  z.string().regex(/^0$|^[1-9][0-9]*$/),
  z.number().int().nonnegative().safe(),
]);

export const BaseLendingExactTransactionSchema = z
  .object({
    chainId: z.literal(BASE_CHAIN_ID),
    from: AddressSchema,
    to: AddressSchema,
    data: HexSchema.min(10),
    nonce: UintSchema,
    value: UintSchema.optional().default(0),
  })
  .strict();

export type BaseLendingExactTransaction = z.infer<typeof BaseLendingExactTransactionSchema>;

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

const MORPHO_ABI = [
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
    outputs: [
      { name: 'assetsSupplied', type: 'uint256' },
      { name: 'sharesSupplied', type: 'uint256' },
    ],
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
    outputs: [
      { name: 'assetsBorrowed', type: 'uint256' },
      { name: 'sharesBorrowed', type: 'uint256' },
    ],
  },
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

const MOONWELL_MTOKEN_ABI = [
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

export const BaseLendingProtocolIdSchema = z.enum([
  'aave-v3-base',
  'morpho-blue-base',
  'compound-v3-base',
  'moonwell-base',
]);
export type BaseLendingProtocolId = z.infer<typeof BaseLendingProtocolIdSchema>;
export const BaseLendingGuardActionSchema = z.enum(['supply', 'borrow']);
export type BaseLendingGuardAction = z.infer<typeof BaseLendingGuardActionSchema>;
type ExpectedGuardScope = {
  protocolId: BaseLendingProtocolId;
  action: BaseLendingGuardAction;
  marketId?: string;
  collateralSymbol?: string;
  loanSymbol?: string;
};

export interface BaseLendingDecodedAction {
  protocolId: BaseLendingProtocolId;
  action: BaseLendingGuardAction;
  target: `0x${string}`;
  calldataHash: `0x${string}`;
  amount: string;
  account: `0x${string}`;
  receiver: `0x${string}` | null;
  asset: `0x${string}` | null;
  /** Derived from the immutable Morpho MarketParams tuple, never caller supplied. */
  marketId: `0x${string}` | null;
}

const AAVE_POOL = AaveV3Base.POOL.toLowerCase();

function address(value: string): `0x${string}` {
  return value.toLowerCase() as `0x${string}`;
}

function uint(value: bigint): string {
  return value.toString(10);
}

function exactCallValue(value: BaseLendingExactTransaction['value']): void {
  if (BigInt(value) !== 0n) {
    throw new Error('Base Lending Guard only accepts zero-value direct lending calls');
  }
}

function morphoMarketId(params: {
  loanToken: string;
  collateralToken: string;
  oracle: string;
  irm: string;
  lltv: bigint;
}): `0x${string}` {
  return keccak256(
    encodeAbiParameters(
      [
        { type: 'address' },
        { type: 'address' },
        { type: 'address' },
        { type: 'address' },
        { type: 'uint256' },
      ],
      [
        params.loanToken as `0x${string}`,
        params.collateralToken as `0x${string}`,
        params.oracle as `0x${string}`,
        params.irm as `0x${string}`,
        params.lltv,
      ]
    )
  );
}

function aaveUnderlyingForSymbol(symbol: string): `0x${string}` | null {
  const normalized = canonicalAaveRiskSymbol(symbol);
  for (const [assetSymbol, asset] of Object.entries(AaveV3Base.ASSETS)) {
    if (canonicalAaveRiskSymbol(assetSymbol) === normalized) {
      return address(asset.UNDERLYING);
    }
  }
  return null;
}

function requireCanonicalCalldata(
  data: `0x${string}`,
  abi: readonly unknown[],
  functionName: string,
  args: readonly unknown[]
): void {
  const canonical = encodeFunctionData({
    abi,
    functionName,
    args,
  });
  if (canonical.toLowerCase() !== data.toLowerCase()) {
    throw new Error('Exact call calldata is not canonical ABI encoding');
  }
}

type ExactCallContext = {
  transaction: BaseLendingExactTransaction;
  expected: ExpectedGuardScope;
  target: `0x${string}`;
  data: `0x${string}`;
  calldataHash: `0x${string}`;
};

function decodeAaveExactCall(context: ExactCallContext): BaseLendingDecodedAction {
  const { transaction, expected, target, data, calldataHash } = context;
  if (target !== AAVE_POOL) {
    throw new Error('Exact call target is not the canonical Aave V3 Base Pool');
  }
  const decoded = decodeFunctionData({ abi: AAVE_POOL_ABI, data });
  if (decoded.functionName !== expected.action) {
    throw new Error('Exact call selector does not match the declared Base lending action');
  }
  requireCanonicalCalldata(data, AAVE_POOL_ABI, decoded.functionName, decoded.args);
  if (decoded.functionName === 'supply') {
    const [asset, amount, onBehalfOf] = decoded.args;
    if (address(onBehalfOf) !== address(transaction.from)) {
      throw new Error('Aave exact call must supply only for the transaction sender');
    }
    const expectedAsset = expected.collateralSymbol
      ? aaveUnderlyingForSymbol(expected.collateralSymbol)
      : null;
    if (expected.collateralSymbol && (!expectedAsset || expectedAsset !== address(asset))) {
      throw new Error('Aave exact call asset does not match the declared collateral symbol');
    }
    return {
      protocolId: expected.protocolId,
      action: expected.action,
      target,
      calldataHash,
      amount: uint(amount),
      account: address(onBehalfOf),
      receiver: null,
      asset: address(asset),
      marketId: null,
    };
  }
  const [asset, amount, interestRateMode, _referralCode, onBehalfOf] = decoded.args;
  if (interestRateMode !== 2n) {
    throw new Error('Aave Base borrow must use variable interestRateMode=2');
  }
  if (address(onBehalfOf) !== address(transaction.from)) {
    throw new Error('Aave exact call must borrow only for the transaction sender');
  }
  const expectedAsset = expected.loanSymbol ? aaveUnderlyingForSymbol(expected.loanSymbol) : null;
  if (expected.loanSymbol && (!expectedAsset || expectedAsset !== address(asset))) {
    throw new Error('Aave exact call asset does not match the declared loan symbol');
  }
  return {
    protocolId: expected.protocolId,
    action: expected.action,
    target,
    calldataHash,
    amount: uint(amount),
    account: address(onBehalfOf),
    receiver: address(onBehalfOf),
    asset: address(asset),
    marketId: null,
  };
}

function decodeCompoundExactCall(context: ExactCallContext): BaseLendingDecodedAction {
  const { transaction, expected, target, data, calldataHash } = context;
  if (target !== COMPOUND_V3_BASE_COMET) {
    throw new Error('Exact call target is not the canonical Compound V3 Base Comet');
  }
  const decoded = decodeFunctionData({ abi: COMPOUND_V3_COMET_ABI, data });
  const expectedFunction = expected.action === 'supply' ? 'supply' : 'withdraw';
  if (decoded.functionName !== expectedFunction) {
    throw new Error(
      'Compound V3 exact call selector does not match the declared Base lending action'
    );
  }
  requireCanonicalCalldata(data, COMPOUND_V3_COMET_ABI, decoded.functionName, decoded.args);
  const [asset, amount] = decoded.args;
  if (amount <= 0n) throw new Error('Compound V3 exact call amount must be greater than zero');
  const declaredSymbol =
    expected.action === 'supply' ? expected.collateralSymbol : expected.loanSymbol;
  const expectedAsset = declaredSymbol ? compoundV3BaseAssetForSymbol(declaredSymbol) : null;
  if (!expectedAsset || expectedAsset !== address(asset)) {
    throw new Error('Compound V3 exact call asset does not match the declared lending asset');
  }
  if (expected.action === 'borrow' && address(asset) !== COMPOUND_V3_BASE_USDC) {
    throw new Error('Compound V3 Base direct borrow may withdraw only the Comet base asset');
  }
  return {
    protocolId: expected.protocolId,
    action: expected.action,
    target,
    calldataHash,
    amount: uint(amount),
    account: address(transaction.from),
    receiver: expected.action === 'borrow' ? address(transaction.from) : null,
    asset: address(asset),
    marketId: null,
  };
}

function decodeMoonwellExactCall(context: ExactCallContext): BaseLendingDecodedAction {
  const { transaction, expected, target, data, calldataHash } = context;
  const declaredSymbol =
    expected.action === 'supply' ? expected.collateralSymbol : expected.loanSymbol;
  const expectedMarket = declaredSymbol ? moonwellBaseMarketForSymbol(declaredSymbol) : null;
  if (!expectedMarket || target !== expectedMarket) {
    throw new Error(
      'Exact call target is not the reviewed Moonwell Base market for the declared asset'
    );
  }
  const decoded = decodeFunctionData({ abi: MOONWELL_MTOKEN_ABI, data });
  const expectedFunction = expected.action === 'supply' ? 'mint' : 'borrow';
  if (decoded.functionName !== expectedFunction) {
    throw new Error('Moonwell exact call selector does not match the declared Base lending action');
  }
  requireCanonicalCalldata(data, MOONWELL_MTOKEN_ABI, decoded.functionName, decoded.args);
  const [amount] = decoded.args;
  if (amount <= 0n) throw new Error('Moonwell exact call amount must be greater than zero');
  return {
    protocolId: expected.protocolId,
    action: expected.action,
    target,
    calldataHash,
    amount: uint(amount),
    account: address(transaction.from),
    receiver: expected.action === 'borrow' ? address(transaction.from) : null,
    // The reviewed mToken target binds the underlying asset. The source-
    // controlled market registry is intentionally used instead of accepting
    // a caller-provided underlying address.
    asset: null,
    marketId: null,
  };
}

function decodeMorphoExactCall(context: ExactCallContext): BaseLendingDecodedAction {
  const { transaction, expected, target, data, calldataHash } = context;
  if (target !== MORPHO_BLUE_BASE) {
    throw new Error('Exact call target is not the canonical Morpho Blue Base contract');
  }
  if (!expected.marketId) {
    throw new Error('Morpho exact-call verification requires a declared marketId');
  }
  const decoded = decodeFunctionData({ abi: MORPHO_ABI, data });
  if (decoded.functionName !== expected.action) {
    throw new Error('Exact call selector does not match the declared Base lending action');
  }
  requireCanonicalCalldata(data, MORPHO_ABI, decoded.functionName, decoded.args);
  const [marketParams, assets, shares, onBehalf, fifth] = decoded.args;
  const { loanToken, collateralToken, oracle, irm, lltv } = marketParams;
  const marketId = morphoMarketId({ loanToken, collateralToken, oracle, irm, lltv });
  if (marketId.toLowerCase() !== expected.marketId.toLowerCase()) {
    throw new Error('Exact Morpho call market parameters do not match the declared marketId');
  }
  if ((assets === 0n && shares === 0n) || (assets !== 0n && shares !== 0n)) {
    throw new Error('Morpho exact call must set exactly one of assets or shares');
  }
  if (decoded.functionName === 'supply' && fifth !== '0x') {
    throw new Error('Morpho supply callback data is outside the direct-call guard scope');
  }
  if (address(onBehalf) !== address(transaction.from)) {
    throw new Error('Morpho exact call must operate only for the transaction sender');
  }
  if (decoded.functionName === 'borrow' && address(fifth) !== address(transaction.from)) {
    throw new Error('Morpho exact borrow receiver must be the transaction sender');
  }
  return {
    protocolId: expected.protocolId,
    action: expected.action,
    target,
    calldataHash,
    amount: uint(assets === 0n ? shares : assets),
    account: address(onBehalf),
    receiver: decoded.functionName === 'borrow' ? address(fifth) : null,
    asset: null,
    marketId,
  };
}

/**
 * Decode only direct Aave V3, Morpho Blue, Compound V3, and reviewed Moonwell
 * supply/borrow calls. The result is safe to carry in a signed decision and is
 * deliberately small: it does not claim to simulate post-call account state
 * or validate token prices.
 */
export function decodeBaseLendingExactCall(
  rawTransaction: BaseLendingExactTransaction,
  expected: ExpectedGuardScope
): BaseLendingDecodedAction {
  const transaction = BaseLendingExactTransactionSchema.parse(rawTransaction);
  exactCallValue(transaction.value);
  const context: ExactCallContext = {
    transaction,
    expected,
    target: address(transaction.to),
    data: transaction.data as `0x${string}`,
    calldataHash: keccak256(transaction.data as `0x${string}`),
  };
  switch (expected.protocolId) {
    case 'aave-v3-base':
      return decodeAaveExactCall(context);
    case 'compound-v3-base':
      return decodeCompoundExactCall(context);
    case 'moonwell-base':
      return decodeMoonwellExactCall(context);
    case 'morpho-blue-base':
      return decodeMorphoExactCall(context);
  }
}

/** A compatibility-only risk-parameter alias; calls remain bound to WETH. */
export function canonicalAaveRiskSymbol(symbol: string): string {
  return symbol.trim().toUpperCase() === 'WETH' ? 'ETH' : symbol.trim().toUpperCase();
}
