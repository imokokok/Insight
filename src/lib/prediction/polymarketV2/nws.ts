import { z } from 'zod';

const API_BASE = 'https://api.weather.gov';
const MAX_RESPONSE_BYTES = 128_000;

export const PolymarketNwsObservationInputSchema = z
  .object({
    stationId: z
      .string()
      .trim()
      .regex(/^[A-Z0-9-]{3,10}$/),
    property: z.enum([
      'temperature',
      'dewpoint',
      'windSpeed',
      'windDirection',
      'windGust',
      'barometricPressure',
      'seaLevelPressure',
      'visibility',
      'maxTemperatureLast24Hours',
      'minTemperatureLast24Hours',
      'precipitationLastHour',
      'precipitationLast3Hours',
      'precipitationLast6Hours',
    ]),
  })
  .strict();
export type PolymarketNwsObservationInput = z.infer<typeof PolymarketNwsObservationInputSchema>;

export type PolymarketNwsObservationEvidence = {
  schema: 'insight.polymarket-nws-observation.v1';
  source: 'us-national-weather-service-api';
  sourceUrl: string;
  observationUrl: string;
  stationId: string;
  observedAt: string;
  description: string | null;
  property: PolymarketNwsObservationInput['property'];
  measurement: {
    value: number;
    unitCode: string;
    qualityControl: string[];
  };
  retrievedAt: string;
  disclosure: string;
};

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function validNwsUrl(value: unknown, stationId: string): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      url.hostname === 'api.weather.gov' &&
      !url.username &&
      !url.password &&
      (url.pathname.toUpperCase() === `/STATIONS/${stationId.toUpperCase()}` ||
        url.pathname.toUpperCase().startsWith(`/STATIONS/${stationId.toUpperCase()}/`))
    );
  } catch {
    return false;
  }
}

async function readBoundedJson(response: Response): Promise<unknown> {
  const contentLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_RESPONSE_BYTES) {
    throw new Error('NWS response exceeds the size limit');
  }
  if (!response.body) {
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > MAX_RESPONSE_BYTES) {
      throw new Error('NWS response exceeds the size limit');
    }
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new Error('NWS returned invalid JSON');
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
        throw new Error('NWS response exceeds the size limit');
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
    throw new Error('NWS returned invalid JSON');
  }
}

/** Capture one NWS station measurement without interpreting any market rule or threshold. */
export async function fetchPolymarketNwsObservationEvidence(
  input: PolymarketNwsObservationInput
): Promise<PolymarketNwsObservationEvidence> {
  const endpoint = `${API_BASE}/stations/${encodeURIComponent(input.stationId)}/observations/latest`;
  const response = await fetch(endpoint, {
    headers: {
      accept: 'application/geo+json',
      'user-agent': 'Insight read-only source evidence (https://www.oracleinsight.xyz/)',
    },
    signal: AbortSignal.timeout(8_000),
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`NWS returned HTTP ${response.status}`);
  const payload = record(await readBoundedJson(response));
  const properties = record(payload?.properties);
  if (
    payload?.type !== 'Feature' ||
    !properties ||
    !validNwsUrl(properties.station, input.stationId) ||
    !validNwsUrl(payload['@id'], input.stationId)
  ) {
    throw new Error('NWS observation response is malformed or references a different station');
  }
  const timestamp = properties.timestamp;
  if (typeof timestamp !== 'string' || !Number.isFinite(Date.parse(timestamp))) {
    throw new Error('NWS observation timestamp is missing or malformed');
  }
  const field = record(properties[input.property]);
  if (
    !field ||
    typeof field.value !== 'number' ||
    !Number.isFinite(field.value) ||
    typeof field.unitCode !== 'string' ||
    field.unitCode.length < 1 ||
    field.unitCode.length > 80 ||
    (field.qualityControl !== undefined &&
      (!Array.isArray(field.qualityControl) ||
        field.qualityControl.length > 20 ||
        !field.qualityControl.every((item) => typeof item === 'string' && item.length <= 40)))
  ) {
    throw new Error('NWS observation field is missing, unmeasured, or malformed');
  }
  const description =
    typeof properties.textDescription === 'string' && properties.textDescription.length <= 160
      ? properties.textDescription
      : null;
  const observationUrl = payload['@id'];
  return {
    schema: 'insight.polymarket-nws-observation.v1',
    source: 'us-national-weather-service-api',
    sourceUrl: endpoint,
    observationUrl,
    stationId: input.stationId,
    observedAt: new Date(timestamp).toISOString(),
    description,
    property: input.property,
    measurement: {
      value: field.value,
      unitCode: field.unitCode,
      qualityControl: Array.isArray(field.qualityControl) ? (field.qualityControl as string[]) : [],
    },
    retrievedAt: new Date().toISOString(),
    disclosure:
      'Captured from the US National Weather Service API over HTTPS. Observation timing, station provider, quality control, revisions and availability follow the source. Some readings may be delayed or null until quality-control processing completes. This record does not interpret market rules, does not compare values to thresholds, does not determine event outcomes, forecast, recommend a position, or authorize execution.',
  };
}
