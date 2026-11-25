import { z } from 'zod';

const MAX_RESPONSE_BYTES = 256_000;
const REQUEST_TIMEOUT_MS = 4_000;
const MAX_FRED_WINDOW_MS = 3_660 * 24 * 60 * 60 * 1_000;

export const PolymarketSecSubmissionsInputSchema = z
  .object({
    cik: z
      .string()
      .regex(/^\d{1,10}$/)
      .transform((value) => value.padStart(10, '0')),
    recordCount: z.number().int().min(1).max(5),
  })
  .strict();
export type PolymarketSecSubmissionsInput = z.infer<typeof PolymarketSecSubmissionsInputSchema>;

export const PolymarketBeaNipaInputSchema = z
  .object({
    tableName: z.string().regex(/^T\d{5,6}$/),
    frequency: z.enum(['A', 'Q', 'M']),
    year: z.string().regex(/^(19|20|21)\d{2}$/),
  })
  .strict();
export type PolymarketBeaNipaInput = z.infer<typeof PolymarketBeaNipaInputSchema>;

export const PolymarketFredSeriesInputSchema = z
  .object({
    seriesId: z.string().regex(/^[A-Za-z0-9_]{1,32}$/),
    observationStart: z.string().refine(validIsoDate),
    observationEnd: z.string().refine(validIsoDate),
    limit: z.number().int().min(1).max(25),
  })
  .strict()
  .refine(
    (value) => {
      const windowMs = Date.parse(value.observationEnd) - Date.parse(value.observationStart);
      return windowMs >= 0 && windowMs <= MAX_FRED_WINDOW_MS;
    },
    { message: 'FRED observation window must be ordered and no longer than ten years' }
  );
export type PolymarketFredSeriesInput = z.infer<typeof PolymarketFredSeriesInputSchema>;

export const PolymarketOpenFdaApplicationInputSchema = z
  .object({
    applicationNumber: z
      .string()
      .regex(/^(NDA|BLA|ANDA)\d{1,6}$/i)
      .transform((value) => value.toUpperCase()),
  })
  .strict();
export type PolymarketOpenFdaApplicationInput = z.infer<
  typeof PolymarketOpenFdaApplicationInputSchema
>;

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function validIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validCompactDate(value: string): boolean {
  return (
    /^\d{8}$/.test(value) &&
    validIsoDate(`${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`)
  );
}

async function readBoundedJson(response: Response, limit = MAX_RESPONSE_BYTES): Promise<unknown> {
  const length = Number(response.headers.get('content-length'));
  if (Number.isFinite(length) && length > limit)
    throw new Error('Source response exceeds the size limit');
  if (!response.body || typeof response.body.getReader !== 'function')
    throw new Error('Source response stream is missing');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel();
        throw new Error('Source response exceeds the size limit');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as unknown;
  } catch {
    throw new Error('Source returned invalid JSON');
  }
}

async function requestJson(
  url: URL,
  init: RequestInit = {},
  limit = MAX_RESPONSE_BYTES
): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    cache: 'no-store',
    redirect: 'error',
  });
  if (!response.ok) throw new Error(`Source returned HTTP ${response.status}`);
  return readBoundedJson(response, limit);
}

function disclosure(source: string): string {
  return `Captured on demand from ${source} over HTTPS. This is a bounded source record; it does not interpret market rules, evaluate event outcomes, forecast, recommend a position, and does not authorize execution. It does not grant transaction authority. Human review is required.`;
}

/** Capture at most five recent filings for one exact SEC CIK. Never searches across issuers. */
export async function fetchPolymarketSecSubmissionsEvidence(input: PolymarketSecSubmissionsInput) {
  const cik = input.cik.padStart(10, '0');
  const userAgent = process.env.SEC_EDGAR_USER_AGENT?.trim();
  if (
    !userAgent ||
    userAgent.length > 200 ||
    /[\r\n]/.test(userAgent) ||
    !/^Insight .+ \S+@\S+\.\S+$/.test(userAgent)
  ) {
    throw new Error('SEC_EDGAR_USER_AGENT must identify Insight and provide a contact email');
  }
  const sourceUrl = `https://data.sec.gov/submissions/CIK${cik}.json`;
  const payload = record(
    await requestJson(new URL(sourceUrl), {
      headers: { accept: 'application/json', 'user-agent': userAgent },
    })
  );
  const recent = record(record(payload?.filings)?.recent);
  if (
    payload?.cik !== cik ||
    !recent ||
    !Array.isArray(recent.form) ||
    !Array.isArray(recent.filingDate) ||
    !Array.isArray(recent.accessionNumber) ||
    !Array.isArray(recent.primaryDocument)
  )
    throw new Error('SEC submissions response is malformed or references another CIK');
  const forms = recent.form as unknown[];
  const filingDates = recent.filingDate as unknown[];
  const accessionNumbers = recent.accessionNumber as unknown[];
  const primaryDocuments = recent.primaryDocument as unknown[];
  const rows = forms
    .map((form, index) => ({
      form,
      filingDate: filingDates[index],
      accessionNumber: accessionNumbers[index],
      primaryDocument: primaryDocuments[index],
    }))
    .slice(0, input.recordCount);
  if (
    rows.length === 0 ||
    rows.some(
      (row) =>
        typeof row.form !== 'string' ||
        row.form.length > 24 ||
        typeof row.filingDate !== 'string' ||
        !validIsoDate(row.filingDate) ||
        typeof row.accessionNumber !== 'string' ||
        !/^\d{10}-\d{2}-\d{6}$/.test(row.accessionNumber) ||
        typeof row.primaryDocument !== 'string' ||
        row.primaryDocument.length > 180
    )
  )
    throw new Error('SEC submissions contain missing or malformed filing records');
  return {
    schema: 'insight.polymarket-sec-submissions.v1',
    source: 'us-sec-edgar-data-api',
    sourceUrl,
    cik,
    companyName: typeof payload.name === 'string' ? payload.name.slice(0, 200) : null,
    filings: rows,
    retrievedAt: new Date().toISOString(),
    disclosure: disclosure('SEC EDGAR'),
  };
}

/** Capture a bounded slice from one BEA NIPA table/year request; no API key is included in evidence. */
export async function fetchPolymarketBeaNipaEvidence(input: PolymarketBeaNipaInput) {
  const userId = process.env.BEA_API_USER_ID?.trim();
  if (!userId || userId.length > 100)
    throw new Error('BEA_API_USER_ID is required for BEA evidence');
  const url = new URL('https://apps.bea.gov/api/data/');
  url.searchParams.set('UserID', userId);
  url.searchParams.set('method', 'GetData');
  url.searchParams.set('datasetname', 'NIPA');
  url.searchParams.set('TableName', input.tableName);
  url.searchParams.set('Frequency', input.frequency);
  url.searchParams.set('Year', input.year);
  url.searchParams.set('ResultFormat', 'JSON');
  const payload = record(
    await requestJson(url, { headers: { accept: 'application/json' } }, 96_000)
  );
  const results = record(payload?.BEAAPI)?.Results;
  const result = record(results);
  if (typeof result?.ErrorCode === 'string' || !Array.isArray(result?.Data)) {
    throw new Error('BEA returned an error or malformed NIPA response');
  }
  const allRows = result.Data;
  const rows = allRows.slice(0, 20).map((entry) => {
    const row = record(entry);
    if (
      !row ||
      typeof row.TableName !== 'string' ||
      typeof row.LineNumber !== 'string' ||
      typeof row.LineDescription !== 'string' ||
      typeof row.TimePeriod !== 'string' ||
      typeof row.DataValue !== 'string'
    )
      throw new Error('BEA returned a malformed data row');
    return {
      tableName: row.TableName.slice(0, 24),
      lineNumber: row.LineNumber.slice(0, 16),
      lineDescription: row.LineDescription.slice(0, 180),
      timePeriod: row.TimePeriod.slice(0, 32),
      dataValue: row.DataValue.slice(0, 64),
      unit: typeof row.Unit === 'string' ? row.Unit.slice(0, 80) : null,
      noteRef: typeof row.NoteRef === 'string' ? row.NoteRef.slice(0, 80) : null,
    };
  });
  if (rows.length === 0)
    throw new Error('BEA returned no records for the requested table and period');
  return {
    schema: 'insight.polymarket-bea-nipa.v1',
    source: 'us-bureau-of-economic-analysis-api',
    sourceUrl: 'https://apps.bea.gov/api/data/',
    dataset: 'NIPA',
    tableName: input.tableName,
    frequency: input.frequency,
    year: input.year,
    records: rows,
    partial: allRows.length > rows.length,
    retrievedAt: new Date().toISOString(),
    disclosure: disclosure('the BEA NIPA API'),
  };
}

/** Capture at most 25 observations from one exact FRED series and a caller-declared date range. */
export async function fetchPolymarketFredSeriesEvidence(input: PolymarketFredSeriesInput) {
  const apiKey = process.env.FRED_API_KEY?.trim();
  if (!apiKey || apiKey.length > 100) throw new Error('FRED_API_KEY is required for FRED evidence');
  const url = new URL('https://api.stlouisfed.org/fred/series/observations');
  url.searchParams.set('series_id', input.seriesId);
  url.searchParams.set('observation_start', input.observationStart);
  url.searchParams.set('observation_end', input.observationEnd);
  url.searchParams.set('limit', String(input.limit));
  url.searchParams.set('sort_order', 'asc');
  url.searchParams.set('file_type', 'json');
  url.searchParams.set('api_key', apiKey);
  const payload = record(
    await requestJson(url, { headers: { accept: 'application/json' } }, 64_000)
  );
  if (!Array.isArray(payload?.observations)) {
    throw new Error('FRED returned a malformed observation response');
  }
  const observations = payload.observations.map((entry: unknown) => {
    const row = record(entry);
    if (
      !row ||
      typeof row.date !== 'string' ||
      !validIsoDate(row.date) ||
      !(typeof row.value === 'string' && (row.value === '.' || /^-?\d+(?:\.\d+)?$/.test(row.value)))
    ) {
      throw new Error('FRED returned a malformed or mismatched observation');
    }
    return { date: row.date, value: row.value };
  });
  if (observations.length > input.limit)
    throw new Error('FRED exceeded the requested observation limit');
  return {
    schema: 'insight.polymarket-fred-series.v1',
    source: 'federal-reserve-bank-of-st-louis-fred-api',
    sourceUrl: 'https://api.stlouisfed.org/fred/series/observations',
    termsUrl: 'https://fred.stlouisfed.org/docs/api/terms_of_use.html',
    seriesId: input.seriesId,
    observationStart: input.observationStart,
    observationEnd: input.observationEnd,
    observations,
    retrievedAt: new Date().toISOString(),
    disclosure: disclosure('the FRED API'),
  };
}

/** Capture the FDA Drugs@FDA record for one exact NDA/BLA/ANDA identifier. */
export async function fetchPolymarketOpenFdaApplicationEvidence(
  input: PolymarketOpenFdaApplicationInput
) {
  const applicationNumber = input.applicationNumber.toUpperCase();
  const url = new URL('https://api.fda.gov/drug/drugsfda.json');
  url.searchParams.set('search', `application_number:"${applicationNumber}"`);
  url.searchParams.set('limit', '5');
  const apiKey = process.env.OPENFDA_API_KEY?.trim();
  const headers: Record<string, string> = { accept: 'application/json' };
  if (apiKey) headers.authorization = `Basic ${btoa(`${apiKey}:`)}`;
  const payload = record(await requestJson(url, { headers }, 64_000));
  if (!Array.isArray(payload?.results)) throw new Error('openFDA returned a malformed response');
  const result = payload.results.find(
    (entry: unknown) => record(entry)?.application_number === applicationNumber
  );
  const app = record(result);
  if (!app) throw new Error('openFDA returned no exact matching application');
  const submissions = Array.isArray(app.submissions)
    ? app.submissions.slice(0, 20).map((entry: unknown) => {
        const row = record(entry);
        if (
          !row ||
          typeof row.submission_type !== 'string' ||
          typeof row.submission_status !== 'string' ||
          typeof row.submission_status_date !== 'string' ||
          !validCompactDate(row.submission_status_date)
        )
          throw new Error('openFDA returned a malformed submission');
        return {
          submissionType: row.submission_type.slice(0, 40),
          submissionStatus: row.submission_status.slice(0, 80),
          submissionStatusDate: row.submission_status_date.slice(0, 16),
        };
      })
    : [];
  return {
    schema: 'insight.polymarket-openfda-application.v1',
    source: 'us-fda-openfda-drugs-at-fda-api',
    sourceUrl: 'https://api.fda.gov/drug/drugsfda.json',
    applicationNumber,
    sponsorName: typeof app.sponsor_name === 'string' ? app.sponsor_name.slice(0, 200) : null,
    submissions,
    retrievedAt: new Date().toISOString(),
    disclosure: disclosure('openFDA Drugs@FDA'),
  };
}
