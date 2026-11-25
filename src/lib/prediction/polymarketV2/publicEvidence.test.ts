import { ReadableStream } from 'node:stream/web';

import {
  fetchPolymarketBeaNipaEvidence,
  fetchPolymarketFredSeriesEvidence,
  fetchPolymarketOpenFdaApplicationEvidence,
  fetchPolymarketSecSubmissionsEvidence,
} from './publicEvidence';
import { PolymarketEvidenceRegistrySchema } from './registry';

const originalFetch = globalThis.fetch;
const originalEnv = {
  SEC_EDGAR_USER_AGENT: process.env.SEC_EDGAR_USER_AGENT,
  BEA_API_USER_ID: process.env.BEA_API_USER_ID,
  FRED_API_KEY: process.env.FRED_API_KEY,
  OPENFDA_API_KEY: process.env.OPENFDA_API_KEY,
};

function jsonResponse(value: unknown): Response {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  return {
    ok: true,
    status: 200,
    headers: new Headers({ 'content-length': String(bytes.byteLength) }),
    body: new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    }),
  } as Response;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  jest.restoreAllMocks();
});

describe('bounded Polymarket public source evidence adapters', () => {
  it('limits one public record per provider and eight observations per reviewed market', () => {
    const base = {
      marketId: 'market-1',
      rulesDigest: `0x${'12'.repeat(32)}`,
      reviewedAt: '2026-11-25T00:00:00.000Z',
      reviewer: 'human-review',
    };
    const sec = {
      id: 'sec-a',
      provider: 'sec.submissions',
      input: { cik: '320193', recordCount: 2 },
    };
    expect(
      PolymarketEvidenceRegistrySchema.safeParse([
        { ...base, observations: [sec, { ...sec, id: 'sec-b' }] },
      ]).success
    ).toBe(false);
    expect(
      PolymarketEvidenceRegistrySchema.safeParse([
        {
          ...base,
          observations: Array.from({ length: 9 }, (_, index) => ({
            ...sec,
            id: `source-${index}`,
            provider: 'bls.series',
            input: { seriesId: 'CPIAUCSL', year: '2026', period: 'M10' },
          })),
        },
      ]).success
    ).toBe(false);
  });

  it('fetches one SEC CIK and returns only a capped recent filing slice', async () => {
    process.env.SEC_EDGAR_USER_AGENT = 'Insight source evidence contact@example.org';
    const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      expect(url.href).toBe('https://data.sec.gov/submissions/CIK0000320193.json');
      expect((init?.headers as Record<string, string>)['user-agent']).toContain(
        'contact@example.org'
      );
      return jsonResponse({
        cik: '0000320193',
        name: 'Example Corp',
        filings: {
          recent: {
            form: ['8-K', '10-Q', '10-K'],
            filingDate: ['2026-11-20', '2026-10-20', '2026-09-20'],
            accessionNumber: [
              '0000320193-26-000001',
              '0000320193-26-000002',
              '0000320193-26-000003',
            ],
            primaryDocument: ['a.htm', 'b.htm', 'c.htm'],
          },
        },
      });
    });
    globalThis.fetch = fetchMock;
    const evidence = await fetchPolymarketSecSubmissionsEvidence({ cik: '320193', recordCount: 2 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(evidence.filings).toHaveLength(2);
    expect(evidence.cik).toBe('0000320193');
  });

  it('bounds BEA responses and excludes the API credential from the evidence URL', async () => {
    process.env.BEA_API_USER_ID = 'test-bea-user';
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      expect(url.searchParams.get('UserID')).toBe('test-bea-user');
      expect(url.searchParams.get('TableName')).toBe('T10101');
      return jsonResponse({
        BEAAPI: {
          Results: {
            Data: [
              {
                TableName: 'T10101',
                LineNumber: '1',
                LineDescription: 'Gross domestic product',
                TimePeriod: '2026Q3',
                DataValue: '123.4',
                Unit: 'Billions of dollars',
                NoteRef: '',
              },
            ],
          },
        },
      });
    });
    globalThis.fetch = fetchMock;
    const evidence = await fetchPolymarketBeaNipaEvidence({
      tableName: 'T10101',
      frequency: 'Q',
      year: '2026',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(evidence.sourceUrl).not.toContain('test-bea-user');
    expect(evidence.records).toHaveLength(1);
  });

  it('requests a bounded FRED series window and excludes the API key from evidence', async () => {
    process.env.FRED_API_KEY = 'test-fred-key';
    const fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      expect(url.searchParams.get('api_key')).toBe('test-fred-key');
      expect(url.searchParams.get('limit')).toBe('2');
      return jsonResponse({
        observations: [
          { date: '2026-10-01', value: '101.2' },
          { date: '2026-11-01', value: '.' },
        ],
      });
    });
    globalThis.fetch = fetchMock;
    const evidence = await fetchPolymarketFredSeriesEvidence({
      seriesId: 'CPIAUCSL',
      observationStart: '2026-10-01',
      observationEnd: '2026-11-30',
      limit: 2,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(evidence.sourceUrl).not.toContain('test-fred-key');
    expect(evidence.observations).toHaveLength(2);
  });

  it('rejects FRED windows longer than ten years and invalid calendar dates', async () => {
    await expect(
      fetchPolymarketFredSeriesEvidence({
        seriesId: 'CPIAUCSL',
        observationStart: '2010-01-01',
        observationEnd: '2026-11-30',
        limit: 25,
      })
    ).rejects.toThrow();
    await expect(
      fetchPolymarketFredSeriesEvidence({
        seriesId: 'CPIAUCSL',
        observationStart: '2026-02-30',
        observationEnd: '2026-11-30',
        limit: 25,
      })
    ).rejects.toThrow();
  });

  it('queries one exact FDA application and returns a bounded metadata slice', async () => {
    process.env.OPENFDA_API_KEY = 'test-openfda-key';
    const fetchMock = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      expect(url.searchParams.has('api_key')).toBe(false);
      expect(new Headers(init?.headers).get('authorization')).toBe(
        `Basic ${btoa('test-openfda-key:')}`
      );
      expect(url.searchParams.get('search')).toContain('NDA021234');
      return jsonResponse({
        results: [
          {
            application_number: 'NDA021234',
            sponsor_name: 'Example Pharma',
            submissions: [
              {
                submission_type: 'ORIG',
                submission_status: 'AP',
                submission_status_date: '20200101',
              },
            ],
          },
        ],
      });
    });
    globalThis.fetch = fetchMock;
    const evidence = await fetchPolymarketOpenFdaApplicationEvidence({
      applicationNumber: 'nda021234',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(evidence.sourceUrl).not.toContain('test-openfda-key');
    expect(evidence.applicationNumber).toBe('NDA021234');
  });
});
