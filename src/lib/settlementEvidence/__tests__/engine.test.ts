import {
  buildEvidencePayload,
  canonicalEvidenceJson,
  computePayloadHash,
  deriveWindowReferences,
  gradeEvidence,
  selectAlignedOracleObservation,
} from '../engine';

import type { SettlementCandle, SettlementMarketWatchRow } from '../types';

const WINDOW_START_MS = 1_766_162_100_000;
const WINDOW_END_MS = WINDOW_START_MS + 300_000;

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
    marketSlug: 'btc-updown-5m-1766162100',
    gammaId: '12345',
    question: 'Bitcoin Up or Down - December 19, 11:35AM-11:40AM ET',
    asset: 'BTC',
    windowSeconds: 300,
    windowStartMs: WINDOW_START_MS,
    windowEndMs: WINDOW_END_MS,
    settlementVenue: 'chainlink-stream',
    resolutionSourceUrl: 'https://data.chain.link/streams/btc-usd',
    closed: true,
    declaredOutcome: 'Up',
    outcomePricesJson: '["1","0"]',
    firstSeenMs: 0,
    updatedAtMs: 0,
    ...overrides,
  };
}

describe('deriveWindowReferences', () => {
  it('uses the first open and last close inside the window', () => {
    const candles = [
      candleAtMinuteOffset(0, 100, 101),
      candleAtMinuteOffset(1, 101, 102),
      candleAtMinuteOffset(4, 104, 110),
    ];
    const refs = deriveWindowReferences(candles, WINDOW_START_MS, WINDOW_END_MS);
    expect(refs.startRef).toBe(100);
    expect(refs.endRef).toBe(110);
    expect(refs.expectedBuckets).toBe(5);
    expect(refs.observedBuckets).toBe(3);
  });

  it('excludes buckets at or beyond the window end', () => {
    const candles = [candleAtMinuteOffset(5, 200, 300)];
    const refs = deriveWindowReferences(candles, WINDOW_START_MS, WINDOW_END_MS);
    expect(refs.observedBuckets).toBe(0);
    expect(refs.startRef).toBeNull();
  });
});

describe('gradeEvidence', () => {
  it('grades a matching outcome under full coverage as consistent', () => {
    expect(
      gradeEvidence({
        declaredOutcome: 'Up',
        independentOutcome: 'Up',
        coverageE4: 10_000,
        candleUnavailable: false,
      })
    ).toEqual({ grade: 'consistent', reasonCodes: ['declared_matches_independent'] });
  });

  it('grades a diverging outcome as inconsistent', () => {
    const grade = gradeEvidence({
      declaredOutcome: 'Up',
      independentOutcome: 'Down',
      coverageE4: 10_000,
      candleUnavailable: false,
    });
    expect(grade.grade).toBe('inconsistent');
  });

  it('grades incomplete coverage as insufficient_data', () => {
    expect(
      gradeEvidence({
        declaredOutcome: 'Up',
        independentOutcome: 'Up',
        coverageE4: 6_000,
        candleUnavailable: false,
      }).grade
    ).toBe('insufficient_data');
  });

  it('grades unresolved markets as insufficient_data', () => {
    expect(
      gradeEvidence({
        declaredOutcome: null,
        independentOutcome: 'Up',
        coverageE4: 10_000,
        candleUnavailable: false,
      }).grade
    ).toBe('insufficient_data');
  });
});

describe('selectAlignedOracleObservation', () => {
  const observations = [
    { slotMs: WINDOW_END_MS - 15 * 60 * 1000, consensusPrice: 100 },
    { slotMs: WINDOW_END_MS - 5 * 60 * 1000, consensusPrice: 110 },
  ];

  it('picks the nearest observation within tolerance', () => {
    expect(selectAlignedOracleObservation(observations, WINDOW_END_MS)?.consensusPrice).toBe(110);
  });

  it('returns null when every observation is out of tolerance', () => {
    expect(
      selectAlignedOracleObservation(
        [{ slotMs: WINDOW_END_MS - 30 * 60 * 1000, consensusPrice: 100 }],
        WINDOW_END_MS
      )
    ).toBeNull();
  });
});

describe('buildEvidencePayload', () => {
  const fullCandles = [0, 1, 2, 3, 4].map((m) => candleAtMinuteOffset(m, 100 + m, 101 + m));

  it('produces a consistent pack with derived-only fields', () => {
    const payload = buildEvidencePayload({
      row: watchRow({ declaredOutcome: 'Up' }),
      candles: fullCandles,
      candleSource: 'kraken',
      candleRightsScope: 'vendor-licensed',
      candleDeliveryPolicy: 'derived-analytics-only',
      oracleObservations: [{ slotMs: WINDOW_END_MS - 5 * 60 * 1000, consensusPrice: 104.4 }],
      nowMs: 1_700_000_000_000,
    });
    expect(payload.grade).toBe('consistent');
    expect(payload.declaredOutcome).toBe('Up');
    expect(payload.independentOutcome).toBe('Up');
    expect(payload.priceChangeBps).toBe(500);
    expect(payload.oracleDeviationBps).not.toBeNull();
    expect(payload.candleCoverageE4).toBe(10_000);
    // Delivery policy: no absolute Kraken prices in the payload — no candle
    // OHLC keys and no venue print values, only derived bps deltas.
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toMatch(/"(open|high|low|close)"/);
    expect(serialized).not.toContain('100.5');
  });

  it('grades insufficient_data when no candles were collected', () => {
    const payload = buildEvidencePayload({
      row: watchRow(),
      candles: [],
      candleSource: null,
      candleRightsScope: null,
      candleDeliveryPolicy: null,
      oracleObservations: [],
      nowMs: 1_700_000_000_000,
    });
    expect(payload.grade).toBe('insufficient_data');
    expect(payload.independentOutcome).toBeNull();
    expect(payload.gradeReasonCodes).toContain('candles_unavailable');
  });

  it('flags a diverging declared outcome as inconsistent', () => {
    // Window opens at 100 and ends at 110 → independent outcome Up. A market
    // declaring Down under full coverage is the manipulation-alert case.
    const candles = [
      candleAtMinuteOffset(0, 100, 100),
      candleAtMinuteOffset(1, 100, 100),
      candleAtMinuteOffset(2, 100, 100),
      candleAtMinuteOffset(3, 100, 105),
      candleAtMinuteOffset(4, 105, 110),
    ];
    const payload = buildEvidencePayload({
      row: watchRow({ declaredOutcome: 'Down' }),
      candles,
      candleSource: 'kraken',
      candleRightsScope: 'vendor-licensed',
      candleDeliveryPolicy: 'derived-analytics-only',
      oracleObservations: [],
      nowMs: 1_700_000_000_000,
    });
    expect(payload.independentOutcome).toBe('Up');
    expect(payload.grade).toBe('inconsistent');
    expect(payload.gradeReasonCodes).toContain('declared_differs_from_independent');
  });
});

describe('canonicalEvidenceJson / computePayloadHash', () => {
  it('is key-order independent and hash-stable', () => {
    const base = buildEvidencePayload({
      row: watchRow(),
      candles: fullCandles(),
      candleSource: 'kraken',
      candleRightsScope: 'vendor-licensed',
      candleDeliveryPolicy: 'derived-analytics-only',
      oracleObservations: [],
      nowMs: 1_700_000_000_000,
    });
    const reordered = JSON.parse(JSON.stringify(base, Object.keys(base).sort()));
    expect(canonicalEvidenceJson(reordered as typeof base)).toBe(canonicalEvidenceJson(base));
    expect(computePayloadHash(reordered as typeof base)).toBe(computePayloadHash(base));
  });

  function fullCandles(): SettlementCandle[] {
    return [0, 1, 2, 3, 4].map((m) => candleAtMinuteOffset(m, 100 + m, 101 + m));
  }
});
