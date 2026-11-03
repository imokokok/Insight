/**
 * @fileoverview Drift Protocol v2 (Solana mainnet) on-chain perp market
 * evidence reader.
 *
 * Drift v2 publishes no REST API; its authoritative market state lives in
 * Anchor accounts owned by the on-chain program. This module reads those
 * accounts directly through the same Solana mainnet RPC configuration used by
 * the other Solana-native guards (lending, swap) and hand-decodes the minimal
 * Anchor borsh layouts it relies on.
 *
 * Layout provenance (retrieved 2026-11-04):
 * - Field offsets below were computed from the official Drift v2 IDL shipped
 *   with `@drift-labs/sdk@2.156.0` (`lib/node/idl/drift.json`, program
 *   `dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH`).
 * - They were cross-validated the same day against live mainnet accounts for
 *   the three reviewed markets (SOL-PERP index 0, BTC-PERP index 1, ETH-PERP
 *   index 2): every decoded field matched an independent decode performed with
 *   the official SDK `BorshAccountsCoder`, and the AMM invariant
 *   sqrt(baseAssetReserve * quoteAssetReserve) == sqrtK held exactly.
 * - A Drift program upgrade can shift these layouts. Decoding therefore fails
 *   closed: the account discriminator and length are verified, and any field
 *   that cannot be decoded stays explicitly null.
 *
 * Unit conventions (Drift v2 precisions):
 * - Reserves and base asset amounts: AMM/BASE precision 1e9.
 * - pegMultiplier: PEG_PRECISION 1e6. Mark price in PRICE_PRECISION 1e6 is
 *   quoteAssetReserve * pegMultiplier / baseAssetReserve (verified against
 *   Pyth Lazer oracle prices and the on-chain mark TWAPs).
 * - Margin ratios: MARGIN_PRECISION 1e4 (verified: BTC/ETH initial 500 = 5%,
 *   maintenance 200 = 2%; SOL 500/300).
 * - lastFundingRate / last24hAvgFundingRate: percent-with-1e6-precision per
 *   hour (fraction = raw / 1e8). This matches the SDK funding math, which
 *   derives per-hour rates as (twapSpreadPct = spread/oracle * 1e6 * 100) / 24.
 */

import { getProgramDerivedAddress, type Address } from '@solana/kit';

import { SOLANA_MAINNET_CAIP2 } from '@/lib/api/x402/config';
import { getRpcEndpoints } from '@/lib/execution/rpcEndpoints';

export const DRIFT_V2_MAINNET_PROGRAM_ID = 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH';
export const SOLANA_MAINNET_GENESIS_HASH = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';

/** Anchor discriminators (sha256("account:<Name>")[0..8]). */
export const DRIFT_PERP_MARKET_DISCRIMINATOR = Uint8Array.from([
  0x0a, 0xdf, 0x0c, 0x2c, 0x6b, 0xf5, 0x37, 0xf7,
]);
export const PYTH_LAZER_ORACLE_DISCRIMINATOR = Uint8Array.from([
  0x9f, 0x07, 0xa1, 0xf9, 0x22, 0x51, 0x79, 0x85,
]);

/**
 * Byte offsets inside the post-discriminator PerpMarket account data, derived
 * from the Drift v2 IDL (see provenance above). Only the fields this guard
 * relies on are listed.
 */
export const PERP_MARKET_OFFSETS = {
  ammOracle: 32, // pubkey (32 bytes)
  ammBaseAssetReserve: 168, // u128, AMM_RESERVE_PRECISION 1e9
  ammQuoteAssetReserve: 184, // u128, AMM_RESERVE_PRECISION 1e9
  ammSqrtK: 248, // u128, invariant sqrt(base*quote)
  ammPegMultiplier: 264, // u128, PEG_PRECISION 1e6
  ammBaseAssetAmountLong: 296, // i128, BASE_PRECISION 1e9
  ammBaseAssetAmountShort: 312, // i128, BASE_PRECISION 1e9 (non-positive)
  ammMaxOpenInterest: 360, // u128, BASE_PRECISION 1e9
  ammLastFundingRate: 472, // i64, percent*1e6 per hour
  ammLast24hAvgFundingRate: 496, // i64, percent*1e6 per hour
  ammLastMarkPriceTwap: 744, // u128, PRICE_PRECISION 1e6
  ammLastUpdateSlot: 760, // u64
  ammFundingPeriod: 792, // u64, seconds
  ammLastMarkPriceTwapTs: 880, // i64, unix seconds
  ammMmOraclePrice: 904, // i64, PRICE_PRECISION 1e6
  ammOracleSource: 918, // u8, OracleSource enum tag
  name: 992, // [u8; 32] ascii
  marginRatioInitial: 1128, // u32, MARGIN_PRECISION 1e4
  marginRatioMaintenance: 1132, // u32, MARGIN_PRECISION 1e4
  marketIndex: 1152, // u16
  status: 1154, // u8, MarketStatus enum tag
  contractType: 1155, // u8, ContractType enum tag
  contractTier: 1156, // u8, ContractTier enum tag
  pausedOperations: 1157, // u8, PausedOperations bitmask
} as const;

/**
 * Byte offsets inside the post-discriminator PythLazerOracle account data
 * (Drift-owned mirror of the Pyth Lazer feed, 48 bytes total). Drift's
 * reviewed majors migrated to this oracle source; the classic Pyth program
 * layout is intentionally not implemented here.
 */
export const PYTH_LAZER_ORACLE_OFFSETS = {
  price: 8, // i64, price * 1e8 (exponent is -8)
  publishTime: 16, // u64, MICROSECONDS since unix epoch
  postedSlot: 24, // u64
  exponent: 32, // i32, expected -8
  confidence: 40, // u64, price * 1e8
} as const;

/** OracleSource enum tags from the Drift v2 IDL. */
export const DRIFT_ORACLE_SOURCES: Record<number, string> = {
  0: 'pyth',
  1: 'switchboard',
  2: 'quoteAsset',
  3: 'pyth1K',
  4: 'pyth1M',
  5: 'pythStableCoin',
  6: 'prelaunch',
  7: 'pythPull',
  8: 'pyth1KPull',
  9: 'pyth1MPull',
  10: 'pythStableCoinPull',
  11: 'switchboardOnDemand',
  12: 'pythLazer',
  13: 'pythLazer1K',
  14: 'pythLazer1M',
  15: 'pythLazerStableCoin',
};

/** Only the Pyth Lazer mirror has a hand-verified decoder in this module. */
export const DRIFT_SUPPORTED_ORACLE_SOURCES = new Set(['pythLazer']);

export const DRIFT_MARKET_STATUSES: Record<number, string> = {
  0: 'initialized',
  1: 'active',
  2: 'fundingPaused',
  3: 'ammPaused',
  4: 'fillPaused',
  5: 'withdrawPaused',
  6: 'reduceOnly',
  7: 'settlement',
  8: 'delisted',
};

export const DRIFT_CONTRACT_TIERS: Record<number, string> = {
  0: 'A',
  1: 'B',
  2: 'C',
  3: 'isolatedHighLeverage',
};

/**
 * Reviewed Drift v2 perp markets. The mapping between reviewed symbols and
 * on-chain market indexes was verified on 2026-11-04 by decoding the
 * `name` field of the perp_market PDA for each index (0 -> SOL-PERP,
 * 1 -> BTC-PERP, 2 -> ETH-PERP).
 */
export const REVIEWED_DRIFT_PERP_MARKETS = [
  { marketIndex: 0, symbol: 'SOL-PERP', baseAssetSymbol: 'SOL' },
  { marketIndex: 1, symbol: 'BTC-PERP', baseAssetSymbol: 'BTC' },
  { marketIndex: 2, symbol: 'ETH-PERP', baseAssetSymbol: 'ETH' },
] as const;

export type ReviewedDriftPerpMarket = (typeof REVIEWED_DRIFT_PERP_MARKETS)[number];

export function findReviewedDriftPerpMarket(assetSymbol: string): ReviewedDriftPerpMarket | null {
  const normalized = assetSymbol.trim().toUpperCase();
  return (
    REVIEWED_DRIFT_PERP_MARKETS.find(
      (market) => market.baseAssetSymbol === normalized || market.symbol === normalized
    ) ?? null
  );
}

export interface DriftPerpMarketEvidence {
  marketIndex: number;
  marketName: string;
  marketAccountAddress: string;
  oracleSource: string;
  oracleSourceSupported: boolean;
  oracleAccountAddress: string | null;
  oraclePrice: number | null;
  oracleConfidence: number | null;
  oraclePublishTimeMs: number | null;
  oraclePostedSlot: number | null;
  markPrice: number | null;
  markPriceTwap: number | null;
  markPriceTwapUpdatedAtMs: number | null;
  mmOraclePrice: number | null;
  fundingRatePerHourPercent: number | null;
  fundingRatePerHourFraction: number | null;
  last24hAvgFundingRatePerHourPercent: number | null;
  fundingPeriodSeconds: number | null;
  lastFundingRateRaw: string;
  openInterestBase: number | null;
  openInterestNotionalUsd: number | null;
  netBaseAssetAmount: number | null;
  maxOpenInterestBase: number | null;
  marginRatioInitial: number | null;
  marginRatioMaintenance: number | null;
  maxLeverage: number | null;
  status: string;
  contractTier: string;
  pausedOperationsMask: number;
  ammLastUpdateSlot: number;
  accountDataLength: number;
}

export type DriftRpcCaller = (
  endpoint: string,
  method: string,
  params: unknown[]
) => Promise<unknown>;

export interface DriftPerpMarketFetchDependencies {
  rpcCaller?: DriftRpcCaller;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

async function rpc(endpoint: string, method: string, params: unknown[]): Promise<unknown> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: `insight-solana-perp-guard-${method}`,
      method,
      params,
    }),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) throw new Error(`RPC ${method} returned HTTP ${response.status}`);
  const body: unknown = await response.json();
  if (!isRecord(body) || body.error !== undefined || !('result' in body)) {
    throw new Error(`RPC ${method} returned an invalid response`);
  }
  return body.result;
}

/** Read one account (base64) from a verified Solana mainnet endpoint. */
async function fetchMainnetAccount(
  address: string,
  endpoints: string[],
  rpcCaller: DriftRpcCaller
): Promise<Uint8Array | null> {
  let last: unknown;
  for (const endpoint of endpoints) {
    try {
      const genesis = await rpcCaller(endpoint, 'getGenesisHash', []);
      if (genesis !== SOLANA_MAINNET_GENESIS_HASH) {
        throw new Error(`RPC endpoint is not Solana mainnet (genesis ${String(genesis)})`);
      }
      const result = await rpcCaller(endpoint, 'getAccountInfo', [
        address,
        { encoding: 'base64', commitment: 'confirmed' },
      ]);
      if (!isRecord(result)) {
        throw new Error('RPC returned no account information');
      }
      // A missing account is a valid Solana response (value: null); callers
      // decide whether that is fatal (market) or nullable (oracle).
      if (result.value === null) return null;
      if (!isRecord(result.value) || !Array.isArray(result.value.data)) {
        throw new Error('RPC returned no account information');
      }
      const [encoded, encoding] = result.value.data as [string, string];
      if (encoded === undefined || encoding !== 'base64') {
        throw new Error('RPC account payload is malformed');
      }
      return Uint8Array.from(Buffer.from(encoded, 'base64'));
    } catch (error) {
      last = error;
    }
  }
  throw new Error(last instanceof Error ? last.message : 'All Solana RPC account reads failed');
}

/** little-endian unsigned integer read of up to 16 bytes. */
function readUintLE(data: Uint8Array, offset: number, size: number): bigint {
  let result = 0n;
  for (let i = size - 1; i >= 0; i -= 1) {
    result = (result << 8n) | BigInt(data[offset + i] ?? 0);
  }
  return result;
}

function readIntLE(data: Uint8Array, offset: number, size: number): bigint {
  return BigInt.asIntN(size * 8, readUintLE(data, offset, size));
}

export interface DriftPerpMarketDecoded {
  marketIndex: number;
  marketName: string;
  ammOracleAddress: string;
  ammOracleSource: number;
  ammBaseAssetReserve: bigint;
  ammQuoteAssetReserve: bigint;
  ammSqrtK: bigint;
  ammPegMultiplier: bigint;
  markPriceScaled6: bigint | null;
  ammBaseAssetAmountLong: bigint;
  ammBaseAssetAmountShort: bigint;
  ammMaxOpenInterest: bigint;
  ammLastFundingRate: bigint;
  ammLast24hAvgFundingRate: bigint;
  ammFundingPeriod: bigint;
  ammLastMarkPriceTwap: bigint;
  ammLastMarkPriceTwapTs: bigint;
  ammMmOraclePrice: bigint;
  ammLastUpdateSlot: bigint;
  marginRatioInitial: number;
  marginRatioMaintenance: number;
  status: number;
  contractTier: number;
  pausedOperationsMask: number;
  accountDataLength: number;
}

/**
 * Decode a Drift v2 PerpMarket account. Returns null when the discriminator
 * or length does not match the reviewed layout (fail closed).
 */
export function decodeDriftPerpMarketAccount(data: Uint8Array): DriftPerpMarketDecoded | null {
  if (data.length < 1216 || !bytesEqual(data.subarray(0, 8), DRIFT_PERP_MARKET_DISCRIMINATOR)) {
    return null;
  }
  const post = data.subarray(8);
  const read = (offset: number, size: number) => readIntLE(post, offset, size);
  const baseReserve = read(PERP_MARKET_OFFSETS.ammBaseAssetReserve, 16);
  const quoteReserve = read(PERP_MARKET_OFFSETS.ammQuoteAssetReserve, 16);
  const sqrtK = read(PERP_MARKET_OFFSETS.ammSqrtK, 16);
  const pegMultiplier = read(PERP_MARKET_OFFSETS.ammPegMultiplier, 16);
  // markPrice (1e6) = quoteReserve * pegMultiplier / baseReserve, in BigInt so
  // u128 magnitudes never pass through float before the final scaling.
  const markPriceScaled6 = baseReserve > 0n ? (quoteReserve * pegMultiplier) / baseReserve : null;
  const long = read(PERP_MARKET_OFFSETS.ammBaseAssetAmountLong, 16);
  const short = read(PERP_MARKET_OFFSETS.ammBaseAssetAmountShort, 16);
  const maxOpenInterest = read(PERP_MARKET_OFFSETS.ammMaxOpenInterest, 16);
  const nameBytes = post.subarray(PERP_MARKET_OFFSETS.name, PERP_MARKET_OFFSETS.name + 32);
  return {
    marketIndex: Number(readUintLE(post, PERP_MARKET_OFFSETS.marketIndex, 2)),
    marketName: decodeAscii(nameBytes),
    ammOracleAddress: base58(
      post.subarray(PERP_MARKET_OFFSETS.ammOracle, PERP_MARKET_OFFSETS.ammOracle + 32)
    ),
    ammOracleSource: post[PERP_MARKET_OFFSETS.ammOracleSource] ?? -1,
    ammBaseAssetReserve: baseReserve,
    ammQuoteAssetReserve: quoteReserve,
    ammSqrtK: sqrtK,
    ammPegMultiplier: pegMultiplier,
    markPriceScaled6,
    ammBaseAssetAmountLong: long,
    ammBaseAssetAmountShort: short,
    ammMaxOpenInterest: maxOpenInterest,
    ammLastFundingRate: read(PERP_MARKET_OFFSETS.ammLastFundingRate, 8),
    ammLast24hAvgFundingRate: read(PERP_MARKET_OFFSETS.ammLast24hAvgFundingRate, 8),
    ammFundingPeriod: read(PERP_MARKET_OFFSETS.ammFundingPeriod, 8),
    ammLastMarkPriceTwap: read(PERP_MARKET_OFFSETS.ammLastMarkPriceTwap, 8),
    ammLastMarkPriceTwapTs: read(PERP_MARKET_OFFSETS.ammLastMarkPriceTwapTs, 8),
    ammMmOraclePrice: read(PERP_MARKET_OFFSETS.ammMmOraclePrice, 8),
    ammLastUpdateSlot: read(PERP_MARKET_OFFSETS.ammLastUpdateSlot, 8),
    marginRatioInitial: Number(readUintLE(post, PERP_MARKET_OFFSETS.marginRatioInitial, 4)),
    marginRatioMaintenance: Number(readUintLE(post, PERP_MARKET_OFFSETS.marginRatioMaintenance, 4)),
    status: post[PERP_MARKET_OFFSETS.status] ?? -1,
    contractTier: post[PERP_MARKET_OFFSETS.contractTier] ?? -1,
    pausedOperationsMask: post[PERP_MARKET_OFFSETS.pausedOperations] ?? 0,
    accountDataLength: data.length,
  };
}

/**
 * Decode a Drift PythLazerOracle account (the reviewed oracle source for the
 * reviewed majors). Returns null on any layout mismatch (fail closed).
 */
export function decodePythLazerOracleAccount(
  data: Uint8Array
): { price: number; confidence: number; publishTimeMs: number; postedSlot: number } | null {
  if (data.length < 48 || !bytesEqual(data.subarray(0, 8), PYTH_LAZER_ORACLE_DISCRIMINATOR)) {
    return null;
  }
  const exponent = Number(readIntLE(data, PYTH_LAZER_ORACLE_OFFSETS.exponent, 4));
  if (exponent !== -8) return null;
  const price = Number(readIntLE(data, PYTH_LAZER_ORACLE_OFFSETS.price, 8));
  const confidence = Number(readUintLE(data, PYTH_LAZER_ORACLE_OFFSETS.confidence, 8));
  const publishTimeMicros = Number(readUintLE(data, PYTH_LAZER_ORACLE_OFFSETS.publishTime, 8));
  if (!Number.isFinite(price)) return null;
  return {
    price: price / 1e8,
    confidence: confidence / 1e8,
    publishTimeMs: publishTimeMicros / 1_000,
    postedSlot: Number(readUintLE(data, PYTH_LAZER_ORACLE_OFFSETS.postedSlot, 8)),
  };
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function decodeAscii(bytes: Uint8Array): string {
  let end = bytes.length;
  for (let i = 0; i < bytes.length; i += 1) {
    if (bytes[i] === 0) {
      end = i;
      break;
    }
  }
  return Buffer.from(bytes.subarray(0, end)).toString('ascii');
}

/** Minimal base58 encoder for the oracle pubkey (32-byte Ed25519 curve point). */
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function base58(bytes: Uint8Array): string {
  const digits: number[] = [0];
  for (const byte of bytes) {
    let carry = byte;
    for (let i = 0; i < digits.length; i += 1) {
      carry += digits[i] * 256;
      digits[i] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = Math.floor(carry / 58);
    }
  }
  let start = 0;
  while (start < digits.length - 1 && digits[start] === 0) start += 1;
  const zeros = [...bytes].findIndex((b) => b !== 0);
  let prefix = '';
  if (zeros > 0) {
    for (let i = 0; i < zeros; i += 1) prefix += '1';
  }
  return (
    prefix +
    digits
      .slice(start)
      .reverse()
      .map((d) => BASE58_ALPHABET[d])
      .join('')
  );
}

async function derivePerpMarketAddress(marketIndex: number): Promise<Address> {
  const seed = new Uint8Array(2);
  seed[0] = marketIndex & 0xff;
  seed[1] = (marketIndex >> 8) & 0xff;
  const [address] = await getProgramDerivedAddress({
    programAddress: DRIFT_V2_MAINNET_PROGRAM_ID as Address,
    seeds: [new TextEncoder().encode('perp_market'), seed],
  });
  return address;
}

/**
 * Fetch and decode one reviewed Drift perp market plus its on-chain oracle.
 * Every field that cannot be observed or decoded stays explicitly null.
 */
export async function fetchDriftPerpMarketEvidence(
  market: ReviewedDriftPerpMarket,
  dependencies: DriftPerpMarketFetchDependencies = {}
): Promise<DriftPerpMarketEvidence> {
  const rpcCaller = dependencies.rpcCaller ?? rpc;
  const endpoints = getRpcEndpoints(0);
  if (!endpoints || endpoints.length === 0) {
    throw new Error('No Solana mainnet RPC endpoint is configured');
  }

  const marketAddress = await derivePerpMarketAddress(market.marketIndex);
  const marketData = await fetchMainnetAccount(marketAddress, endpoints, rpcCaller);
  if (!marketData) {
    throw new Error(`Drift perp market account ${marketAddress} not found on Solana mainnet`);
  }
  const decodedMarket = decodeDriftPerpMarketAccount(marketData);
  if (!decodedMarket) {
    throw new Error(
      'Drift perp market account does not match the reviewed on-chain layout (fail closed)'
    );
  }

  const oracleSourceName = DRIFT_ORACLE_SOURCES[decodedMarket.ammOracleSource] ?? 'unknown';
  const oracleSourceSupported = DRIFT_SUPPORTED_ORACLE_SOURCES.has(oracleSourceName);

  let oraclePrice: number | null = null;
  let oracleConfidence: number | null = null;
  let oraclePublishTimeMs: number | null = null;
  let oraclePostedSlot: number | null = null;
  let oracleAccountAddress: string | null = null;
  if (oracleSourceSupported) {
    oracleAccountAddress = decodedMarket.ammOracleAddress;
    const oracleData = await fetchMainnetAccount(oracleAccountAddress, endpoints, rpcCaller);
    // A missing oracle account is not fatal: the oracle fields stay null and
    // the guard fails closed on the null deviation instead.
    const decodedOracle = oracleData === null ? null : decodePythLazerOracleAccount(oracleData);
    if (decodedOracle) {
      oraclePrice = decodedOracle.price;
      oracleConfidence = decodedOracle.confidence;
      oraclePublishTimeMs = decodedOracle.publishTimeMs;
      oraclePostedSlot = decodedOracle.postedSlot;
    }
  }

  const markPriceScaled6 = decodedMarket.markPriceScaled6;
  const markPrice = markPriceScaled6 === null ? null : Number(markPriceScaled6) / 1e6;
  const openInterestBase =
    decodedMarket.ammBaseAssetAmountLong - decodedMarket.ammBaseAssetAmountShort;
  const maxOpenInterestBase = Number(decodedMarket.ammMaxOpenInterest) / 1e9;
  const lastFundingRateRaw = decodedMarket.ammLastFundingRate.toString();
  const last24hRaw = Number(decodedMarket.ammLast24hAvgFundingRate);
  const marginRatioInitial = decodedMarket.marginRatioInitial / 10_000;
  const marginRatioMaintenance = decodedMarket.marginRatioMaintenance / 10_000;
  const twapTsSeconds = Number(decodedMarket.ammLastMarkPriceTwapTs);
  const openInterestNotionalUsd =
    markPrice !== null ? (Number(openInterestBase) / 1e9) * markPrice : null;

  return {
    marketIndex: decodedMarket.marketIndex,
    marketName: decodedMarket.marketName,
    marketAccountAddress: marketAddress,
    oracleSource: oracleSourceName,
    oracleSourceSupported,
    oracleAccountAddress,
    oraclePrice,
    oracleConfidence,
    oraclePublishTimeMs,
    oraclePostedSlot,
    markPrice,
    markPriceTwap: Number(decodedMarket.ammLastMarkPriceTwap) / 1e6,
    markPriceTwapUpdatedAtMs: twapTsSeconds > 0 ? twapTsSeconds * 1_000 : null,
    mmOraclePrice: Number(decodedMarket.ammMmOraclePrice) / 1e6,
    fundingRatePerHourPercent: Number(lastFundingRateRaw) / 1e6,
    fundingRatePerHourFraction: Number(lastFundingRateRaw) / 1e8,
    last24hAvgFundingRatePerHourPercent: last24hRaw / 1e6,
    fundingPeriodSeconds: Number(decodedMarket.ammFundingPeriod),
    lastFundingRateRaw,
    openInterestBase: Number(openInterestBase) / 1e9,
    openInterestNotionalUsd,
    netBaseAssetAmount:
      (Number(decodedMarket.ammBaseAssetAmountLong) +
        Number(decodedMarket.ammBaseAssetAmountShort)) /
      1e9,
    maxOpenInterestBase,
    marginRatioInitial,
    marginRatioMaintenance,
    maxLeverage: marginRatioInitial > 0 ? 1 / marginRatioInitial : null,
    status:
      DRIFT_MARKET_STATUSES[decodedMarket.status] ?? `unknown(${String(decodedMarket.status)})`,
    contractTier:
      DRIFT_CONTRACT_TIERS[decodedMarket.contractTier] ??
      `unknown(${String(decodedMarket.contractTier)})`,
    pausedOperationsMask: decodedMarket.pausedOperationsMask,
    ammLastUpdateSlot: Number(decodedMarket.ammLastUpdateSlot),
    accountDataLength: decodedMarket.accountDataLength,
  };
}

export { SOLANA_MAINNET_CAIP2 };
