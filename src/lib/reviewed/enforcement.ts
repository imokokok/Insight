/**
 * Evidence-graded production enforcement for reviewed profiles (P0-2).
 *
 * `evaluateProfileStatus` / `assertProfileFresh` in `guard.ts` are aggressively
 * fail-closed: a missing RpcReader, UNKNOWN activity, or a heartbeat timeout
 * all BLOCK. Most of the 38 descriptors currently have NO reliable activity
 * signal, so wiring that gate in verbatim would switch off almost every live
 * capability. This module therefore grades by EVIDENCE before enforcing:
 *
 *  1. Hard BLOCK (default) ONLY profiles with FIRST-HAND evidence that they
 *     are already disproved — currently just `drift-v2-mainnet` (STALE +
 *     FROZEN, with a chain/official evidence chain and an official/on-chain
 *     deactivation declaration). The bound constants themselves are correct
 *     and are deliberately left unchanged.
 *  2. Every other profile (ACTIVE / UNVERIFIED / activity UNKNOWN, and any
 *     non-ACTIVE result reported by an injected heartbeat) does NOT change the
 *     verdict: `verdict` is null and the detection result is surfaced only as
 *     an `advisory` for operators.
 *  3. `strict` (DEFAULT FALSE): when enabled, EVERY non-ACTIVE profile BLOCKs.
 *     Reserved for the future once heartbeat / RpcReader infrastructure is in
 *     place; it is documented here and in the guard / attestation call sites
 *     but is NOT enabled in production today.
 *
 * Pure by construction: no I/O, no clock reads, no RpcReader. A completed
 * heartbeat may be passed in as data via `opts.heartbeat`.
 */

import { getReviewedProfile } from './registry';

import type { HeartbeatResult } from './heartbeat';
import type {
  ProfileActivityStatus,
  ProfileReasonCode,
  ReviewedProfileDescriptor,
  ReviewedProfileStatus,
} from './types';

/** Result of the evidence-graded enforcement decision. */
export interface ProfileEnforcement {
  profileId: string;
  /** 'first-hand' only when the descriptor carries first-hand disproving evidence. */
  evidenceLevel: 'first-hand' | 'none';
  /** Effective status for this evaluation (descriptor, or injected heartbeat). */
  status: ReviewedProfileStatus;
  /** True when this evaluation produced a mandatory BLOCK. */
  enforced: boolean;
  /** 'BLOCK' when enforced, else null (advisory-only, never downgrades a verdict). */
  verdict: 'BLOCK' | null;
  reasonCode: ProfileReasonCode;
  /** Human-readable detection result for operators; never a verdict on its own. */
  advisory: string;
  /** Whether strict grading was requested for this evaluation (default false). */
  strict: boolean;
}

export interface EnforcementOptions {
  /** Completed heartbeat result, injected as data — this function never runs one. */
  heartbeat?: HeartbeatResult;
  /**
   * Strict grading: all non-ACTIVE profiles BLOCK. DEFAULT FALSE.
   * Reserved for when heartbeat / RpcReader infrastructure is available; do
   * not enable in production while most descriptors lack reliable activity
   * signals.
   */
  strict?: boolean;
}

const STATUS_CODE: Record<ReviewedProfileStatus, ProfileReasonCode> = {
  ACTIVE: 'OK',
  STALE: 'PROFILE_STALE',
  DEPRECATED: 'PROFILE_DEPRECATED',
  UNVERIFIED: 'PROFILE_UNVERIFIED',
};

/**
 * A descriptor is FIRST-HAND disproved only when it is already non-ACTIVE, its
 * activity is explicitly frozen / declared inactive (never UNKNOWN), and it
 * carries a chain/official evidence chain plus an official/on-chain
 * deactivation declaration. This is data-driven: it never switches on a
 * profileId, so a future descriptor with equivalent first-hand evidence is
 * graded the same way. Today only `drift-v2-mainnet` satisfies it.
 */
function isFirstHandDisproved(descriptor: ReviewedProfileDescriptor): boolean {
  const inactive = descriptor.status === 'STALE' || descriptor.status === 'DEPRECATED';
  const frozen =
    descriptor.activityStatus === 'FROZEN' || descriptor.activityStatus === 'DEPRECATED_DECLARED';
  const signal = descriptor.chainAnchor.activitySignal;
  const declaredInactive = Boolean(signal?.declaredInactiveAt);
  const hasProvenance = descriptor.evidenceRefs.some(
    (ref) => ref.level === 'chain' || ref.level === 'official'
  );
  return inactive && frozen && declaredInactive && hasProvenance;
}

function detectReasonCode(
  heartbeat: HeartbeatResult | undefined,
  status: ReviewedProfileStatus,
  activity: ProfileActivityStatus
): ProfileReasonCode {
  if (heartbeat && heartbeat.reasonCode !== 'OK') return heartbeat.reasonCode;
  if (activity === 'DEPRECATED_DECLARED') return 'PROFILE_DEPRECATED';
  if (activity === 'FROZEN') return 'PROFILE_ACTIVITY_FROZEN';
  if (status === 'ACTIVE') return 'OK';
  return STATUS_CODE[status];
}

function describeAdvisory(
  profileId: string,
  status: ReviewedProfileStatus,
  evidenceLevel: 'first-hand' | 'none',
  enforced: boolean,
  strict: boolean,
  reasonCode: ProfileReasonCode
): string {
  const grade =
    evidenceLevel === 'first-hand'
      ? '一手证伪证据（链上/官方证据链 + 停用声明）'
      : '未见一手证伪证据';
  if (enforced) {
    const scope = strict ? 'strict 已开启：所有非 ACTIVE 一律 BLOCK' : '默认：仅一手证伪条目';
    return `${profileId}: status=${status}，${grade}，${reasonCode}；按证据分级（${scope}）强制 BLOCK。`;
  }
  return `${profileId}: status=${status}，${grade}，${reasonCode}；仅附 advisory，不改动 verdict。strict 默认 false，待心跳基础设施齐备后开启 strict 才会对非 ACTIVE 一律 BLOCK。`;
}

/**
 * Pure, network-free evidence-graded enforcement decision.
 * See the module header for the three rules.
 */
export function enforceReviewedProfile(
  profileId: string,
  opts: EnforcementOptions = {}
): ProfileEnforcement {
  const strict = opts.strict === true;
  const descriptor = getReviewedProfile(profileId);
  const heartbeat =
    opts.heartbeat && opts.heartbeat.profileId === profileId ? opts.heartbeat : undefined;
  const status: ReviewedProfileStatus = heartbeat
    ? heartbeat.status
    : (descriptor?.status ?? 'UNVERIFIED');
  const activity: ProfileActivityStatus =
    heartbeat?.activityStatus ?? descriptor?.activityStatus ?? 'UNKNOWN';
  const firstHand = descriptor ? isFirstHandDisproved(descriptor) : false;
  const evidenceLevel: 'first-hand' | 'none' = firstHand ? 'first-hand' : 'none';
  const reasonCode = detectReasonCode(heartbeat, status, activity);

  // Rule 3 (strict) overrides grading: every non-ACTIVE profile BLOCKs.
  // Rule 1 (default): only first-hand disproved profiles BLOCK.
  // Rule 2: everything else is advisory-only (verdict null).
  const enforced = strict ? status !== 'ACTIVE' : firstHand;
  const verdict: 'BLOCK' | null = enforced ? 'BLOCK' : null;

  return {
    profileId,
    evidenceLevel,
    status,
    enforced,
    verdict,
    reasonCode,
    advisory: describeAdvisory(profileId, status, evidenceLevel, enforced, strict, reasonCode),
    strict,
  };
}

/**
 * Contract-asserting variant for operators / tests: recomputes the decision
 * and verifies the grading invariants (BLOCK iff enforced; under the default
 * non-strict grading a hard BLOCK can ONLY come from first-hand evidence;
 * under strict, a BLOCK can ONLY come from a non-ACTIVE status). Throws if a
 * future change breaks the evidence-grading contract. Never performs I/O.
 */
export function assertProfileEnforcement(
  profileId: string,
  opts: EnforcementOptions = {}
): ProfileEnforcement {
  const result = enforceReviewedProfile(profileId, opts);
  const blocked = result.verdict === 'BLOCK';
  if (blocked !== result.enforced) {
    throw new Error('PROFILE_ENFORCEMENT_INVARIANT: BLOCK verdict must match enforced flag');
  }
  if (!result.strict && result.enforced && result.evidenceLevel !== 'first-hand') {
    throw new Error(
      'PROFILE_ENFORCEMENT_INVARIANT: default grading may only BLOCK first-hand disproved profiles'
    );
  }
  if (result.strict && result.enforced && result.status === 'ACTIVE') {
    throw new Error('PROFILE_ENFORCEMENT_INVARIANT: strict must not BLOCK an ACTIVE profile');
  }
  return result;
}
