import { webcrypto } from 'node:crypto';

import {
  DRIFT_PERP_MARKET_DISCRIMINATOR,
  DRIFT_SUPPORTED_ORACLE_SOURCES,
  PERP_MARKET_OFFSETS,
  PYTH_LAZER_ORACLE_DISCRIMINATOR,
  PYTH_LAZER_ORACLE_OFFSETS,
  REVIEWED_DRIFT_PERP_MARKETS,
  SOLANA_MAINNET_GENESIS_HASH,
  decodeDriftPerpMarketAccount,
  decodePythLazerOracleAccount,
  fetchDriftPerpMarketEvidence,
  findReviewedDriftPerpMarket,
} from '../driftPerpMarket';

import type { DriftRpcCaller } from '../driftPerpMarket';

// @solana/kit's PDA derivation needs a secure context with WebCrypto, which
// the jsdom test environment does not expose.
if (!(globalThis as { isSecureContext?: boolean }).isSecureContext) {
  Object.defineProperty(globalThis, 'isSecureContext', { value: true, configurable: true });
}
if (!(globalThis.crypto as Crypto | undefined)?.subtle) {
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto, configurable: true });
}

/** Anchor accounts prefix their borsh payload with the 8-byte discriminator. */
const POST = 8;
const MARKET_ACCOUNT_LENGTH = 1216;

interface FixtureWriters {
  u128: (offset: number, value: bigint) => void;
  i64: (offset: number, value: bigint) => void;
  u64: (offset: number, value: bigint) => void;
  u32: (offset: number, value: number) => void;
  u16: (offset: number, value: number) => void;
  u8: (offset: number, value: number) => void;
  ascii: (offset: number, text: string) => void;
}

/** Perp-market offsets are relative to the discriminator; oracle offsets are absolute. */
function makeWriters(data: Uint8Array, offsetBase: number): FixtureWriters {
  const view = new DataView(data.buffer);
  return {
    u128: (offset, value) => {
      view.setBigUint64(offsetBase + offset, value & 0xffff_ffff_ffff_ffffn, true);
      view.setBigUint64(offsetBase + offset + 8, value >> 64n, true);
    },
    i64: (offset, value) => view.setBigUint64(offsetBase + offset, BigInt.asUintN(64, value), true),
    u64: (offset, value) => view.setBigUint64(offsetBase + offset, BigInt.asUintN(64, value), true),
    u32: (offset, value) => view.setUint32(offsetBase + offset, value, true),
    u16: (offset, value) => view.setUint16(offsetBase + offset, value, true),
    u8: (offset, value) => {
      data[offsetBase + offset] = value;
    },
    ascii: (offset, text) => data.set(Buffer.from(text, 'ascii'), offsetBase + offset),
  };
}

/** Defaults reproduce a BTC-PERP-shaped AMM: mark = quote * peg / base = 68_000. */
function perpMarketFixture(apply?: (writers: FixtureWriters) => void): Uint8Array {
  const data = new Uint8Array(MARKET_ACCOUNT_LENGTH);
  data.set(DRIFT_PERP_MARKET_DISCRIMINATOR, 0);
  const writers = makeWriters(data, POST);
  writers.u128(PERP_MARKET_OFFSETS.ammBaseAssetReserve, 100_000_000_000n);
  writers.u128(PERP_MARKET_OFFSETS.ammQuoteAssetReserve, 6_800_000_000_000_000n);
  writers.u128(PERP_MARKET_OFFSETS.ammSqrtK, 26_076_809_621_000n);
  writers.u128(PERP_MARKET_OFFSETS.ammPegMultiplier, 1_000_000n);
  writers.u128(PERP_MARKET_OFFSETS.ammBaseAssetAmountLong, 150_000_000_000n);
  writers.u128(PERP_MARKET_OFFSETS.ammBaseAssetAmountShort, BigInt.asUintN(128, -50_000_000_000n));
  writers.u128(PERP_MARKET_OFFSETS.ammMaxOpenInterest, 1_000_000_000n);
  writers.i64(PERP_MARKET_OFFSETS.ammLastFundingRate, -5_000_000n);
  writers.i64(PERP_MARKET_OFFSETS.ammLast24hAvgFundingRate, 4_000_000n);
  writers.i64(PERP_MARKET_OFFSETS.ammLastMarkPriceTwap, 68_001_000_000n);
  writers.i64(PERP_MARKET_OFFSETS.ammMmOraclePrice, 68_000_000_000n);
  writers.u64(PERP_MARKET_OFFSETS.ammLastUpdateSlot, 123_456_789n);
  writers.u64(PERP_MARKET_OFFSETS.ammLastMarkPriceTwapTs, 1_792_252_800n);
  writers.u64(PERP_MARKET_OFFSETS.ammFundingPeriod, 3_600n);
  writers.u8(PERP_MARKET_OFFSETS.ammOracleSource, 12);
  writers.ascii(PERP_MARKET_OFFSETS.name, 'BTC-PERP');
  writers.u32(PERP_MARKET_OFFSETS.marginRatioInitial, 500);
  writers.u32(PERP_MARKET_OFFSETS.marginRatioMaintenance, 250);
  writers.u16(PERP_MARKET_OFFSETS.marketIndex, 1);
  writers.u8(PERP_MARKET_OFFSETS.status, 1);
  writers.u8(PERP_MARKET_OFFSETS.contractType, 0);
  writers.u8(PERP_MARKET_OFFSETS.contractTier, 0);
  writers.u8(PERP_MARKET_OFFSETS.pausedOperations, 0);
  for (let i = 0; i < 32; i += 1) {
    data[POST + PERP_MARKET_OFFSETS.ammOracle + i] = i + 1;
  }
  apply?.(writers);
  return data;
}

function pythLazerFixture(apply?: (writers: FixtureWriters) => void): Uint8Array {
  const data = new Uint8Array(48);
  data.set(PYTH_LAZER_ORACLE_DISCRIMINATOR, 0);
  const writers = makeWriters(data, 0);
  writers.i64(PYTH_LAZER_ORACLE_OFFSETS.price, 6_800_000_000_000n);
  writers.u64(PYTH_LAZER_ORACLE_OFFSETS.publishTime, 1_792_252_800_000_000n);
  writers.u64(PYTH_LAZER_ORACLE_OFFSETS.postedSlot, 123n);
  writers.u32(PYTH_LAZER_ORACLE_OFFSETS.exponent, 0xffff_fff8);
  writers.u64(PYTH_LAZER_ORACLE_OFFSETS.confidence, 12_000_000_000n);
  apply?.(writers);
  return data;
}

/** Returns getGenesisHash, then hands out the queued account payloads in order. */
function makeRpcCaller(accounts: Array<Uint8Array | null>): DriftRpcCaller {
  let accountCalls = 0;
  return async (_endpoint, method) => {
    if (method === 'getGenesisHash') return SOLANA_MAINNET_GENESIS_HASH;
    if (method === 'getAccountInfo') {
      const data = accounts[accountCalls];
      accountCalls += 1;
      if (data === undefined || data === null) return { value: null };
      return { value: { data: [Buffer.from(data).toString('base64'), 'base64'] } };
    }
    throw new Error(`unexpected RPC method ${method}`);
  };
}

describe('decodeDriftPerpMarketAccount', () => {
  it('decodes the reviewed Anchor layout of a live BTC-PERP-shaped account', () => {
    const decoded = decodeDriftPerpMarketAccount(perpMarketFixture());

    expect(decoded).not.toBeNull();
    expect(decoded?.marketIndex).toBe(1);
    expect(decoded?.marketName).toBe('BTC-PERP');
    expect(decoded?.ammOracleAddress).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
    expect(decoded?.ammOracleSource).toBe(12);
    // markPrice (1e6) = quoteReserve * pegMultiplier / baseReserve.
    expect(decoded?.markPriceScaled6).toBe(68_000_000_000n);
    expect(decoded?.ammBaseAssetAmountLong).toBe(150_000_000_000n);
    expect(decoded?.ammBaseAssetAmountShort).toBe(-50_000_000_000n);
    expect(decoded?.ammMaxOpenInterest).toBe(1_000_000_000n);
    // Funding rates are stored as signed i64 percent-per-hour times 1e6.
    expect(decoded?.ammLastFundingRate).toBe(-5_000_000n);
    expect(decoded?.ammLast24hAvgFundingRate).toBe(4_000_000n);
    expect(decoded?.ammLastMarkPriceTwap).toBe(68_001_000_000n);
    expect(decoded?.ammFundingPeriod).toBe(3_600n);
    expect(decoded?.ammLastUpdateSlot).toBe(123_456_789n);
    expect(decoded?.marginRatioInitial).toBe(500);
    expect(decoded?.marginRatioMaintenance).toBe(250);
    expect(decoded?.status).toBe(1);
    expect(decoded?.contractTier).toBe(0);
    expect(decoded?.pausedOperationsMask).toBe(0);
    expect(decoded?.accountDataLength).toBe(MARKET_ACCOUNT_LENGTH);
  });

  it('fails closed on a wrong discriminator or a truncated payload', () => {
    const wrongDiscriminator = perpMarketFixture();
    wrongDiscriminator[0] ^= 0xff;
    expect(decodeDriftPerpMarketAccount(wrongDiscriminator)).toBeNull();
    expect(
      decodeDriftPerpMarketAccount(perpMarketFixture().subarray(0, MARKET_ACCOUNT_LENGTH - 1))
    ).toBeNull();
  });
});

describe('decodePythLazerOracleAccount', () => {
  it('decodes the 48-byte Drift-owned Pyth Lazer mirror', () => {
    const decoded = decodePythLazerOracleAccount(pythLazerFixture());

    expect(decoded).toEqual({
      price: 68_000,
      confidence: 120,
      publishTimeMs: 1_792_252_800_000,
      postedSlot: 123,
    });
  });

  it('fails closed on a wrong discriminator, short payload, or foreign exponent', () => {
    const wrongDiscriminator = pythLazerFixture();
    wrongDiscriminator[7] ^= 0xff;
    expect(decodePythLazerOracleAccount(wrongDiscriminator)).toBeNull();
    expect(decodePythLazerOracleAccount(pythLazerFixture().subarray(0, 47))).toBeNull();
    const foreignExponent = pythLazerFixture((writers) =>
      writers.u32(PYTH_LAZER_ORACLE_OFFSETS.exponent, 0xffff_fffa)
    );
    expect(decodePythLazerOracleAccount(foreignExponent)).toBeNull();
  });
});

describe('findReviewedDriftPerpMarket', () => {
  it('maps reviewed symbols and symbols with a -PERP suffix onto on-chain indexes', () => {
    expect(findReviewedDriftPerpMarket('BTC-PERP')?.marketIndex).toBe(1);
    expect(findReviewedDriftPerpMarket('eth')?.marketIndex).toBe(2);
    expect(findReviewedDriftPerpMarket(' SOL ')?.marketIndex).toBe(0);
    expect(findReviewedDriftPerpMarket('DOGE')).toBeNull();
  });

  it('keeps the reviewed set on the empirically verified indexes', () => {
    expect(REVIEWED_DRIFT_PERP_MARKETS.map((market) => market.marketIndex)).toEqual([0, 1, 2]);
    expect(DRIFT_SUPPORTED_ORACLE_SOURCES.has('pythLazer')).toBe(true);
  });
});

describe('fetchDriftPerpMarketEvidence', () => {
  const market = findReviewedDriftPerpMarket('BTC-PERP');
  expect(market).not.toBeNull();

  it('assembles fail-closed numeric evidence from the market and oracle accounts', async () => {
    const evidence = await fetchDriftPerpMarketEvidence(market!, {
      rpcCaller: makeRpcCaller([perpMarketFixture(), pythLazerFixture()]),
    });

    expect(evidence.markPrice).toBe(68_000);
    expect(evidence.oraclePrice).toBe(68_000);
    expect(evidence.oracleSource).toBe('pythLazer');
    expect(evidence.oracleSourceSupported).toBe(true);
    expect(evidence.oracleConfidence).toBe(120);
    expect(evidence.oraclePublishTimeMs).toBe(1_792_252_800_000);
    expect(evidence.markPriceTwap).toBe(68_001);
    expect(evidence.markPriceTwapUpdatedAtMs).toBe(1_792_252_800_000);
    // fundingRate = raw / 1e6 percent per hour; fraction = raw / 1e8.
    expect(evidence.fundingRatePerHourPercent).toBe(-5);
    expect(evidence.fundingRatePerHourFraction).toBe(-0.05);
    expect(evidence.last24hAvgFundingRatePerHourPercent).toBe(4);
    expect(evidence.fundingPeriodSeconds).toBe(3_600);
    // OI gross = long - short (short is stored negative); net = long + short.
    expect(evidence.openInterestBase).toBe(200);
    expect(evidence.openInterestNotionalUsd).toBeCloseTo(13_600_000, 6);
    expect(evidence.netBaseAssetAmount).toBe(100);
    expect(evidence.maxOpenInterestBase).toBe(1);
    expect(evidence.marginRatioInitial).toBe(0.05);
    expect(evidence.maxLeverage).toBe(20);
    expect(evidence.status).toBe('active');
    expect(evidence.contractTier).toBe('A');
    expect(evidence.marketName).toBe('BTC-PERP');
    expect(evidence.marketAccountAddress).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
    expect(evidence.oracleAccountAddress).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
    expect(evidence.lastFundingRateRaw).toBe('-5000000');
  });

  it('keeps oracle fields null when the oracle account is missing', async () => {
    const evidence = await fetchDriftPerpMarketEvidence(market!, {
      rpcCaller: makeRpcCaller([perpMarketFixture(), null]),
    });

    expect(evidence.oracleAccountAddress).not.toBeNull();
    expect(evidence.oraclePrice).toBeNull();
    expect(evidence.oracleConfidence).toBeNull();
    expect(evidence.markPrice).toBe(68_000);
  });

  it('throws when the market account itself is missing', async () => {
    await expect(
      fetchDriftPerpMarketEvidence(market!, {
        rpcCaller: makeRpcCaller([null]),
      })
    ).rejects.toThrow(/not found on Solana mainnet/);
  });

  it('throws when an endpoint is not Solana mainnet', async () => {
    const caller: DriftRpcCaller = async (_endpoint, method) => {
      if (method === 'getGenesisHash') return '4sUhgvypE8UtJZLgXUpspE6T9DnLYJqbul2vWUqcVUuh';
      throw new Error(`unexpected RPC method ${method}`);
    };

    await expect(fetchDriftPerpMarketEvidence(market!, { rpcCaller: caller })).rejects.toThrow(
      /not Solana mainnet/
    );
  });
});
