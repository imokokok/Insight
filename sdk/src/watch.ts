import { InsightApiError } from './errors';

import type { InsightClient } from './client';
import type { OracleWatchTarget, WatchHandle, WatchOptions, WatchState } from './types';

const DEFAULT_INTERVAL = 15 * 60 * 1000;
export function createWatch(
  client: InsightClient,
  target: OracleWatchTarget,
  options: WatchOptions,
  setHalt: (halted: boolean) => void,
  isCurrent: () => boolean = () => true
): WatchHandle {
  const key = `${target.symbol.trim().toUpperCase()}@${(target.chain ?? '').trim().toLowerCase()}`;
  const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL;
  const samples = options.recoveryHealthySamples ?? 2;
  const unavailableAfterMs = options.unavailableAfterMs ?? intervalMs * 2;
  if (!Number.isSafeInteger(intervalMs) || intervalMs <= 0)
    throw new RangeError('Watch intervalMs must be a positive integer.');
  if (intervalMs < DEFAULT_INTERVAL && !options.allowFasterPolling)
    throw new RangeError(
      `Watch intervals below ${DEFAULT_INTERVAL}ms require allowFasterPolling: true.`
    );
  if (
    !Number.isSafeInteger(samples) ||
    samples < 1 ||
    !Number.isSafeInteger(unavailableAfterMs) ||
    unavailableAfterMs < 1
  )
    throw new RangeError('Recovery sample count and unavailableAfterMs must be positive integers.');
  let state: WatchState = {
    schema: 'insight.watch-state.v1',
    targetKey: key,
    status: 'monitor_unavailable',
    halted: false,
    incidentId: null,
    incidentKind: null,
    consecutiveHealthy: 0,
    lastSuccessAt: null,
    nextCheckAt: null,
    lastSignalValidUntil: null,
    updatedAt: Date.now(),
  };
  let active = true;
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let freshnessTimer: ReturnType<typeof setInterval> | undefined;
  let wake: (() => void) | undefined;
  let operation: Promise<unknown> = Promise.resolve();
  const serialize = <T>(fn: () => Promise<T>): Promise<T> => {
    const next = operation.then(fn, fn);
    operation = next.catch(() => undefined);
    return next;
  };
  const notify = async (callback: WatchOptions['onStateChange'], snapshot: WatchState) => {
    try {
      await callback?.({ ...snapshot });
    } catch {
      /* Observer errors cannot erase durable state. */
    }
  };
  const persist = async () => {
    if (!isCurrent()) return;
    state.updatedAt = Date.now();
    setHalt(state.halted);
    try {
      await options.stateAdapter?.save(key, { ...state });
    } catch (error) {
      state.halted = true;
      state.status = 'monitor_unavailable';
      setHalt(true);
      throw error;
    }
    if (isCurrent()) await notify(options.onStateChange, state);
  };
  const incident = async (kind: NonNullable<WatchState['incidentKind']>) => {
    const isNew = state.incidentId == null || state.incidentKind !== kind;
    if (isNew) state.incidentId = `${key}:${kind}:${Date.now()}`;
    state.incidentKind = kind;
    state.halted = true;
    state.consecutiveHealthy = 0;
    state.status = kind === 'service' || kind === 'budget' ? 'monitor_unavailable' : 'halted';
    await persist();
    if (isNew && isCurrent()) await notify(options.onIncident, state);
    return isNew;
  };
  const stale = () =>
    state.lastSuccessAt !== null &&
    (Date.now() - state.lastSuccessAt >= unavailableAfterMs ||
      (state.lastSignalValidUntil !== null && Date.now() >= state.lastSignalValidUntil * 1000));
  if (options.stateAdapter) setHalt(true);
  const ready = (async () => {
    const saved = await options.stateAdapter?.load(key);
    if (!isCurrent()) return;
    if (saved) {
      if (
        saved.schema !== 'insight.watch-state.v1' ||
        saved.targetKey !== key ||
        typeof saved.halted !== 'boolean' ||
        !Number.isSafeInteger(saved.consecutiveHealthy) ||
        saved.consecutiveHealthy < 0 ||
        !['running', 'degraded', 'halted', 'recovering', 'monitor_unavailable'].includes(
          saved.status
        ) ||
        ![saved.lastSuccessAt, saved.nextCheckAt, saved.lastSignalValidUntil].every(
          (value) =>
            value === null || (typeof value === 'number' && Number.isFinite(value) && value >= 0)
        ) ||
        (saved.lastSuccessAt !== null && saved.lastSuccessAt > Date.now())
      )
        throw new TypeError('Stored Watch state is invalid or belongs to a different target.');
      state = { ...saved };
      setHalt(state.halted);
      if (stale()) await incident('service');
    } else if (options.stateAdapter) setHalt(false);
  })();
  const stop = () => {
    active = false;
    controller.abort();
    if (timer) clearTimeout(timer);
    if (freshnessTimer) clearInterval(freshnessTimer);
    wake?.();
    options.signal?.removeEventListener('abort', stop);
  };
  options.signal?.addEventListener('abort', stop, { once: true });
  if (options.signal?.aborted) stop();
  const refreshWithSignal = (signal?: AbortSignal) =>
    serialize(async () => {
      await ready;
      if (!isCurrent()) throw new Error('Watch handle was replaced; use the current handle.');
      try {
        const result = await client.oracleWatch(target, signal);
        if (!isCurrent()) throw new Error('Watch handle was replaced; use the current handle.');
        state.lastSuccessAt = Date.now();
        state.nextCheckAt = Date.now() + intervalMs;
        const until = Number(result.attestation?.data.validUntil ?? result.attestation?.validUntil);
        state.lastSignalValidUntil = Number.isFinite(until) && until > 0 ? until : null;
        const evaluatedAt = Date.parse(result.evaluatedAt);
        const outdated =
          !Number.isFinite(evaluatedAt) ||
          evaluatedAt > Date.now() ||
          Date.now() - evaluatedAt >= unavailableAfterMs ||
          (state.lastSignalValidUntil != null && state.lastSignalValidUntil * 1000 <= Date.now());
        if (outdated) {
          await incident('service');
        } else if (result.recommendation === 'halt') {
          const missing = result.reasonCodes.some((code) =>
            /COVERAGE|QUORUM|INDEPENDENCE|STALE|MISSING|INSUFFICIENT/.test(code)
          );
          const isNew = await incident(missing ? 'evidence' : 'market');
          if (isNew && isCurrent()) await options.onHalt?.(result);
        } else if (result.recommendation === 'proceed') {
          const wasReady = state.consecutiveHealthy >= samples;
          state.consecutiveHealthy += 1;
          state.status = state.halted ? 'recovering' : 'running';
          await persist();
          if (isCurrent() && state.halted && !wasReady && state.consecutiveHealthy >= samples)
            await notify(options.onRecoveryReady, state);
        } else {
          state.consecutiveHealthy = 0;
          state.status = state.halted ? 'recovering' : 'degraded';
          await persist();
        }
        if (isCurrent()) await options.onSignal?.(result);
        return result;
      } catch (error) {
        if (isCurrent() && !signal?.aborted) {
          state.nextCheckAt =
            Date.now() +
            Math.max(
              intervalMs,
              error instanceof InsightApiError ? (error.options.retryAfterSeconds ?? 0) * 1000 : 0
            );
          await incident(
            error instanceof InsightApiError && error.options.status === 402 ? 'budget' : 'service'
          );
        }
        throw error;
      }
    });
  const refresh = () => refreshWithSignal(options.signal);
  const done = (async () => {
    try {
      await ready;
      if (!active || !isCurrent()) return;
      freshnessTimer = setInterval(
        () => {
          if (isCurrent() && stale() && state.status !== 'monitor_unavailable')
            void serialize(() => incident('service')).catch(async (error) => {
              try {
                await options.onError?.(error);
              } catch {}
            });
        },
        Math.max(10, Math.min(intervalMs, unavailableAfterMs) / 4)
      );
      while (active && !options.signal?.aborted) {
        try {
          const result = await refreshWithSignal(controller.signal);
          if (result.recommendation === 'halt' && (options.stopOnHalt ?? true)) break;
        } catch (error) {
          if (!active || controller.signal.aborted) break;
          try {
            await options.onError?.(error);
          } catch {
            /* Keep monitoring. */
          }
        }
        if (!active) break;
        await new Promise<void>((resolve) => {
          wake = resolve;
          timer = setTimeout(
            resolve,
            Math.max(intervalMs, (state.nextCheckAt ?? Date.now()) - Date.now())
          );
        });
        wake = undefined;
      }
    } catch (error) {
      state.halted = true;
      state.status = 'monitor_unavailable';
      setHalt(true);
      try {
        await options.onError?.(error);
      } catch {
        /* State stays fail closed. */
      }
    } finally {
      stop();
    }
  })();
  return {
    target,
    done,
    refresh,
    stop,
    getState: () => ({ ...state, ...(stale() ? { status: 'monitor_unavailable' as const } : {}) }),
    acknowledgeRecovery: () =>
      serialize(async () => {
        await ready;
        if (!isCurrent()) throw new Error('Watch handle was replaced; use the current handle.');
        if (stale() || state.consecutiveHealthy < samples || state.status !== 'recovering')
          throw new Error(
            'Watch recovery requires consecutive fresh healthy samples before acknowledgement.'
          );
        state = {
          ...state,
          halted: false,
          incidentId: null,
          incidentKind: null,
          status: 'running',
        };
        await persist();
      }),
  };
}
