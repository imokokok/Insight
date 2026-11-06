/** Exact-call parsing for the reviewed Monad lending surface. */

import { decodeFunctionData, encodeAbiParameters, encodeFunctionData, keccak256 } from 'viem';
import { z } from 'zod';

import {
  AAVE_V3_MONAD_POOL,
  MONAD_CHAIN_ID,
  MORPHO_BLUE_MONAD,
  defaultMonadEulerDescriptor,
  monadAaveUnderlyingForSymbol,
} from './monadLendingProtocols';

export { MONAD_CHAIN_ID } from './monadLendingProtocols';

const AddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);
const HexSchema = z.string().regex(/^0x(?:[a-fA-F0-9]{2})*$/);
const UintSchema = z.union([
  z.string().regex(/^0$|^[1-9][0-9]*$/),
  z.number().int().nonnegative().safe(),
]);

export const MonadLendingExactTransactionSchema = z
  .object({
    chainId: z.literal(MONAD_CHAIN_ID),
    from: AddressSchema,
    to: AddressSchema,
    data: HexSchema.min(10),
    nonce: UintSchema,
    value: UintSchema.optional().default(0),
  })
  .strict();
export type MonadLendingExactTransaction = z.infer<typeof MonadLendingExactTransactionSchema>;

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
 * Reviewed Monad lending protocol ids. `euler-v2-monad` is reviewed against
 * the VERIFIED deployment descriptor (monadLendingProtocols.ts
 * MONAD_EULER_REVIEWED_DESCRIPTOR): only canonical direct EVault deposits and
 * the exact four-step EVC borrow batch against descriptor-pinned addresses
 * are ever decoded. See monadLendingProtocols.ts.
 */
export const MonadLendingProtocolIdSchema = z.enum([
  'aave-v3-monad',
  'morpho-blue-monad',
  'euler-v2-monad',
]);
export type MonadLendingProtocolId = z.infer<typeof MonadLendingProtocolIdSchema>;
export const MonadLendingGuardActionSchema = z.enum(['supply', 'borrow']);
export type MonadLendingGuardAction = z.infer<typeof MonadLendingGuardActionSchema>;

export function isMonadEulerProtocolId(value: string): value is 'euler-v2-monad' {
  return value === 'euler-v2-monad';
}

type ExpectedGuardScope = {
  protocolId: MonadLendingProtocolId;
  action: MonadLendingGuardAction;
  marketId?: string;
  collateralSymbol?: string;
  loanSymbol?: string;
  /** Required for a permissionless Monad Euler EVault; verified live by the guard. */
  marketAddress?: string;
  /** Required for a Monad Euler EVC collateral-deposit-and-borrow batch. */
  collateralVaultAddress?: string;
};

export interface MonadLendingDecodedAction {
  protocolId: MonadLendingProtocolId;
  action: MonadLendingGuardAction;
  target: `0x${string}`;
  calldataHash: `0x${string}`;
  amount: string;
  account: `0x${string}`;
  receiver: `0x${string}` | null;
  asset: `0x${string}` | null;
  marketId: `0x${string}` | null;
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

/**
 * Decode the reviewed Monad Euler exact calls: a canonical direct EVault
 * deposit (supply) or the exact four-step EVC borrow batch
 * (enableCollateral -> deposit -> enableController -> borrow), both pinned to
 * the VERIFIED descriptor's addresses. Any other shape is refused.
 */
function decodeMonadEulerCall(
  transaction: MonadLendingExactTransaction,
  expected: ExpectedGuardScope,
  target: `0x${string}`,
  data: `0x${string}`,
  calldataHash: `0x${string}`
): MonadLendingDecodedAction {
  const descriptor = defaultMonadEulerDescriptor();
  if (
    descriptor.status !== 'VERIFIED' ||
    !descriptor.eVaultFactory ||
    !descriptor.evc ||
    !descriptor.sourceRef
  ) {
    throw new Error(
      'Monad Euler exact-call binding requires a VERIFIED deployment descriptor (fail closed)'
    );
  }
  const evc = address(descriptor.evc);
  const inRegistry = (candidate: string) =>
    descriptor.vaults.some((entry) => entry.address === address(candidate));
  if (expected.action === 'supply') {
    if (!expected.marketAddress || target !== address(expected.marketAddress)) {
      throw new Error('Euler exact call target does not match the reviewed EVault address');
    }
    if (!inRegistry(expected.marketAddress)) {
      throw new Error('Euler exact call EVault is not in the reviewed Monad registry');
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
      amount: uint(amount),
      account: address(transaction.from),
      receiver: address(receiver),
      asset: null,
      marketId: null,
    };
  }
  if (!expected.collateralVaultAddress || target !== evc) {
    throw new Error(
      'Euler borrow must target the reviewed Monad EVC with an explicit collateral EVault'
    );
  }
  if (
    !expected.marketAddress ||
    !inRegistry(expected.marketAddress) ||
    !inRegistry(expected.collateralVaultAddress)
  ) {
    throw new Error('Euler exact call EVaults are not in the reviewed Monad registry');
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
    address(enableCollateral.targetContract) !== evc ||
    address(enableCollateral.onBehalfOfAccount) !== zero ||
    enableCollateral.value !== 0n ||
    enableCollateral.data.toLowerCase() !== expectedEnableCollateral.toLowerCase() ||
    address(depositCollateral.targetContract) !== collateralVault ||
    address(depositCollateral.onBehalfOfAccount) !== sender ||
    depositCollateral.value !== 0n ||
    address(enableController.targetContract) !== evc ||
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
    amount: uint(borrowAmount),
    account: sender,
    receiver: sender,
    asset: null,
    marketId: null,
  };
}

/**
 * Decode only canonical direct Aave V3 / Morpho Blue supply and borrow calls.
 * This does not simulate an account or grant any authority to submit a call.
 */
export function decodeMonadLendingExactCall(
  rawTransaction: MonadLendingExactTransaction,
  expected: ExpectedGuardScope
): MonadLendingDecodedAction {
  const transaction = MonadLendingExactTransactionSchema.parse(rawTransaction);
  if (BigInt(transaction.value) !== 0n) {
    throw new Error('Monad Lending Guard only accepts zero-value direct lending calls');
  }
  const target = address(transaction.to);
  const data = transaction.data as `0x${string}`;
  const calldataHash = keccak256(data);

  if (isMonadEulerProtocolId(expected.protocolId)) {
    return decodeMonadEulerCall(transaction, expected, target, data, calldataHash);
  }
  if (expected.protocolId === 'aave-v3-monad') {
    if (target !== AAVE_V3_MONAD_POOL) {
      throw new Error('Exact call target is not the canonical Aave V3 Monad Pool');
    }
    const decoded = decodeFunctionData({ abi: AAVE_POOL_ABI, data });
    if (decoded.functionName !== expected.action) {
      throw new Error('Exact call selector does not match the declared Monad lending action');
    }
    requireCanonicalCalldata(data, AAVE_POOL_ABI, decoded.functionName, decoded.args);
    if (decoded.functionName === 'supply') {
      const [asset, amount, onBehalfOf] = decoded.args;
      if (amount <= 0n) throw new Error('Aave exact call amount must be greater than zero');
      if (address(onBehalfOf) !== address(transaction.from)) {
        throw new Error('Aave exact call must supply only for the transaction sender');
      }
      const expectedAsset = expected.collateralSymbol
        ? monadAaveUnderlyingForSymbol(expected.collateralSymbol)
        : null;
      if (!expectedAsset || expectedAsset !== address(asset)) {
        throw new Error('Aave exact call asset does not match the reviewed declared collateral');
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
    if (amount <= 0n) throw new Error('Aave exact call amount must be greater than zero');
    if (interestRateMode !== 2n)
      throw new Error('Aave Monad borrow must use variable interestRateMode=2');
    if (address(onBehalfOf) !== address(transaction.from)) {
      throw new Error('Aave exact call must borrow only for the transaction sender');
    }
    const expectedAsset = expected.loanSymbol
      ? monadAaveUnderlyingForSymbol(expected.loanSymbol)
      : null;
    if (!expectedAsset || expectedAsset !== address(asset)) {
      throw new Error('Aave exact call asset does not match the reviewed declared loan');
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

  if (target !== MORPHO_BLUE_MONAD) {
    throw new Error('Exact call target is not the canonical Morpho Blue Monad contract');
  }
  if (!expected.marketId)
    throw new Error('Morpho exact-call verification requires a declared marketId');
  const decoded = decodeFunctionData({ abi: MORPHO_ABI, data });
  if (decoded.functionName !== expected.action) {
    throw new Error('Exact call selector does not match the declared Monad lending action');
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
