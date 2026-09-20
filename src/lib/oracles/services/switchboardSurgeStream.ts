import { createHash } from 'node:crypto';

import { ed25519 } from '@noble/curves/ed25519.js';
import WebSocket, { type RawData } from 'ws';

import {
  SWITCHBOARD_CROSSBAR_URL,
  SWITCHBOARD_DECIMALS,
  SWITCHBOARD_FEED_IDS,
  normalizeSwitchboardFeedId,
} from '@/lib/oracles/constants/switchboardConstants';
import { bigIntToPrice } from '@/lib/oracles/utils/oracleDataUtils';
import { savePriceToDatabase } from '@/lib/oracles/utils/storage';
import { createLogger, normalizeError } from '@/lib/utils/logger';
import { OracleProvider, type PriceData } from '@/types/oracle';

const logger = createLogger('switchboard-surge-stream');
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const SIGNED_FEEDS = ['BTC', 'ETH'] as const;
const DEFAULT_SOLANA_RPC = 'https://api.mainnet-beta.solana.com';
const DEFAULT_BATCH_INTERVAL_MS = 10_000;

interface AuthData {
  signature: string;
  publicKey: string;
  blockhash: string;
  timestamp: number;
}

interface SurgeFeedValue {
  value?: string;
  feed_hash?: string;
  symbol?: string;
  source?: string;
  event_ts?: number;
  seen_at?: number;
  verified_at?: number;
}

interface SurgeOracleResponse {
  oracle_pubkey?: string;
  eth_address?: string;
  signature?: string;
  checksum?: string;
  recovery_id?: number;
  oracle_idx?: number;
  timestamp?: number;
  timestamp_ms?: number;
  recent_hash?: string;
  slot?: number;
  ed25519_enclave_signer?: string;
}

export interface SignedSurgeMessage {
  type?: string;
  feed_bundle_id?: string;
  feed_values?: SurgeFeedValue[];
  oracle_response?: SurgeOracleResponse;
  broadcast_ts_ms?: number;
  source_ts_ms?: number;
  message?: string;
}

export interface SwitchboardSurgeStreamConfig {
  secretKey: string;
  solanaRpcUrl?: string;
  crossbarUrl?: string;
  gatewayUrl?: string;
  batchIntervalMs?: number;
  signal?: AbortSignal;
  persist?: (price: PriceData) => Promise<boolean>;
}

function encodeBase58(bytes: Uint8Array): string {
  let value = 0n;
  for (const byte of bytes) value = value * 256n + BigInt(byte);

  let encoded = '';
  while (value > 0n) {
    const remainder = Number(value % 58n);
    encoded = BASE58_ALPHABET[remainder] + encoded;
    value /= 58n;
  }
  for (const byte of bytes) {
    if (byte !== 0) break;
    encoded = `1${encoded}`;
  }
  return encoded || '1';
}

function decodeBase58(value: string): Uint8Array {
  let decoded = 0n;
  for (const character of value) {
    const index = BASE58_ALPHABET.indexOf(character);
    if (index < 0) throw new Error('Invalid base58 character in Switchboard secret key');
    decoded = decoded * 58n + BigInt(index);
  }

  const bytes: number[] = [];
  while (decoded > 0n) {
    bytes.unshift(Number(decoded % 256n));
    decoded /= 256n;
  }
  for (const character of value) {
    if (character !== '1') break;
    bytes.unshift(0);
  }
  return Uint8Array.from(bytes);
}

export function parseSwitchboardSecretKey(value: string): Uint8Array {
  const trimmed = value.trim();
  let bytes: Uint8Array;
  if (trimmed.startsWith('[')) {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(parsed) || parsed.some((item) => !Number.isInteger(item))) {
      throw new Error('SWITCHBOARD_SOLANA_SECRET_KEY JSON must be an integer byte array');
    }
    bytes = Uint8Array.from(parsed as number[]);
  } else {
    bytes = decodeBase58(trimmed);
  }

  if (bytes.length !== 32 && bytes.length !== 64) {
    throw new Error('SWITCHBOARD_SOLANA_SECRET_KEY must decode to 32 or 64 bytes');
  }
  return bytes;
}

async function fetchLatestBlockhash(rpcUrl: string): Promise<string> {
  const response = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'getLatestBlockhash',
      params: [{ commitment: 'confirmed' }],
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Solana RPC returned HTTP ${response.status}`);
  const payload = (await response.json()) as {
    result?: { value?: { blockhash?: string } };
    error?: { message?: string };
  };
  const blockhash = payload.result?.value?.blockhash;
  if (!blockhash) throw new Error(payload.error?.message || 'Solana RPC returned no blockhash');
  return blockhash;
}

export async function createSwitchboardAuth(
  secretKeyValue: string,
  rpcUrl = DEFAULT_SOLANA_RPC
): Promise<AuthData> {
  const secretKey = parseSwitchboardSecretKey(secretKeyValue);
  const seed = secretKey.slice(0, 32);
  const publicKey = ed25519.getPublicKey(seed);
  if (secretKey.length === 64 && !Buffer.from(secretKey.slice(32)).equals(Buffer.from(publicKey))) {
    throw new Error('Switchboard Solana secret key public half does not match its private seed');
  }

  const blockhash = await fetchLatestBlockhash(rpcUrl);
  const timestamp = Date.now();
  const digest = createHash('sha256').update(`${blockhash}:${timestamp}`, 'utf8').digest();
  const signature = ed25519.sign(Uint8Array.from(digest), seed);
  return {
    signature: encodeBase58(signature),
    publicKey: encodeBase58(publicKey),
    blockhash,
    timestamp,
  };
}

function authHeaders(auth: AuthData): Record<string, string> {
  return {
    'X-Switchboard-Signature': auth.signature,
    'X-Switchboard-Pubkey': auth.publicKey,
    'X-Switchboard-Blockhash': auth.blockhash,
    'X-Switchboard-Timestamp': String(auth.timestamp),
  };
}

function authMessageFields(auth: AuthData) {
  return {
    pubkey: auth.publicKey,
    signature: auth.signature,
    blockhash: auth.blockhash,
    timestamp: auth.timestamp,
  };
}

function normalizeTimestamp(value: number | undefined, fallback: number): number {
  if (!value || !Number.isFinite(value) || value <= 0) return fallback;
  return value < 1_000_000_000_000 ? value * 1000 : value;
}

function signedFeedSymbol(feedHash: string | undefined): (typeof SIGNED_FEEDS)[number] | null {
  if (!feedHash) return null;
  const normalized = normalizeSwitchboardFeedId(feedHash).toLowerCase();
  for (const symbol of SIGNED_FEEDS) {
    if (normalizeSwitchboardFeedId(SWITCHBOARD_FEED_IDS[symbol]).toLowerCase() === normalized) {
      return symbol;
    }
  }
  return null;
}

/** Verify the enclave signature and convert only the two paid-for Plug feeds. */
export function parseSignedSurgeUpdate(
  message: SignedSurgeMessage,
  gatewayUrl: string,
  receivedAt = Date.now()
): PriceData[] {
  if (message.type !== 'BundledFeedUpdate') return [];
  const oracle = message.oracle_response;
  if (
    !oracle?.signature ||
    !oracle.checksum ||
    !oracle.ed25519_enclave_signer ||
    !message.feed_values?.length
  ) {
    throw new Error('Switchboard signed update is missing signature evidence');
  }

  let signerHex = oracle.ed25519_enclave_signer.replace(/^0x/, '');
  if (signerHex.length === 128) signerHex = signerHex.slice(0, 64);
  if (!/^[0-9a-fA-F]{64}$/.test(signerHex)) {
    throw new Error('Switchboard update has an invalid Ed25519 enclave signer');
  }

  const signature = Buffer.from(oracle.signature, 'base64');
  const checksum = Buffer.from(oracle.checksum, 'base64');
  const signer = Buffer.from(signerHex, 'hex');
  if (
    signature.length !== 64 ||
    !ed25519.verify(Uint8Array.from(signature), Uint8Array.from(checksum), Uint8Array.from(signer))
  ) {
    throw new Error('Switchboard Surge Ed25519 signature verification failed');
  }

  return message.feed_values.flatMap((feed): PriceData[] => {
    const symbol = signedFeedSymbol(feed.feed_hash);
    if (!symbol || !feed.value) return [];
    const price = bigIntToPrice(BigInt(feed.value), SWITCHBOARD_DECIMALS);
    if (!Number.isFinite(price) || price <= 0) return [];
    const timestamp = normalizeTimestamp(
      feed.event_ts ?? oracle.timestamp_ms ?? oracle.timestamp,
      message.broadcast_ts_ms ?? receivedAt
    );
    const feedId = normalizeSwitchboardFeedId(feed.feed_hash!);

    return [
      {
        provider: OracleProvider.SWITCHBOARD,
        symbol,
        price,
        timestamp,
        decimals: SWITCHBOARD_DECIMALS,
        confidence: 0.95,
        source: 'switchboard-surge-signed',
        feedId,
        numOracles: 1,
        verificationLevel: 'signed',
        countsTowardOracleQuorum: true,
        ingestionTimestamp: receivedAt,
        verification: {
          type: 'api',
          contractAddress: `0x${signerHex}`,
          chainId: 0,
          explorerUrl: gatewayUrl,
          method: 'switchboardSurgeEd25519',
          blockNumber: oracle.slot,
          signature: oracle.signature,
          checksum: oracle.checksum,
          signer: `0x${signerHex}`,
          oraclePubkey: oracle.oracle_pubkey,
          ethAddress: oracle.eth_address,
          feedHash: feedId,
          rawValue: feed.value,
          sourceTimestamp: timestamp,
          signatureScheme: 'ed25519',
          recoveryId: oracle.recovery_id,
        },
      },
    ];
  });
}

function gatewayUrlFromEntry(entry: unknown): string | null {
  if (typeof entry === 'string') return entry;
  if (!entry || typeof entry !== 'object') return null;
  const record = entry as Record<string, unknown>;
  for (const key of ['gatewayUrl', 'gateway_url', 'url', 'oracle_gateway_url']) {
    if (typeof record[key] === 'string') return record[key];
  }
  return null;
}

async function discoverGateway(crossbarUrl: string): Promise<string> {
  const response = await fetch(`${crossbarUrl}/gateways?network=mainnet`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Switchboard gateway discovery returned ${response.status}`);
  const payload = (await response.json()) as unknown;
  const entries = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object'
      ? ((((payload as Record<string, unknown>).data ??
          (payload as Record<string, unknown>).gateways) as unknown[] | undefined) ?? [])
      : [];
  const gateway = entries.map(gatewayUrlFromEntry).find((value): value is string => Boolean(value));
  if (!gateway) {
    throw new Error(
      'Switchboard returned no mainnet Surge gateways; set SWITCHBOARD_SURGE_GATEWAY_URL to a subscribed gateway or retry when the network recovers'
    );
  }
  return gateway.replace(/\/$/, '');
}

async function requestSession(
  gatewayUrl: string,
  secretKey: string,
  rpcUrl: string
): Promise<{ sessionToken: string; websocketUrl: string; publicKey: string }> {
  const auth = await createSwitchboardAuth(secretKey, rpcUrl);
  const response = await fetch(`${gatewayUrl}/gateway/api/v1/request_stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders(auth) },
    body: JSON.stringify({
      feeds: SIGNED_FEEDS.map((symbol) => ({ symbol: `${symbol}/USD`, source: 'WEIGHTED' })),
    }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(
      `Switchboard session request returned ${response.status}: ${body.slice(0, 300)}`
    );
  }
  const payload = (await response.json()) as {
    session_token?: string;
    oracle_ws_url?: string;
  };
  if (!payload.session_token || !payload.oracle_ws_url) {
    throw new Error('Switchboard session response is missing session_token or oracle_ws_url');
  }
  const websocketUrl =
    payload.oracle_ws_url.startsWith('ws://') &&
    !payload.oracle_ws_url.includes('localhost') &&
    !payload.oracle_ws_url.includes('127.0.0.1')
      ? payload.oracle_ws_url.replace('ws://', 'wss://')
      : payload.oracle_ws_url;
  return { sessionToken: payload.session_token, websocketUrl, publicKey: auth.publicKey };
}

/**
 * Connect one free Surge Plug stream (one connection, exactly BTC + ETH),
 * verify every signed bundle locally, and persist it for chain-agnostic reads.
 * Resolves only after the socket closes or the supplied signal aborts.
 */
export async function runSwitchboardSurgeStream(
  config: SwitchboardSurgeStreamConfig
): Promise<void> {
  const crossbarUrl = (config.crossbarUrl ?? SWITCHBOARD_CROSSBAR_URL).replace(/\/$/, '');
  const rpcUrl = config.solanaRpcUrl ?? DEFAULT_SOLANA_RPC;
  const gatewayUrl = config.gatewayUrl?.replace(/\/$/, '') ?? (await discoverGateway(crossbarUrl));
  const session = await requestSession(gatewayUrl, config.secretKey, rpcUrl);
  const wsAuth = await createSwitchboardAuth(config.secretKey, rpcUrl);
  const persist = config.persist ?? savePriceToDatabase;
  const batchIntervalMs = config.batchIntervalMs ?? DEFAULT_BATCH_INTERVAL_MS;
  if (batchIntervalMs < 5 || batchIntervalMs > 10_000) {
    throw new Error('Switchboard batch interval must be between 5 and 10000ms');
  }

  await new Promise<void>((resolve, reject) => {
    let stopping = false;
    let settled = false;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      if (error) reject(error);
      else resolve();
    };
    const socket = new WebSocket(session.websocketUrl, {
      headers: {
        Authorization: `Bearer ${session.publicKey}:${session.sessionToken}`,
        ...authHeaders(wsAuth),
      },
    });

    const abort = () => {
      stopping = true;
      socket.close(1000, 'Insight stream shutdown');
    };
    if (config.signal?.aborted) abort();
    else config.signal?.addEventListener('abort', abort, { once: true });

    socket.once('open', () => {
      void createSwitchboardAuth(config.secretKey, rpcUrl)
        .then((auth) => {
          socket.send(
            JSON.stringify({
              type: 'Subscribe',
              feed_bundles: [
                {
                  feeds: SIGNED_FEEDS.map((symbol) => ({
                    symbol: { base: symbol, quote: 'USD' },
                    source: 'WEIGHTED',
                  })),
                },
              ],
              signature_scheme: 'Ed25519',
              batch_interval_ms: batchIntervalMs,
              ...authMessageFields(auth),
            })
          );
          logger.info('Switchboard Surge stream subscribed', {
            feeds: [...SIGNED_FEEDS],
            batchIntervalMs,
            gatewayUrl,
          });
        })
        .catch((error) => {
          socket.close(1011, 'Failed to sign subscription');
          finish(error instanceof Error ? error : new Error(String(error)));
        });
    });

    socket.on('ping', (data: Buffer) => socket.pong(data));
    socket.on('message', (data: RawData) => {
      void (async () => {
        const message = JSON.parse(data.toString()) as SignedSurgeMessage;
        if (message.type === 'SignedPing') {
          const auth = await createSwitchboardAuth(config.secretKey, rpcUrl);
          socket.send(JSON.stringify({ type: 'SignedPong', ...authMessageFields(auth) }));
          return;
        }
        if (message.type === 'Error' || message.type === 'ValidationError') {
          throw new Error(message.message || `Switchboard stream returned ${message.type}`);
        }
        const prices = parseSignedSurgeUpdate(message, gatewayUrl);
        for (const price of prices) {
          const saved = await persist(price);
          if (!saved) throw new Error(`Failed to persist signed ${price.symbol} Surge update`);
          logger.info('Persisted signed Switchboard Surge update', {
            symbol: price.symbol,
            price: price.price,
            timestamp: price.timestamp,
          });
        }
      })().catch((error) => {
        logger.error('Rejected Switchboard Surge message', normalizeError(error));
      });
    });
    socket.once('error', (error) => finish(error));
    socket.once('close', (code, reason) => {
      config.signal?.removeEventListener('abort', abort);
      if (stopping || code === 1000) finish();
      else finish(new Error(`Switchboard Surge socket closed (${code}): ${reason.toString()}`));
    });
  });
}
