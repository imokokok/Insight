/**
 * P1-1a · Generic ERC-4626 vault-call reduction layer (mapping half).
 *
 * Reduces an ERC-4626 vault (e.g. a MetaMorpho / curator vault) to an exact,
 * already-reviewed Morpho Blue `marketId`, using ON-CHAIN observations rather
 * than a hard-coded "vault address -> market" whitelist:
 *
 *   1. `asset()` on the vault gives the underlying loan asset.
 *   2. The vault's observable market configuration (`supplyQueue` /
 *      `withdrawQueue`) gives the market ids it can actually allocate into.
 *   3. `idToMarketParams(id)` on the Morpho singleton re-reads the immutable
 *      market tuple, exactly the same identity that `decodeMorphoExactCall`
 *      derives from direct-call calldata in `baseLendingAction.ts`.
 *
 * The reviewed-market set is a small, source-controlled ANCHOR (the outcome of
 * a review), not a substitution for the chain reads. Every observed market id
 * must be in that set, the asset must match both the reviewed loan asset and
 * the on-chain `loanToken`, and every chain read must succeed within the
 * timeout. Anything else fails closed with an explicit reason code — this
 * module never "guesses a market" to make an assessment possible.
 *
 * NOTE ON UNVERIFIED ASSUMPTIONS (see the task report): this repository does
 * NOT contain a MetaMorpho ABI. `supplyQueueLength()/supplyQueue(i)` and
 * `withdrawQueueLength()/withdrawQueue(i)` are modelled on MetaMorpho v1
 * public view functions and were not verified against a first-party source
 * inside this repo. The injected `VaultRpcReader` interface is what makes the
 * mapping independently testable without that ABI being authoritative.
 */

import { decodeFunctionResult, encodeFunctionData, type Abi } from 'viem';

import { readContract } from '@/lib/protocols/importer/rpcClient';

import { MORPHO_BLUE_BASE } from './baseLendingAction';

import type { ReviewedMorphoBlueMarket } from './baseLendingProtocols';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const MARKET_ID_RE = /^0x[0-9a-f]{64}$/;
const DEFAULT_TIMEOUT_MS = 3_000;
/** Bound eth_call fan-out so a malicious vault cannot force an unbounded scan. */
const MAX_QUEUE_LENGTH = 64n;

const ASSET_ABI: Abi = [
  {
    type: 'function',
    name: 'asset',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
];
const SUPPLY_QUEUE_LENGTH_ABI: Abi = [
  {
    type: 'function',
    name: 'supplyQueueLength',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
];
const SUPPLY_QUEUE_ABI: Abi = [
  {
    type: 'function',
    name: 'supplyQueue',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [{ name: '', type: 'bytes32' }],
  },
];
const WITHDRAW_QUEUE_LENGTH_ABI: Abi = [
  {
    type: 'function',
    name: 'withdrawQueueLength',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
];
const WITHDRAW_QUEUE_ABI: Abi = [
  {
    type: 'function',
    name: 'withdrawQueue',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [{ name: '', type: 'bytes32' }],
  },
];
const MORPHO_MARKET_ABI: Abi = [
  {
    type: 'function',
    name: 'idToMarketParams',
    stateMutability: 'view',
    inputs: [{ name: 'id', type: 'bytes32' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'loanToken', type: 'address' },
          { name: 'collateralToken', type: 'address' },
          { name: 'oracle', type: 'address' },
          { name: 'irm', type: 'address' },
          { name: 'lltv', type: 'uint256' },
        ],
      },
    ],
  },
];

/**
 * Injected chain reader. `createRpcBackedVaultReader()` adapts the repository's
 * existing `readContract` (eth_call) to this interface; tests supply a mock.
 * No credentials / RPC URLs live here.
 */
export interface VaultRpcReader {
  /** ERC-4626 `asset()` -> underlying loan token. */
  asset(vault: `0x${string}`): Promise<`0x${string}`>;
  /** MetaMorpho v1 supply queue -> Morpho Blue market ids (bytes32). */
  supplyQueue(vault: `0x${string}`): Promise<readonly `0x${string}`[]>;
  /** MetaMorpho v1 withdraw queue -> Morpho Blue market ids (bytes32). */
  withdrawQueue(vault: `0x${string}`): Promise<readonly `0x${string}`[]>;
  /** `idToMarketParams(id).loanToken` on the Morpho singleton. */
  marketLoanToken(marketId: `0x${string}`): Promise<`0x${string}`>;
}

export interface RpcBackedVaultReaderOptions {
  chainId?: number;
  morpho?: `0x${string}`;
  /** Override the eth_call transport (default: the repository rpcClient). */
  readContractFn?: typeof readContract;
}

/** Adapter over the repository's existing `readContract(chainId, to, data)`. */
export function createRpcBackedVaultReader(
  options: RpcBackedVaultReaderOptions = {}
): VaultRpcReader {
  const chainId = options.chainId ?? 8453;
  const morpho = options.morpho ?? MORPHO_BLUE_BASE;
  const call = options.readContractFn ?? readContract;

  const ethCall = async (to: `0x${string}`, data: `0x${string}`): Promise<`0x${string}`> => {
    const response = await call(chainId, to, data);
    return response as `0x${string}`;
  };

  const readQueue = async (
    vault: `0x${string}`,
    lengthAbi: Abi,
    lengthName: 'supplyQueueLength' | 'withdrawQueueLength',
    itemAbi: Abi,
    itemName: 'supplyQueue' | 'withdrawQueue'
  ): Promise<readonly `0x${string}`[]> => {
    const lengthData = encodeFunctionData({
      abi: lengthAbi,
      functionName: lengthName,
    });
    const length = decodeFunctionResult({
      abi: lengthAbi,
      functionName: lengthName,
      data: await ethCall(vault, lengthData),
    }) as bigint;
    if (length > MAX_QUEUE_LENGTH) {
      throw new Error(`${lengthName}()=${length} exceeds the ${MAX_QUEUE_LENGTH} safety bound`);
    }
    const ids: `0x${string}`[] = [];
    for (let i = 0n; i < length; i += 1n) {
      const itemData = encodeFunctionData({
        abi: itemAbi,
        functionName: itemName,
        args: [i] as never,
      });
      const id = decodeFunctionResult({
        abi: itemAbi,
        functionName: itemName,
        data: await ethCall(vault, itemData),
      }) as `0x${string}`;
      ids.push(id.toLowerCase() as `0x${string}`);
    }
    return ids;
  };

  return {
    async asset(vault) {
      const data = encodeFunctionData({ abi: ASSET_ABI, functionName: 'asset' });
      const value = decodeFunctionResult({
        abi: ASSET_ABI,
        functionName: 'asset',
        data: await ethCall(vault, data),
      }) as `0x${string}`;
      return value.toLowerCase() as `0x${string}`;
    },
    supplyQueue(vault) {
      return readQueue(
        vault,
        SUPPLY_QUEUE_LENGTH_ABI,
        'supplyQueueLength',
        SUPPLY_QUEUE_ABI,
        'supplyQueue'
      );
    },
    withdrawQueue(vault) {
      return readQueue(
        vault,
        WITHDRAW_QUEUE_LENGTH_ABI,
        'withdrawQueueLength',
        WITHDRAW_QUEUE_ABI,
        'withdrawQueue'
      );
    },
    async marketLoanToken(marketId) {
      const data = encodeFunctionData({
        abi: MORPHO_MARKET_ABI,
        functionName: 'idToMarketParams',
        args: [marketId] as never,
      });
      const params = decodeFunctionResult({
        abi: MORPHO_MARKET_ABI,
        functionName: 'idToMarketParams',
        data: await ethCall(morpho, data),
      }) as { loanToken: `0x${string}` };
      return params.loanToken.toLowerCase() as `0x${string}`;
    },
  };
}

export type VaultMappingReasonCode =
  | 'INVALID_VAULT'
  | 'RPC_ERROR'
  | 'RPC_TIMEOUT'
  | 'NO_REVIEWED_MARKET'
  | 'NO_MARKET_QUEUE'
  | 'UNREVIEWED_MARKET_IN_QUEUE'
  | 'ASSET_MISMATCH'
  | 'AMBIGUOUS_MARKET';

export interface VaultResolution {
  vault: `0x${string}`;
  /** Lowercased `asset()` result, or null when the chain read never completed. */
  asset: `0x${string}` | null;
  /** All distinct market ids observed in the vault's queues (lowercased). */
  marketIds: `0x${string}`[];
  /** Present only when the vault reduces to exactly one reviewed market. */
  reviewedMarketId?: `0x${string}`;
  evidence: string[];
}

export type VaultMappingResult =
  | { ok: true; resolution: VaultResolution }
  | { ok: false; reasonCode: VaultMappingReasonCode; reason: string; resolution: VaultResolution };

export interface VaultMappingOptions {
  reader: VaultRpcReader;
  /** Source-controlled reviewed-market anchors. May be injected by tests. */
  reviewedMarkets: readonly ReviewedMorphoBlueMarket[];
  timeoutMs?: number;
}

class VaultRpcTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'VaultRpcTimeoutError';
  }
}

class VaultMappingFailure extends Error {
  readonly reasonCode: VaultMappingReasonCode;
  constructor(reasonCode: VaultMappingReasonCode, message: string) {
    super(message);
    this.name = 'VaultMappingFailure';
    this.reasonCode = reasonCode;
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new VaultRpcTimeoutError(`RPC read exceeded ${ms}ms`)),
      ms
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

async function readOrThrow<T>(label: string, fn: () => Promise<T>, timeoutMs: number): Promise<T> {
  try {
    return await withTimeout(fn(), timeoutMs);
  } catch (error) {
    if (error instanceof VaultRpcTimeoutError) {
      throw new VaultMappingFailure('RPC_TIMEOUT', `${label}: ${errorMessage(error)}`);
    }
    throw new VaultMappingFailure('RPC_ERROR', `${label}: ${errorMessage(error)}`);
  }
}

/**
 * Reduce a vault to one reviewed Morpho Blue market id. Fully fail-closed:
 * every failure returns a result with `ok: false`, an explicit `reasonCode`,
 * and the evidence collected so far. It never falls back to "pick a market".
 */
export async function resolveVaultMarket(
  vault: `0x${string}`,
  options: VaultMappingOptions
): Promise<VaultMappingResult> {
  const evidence: string[] = [];
  const resolution: VaultResolution = {
    vault,
    asset: null,
    marketIds: [],
    evidence,
  };
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  try {
    if (!ADDRESS_RE.test(vault)) {
      throw new VaultMappingFailure(
        'INVALID_VAULT',
        `vault address is not a 20-byte hex address: ${vault}`
      );
    }
    if (options.reviewedMarkets.length === 0) {
      throw new VaultMappingFailure(
        'NO_REVIEWED_MARKET',
        'no reviewed Morpho Blue markets are registered; fail-closed (a review must register markets before vault reduction can admit any vault)'
      );
    }

    // (1) Underlying loan asset, read on-chain from the vault itself.
    const asset = (
      await readOrThrow('asset()', () => options.reader.asset(vault), timeoutMs)
    ).toLowerCase();
    if (!ADDRESS_RE.test(asset)) {
      throw new VaultMappingFailure('RPC_ERROR', `asset() returned a non-address value: ${asset}`);
    }
    resolution.asset = asset as `0x${string}`;
    evidence.push(`chain: asset(${vault}) = ${asset}`);

    // (2) Observable market configuration (on-chain, not a whitelist).
    const [supply, withdraw] = await Promise.all([
      readOrThrow('supplyQueue()', () => options.reader.supplyQueue(vault), timeoutMs),
      readOrThrow('withdrawQueue()', () => options.reader.withdrawQueue(vault), timeoutMs),
    ]);
    const observed = [...supply, ...withdraw].map((id) => id.toLowerCase());
    for (const id of observed) {
      if (!MARKET_ID_RE.test(id)) {
        throw new VaultMappingFailure(
          'RPC_ERROR',
          `vault queue returned a non-bytes32 market id: ${id}`
        );
      }
    }
    const marketIds = Array.from(new Set(observed)) as `0x${string}`[];
    resolution.marketIds = marketIds;
    evidence.push(`chain: supplyQueue(${vault}) = [${supply.join(', ')}]`);
    evidence.push(`chain: withdrawQueue(${vault}) = [${withdraw.join(', ')}]`);
    if (marketIds.length === 0) {
      throw new VaultMappingFailure(
        'NO_MARKET_QUEUE',
        'vault exposes no observable Morpho market queue; refusing to guess a market'
      );
    }

    // (3) Every observed market must be in the reviewed anchor set.
    const reviewed = new Map<string, ReviewedMorphoBlueMarket>();
    for (const market of options.reviewedMarkets) {
      reviewed.set(market.marketId.toLowerCase(), market);
    }
    const unreviewed = marketIds.filter((id) => !reviewed.has(id));
    if (unreviewed.length > 0) {
      throw new VaultMappingFailure(
        'UNREVIEWED_MARKET_IN_QUEUE',
        `vault queue contains un-reviewed market id(s): ${unreviewed.join(', ')}`
      );
    }

    // (4) asset() must equal the reviewed loan asset AND the on-chain
    //     idToMarketParams(id).loanToken for every observed market.
    for (const id of marketIds) {
      const descriptor = reviewed.get(id)!;
      if (descriptor.loanAsset.toLowerCase() !== asset) {
        throw new VaultMappingFailure(
          'ASSET_MISMATCH',
          `asset() ${asset} does not match reviewed loan asset ${descriptor.loanAsset} for market ${id}`
        );
      }
      const loanToken = (
        await readOrThrow(
          `idToMarketParams(${id})`,
          () => options.reader.marketLoanToken(id),
          timeoutMs
        )
      ).toLowerCase();
      evidence.push(`chain: idToMarketParams(${id}).loanToken = ${loanToken}`);
      if (!ADDRESS_RE.test(loanToken) || loanToken !== asset) {
        throw new VaultMappingFailure(
          'ASSET_MISMATCH',
          `on-chain loanToken ${loanToken} for market ${id} does not match asset() ${asset}`
        );
      }
    }

    // (5) The existing guard evaluation chain is single-market. A vault that
    //     spreads across several distinct reviewed markets cannot be reduced
    //     to one exact market id without guessing, so it is refused.
    if (marketIds.length > 1) {
      throw new VaultMappingFailure(
        'AMBIGUOUS_MARKET',
        `vault maps to ${marketIds.length} distinct reviewed markets; refusing to guess one exact marketId`
      );
    }

    resolution.reviewedMarketId = marketIds[0];
    evidence.push(`reduction: reviewedMarketId = ${resolution.reviewedMarketId}`);
    return { ok: true, resolution };
  } catch (error) {
    if (error instanceof VaultMappingFailure) {
      return {
        ok: false,
        reasonCode: error.reasonCode,
        reason: error.message,
        resolution,
      };
    }
    return {
      ok: false,
      reasonCode: 'RPC_ERROR',
      reason: `unexpected vault mapping error: ${errorMessage(error)}`,
      resolution,
    };
  }
}
