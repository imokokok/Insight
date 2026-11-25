import { fetchPolymarketBlsSeriesEvidence } from '../bls';

const input = { seriesId: 'CUUR0000SA0', year: '2026', period: 'M10' };
const originalRegistrationKey = process.env.BLS_API_REGISTRATION_KEY;
const originalNodeEnv = process.env.NODE_ENV;
const response = (body: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => null },
    text: async () => JSON.stringify(body),
  }) as Response;

describe('Polymarket BLS series evidence', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    Reflect.deleteProperty(globalThis, 'fetch');
    if (originalRegistrationKey === undefined) delete process.env.BLS_API_REGISTRATION_KEY;
    else process.env.BLS_API_REGISTRATION_KEY = originalRegistrationKey;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
  });

  it('returns the exact matching observation with source and footnote provenance', async () => {
    delete process.env.BLS_API_REGISTRATION_KEY;
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      value: jest.fn(async () =>
        response({
          status: 'REQUEST_SUCCEEDED',
          Results: [
            {
              series: [
                {
                  seriesID: input.seriesId,
                  data: [
                    {
                      year: '2026',
                      period: 'M09',
                      periodName: 'September',
                      value: '324.100',
                      footnotes: [],
                    },
                    {
                      year: '2026',
                      period: 'M10',
                      periodName: 'October',
                      value: '325.250',
                      footnotes: [{ code: 'P', text: 'Preliminary.' }],
                    },
                  ],
                },
              ],
            },
          ],
        })
      ),
    });

    const evidence = await fetchPolymarketBlsSeriesEvidence(input);

    expect(evidence.sourceUrl).toBe('https://api.bls.gov/publicAPI/v1/timeseries/data/CUUR0000SA0');
    expect(evidence.observation).toMatchObject({
      year: '2026',
      period: 'M10',
      value: '325.250',
      numericValue: 325.25,
      footnotes: [{ code: 'P', text: 'Preliminary.' }],
    });
    expect(evidence.retrievedAt).toEqual(expect.any(String));
  });

  it('uses the registered v2 API without exposing its key in evidence', async () => {
    process.env.BLS_API_REGISTRATION_KEY = 'test-registration-key';
    const fetchMock = jest.fn(async (url: RequestInfo | URL) => {
      expect(new URL(String(url)).searchParams.get('registrationkey')).toBe(
        'test-registration-key'
      );
      return response({
        status: 'REQUEST_SUCCEEDED',
        Results: {
          series: [
            {
              seriesID: input.seriesId,
              data: [
                {
                  year: '2026',
                  period: 'M10',
                  periodName: 'October',
                  value: '325.25',
                  footnotes: [{}],
                },
              ],
            },
          ],
        },
      });
    });
    Object.defineProperty(globalThis, 'fetch', { configurable: true, value: fetchMock });

    const evidence = await fetchPolymarketBlsSeriesEvidence(input);

    expect(evidence.apiVersion).toBe(2);
    expect(evidence.source).toBe('us-bls-public-data-api-v2');
    expect(evidence.sourceUrl).not.toContain('test-registration-key');
    expect(evidence.observation.footnotes).toEqual([{ code: '', text: '' }]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reuses the exact upstream retrieval time while the series response is cached', async () => {
    delete process.env.BLS_API_REGISTRATION_KEY;
    const seriesId = 'LNS00000001';
    const fetchMock = jest.fn(async () =>
      response({
        status: 'REQUEST_SUCCEEDED',
        Results: [
          {
            series: [
              {
                seriesID: seriesId,
                data: [
                  {
                    year: '2026',
                    period: 'M09',
                    periodName: 'September',
                    value: '4.0',
                    footnotes: [],
                  },
                  {
                    year: '2026',
                    period: 'M10',
                    periodName: 'October',
                    value: '4.1',
                    footnotes: [],
                  },
                ],
              },
            ],
          },
        ],
      })
    );
    Object.defineProperty(globalThis, 'fetch', { configurable: true, value: fetchMock });

    const september = await fetchPolymarketBlsSeriesEvidence({ ...input, seriesId, period: 'M09' });
    const october = await fetchPolymarketBlsSeriesEvidence({ ...input, seriesId, period: 'M10' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(october.retrievedAt).toBe(september.retrievedAt);
  });

  it('requires the registered key in production instead of silently using the low-quota v1 API', async () => {
    delete process.env.BLS_API_REGISTRATION_KEY;
    process.env.NODE_ENV = 'production';
    await expect(fetchPolymarketBlsSeriesEvidence(input)).rejects.toThrow(
      'BLS_API_REGISTRATION_KEY is required for production'
    );
  });

  it('fails closed when the requested observation or numeric value is unavailable', async () => {
    const invalidInput = { ...input, seriesId: 'LNS14000000' };
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      value: jest.fn(async () =>
        response({
          status: 'REQUEST_SUCCEEDED',
          Results: [
            {
              series: [
                {
                  seriesID: invalidInput.seriesId,
                  data: [{ year: '2026', period: 'M10', periodName: 'October', value: '-' }],
                },
              ],
            },
          ],
        })
      ),
    });
    await expect(fetchPolymarketBlsSeriesEvidence(invalidInput)).rejects.toThrow(
      'not a numeric value'
    );
  });

  it('rejects an upstream response for a different series and unsuccessful responses', async () => {
    const mismatchInput = { ...input, seriesId: 'CUUR0000SA1' };
    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      value: jest.fn(async () =>
        response({
          status: 'REQUEST_SUCCEEDED',
          Results: [{ series: [{ seriesID: 'LNS14000000', data: [] }] }],
        })
      ),
    });
    await expect(fetchPolymarketBlsSeriesEvidence(mismatchInput)).rejects.toThrow(
      'different or malformed'
    );

    Object.defineProperty(globalThis, 'fetch', {
      configurable: true,
      value: jest.fn(async () => response({ status: 'REQUEST_FAILED', Results: [] })),
    });
    await expect(fetchPolymarketBlsSeriesEvidence(mismatchInput)).rejects.toThrow(
      'did not return a successful'
    );
  });
});
