/** Strict, direct-call decoder for reviewed Polygon, Arbitrum and BNB lenders. */

import { decodeFunctionData, encodeFunctionData, keccak256 } from 'viem';
import { z } from 'zod';

import {
  ARBITRUM_CHAIN_ID,
  BNB_CHAIN_ID,
  POLYGON_CHAIN_ID,
  aaveV3EvmMarket,
  aaveV3EvmUnderlyingForSymbol,
  isAaveV3EvmProtocolId,
  isVenusNativeMarket,
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
]);
export const MultichainEvmLendingProtocolIdSchema = z.enum([
  'aave-v3-polygon',
  'aave-v3-arbitrum',
  'aave-v3-bnb',
  'venus-core-bnb',
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

export interface MultichainEvmLendingDecodedAction {
  protocolId: MultichainEvmLendingProtocolId;
  action: MultichainEvmLendingAction;
  target: `0x${string}`;
  calldataHash: `0x${string}`;
  amount: string;
  account: `0x${string}`;
  receiver: `0x${string}` | null;
  asset: `0x${string}` | null;
  marketId: null;
}

type ExpectedScope = {
  protocolId: MultichainEvmLendingProtocolId;
  action: MultichainEvmLendingAction;
  collateralSymbol?: string;
  loanSymbol?: string;
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

/**
 * Decode only one canonical direct call.  Delegation, batching, non-zero
 * foreign value, and receiver substitution are all intentionally excluded.
 */
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
