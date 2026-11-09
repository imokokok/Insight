/** Exact-call parsing for the reviewed HyperEVM lending surface. */

import { decodeFunctionData, encodeFunctionData, keccak256 } from 'viem';
import { z } from 'zod';

import {
  HYPEREVM_CHAIN_ID,
  HYPERLEND_CORE_POOL,
  hyperLendUnderlyingForSymbol,
} from './hyperEvmLendingProtocols';

export { HYPEREVM_CHAIN_ID } from './hyperEvmLendingProtocols';

const AddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);
const HexSchema = z.string().regex(/^0x(?:[a-fA-F0-9]{2})*$/);
const UintSchema = z.union([
  z.string().regex(/^0$|^[1-9][0-9]*$/),
  z.number().int().nonnegative().safe(),
]);

export const HyperEvmLendingExactTransactionSchema = z
  .object({
    chainId: z.literal(HYPEREVM_CHAIN_ID),
    from: AddressSchema,
    to: AddressSchema,
    data: HexSchema.min(10),
    nonce: UintSchema,
    value: UintSchema.optional().default(0),
  })
  .strict();
export type HyperEvmLendingExactTransaction = z.infer<typeof HyperEvmLendingExactTransactionSchema>;

// HyperLend Core Pools are Aave V3 derivative pools: the Pool exposes the
// canonical Aave `supply` / `borrow` selectors. Stable-rate borrowing is not
// offered, so interestRateMode=2 (variable) is the only admitted borrow mode.
const HYPERLEND_POOL_ABI = [
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

/** The one reviewed HyperEVM lending deployment and its direct-call actions. */
export const HyperEvmLendingProtocolIdSchema = z.enum(['hyperlend-core-hyperevm']);
export type HyperEvmLendingProtocolId = z.infer<typeof HyperEvmLendingProtocolIdSchema>;
export const HyperEvmLendingGuardActionSchema = z.enum(['supply', 'borrow']);
export type HyperEvmLendingGuardAction = z.infer<typeof HyperEvmLendingGuardActionSchema>;

type ExpectedGuardScope = {
  protocolId: HyperEvmLendingProtocolId;
  action: HyperEvmLendingGuardAction;
  collateralSymbol?: string;
  loanSymbol?: string;
};

export interface HyperEvmLendingDecodedAction {
  protocolId: HyperEvmLendingProtocolId;
  action: HyperEvmLendingGuardAction;
  target: `0x${string}`;
  calldataHash: `0x${string}`;
  amount: string;
  account: `0x${string}`;
  receiver: `0x${string}` | null;
  asset: `0x${string}` | null;
}

function address(value: string): `0x${string}` {
  return value.toLowerCase() as `0x${string}`;
}
function uint(value: bigint): string {
  return value.toString(10);
}

function requireCanonicalCalldata(
  data: `0x${string}`,
  abi: readonly unknown[],
  functionName: string,
  args: readonly unknown[]
): void {
  const canonical = encodeFunctionData({ abi, functionName, args });
  if (canonical.toLowerCase() !== data.toLowerCase()) {
    throw new Error('Exact call calldata is not canonical ABI encoding');
  }
}

/**
 * Decode only canonical direct HyperLend Core Pool supply and borrow calls.
 * This does not simulate an account or grant any authority to submit a call.
 */
export function decodeHyperEvmLendingExactCall(
  rawTransaction: HyperEvmLendingExactTransaction,
  expected: ExpectedGuardScope
): HyperEvmLendingDecodedAction {
  const transaction = HyperEvmLendingExactTransactionSchema.parse(rawTransaction);
  if (BigInt(transaction.value) !== 0n) {
    throw new Error('HyperEVM Lending Guard only accepts zero-value direct lending calls');
  }
  const target = address(transaction.to);
  const data = transaction.data as `0x${string}`;
  const calldataHash = keccak256(data);

  if (target !== HYPERLEND_CORE_POOL.toLowerCase()) {
    throw new Error('Exact call target is not the canonical HyperLend Core Pool');
  }
  const decoded = decodeFunctionData({ abi: HYPERLEND_POOL_ABI, data });
  if (decoded.functionName !== expected.action) {
    throw new Error('Exact call selector does not match the declared HyperEVM lending action');
  }
  requireCanonicalCalldata(data, HYPERLEND_POOL_ABI, decoded.functionName, decoded.args);
  if (decoded.functionName === 'supply') {
    const [asset, amount, onBehalfOf] = decoded.args;
    if (amount <= 0n) throw new Error('HyperLend exact call amount must be greater than zero');
    if (address(onBehalfOf) !== address(transaction.from)) {
      throw new Error('HyperLend exact call must supply only for the transaction sender');
    }
    const expectedAsset = expected.collateralSymbol
      ? hyperLendUnderlyingForSymbol(expected.collateralSymbol)
      : null;
    if (!expectedAsset || expectedAsset !== address(asset)) {
      throw new Error('HyperLend exact call asset does not match the reviewed declared collateral');
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
    };
  }
  const [asset, amount, interestRateMode, _referralCode, onBehalfOf] = decoded.args;
  if (amount <= 0n) throw new Error('HyperLend exact call amount must be greater than zero');
  if (interestRateMode !== 2n)
    throw new Error('HyperLend borrow must use variable interestRateMode=2');
  if (address(onBehalfOf) !== address(transaction.from)) {
    throw new Error('HyperLend exact call must borrow only for the transaction sender');
  }
  const expectedAsset = expected.loanSymbol
    ? hyperLendUnderlyingForSymbol(expected.loanSymbol)
    : null;
  if (!expectedAsset || expectedAsset !== address(asset)) {
    throw new Error('HyperLend exact call asset does not match the reviewed declared loan');
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
  };
}
