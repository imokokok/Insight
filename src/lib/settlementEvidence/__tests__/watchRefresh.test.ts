/**
 * Watch-list refresh (`refreshWatchList`) — stale-market guard.
 *
 * Gamma keeps abandoned price-contract series listed as open forever (a Nov
 * 2026 probe found 55 unclosed `*-updown-*` markets whose windows ended
 * months earlier, all zero-volume, none ever closing). The guard must keep
 * live open markets and resolved markets, but drop unclosed rows whose
 * window ended more than one lookback horizon ago, so the watch list (and
 * the paid endpoint's inventory) only holds markets that can still settle.
 * `polymarket` and the repository are mocked; the filter itself runs for
 * real.
 */

import { refreshWatchList, STALE_UNRESOLVED_WATCH_MS } from '../collector';
import * as polymarket from '../polymarket';
import * as repository from '../repository';

import type { GammaMarket } from '../polymarket';
import type { SettlementMarketWatchRow } from '../types';

jest.mock('../polymarket', () => ({
  fetchPriceContractMarkets: jest.fn(),
  buildWatchRow: jest.fn(),
}));

jest.mock('../repository', () => ({
  upsertWatchMarkets: jest.fn(),
}));

const mockedFetch = jest.mocked(polymarket.fetchPriceContractMarkets);
const mockedBuild = jest.mocked(polymarket.buildWatchRow);
const mockedUpsert = jest.mocked(repository.upsertWatchMarkets);

const NOW_MS = 1_800_000_000_000;
const HOUR_MS = 60 * 60 * 1000;

function row(overrides: Partial<SettlementMarketWatchRow> = {}): SettlementMarketWatchRow {
  return {
    marketSlug: 'btc-updown-5m-2026-11-05',
    gammaId: 'gamma-1',
    question: 'Bitcoin Up or Down — 5m window',
    asset: 'BTC',
    windowSeconds: 300,
    windowStartMs: NOW_MS - 2 * HOUR_MS,
    windowEndMs: NOW_MS - HOUR_MS,
    settlementVenue: 'chainlink-stream',
    resolutionSourceUrl: 'https://data.chain.link/streams/btc-usd',
    closed: false,
    declaredOutcome: null,
    outcomePricesJson: null,
    firstSeenMs: NOW_MS - HOUR_MS,
    updatedAtMs: NOW_MS,
    ...overrides,
  };
}

function gammaMarket(slug: string): GammaMarket {
  return { slug } as unknown as GammaMarket;
}

beforeEach(() => {
  // jest.config.js sets `resetMocks: true`, which also wipes factory-inlined
  // implementations — every mock therefore gets its default here.
  mockedUpsert.mockReset();
  mockedUpsert.mockResolvedValue(0);
});

describe('refreshWatchList stale-market guard', () => {
  it('persists a live unresolved market whose window has not ended', async () => {
    const live = row({ marketSlug: 'btc-updown-5m-live' });
    mockedFetch.mockResolvedValue({
      markets: [gammaMarket('btc-updown-5m-live')] as GammaMarket[],
      summary: { openSeen: 1, closedSeen: 0 },
    });
    mockedBuild.mockReturnValue(live);

    await expect(refreshWatchList({ nowMs: NOW_MS })).resolves.toBe(0);

    expect(mockedUpsert).toHaveBeenCalledWith([live]);
  });

  it('keeps a closed market even when its window ended long ago', async () => {
    const resolved = row({
      marketSlug: 'btc-updown-5m-old-closed',
      closed: true,
      declaredOutcome: 'Up',
      windowEndMs: NOW_MS - 10 * STALE_UNRESOLVED_WATCH_MS,
    });
    mockedFetch.mockResolvedValue({
      markets: [gammaMarket('btc-updown-5m-old-closed')] as GammaMarket[],
      summary: { openSeen: 0, closedSeen: 1 },
    });
    mockedBuild.mockReturnValue(resolved);

    await refreshWatchList({ nowMs: NOW_MS });

    expect(mockedUpsert).toHaveBeenCalledWith([resolved]);
  });

  it('drops an unresolved market whose window ended beyond the stale horizon', async () => {
    const zombie = row({
      marketSlug: 'eth-updown-5m-zombie',
      windowEndMs: NOW_MS - STALE_UNRESOLVED_WATCH_MS - HOUR_MS,
      closed: false,
      declaredOutcome: null,
    });
    const live = row({ marketSlug: 'btc-updown-5m-live' });
    mockedFetch.mockResolvedValue({
      markets: [
        gammaMarket('eth-updown-5m-zombie'),
        gammaMarket('btc-updown-5m-live'),
      ] as GammaMarket[],
      summary: { openSeen: 2, closedSeen: 0 },
    });
    mockedBuild.mockImplementation(({ market }) =>
      market.slug === 'eth-updown-5m-zombie' ? zombie : live
    );

    await refreshWatchList({ nowMs: NOW_MS });

    expect(mockedUpsert).toHaveBeenCalledTimes(1);
    const persisted = mockedUpsert.mock.calls[0][0];
    expect(persisted.map((r) => r.marketSlug)).toEqual(['btc-updown-5m-live']);
  });

  it('keeps an unresolved market inside the stale horizon (resolution lag)', async () => {
    const resolving = row({
      marketSlug: 'btc-updown-5m-resolving',
      windowEndMs: NOW_MS - STALE_UNRESOLVED_WATCH_MS + HOUR_MS,
      closed: false,
      declaredOutcome: null,
    });
    mockedFetch.mockResolvedValue({
      markets: [gammaMarket('btc-updown-5m-resolving')] as GammaMarket[],
      summary: { openSeen: 1, closedSeen: 0 },
    });
    mockedBuild.mockReturnValue(resolving);

    await refreshWatchList({ nowMs: NOW_MS });

    expect(mockedUpsert).toHaveBeenCalledWith([resolving]);
  });
});
