/**
 * Oracle config snapshot: public types.
 *
 * This surface deliberately records OBSERVABLE INPUT, not a safety verdict.
 * The product boundary is "what the configuration and its independent sources
 * looked like at a point in time", never "is this configuration safe".
 * A missing input is reported as UNAVAILABLE and never fabricated.
 */

export const ORACLE_CONFIG_SNAPSHOT_SCHEMA_VERSION = 1;

/** Idempotency window. A stable bucket makes repeated calls byte-identical. */
export const ORACLE_CONFIG_SNAPSHOT_BUCKET_SECONDS = 3600;

export type OracleConfigCheckId = 'D1' | 'D2' | 'D3' | 'D4' | 'D5' | 'D6';

export type OracleConfigCheckStatus = 'PASS' | 'WARN' | 'DISCLOSED' | 'UNAVAILABLE';

export interface OracleConfigCheck {
  id: OracleConfigCheckId;
  label: string;
  status: OracleConfigCheckStatus;
  detail: string;
  reference?: string;
  /** Every check is advisory. Nothing here is a safety attestation. */
  advisory: true;
}

export interface OracleConfigFeedState {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
}

export interface OracleConfigProfileState {
  profileId: string;
  status: string;
  activityStatus: string;
}

export interface OracleConfigSources {
  /** Distinct active providers observed for this symbol. */
  providers: string[];
  /** Non-derived operator groups, the v2.1 independence single source. */
  nonDerivedGroups: number;
  feed: OracleConfigFeedState | null;
  profile: OracleConfigProfileState | null;
  /** True when the live feed registry could not be read. Fail closed. */
  feedRegistryErrored: boolean;
  /** Deterministic pin of the reviewed-profile registry used for this record. */
  registryPin: string;
}

export type OracleConfigGateResult = 'OBSERVED' | 'REVIEW_RECOMMENDED' | 'INPUT_UNAVAILABLE';

export interface OracleConfigSnapshotPayload {
  schemaVersion: number;
  chainId: number;
  protocolId: string;
  assetSymbol: string;
  /** sha256 of the canonical observable configuration. */
  configHash: string;
  /** sha256 of the canonical check list. */
  checksHash: string;
  registryPin: string;
  observedAtMs: number;
  bucketStartMs: number;
  sources: OracleConfigSources;
  checks: OracleConfigCheck[];
  reasonCodes: string[];
  gateResult: OracleConfigGateResult;
  advisory: true;
}

export interface OracleConfigAttestation {
  uid: string;
  schemaVersion: number;
  attester: string;
  attesterLabel: string;
  signedAt: string;
  signature: string;
  eip712: {
    domain: { name: string; version: string; chainId: number };
    primaryType: string;
  };
}

export interface OracleConfigSnapshotPack {
  payload: OracleConfigSnapshotPayload;
  /** sha256 of the canonical payload. */
  payloadHash: string;
  /** null when no attester key is provisioned; the record is unchanged. */
  attestation: OracleConfigAttestation | null;
}

export interface OracleConfigSnapshotInput {
  chainId: number;
  protocolId: string;
  assetSymbol: string;
}
