import { fetchPolymarketNwsObservationEvidence } from '../nws';

const originalFetch = globalThis.fetch;
const jsonResponse = (value: unknown) =>
  ({
    ok: true,
    status: 200,
    headers: { get: () => null },
    body: null,
    text: async () => JSON.stringify(value),
  }) as Response;
const payload = (station = 'KTOP') => ({
  '@id': `https://api.weather.gov/stations/${station}/observations/2026-11-25T12:00:00+00:00`,
  type: 'Feature',
  properties: {
    station: `https://api.weather.gov/stations/${station}`,
    timestamp: '2026-11-25T12:00:00+00:00',
    textDescription: 'Clear',
    temperature: { value: 18.5, unitCode: 'wmoUnit:degC', qualityControl: ['V'] },
  },
});

describe('Polymarket NWS observation evidence', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    globalThis.fetch = originalFetch;
  });

  it('captures one validated station value with timestamp and unit provenance', async () => {
    const fetchMock = jest.fn(async () => jsonResponse(payload()));
    globalThis.fetch = fetchMock as typeof fetch;

    const evidence = await fetchPolymarketNwsObservationEvidence({
      stationId: 'KTOP',
      property: 'temperature',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.weather.gov/stations/KTOP/observations/latest',
      expect.objectContaining({
        cache: 'no-store',
        headers: expect.objectContaining({ accept: 'application/geo+json' }),
      })
    );
    expect(evidence).toMatchObject({
      schema: 'insight.polymarket-nws-observation.v1',
      source: 'us-national-weather-service-api',
      stationId: 'KTOP',
      observedAt: '2026-11-25T12:00:00.000Z',
      property: 'temperature',
      measurement: { value: 18.5, unitCode: 'wmoUnit:degC', qualityControl: ['V'] },
    });
    expect(evidence.disclosure).toContain('does not compare values to thresholds');
  });

  it('rejects an upstream observation that names a different station', async () => {
    globalThis.fetch = jest.fn(async () => jsonResponse(payload('KDEN'))) as typeof fetch;

    await expect(
      fetchPolymarketNwsObservationEvidence({ stationId: 'KTOP', property: 'temperature' })
    ).rejects.toThrow(/different station/);
  });

  it('fails closed when the selected measurement is missing or null', async () => {
    const body = payload();
    body.properties.temperature = { value: null, unitCode: 'wmoUnit:degC' } as never;
    globalThis.fetch = jest.fn(async () => jsonResponse(body)) as typeof fetch;

    await expect(
      fetchPolymarketNwsObservationEvidence({ stationId: 'KTOP', property: 'temperature' })
    ).rejects.toThrow(/missing, unmeasured, or malformed/);
  });
});
