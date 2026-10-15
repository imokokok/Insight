/**
 * Solana settlement facts for SPL and native SOL wallet balance changes.
 *
 * This collector measures the wallet's net token balance delta across the
 * entire transaction. It does not claim venue-specific attribution and it
 * records native SOL as a wallet lamport delta, excluding the transaction fee
 * only when the taker is the fee payer. Rent, tips, and unrelated transfers are
 * still included, so a SOL leg never produces an attributed execution price.
 */

import { parseCaip19 } from '@/lib/attestations/caip19';

export const SOLANA_MAINNET_CAIP2 = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
const SOLANA_MAINNET_GENESIS_HASH = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
const BASE58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export type SolanaExecutionCollectionFailure = {
  ok: false;
  code:
    | 'INVALID_SIGNATURE'
    | 'INVALID_TAKER'
    | 'INVALID_ASSET'
    | 'UNSUPPORTED_ASSET'
    | 'RPC_UNAVAILABLE'
    | 'RPC_INVALID_RESPONSE'
    | 'NOT_FOUND';
  message: string;
};

export type SolanaExecutionFacts = {
  schema: 'insight.solana-execution-facts.v1';
  network: typeof SOLANA_MAINNET_CAIP2;
  signature: string;
  status: 'CONFIRMED' | 'REVERTED';
  slot: number;
  executedAt: number | null;
  observedAt: number;
  taker: string;
  sourceAssetId: string;
  destinationAssetId: string;
  sourceAmount: string | null;
  sourceAmountRaw: string | null;
  sourceDecimals: number | null;
  destinationAmount: string | null;
  destinationAmountRaw: string | null;
  destinationDecimals: number | null;
  sourceTokenProgramId: string | null;
  destinationTokenProgramId: string | null;
  nativeLamportDelta: {
    preLamports: string;
    postLamports: string;
    netLamports: string;
    netExcludingNetworkFeeLamports: string;
  } | null;
  /** Destination units per source unit, rounded down to 12 decimal places. */
  executedPrice: string | null;
  feeLamports: string;
  fillScope: 'NET_WALLET_OWNED_SPL_BALANCE_DELTA' | 'NET_WALLET_LAMPORT_AND_SPL_BALANCE_DELTA';
  unavailableReason:
    | 'TRANSACTION_REVERTED'
    | 'TOKEN_BALANCE_METADATA_UNAVAILABLE'
    | 'TOKEN_OWNER_UNAVAILABLE'
    | 'SOURCE_DELTA_UNAVAILABLE'
    | 'DESTINATION_DELTA_UNAVAILABLE'
    | 'NATIVE_SOL_FLOW_NOT_ATTRIBUTED'
    | null;
};

export type SolanaExecutionCollectionResult =
  | { ok: true; facts: SolanaExecutionFacts }
  | SolanaExecutionCollectionFailure;

type AssetSpec = { kind: 'native' } | { kind: 'spl'; mint: string };
type TokenBalance = { amount: bigint; decimals: number; programId: string | null };
const TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const TOKEN_2022_PROGRAM_ID = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';
const SUPPORTED_TOKEN_PROGRAM_IDS = new Set([TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID]);
type JsonRpcEnvelope = { jsonrpc: '2.0'; id: string; result?: unknown; error?: unknown };

export async function collectSolanaExecutionFacts(input: {
  signature: string;
  sourceAssetId: string;
  destinationAssetId: string;
  taker: string;
  endpoints: string[];
  signal?: AbortSignal;
  fetcher?: typeof fetch;
  now?: () => number;
}): Promise<SolanaExecutionCollectionResult> {
  if (!isBase58Bytes(input.signature, 64))
    return failure(
      'INVALID_SIGNATURE',
      'signature must be a 64-byte base58 Solana transaction signature'
    );
  if (!isSolanaPublicKey(input.taker))
    return failure('INVALID_TAKER', 'taker must be a 32-byte base58 Solana public key');
  const source = assetSpec(input.sourceAssetId);
  const destination = assetSpec(input.destinationAssetId);
  if (!source || !destination)
    return failure(
      'UNSUPPORTED_ASSET',
      'Solana execution collection supports native SOL and SPL token assets'
    );
  if (
    input.sourceAssetId === input.destinationAssetId ||
    (source.kind === 'spl' && destination.kind === 'spl' && source.mint === destination.mint)
  )
    return failure('INVALID_ASSET', 'source and destination assets must differ');
  if (!input.endpoints.length)
    return failure('RPC_UNAVAILABLE', 'No Solana mainnet RPC endpoint is configured');

  const fetcher = input.fetcher ?? fetch;
  let lastFailure: SolanaExecutionCollectionFailure = failure(
    'RPC_UNAVAILABLE',
    'All Solana mainnet RPC endpoints failed'
  );
  for (const endpoint of input.endpoints) {
    try {
      const genesis = await rpc<string>(endpoint, 'getGenesisHash', [], fetcher, input.signal);
      if (genesis !== SOLANA_MAINNET_GENESIS_HASH) {
        lastFailure = failure(
          'RPC_INVALID_RESPONSE',
          'RPC endpoint is not connected to Solana mainnet-beta'
        );
        continue;
      }
      const transaction = await rpc<unknown>(
        endpoint,
        'getTransaction',
        [
          input.signature,
          {
            encoding: 'jsonParsed',
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 1,
          },
        ],
        fetcher,
        input.signal
      );
      if (transaction === null)
        return failure('NOT_FOUND', 'Transaction was not found on the configured Solana RPC');
      return collectFromTransaction({
        transaction,
        signature: input.signature,
        taker: input.taker,
        sourceAssetId: input.sourceAssetId,
        sourceMint: source.kind === 'spl' ? source.mint : null,
        destinationAssetId: input.destinationAssetId,
        destinationMint: destination.kind === 'spl' ? destination.mint : null,
        sourceIsNative: source.kind === 'native',
        destinationIsNative: destination.kind === 'native',
        now: input.now ?? Date.now,
      });
    } catch (error) {
      if (input.signal?.aborted) throw error;
      lastFailure =
        error instanceof InvalidRpcDataError
          ? failure('RPC_INVALID_RESPONSE', 'Solana RPC returned invalid transaction data')
          : failure('RPC_UNAVAILABLE', 'Solana RPC request failed');
    }
  }
  return lastFailure;
}

function collectFromTransaction(input: {
  transaction: unknown;
  signature: string;
  taker: string;
  sourceAssetId: string;
  sourceMint: string | null;
  sourceIsNative: boolean;
  destinationAssetId: string;
  destinationMint: string | null;
  destinationIsNative: boolean;
  now: () => number;
}): SolanaExecutionCollectionResult {
  const root = asRecord(input.transaction, 'transaction');
  const transaction = asRecord(root.transaction, 'transaction.transaction');
  const signatures = transaction.signatures;
  if (
    !Array.isArray(signatures) ||
    typeof signatures[0] !== 'string' ||
    signatures[0] !== input.signature
  ) {
    return failure('RPC_INVALID_RESPONSE', 'RPC transaction signature does not match the request');
  }
  const meta = asRecord(root.meta, 'transaction.meta');
  const slot = safeInteger(root.slot, 'transaction.slot');
  const executedAt =
    root.blockTime == null ? null : safeInteger(root.blockTime, 'transaction.blockTime');
  const feeLamports = decimalString(meta.fee, 'transaction.meta.fee');
  const reverted = meta.err != null;
  const message = asRecord(transaction.message, 'transaction.message');
  if (!Array.isArray(message.accountKeys))
    throw new InvalidRpcDataError('transaction.message.accountKeys is invalid');
  const accountKeys = message.accountKeys.map((key, index) => {
    const publicKey =
      typeof key === 'string'
        ? key
        : asRecord(key, `transaction.message.accountKeys[${index}]`).pubkey;
    if (!isSolanaPublicKey(publicKey))
      throw new InvalidRpcDataError(`transaction.message.accountKeys[${index}] is invalid`);
    return publicKey;
  });
  const takerIndex = accountKeys.indexOf(input.taker);
  const nativeDelta =
    (input.sourceIsNative || input.destinationIsNative) && takerIndex >= 0
      ? readNativeLamportDelta(meta, takerIndex, accountKeys[0] === input.taker, feeLamports)
      : null;
  const base = {
    schema: 'insight.solana-execution-facts.v1' as const,
    network: SOLANA_MAINNET_CAIP2 as typeof SOLANA_MAINNET_CAIP2,
    signature: input.signature,
    status: reverted ? ('REVERTED' as const) : ('CONFIRMED' as const),
    slot,
    executedAt,
    observedAt: Math.floor(input.now() / 1000),
    taker: input.taker,
    sourceAssetId: input.sourceAssetId,
    destinationAssetId: input.destinationAssetId,
    feeLamports,
    fillScope: (input.sourceIsNative || input.destinationIsNative
      ? 'NET_WALLET_LAMPORT_AND_SPL_BALANCE_DELTA'
      : 'NET_WALLET_OWNED_SPL_BALANCE_DELTA') as SolanaExecutionFacts['fillScope'],
  };
  if (reverted)
    return {
      ok: true,
      facts: {
        ...base,
        sourceAmount: null,
        sourceAmountRaw: null,
        sourceDecimals: null,
        destinationAmount: null,
        destinationAmountRaw: null,
        destinationDecimals: null,
        sourceTokenProgramId: null,
        destinationTokenProgramId: null,
        nativeLamportDelta: nativeDelta,
        executedPrice: null,
        unavailableReason: 'TRANSACTION_REVERTED',
      },
    };

  let sourceAmount: string | null = null;
  let sourceAmountRaw: string | null = null;
  let sourceDecimals: number | null = null;
  let sourceTokenProgramId: string | null = null;
  let destinationAmount: string | null = null;
  let destinationAmountRaw: string | null = null;
  let destinationDecimals: number | null = null;
  let destinationTokenProgramId: string | null = null;
  let unavailableReason: SolanaExecutionFacts['unavailableReason'] = null;

  if (input.sourceIsNative || input.destinationIsNative) {
    if (!nativeDelta) unavailableReason = 'NATIVE_SOL_FLOW_NOT_ATTRIBUTED';
    else if (input.sourceIsNative) {
      const outgoing = -BigInt(nativeDelta.netExcludingNetworkFeeLamports);
      if (outgoing > 0n) {
        sourceAmountRaw = outgoing.toString();
        sourceDecimals = 9;
        sourceAmount = formatUnits(outgoing, 9);
      } else unavailableReason = 'NATIVE_SOL_FLOW_NOT_ATTRIBUTED';
    } else {
      const incoming = BigInt(nativeDelta.netExcludingNetworkFeeLamports);
      if (incoming > 0n) {
        destinationAmountRaw = incoming.toString();
        destinationDecimals = 9;
        destinationAmount = formatUnits(incoming, 9);
      } else unavailableReason = 'NATIVE_SOL_FLOW_NOT_ATTRIBUTED';
    }
  }

  const requestedMints = [input.sourceMint, input.destinationMint].filter(
    (mint): mint is string => mint !== null
  );
  let sourceDelta: ReturnType<typeof balanceDelta> = null;
  let destinationDelta: ReturnType<typeof balanceDelta> = null;
  if (requestedMints.length > 0) {
    const pre = readTokenBalances(meta.preTokenBalances, input.taker, requestedMints);
    const post = readTokenBalances(meta.postTokenBalances, input.taker, requestedMints);
    if (!pre.ok || !post.ok) {
      unavailableReason =
        !pre.ownerAvailable || !post.ownerAvailable
          ? 'TOKEN_OWNER_UNAVAILABLE'
          : 'TOKEN_BALANCE_METADATA_UNAVAILABLE';
    } else {
      if (input.sourceMint)
        sourceDelta = balanceDelta(
          pre.balances.get(input.sourceMint),
          post.balances.get(input.sourceMint)
        );
      if (input.destinationMint)
        destinationDelta = balanceDelta(
          pre.balances.get(input.destinationMint),
          post.balances.get(input.destinationMint)
        );
      sourceTokenProgramId = sourceDelta?.programId ?? null;
      destinationTokenProgramId = destinationDelta?.programId ?? null;
    }
  }

  if (input.sourceMint) {
    if (!sourceDelta) unavailableReason ??= 'SOURCE_DELTA_UNAVAILABLE';
    else {
      const amount = sourceDelta.pre - sourceDelta.post;
      if (amount > 0n) {
        sourceAmountRaw = amount.toString();
        sourceDecimals = sourceDelta.decimals;
        sourceAmount = formatUnits(amount, sourceDelta.decimals);
      } else unavailableReason ??= 'SOURCE_DELTA_UNAVAILABLE';
    }
  }
  if (input.destinationMint) {
    if (!destinationDelta) unavailableReason ??= 'DESTINATION_DELTA_UNAVAILABLE';
    else {
      const amount = destinationDelta.post - destinationDelta.pre;
      if (amount > 0n) {
        destinationAmountRaw = amount.toString();
        destinationDecimals = destinationDelta.decimals;
        destinationAmount = formatUnits(amount, destinationDelta.decimals);
      } else unavailableReason ??= 'DESTINATION_DELTA_UNAVAILABLE';
    }
  }

  // A SOL movement includes wallet-level rent, tips, and other instructions.
  // It is exposed as a net lamport measurement but never advertised as a fill
  // price, even when the requested token side was measurable.
  if (input.sourceIsNative || input.destinationIsNative)
    unavailableReason = 'NATIVE_SOL_FLOW_NOT_ATTRIBUTED';
  if (!sourceAmount || !destinationAmount)
    return {
      ok: true,
      facts: {
        ...base,
        sourceAmount,
        sourceAmountRaw,
        sourceDecimals,
        destinationAmount,
        destinationAmountRaw,
        destinationDecimals,
        sourceTokenProgramId,
        destinationTokenProgramId,
        nativeLamportDelta: nativeDelta,
        executedPrice: null,
        unavailableReason: unavailableReason ?? 'TOKEN_BALANCE_METADATA_UNAVAILABLE',
      },
    };

  // Source/destination SPL amounts can be measured together, but native SOL
  // is deliberately excluded from this ratio due to un-attributed lamports.
  if (input.sourceIsNative || input.destinationIsNative)
    return {
      ok: true,
      facts: {
        ...base,
        sourceAmount,
        sourceAmountRaw,
        sourceDecimals,
        destinationAmount,
        destinationAmountRaw,
        destinationDecimals,
        sourceTokenProgramId,
        destinationTokenProgramId,
        nativeLamportDelta: nativeDelta,
        executedPrice: null,
        unavailableReason: 'NATIVE_SOL_FLOW_NOT_ATTRIBUTED',
      },
    };

  const sourceRaw = BigInt(sourceAmountRaw!);
  const destinationRaw = BigInt(destinationAmountRaw!);
  if (sourceRaw <= 0n)
    return {
      ok: true,
      facts: {
        ...base,
        sourceAmount: null,
        sourceAmountRaw: null,
        sourceDecimals,
        destinationAmount,
        destinationAmountRaw,
        destinationDecimals,
        sourceTokenProgramId,
        destinationTokenProgramId,
        nativeLamportDelta: nativeDelta,
        executedPrice: null,
        unavailableReason: 'SOURCE_DELTA_UNAVAILABLE',
      },
    };
  if (destinationRaw <= 0n)
    return {
      ok: true,
      facts: {
        ...base,
        sourceAmount,
        sourceAmountRaw,
        sourceDecimals,
        destinationAmount: null,
        destinationAmountRaw: null,
        destinationDecimals,
        sourceTokenProgramId,
        destinationTokenProgramId,
        nativeLamportDelta: nativeDelta,
        executedPrice: null,
        unavailableReason: 'DESTINATION_DELTA_UNAVAILABLE',
      },
    };
  return {
    ok: true,
    facts: {
      ...base,
      sourceAmount,
      sourceAmountRaw,
      sourceDecimals,
      destinationAmount,
      destinationAmountRaw,
      destinationDecimals,
      sourceTokenProgramId,
      destinationTokenProgramId,
      nativeLamportDelta: nativeDelta,
      executedPrice: formatRatio(destinationRaw, destinationDecimals!, sourceRaw, sourceDecimals!),
      unavailableReason: null,
    },
  };
}

function readTokenBalances(value: unknown, taker: string, mints: string[]) {
  if (!Array.isArray(value))
    return { ok: false as const, ownerAvailable: false, balances: new Map<string, TokenBalance>() };
  const balances = new Map<string, TokenBalance>();
  for (const [index, item] of value.entries()) {
    const row = asRecord(item, `tokenBalances[${index}]`);
    if (typeof row.mint !== 'string' || !mints.includes(row.mint)) continue;
    if (typeof row.owner !== 'string')
      return { ok: false as const, ownerAvailable: false, balances };
    if (row.owner !== taker) continue;
    if (typeof row.programId !== 'string' || !SUPPORTED_TOKEN_PROGRAM_IDS.has(row.programId))
      return { ok: false as const, ownerAvailable: true, balances };
    const uiTokenAmount = asRecord(row.uiTokenAmount, `tokenBalances[${index}].uiTokenAmount`);
    const amount = BigInt(decimalString(uiTokenAmount.amount, `tokenBalances[${index}].amount`));
    const decimals = safeInteger(uiTokenAmount.decimals, `tokenBalances[${index}].decimals`);
    if (decimals > 18) return { ok: false as const, ownerAvailable: true, balances };
    const previous = balances.get(row.mint) ?? { amount: 0n, decimals, programId: row.programId };
    if (previous.decimals !== decimals || previous.programId !== row.programId)
      return { ok: false as const, ownerAvailable: true, balances };
    balances.set(row.mint, {
      amount: previous.amount + amount,
      decimals,
      programId: row.programId,
    });
  }
  return { ok: true as const, ownerAvailable: true, balances };
}

function balanceDelta(pre: TokenBalance | undefined, post: TokenBalance | undefined) {
  if (!pre && !post) return null;
  if (pre && post && (pre.decimals !== post.decimals || pre.programId !== post.programId))
    return null;
  const decimals = pre?.decimals ?? post!.decimals;
  const programId = pre?.programId ?? post!.programId;
  return { pre: pre?.amount ?? 0n, post: post?.amount ?? 0n, decimals, programId };
}

function assetSpec(assetId: string): AssetSpec | null {
  const parsed = parseCaip19(assetId);
  if (!parsed || parsed.chainNamespace !== 'solana' || parsed.chainReference !== 0) return null;
  if (parsed.assetNamespace === 'slip44' && parsed.assetReference === '501')
    return { kind: 'native' };
  if (parsed.assetNamespace !== 'spl' || !isSolanaPublicKey(parsed.assetReference)) return null;
  return { kind: 'spl', mint: parsed.assetReference };
}

function readNativeLamportDelta(
  meta: Record<string, unknown>,
  accountIndex: number,
  feePayer: boolean,
  feeLamports: string
) {
  if (
    !Array.isArray(meta.preBalances) ||
    !Array.isArray(meta.postBalances) ||
    accountIndex >= meta.preBalances.length ||
    accountIndex >= meta.postBalances.length
  )
    return null;
  const preLamports = decimalString(meta.preBalances[accountIndex], 'transaction.meta.preBalances');
  const postLamports = decimalString(
    meta.postBalances[accountIndex],
    'transaction.meta.postBalances'
  );
  const net = BigInt(postLamports) - BigInt(preLamports);
  const excludingFee = net + (feePayer ? BigInt(feeLamports) : 0n);
  return {
    preLamports,
    postLamports,
    netLamports: net.toString(),
    netExcludingNetworkFeeLamports: excludingFee.toString(),
  };
}

async function rpc<T>(
  endpoint: string,
  method: string,
  params: unknown[],
  fetcher: typeof fetch,
  signal?: AbortSignal
): Promise<T> {
  const response = await fetcher(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 'insight-solana-execution', method, params }),
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(10_000)])
      : AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error('Solana RPC returned a non-success HTTP response');
  let value: unknown;
  try {
    value = await response.json();
  } catch {
    throw new InvalidRpcDataError('Solana RPC returned invalid JSON');
  }
  const envelope = asRecord(value, 'JSON-RPC response') as JsonRpcEnvelope;
  if (envelope.jsonrpc !== '2.0' || envelope.id !== 'insight-solana-execution')
    throw new InvalidRpcDataError('Solana RPC returned an invalid JSON-RPC envelope');
  if (envelope.error != null) throw new Error('Solana RPC rejected the observation request');
  if (!Object.hasOwn(envelope, 'result'))
    throw new InvalidRpcDataError('Solana RPC response is missing result');
  return envelope.result as T;
}

function isBase58Bytes(value: unknown, expectedBytes: number): value is string {
  if (
    typeof value !== 'string' ||
    !value.length ||
    ![...value].every((character) => BASE58.includes(character))
  )
    return false;
  return decodeBase58(value).length === expectedBytes;
}

function isSolanaPublicKey(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length >= 32 &&
    value.length <= 44 &&
    isBase58Bytes(value, 32)
  );
}

function decodeBase58(value: string): Uint8Array {
  let integer = 0n;
  for (const character of value) integer = integer * 58n + BigInt(BASE58.indexOf(character));
  const bytes: number[] = [];
  while (integer > 0n) {
    bytes.push(Number(integer & 0xffn));
    integer >>= 8n;
  }
  bytes.reverse();
  let leadingZeroes = 0;
  while (value[leadingZeroes] === '1') leadingZeroes += 1;
  return Uint8Array.from([...new Array(leadingZeroes).fill(0), ...bytes]);
}

function formatUnits(value: bigint, decimals: number): string {
  const digits = value.toString().padStart(decimals + 1, '0');
  if (decimals === 0) return digits;
  const integer = digits.slice(0, -decimals);
  const fraction = digits.slice(-decimals).replace(/0+$/, '');
  return fraction ? `${integer}.${fraction}` : integer;
}

function formatRatio(
  destinationRaw: bigint,
  destinationDecimals: number,
  sourceRaw: bigint,
  sourceDecimals: number
): string {
  const scale = 1_000_000_000_000n;
  const numerator = destinationRaw * 10n ** BigInt(sourceDecimals) * scale;
  const denominator = sourceRaw * 10n ** BigInt(destinationDecimals);
  const scaled = numerator / denominator;
  const integer = scaled / scale;
  const fraction = (scaled % scale).toString().padStart(12, '0').replace(/0+$/, '');
  return fraction ? `${integer}.${fraction}` : integer.toString();
}

function asRecord(value: unknown, field: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    throw new InvalidRpcDataError(`${field} is not an object`);
  return value as Record<string, unknown>;
}

function safeInteger(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
    throw new InvalidRpcDataError(`${field} is not a non-negative integer`);
  return value;
}

function decimalString(value: unknown, field: string): string {
  if (
    (typeof value !== 'number' && typeof value !== 'string') ||
    (typeof value === 'number' && !Number.isSafeInteger(value)) ||
    !/^(0|[1-9][0-9]*)$/.test(String(value))
  )
    throw new InvalidRpcDataError(`${field} is not an unsigned integer`);
  return String(value);
}

function failure(
  code: SolanaExecutionCollectionFailure['code'],
  message: string
): SolanaExecutionCollectionFailure {
  return { ok: false, code, message };
}

class InvalidRpcDataError extends Error {}
