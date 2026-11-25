import {
  fetchPolymarketAviationWeatherMetarEvidence,
  matchesPolymarketAviationWeatherResolutionSource,
} from '../aviationweather';

const raw = 'METAR KDAL 260053Z 14008KT 10SM CLR 12/02 A3011 RMK AO2';
const response = (text: string, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    body: null,
    text: async () => text,
  }) as Response;

const input = { stationId: 'KDAL', date: '2026-11-27T09:00:00.000Z', hours: 30 };
const sourceUrl =
  'https://aviationweather.gov/api/data/metar?ids=KDAL&format=raw&date=2026-11-27T09%3A00%3A00.000Z&hours=30';

describe('Polymarket AviationWeather METAR evidence', () => {
  it('captures bounded raw reports with station, query and retrieval provenance', async () => {
    const fetcher = jest.fn(async () =>
      response(`${raw}\nSPECI KDAL 260110Z 15009KT 10SM CLR 12/02 A3010 RMK AO2`)
    );
    const evidence = await fetchPolymarketAviationWeatherMetarEvidence(input, {
      fetcher: fetcher as typeof fetch,
      now: () => new Date('2026-11-26T01:20:00.000Z'),
    });

    expect(new URL(String(fetcher.mock.calls[0]?.[0])).searchParams.get('hours')).toBe('30');
    expect(evidence).toMatchObject({
      schema: 'insight.polymarket-aviationweather-metar.v1',
      source: 'us-aviation-weather-center-data-api',
      stationId: 'KDAL',
      date: input.date,
      hours: 30,
      reports: [raw, expect.stringContaining('SPECI KDAL')],
      retrievedAt: '2026-11-26T01:20:00.000Z',
    });
    expect(evidence.disclosure).toContain('does not parse temperatures');
  });

  it('rejects reports for another station and empty windows', async () => {
    await expect(
      fetchPolymarketAviationWeatherMetarEvidence(input, {
        fetcher: (async () => response(raw.replace('KDAL', 'KDFW'))) as typeof fetch,
      })
    ).rejects.toThrow(/different-station/);
    await expect(
      fetchPolymarketAviationWeatherMetarEvidence(input, {
        fetcher: (async () => response(raw.replace('KDAL ', 'KDALX '))) as typeof fetch,
      })
    ).rejects.toThrow(/different-station/);
    await expect(
      fetchPolymarketAviationWeatherMetarEvidence(input, {
        fetcher: (async () => response('', 204)) as typeof fetch,
      })
    ).rejects.toThrow(/report count is empty/);
  });

  it('binds only the exact fixed AviationWeather query for the reviewed station and window', () => {
    expect(matchesPolymarketAviationWeatherResolutionSource(sourceUrl, input)).toBe(true);
    expect(
      matchesPolymarketAviationWeatherResolutionSource(sourceUrl.replace('KDAL', 'KDFW'), input)
    ).toBe(false);
    expect(
      matchesPolymarketAviationWeatherResolutionSource(
        `${sourceUrl}&url=https://example.com`,
        input
      )
    ).toBe(false);
  });
});
