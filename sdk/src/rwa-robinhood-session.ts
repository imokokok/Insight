// Copyright (c) 2026 Insight. MIT. Robinhood market-session source contract.
import { RwaActionPreflightError, type RwaActionPreflightContext } from './rwa-preflight';

import type { RwaSession } from './rwa';

export const ROBINHOOD_RWA_SESSION_SCHEMA = 'insight.robinhood-rwa-session.v1' as const;

export interface RobinhoodRwaSessionObservation {
  schema: typeof ROBINHOOD_RWA_SESSION_SCHEMA;
  sourceId: string;
  mic: string;
  session: RwaSession;
  observedAt: number;
  validUntil: number;
}

export interface RobinhoodRwaSessionResolverInput {
  symbol: string;
  mic: string;
  context: Readonly<RwaActionPreflightContext>;
}

export type RobinhoodRwaSessionLoader = (
  input: RobinhoodRwaSessionResolverInput
) => Promise<unknown>;

export interface RobinhoodRwaSessionResolver {
  /** App-pinned identity of the upstream session source. */
  sourceId: string;
  resolve(input: RobinhoodRwaSessionResolverInput): Promise<RobinhoodRwaSessionObservation>;
}

export interface RobinhoodRwaSessionResolverOptions {
  sourceId: string;
  load: RobinhoodRwaSessionLoader;
}

const sessions: RwaSession[] = ['REGULAR', 'PRE', 'POST', 'OVERNIGHT', 'CLOSED', 'UNKNOWN'];
const labelPattern = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    Boolean(value) && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype
  );
}

/** Validate session data at the boundary and bind it to the requested venue and source. */
export function readRobinhoodRwaSessionObservation(
  value: unknown,
  expectedSourceId: string,
  expectedMic: string
): RobinhoodRwaSessionObservation {
  if (
    !isRecord(value) ||
    Object.keys(value).sort().join(',') !== 'mic,observedAt,schema,session,sourceId,validUntil' ||
    value.schema !== ROBINHOOD_RWA_SESSION_SCHEMA ||
    value.sourceId !== expectedSourceId ||
    value.mic !== expectedMic ||
    !sessions.includes(value.session as RwaSession) ||
    typeof value.observedAt !== 'number' ||
    !Number.isSafeInteger(value.observedAt) ||
    value.observedAt <= 0 ||
    typeof value.validUntil !== 'number' ||
    !Number.isSafeInteger(value.validUntil) ||
    value.validUntil <= 0 ||
    value.validUntil < value.observedAt
  ) {
    throw new RwaActionPreflightError('RWA_PREFLIGHT_SOURCE_OUTPUT_INVALID');
  }

  return Object.freeze({
    schema: ROBINHOOD_RWA_SESSION_SCHEMA,
    sourceId: expectedSourceId,
    mic: expectedMic,
    session: value.session as RwaSession,
    observedAt: value.observedAt as number,
    validUntil: value.validUntil as number,
  });
}

/**
 * Create a runtime-validated resolver that shares one session observation across the market and
 * price adapters in the same preflight request. It does not authenticate the application's feed.
 */
export function createRobinhoodRwaSessionResolver(
  options: RobinhoodRwaSessionResolverOptions
): RobinhoodRwaSessionResolver {
  if (
    !options ||
    typeof options.sourceId !== 'string' ||
    !labelPattern.test(options.sourceId) ||
    typeof options.load !== 'function'
  ) {
    throw new RwaActionPreflightError('RWA_PREFLIGHT_PROVIDER_INVALID');
  }

  const sourceId = options.sourceId;
  const load = options.load;
  const requestCache = new WeakMap<object, Promise<RobinhoodRwaSessionObservation>>();
  return {
    sourceId,
    async resolve(input) {
      if (
        !input ||
        typeof input.symbol !== 'string' ||
        typeof input.mic !== 'string' ||
        !input.context ||
        !isRecord(input.context.request)
      ) {
        throw new RwaActionPreflightError('RWA_PREFLIGHT_PROVIDER_INVALID');
      }
      const cacheKey = input.context.request as object;
      let pending = requestCache.get(cacheKey);
      if (!pending) {
        pending = Promise.resolve()
          .then(() => load(input))
          .then((value) => readRobinhoodRwaSessionObservation(value, sourceId, input.mic));
        requestCache.set(cacheKey, pending);
      }
      try {
        return readRobinhoodRwaSessionObservation(await pending, sourceId, input.mic);
      } catch (error) {
        requestCache.delete(cacheKey);
        throw error;
      }
    },
  };
}
