import {
  buildWatchRow,
  classifySettlementVenue,
  isPriceContract,
  parseDeclaredOutcome,
  parseUpdownSlug,
  type GammaMarket,
} from '../polymarket';

function gammaMarket(overrides: Partial<GammaMarket> = {}): GammaMarket {
  return {
    id: '12345',
    question: 'Bitcoin Up or Down - December 19, 11:35AM-11:40AM ET',
    slug: 'btc-updown-5m-1766162100',
    description:
      'This market will resolve to "Up" if the Bitcoin price at the end of the time range ' +
      'specified in the title is greater than or equal to the price at the beginning of that range.',
    resolutionSource: 'https://data.chain.link/streams/btc-usd',
    endDate: '2025-12-19T16:40:00Z',
    closed: false,
    outcomes: '["Up", "Down"]',
    outcomePrices: null,
    ...overrides,
  };
}

describe('parseUpdownSlug', () => {
  it('parses asset, window and start epoch from the updown series', () => {
    expect(parseUpdownSlug('btc-updown-5m-1766162100')).toEqual({
      asset: 'BTC',
      windowSeconds: 300,
      windowStartMs: 1766162100_000,
    });
  });

  it('parses hourly and eth variants', () => {
    expect(parseUpdownSlug('eth-updown-60m-1766160000')?.windowSeconds).toBe(3600);
    expect(parseUpdownSlug('eth-updown-5m-1766161800')?.asset).toBe('ETH');
  });

  it('returns null for non-updown slugs', () => {
    expect(parseUpdownSlug('will-umaro-sissoco-embal-win')).toBeNull();
    expect(parseUpdownSlug('btc-updown-5m-notats')).toBeNull();
  });
});

describe('classifySettlementVenue', () => {
  it('classifies chainlink data streams', () => {
    expect(
      classifySettlementVenue(
        'resolution source is Chainlink',
        'https://data.chain.link/streams/eth-usd'
      )
    ).toBe('chainlink-stream');
  });

  it('classifies binance-declared venues', () => {
    expect(
      classifySettlementVenue('resolved according to the Binance 1 minute candle for BTCUSDT', null)
    ).toBe('binance');
  });

  it('fails closed to unknown', () => {
    expect(classifySettlementVenue(null, null)).toBe('unknown');
  });
});

describe('parseDeclaredOutcome', () => {
  it('reads a resolved 1/0 outcome', () => {
    expect(parseDeclaredOutcome('["Up", "Down"]', '["1", "0"]')).toBe('Up');
    expect(parseDeclaredOutcome('["Up", "Down"]', '["0", "1"]')).toBe('Down');
  });

  it('refuses a mid-trade snapshot', () => {
    expect(parseDeclaredOutcome('["Up", "Down"]', '["0.52", "0.48"]')).toBeNull();
  });

  it('returns null for malformed payloads', () => {
    expect(parseDeclaredOutcome('not json', '["1","0"]')).toBeNull();
    expect(parseDeclaredOutcome('["Yes","No"]', '["1","0"]')).toBeNull();
    expect(parseDeclaredOutcome(null, null)).toBeNull();
  });
});

describe('buildWatchRow', () => {
  const nowMs = 1_700_000_000_000;

  it('builds a machine-verified row from the slug', () => {
    const row = buildWatchRow({ market: gammaMarket(), nowMs });
    expect(row).not.toBeNull();
    expect(row?.asset).toBe('BTC');
    expect(row?.windowSeconds).toBe(300);
    expect(row?.windowStartMs).toBe(1766162100_000);
    expect(row?.windowEndMs).toBe(1766162100_000 + 300_000);
    expect(row?.settlementVenue).toBe('chainlink-stream');
    expect(row?.closed).toBe(false);
  });

  it('returns null for markets without a parseable window', () => {
    const market = gammaMarket({ slug: 'some-random-market' });
    expect(buildWatchRow({ market, nowMs })).toBeNull();
  });

  it('carries the declared outcome once resolved', () => {
    const row = buildWatchRow({
      market: gammaMarket({ closed: true, outcomePrices: '["1", "0"]' }),
      nowMs,
    });
    expect(row?.declaredOutcome).toBe('Up');
  });
});

describe('isPriceContract', () => {
  it('accepts the updown slug series and price-resolution descriptions', () => {
    expect(isPriceContract(gammaMarket())).toBe(true);
    expect(
      isPriceContract(
        gammaMarket({
          slug: 'some-market',
          description: 'The resolution source is the Binance candle.',
        })
      )
    ).toBe(true);
  });

  it('rejects unrelated markets', () => {
    expect(
      isPriceContract(
        gammaMarket({ slug: 'election', question: 'Will X win?', description: 'Election results.' })
      )
    ).toBe(false);
  });
});
