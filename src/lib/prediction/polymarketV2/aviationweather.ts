import { z } from 'zod';

const API_BASE = 'https://aviationweather.gov/api/data/metar';
// Leave room for the signed evidence envelope within PriorSeal's 64 KiB archive cap.
const MAX_RESPONSE_BYTES = 24_000;
const MAX_REPORTS = 100;
const MAX_REPORT_BYTES = 600;

export const PolymarketAviationWeatherMetarInputSchema = z
  .object({
    stationId: z
      .string()
      .trim()
      .regex(/^[A-Z0-9]{4}$/),
    date: z
      .string()
      .datetime({ offset: true })
      .refine((value) => value.endsWith('Z')),
    hours: z.number().int().min(1).max(48),
  })
  .strict();
export type PolymarketAviationWeatherMetarInput = z.infer<
  typeof PolymarketAviationWeatherMetarInputSchema
>;

export function matchesPolymarketAviationWeatherResolutionSource(
  resolutionSource: string,
  rawInput: PolymarketAviationWeatherMetarInput
): boolean {
  try {
    const input = PolymarketAviationWeatherMetarInputSchema.parse(rawInput);
    const url = new URL(resolutionSource);
    const expected = new URLSearchParams({
      ids: input.stationId,
      format: 'raw',
      date: new Date(input.date).toISOString(),
      hours: String(input.hours),
    });
    const keys = [...url.searchParams.keys()];
    return (
      url.protocol === 'https:' &&
      url.hostname === 'aviationweather.gov' &&
      !url.username &&
      !url.password &&
      !url.hash &&
      url.pathname === '/api/data/metar' &&
      keys.length === 4 &&
      new Set(keys).size === 4 &&
      [...expected].every(([key, value]) =>
        key === 'date'
          ? Date.parse(url.searchParams.get(key) ?? '') === Date.parse(value)
          : url.searchParams.get(key) === value
      )
    );
  } catch {
    return false;
  }
}

export type PolymarketAviationWeatherMetarEvidence = {
  schema: 'insight.polymarket-aviationweather-metar.v1';
  source: 'us-aviation-weather-center-data-api';
  sourceUrl: string;
  stationId: string;
  date: string;
  hours: number;
  reports: string[];
  retrievedAt: string;
  disclosure: string;
};

async function readBoundedText(response: Response): Promise<string> {
  const contentLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
    throw new Error('AviationWeather response exceeds the size limit');
  }
  if (!response.body) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > MAX_RESPONSE_BYTES) {
      throw new Error('AviationWeather response exceeds the size limit');
    }
    return text;
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
        throw new Error('AviationWeather response exceeds the size limit');
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
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error('AviationWeather returned invalid UTF-8');
  }
}

/** Capture a bounded raw METAR snapshot for a reviewed station and query window. */
export async function fetchPolymarketAviationWeatherMetarEvidence(
  rawInput: PolymarketAviationWeatherMetarInput,
  dependencies: { fetcher?: typeof fetch; now?: () => Date } = {}
): Promise<PolymarketAviationWeatherMetarEvidence> {
  const input = PolymarketAviationWeatherMetarInputSchema.parse(rawInput);
  const url = new URL(API_BASE);
  url.search = new URLSearchParams({
    ids: input.stationId,
    format: 'raw',
    date: new Date(input.date).toISOString(),
    hours: String(input.hours),
  }).toString();
  const response = await (dependencies.fetcher ?? fetch)(url.toString(), {
    headers: {
      accept: 'text/plain',
      'user-agent': 'Insight read-only source evidence (https://www.oracleinsight.xyz/)',
    },
    signal: AbortSignal.timeout(8_000),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`AviationWeather returned HTTP ${response.status}`);
  const text = await readBoundedText(response);
  const reports = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (reports.length < 1 || reports.length > MAX_REPORTS) {
    throw new Error('AviationWeather report count is empty or outside the reviewed limit');
  }
  for (const report of reports) {
    if (
      new TextEncoder().encode(report).byteLength > MAX_REPORT_BYTES ||
      (!report.startsWith(`METAR ${input.stationId} `) &&
        !report.startsWith(`SPECI ${input.stationId} `)) ||
      !/\b\d{6}Z\b/.test(report) ||
      !/^(?:METAR|SPECI)\s/.test(report)
    ) {
      throw new Error('AviationWeather returned a malformed or different-station report');
    }
  }
  return {
    schema: 'insight.polymarket-aviationweather-metar.v1',
    source: 'us-aviation-weather-center-data-api',
    sourceUrl: url.toString(),
    stationId: input.stationId,
    date: new Date(input.date).toISOString(),
    hours: input.hours,
    reports,
    retrievedAt: (dependencies.now ?? (() => new Date()))().toISOString(),
    disclosure:
      'This is a timestamped snapshot of raw METAR reports returned by the US Aviation Weather Center Data API over HTTPS. The source query may describe a window that is still in progress; the snapshot does not establish that the full window has been observed. Reports may be corrected or delayed. This record does not parse temperatures, compare observations to thresholds, determine event outcomes, forecast, recommend positions, or authorize execution.',
  };
}
