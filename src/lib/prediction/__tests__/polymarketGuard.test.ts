import type { GammaMarket } from '@/lib/settlementEvidence/polymarket';

import { assessPolymarketGuard } from '../polymarketGuard';

/**
 * Window under test: slug `btc-updown-5m-1766162100`
 *   → start 2025-12-19T16:35:00Z, end 2025-12-19T16:40:00Z (300 s),
 *     matching the live Gamma payload captured on 2026-11-04
 *     (gammaId 964335, question "11:35AM-11:40AM ET", endDate 16:40:00Z).
 */

const WINDOW_START_MS = Date.parse('2025-12-19T16:35:00.000Z');
const WINDOW_END_MS = Date.parse('2025-12-19T16:40:00.000Z');
const MID_WINDOW_NOW = new Date(WINDOW_START_MS + 60_000); // 240 s remaining

const BASE_INPUT = {
  protocolId: 'polymarket-prediction-mainnet' as const,
  action: 'buy_up' as const,
  marketSlug: 'btc-updown-5m-1766162100',
};

function gammaMarket(overrides: Partial<GammaMarket> = {}): GammaMarket {
  return {
    id: '964335',
    question: 'Bitcoin Up or Down - December 19, 11:35AM-11:40AM ET',
    slug: 'btc-updown-5m-1766162100',
    description:
      'This market will resolve to "Up" if the Bitcoin price at the end of the time ' +
      'range is higher than it was at the start…',
    resolutionSource: 'https://data.chain.link/streams/btc-usd',
    endDate: '2025-12-19T16:40:00Z',
    closed: false,
    active: true,
    outcomes: '["Up", "Down"]',
    outcomePrices: '["0.52", "0.48"]',
    ...overrides,
  } as GammaMarket;
}

function deps(
  market: GammaMarket | null = gammaMarket(),
  now: Date = MID_WINDOW_NOW,
  fetchMarket?: (slug: string) => Promise<GammaMarket | null>
) {
  return {
    fetchMarket: fetchMarket ?? (jest.fn(async () => market) as never),
    now: () => now,
  } as never;
}

function aggregateFields() {
  // Disclosed venue aggregates as Gamma reports them (numbers or strings).
  return {
    liquidityNum: 2071.23,
    volumeNum: '93745.63',
    spread: 0.02,
    bestBid: 0.51,
    bestAsk: 0.53,
    lastTradePrice: 0.52,
  };
}

describe('assessPolymarketGuard', () => {
  it('allows a healthy mid-window chainlink-settled market with a quoted book', async () => {
    const market = { ...gammaMarket(), ...aggregateFields() };
    const result = await assessPolymarketGuard(BASE_INPUT, deps(market));
    expect(result.verdict).toBe('ALLOW');
    expect(result.schema).toBe('insight.polymarket-guard.v1');
    expect(result.scope).toEqual({
      venue: 'polymarket',
      network: 'polymarket-mainnet',
      transactionAuthority: 'none',
      valuation: 'venue_quoted_probability',
    });
    expect(result.market.asset).toBe('BTC');
    expect(result.market.windowSeconds).toBe(300);
    expect(result.market.settlementVenue).toBe('chainlink-stream');
    expect(result.market.endDateMatchesSlugWindow).toBe(true);
    expect(result.quotes.upProbability).toBeCloseTo(0.52, 4);
    expect(result.quotes.chosenSidePrice).toBeCloseTo(0.52, 4);
    expect(result.quotes.volumeNum).toBe(93745.63);
    expect(result.timing.secondsToResolution).toBe(240);
    const failing = result.checks.filter((c) => c.status !== 'pass');
    expect(failing).toEqual([]);
  });

  it('blocks a closed market', async () => {
    const result = await assessPolymarketGuard(BASE_INPUT, deps(gammaMarket({ closed: true })));
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons).toContain('market closed');
  });

  it('blocks a market whose resolution window has ended', async () => {
    const now = new Date(WINDOW_END_MS + 60_000);
    const result = await assessPolymarketGuard(BASE_INPUT, deps(gammaMarket(), now));
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons).toContain('resolution window ended');
  });

  it('blocks an entry seconds before resolution', async () => {
    const now = new Date(WINDOW_END_MS - 15_000); // 15 s remaining < 30 s minimum
    const result = await assessPolymarketGuard(BASE_INPUT, deps(gammaMarket(), now));
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons).toContain('imminent resolution, adverse-selection entry');
  });

  it('cautions on a late-window entry that is not yet imminent', async () => {
    const now = new Date(WINDOW_END_MS - 30_000); // 30 s remaining: not <30, but <20% of window
    const result = await assessPolymarketGuard(BASE_INPUT, deps(gammaMarket(), now));
    expect(result.verdict).toBe('CAUTION');
    expect(result.reasons).toContain('late-window entry');
  });

  it('cautions when the settlement venue is unrecognizable', async () => {
    const market = gammaMarket({ resolutionSource: null, description: 'Some local feed.' });
    const result = await assessPolymarketGuard(BASE_INPUT, deps(market));
    expect(result.verdict).toBe('CAUTION');
    expect(result.market.settlementVenue).toBe('unknown');
    expect(result.reasons).toContain('settlement venue unverifiable');
  });

  it('cautions on a fresh market whose book is not yet quoted', async () => {
    // Live-observed shape of a brand-new 5m contract (2026-11-04 sample).
    const market = gammaMarket({ outcomePrices: null });
    const result = await assessPolymarketGuard(BASE_INPUT, deps(market));
    expect(result.verdict).toBe('CAUTION');
    expect(result.reasons).toContain('venue probability not yet quoted');
    expect(result.quotes.chosenSidePrice).toBeNull();
  });

  it('cautions when the chosen side is priced near certainty', async () => {
    const market = gammaMarket({ outcomePrices: '["0.96", "0.04"]' });
    const result = await assessPolymarketGuard(BASE_INPUT, deps(market));
    expect(result.verdict).toBe('CAUTION');
    expect(result.reasons).toContain('chosen side priced near certainty');
  });

  it('cautions when quoted probabilities fail the binary-consistency check', async () => {
    const market = gammaMarket({ outcomePrices: '["0.60", "0.60"]' });
    const result = await assessPolymarketGuard(BASE_INPUT, deps(market));
    expect(result.verdict).toBe('CAUTION');
    expect(result.reasons).toContain('venue quote fails binary-consistency check');
  });

  it('cautions when outcomePrices is malformed JSON', async () => {
    const market = gammaMarket({ outcomePrices: 'not-json' });
    const result = await assessPolymarketGuard(BASE_INPUT, deps(market));
    expect(result.verdict).toBe('CAUTION');
    expect(result.reasons).toContain('venue probability unusable');
  });

  it('cautions when endDate disagrees with the slug window', async () => {
    const market = gammaMarket({ endDate: '2025-12-19T16:45:00Z' }); // 5 min late
    const result = await assessPolymarketGuard(BASE_INPUT, deps(market));
    expect(result.verdict).toBe('CAUTION');
    expect(result.market.endDateMatchesSlugWindow).toBe(false);
    expect(result.reasons).toContain('market window metadata inconsistent');
  });

  it('blocks slugs outside the reviewed updown price-contract scope', async () => {
    const result = await assessPolymarketGuard(
      { ...BASE_INPUT, marketSlug: 'will-something-happen-in-2026' },
      deps(gammaMarket({ slug: 'will-something-happen-in-2026' }))
    );
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons).toContain('outside reviewed market scope');
  });

  it('blocks when the Gamma fetch fails (fail closed)', async () => {
    const fetchMarket = jest.fn(async () => {
      throw new Error('Gamma API 503 for slug lookup');
    }) as never;
    const result = await assessPolymarketGuard(BASE_INPUT, deps(null, MID_WINDOW_NOW, fetchMarket));
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons).toContain('assessment input unavailable');
    expect(result.checks[0].detail).toContain('Gamma API 503');
  });

  it('blocks when the slug resolves to no market (fail closed)', async () => {
    const result = await assessPolymarketGuard(BASE_INPUT, deps(null));
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons).toContain('assessment input unavailable');
  });

  it('rejects inputs that do not match the reviewed protocol id', async () => {
    await expect(
      assessPolymarketGuard({ ...BASE_INPUT, protocolId: 'other-protocol' as never }, deps())
    ).rejects.toThrow();
  });
});
