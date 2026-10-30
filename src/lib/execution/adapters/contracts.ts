import {
  createExecutionCommercialTerms,
  type ExecutionCommercialTerms,
  type VenueNativeFeeEstimate,
} from '../commerce';

/**
 * Protocol-neutral, non-custodial execution boundary.
 *
 * This module deliberately models the evidence around an action, rather than
 * pretending that an EVM transaction, a Solana message, and a venue-native
 * order are the same thing.  The exact payload stays discriminated and is
 * always returned unsigned.
 */

export const PREPARED_EXECUTION_SCHEMA = 'insight.prepared-execution.v1' as const;
export const EXECUTION_OBSERVATION_SCHEMA = 'insight.execution-observation.v1' as const;

export type PreflightState = 'READY' | 'CAUTION' | 'BLOCK' | 'UNAVAILABLE';

export type ExecutionIntent = {
  algorithm: 'keccak256' | 'sha256';
  digest: `0x${string}`;
};

export type EvidencePointer = {
  kind: string;
  observedAt: string;
  source: string;
};

export type PreparedExecutionPayload =
  | {
      kind: 'evm-transaction';
      chainId: number;
      transaction: { to: string; data: `0x${string}`; value: `0x${string}` };
      approval?: { token: string; spender: string; amountRaw: string; data: `0x${string}` };
    }
  | {
      kind: 'solana-message';
      network: string;
      transactionBase64: string;
      messageHash: `0x${string}`;
    }
  | {
      kind: 'venue-action';
      venue: string;
      network: string;
      action: unknown;
      expiresAfter: number;
    };

export type PreparedExecution<Native> = {
  schema: typeof PREPARED_EXECUTION_SCHEMA;
  adapterId: string;
  state: PreflightState;
  authorization: 'user-controlled';
  intent: ExecutionIntent;
  observedAt: string;
  expiresAt: string | null;
  evidence: EvidencePointer[];
  caveats: string[];
  /** Pricing terms are part of the review record, never signing authority. */
  commerce: ExecutionCommercialTerms;
  payload: PreparedExecutionPayload | null;
  /** The unmodified protocol result. Consumers that need native detail use this field. */
  native: Native;
};

export type ExecutionReference =
  | { kind: 'evm-transaction'; chainId: number; txHash: `0x${string}` }
  | { kind: 'solana-signature'; network: string; signature: string }
  | { kind: 'venue-order'; venue: string; account: string; clientOrderId: string };

export type ExecutionObservation<Native> = {
  schema: typeof EXECUTION_OBSERVATION_SCHEMA;
  adapterId: string;
  reference: ExecutionReference;
  lifecycle: 'OBSERVED' | 'PENDING' | 'CONFIRMED' | 'REVERTED' | 'NOT_FOUND' | 'UNAVAILABLE';
  observedAt: string;
  caveats: string[];
  /** Present only where the adapter can derive a clearly-labelled fee estimate. */
  commerce?: { venueFeeEstimate: VenueNativeFeeEstimate | null };
  native: Native;
};

export interface ExecutionAdapter<Request, NativePreflight, NativeObservation = never> {
  readonly id: string;
  readonly family: 'evm' | 'solana' | 'venue';
  readonly supportsObservation: boolean;
  preflight(
    request: Request,
    options?: { signal?: AbortSignal }
  ): Promise<PreparedExecution<NativePreflight>>;
  observe?: (
    reference: ExecutionReference,
    expected: unknown,
    options?: { signal?: AbortSignal }
  ) => Promise<ExecutionObservation<NativeObservation>>;
}

type UnknownAdapter = ExecutionAdapter<unknown, unknown, unknown>;

function assertAdapterId(value: string): void {
  if (!/^[a-z0-9][a-z0-9._-]{2,127}$/.test(value)) {
    throw new TypeError('Execution adapter id is invalid.');
  }
}

function assertIsoTimestamp(value: string, field: string): void {
  if (typeof value !== 'string' || !Number.isFinite(Date.parse(value))) {
    throw new TypeError(`Execution ${field} must be an ISO-8601 timestamp.`);
  }
}

/** Validates the common envelope at the adapter boundary. */
export function createPreparedExecution<Native>(
  value: PreparedExecution<Native>
): PreparedExecution<Native> {
  assertAdapterId(value.adapterId);
  if (!['READY', 'CAUTION', 'BLOCK', 'UNAVAILABLE'].includes(value.state)) {
    throw new TypeError('Execution preflight state is invalid.');
  }
  if (value.authorization !== 'user-controlled') {
    throw new TypeError('Execution adapters must remain user-controlled.');
  }
  if (
    !['keccak256', 'sha256'].includes(value.intent.algorithm) ||
    !/^0x[0-9a-f]{64}$/i.test(value.intent.digest)
  ) {
    throw new TypeError('Execution intent digest is invalid.');
  }
  assertIsoTimestamp(value.observedAt, 'observedAt');
  if (value.expiresAt !== null) assertIsoTimestamp(value.expiresAt, 'expiresAt');
  if (!Array.isArray(value.evidence)) throw new TypeError('Execution evidence is invalid.');
  for (const entry of value.evidence) {
    if (
      !entry ||
      typeof entry !== 'object' ||
      typeof entry.kind !== 'string' ||
      typeof entry.source !== 'string'
    ) {
      throw new TypeError('Execution evidence is invalid.');
    }
    assertIsoTimestamp(entry.observedAt, 'evidence observedAt');
  }
  if (!Array.isArray(value.caveats) || value.caveats.some((entry) => typeof entry !== 'string')) {
    throw new TypeError('Execution caveats are invalid.');
  }
  createExecutionCommercialTerms(value.commerce);
  if ((value.state === 'READY' || value.state === 'CAUTION') !== Boolean(value.payload)) {
    throw new TypeError('Execution preflight payload does not match its state.');
  }
  return value;
}

/** Registry keeps selection and capability discovery out of protocol modules. */
export class ExecutionAdapterRegistry {
  private readonly adapters = new Map<string, UnknownAdapter>();

  register<Request, NativePreflight, NativeObservation>(
    adapter: ExecutionAdapter<Request, NativePreflight, NativeObservation>
  ): this {
    assertAdapterId(adapter.id);
    if (this.adapters.has(adapter.id)) {
      throw new TypeError(`Execution adapter ${adapter.id} is already registered.`);
    }
    this.adapters.set(adapter.id, adapter as unknown as UnknownAdapter);
    return this;
  }

  list(): ReadonlyArray<Pick<UnknownAdapter, 'id' | 'family' | 'supportsObservation'>> {
    return [...this.adapters.values()].map(({ id, family, supportsObservation }) => ({
      id,
      family,
      supportsObservation,
    }));
  }

  get<Request, NativePreflight, NativeObservation = never>(
    id: string
  ): ExecutionAdapter<Request, NativePreflight, NativeObservation> {
    const adapter = this.adapters.get(id);
    if (!adapter) throw new RangeError(`Unsupported execution adapter: ${id}`);
    return adapter as unknown as ExecutionAdapter<Request, NativePreflight, NativeObservation>;
  }

  async preflight<Request, NativePreflight>(
    id: string,
    request: Request,
    options?: { signal?: AbortSignal }
  ): Promise<PreparedExecution<NativePreflight>> {
    return this.get<Request, NativePreflight>(id).preflight(request, options);
  }

  async observe<NativeObservation>(
    id: string,
    reference: ExecutionReference,
    expected: unknown,
    options?: { signal?: AbortSignal }
  ): Promise<ExecutionObservation<NativeObservation>> {
    const adapter = this.get<unknown, unknown, NativeObservation>(id);
    if (!adapter.observe)
      throw new RangeError(`Execution adapter ${id} does not support observation.`);
    return adapter.observe(reference, expected, options);
  }
}
