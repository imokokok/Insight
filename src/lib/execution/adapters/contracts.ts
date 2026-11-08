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

/**
 * `REQUIRES_COMPLETION` is not a risk outcome. It means the preflight decision
 * stands and the payload is buildable, but the caller must still complete it
 * (for example supplying remaining accounts) before it can be signed.
 */
export type PreflightState =
  | 'READY'
  | 'CAUTION'
  | 'REQUIRES_COMPLETION'
  | 'BLOCK'
  | 'UNAVAILABLE';

/**
 * What the quote / order is valid *against*. A timestamp alone cannot express
 * an EVM deadline block or a Solana `lastValidBlockHeight`; `null` means the
 * adapter has no anchor it can honestly declare.
 */
export type ValidityAnchor =
  | { kind: 'timestamp'; expiresAt: string }
  | { kind: 'evm-block'; chainId: number; deadlineBlock: number }
  | {
      kind: 'solana-block-height';
      network: string;
      lastValidBlockHeight: number;
      contextSlot: number;
    }
  | { kind: 'venue-policy'; venue: string; expiresAt: string | null };

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
      /**
       * A complete, unsigned Solana transaction.
       *
       * `transactionHash` is sha256 over the exact bytes in `transactionBase64`.
       * It binds byte content only: it does **not** prove that the message
       * segment is consistent with a separately quoted intent, and it must
       * **not** be used to verify signatures.
       *
       * `messageHash` is the digest of the unsigned message bytes a signature
       * commits to. It is `null` when the adapter cannot derive the message
       * segment (today: the Jupiter adapter, which has no message parser).
       */
      kind: 'solana-message';
      network: string;
      transactionBase64: string;
      transactionHash: `0x${string}`;
      messageHash: `0x${string}` | null;
    }
  | {
      kind: 'venue-action';
      venue: string;
      network: string;
      action: unknown;
      expiresAfter: number;
    }
  /**
   * A centralized venue order body. It deliberately has no `to` / `data` /
   * `value`: it is not calldata, and binding the canonical payload proves
   * payload fidelity, never on-chain execution.
   */
  | {
      kind: 'venue-rest-order';
      venue: string;
      network: string;
      transport: 'https';
      endpoint: { host: string; method: 'POST'; path: string };
      payload: Record<string, unknown>;
      payloadHash: `0x${string}`;
      bindingSurface: 'canonical-json' | 'centralized-order-payload-canonical-serialization';
      provesOnchainExecution: false;
      signing: 'USER_HELD_VENUE_CREDENTIALS_REQUIRED';
    }
  /**
   * A Solana instruction fragment, not a message. It deliberately has no
   * `messageHash`, because remaining accounts are caller-supplied and the
   * message cannot be assembled at preflight time.
   */
  | {
      kind: 'solana-instruction';
      network: string;
      programId: string;
      discriminator: `0x${string}`;
      dataBase58: string;
      dataBase64: string;
      dataHash: `0x${string}`;
      accounts: readonly { pubkey: string; isSigner: boolean; isWritable: boolean }[];
      requiresCallerCompletion: true;
      requiredInputs: readonly string[];
    };

export type PreparedExecution<Native> = {
  schema: typeof PREPARED_EXECUTION_SCHEMA;
  adapterId: string;
  state: PreflightState;
  authorization: 'user-controlled';
  intent: ExecutionIntent;
  observedAt: string;
  expiresAt: string | null;
  /** Required: what the order is valid against, or `null` when unanchored. */
  validityAnchor: ValidityAnchor | null;
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

function assertValidityAnchor(value: ValidityAnchor | null): void {
  if (value === null) return;
  if (typeof value !== 'object' || typeof value.kind !== 'string') {
    throw new TypeError('Execution validity anchor is invalid.');
  }
  switch (value.kind) {
    case 'timestamp':
      assertIsoTimestamp(value.expiresAt, 'validityAnchor expiresAt');
      return;
    case 'evm-block':
      if (
        !Number.isSafeInteger(value.chainId) ||
        value.chainId <= 0 ||
        !Number.isSafeInteger(value.deadlineBlock) ||
        value.deadlineBlock < 0
      ) {
        throw new TypeError('Execution validity anchor must carry an EVM chain id and block.');
      }
      return;
    case 'solana-block-height':
      if (
        typeof value.network !== 'string' ||
        !Number.isSafeInteger(value.lastValidBlockHeight) ||
        value.lastValidBlockHeight < 0 ||
        !Number.isSafeInteger(value.contextSlot) ||
        value.contextSlot < 0
      ) {
        throw new TypeError(
          'Execution validity anchor must carry a Solana network, block height and slot.'
        );
      }
      return;
    case 'venue-policy':
      if (typeof value.venue !== 'string' || value.venue.length === 0) {
        throw new TypeError('Execution validity anchor must name its venue.');
      }
      if (value.expiresAt !== null) assertIsoTimestamp(value.expiresAt, 'validityAnchor expiresAt');
      return;
    default:
      throw new TypeError('Execution validity anchor kind is invalid.');
  }
}

/** States whose payload is present. `REQUIRES_COMPLETION` still carries one. */
function stateCarriesPayload(state: PreflightState): boolean {
  return state === 'READY' || state === 'CAUTION' || state === 'REQUIRES_COMPLETION';
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
  if (
    !['READY', 'CAUTION', 'REQUIRES_COMPLETION', 'BLOCK', 'UNAVAILABLE'].includes(value.state)
  ) {
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
  assertValidityAnchor(value.validityAnchor);
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
  if (stateCarriesPayload(value.state) !== Boolean(value.payload)) {
    throw new TypeError('Execution preflight payload does not match its state.');
  }
  // A caller-completed payload may never be presented as ready to sign, and an
  // incomplete payload must not masquerade as READY/CAUTION.
  const incompletePayloadKinds: ReadonlySet<string> = new Set([
    'venue-rest-order',
    'solana-instruction',
  ]);
  if (
    value.state === 'REQUIRES_COMPLETION' &&
    value.payload !== null &&
    !incompletePayloadKinds.has(value.payload.kind)
  ) {
    throw new TypeError(
      'Execution REQUIRES_COMPLETION must pair with a venue-rest-order or solana-instruction payload.'
    );
  }
  if (
    (value.state === 'READY' || value.state === 'CAUTION') &&
    value.payload !== null &&
    incompletePayloadKinds.has(value.payload.kind)
  ) {
    throw new TypeError(
      'A venue-rest-order or solana-instruction payload cannot be READY or CAUTION.'
    );
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
