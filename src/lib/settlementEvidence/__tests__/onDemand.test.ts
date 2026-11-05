/**
 * On-demand settlement-evidence grade (`buildOrFetchEvidencePackForSlug`).
 *
 * Unit boundary: gating (cached / not_found / too_early / unresolved /
 * too_old), persistence, signing, and inconsistent-alerting. Grading itself
 * runs through the REAL engine (same fixtures style as `engine.test.ts`) so
 * the paid path and the cron path are proven to share one grading pipeline.
 * Only the repository, signer, and alert sink are mocked.
 */

import * as alerts from '../alerts';
import { buildOrFetchEvidencePackForSlug, DEFAULT_LOOKBACK_HOURS } from '../collector';
import * as repository from '../repository';
import * as signing from '../signing';

import type { SettlementCandle, SettlementEvidencePack, SettlementMarketWatchRow } from '../types';

jest.mock('../repository', () => ({
  ensureSettlementEvidenceSchema: jest.fn(),
  getCandleMeta: jest.fn(async () => ({
    venue: 'kraken',
    intervalSeconds: 60,
    rightsScope: 'vendor-licensed',
    deliveryPolicy: 'derived-analytics-only',
  })),
  getEvidencePack: jest.fn(),
  getOracleConsensusObservations: jest.fn(async () => []),
  getSettlementCandles: jest.fn(async () => []),
  getWatchMarket: jest.fn(),
  listRecentlySettledWatchMarkets: jest.fn(async () => []),
  upsertEvidencePack: jest.fn(),
  upsertSettlementCandles: jest.fn(),
  upsertWatchMarkets: jest.fn(),
}));

jest.mock('../signing', () => ({
  signSettlementEvidence: jest.fn(async () => null),
}));

jest.mock('../alerts', () => ({
  sendInconsistentAlerts: jest.fn(async () => 1),
}));

const mocked = {
  getEvidencePack: jest.mocked(repository.getEvidencePack),
  getWatchMarket: jest.mocked(repository.getWatchMarket),
  getSettlementCandles: jest.mocked(repository.getSettlementCandles),
  getOracleConsensusObservations: jest.mocked(repository.getOracleConsensusObservations),
  upsertEvidencePack: jest.mocked(repository.upsertEvidencePack),
  signSettlementEvidence: jest.mocked(signing.signSettlementEvidence),
  sendInconsistentAlerts: jest.mocked(alerts.sendInconsistentAlerts),
};

const NOW_MS = 1_800_000_000_000;
const HOUR_MS = 60 * 60 * 1000;
const WINDOW_END_MS = NOW_MS - 2 * HOUR_MS;
const WINDOW_START_MS = WINDOW_END_MS - 5 * 60 * 1000;
const SLUG = 'btc-updown-5m-2026-11-05';

function candleAtMinuteOffset(minutes: number, open: number, close: number): SettlementCandle {
  return {
    bucketTs: Math.floor(WINDOW_START_MS / 1000) + minutes * 60,
    open,
    high: Math.max(open, close),
    low: Math.min(open, close),
    close,
    volume: 1,
  };
}

function watchRow(overrides: Partial<SettlementMarketWatchRow> = {}): SettlementMarketWatchRow {
  return {
    marketSlug: SLUG,
    gammaId: 'gamma-1',
    question: 'Bitcoin Up or Down — 5m window',
    asset: 'BTC',
    windowSeconds: 300,
    windowStartMs: WINDOW_START_MS,
    windowEndMs: WINDOW_END_MS,
    settlementVenue: 'chainlink-stream',
    resolutionSourceUrl: 'https://data.chain.link/streams/btc-usd',
    closed: true,
    declaredOutcome: 'Up',
    outcomePricesJson: '["1","0"]',
    firstSeenMs: NOW_MS - 24 * HOUR_MS,
    updatedAtMs: NOW_MS - HOUR_MS,
    ...overrides,
  };
}

const CACHED_PACK = { payloadHash: '0x' + 'b'.repeat(64) } as unknown as SettlementEvidencePack;

const RISING_CANDLES = [0, 1, 2, 3, 4].map((m) => candleAtMinuteOffset(m, 100 + m, 101 + m));

const CANDLE_META = {
  venue: 'kraken',
  intervalSeconds: 60,
  rightsScope: 'vendor-licensed' as const,
  deliveryPolicy: 'derived-analytics-only',
};

beforeEach(() => {
  // jest.config.js sets `resetMocks: true`, which also wipes factory-inlined
  // implementations — every mock therefore gets its default here.
  jest.mocked(repository.getCandleMeta).mockResolvedValue(CANDLE_META);
  mocked.getEvidencePack.mockResolvedValue(null);
  mocked.getWatchMarket.mockResolvedValue(watchRow());
  mocked.getSettlementCandles.mockResolvedValue(RISING_CANDLES);
  mocked.getOracleConsensusObservations.mockResolvedValue([]);
  mocked.signSettlementEvidence.mockResolvedValue(null);
});

describe('buildOrFetchEvidencePackForSlug', () => {
  it('returns the persisted pack as cached without touching the watch list', async () => {
    mocked.getEvidencePack.mockResolvedValue(CACHED_PACK);

    const result = await buildOrFetchEvidencePackForSlug(SLUG, { nowMs: NOW_MS });

    expect(result).toEqual({ status: 'cached', pack: CACHED_PACK });
    expect(mocked.getWatchMarket).not.toHaveBeenCalled();
    expect(mocked.upsertEvidencePack).not.toHaveBeenCalled();
  });

  it('returns not_found when the slug was never watched', async () => {
    mocked.getWatchMarket.mockResolvedValue(null);

    const result = await buildOrFetchEvidencePackForSlug('unknown-slug', { nowMs: NOW_MS });

    expect(result).toEqual({ status: 'not_found', reason: 'WATCH_MARKET_NOT_FOUND' });
    expect(mocked.upsertEvidencePack).not.toHaveBeenCalled();
  });

  it('returns too_early inside the resolution grace period', async () => {
    mocked.getWatchMarket.mockResolvedValue(watchRow({ windowEndMs: NOW_MS - 60 * 1000 }));

    const result = await buildOrFetchEvidencePackForSlug(SLUG, { nowMs: NOW_MS });

    expect(result).toEqual({ status: 'too_early', reason: 'WINDOW_NOT_RESOLVED' });
  });

  it('returns unresolved when the market has no declared outcome yet', async () => {
    mocked.getWatchMarket.mockResolvedValue(watchRow({ declaredOutcome: null }));

    const result = await buildOrFetchEvidencePackForSlug(SLUG, { nowMs: NOW_MS });

    expect(result).toEqual({ status: 'unresolved', reason: 'MARKET_UNRESOLVED' });
  });

  it('returns too_old beyond the candle source retention window', async () => {
    // Grace has elapsed (window ended 13h ago) but the window start is older
    // than the ~11h candle retention.
    const windowEndMs = NOW_MS - 13 * HOUR_MS;
    mocked.getWatchMarket.mockResolvedValue(
      watchRow({ windowStartMs: windowEndMs - 5 * 60 * 1000, windowEndMs })
    );

    const result = await buildOrFetchEvidencePackForSlug(SLUG, { nowMs: NOW_MS });

    expect(result).toEqual({ status: 'too_old', reason: 'WINDOW_TOO_OLD' });
  });

  it('builds, signs, and persists a fresh pack through the real engine', async () => {
    const result = await buildOrFetchEvidencePackForSlug(SLUG, { nowMs: NOW_MS });

    expect(result.status).toBe('built');
    if (result.status !== 'built') throw new Error('unreachable');
    expect(result.grade).toBe('consistent');
    expect(result.signed).toBe(false);
    // computePayloadHash digests bare hex (no 0x prefix) — sha256 of the
    // canonical JSON.
    expect(result.pack.payloadHash).toMatch(/^[0-9a-f]{64}$/);
    expect(mocked.upsertEvidencePack).toHaveBeenCalledTimes(1);
    expect(mocked.upsertEvidencePack.mock.calls[0]?.[0]?.grade).toBe('consistent');
    expect(mocked.signSettlementEvidence).toHaveBeenCalledTimes(1);
    expect(mocked.sendInconsistentAlerts).not.toHaveBeenCalled();
  });

  it('grades through the real engine as inconsistent when the declared side diverges', async () => {
    mocked.getWatchMarket.mockResolvedValue(watchRow({ declaredOutcome: 'Down' }));

    const result = await buildOrFetchEvidencePackForSlug(SLUG, { nowMs: NOW_MS });

    expect(result.status).toBe('built');
    if (result.status !== 'built') throw new Error('unreachable');
    expect(result.grade).toBe('inconsistent');
    expect(mocked.upsertEvidencePack).toHaveBeenCalledTimes(1);
    expect(mocked.sendInconsistentAlerts).toHaveBeenCalledTimes(1);
    expect(mocked.sendInconsistentAlerts.mock.calls[0]?.[0]).toHaveLength(1);
    expect(mocked.sendInconsistentAlerts.mock.calls[0]?.[0]?.[0]?.marketSlug).toBe(SLUG);
  });

  it('propagates infrastructure failures instead of swallowing them', async () => {
    mocked.getSettlementCandles.mockRejectedValue(new Error('store unavailable'));

    await expect(buildOrFetchEvidencePackForSlug(SLUG, { nowMs: NOW_MS })).rejects.toThrow(
      'store unavailable'
    );
  });

  it('keeps the lookback default in sync with the scheduled collector', () => {
    // Guard against silent drift between the paid on-demand gates and the
    // cron path this suite claims to mirror.
    expect(DEFAULT_LOOKBACK_HOURS).toBe(12);
  });
});
