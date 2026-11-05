/**
 * Pure freshness gate for reviewed profiles (P0-2).
 *
 * `assertProfileFresh` is a PURE function: given the same arguments it returns
 * the same decision and performs no I/O. `evaluateProfileStatus` is the async
 * entry point that runs a heartbeat (injected reader) and feeds its result into
 * the pure gate. Guard integrations should await `evaluateProfileStatus` at the
 * very top of their decision path and short-circuit to BLOCK on any non-ACTIVE
 * result.
 */

import {
  runHeartbeat,
  type HeartbeatOptions,
  type HeartbeatResult,
  type RpcReader,
} from './heartbeat';
import { getReviewedProfile, listReviewedProfiles } from './registry';
import type {
  ProfileActivityStatus,
  ProfileReasonCode,
  ReviewedProfileStatus,
} from './types';

/** A decision that maps directly onto a guard verdict (BLOCK when not fresh). */
export interface ProfileFreshnessDecision {
  profileId: string;
  fresh: boolean;
  status: ReviewedProfileStatus;
  activityStatus: ProfileActivityStatus;
  /** `BLOCK` for every non-ACTIVE outcome; `ALLOW` only for proven-fresh. */
  verdict: 'ALLOW' | 'BLOCK';
  reasonCode: ProfileReasonCode;
  reason: string;
  lastHeartbeatAt: string | null;
  /** True when the conservative branch (not proven fresh) was taken. */
  failClosed: boolean;
  evaluatedAt: string;
}

export interface GuardOptions extends HeartbeatOptions {
  /** A completed heartbeat result; when absent, the static descriptor state is used. */
  heartbeat?: HeartbeatResult;
}

const STATUS_CODE: Record<ReviewedProfileStatus, ProfileReasonCode> = {
  ACTIVE: 'OK',
  STALE: 'PROFILE_STALE',
  DEPRECATED: 'PROFILE_DEPRECATED',
  UNVERIFIED: 'PROFILE_UNVERIFIED',
};

function resolveNow(now?: string | number | Date): number {
  if (now === undefined) return Date.now();
  if (now instanceof Date) return now.getTime();
  if (typeof now === 'number') return Number.isFinite(now) ? now : Date.now();
  const parsed = Date.parse(now);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

/**
 * Pure gate. Converts a heartbeat result (or the descriptor's static state)
 * into an ALLOW/BLOCK decision with a stable reasonCode.
 *
 * Without a heartbeat result, only `ACTIVE` + `LIVE` descriptors pass;
 * UNKNOWN activity is NEVER treated as ACTIVE (fail-closed).
 */
export function assertProfileFresh(
  profileId: string,
  opts: GuardOptions = {}
): ProfileFreshnessDecision {
  const evaluatedAt = new Date(resolveNow(opts.now)).toISOString();
  const descriptor = getReviewedProfile(profileId);

  if (!descriptor) {
    return {
      profileId,
      fresh: false,
      status: 'UNVERIFIED',
      activityStatus: 'UNKNOWN',
      verdict: 'BLOCK',
      reasonCode: 'PROFILE_UNVERIFIED',
      reason: `未知 profileId「${profileId}」：registry 未收录，fail-closed`,
      lastHeartbeatAt: null,
      failClosed: true,
      evaluatedAt,
    };
  }

  const heartbeat = opts.heartbeat;
  if (heartbeat) {
    const fresh =
      heartbeat.status === 'ACTIVE' &&
      heartbeat.activityStatus === 'LIVE' &&
      heartbeat.reasonCode === 'OK';
    return {
      profileId,
      fresh,
      status: heartbeat.status,
      activityStatus: heartbeat.activityStatus,
      verdict: fresh ? 'ALLOW' : 'BLOCK',
      reasonCode: heartbeat.reasonCode,
      reason: heartbeat.reason,
      lastHeartbeatAt: heartbeat.lastHeartbeatAt,
      failClosed: !fresh,
      evaluatedAt,
    };
  }

  // Static, no-heartbeat path. Still fail-closed: UNKNOWN activity blocks.
  let status: ReviewedProfileStatus = descriptor.status;
  const activityStatus: ProfileActivityStatus = descriptor.activityStatus;
  let reasonCode: ProfileReasonCode;
  let reason: string;

  if (status !== 'ACTIVE') {
    reasonCode = STATUS_CODE[status];
    reason = `descriptor.status=${status}（未经本次心跳复核）`;
  } else if (activityStatus === 'FROZEN' || activityStatus === 'DEPRECATED_DECLARED') {
    status = 'STALE';
    reasonCode = 'PROFILE_STALE';
    reason = 'descriptor 活性为 FROZEN/DEPRECATED_DECLARED，禁止当作 ACTIVE';
  } else if (activityStatus === 'UNKNOWN') {
    status = 'STALE';
    reasonCode = 'PROFILE_STALE';
    reason = '无心跳证据：activityStatus=UNKNOWN，禁止当作 ACTIVE（fail-closed）';
  } else {
    reasonCode = 'OK';
    reason = '静态 descriptor 为 ACTIVE/LIVE（本次未跑心跳）';
  }

  const fresh = status === 'ACTIVE' && activityStatus === 'LIVE' && reasonCode === 'OK';
  return {
    profileId,
    fresh,
    status,
    activityStatus,
    verdict: fresh ? 'ALLOW' : 'BLOCK',
    reasonCode,
    reason,
    lastHeartbeatAt: descriptor.lastHeartbeatAt,
    failClosed: !fresh,
    evaluatedAt,
  };
}

/**
 * Async entry point for guard integration: run one read-only heartbeat, then
 * apply the pure gate. Reader errors / timeouts are absorbed by `runHeartbeat`
 * into a STALE heartbeat result, so this always resolves to a BLOCK decision
 * on any failure.
 */
export async function evaluateProfileStatus(
  profileId: string,
  reader?: RpcReader,
  opts: HeartbeatOptions = {}
): Promise<ProfileFreshnessDecision> {
  const descriptor = getReviewedProfile(profileId);
  if (!descriptor) return assertProfileFresh(profileId, opts);
  const heartbeat = await runHeartbeat(descriptor, reader, opts);
  return assertProfileFresh(profileId, { ...opts, heartbeat });
}

/** Evaluate the whole registry (used by monitoring / the CLI). */
export async function evaluateAllProfiles(
  reader?: RpcReader,
  opts: HeartbeatOptions = {}
): Promise<ProfileFreshnessDecision[]> {
  const decisions: ProfileFreshnessDecision[] = [];
  for (const descriptor of listReviewedProfiles()) {
    decisions.push(await evaluateProfileStatus(descriptor.profileId, reader, opts));
  }
  return decisions;
}
