import { normalizePolymarketMarket } from './market';
import { collectPolymarketMarketEvidence } from './sourceEvidence';

const originalBindings = process.env.POLYMARKET_RULE_BINDINGS_JSON;
const originalRegistrationKey = process.env.BLS_API_REGISTRATION_KEY;
const originalFeatureEnabled = process.env.POLYMARKET_EVIDENCE_ENABLED;
const market = {
  id: 'generic-market-501',
  version: 'v1',
  slug: 'generic-market-501',
  question: 'A reviewed market question?',
  description: 'The source reference identifies the official published data.',
  resolutionSource: 'https://www.bls.gov/example/series',
  endDate: '2026-12-31T00:00:00.000Z',
  active: true,
  closed: false,
  outcomes: '["Yes","No"]',
  clobTokenIds: '["111","222"]',
  outcomePrices: '["0.5","0.5"]',
};
const rulesDigest = normalizePolymarketMarket(market)?.rulesDigest;
const jsonResponse = (body: unknown) =>
  ({
    ok: true,
    status: 200,
    headers: { get: () => null },
    text: async () => JSON.stringify(body),
  }) as Response;

describe('Polymarket source-evidence collection', () => {
  beforeEach(() => {
    process.env.POLYMARKET_EVIDENCE_ENABLED = 'true';
  });

  afterEach(() => {
    jest.restoreAllMocks();
    Reflect.deleteProperty(globalThis, 'fetch');
    if (originalBindings === undefined) delete process.env.POLYMARKET_RULE_BINDINGS_JSON;
    else process.env.POLYMARKET_RULE_BINDINGS_JSON = originalBindings;
    if (originalRegistrationKey === undefined) delete process.env.BLS_API_REGISTRATION_KEY;
    else process.env.BLS_API_REGISTRATION_KEY = originalRegistrationKey;
    if (originalFeatureEnabled === undefined) delete process.env.POLYMARKET_EVIDENCE_ENABLED;
    else process.env.POLYMARKET_EVIDENCE_ENABLED = originalFeatureEnabled;
  });

  it('fails closed before reading bindings or upstream data while the deployment flag is off', async () => {
    delete process.env.POLYMARKET_EVIDENCE_ENABLED;
    const fetchMock = jest.fn();
    Object.defineProperty(globalThis, 'fetch', { configurable: true, value: fetchMock });
    await expect(collectPolymarketMarketEvidence({ marketId: market.id })).rejects.toMatchObject({
      code: 'FEATURE_DISABLED',
      status: 503,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns market and source integrity evidence without evaluating an outcome', async () => {
    process.env.BLS_API_REGISTRATION_KEY = 'local-test-key';
    process.env.POLYMARKET_RULE_BINDINGS_JSON = JSON.stringify([
      {
        marketId: market.id,
        rulesDigest,
        reviewedAt: '2026-11-25T00:00:00.000Z',
        reviewer: 'rules-review',
        observations: [
          {
            id: 'inflation-source',
            provider: 'bls.percent-change',
            input: { seriesId: 'CUUR0000SA0', year: '2026', period: 'M11', months: 12 },
          },
          {
            id: 'employment-source',
            provider: 'bls.series',
            input: { seriesId: 'LNS00000002', year: '2026', period: 'M10' },
          },
          {
            id: 'station-temperature',
            provider: 'nws.latest-observation',
            input: { stationId: 'KTOP', property: 'temperature' },
          },
        ],
      },
    ]);
    const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      if (url.hostname === 'gamma-api.polymarket.com') return jsonResponse([market]);
      if (url.hostname === 'api.bls.gov' && url.pathname.endsWith('/v2/timeseries/data/')) {
        expect(init?.method).toBe('POST');
        const body = JSON.parse(String(init?.body)) as {
          calculations: boolean;
          startyear: string;
          endyear: string;
        };
        expect(body).toMatchObject({ calculations: true, startyear: '2025', endyear: '2026' });
        return jsonResponse({
          status: 'REQUEST_SUCCEEDED',
          Results: {
            series: [
              {
                seriesID: 'CUUR0000SA0',
                data: [
                  {
                    year: '2026',
                    period: 'M11',
                    periodName: 'November',
                    value: '103.7',
                    calculations: { pct_changes: { '12': '3.7' } },
                    footnotes: [],
                  },
                  {
                    year: '2025',
                    period: 'M11',
                    periodName: 'November',
                    value: '100',
                    footnotes: [],
                  },
                ],
              },
            ],
          },
        });
      }
      if (url.hostname === 'api.bls.gov') {
        return jsonResponse({
          status: 'REQUEST_SUCCEEDED',
          Results: [
            {
              series: [
                {
                  seriesID: 'LNS00000002',
                  data: [
                    {
                      year: '2026',
                      period: 'M10',
                      periodName: 'October',
                      value: '3.2',
                      footnotes: [],
                    },
                  ],
                },
              ],
            },
          ],
        });
      }
      if (url.hostname === 'api.weather.gov') {
        expect(url.pathname).toBe('/stations/KTOP/observations/latest');
        return jsonResponse({
          '@id': 'https://api.weather.gov/stations/KTOP/observations/2026-11-25T12:00:00+00:00',
          type: 'Feature',
          properties: {
            station: 'https://api.weather.gov/stations/KTOP',
            timestamp: '2026-11-25T12:00:00+00:00',
            textDescription: 'Clear',
            temperature: { value: 18.5, unitCode: 'wmoUnit:degC', qualityControl: [] },
          },
        });
      }
      throw new Error(`Unexpected upstream: ${url.hostname}`);
    });
    Object.defineProperty(globalThis, 'fetch', { configurable: true, value: fetchMock });

    const result = await collectPolymarketMarketEvidence({ marketId: market.id });
    expect(result.schema).toBe('insight.polymarket-source-evidence.v1');
    expect(result.observations).toHaveLength(3);
    expect(result.observations[2]).toMatchObject({
      provider: 'nws.latest-observation',
      evidence: {
        schema: 'insight.polymarket-nws-observation.v1',
        stationId: 'KTOP',
        property: 'temperature',
        measurement: { value: 18.5, unitCode: 'wmoUnit:degC' },
      },
    });
    expect(result.checks).toEqual({
      marketActive: true,
      marketOpen: true,
      rulesDigestStable: true,
      resolutionSourceDeclared: true,
      sourceEvidenceRetrieved: true,
    });
    expect(result.scope.outcomeEvaluation).toBe('not_performed');
    expect(result).not.toHaveProperty('evaluation');
    expect(result).not.toHaveProperty('comparison');
    expect(result).not.toHaveProperty('candidateOutcome');
    expect(result).not.toHaveProperty('verdict');
    expect(fetchMock).toHaveBeenCalledTimes(5);
  });

  it('collects only the Dallas METAR query pinned by the reviewed market source', async () => {
    const date = '2026-11-27T09:00:00.000Z';
    const resolutionSource = `https://aviationweather.gov/api/data/metar?ids=KDAL&format=raw&date=${encodeURIComponent(date)}&hours=30`;
    const dallasMarket = {
      ...market,
      id: 'dallas-weather-501',
      slug: 'dallas-weather-501',
      resolutionSource,
    };
    const dallasRulesDigest = normalizePolymarketMarket(dallasMarket)?.rulesDigest;
    process.env.POLYMARKET_RULE_BINDINGS_JSON = JSON.stringify([
      {
        marketId: dallasMarket.id,
        rulesDigest: dallasRulesDigest,
        reviewedAt: '2026-11-25T00:00:00.000Z',
        reviewer: 'rules-review',
        observations: [
          {
            id: 'dallas-metar-window',
            provider: 'aviationweather.metar',
            input: { stationId: 'KDAL', date, hours: 30 },
          },
        ],
      },
    ]);
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.hostname === 'gamma-api.polymarket.com') return jsonResponse([dallasMarket]);
      if (url.hostname === 'aviationweather.gov') {
        expect(url.toString()).toBe(resolutionSource);
        return {
          ok: true,
          status: 200,
          headers: { get: () => null },
          body: null,
          text: async () => 'METAR KDAL 260053Z 14008KT 10SM CLR 12/02 A3011 RMK AO2',
        } as Response;
      }
      throw new Error(`Unexpected upstream: ${url.hostname}`);
    });
    Object.defineProperty(globalThis, 'fetch', { configurable: true, value: fetchMock });

    const result = await collectPolymarketMarketEvidence({ marketId: dallasMarket.id });
    expect(result.observations).toEqual([
      expect.objectContaining({
        provider: 'aviationweather.metar',
        evidence: expect.objectContaining({
          stationId: 'KDAL',
          date,
          hours: 30,
          reports: [expect.stringContaining('METAR KDAL')],
        }),
      }),
    ]);
    expect(result.requiresHumanReview).toBe(true);
    expect(result.reviewWarnings[0]).toContain('incomplete source window');
    expect(result.scope.outcomeEvaluation).toBe('not_performed');
  });

  it('rejects an AviationWeather source query that differs from the reviewed binding', async () => {
    const dallasMarket = {
      ...market,
      id: 'dallas-weather-502',
      slug: 'dallas-weather-502',
      resolutionSource:
        'https://aviationweather.gov/api/data/metar?ids=KDAL&format=raw&date=2026-11-27T09%3A00%3A00.000Z&hours=30',
    };
    const dallasRulesDigest = normalizePolymarketMarket(dallasMarket)?.rulesDigest;
    process.env.POLYMARKET_RULE_BINDINGS_JSON = JSON.stringify([
      {
        marketId: dallasMarket.id,
        rulesDigest: dallasRulesDigest,
        reviewedAt: '2026-11-25T00:00:00.000Z',
        reviewer: 'rules-review',
        observations: [
          {
            id: 'dallas-metar-window',
            provider: 'aviationweather.metar',
            input: { stationId: 'KDAL', date: '2026-11-27T09:00:00.000Z', hours: 29 },
          },
        ],
      },
    ]);
    const fetchMock = jest.fn(async () => jsonResponse([dallasMarket]));
    Object.defineProperty(globalThis, 'fetch', { configurable: true, value: fetchMock });
    await expect(
      collectPolymarketMarketEvidence({ marketId: dallasMarket.id })
    ).rejects.toMatchObject({
      code: 'MARKET_UNSUPPORTED',
      status: 422,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects legacy outcome-evaluation bindings instead of silently ignoring them', async () => {
    process.env.POLYMARKET_RULE_BINDINGS_JSON = JSON.stringify([
      {
        marketId: market.id,
        rulesDigest,
        reviewedAt: '2026-11-25T00:00:00.000Z',
        reviewer: 'rules-review',
        logic: 'all',
        trueOutcomeName: 'Yes',
        falseOutcomeName: 'No',
        observations: [
          {
            id: 'inflation',
            provider: 'bls.series',
            input: { seriesId: 'CUUR0000SA0', year: '2026', period: 'M10' },
          },
        ],
        conditions: [{ observationId: 'inflation', operator: 'gt', threshold: '3.0' }],
      },
    ]);
    const fetchMock = jest.fn();
    Object.defineProperty(globalThis, 'fetch', { configurable: true, value: fetchMock });
    await expect(collectPolymarketMarketEvidence({ marketId: market.id })).rejects.toMatchObject({
      code: 'BINDING_NOT_CONFIGURED',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects a BLS calculation that does not match captured observations', async () => {
    process.env.BLS_API_REGISTRATION_KEY = 'local-test-key';
    process.env.POLYMARKET_RULE_BINDINGS_JSON = JSON.stringify([
      {
        marketId: market.id,
        rulesDigest,
        reviewedAt: '2026-11-25T00:00:00.000Z',
        reviewer: 'rules-review',
        observations: [
          {
            id: 'inflation',
            provider: 'bls.percent-change',
            input: { seriesId: 'CUUR0000SA0', year: '2026', period: 'M11', months: 12 },
          },
        ],
      },
    ]);
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.hostname === 'gamma-api.polymarket.com') return jsonResponse([market]);
      return jsonResponse({
        status: 'REQUEST_SUCCEEDED',
        Results: {
          series: [
            {
              seriesID: 'CUUR0000SA0',
              data: [
                {
                  year: '2026',
                  period: 'M11',
                  periodName: 'November',
                  value: '103.7',
                  calculations: { pct_changes: { '12': '3.8' } },
                  footnotes: [],
                },
                { year: '2025', period: 'M11', value: '100', footnotes: [] },
              ],
            },
          ],
        },
      });
    });
    Object.defineProperty(globalThis, 'fetch', { configurable: true, value: fetchMock });
    await expect(collectPolymarketMarketEvidence({ marketId: market.id })).rejects.toThrow(
      /does not match/
    );
  });
});
