/**
 * Deterministic engine for oracle config snapshots.
 *
 * Pure functions only: no network, no database, no clock reads. The caller
 * supplies already-observed source state. Everything in the payload is
 * recomputable by a third party from the published registry and feed config.
 */

import { createHash } from 'node:crypto';

import { ORACLE_CONFIG_SNAPSHOT_SCHEMA_VERSION } from './types';

import type {
  OracleConfigCheck,
  OracleConfigGateResult,
  OracleConfigSnapshotInput,
  OracleConfigSnapshotPayload,
  OracleConfigSources,
} from './types';

/** The pre-trade quorum gate, moved to config time. */
export const MIN_INDEPENDENT_PROVIDERS = 3;
/** The pre-trade independence gate, moved to config time. */
export const MIN_NON_DERIVED_GROUPS = 2;

/**
 * Incident patterns are an explicitly maintained, versioned advisory table,
 * not a corpus lookup. Each entry carries the source it was distilled from.
 * Unknown protocols simply produce no match; nothing is inferred.
 */
export const INCIDENT_PATTERNS = [
  {
    code: 'P-07',
    match: 'moonwell',
    label: 'Wide staleness on systemic collateral',
    reference: 'moonwell-base-oracle-risk-list observation B (2026-10-21)',
  },
  {
    code: 'P-11',
    match: 'synthetix',
    label: 'Strictness / OI cap / confidence-width parameter drift',
    reference: 'synthetix-config-hunt Base perps review (2026-11-03)',
  },
  {
    code: 'P-14',
    match: 'venus',
    label: 'Realizable-value gap on wrapper collateral',
    reference: 'Venus AUSD config assessment draft (advisory only)',
  },
] as const;

/** Recursively sort object keys so JSON serialization is byte-stable. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`).join(',')}}`;
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

/** Hash of the observable configuration only, excluding observations. */
export function computeConfigHash(
  input: OracleConfigSnapshotInput,
  sources: OracleConfigSources
): string {
  return sha256Hex(
    canonicalJson({
      chainId: input.chainId,
      protocolId: input.protocolId,
      assetSymbol: input.assetSymbol,
      feed: sources.feed,
    })
  );
}

export function computeChecksHash(checks: readonly OracleConfigCheck[]): string {
  return sha256Hex(canonicalJson(checks));
}

function check(
  id: OracleConfigCheck['id'],
  label: string,
  status: OracleConfigCheck['status'],
  detail: string,
  reference?: string
): OracleConfigCheck {
  return { id, label, status, detail, ...(reference ? { reference } : {}), advisory: true };
}

/**
 * Build D1-D6. This is a RECORD of checks, not a safety verdict: unavailable
 * inputs are surfaced as UNAVAILABLE, and no status here is a BLOCK decision.
 */
export function buildChecks(
  input: OracleConfigSnapshotInput,
  sources: OracleConfigSources
): OracleConfigCheck[] {
  const d1: OracleConfigCheck = sources.feedRegistryErrored
    ? check(
        'D1',
        'feed coverage / quorum',
        'UNAVAILABLE',
        'Live feed registry unreadable; provider count cannot be asserted.'
      )
    : sources.providers.length >= MIN_INDEPENDENT_PROVIDERS
      ? check(
          'D1',
          'feed coverage / quorum',
          'PASS',
          `${sources.providers.length} independent providers observed for ${input.assetSymbol} on chain ${input.chainId}.`
        )
      : check(
          'D1',
          'feed coverage / quorum',
          'WARN',
          `Only ${sources.providers.length} independent providers observed; the pre-trade quorum gate requires ${MIN_INDEPENDENT_PROVIDERS}.`
        );

  const d2: OracleConfigCheck = sources.feedRegistryErrored
    ? check(
        'D2',
        'source independence',
        'UNAVAILABLE',
        'Non-derived operator groups cannot be computed without the live feed registry.'
      )
    : sources.nonDerivedGroups >= MIN_NON_DERIVED_GROUPS
      ? check(
          'D2',
          'source independence',
          'PASS',
          `Non-derived operator groups = ${sources.nonDerivedGroups} (threshold ${MIN_NON_DERIVED_GROUPS}).`
        )
      : check(
          'D2',
          'source independence',
          'WARN',
          `Non-derived operator groups = ${sources.nonDerivedGroups}; derived sources are excluded by the v2.1 gate.`
        );

  const d3: OracleConfigCheck = sources.feed
    ? check(
        'D3',
        'parameter strictness',
        'DISCLOSED',
        `Static feed ${sources.feed.name} (${sources.feed.address}, ${sources.feed.decimals} decimals) is registered. Runtime staleness, deviation and heartbeat parameters are NOT part of this record; they belong to the heartbeat log.`
      )
    : check(
        'D3',
        'parameter strictness',
        'UNAVAILABLE',
        `No registered Chainlink feed for ${input.assetSymbol} on chain ${input.chainId}; parameter review is not asserted.`
      );

  const d4: OracleConfigCheck = sources.profile
    ? check(
        'D4',
        'profile freshness',
        sources.profile.status === 'ACTIVE' ? 'PASS' : 'WARN',
        `Reviewed profile ${sources.profile.profileId} status=${sources.profile.status}, activity=${sources.profile.activityStatus}. Status is disclosed, not used to block this record.`
      )
    : check(
        'D4',
        'profile freshness',
        'DISCLOSED',
        'No reviewed profile matched this protocol; freshness is not asserted.'
      );

  const matched = INCIDENT_PATTERNS.find((pattern) =>
    input.protocolId.toLowerCase().includes(pattern.match)
  );
  const d5: OracleConfigCheck = matched
    ? check(
        'D5',
        'historical incident pattern',
        'WARN',
        `Known advisory pattern ${matched.code} (${matched.label}) matched for this protocol.`,
        matched.reference
      )
    : check(
        'D5',
        'historical incident pattern',
        'DISCLOSED',
        'No maintained incident pattern matched; this is not evidence of absence.'
      );

  const d6: OracleConfigCheck = check(
    'D6',
    'realizable-value gap',
    'DISCLOSED',
    'Collateral oracle coverage versus realizable exit depth is NOT evaluated in v1. This record makes no liquidity claim.'
  );

  return [d1, d2, d3, d4, d5, d6];
}

export function deriveGateResult(checks: readonly OracleConfigCheck[]): OracleConfigGateResult {
  if (checks.some((item) => item.status === 'UNAVAILABLE')) return 'INPUT_UNAVAILABLE';
  if (checks.some((item) => item.status === 'WARN')) return 'REVIEW_RECOMMENDED';
  return 'OBSERVED';
}

export function deriveReasonCodes(checks: readonly OracleConfigCheck[]): string[] {
  const codes: string[] = [];
  for (const item of checks) {
    if (item.status === 'WARN' || item.status === 'UNAVAILABLE') {
      codes.push(`${item.id}_${item.status}`);
    }
  }
  const matched = checks.find((item) => item.id === 'D5' && item.status === 'WARN');
  if (matched?.reference) codes.push('INCIDENT_PATTERN_MATCH');
  return codes.sort();
}

export function buildPayload(
  input: OracleConfigSnapshotInput,
  sources: OracleConfigSources,
  observedAtMs: number,
  bucketStartMs: number
): OracleConfigSnapshotPayload {
  const checks = buildChecks(input, sources);
  return {
    schemaVersion: ORACLE_CONFIG_SNAPSHOT_SCHEMA_VERSION,
    chainId: input.chainId,
    protocolId: input.protocolId,
    assetSymbol: input.assetSymbol,
    configHash: computeConfigHash(input, sources),
    checksHash: computeChecksHash(checks),
    registryPin: sources.registryPin,
    observedAtMs,
    bucketStartMs,
    sources,
    checks,
    reasonCodes: deriveReasonCodes(checks),
    gateResult: deriveGateResult(checks),
    advisory: true,
  };
}

export function computePayloadHash(payload: OracleConfigSnapshotPayload): string {
  return sha256Hex(canonicalJson(payload));
}
