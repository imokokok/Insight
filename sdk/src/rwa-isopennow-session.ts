// Copyright (c) 2026 Insight. MIT. IsOpenNow market-session adapter.
import { RwaActionPreflightError, type RwaActionPreflightContext } from './rwa-preflight';
import {
  createRobinhoodRwaSessionResolver,
  ROBINHOOD_RWA_SESSION_SCHEMA,
  type RobinhoodRwaSessionResolver,
} from './rwa-robinhood-session';

import type { RwaSession } from './rwa';

const ISOPENNOW_STATUS_URL = 'https://www.isopennow.com/api/status';
const ISOPENNOW_CACHE_MAX_AGE_SECONDS = 30;
const DEFAULT_MAX_OBSERVATION_AGE_SECONDS = 90;
const MAX_OBSERVATION_AGE_SECONDS = 120;
const REFRESH_INTERVAL_SECONDS = 60;
const MAX_STATUS_RESPONSE_CHARS = 16_384;

const MARKET_BY_MIC: Readonly<Record<string, { id: string; timezone: string }>> = Object.freeze({
  XNAS: { id: 'nasdaq', timezone: 'America/New_York' },
  XNYS: { id: 'nyse', timezone: 'America/New_York' },
});

export interface IsOpenNowRwaSessionResolverOptions {
  /** Policy-pinned source ID. */
  sourceId: string;
  /** Optional freshness bound, including the upstream's 30-second HTTP cache allowance. */
  maxObservationAgeSeconds?: number;
  /** Allows a host application to provide its server-side fetch implementation. */
  fetchImpl?: typeof fetch;
}

type IsOpenNowStatus = {
  schema: typeof ROBINHOOD_RWA_SESSION_SCHEMA;
  sourceId: string;
  mic: string;
  session: RwaSession;
  observedAt: number;
  validUntil: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    Boolean(value) && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype
  );
}

function parseIsoTimestamp(value: unknown): number | null {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)
  ) {
    return null;
  }
  const milliseconds = Date.parse(value);
  return Number.isSafeInteger(milliseconds) && milliseconds > 0
    ? Math.floor(milliseconds / 1_000)
    : null;
}

function marketForMic(mic: string): { id: string; timezone: string } {
  const market = MARKET_BY_MIC[mic];
  if (!market) {
    throw new RwaActionPreflightError('RWA_PREFLIGHT_SOURCE_OUTPUT_INVALID');
  }
  return market;
}

function readStatus(
  payload: unknown,
  expectedId: string,
  expectedMic: string,
  expectedTimezone: string,
  requestTime: number,
  sourceId: string,
  maxObservationAgeSeconds: number
): IsOpenNowStatus {
  if (
    !isRecord(payload) ||
    payload.id !== expectedId ||
    payload.mic !== expectedMic ||
    payload.timezone !== expectedTimezone ||
    !['open', 'closed', 'unknown'].includes(String(payload.state)) ||
    typeof payload.isOpen !== 'boolean' ||
    typeof payload.suspended !== 'boolean' ||
    typeof payload.label !== 'string' ||
    payload.label.length === 0 ||
    payload.label.length > 64 ||
    (payload.reason !== null &&
      (typeof payload.reason !== 'string' || payload.reason.length > 512)) ||
    typeof payload.disclaimer !== 'string' ||
    payload.disclaimer.length === 0 ||
    payload.disclaimer.length > 2_048
  ) {
    throw new RwaActionPreflightError('RWA_PREFLIGHT_SOURCE_OUTPUT_INVALID');
  }

  const state = payload.state as 'open' | 'closed' | 'unknown';
  if (payload.isOpen !== (state === 'open') || (payload.suspended && state !== 'closed')) {
    throw new RwaActionPreflightError('RWA_PREFLIGHT_SOURCE_OUTPUT_INVALID');
  }

  const nextChange = parseIsoTimestamp(payload.nextChange);
  if (
    (state === 'unknown' && payload.nextChange !== null) ||
    (state !== 'unknown' && (nextChange === null || nextChange <= requestTime))
  ) {
    throw new RwaActionPreflightError('RWA_PREFLIGHT_SOURCE_OUTPUT_INVALID');
  }

  const session: RwaSession =
    state === 'open' ? 'REGULAR' : state === 'closed' ? 'CLOSED' : 'UNKNOWN';
  // The API is publicly cached for up to 30 seconds and does not expose a snapshot timestamp.
  const observedAt = requestTime - ISOPENNOW_CACHE_MAX_AGE_SECONDS;
  if (observedAt <= 0) {
    throw new RwaActionPreflightError('RWA_PREFLIGHT_SOURCE_OUTPUT_INVALID');
  }
  const validUntil = Math.min(
    observedAt + maxObservationAgeSeconds,
    nextChange ?? Number.MAX_SAFE_INTEGER
  );
  if (validUntil <= requestTime) {
    throw new RwaActionPreflightError('RWA_PREFLIGHT_SOURCE_OUTPUT_INVALID');
  }

  return {
    schema: ROBINHOOD_RWA_SESSION_SCHEMA,
    sourceId,
    mic: expectedMic,
    session,
    observedAt,
    validUntil,
  };
}

function createBoundedSignal(externalSignal?: AbortSignal): {
  signal: AbortSignal;
  dispose: () => void;
} {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(new Error('IsOpenNow market-status request timed out')),
    10_000
  );
  const abortFromCaller = () => controller.abort(externalSignal?.reason);

  if (externalSignal?.aborted) {
    abortFromCaller();
  } else {
    externalSignal?.addEventListener('abort', abortFromCaller, { once: true });
  }

  return {
    signal: controller.signal,
    dispose: () => {
      clearTimeout(timeout);
      externalSignal?.removeEventListener('abort', abortFromCaller);
    },
  };
}

async function loadIsOpenNowSession(
  input: {
    mic: string;
    context: Readonly<RwaActionPreflightContext>;
  },
  options: {
    sourceId: string;
    maxObservationAgeSeconds: number;
    fetchImpl: typeof fetch;
    cache: Map<string, { value: IsOpenNowStatus; expiresAt: number }>;
  }
): Promise<unknown> {
  const market = marketForMic(input.mic);
  const requestTime = input.context.nowSeconds;
  if (!Number.isSafeInteger(requestTime) || requestTime <= 0) {
    throw new RwaActionPreflightError('RWA_PREFLIGHT_SOURCE_OUTPUT_INVALID');
  }

  const cached = options.cache.get(input.mic);
  if (cached && cached.expiresAt > requestTime && cached.value.validUntil > requestTime) {
    return cached.value;
  }

  const bounded = createBoundedSignal(input.context.signal);
  let payload: unknown;
  try {
    const response = await options.fetchImpl(`${ISOPENNOW_STATUS_URL}/${market.id}`, {
      method: 'GET',
      headers: { accept: 'application/json' },
      signal: bounded.signal,
    });
    if (!response.ok) {
      throw new Error('IsOpenNow market-status request failed');
    }
    const body = await response.text();
    if (body.length > MAX_STATUS_RESPONSE_CHARS) {
      throw new RwaActionPreflightError('RWA_PREFLIGHT_SOURCE_OUTPUT_INVALID');
    }
    try {
      payload = JSON.parse(body) as unknown;
    } catch {
      throw new RwaActionPreflightError('RWA_PREFLIGHT_SOURCE_OUTPUT_INVALID');
    }
  } catch (error) {
    if (error instanceof RwaActionPreflightError) throw error;
    throw new Error('IsOpenNow market-status source unavailable');
  } finally {
    bounded.dispose();
  }

  const status = readStatus(
    payload,
    market.id,
    input.mic,
    market.timezone,
    requestTime,
    options.sourceId,
    options.maxObservationAgeSeconds
  );
  options.cache.set(input.mic, {
    value: status,
    expiresAt: Math.min(requestTime + REFRESH_INTERVAL_SECONDS, status.validUntil),
  });
  return status;
}

/**
 * Create a zero-cost XNAS/XNYS session resolver using IsOpenNow's public status API.
 * The source distinguishes its core continuous session from closed/unknown states; it does not
 * identify pre/post market as separate sessions. Its output is secondary, unverified information.
 */
export function createIsOpenNowRwaSessionResolver(
  options: IsOpenNowRwaSessionResolverOptions
): RobinhoodRwaSessionResolver {
  if (!options || typeof options !== 'object') {
    throw new RwaActionPreflightError('RWA_PREFLIGHT_PROVIDER_INVALID');
  }
  const sourceId = options.sourceId;
  const maxObservationAgeSeconds =
    options.maxObservationAgeSeconds ?? DEFAULT_MAX_OBSERVATION_AGE_SECONDS;
  if (
    typeof sourceId !== 'string' ||
    !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/.test(sourceId) ||
    !Number.isSafeInteger(maxObservationAgeSeconds) ||
    maxObservationAgeSeconds <= ISOPENNOW_CACHE_MAX_AGE_SECONDS ||
    maxObservationAgeSeconds > MAX_OBSERVATION_AGE_SECONDS ||
    (options.fetchImpl !== undefined && typeof options.fetchImpl !== 'function')
  ) {
    throw new RwaActionPreflightError('RWA_PREFLIGHT_PROVIDER_INVALID');
  }

  const config = Object.freeze({
    sourceId,
    maxObservationAgeSeconds,
    fetchImpl: options.fetchImpl ?? globalThis.fetch,
    cache: new Map<string, { value: IsOpenNowStatus; expiresAt: number }>(),
  });
  if (typeof config.fetchImpl !== 'function') {
    throw new RwaActionPreflightError('RWA_PREFLIGHT_PROVIDER_INVALID');
  }

  return createRobinhoodRwaSessionResolver({
    sourceId,
    load: (input) => loadIsOpenNowSession(input, config),
  });
}
