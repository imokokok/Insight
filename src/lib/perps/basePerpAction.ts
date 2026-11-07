/**
 * Exact-call parsing for the narrow Synthetix Perps V3 Base surface that the
 * guard can attest in v2: one direct `commitOrder` on the canonical
 * PerpsMarketProxy. It is intentionally not a generic calldata decoder: an
 * unknown target, selector, non-zero call value, non-canonical ABI encoding,
 * or a call that does not match the declared reviewed market is rejected
 * instead of being described optimistically.
 *
 * Address and ABI provenance: the PerpsMarketProxy address, market ids and the
 * `AsyncOrder.OrderCommitmentRequest` layout below are taken from the official
 * `@synthetixio/v3-contracts` npm package (8453-andromeda deployment) and were
 * cross-checked against live Base chain reads (`getMarkets()` returns the
 * reviewed market ids). Do not edit these values from memory.
 */

import { decodeFunctionData, encodeFunctionData, keccak256 } from 'viem';
import { z } from 'zod';

import { type SYNTHETIX_PERPS_V3_BASE_PROTOCOL_ID } from './basePerpConstants';

export const BASE_CHAIN_ID = 8453;

/**
 * Canonical Synthetix Perps V3 `PerpsMarketProxy` on Base mainnet
 * (@synthetixio/v3-contracts 8453-andromeda; verified against live on-chain
 * `getMarkets()`).
 */
export const PERPS_MARKET_PROXY = '0x0A2AF931eFFd34b81ebcc57E3d3c9B1E1dE1C9Ce' as const;

/**
 * Reviewed Synthetix Perps V3 Base market ids for the markets covered by the
 * guard's static leverage profile. A call for any other market id is rejected.
 */
export const REVIEWED_PERPS_MARKET_IDS = {
  BTC: 200,
  ETH: 100,
  SOL: 400,
  XRP: 7100,
  DOGE: 800,
  PEPE: 1200,
} as const satisfies Record<string, number>;

const AddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);
const HexSchema = z.string().regex(/^0x(?:[a-fA-F0-9]{2})*$/);
const UintSchema = z.union([
  z.string().regex(/^0$|^[1-9][0-9]*$/),
  z.number().int().nonnegative().safe(),
]);

export const BasePerpExactTransactionSchema = z
  .object({
    chainId: z.literal(BASE_CHAIN_ID),
    from: AddressSchema,
    to: AddressSchema,
    data: HexSchema.min(10),
    nonce: UintSchema,
    value: UintSchema.optional().default(0),
  })
  .strict();

export type BasePerpExactTransaction = z.infer<typeof BasePerpExactTransactionSchema>;

export const BasePerpGuardActionSchema = z.enum(['open_long', 'open_short']);
export type BasePerpGuardAction = z.infer<typeof BasePerpGuardActionSchema>;

/**
 * `commitOrder` accepts one `AsyncOrder.OrderCommitmentRequest` struct:
 * marketId, accountId, sizeDelta, settlementStrategyId, acceptablePrice,
 * trackingCode, referrer. Layout verified against the published
 * PerpsMarketProxy ABI in @synthetixio/v3-contracts.
 */
export const COMMIT_ORDER_ABI = [
  {
    type: 'function',
    name: 'commitOrder',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'commitment',
        type: 'tuple',
        components: [
          { name: 'marketId', type: 'uint128' },
          { name: 'accountId', type: 'uint128' },
          { name: 'sizeDelta', type: 'int128' },
          { name: 'settlementStrategyId', type: 'uint128' },
          { name: 'acceptablePrice', type: 'uint256' },
          { name: 'trackingCode', type: 'bytes32' },
          { name: 'referrer', type: 'address' },
        ],
      },
    ],
    outputs: [],
  },
] as const;

export interface BasePerpDecodedAction {
  protocolId: typeof SYNTHETIX_PERPS_V3_BASE_PROTOCOL_ID;
  action: BasePerpGuardAction;
  target: `0x${string}`;
  calldataHash: `0x${string}`;
  /** Reviewed Synthetix market id bound to the declared asset symbol. */
  marketId: string;
  account: `0x${string}`;
  accountId: string;
  /** Signed position-size delta in 18-decimal market units. */
  sizeDelta: string;
  /** Caller-committed worst acceptable fill price, 18-decimal USD. */
  acceptablePrice: string;
  trackingCode: `0x${string}`;
  referrer: `0x${string}`;
}

export interface BasePerpExpectedScope {
  protocolId: typeof SYNTHETIX_PERPS_V3_BASE_PROTOCOL_ID;
  action: BasePerpGuardAction;
  assetSymbol: string;
}

function address(value: string): `0x${string}` {
  return value.toLowerCase() as `0x${string}`;
}

const ZERO_BYTES32 = `0x${'00'.repeat(32)}` as `0x${string}`;

type CommitOrderRequest = {
  marketId: bigint;
  accountId: bigint;
  sizeDelta: bigint;
  settlementStrategyId: bigint;
  acceptablePrice: bigint;
  trackingCode: `0x${string}`;
  referrer: `0x${string}`;
};

function requireCanonicalCalldata(data: `0x${string}`, request: CommitOrderRequest): void {
  const canonical = encodeFunctionData({
    abi: COMMIT_ORDER_ABI,
    functionName: 'commitOrder',
    args: [request],
  });
  if (canonical.toLowerCase() !== data.toLowerCase()) {
    throw new Error('Exact call calldata is not canonical ABI encoding');
  }
}

/**
 * Decode only a direct PerpsMarketProxy `commitOrder` call for a reviewed
 * Base market. The result is safe to carry in a signed decision and is
 * deliberately small: it does not claim to simulate margin state, funding, or
 * the venue's settlement outcome.
 */
export function decodeBasePerpExactCall(
  rawTransaction: BasePerpExactTransaction,
  expected: BasePerpExpectedScope
): BasePerpDecodedAction {
  const transaction = BasePerpExactTransactionSchema.parse(rawTransaction);
  if (BigInt(transaction.value ?? 0) !== 0n) {
    throw new Error('Base Perp Guard only accepts zero-value direct order calls');
  }
  const target = address(transaction.to);
  if (target !== address(PERPS_MARKET_PROXY)) {
    throw new Error(
      'Exact call target is not the canonical Synthetix Perps V3 Base PerpsMarketProxy'
    );
  }
  const data = transaction.data as `0x${string}`;
  const decoded = decodeFunctionData({ abi: COMMIT_ORDER_ABI, data });
  if (decoded.functionName !== 'commitOrder') {
    throw new Error('Exact call selector is not the reviewed Synthetix commitOrder function');
  }
  const [request] = decoded.args;
  requireCanonicalCalldata(data, request);

  const marketId = request.marketId;
  if (marketId <= 0n) {
    throw new Error('Synthetix exact call marketId must be greater than zero');
  }
  const accountId = request.accountId;
  if (accountId <= 0n) {
    throw new Error('Synthetix exact call accountId must be greater than zero');
  }
  const expectedMarketId =
    REVIEWED_PERPS_MARKET_IDS[
      expected.assetSymbol.trim().toUpperCase() as keyof typeof REVIEWED_PERPS_MARKET_IDS
    ];
  if (expectedMarketId === undefined || marketId !== BigInt(expectedMarketId)) {
    throw new Error(
      'Synthetix exact call marketId does not match the reviewed market for the declared asset symbol'
    );
  }
  if (request.settlementStrategyId !== 0n) {
    throw new Error('Synthetix exact call must use the reviewed Pyth settlement strategy id 0');
  }
  if (request.sizeDelta === 0n) {
    throw new Error('Synthetix exact call sizeDelta must be greater than zero');
  }
  const isLong = request.sizeDelta > 0n;
  if (expected.action === 'open_long' && !isLong) {
    throw new Error(
      'Synthetix exact call sizeDelta sign does not match the declared open_long action'
    );
  }
  if (expected.action === 'open_short' && isLong) {
    throw new Error(
      'Synthetix exact call sizeDelta sign does not match the declared open_short action'
    );
  }
  if (request.acceptablePrice <= 0n) {
    throw new Error('Synthetix exact call acceptablePrice must be greater than zero');
  }
  if (request.trackingCode !== ZERO_BYTES32) {
    throw new Error('Synthetix exact call must not attach a third-party tracking code');
  }
  if (request.referrer !== '0x0000000000000000000000000000000000000000') {
    throw new Error('Synthetix exact call must not attach a third-party referrer');
  }

  return {
    protocolId: expected.protocolId,
    action: expected.action,
    target,
    calldataHash: keccak256(data),
    marketId: marketId.toString(10),
    account: address(transaction.from),
    accountId: accountId.toString(10),
    sizeDelta: request.sizeDelta.toString(10),
    acceptablePrice: request.acceptablePrice.toString(10),
    trackingCode: request.trackingCode,
    referrer: address(request.referrer),
  };
}
