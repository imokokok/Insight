import { createHash } from 'node:crypto';

import { address, getProgramDerivedAddress } from '@solana/kit';

import { getRpcEndpoints } from '@/lib/execution/rpcEndpoints';
import { OracleCache } from '@/lib/oracles/base';
import {
  PYTH_SOLANA_PRICE_UPDATE_OWNER_PROGRAM_ID,
  PYTH_SOLANA_PUSH_ORACLE_PROGRAM_ID,
  type PythSolanaFeed,
} from '@/lib/oracles/constants/pythSolana';
import { scalePythValue } from '@/lib/oracles/services/pythMonadOnChainService';
import { recordRpcUsage } from '@/lib/oracles/utils/rpcClientWithFallback';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('PythSolanaOnChainService');

const SOLANA_MAINNET_GENESIS_HASH = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';
const PYTH_PRICE_UPDATE_DISCRIMINATOR = createHash('sha256')
  .update('account:PriceUpdateV2')
  .digest()
  .subarray(0, 8);
const MAX_FUTURE_SKEW_SECONDS = 5 * 60;
const MAX_CONFIDENCE_RATIO = 0.2;
const PRICE_UPDATE_ACCOUNT_MIN_BYTES = 133;
const unavailableFetch = (() =>
  Promise.reject(
    new Error('Global fetch is unavailable for the Pyth Solana RPC reader')
  )) as typeof fetch;

export interface PythSolanaPriceData {
  symbol: string;
  feedId: `0x${string}`;
  price: number;
  conf: number;
  exponent: number;
  publishTime: number;
  timestamp: number;
  confidenceRatio: number;
  maxAgeSeconds: number;
  priceDeviationPercent: number;
  /** Pyth Core shard-0 account derived from the immutable feed ID. */
  accountAddress: string;
  /** Owner returned by Solana RPC and pinned to Pyth's Receiver program. */
  accountOwner: typeof PYTH_SOLANA_PRICE_UPDATE_OWNER_PROGRAM_ID;
  /** Slot embedded by Pyth when it posted the verified update. */
  postedSlot: string;
  /** RPC context slot for this observation. */
  observationSlot: number;
  /** SHA-256 of the complete raw account bytes, for audit/provenance. */
  accountDataHash: `0x${string}`;
}

type JsonRpcAccount = Record<string, unknown>;

type PythSolanaServiceOptions = {
  endpoints?: () => string[];
  fetcher?: typeof fetch;
  now?: () => number;
};

class InvalidPythSolanaDataError extends Error {}

function requireSafeInteger(value: bigint, label: string): number {
  if (value < 0n || value > BigInt(Number.MAX_SAFE_INTEGER))
    throw new InvalidPythSolanaDataError(
      `Invalid Pyth Solana ${label}: outside safe integer range`
    );
  return Number(value);
}

function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    throw new InvalidPythSolanaDataError(`${label} is not an object`);
  return value as Record<string, unknown>;
}

function requireSafeSlot(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
    throw new InvalidPythSolanaDataError(`${label} is not a non-negative safe integer`);
  return value;
}

function parseBase64Account(value: unknown): Buffer {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    value[1] !== 'base64' ||
    typeof value[0] !== 'string'
  )
    throw new InvalidPythSolanaDataError('Pyth account data is not canonical base64');
  const encoded = value[0];
  if (
    encoded.length === 0 ||
    encoded.length > 16_384 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)
  )
    throw new InvalidPythSolanaDataError('Pyth account data is invalid base64');
  const decoded = Buffer.from(encoded, 'base64');
  if (decoded.toString('base64') !== encoded)
    throw new InvalidPythSolanaDataError('Pyth account data is non-canonical base64');
  return decoded;
}

function isExactBytes(actual: Buffer, expected: Buffer): boolean {
  return actual.length === expected.length && actual.equals(expected);
}

/** Derive the Pyth-sponsored shard-0 account exactly as the official SDK does. */
export async function derivePythSolanaPriceFeedAccount(feedId: string): Promise<string> {
  if (!/^[0-9a-f]{64}$/i.test(feedId)) throw new Error('Pyth feed ID must be 32 bytes of hex');
  const [accountAddress] = await getProgramDerivedAddress({
    programAddress: address(PYTH_SOLANA_PUSH_ORACLE_PROGRAM_ID),
    // shard 0 is a little-endian u16. Pyth sponsors this shard specifically.
    seeds: [Uint8Array.from([0, 0]), Uint8Array.from(Buffer.from(feedId, 'hex'))],
  });
  return accountAddress;
}

function decodePriceUpdate(input: {
  account: JsonRpcAccount;
  expectedFeed: PythSolanaFeed;
  expectedAddress: string;
  observationSlot: number;
  nowSeconds: number;
}): PythSolanaPriceData {
  if (input.account.owner !== PYTH_SOLANA_PRICE_UPDATE_OWNER_PROGRAM_ID)
    throw new InvalidPythSolanaDataError('Pyth price-feed account has an unexpected owner');
  const bytes = parseBase64Account(input.account.data);
  if (bytes.length < PRICE_UPDATE_ACCOUNT_MIN_BYTES)
    throw new InvalidPythSolanaDataError('Pyth price-feed account is truncated');
  if (!isExactBytes(bytes.subarray(0, 8), PYTH_PRICE_UPDATE_DISCRIMINATOR))
    throw new InvalidPythSolanaDataError('Pyth price-feed account discriminator is invalid');

  // The immutable write authority occupies bytes 8..39. Sponsored feed
  // accounts must carry a fully verified update (Anchor enum tag 1); partial
  // guardian verification is intentionally rejected for Insight evidence.
  const verificationLevel = bytes[40];
  if (verificationLevel !== 1)
    throw new InvalidPythSolanaDataError('Pyth price-feed account is not fully verified');

  const feedId = bytes.subarray(41, 73).toString('hex');
  if (feedId !== input.expectedFeed.id)
    throw new InvalidPythSolanaDataError('Pyth price-feed account feed ID does not match its PDA');

  const rawPrice = bytes.readBigInt64LE(73);
  const rawConf = bytes.readBigUInt64LE(81);
  const exponent = bytes.readInt32LE(89);
  const rawPublishTime = bytes.readBigInt64LE(93);
  const postedSlot = bytes.readBigUInt64LE(125);
  if (rawPrice <= 0n) throw new InvalidPythSolanaDataError('Pyth price is non-positive');
  const publishTime = requireSafeInteger(rawPublishTime, 'publish time');
  if (publishTime <= 0) throw new InvalidPythSolanaDataError('Pyth publish time is missing');

  const price = scalePythValue(rawPrice, exponent);
  const conf = scalePythValue(rawConf, exponent);
  if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(conf) || conf < 0)
    throw new InvalidPythSolanaDataError('Pyth scaled price is invalid');
  const confidenceRatio = conf / price;
  if (!Number.isFinite(confidenceRatio) || confidenceRatio > MAX_CONFIDENCE_RATIO)
    throw new InvalidPythSolanaDataError('Pyth confidence interval is too wide');

  const maxAgeSeconds = input.expectedFeed.timeDifferenceSeconds * 2;
  const ageSeconds = input.nowSeconds - publishTime;
  if (ageSeconds < -MAX_FUTURE_SKEW_SECONDS || ageSeconds > maxAgeSeconds)
    throw new InvalidPythSolanaDataError(
      `Pyth price is stale or future-dated (age ${ageSeconds}s, maximum ${maxAgeSeconds}s)`
    );

  return {
    symbol: input.expectedFeed.alias,
    feedId: `0x${input.expectedFeed.id}`,
    price,
    conf,
    exponent,
    publishTime,
    timestamp: publishTime * 1000,
    confidenceRatio,
    maxAgeSeconds,
    priceDeviationPercent: input.expectedFeed.priceDeviationPercent,
    accountAddress: input.expectedAddress,
    accountOwner: PYTH_SOLANA_PRICE_UPDATE_OWNER_PROGRAM_ID,
    postedSlot: postedSlot.toString(),
    observationSlot: input.observationSlot,
    accountDataHash: `0x${createHash('sha256').update(bytes).digest('hex')}`,
  };
}

async function rpc<T>(
  endpoint: string,
  method: string,
  params: unknown[],
  fetcher: typeof fetch,
  signal?: AbortSignal
): Promise<T> {
  const id = `insight-pyth-solana-${method}`;
  const startedAt = performance.now();
  try {
    const response = await fetcher(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(10_000)])
        : AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error('Solana RPC returned a non-success HTTP response');
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new InvalidPythSolanaDataError('Solana RPC returned invalid JSON');
    }
    const envelope = asRecord(body, 'Solana JSON-RPC response');
    if (envelope.jsonrpc !== '2.0' || envelope.id !== id)
      throw new InvalidPythSolanaDataError('Solana RPC envelope is invalid');
    if (envelope.error != null) throw new Error('Solana RPC rejected the Pyth query');
    if (!Object.hasOwn(envelope, 'result'))
      throw new InvalidPythSolanaDataError('Solana RPC result is missing');
    recordRpcUsage({
      context: 'pyth-solana',
      chain: 'solana',
      method,
      success: true,
      durationMs: performance.now() - startedAt,
    });
    return envelope.result as T;
  } catch (error) {
    recordRpcUsage({
      context: 'pyth-solana',
      chain: 'solana',
      method,
      success: false,
      timedOut: !signal?.aborted && error instanceof DOMException && error.name === 'TimeoutError',
      durationMs: performance.now() - startedAt,
    });
    throw error;
  }
}

/**
 * Reads the Pyth-sponsored Solana shard-0 accounts directly from mainnet RPC.
 * Hermes is deliberately absent: this verifies the chain-owned account that
 * Insight is actually claiming as its data source.
 */
export class PythSolanaOnChainService {
  private readonly cache = new OracleCache();
  private readonly endpoints: () => string[];
  private readonly fetcher: typeof fetch;
  private readonly now: () => number;

  constructor(options: PythSolanaServiceOptions = {}) {
    this.endpoints = options.endpoints ?? (() => getRpcEndpoints(0) ?? []);
    // Next.js / production Node expose fetch. Keeping an explicit fallback
    // defers the failure until a real RPC read, which also lets unit tests
    // provide their own fetcher in environments that omit it (such as Jest).
    this.fetcher = options.fetcher ?? globalThis.fetch ?? unavailableFetch;
    this.now = options.now ?? Date.now;
  }

  async getPrice(feed: PythSolanaFeed, signal?: AbortSignal): Promise<PythSolanaPriceData> {
    const cacheKey = `pyth-solana:${feed.id}`;
    const cached = this.cache.get<PythSolanaPriceData>(cacheKey);
    if (cached && this.isUsable(cached, feed)) return cached;
    if (cached) this.cache.delete(cacheKey);

    const [price] = await this.getPrices([feed], signal);
    if (!price) throw new Error(`Pyth Solana feed ${feed.alias} is unavailable or unusable`);
    this.cache.set(cacheKey, price, Math.min(30_000, price.maxAgeSeconds * 1000));
    return price;
  }

  /**
   * Batch-read a reviewed subset (up to Solana RPC's 100-account limit). A bad
   * account is rejected independently so one stale sponsored feed cannot hide
   * fresh evidence for the other feeds.
   */
  async getPrices(
    feeds: readonly PythSolanaFeed[],
    signal?: AbortSignal
  ): Promise<PythSolanaPriceData[]> {
    if (feeds.length === 0) return [];
    if (feeds.length > 100) throw new Error('Pyth Solana batch exceeds 100 accounts');
    const ids = new Set(feeds.map((feed) => feed.id));
    if (ids.size !== feeds.length) throw new Error('Pyth Solana batch contains duplicate feed IDs');
    const endpoints = this.endpoints();
    if (endpoints.length === 0) throw new Error('No Solana mainnet RPC endpoint is configured');
    const accountAddresses = await Promise.all(
      feeds.map((feed) => derivePythSolanaPriceFeedAccount(feed.id))
    );
    let lastError: unknown = new Error('All Solana mainnet RPC endpoints failed');

    for (const endpoint of endpoints) {
      try {
        const genesis = await rpc<string>(endpoint, 'getGenesisHash', [], this.fetcher, signal);
        if (genesis !== SOLANA_MAINNET_GENESIS_HASH) {
          lastError = new Error('Solana RPC endpoint is not connected to mainnet-beta');
          continue;
        }
        const rawResult = asRecord(
          await rpc<unknown>(
            endpoint,
            'getMultipleAccounts',
            [accountAddresses, { encoding: 'base64', commitment: 'confirmed' }],
            this.fetcher,
            signal
          ),
          'getMultipleAccounts result'
        );
        const context = asRecord(rawResult.context, 'getMultipleAccounts context');
        const observationSlot = requireSafeSlot(context.slot, 'getMultipleAccounts context slot');
        if (!Array.isArray(rawResult.value) || rawResult.value.length !== feeds.length)
          throw new InvalidPythSolanaDataError('Solana RPC returned an invalid Pyth account batch');

        const nowSeconds = Math.floor(this.now() / 1000);
        const results: PythSolanaPriceData[] = [];
        for (let index = 0; index < feeds.length; index += 1) {
          const rawAccount = rawResult.value[index];
          if (rawAccount === null) {
            logger.warn('Pyth sponsored price-feed account is absent', {
              alias: feeds[index].alias,
              accountAddress: accountAddresses[index],
            });
            continue;
          }
          try {
            results.push(
              decodePriceUpdate({
                account: asRecord(rawAccount, 'Pyth price-feed account'),
                expectedFeed: feeds[index],
                expectedAddress: accountAddresses[index],
                observationSlot,
                nowSeconds,
              })
            );
          } catch (error) {
            logger.warn('Rejected Pyth Solana price-feed account', {
              alias: feeds[index].alias,
              accountAddress: accountAddresses[index],
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
        return results;
      } catch (error) {
        if (signal?.aborted) throw error;
        lastError = error;
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error('All Solana mainnet RPC endpoints failed');
  }

  private isUsable(price: PythSolanaPriceData, feed: PythSolanaFeed): boolean {
    const age = Math.floor(this.now() / 1000) - price.publishTime;
    return (
      price.feedId === `0x${feed.id}` &&
      price.accountOwner === PYTH_SOLANA_PRICE_UPDATE_OWNER_PROGRAM_ID &&
      Number.isFinite(price.price) &&
      price.price > 0 &&
      Number.isFinite(price.confidenceRatio) &&
      price.confidenceRatio <= MAX_CONFIDENCE_RATIO &&
      age >= -MAX_FUTURE_SKEW_SECONDS &&
      age <= price.maxAgeSeconds
    );
  }
}

export const pythSolanaOnChainService = new PythSolanaOnChainService();
