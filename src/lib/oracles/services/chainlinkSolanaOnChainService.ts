import { createHash } from 'node:crypto';

import { address } from '@solana/kit';

import { getRpcEndpoints } from '@/lib/execution/rpcEndpoints';
import { OracleCache } from '@/lib/oracles/base';
import {
  CHAINLINK_SOLANA_CHAIN_ID,
  CHAINLINK_SOLANA_HEADER_BYTES,
  CHAINLINK_SOLANA_MAINNET_GENESIS_HASH,
  CHAINLINK_SOLANA_RDD_SOURCE,
  CHAINLINK_SOLANA_RDD_URL,
  CHAINLINK_SOLANA_STORE_PROGRAM_ID,
  CHAINLINK_SOLANA_TRANSMISSION_BYTES,
  CHAINLINK_SOLANA_TRANSMISSIONS_DISCRIMINATOR,
} from '@/lib/oracles/constants/chainlinkSolana';
import { recordRpcUsage } from '@/lib/oracles/utils/rpcClientWithFallback';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('ChainlinkSolanaOnChainService');

const DIRECTORY_CACHE_TTL_MS = 15 * 60 * 1000;
const MAX_DIRECTORY_BYTES = 4 * 1024 * 1024;
const MAX_FUTURE_SKEW_SECONDS = 5 * 60;
const MIN_HEARTBEAT_SECONDS = 15;
const MAX_HEARTBEAT_SECONDS = 7 * 24 * 60 * 60;
const TRANSMISSIONS_HEADER_OFFSET = 8;
const DESCRIPTION_OFFSET = TRANSMISSIONS_HEADER_OFFSET + 98;
const DECIMALS_OFFSET = TRANSMISSIONS_HEADER_OFFSET + 130;
const LATEST_ROUND_ID_OFFSET = TRANSMISSIONS_HEADER_OFFSET + 135;
const LIVE_LENGTH_OFFSET = TRANSMISSIONS_HEADER_OFFSET + 140;
const TRANSMISSION_OFFSET = TRANSMISSIONS_HEADER_OFFSET + CHAINLINK_SOLANA_HEADER_BYTES;
const TRANSMISSION_SLOT_OFFSET = TRANSMISSION_OFFSET;
const TRANSMISSION_TIMESTAMP_OFFSET = TRANSMISSION_OFFSET + 8;
const TRANSMISSION_ANSWER_OFFSET = TRANSMISSION_OFFSET + 16;
const MIN_ACCOUNT_BYTES = TRANSMISSION_OFFSET + CHAINLINK_SOLANA_TRANSMISSION_BYTES;
const unavailableFetch = (() =>
  Promise.reject(
    new Error('Global fetch is unavailable for the Chainlink Solana reader')
  )) as typeof fetch;

export interface ChainlinkSolanaFeed {
  /** Canonical pair identity stored in Insight, for example `SOL/USD`. */
  alias: string;
  /** Official OCR2 Transmissions account listed by Chainlink's RDD. */
  accountAddress: string;
  /** Directory heartbeat in seconds, used as the feed-specific freshness gate. */
  heartbeatSeconds: number;
  /** Chainlink's product class, retained only for Insight presentation. */
  category: string;
}

export interface ChainlinkSolanaPriceData {
  symbol: string;
  price: number;
  timestamp: number;
  decimals: number;
  roundId: string;
  answer: string;
  accountAddress: string;
  accountOwner: typeof CHAINLINK_SOLANA_STORE_PROGRAM_ID;
  description: string;
  heartbeatSeconds: number;
  maxAgeSeconds: number;
  observationSlot: number;
  transmissionSlot: string;
  accountDataHash: `0x${string}`;
}

type JsonRecord = Record<string, unknown>;

type ChainlinkSolanaServiceOptions = {
  endpoints?: () => string[];
  fetcher?: typeof fetch;
  now?: () => number;
};

class InvalidChainlinkSolanaDataError extends Error {}

function asRecord(value: unknown, label: string): JsonRecord {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new InvalidChainlinkSolanaDataError(`${label} is not an object`);
  }
  return value as JsonRecord;
}

function getString(record: JsonRecord, key: string): string | null {
  const value = record[key];
  return typeof value === 'string' ? value.trim() : null;
}

function getBoolean(record: JsonRecord, key: string): boolean | null {
  const value = record[key];
  return typeof value === 'boolean' ? value : null;
}

function getSafeInteger(record: JsonRecord, key: string): number | null {
  const value = record[key];
  return typeof value === 'number' && Number.isSafeInteger(value) ? value : null;
}

function requireSafeSlot(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new InvalidChainlinkSolanaDataError(`${label} is not a non-negative safe integer`);
  }
  return value;
}

function parseHeartbeat(record: JsonRecord, docs: JsonRecord): number | null {
  const heartbeat = getSafeInteger(record, 'heartbeat') ?? getSafeInteger(docs, 'heartbeat');
  if (
    heartbeat === null ||
    heartbeat < MIN_HEARTBEAT_SECONDS ||
    heartbeat > MAX_HEARTBEAT_SECONDS
  ) {
    return null;
  }
  return heartbeat;
}

function canonicalPair(base: string, quote: string): string | null {
  const normalizedBase = base.trim().toUpperCase();
  const normalizedQuote = quote.trim().toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9._-]{0,30}$/.test(normalizedBase)) return null;
  if (normalizedQuote !== 'USD') return null;
  return `${normalizedBase}/${normalizedQuote}`;
}

function validateSolanaAddress(value: string): boolean {
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value)) return false;
  try {
    address(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Parse only the price-feed portion of Chainlink's official Reference Data
 * Directory. Feed entries are still untrusted until their account owner,
 * account layout, pair identity, value, and timestamp all pass on-chain.
 */
export function parseChainlinkSolanaDirectory(value: unknown): ChainlinkSolanaFeed[] {
  if (!Array.isArray(value)) {
    throw new InvalidChainlinkSolanaDataError('Chainlink Solana directory is not an array');
  }

  const candidates: ChainlinkSolanaFeed[] = [];
  for (const raw of value) {
    let record: JsonRecord;
    let docs: JsonRecord;
    try {
      record = asRecord(raw, 'Chainlink Solana directory entry');
      docs = asRecord(record.docs, 'Chainlink Solana directory entry docs');
    } catch {
      continue;
    }
    if (getBoolean(docs, 'hidden') === true) continue;

    const accountAddress = getString(record, 'transmissionsAccount');
    const base = getString(docs, 'baseAsset');
    const quote = getString(docs, 'quoteAsset');
    const heartbeatSeconds = parseHeartbeat(record, docs);
    const alias = base && quote ? canonicalPair(base, quote) : null;
    if (!accountAddress || !alias || !heartbeatSeconds || !validateSolanaAddress(accountAddress)) {
      continue;
    }

    candidates.push({
      alias,
      accountAddress,
      heartbeatSeconds,
      category: getString(docs, 'assetClass') ?? getString(docs, 'feedType') ?? 'crypto',
    });
  }

  // A pair must map to exactly one official account. Choosing an arbitrary
  // duplicate would let an undocumented directory ordering choose a price.
  const aliases = new Map<string, ChainlinkSolanaFeed[]>();
  for (const candidate of candidates) {
    const entries = aliases.get(candidate.alias) ?? [];
    entries.push(candidate);
    aliases.set(candidate.alias, entries);
  }

  return Array.from(aliases.values())
    .filter((entries) => entries.length === 1)
    .map(([entry]) => entry)
    .sort((left, right) => left.alias.localeCompare(right.alias));
}

function parseBase64Account(value: unknown): Buffer {
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    value[1] !== 'base64' ||
    typeof value[0] !== 'string'
  ) {
    throw new InvalidChainlinkSolanaDataError('Chainlink account data is not canonical base64');
  }
  const encoded = value[0];
  if (
    encoded.length === 0 ||
    encoded.length > 16_384 ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)
  ) {
    throw new InvalidChainlinkSolanaDataError('Chainlink account data is invalid base64');
  }
  const decoded = Buffer.from(encoded, 'base64');
  if (decoded.toString('base64') !== encoded) {
    throw new InvalidChainlinkSolanaDataError('Chainlink account data is non-canonical base64');
  }
  return decoded;
}

function decodeDescription(bytes: Buffer): string {
  const raw = bytes.subarray(DESCRIPTION_OFFSET, DESCRIPTION_OFFSET + 32);
  const zeroIndex = raw.indexOf(0);
  const textBytes = zeroIndex === -1 ? raw : raw.subarray(0, zeroIndex);
  const trailing = zeroIndex === -1 ? Buffer.alloc(0) : raw.subarray(zeroIndex);
  if (trailing.some((byte) => byte !== 0) || textBytes.some((byte) => byte < 0x20 || byte > 0x7e)) {
    throw new InvalidChainlinkSolanaDataError('Chainlink account description is malformed');
  }
  const description = textBytes.toString('ascii').trim();
  if (description.length === 0) {
    throw new InvalidChainlinkSolanaDataError('Chainlink account description is empty');
  }
  return description;
}

function decodeSignedI128LE(bytes: Buffer, offset: number): bigint {
  const low = bytes.readBigUInt64LE(offset);
  const high = bytes.readBigInt64LE(offset + 8);
  return (high << 64n) + low;
}

function scaleAnswer(answer: bigint, decimals: number): number {
  const price = Number(answer) / 10 ** decimals;
  if (!Number.isFinite(price) || price <= 0 || price > 1_000_000_000_000_000) {
    throw new InvalidChainlinkSolanaDataError('Chainlink scaled answer is invalid');
  }
  return price;
}

function decodePrice(input: {
  account: JsonRecord;
  expectedFeed: ChainlinkSolanaFeed;
  observationSlot: number;
  nowSeconds: number;
}): ChainlinkSolanaPriceData {
  if (input.account.owner !== CHAINLINK_SOLANA_STORE_PROGRAM_ID) {
    throw new InvalidChainlinkSolanaDataError('Chainlink feed account has an unexpected owner');
  }
  const bytes = parseBase64Account(input.account.data);
  if (bytes.length < MIN_ACCOUNT_BYTES) {
    throw new InvalidChainlinkSolanaDataError('Chainlink feed account is truncated');
  }
  if (!bytes.subarray(0, 8).equals(CHAINLINK_SOLANA_TRANSMISSIONS_DISCRIMINATOR)) {
    throw new InvalidChainlinkSolanaDataError('Chainlink feed account discriminator is invalid');
  }
  if (bytes.readUInt32LE(LIVE_LENGTH_OFFSET) !== 1) {
    throw new InvalidChainlinkSolanaDataError(
      'Chainlink feed account does not have exactly one live transmission'
    );
  }
  const roundId = bytes.readUInt32LE(LATEST_ROUND_ID_OFFSET);
  if (roundId === 0) {
    throw new InvalidChainlinkSolanaDataError('Chainlink feed account has no completed round');
  }
  const decimals = bytes[DECIMALS_OFFSET];
  if (!Number.isSafeInteger(decimals) || decimals > 18) {
    throw new InvalidChainlinkSolanaDataError('Chainlink feed account decimals are invalid');
  }
  const description = decodeDescription(bytes);
  const normalizedDescription = description.replace(/\s+/g, '');
  if (normalizedDescription !== input.expectedFeed.alias) {
    throw new InvalidChainlinkSolanaDataError(
      'Chainlink feed account description does not match directory pair'
    );
  }

  const transmissionSlot = bytes.readBigUInt64LE(TRANSMISSION_SLOT_OFFSET);
  const timestampSeconds = bytes.readUInt32LE(TRANSMISSION_TIMESTAMP_OFFSET);
  const answer = decodeSignedI128LE(bytes, TRANSMISSION_ANSWER_OFFSET);
  const maxAgeSeconds = input.expectedFeed.heartbeatSeconds * 2;
  const ageSeconds = input.nowSeconds - timestampSeconds;
  if (
    timestampSeconds === 0 ||
    ageSeconds < -MAX_FUTURE_SKEW_SECONDS ||
    ageSeconds > maxAgeSeconds
  ) {
    throw new InvalidChainlinkSolanaDataError(
      `Chainlink feed is stale or future-dated (age ${ageSeconds}s, maximum ${maxAgeSeconds}s)`
    );
  }

  return {
    symbol: input.expectedFeed.alias,
    price: scaleAnswer(answer, decimals),
    timestamp: timestampSeconds * 1000,
    decimals,
    roundId: roundId.toString(),
    answer: answer.toString(),
    accountAddress: input.expectedFeed.accountAddress,
    accountOwner: CHAINLINK_SOLANA_STORE_PROGRAM_ID,
    description,
    heartbeatSeconds: input.expectedFeed.heartbeatSeconds,
    maxAgeSeconds,
    observationSlot: input.observationSlot,
    transmissionSlot: transmissionSlot.toString(),
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
  const id = `insight-chainlink-solana-${method}`;
  const startedAt = Date.now();
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
      throw new InvalidChainlinkSolanaDataError('Solana RPC returned invalid JSON');
    }
    const envelope = asRecord(body, 'Solana JSON-RPC response');
    if (envelope.jsonrpc !== '2.0' || envelope.id !== id) {
      throw new InvalidChainlinkSolanaDataError('Solana RPC envelope is invalid');
    }
    if (envelope.error != null) throw new Error('Solana RPC rejected the Chainlink query');
    if (!Object.hasOwn(envelope, 'result')) {
      throw new InvalidChainlinkSolanaDataError('Solana RPC result is missing');
    }
    recordRpcUsage({
      context: 'chainlink-solana',
      chain: 'solana',
      method,
      kind: 'read',
      success: true,
      durationMs: Date.now() - startedAt,
    });
    return envelope.result as T;
  } catch (error) {
    recordRpcUsage({
      context: 'chainlink-solana',
      chain: 'solana',
      method,
      kind: 'read',
      success: false,
      timedOut: !signal?.aborted && error instanceof DOMException && error.name === 'TimeoutError',
      durationMs: Date.now() - startedAt,
    });
    throw error;
  }
}

/**
 * Reads Chainlink's official Solana directory for account identifiers, then
 * reads the price from the chain-owned OCR2 account. It never calls a Data
 * Streams API, so no Chainlink key or bearer token enters the application.
 */
export class ChainlinkSolanaOnChainService {
  private readonly cache = new OracleCache();
  private readonly endpoints: () => string[];
  private readonly fetcher: typeof fetch;
  private readonly now: () => number;

  constructor(options: ChainlinkSolanaServiceOptions = {}) {
    this.endpoints = options.endpoints ?? (() => getRpcEndpoints(CHAINLINK_SOLANA_CHAIN_ID) ?? []);
    this.fetcher = options.fetcher ?? globalThis.fetch ?? unavailableFetch;
    this.now = options.now ?? Date.now;
  }

  async getOfficialFeeds(signal?: AbortSignal): Promise<ChainlinkSolanaFeed[]> {
    const cacheKey = `${CHAINLINK_SOLANA_RDD_SOURCE}:official-feeds`;
    const cached = this.cache.get<ChainlinkSolanaFeed[]>(cacheKey);
    if (cached) return cached;

    const response = await this.fetcher(CHAINLINK_SOLANA_RDD_URL, {
      headers: { accept: 'application/json' },
      signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(15_000)])
        : AbortSignal.timeout(15_000),
    });
    if (!response.ok)
      throw new Error('Chainlink Solana reference directory returned a non-success HTTP response');
    const contentLength = response.headers.get('content-length');
    if (contentLength && Number(contentLength) > MAX_DIRECTORY_BYTES) {
      throw new InvalidChainlinkSolanaDataError(
        'Chainlink Solana reference directory is too large'
      );
    }
    const body = await response.text();
    if (Buffer.byteLength(body, 'utf8') > MAX_DIRECTORY_BYTES) {
      throw new InvalidChainlinkSolanaDataError(
        'Chainlink Solana reference directory is too large'
      );
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      throw new InvalidChainlinkSolanaDataError(
        'Chainlink Solana reference directory is invalid JSON'
      );
    }
    const feeds = parseChainlinkSolanaDirectory(parsed);
    if (feeds.length === 0) {
      throw new InvalidChainlinkSolanaDataError(
        'Chainlink Solana reference directory has no usable USD feeds'
      );
    }
    this.cache.set(cacheKey, feeds, DIRECTORY_CACHE_TTL_MS);
    return feeds;
  }

  async getPrice(symbol: string, signal?: AbortSignal): Promise<ChainlinkSolanaPriceData> {
    const normalizedBase = symbol.trim().toUpperCase().split('/')[0];
    const feed = (await this.getOfficialFeeds(signal)).find(
      (candidate) => candidate.alias === `${normalizedBase}/USD`
    );
    if (!feed) throw new Error(`No official Chainlink Solana USD feed for ${normalizedBase}`);

    const [price] = await this.getPrices([feed], signal);
    if (!price) throw new Error(`Chainlink Solana feed ${feed.alias} is unavailable or unusable`);
    return price;
  }

  /**
   * Batch-read official entries. A malformed or stale account is rejected on
   * its own so healthy evidence from other Chainlink pairs remains available.
   */
  async getPrices(
    feeds: readonly ChainlinkSolanaFeed[],
    signal?: AbortSignal
  ): Promise<ChainlinkSolanaPriceData[]> {
    if (feeds.length === 0) return [];
    const accountAddresses = feeds.map((feed) => feed.accountAddress);
    if (new Set(accountAddresses).size !== accountAddresses.length) {
      throw new Error('Chainlink Solana batch contains duplicate account addresses');
    }
    const endpoints = this.endpoints();
    if (endpoints.length === 0) throw new Error('No Solana mainnet RPC endpoint is configured');

    let lastError: unknown = new Error('All Solana mainnet RPC endpoints failed');
    for (const endpoint of endpoints) {
      try {
        const genesis = await rpc<string>(endpoint, 'getGenesisHash', [], this.fetcher, signal);
        if (genesis !== CHAINLINK_SOLANA_MAINNET_GENESIS_HASH) {
          lastError = new Error('Solana RPC endpoint is not connected to mainnet-beta');
          continue;
        }

        const results: ChainlinkSolanaPriceData[] = [];
        for (let start = 0; start < feeds.length; start += 100) {
          const batch = feeds.slice(start, start + 100);
          const rawResult = asRecord(
            await rpc<unknown>(
              endpoint,
              'getMultipleAccounts',
              [
                batch.map((feed) => feed.accountAddress),
                { encoding: 'base64', commitment: 'confirmed' },
              ],
              this.fetcher,
              signal
            ),
            'getMultipleAccounts result'
          );
          const context = asRecord(rawResult.context, 'getMultipleAccounts context');
          const observationSlot = requireSafeSlot(context.slot, 'getMultipleAccounts context slot');
          if (!Array.isArray(rawResult.value) || rawResult.value.length !== batch.length) {
            throw new InvalidChainlinkSolanaDataError(
              'Solana RPC returned an invalid Chainlink account batch'
            );
          }

          const nowSeconds = Math.floor(this.now() / 1000);
          for (let index = 0; index < batch.length; index += 1) {
            const rawAccount = rawResult.value[index];
            if (rawAccount === null) {
              logger.warn('Chainlink Solana feed account is absent', {
                alias: batch[index].alias,
                accountAddress: batch[index].accountAddress,
              });
              continue;
            }
            try {
              results.push(
                decodePrice({
                  account: asRecord(rawAccount, 'Chainlink price-feed account'),
                  expectedFeed: batch[index],
                  observationSlot,
                  nowSeconds,
                })
              );
            } catch (error) {
              logger.warn('Rejected Chainlink Solana price-feed account', {
                alias: batch[index].alias,
                accountAddress: batch[index].accountAddress,
                error: error instanceof Error ? error.message : String(error),
              });
            }
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
}

export const chainlinkSolanaOnChainService = new ChainlinkSolanaOnChainService();
