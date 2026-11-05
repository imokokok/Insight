/**
 * P1-1a · Generic ERC-4626 vault-call reduction layer (decoder half).
 *
 * Base lending is dominated by Morpho Blue, but the transaction a user
 * actually signs is usually a MetaMorpho / curator vault call, not a direct
 * call to the Morpho singleton. This module deliberately decodes ONLY the four
 * standard ERC-4626 entry points and nothing else. It is not a generic
 * calldata decoder: anything that requires interpretation (multicalls,
 * aggregators, permit flows, batches, native-value calls, non-canonical ABI
 * encoding) is rejected with an explicit reason code instead of being guessed.
 *
 * Selectors are computed from the ABI with viem's `toFunctionSelector` rather
 * than hard-coded: hand-written selector constants are a common source of
 * silent mis-binding (e.g. `withdraw(uint256,address,address)` !=
 * `withdraw(uint256)`).
 */

import {
  decodeFunctionData,
  encodeFunctionData,
  keccak256,
  parseAbi,
  toFunctionSelector,
  type Abi,
} from 'viem';

export type VaultMethod = 'deposit' | 'mint' | 'redeem' | 'withdraw';

/** A strictly decoded, canonical ERC-4626 call. */
export interface VaultCall {
  /** Vault address, taken verbatim (lowercased) from `transaction.to`. */
  vault: `0x${string}`;
  method: VaultMethod;
  /** Decimal string; `assets` for deposit/withdraw, otherwise null. */
  assets: string | null;
  /** Decimal string; `shares` for mint/redeem, otherwise null. */
  shares: string | null;
  receiver: `0x${string}`;
  /**
   * Null for deposit/mint: ERC-4626 has no `owner` argument there (the assets
   * come from `msg.sender`). For redeem/withdraw it is the decoded owner.
   */
  owner: `0x${string}` | null;
  calldataHash: `0x${string}`;
}

export type VaultDecodeReasonCode =
  | 'INVALID_TRANSACTION'
  | 'MALFORMED_CALLDATA'
  | 'UNKNOWN_SELECTOR'
  | 'AGGREGATOR_CALL'
  | 'BATCH_CALL'
  | 'PERMIT_FLOW'
  | 'NATIVE_VALUE'
  | 'NON_CANONICAL_ENCODING';

export type VaultDecodeResult =
  | { ok: true; call: VaultCall }
  | { ok: false; reasonCode: VaultDecodeReasonCode; reason: string };

/** Minimal transaction shape; structurally compatible with BaseLendingExactTransaction. */
export interface VaultCallTransaction {
  to: string;
  data: string;
  value?: string | number | bigint | null;
}

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const HEX_RE = /^0x(?:[a-fA-F0-9]{2})*$/;

// Widened to `Abi` so decode/encode do not over-narrow the union of four
// functions; the per-method parameter shapes are checked explicitly below.
const ERC4626_ABI: Abi = parseAbi([
  'function deposit(uint256 assets, address receiver) returns (uint256 shares)',
  'function mint(uint256 shares, address receiver) returns (uint256 assets)',
  'function redeem(uint256 shares, address receiver, address owner) returns (uint256 assets)',
  'function withdraw(uint256 assets, address receiver, address owner) returns (uint256 shares)',
]);

function selectorMap(): Map<string, VaultMethod> {
  const map = new Map<string, VaultMethod>();
  const entries: readonly (readonly [string, VaultMethod])[] = [
    ['deposit(uint256,address)', 'deposit'],
    ['mint(uint256,address)', 'mint'],
    ['redeem(uint256,address,address)', 'redeem'],
    ['withdraw(uint256,address,address)', 'withdraw'],
  ];
  for (const [signature, method] of entries) {
    map.set(toFunctionSelector(signature).toLowerCase(), method);
  }
  return map;
}

const SELECTORS = selectorMap();

interface BlockedSelector {
  reasonCode: VaultDecodeReasonCode;
  reason: string;
}

/**
 * Known non-ERC-4626 entry points that must be refused explicitly. Unknown
 * selectors are refused as UNKNOWN_SELECTOR; this module never tries to
 * heuristically interpret an unrecognised batch/aggregator payload.
 */
function blockedSelectorMap(): Map<string, BlockedSelector> {
  const map = new Map<string, BlockedSelector>();
  const add = (signature: string, reasonCode: VaultDecodeReasonCode, reason: string) =>
    map.set(toFunctionSelector(signature).toLowerCase(), { reasonCode, reason });

  // Multicall / batch entry points (delegatecall-style aggregation).
  add(
    'multicall(bytes[])',
    'BATCH_CALL',
    'multicall(bytes[]) is a batch call and is outside the single-call ERC-4626 reduction scope'
  );
  add(
    'multicall(bytes)',
    'BATCH_CALL',
    'multicall(bytes) is a batch call and is outside the single-call ERC-4626 reduction scope'
  );
  add(
    'batchCall((address,uint256,bytes)[])',
    'BATCH_CALL',
    'batchCall is a batch call and is outside the single-call ERC-4626 reduction scope'
  );
  // Multicall3 / aggregator entry points.
  add(
    'aggregate((address,bytes)[])',
    'AGGREGATOR_CALL',
    'Multicall3 aggregate() is aggregator calldata and is not a single ERC-4626 call'
  );
  add(
    'aggregate3((address,bool,bytes)[])',
    'AGGREGATOR_CALL',
    'Multicall3 aggregate3() is aggregator calldata and is not a single ERC-4626 call'
  );
  add(
    'tryAggregate(bool,(address,bytes)[])',
    'AGGREGATOR_CALL',
    'Multicall3 tryAggregate() is aggregator calldata and is not a single ERC-4626 call'
  );
  add(
    'blockAndAggregate((address,bytes)[])',
    'AGGREGATOR_CALL',
    'Multicall3 blockAndAggregate() is aggregator calldata and is not a single ERC-4626 call'
  );
  add(
    'execute(address,uint256,bytes)',
    'AGGREGATOR_CALL',
    'execute() (smart-account / router) is aggregator calldata and is not a single ERC-4626 call'
  );
  add(
    'execute(bytes,bytes,uint256)',
    'AGGREGATOR_CALL',
    'execute() (ERC-4337 style) is aggregator calldata and is not a single ERC-4626 call'
  );
  // Permit / permit-style deposit flows.
  add(
    'permit(address,address,uint256,uint256,uint8,bytes32,bytes32)',
    'PERMIT_FLOW',
    'EIP-2612 permit() is a signed-approval flow, not an ERC-4626 supply/redeem call'
  );
  add(
    'permit(address,address,uint256,uint256,bool,uint8,bytes32,bytes32)',
    'PERMIT_FLOW',
    'Dai-style permit() is a signed-approval flow, not an ERC-4626 supply/redeem call'
  );
  add(
    'selfPermit(address,uint256,uint256,uint8,bytes32,bytes32)',
    'PERMIT_FLOW',
    'selfPermit() is a signed-approval flow, not an ERC-4626 supply/redeem call'
  );
  add(
    'depositWithPermit(uint256,address,uint256,uint8,bytes32,bytes32)',
    'PERMIT_FLOW',
    'depositWithPermit() bundles an approval signature and is outside the reduction scope'
  );
  return map;
}

const BLOCKED_SELECTORS = blockedSelectorMap();

function reject(reasonCode: VaultDecodeReasonCode, reason: string): VaultDecodeResult {
  return { ok: false, reasonCode, reason };
}

function canonicalEncoding(
  abi: Abi,
  functionName: string,
  args: readonly unknown[] | undefined
): `0x${string}` {
  return encodeFunctionData({
    abi,
    functionName,
    args: (args ?? []) as never,
  });
}

/**
 * Decode one standard ERC-4626 call. Every rejection is explicit and carries
 * a stable `reasonCode`; this function never guesses a method from suffix
 * bytes, an aggregator payload, or a partial match.
 */
export function decodeErc4626VaultCall(transaction: VaultCallTransaction): VaultDecodeResult {
  if (!transaction || typeof transaction.to !== 'string' || !ADDRESS_RE.test(transaction.to)) {
    return reject('INVALID_TRANSACTION', 'transaction.to must be a 20-byte hex address');
  }
  const vault = transaction.to.toLowerCase() as `0x${string}`;
  const data = transaction.data;
  if (typeof data !== 'string' || !HEX_RE.test(data) || data.length < 10) {
    return reject(
      'MALFORMED_CALLDATA',
      'transaction.data must be 0x-prefixed, byte-aligned hex with at least a 4-byte selector'
    );
  }

  try {
    const raw = transaction.value ?? 0;
    const value = typeof raw === 'bigint' ? raw : BigInt(raw);
    if (value !== 0n) {
      return reject(
        'NATIVE_VALUE',
        'ERC-4626 vault reduction accepts zero-value calls only; a non-zero native value is refused'
      );
    }
  } catch {
    return reject('INVALID_TRANSACTION', 'transaction.value is not a valid integer');
  }

  const selector = data.slice(0, 10).toLowerCase();
  const blocked = BLOCKED_SELECTORS.get(selector);
  if (blocked) return reject(blocked.reasonCode, blocked.reason);
  const method = SELECTORS.get(selector);
  if (!method) {
    return reject(
      'UNKNOWN_SELECTOR',
      `selector ${selector} is not one of the four standard ERC-4626 entry points; refusing to guess`
    );
  }

  let decoded: { functionName: string; args: readonly unknown[] | undefined };
  try {
    decoded = decodeFunctionData({ abi: ERC4626_ABI, data: data as `0x${string}` }) as {
      functionName: string;
      args: readonly unknown[] | undefined;
    };
  } catch {
    return reject(
      'MALFORMED_CALLDATA',
      'calldata could not be decoded as a standard ERC-4626 call'
    );
  }
  if (decoded.functionName !== method) {
    return reject('MALFORMED_CALLDATA', 'decoded function name does not match the selector');
  }

  // Canonical re-encode check: rejects trailing bytes, dirty high bits on
  // address/uint words, non-standard padding, and any embedded batch payload.
  let canonical: `0x${string}`;
  try {
    canonical = canonicalEncoding(ERC4626_ABI, decoded.functionName, decoded.args);
  } catch {
    return reject(
      'NON_CANONICAL_ENCODING',
      'decoded arguments could not be re-encoded canonically'
    );
  }
  if (canonical.toLowerCase() !== data.toLowerCase()) {
    return reject(
      'NON_CANONICAL_ENCODING',
      'calldata is not canonical ABI encoding (extra bytes, non-standard uint/address padding, or embedded batch data)'
    );
  }

  const args = (decoded.args ?? []) as readonly unknown[];
  if (method === 'deposit' || method === 'mint') {
    if (args.length !== 2) {
      return reject('MALFORMED_CALLDATA', `${method}() must decode to exactly two arguments`);
    }
    const [amount, receiver] = args as [bigint, `0x${string}`];
    if (typeof amount !== 'bigint' || !ADDRESS_RE.test(receiver ?? '')) {
      return reject('MALFORMED_CALLDATA', `${method}() decoded invalid amount or receiver`);
    }
    return {
      ok: true,
      call: {
        vault,
        method,
        assets: method === 'deposit' ? amount.toString(10) : null,
        shares: method === 'mint' ? amount.toString(10) : null,
        receiver: receiver.toLowerCase() as `0x${string}`,
        owner: null,
        calldataHash: keccak256(data as `0x${string}`),
      },
    };
  }

  if (args.length !== 3) {
    return reject('MALFORMED_CALLDATA', `${method}() must decode to exactly three arguments`);
  }
  const [amount, receiver, owner] = args as [bigint, `0x${string}`, `0x${string}`];
  if (
    typeof amount !== 'bigint' ||
    !ADDRESS_RE.test(receiver ?? '') ||
    !ADDRESS_RE.test(owner ?? '')
  ) {
    return reject('MALFORMED_CALLDATA', `${method}() decoded invalid amount, receiver, or owner`);
  }
  return {
    ok: true,
    call: {
      vault,
      method,
      assets: method === 'withdraw' ? amount.toString(10) : null,
      shares: method === 'redeem' ? amount.toString(10) : null,
      receiver: receiver.toLowerCase() as `0x${string}`,
      owner: owner.toLowerCase() as `0x${string}`,
      calldataHash: keccak256(data as `0x${string}`),
    },
  };
}
