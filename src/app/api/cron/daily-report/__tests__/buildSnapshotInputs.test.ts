import { buildSnapshotInputs, buildFeedHealthUpdates, type BatchResultItem } from '../route';

// --- Mocks: the route file pulls in the full oracle/DB stack at import
// time. `buildSnapshotInputs` itself is pure, but we must stub these so the
// module loads without side effects and the test stays fast/isolated. ------

jest.mock('@/lib/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

jest.mock('@/lib/analytics/consensusPrice', () => ({
  calculateConsensusPrice: jest.fn(),
}));

jest.mock('@/lib/oracles/base/databaseOperations', () => ({
  fetchPriceWithDatabase: jest.fn(),
}));

jest.mock('@/lib/oracles/factory', () => ({ getDefaultFactory: jest.fn() }));

jest.mock('@/lib/oracles/utils/dynamicFeedResolver', () => ({
  getAllActiveFeedsByProvider: jest.fn(),
  matchesChainId: jest.fn(),
}));

jest.mock('@/lib/oracles/utils/oracleDataUtils', () => ({ extractBaseSymbol: jest.fn() }));

jest.mock('@/lib/reports/reportService', () => ({
  reportService: { upsertHourlySnapshots: jest.fn() },
  REPORT_ASSETS: ['BTC', 'ETH'] as const,
  REPORT_PROVIDERS: ['chainlink', 'pyth'] as const,
}));

jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: jest.fn(),
  getAdminQueries: jest.fn(),
}));

jest.mock('@/lib/utils/concurrency', () => ({ mapWithConcurrency: jest.fn() }));

// --- Fixtures ----------------------------------------------------------------

const NOW = new Date('2026-07-23T10:00:00Z').getTime();
const SNAPSHOT_HOUR = new Date('2026-07-23T10:00:00Z');

function priceItem(
  overrides: Partial<BatchResultItem> & { provider?: string; symbol?: string } = {}
): BatchResultItem {
  return {
    provider: overrides.provider ?? 'chainlink',
    symbol: overrides.symbol ?? 'BTC',
    price: {
      symbol: overrides.symbol ?? 'BTC',
      price: 60000,
      timestamp: NOW - 5_000,
      ingestionTimestamp: NOW - 5_000,
      provider: 'chainlink' as never,
      confidence: 0.99,
    },
    error: null,
    skipped: false,
    ...overrides,
  } as BatchResultItem;
}

describe('buildSnapshotInputs', () => {
  it('drops skipped items', () => {
    const results = [priceItem({ skipped: true }), priceItem({ symbol: 'ETH' })];
    const inputs = buildSnapshotInputs(results, {}, SNAPSHOT_HOUR, NOW);
    expect(inputs).toHaveLength(1);
    expect(inputs[0].symbol).toBe('ETH');
  });

  it('marks a successful fetch with price, consensus, and deviation', () => {
    const results = [priceItem({ provider: 'chainlink', symbol: 'BTC' })];
    const consensus = { BTC: { price: 60100 } };
    const inputs = buildSnapshotInputs(results, consensus, SNAPSHOT_HOUR, NOW);

    expect(inputs).toHaveLength(1);
    const input = inputs[0];
    expect(input.isSuccess).toBe(true);
    expect(input.price).toBe(60000);
    expect(input.consensusPrice).toBe(60100);
    // (60000 - 60100) / 60100 * 100 ≈ -0.1664
    expect(input.deviationPct).toBeCloseTo(-0.1664, 3);
    expect(input.errorMessage).toBeNull();
  });

  it('sets isSuccess=false and price=0 when the item carries an error', () => {
    // Real fetchBatchPrices sets price=null on error, so mirror that here.
    const results = [priceItem({ error: 'upstream timeout', price: null })];
    const inputs = buildSnapshotInputs(results, {}, SNAPSHOT_HOUR, NOW);

    expect(inputs[0].isSuccess).toBe(false);
    expect(inputs[0].price).toBe(0);
    expect(inputs[0].errorMessage).toBe('upstream timeout');
    // No consensus → no deviation
    expect(inputs[0].deviationPct).toBeNull();
  });

  it('leaves consensusPrice and deviationPct null when no consensus exists for the symbol', () => {
    const results = [priceItem({ symbol: 'ETH' })];
    const inputs = buildSnapshotInputs(results, { BTC: { price: 3000 } }, SNAPSHOT_HOUR, NOW);

    expect(inputs[0].consensusPrice).toBeNull();
    expect(inputs[0].deviationPct).toBeNull();
  });

  it('clamps deviation to the DECIMAL(10,4) range', () => {
    // price 1,200,000 vs consensus 60,000 → +1900% (exceeds MAX 9999.9999? no,
    // but use an extreme to force clamping on the negative side).
    const results = [
      priceItem({
        symbol: 'BTC',
        price: { symbol: 'BTC', price: 1, timestamp: NOW - 5_000, provider: 'chainlink' as never },
      }),
    ];
    // consensus 60,000 vs price 1 → (1 - 60000)/60000 * 100 ≈ -99.998% — not clamped.
    // Use a huge price to exceed +9999.9999 instead.
    const huge = [
      priceItem({
        symbol: 'BTC',
        price: {
          symbol: 'BTC',
          price: 6_000_000,
          timestamp: NOW - 5_000,
          provider: 'chainlink' as never,
        },
      }),
    ];
    const consensus = { BTC: { price: 1 } };
    // (6,000,000 - 1) / 1 * 100 = 599,999,900% → clamped to 9999.9999
    const inputs = buildSnapshotInputs(huge, consensus, SNAPSHOT_HOUR, NOW);
    expect(inputs[0].deviationPct).toBe(9999.9999);
    expect(results[0].price).toBeDefined();
  });

  it('computes dataAgeSeconds from the ingestion timestamp', () => {
    const results = [
      priceItem({
        price: {
          symbol: 'BTC',
          price: 60000,
          timestamp: NOW - 30_000,
          ingestionTimestamp: NOW - 30_000,
          provider: 'chainlink' as never,
        },
      }),
    ];
    const inputs = buildSnapshotInputs(results, {}, SNAPSHOT_HOUR, NOW);
    expect(inputs[0].dataAgeSeconds).toBe(30);
  });

  it('sets dataAgeSeconds=null when no timestamp is available', () => {
    const results = [
      priceItem({
        price: { symbol: 'BTC', price: 60000, timestamp: 0, provider: 'chainlink' as never },
      }),
    ];
    // timestamp 0 is falsy → dataAgeSeconds null
    const inputs = buildSnapshotInputs(results, {}, SNAPSHOT_HOUR, NOW);
    expect(inputs[0].dataAgeSeconds).toBeNull();
  });

  it('rejects a non-positive price as not successful', () => {
    const results = [
      priceItem({
        price: { symbol: 'BTC', price: 0, timestamp: NOW, provider: 'chainlink' as never },
      }),
    ];
    const inputs = buildSnapshotInputs(results, {}, SNAPSHOT_HOUR, NOW);
    expect(inputs[0].isSuccess).toBe(false);
    expect(inputs[0].price).toBe(0);
  });

  it('rejects a price exceeding the DECIMAL(24,8) range', () => {
    // MAX_SNAPSHOT_PRICE (~1e16) loses precision in float64 and collapses to
    // exactly 1e16, so use a value clearly above it to trigger the guard.
    const results = [
      priceItem({
        price: {
          symbol: 'BTC',
          price: 1e17,
          timestamp: NOW,
          provider: 'chainlink' as never,
        },
      }),
    ];
    const inputs = buildSnapshotInputs(results, {}, SNAPSHOT_HOUR, NOW);
    expect(inputs[0].isSuccess).toBe(false);
    expect(inputs[0].price).toBe(0);
  });

  it('carries confidence and snapshotHour through', () => {
    const results = [priceItem()];
    const inputs = buildSnapshotInputs(results, {}, SNAPSHOT_HOUR, NOW);
    expect(inputs[0].confidence).toBe(0.99);
    expect(inputs[0].snapshotHour).toBe(SNAPSHOT_HOUR);
  });
});

describe('buildFeedHealthUpdates', () => {
  // batch_update_feed_health matches oracle_feeds rows by (provider, symbol,
  // chain_id) with an EXACT symbol. Providers like pyth store the quote-
  // suffixed pair ("BTC/USD") while REPORT_ASSETS passes the base symbol
  // ("BTC"). The health update must use the feed's actual DB symbol
  // (feedSymbol) or consecutive_failures never increments and broken feeds
  // can never auto-deactivate.
  it('uses the feedSymbol (DB symbol) instead of the base symbol', () => {
    const results: BatchResultItem[] = [
      {
        provider: 'pyth',
        symbol: 'BTC',
        feedChainId: 0,
        feedSymbol: 'BTC/USD',
        price: null,
        error: 'upstream timeout',
        skipped: false,
      },
    ];
    const updates = buildFeedHealthUpdates(results);
    expect(updates).toHaveLength(1);
    expect(updates[0]).toEqual({
      provider: 'pyth',
      symbol: 'BTC/USD',
      chainId: 0,
      isSuccess: false,
    });
  });

  it('falls back to the base symbol when feedSymbol is absent (unseeded fallback)', () => {
    const results: BatchResultItem[] = [
      {
        provider: 'chainlink',
        symbol: 'BTC',
        feedChainId: 1,
        price: { symbol: 'BTC', price: 60000, timestamp: NOW, provider: 'chainlink' as never },
        error: null,
        skipped: false,
      },
    ];
    const updates = buildFeedHealthUpdates(results);
    expect(updates[0].symbol).toBe('BTC');
    expect(updates[0].isSuccess).toBe(true);
  });

  it('drops skipped results so they do not record false failures', () => {
    const results: BatchResultItem[] = [
      { provider: 'dia', symbol: 'SNX', price: null, error: 'not in active feeds', skipped: true },
      {
        provider: 'chainlink',
        symbol: 'BTC',
        feedSymbol: 'BTC',
        feedChainId: 1,
        price: { symbol: 'BTC', price: 60000, timestamp: NOW, provider: 'chainlink' as never },
        error: null,
        skipped: false,
      },
    ];
    const updates = buildFeedHealthUpdates(results);
    expect(updates).toHaveLength(1);
    expect(updates[0].provider).toBe('chainlink');
  });

  it('marks a null price as a failure even when error is null', () => {
    const results: BatchResultItem[] = [
      {
        provider: 'pyth',
        symbol: 'ETH',
        feedSymbol: 'ETH/USD',
        feedChainId: 0,
        price: null,
        error: null,
        skipped: false,
      },
    ];
    const updates = buildFeedHealthUpdates(results);
    expect(updates[0].isSuccess).toBe(false);
  });

  it('preserves the feed chain_id for multi-chain providers', () => {
    const results: BatchResultItem[] = [
      {
        provider: 'api3',
        symbol: 'AAVE',
        feedChainId: 42161,
        feedSymbol: 'AAVE/USD',
        price: { symbol: 'AAVE', price: 90, timestamp: NOW, provider: 'api3' as never },
        error: null,
        skipped: false,
      },
    ];
    const updates = buildFeedHealthUpdates(results);
    expect(updates[0].chainId).toBe(42161);
    expect(updates[0].symbol).toBe('AAVE/USD');
  });
});
