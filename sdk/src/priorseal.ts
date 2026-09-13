import { encodeAbiParameters, keccak256 } from 'viem';

import { stripTrailingSlashes } from './url';

import type {
  PreparedExactCallTransaction,
  PriorSealAcceptedAuthorization,
  PriorSealApi,
  PriorSealAuthorization,
  PriorSealContextCommitment,
  PriorSealIntent,
  PriorSealObservationJob,
  PriorSealObservationResult,
  PriorSealPreparedAuthorization,
  SignedAttestation,
} from './types';

export interface PriorSealClientOptions {
  baseUrl: string;
  fetch?: typeof globalThis.fetch;
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export class PriorSealBridgeError extends Error {
  readonly name = 'PriorSealBridgeError';

  constructor(
    message: string,
    readonly options: { code?: string; status?: number; cause?: unknown } = {}
  ) {
    super(message, { cause: options.cause });
  }
}

/** Minimal PriorSeal protocol client used by the joint agent workflow. */
export class PriorSealClient implements PriorSealApi {
  private readonly baseUrl: string;
  private readonly fetcher: typeof globalThis.fetch;
  private readonly headers: Record<string, string>;
  private readonly timeoutMs: number;

  constructor(options: PriorSealClientOptions) {
    if (!options.baseUrl.trim()) throw new TypeError('PriorSealClient requires baseUrl.');
    const fetcher = options.fetch ?? globalThis.fetch;
    if (!fetcher) throw new TypeError('No fetch implementation is available.');
    this.baseUrl = stripTrailingSlashes(options.baseUrl);
    this.fetcher = fetcher;
    this.headers = options.headers ?? {};
    this.timeoutMs = options.timeoutMs ?? 15_000;
    if (!Number.isSafeInteger(this.timeoutMs) || this.timeoutMs < 1) {
      throw new TypeError('timeoutMs must be a positive integer.');
    }
  }

  prepareAuthorization(
    input: Parameters<PriorSealApi['prepareAuthorization']>[0],
    signal?: AbortSignal
  ): Promise<PriorSealPreparedAuthorization> {
    return this.request('/v1/authorizations/prepare', input, signal);
  }

  acceptAuthorization(
    authorization: PriorSealAuthorization,
    signal?: AbortSignal
  ): Promise<PriorSealAcceptedAuthorization> {
    return this.request(
      '/v1/authorizations',
      authorization,
      signal,
      `insight:${authorization.authorizationId}`
    );
  }

  observeExecution(
    input: { authorizationId: string; chainId: number; txHash: string; confirmations?: number },
    signal?: AbortSignal
  ): Promise<PriorSealObservationResult> {
    return this.request(
      '/v1/executions/observe',
      input,
      signal,
      `insight:${input.authorizationId}:${input.txHash.slice(2, 18)}`
    );
  }

  getObservationJob(jobId: string, signal?: AbortSignal): Promise<PriorSealObservationJob> {
    return this.request(`/v1/observation-jobs/${encodeURIComponent(jobId)}`, undefined, signal);
  }

  async waitForObservationJob(
    jobId: string,
    options: { signal?: AbortSignal; pollIntervalMs?: number; timeoutMs?: number } = {}
  ): Promise<PriorSealObservationJob> {
    const pollIntervalMs = options.pollIntervalMs ?? 1_000;
    const timeoutMs = options.timeoutMs ?? 120_000;
    if (!Number.isSafeInteger(pollIntervalMs) || pollIntervalMs < 10) {
      throw new TypeError('pollIntervalMs must be an integer of at least 10.');
    }
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) {
      throw new TypeError('timeoutMs must be a positive integer.');
    }
    const startedAt = Date.now();
    while (true) {
      const job = await this.getObservationJob(jobId, options.signal);
      if (['COMPLETED', 'UNDETERMINED', 'FAILED'].includes(job.state)) return job;
      if (Date.now() - startedAt >= timeoutMs) {
        throw new PriorSealBridgeError(
          `PriorSeal observation job did not finish within ${timeoutMs}ms`,
          { code: 'OBSERVATION_WAIT_TIMEOUT' }
        );
      }
      await abortableDelay(
        Math.min(pollIntervalMs, Math.max(1, timeoutMs - (Date.now() - startedAt))),
        options.signal
      );
    }
  }

  async observeExecutionUntilFinal(
    input: { authorizationId: string; chainId: number; txHash: string; confirmations?: number },
    options: { signal?: AbortSignal; pollIntervalMs?: number; timeoutMs?: number } = {}
  ): Promise<PriorSealObservationResult> {
    const initial = await this.observeExecution(input, options.signal);
    if (!initial.observationJob) return initial;
    const job = await this.waitForObservationJob(initial.observationJob.jobId, options);
    return job.result
      ? { ...job.result, observationJob: job }
      : {
          ...initial,
          observation: job.observation ?? initial.observation,
          observationJob: job,
        };
  }

  private async request<T>(
    path: string,
    body: unknown | undefined,
    signal?: AbortSignal,
    idempotencyKey = randomIdempotencyKey()
  ): Promise<T> {
    const controller = new AbortController();
    const abort = () => controller.abort(signal?.reason);
    if (signal?.aborted) controller.abort(signal.reason);
    else signal?.addEventListener('abort', abort, { once: true });
    const timeout = setTimeout(
      () => controller.abort(new Error('PriorSeal request timed out')),
      this.timeoutMs
    );
    try {
      const response = await this.fetcher(`${this.baseUrl}${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          ...(body === undefined
            ? {}
            : { 'Content-Type': 'application/json', 'Idempotency-Key': idempotencyKey }),
          ...this.headers,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: { code?: string; message?: string };
      } | null;
      if (!response.ok || !payload) {
        throw new PriorSealBridgeError(
          payload?.error?.message ?? `PriorSeal request failed (${response.status})`,
          { code: payload?.error?.code, status: response.status }
        );
      }
      return payload as T;
    } catch (error) {
      if (error instanceof PriorSealBridgeError) throw error;
      const timedOut = controller.signal.aborted && !signal?.aborted;
      throw new PriorSealBridgeError(
        timedOut
          ? `PriorSeal did not respond within ${this.timeoutMs}ms`
          : signal?.aborted
            ? 'PriorSeal request was aborted'
            : error instanceof Error
              ? error.message
              : 'PriorSeal request failed',
        {
          code: timedOut
            ? 'REQUEST_TIMEOUT'
            : signal?.aborted
              ? 'REQUEST_ABORTED'
              : 'NETWORK_ERROR',
          cause: error,
        }
      );
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener('abort', abort);
    }
  }
}

export function buildPriorSealExactCallIntent(input: {
  transaction: PreparedExactCallTransaction;
  intentId: string;
  sourceAssetId: string;
  validUntil: number;
  minConfirmations?: number;
  contextCommitments?: PriorSealContextCommitment[];
}): PriorSealIntent {
  const transaction = input.transaction;
  if (!Number.isSafeInteger(transaction.chainId) || transaction.chainId < 1) {
    throw new TypeError('Prepared transaction chainId must be a positive integer.');
  }
  const from = address(transaction.from, 'from');
  const to = address(transaction.to, 'to');
  if (!/^0x(?:[0-9a-fA-F]{2})*$/.test(transaction.data)) {
    throw new TypeError('Prepared transaction data must be 0x-prefixed bytes.');
  }
  if (!Number.isSafeInteger(input.validUntil) || input.validUntil < 1) {
    throw new TypeError('PriorSeal validUntil must be positive Unix seconds.');
  }
  if (
    input.minConfirmations != null &&
    (!Number.isSafeInteger(input.minConfirmations) || input.minConfirmations < 0)
  ) {
    throw new TypeError('PriorSeal confirmations must be a non-negative integer.');
  }
  return {
    schema: 'priorseal.intent.v2',
    executionProfile: 'priorseal.execution-profile.exact-call.v1',
    intentId: input.intentId,
    chainId: transaction.chainId,
    action: 'CONTRACT_CALL',
    asset: input.sourceAssetId,
    amount: uintString(transaction.sourceAmount, 'sourceAmount'),
    sender: from,
    recipient: to,
    validUntil: input.validUntil,
    nonce: uintString(transaction.nonce, 'nonce'),
    callTarget: to,
    calldataHash: keccak256(transaction.data),
    transactionValue: uintString(transaction.value ?? 0, 'value'),
    ...(input.contextCommitments ? { contextCommitments: input.contextCommitments } : {}),
    ...(input.minConfirmations == null
      ? {}
      : { constraints: { minConfirmations: input.minConfirmations } }),
  };
}

export function buildInsightPriorSealContextCommitment(input: {
  sourceAttestation: SignedAttestation;
  destinationAttestation: SignedAttestation;
  maxSlippageBps?: number;
}): PriorSealContextCommitment {
  const maxSlippageBps = input.maxSlippageBps ?? 50;
  if (!Number.isSafeInteger(maxSlippageBps) || maxSlippageBps < 0 || maxSlippageBps > 65_535) {
    throw new TypeError('maxSlippageBps must fit uint16.');
  }
  const encoded = encodeAbiParameters(
    [
      { type: 'bytes32', name: 'sourceUid' },
      { type: 'bytes32', name: 'destinationUid' },
      { type: 'bytes32', name: 'sourceRequestHash' },
      { type: 'bytes32', name: 'destinationRequestHash' },
      { type: 'uint16', name: 'maxSlippageBps' },
    ],
    [
      bytes32(input.sourceAttestation.uid, 'source attestation uid'),
      bytes32(input.destinationAttestation.uid, 'destination attestation uid'),
      bytes32(input.sourceAttestation.data.requestHash, 'source requestHash'),
      bytes32(input.destinationAttestation.data.requestHash, 'destination requestHash'),
      maxSlippageBps,
    ]
  );
  return {
    namespace: 'insight.pretrade-pair.v1',
    algorithm: 'keccak256',
    digest: keccak256(encoded),
  };
}

export function generatePriorSealAuthorizationNonce(): `0x${string}` {
  const bytes = new Uint8Array(32);
  if (!globalThis.crypto?.getRandomValues) throw new TypeError('Web Crypto is required.');
  globalThis.crypto.getRandomValues(bytes);
  return `0x${[...bytes].map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

function address(value: string, field: string): string {
  if (!/^0x[0-9a-fA-F]{40}$/.test(value)) {
    throw new TypeError(`Prepared transaction ${field} must be a 20-byte EVM address.`);
  }
  return value.toLowerCase();
}

function bytes32(value: unknown, field: string): `0x${string}` {
  if (typeof value !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(value)) {
    throw new TypeError(`Insight ${field} must be 32-byte hex.`);
  }
  return value.toLowerCase() as `0x${string}`;
}

function uintString(value: bigint | number | string, field: string): string {
  let normalized: string;
  try {
    if (typeof value === 'number' && (!Number.isSafeInteger(value) || value < 0)) throw new Error();
    const parsed = BigInt(value);
    if (parsed < 0n) throw new Error();
    normalized = parsed.toString(10);
  } catch {
    throw new TypeError(`Prepared transaction ${field} must be an unsigned integer.`);
  }
  return normalized;
}

function randomIdempotencyKey(): string {
  return globalThis.crypto?.randomUUID?.() ?? `insight:${Date.now()}:${Math.random()}`;
}

function abortableDelay(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(
        new PriorSealBridgeError('PriorSeal request was aborted', { code: 'REQUEST_ABORTED' })
      );
      return;
    }
    const timer = setTimeout(done, milliseconds);
    function done() {
      signal?.removeEventListener('abort', aborted);
      resolve();
    }
    function aborted() {
      clearTimeout(timer);
      signal?.removeEventListener('abort', aborted);
      reject(
        new PriorSealBridgeError('PriorSeal request was aborted', { code: 'REQUEST_ABORTED' })
      );
    }
    signal?.addEventListener('abort', aborted, { once: true });
  });
}
