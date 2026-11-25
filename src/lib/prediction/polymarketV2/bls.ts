import { z } from 'zod';

const BLS_API = 'https://api.bls.gov/publicAPI/v1/timeseries/data';
const BLS_V2_CALCULATIONS_API = 'https://api.bls.gov/publicAPI/v2/timeseries/data/';
const MAX_RESPONSE_BYTES = 1_000_000;
const SERIES_CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_CACHED_SERIES = 100;

type CachedSeries = {
  expiresAt: number;
  retrievedAt: string;
  data: unknown[];
};

const seriesCache = new Map<string, CachedSeries>();

export const PolymarketBlsEvidenceInputSchema = z.object({
  seriesId: z.string().regex(/^[A-Z0-9_#-]{1,32}$/),
  // The shared query middleware converts integer-shaped values to numbers.
  // Coerce the public year query back to its canonical string form here.
  year: z.coerce.string().regex(/^(19|20|21)\d{2}$/),
  period: z.string().regex(/^(M(0[1-9]|1[0-3])|Q0[1-4]|A01)$/),
});
export type PolymarketBlsEvidenceInput = z.infer<typeof PolymarketBlsEvidenceInputSchema>;

export type PolymarketBlsSeriesEvidence = {
  schema: 'insight.polymarket-bls-series-evidence.v1';
  source: 'us-bls-public-data-api-v1' | 'us-bls-public-data-api-v2';
  apiVersion: 1 | 2;
  sourceUrl: string;
  seriesId: string;
  observation: {
    year: string;
    period: string;
    periodName: string;
    value: string;
    numericValue: number;
    footnotes: Array<{ code: string; text: string }>;
  };
  retrievedAt: string;
  disclosure: string;
};

export const PolymarketBlsPercentChangeInputSchema = PolymarketBlsEvidenceInputSchema.extend({
  months: z.literal(12),
});
export type PolymarketBlsPercentChangeInput = z.infer<typeof PolymarketBlsPercentChangeInputSchema>;

export type PolymarketBlsPercentChangeEvidence = {
  schema: 'insight.polymarket-bls-percent-change-evidence.v1';
  source: 'us-bls-public-data-api-v2';
  apiVersion: 2;
  sourceUrl: string;
  seriesId: string;
  months: 12;
  observation: {
    year: string;
    period: string;
    periodName: string;
    value: string;
    footnotes: Array<{ code: string; text: string }>;
  };
  baseObservation: {
    year: string;
    period: string;
    value: string;
    footnotes: Array<{ code: string; text: string }>;
  };
  calculation: { type: 'percent-change'; value: string; blsValue: string };
  retrievedAt: string;
  disclosure: string;
};

function exactPercentChange(current: string, base: string): string {
  const decimal = (value: string) => {
    if (!/^-?\d+(?:\.\d+)?$/.test(value)) throw new Error('BLS observation is not a numeric value');
    const negative = value.startsWith('-');
    const unsigned = negative ? value.slice(1) : value;
    const [whole, fraction = ''] = unsigned.split('.');
    return {
      coefficient: BigInt(`${negative ? '-' : ''}${whole}${fraction}`),
      scale: fraction.length,
    };
  };
  const a = decimal(current);
  const b = decimal(base);
  if (b.coefficient === 0n) throw new Error('BLS base observation is zero');
  const scale = Math.max(a.scale, b.scale);
  const av = a.coefficient * 10n ** BigInt(scale - a.scale);
  const bv = b.coefficient * 10n ** BigInt(scale - b.scale);
  const numerator = (av - bv) * 1000n;
  const denominator = bv;
  const negative = numerator < 0n !== denominator < 0n;
  const absNum = numerator < 0n ? -numerator : numerator;
  const absDen = denominator < 0n ? -denominator : denominator;
  const rounded = (absNum * 2n + absDen) / (absDen * 2n);
  const signed = negative ? -rounded : rounded;
  return `${signed / 10n}.${signed < 0n ? -(signed % 10n) : signed % 10n}`;
}

/** Fetch a registered BLS v2 12-month percent change and bind it to its raw observations. */
export async function fetchPolymarketBlsPercentChangeEvidence(
  input: PolymarketBlsPercentChangeInput
): Promise<PolymarketBlsPercentChangeEvidence> {
  const registrationKey = process.env.BLS_API_REGISTRATION_KEY?.trim();
  if (!registrationKey)
    throw new Error('BLS API v2 registration key is required for calculated evidence');
  const year = Number(input.year);
  const response = await fetch(BLS_V2_CALCULATIONS_API, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({
      seriesid: [input.seriesId],
      startyear: String(year - 1),
      endyear: input.year,
      calculations: true,
      registrationkey: registrationKey,
    }),
    signal: AbortSignal.timeout(8_000),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`BLS returned HTTP ${response.status}`);
  const payload = record(await readBoundedJson(response));
  if (payload?.status !== 'REQUEST_SUCCEEDED')
    throw new Error('BLS did not return a successful calculation response');
  const result = Array.isArray(payload.Results)
    ? record(payload.Results[0])
    : record(payload.Results);
  if (!Array.isArray(result?.series)) throw new Error('BLS calculation response is malformed');
  const series = record(result.series[0]);
  if (series?.seriesID !== input.seriesId || !Array.isArray(series.data))
    throw new Error('BLS returned a different or malformed series');
  const rows = series.data
    .map(record)
    .filter((row): row is Record<string, unknown> => row !== null);
  const current = rows.find((row) => row.year === input.year && row.period === input.period);
  const baseYear = String(year - 1);
  const base = rows.find((row) => row.year === baseYear && row.period === input.period);
  if (!current || !base)
    throw new Error('BLS observation or 12-month base observation is not available');
  const numeric = (row: Record<string, unknown>) =>
    typeof row.value === 'string' && /^-?\d+(?:\.\d+)?$/.test(row.value.trim())
      ? row.value.trim()
      : null;
  const currentValue = numeric(current);
  const baseValue = numeric(base);
  if (!currentValue || !baseValue)
    throw new Error('BLS observation or 12-month base observation is not numeric');
  const calculations = record(current.calculations);
  const changes = record(calculations?.pct_changes);
  const blsValue = changes?.['12'];
  if (typeof blsValue !== 'string' || !/^-?\d+(?:\.\d+)?$/.test(blsValue))
    throw new Error('BLS 12-month percent change is missing or malformed');
  const calculated = exactPercentChange(currentValue, baseValue);
  if (calculated !== blsValue)
    throw new Error('BLS 12-month calculation does not match the captured observations');
  const periodName = typeof current.periodName === 'string' ? current.periodName : null;
  if (!periodName || periodName.length > 100)
    throw new Error('BLS period name is missing or malformed');
  const footnotes = (row: Record<string, unknown>) => parseFootnotes(row.footnotes ?? []);
  return {
    schema: 'insight.polymarket-bls-percent-change-evidence.v1',
    source: 'us-bls-public-data-api-v2',
    apiVersion: 2,
    sourceUrl: BLS_V2_CALCULATIONS_API,
    seriesId: input.seriesId,
    months: 12,
    observation: {
      year: input.year,
      period: input.period,
      periodName,
      value: currentValue,
      footnotes: footnotes(current),
    },
    baseObservation: {
      year: baseYear,
      period: input.period,
      value: baseValue,
      footnotes: footnotes(base),
    },
    calculation: { type: 'percent-change', value: blsValue, blsValue },
    retrievedAt: new Date().toISOString(),
    disclosure:
      'BLS.gov cannot vouch for the data or analyses derived from these data after the data have been retrieved from BLS.gov. Retrieved over HTTPS. BLS calculated percent change is independently checked against the captured observations. This source record does not interpret market rules, evaluate event outcomes, forecast, recommend a position, or authorize execution.',
  };
}

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

async function readBoundedJson(response: Response): Promise<unknown> {
  const contentLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
    throw new Error('BLS response exceeds the size limit');
  }
  if (!response.body) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > MAX_RESPONSE_BYTES) {
      throw new Error('BLS response exceeds the size limit');
    }
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new Error('BLS returned invalid JSON');
    }
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error('BLS response exceeds the size limit');
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
    return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
  } catch {
    throw new Error('BLS returned invalid JSON');
  }
}

function parseFootnotes(value: unknown): Array<{ code: string; text: string }> {
  if (!Array.isArray(value) || value.length > 20) throw new Error('BLS footnotes are malformed');
  return value.map((entry) => {
    const footnote = record(entry);
    if (
      !footnote ||
      (footnote.code !== undefined && typeof footnote.code !== 'string') ||
      (footnote.text !== undefined && typeof footnote.text !== 'string')
    ) {
      throw new Error('BLS footnote is malformed');
    }
    // BLS uses an empty object ({}) for some observations with no footnote.
    const code = typeof footnote.code === 'string' ? footnote.code : '';
    const text = typeof footnote.text === 'string' ? footnote.text : '';
    if (code.length > 20 || text.length > 500)
      throw new Error('BLS footnote exceeds the size limit');
    return { code, text };
  });
}

/** Retrieve one exact, public BLS observation. This does not infer market rules or settlement. */
export async function fetchPolymarketBlsSeriesEvidence(
  input: PolymarketBlsEvidenceInput
): Promise<PolymarketBlsSeriesEvidence> {
  const registrationKey = process.env.BLS_API_REGISTRATION_KEY?.trim();
  if (!registrationKey && process.env.NODE_ENV === 'production') {
    throw new Error('BLS_API_REGISTRATION_KEY is required for production BLS evidence queries');
  }
  const apiVersion = registrationKey ? 2 : 1;
  const source = `us-bls-public-data-api-v${apiVersion}` as PolymarketBlsSeriesEvidence['source'];
  const sourceUrl = `${BLS_API.replace('/v1/', `/v${apiVersion}/`)}/${encodeURIComponent(input.seriesId)}`;
  const cacheKey = `${apiVersion}:${input.seriesId}`;
  const now = Date.now();
  let cached = seriesCache.get(cacheKey);
  if (cached && cached.expiresAt <= now) {
    seriesCache.delete(cacheKey);
    cached = undefined;
  }
  if (!cached) {
    const requestUrl = new URL(sourceUrl);
    if (registrationKey) requestUrl.searchParams.set('registrationkey', registrationKey);
    const response = await fetch(requestUrl, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(8_000),
      cache: 'no-store',
    });
    if (!response.ok) throw new Error(`BLS returned HTTP ${response.status}`);
    const payload = record(await readBoundedJson(response));
    if (payload?.status !== 'REQUEST_SUCCEEDED') {
      throw new Error('BLS did not return a successful series response');
    }
    // The v1 and multi-series signatures return Results as an array, while the
    // registered v2 single-series GET signature returns Results as an object.
    const result = Array.isArray(payload.Results)
      ? record(payload.Results[0])
      : record(payload.Results);
    if (!Array.isArray(result?.series)) throw new Error('BLS series response is malformed');
    const series = record(result.series[0]);
    if (series?.seriesID !== input.seriesId || !Array.isArray(series.data)) {
      throw new Error('BLS returned a different or malformed series');
    }
    cached = {
      expiresAt: now + SERIES_CACHE_TTL_MS,
      retrievedAt: new Date().toISOString(),
      data: series.data,
    };
    seriesCache.delete(cacheKey);
    seriesCache.set(cacheKey, cached);
    while (seriesCache.size > MAX_CACHED_SERIES) {
      const oldestKey = seriesCache.keys().next().value;
      if (oldestKey === undefined) break;
      seriesCache.delete(oldestKey);
    }
  } else {
    // Refresh insertion order so frequently requested series stay in the bounded cache.
    seriesCache.delete(cacheKey);
    seriesCache.set(cacheKey, cached);
  }
  const observation = cached.data
    .map(record)
    .find((item) => item?.year === input.year && item.period === input.period);
  if (!observation)
    throw new Error('BLS observation for the requested year and period was not found');
  const rawValue = typeof observation.value === 'string' ? observation.value.trim() : '';
  if (!/^-?\d+(?:\.\d+)?$/.test(rawValue)) {
    throw new Error('BLS observation is not a numeric value');
  }
  const numericValue = Number(rawValue);
  if (!Number.isFinite(numericValue))
    throw new Error('BLS observation is outside the supported numeric range');
  const periodName = typeof observation.periodName === 'string' ? observation.periodName : null;
  if (!periodName) throw new Error('BLS period name is missing');
  if (periodName.length > 100) throw new Error('BLS period name exceeds the size limit');

  return {
    schema: 'insight.polymarket-bls-series-evidence.v1',
    source,
    apiVersion,
    sourceUrl,
    seriesId: input.seriesId,
    observation: {
      year: input.year,
      period: input.period,
      periodName,
      value: rawValue,
      numericValue,
      footnotes: parseFootnotes(observation.footnotes ?? []),
    },
    retrievedAt: cached.retrievedAt,
    disclosure:
      'BLS.gov cannot vouch for the data or analyses derived from these data after the data have been retrieved from BLS.gov. Retrieved over HTTPS. This record does not interpret Polymarket rules, independently authenticate the response, or authorize a market outcome.',
  };
}
