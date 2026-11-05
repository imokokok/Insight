/**
 * Reviewed-profile descriptor types (P0-2).
 *
 * A "reviewed profile" is a source-controlled binding between a guard family
 * and a concrete on-chain / venue deployment. Until now those bindings were
 * bare constants scattered across guards; this layer wraps each one with
 * provenance, a review date, a chain anchor and a freshness/activity status.
 *
 * Design rule: the registry is data, not code. Adding a new profile means
 * adding a descriptor (and, when needed, a decoder referenced by `decoderId`),
 * never extending a switch statement.
 */

/** Guard family a reviewed profile belongs to. */
export type ReviewedProfileFamily = 'lending' | 'swap' | 'perp' | 'prediction';

/**
 * Admission / freshness state of a descriptor.
 * - ACTIVE: reviewed, anchor consistent, activity proven live.
 * - STALE: anchor drifted, activity frozen, heartbeat failed, or review aged out.
 * - DEPRECATED: officially declared inactive / retired.
 * - UNVERIFIED: profile unknown to the registry, or no evidence at all.
 */
export type ReviewedProfileStatus = 'ACTIVE' | 'STALE' | 'DEPRECATED' | 'UNVERIFIED';

/**
 * Activity state, ORTHOGONAL to anchor-parameter consistency.
 *
 * This is what lets the registry express the "Drift case": the on-chain
 * parameters (program id, market PDAs, marginRatioInitial) still match the
 * review exactly, yet the venue has stopped being active (AMM timestamp
 * frozen, official "comment out all ixs" commit). Anchor consistency alone
 * must never be promoted to ACTIVE.
 */
export type ProfileActivityStatus = 'LIVE' | 'FROZEN' | 'UNKNOWN' | 'DEPRECATED_DECLARED';

/** Provenance level of a single evidence reference. */
export type EvidenceLevel = 'chain' | 'official' | 'aggregator' | 'media' | 'unverified';

export interface EvidenceRef {
  /** `src/lib/...:line`, an external evidence-report path, or a URL. */
  ref: string;
  level: EvidenceLevel;
  /** The specific claim this reference supports. */
  note?: string;
}

/** How the activity of an anchor is meant to be observed. */
export type ActivitySignalKind =
  | 'onchainTimestamp'
  | 'recentTransactions'
  | 'officialDeclaration'
  | 'venueApi'
  | 'none';

export interface ActivitySignal {
  kind: ActivitySignalKind;
  /** ISO timestamp of the most recent observable activity (evidence or chain read). */
  lastObservedAt?: string;
  /** ISO timestamp of an official retirement / deactivation declaration. */
  declaredInactiveAt?: string;
  /** Maximum hours of silence before the anchor is treated as FROZEN. */
  maxSilenceHours?: number;
  /** Reference for the declaration / on-chain field (file:line or URL). */
  declarationRef?: string;
  /** On-chain activity field, e.g. `ammLastMarkPriceTwapTs @ +888`. */
  onchainField?: string;
}

/**
 * Chain anchor: the identity that a heartbeat re-reads and compares.
 * Only fields present on the descriptor are checked; every value is a literal
 * read from source-controlled constants (address, runtime code hash, market
 * account list, or a stable identity/parameter slot marker).
 */
export interface ChainAnchor {
  /** Solana program id. */
  programId?: string;
  /** EVM pool / Solana whirlpool / AMM pool address. */
  pool?: string;
  /** EVM proxy address. */
  proxy?: string;
  /** Solana PDAs or reviewed market accounts. */
  marketAccounts?: string[];
  /** Pinned runtime bytecode hash. */
  bytecodeHash?: string;
  /** Stable identity / bound-parameter slot marker (for API / chain-agnostic profiles). */
  paramSlot?: string;
  /** How activity for this anchor is observed. */
  activitySignal?: ActivitySignal;
}

export interface ReviewedProfileDescriptor {
  profileId: string;
  family: ReviewedProfileFamily;
  /** Numeric EVM chain id, a CAIP-2 string, or `chain-agnostic`. */
  chainId: number | string;
  /** ISO date of the review / re-verification. */
  reviewedAt: string;
  evidenceRefs: EvidenceRef[];
  chainAnchor: ChainAnchor;
  /** ISO time of the last SUCCESSFUL (ACTIVE) heartbeat, or null. */
  lastHeartbeatAt: string | null;
  status: ReviewedProfileStatus;
  activityStatus: ProfileActivityStatus;
  notes: string;
  /** Optional hook for a future decoder, so extension stays data-driven. */
  decoderId?: string;
}

/** Reason codes surfaced by heartbeat and guard; all non-OK codes map to BLOCK. */
export type ProfileReasonCode =
  | 'OK'
  | 'PROFILE_STALE'
  | 'PROFILE_DEPRECATED'
  | 'PROFILE_UNVERIFIED'
  | 'PROFILE_ANCHOR_MISMATCH'
  | 'PROFILE_HEARTBEAT_FAILED'
  | 'PROFILE_ACTIVITY_FROZEN'
  | 'PROFILE_ACTIVITY_UNKNOWN';
