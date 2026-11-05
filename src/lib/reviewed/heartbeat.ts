/**
 * Read-only heartbeat for reviewed profiles (P0-2).
 *
 * Two independent checks, both required for a profile to be considered ACTIVE:
 *   1. Anchor consistency — re-read the pinned program / contract / pool /
 *      market / bytecode / parameter slot and compare to the descriptor.
 *   2. Activity — is the anchor observably live within the last N hours, or
 *      has an official retirement declaration been recorded?
 *
 * Fail-closed contract (never promote UNKNOWN to ACTIVE):
 * - missing reader, thrown error, timeout, null/malformed observation -> STALE
 * - any anchor mismatch, or any registered anchor not observed -> STALE
 * - activity UNKNOWN (no reliable signal) -> STALE, NOT ACTIVE
 * - activity FROZEN / official declaration -> STALE / DEPRECATED
 * Only anchor-consistent + proven-LIVE + in-date yields ACTIVE.
 */

import { getReviewedProfile } from './registry';
import type {
  ChainAnchor,
  ProfileActivityStatus,
  ProfileReasonCode,
  ReviewedProfileDescriptor,
  ReviewedProfileFamily,
  ReviewedProfileStatus,
} from './types';

export const DEFAULT_TIMEOUT_MS = 8_000;
/** A reviewed descriptor older than this many days is STALE until re-reviewed. */
export const DEFAULT_MAX_REVIEW_AGE_DAYS = 90;
/** Default activity window: an anchor silent for longer is FROZEN. */
export const DEFAULT_MAX_SILENCE_HOURS = 24;

/** A single observation returned by an injected reader. */
export interface AnchorObservation {
  /** Observed anchor values; a missing field means "could not observe". */
  programId?: string;
  pool?: string;
  proxy?: string;
  marketAccounts?: string[];
  bytecodeHash?: string;
  paramSlot?: string;
  /** ISO time the observation was taken (defaults to the evaluation clock). */
  observedAt?: string;
  activity?: {
    /** Reader's own activity classification, if it can produce one. */
    status?: 'live' | 'frozen' | 'unknown';
    /** ISO time of the most recent observable activity. */
    lastObservedAt?: string;
    /** Number of observable actions in the activity window. */
    recentTransactions?: number;
    /** Official / on-chain retirement declaration observed by the reader. */
    declaredInactive?: boolean;
  };
  /** Identifier of the reader, for reason traceability. */
  reader?: string;
}

export interface HeartbeatContext {
  profileId: string;
  family: ReviewedProfileFamily;
  chainId: number | string;
  timeoutMs: number;
}

/** Injected, read-only RPC surface. Implementations MUST NOT write to chain. */
export interface RpcReader {
  readAnchor(
    anchor: ChainAnchor,
    context: HeartbeatContext
  ): Promise<AnchorObservation | null>;
}

export interface HeartbeatOptions {
  /** Injectable clock (ISO string, epoch ms, or Date) for deterministic tests. */
  now?: string | number | Date;
  /** Heartbeat timeout in ms; a slow reader is treated as a failure. */
  timeoutMs?: number;
  /** Max age of `reviewedAt` in days before the descriptor is STALE. */
  maxReviewAgeDays?: number;
}

export interface HeartbeatChecks {
  anchor: 'consistent' | 'mismatch' | 'unknown' | 'skipped';
  activity: 'live' | 'frozen' | 'unknown';
  reviewAge: 'fresh' | 'expired';
}

export interface HeartbeatResult {
  profileId: string;
  status: ReviewedProfileStatus;
  activityStatus: ProfileActivityStatus;
  reasonCode: ProfileReasonCode;
  reason: string;
  /** Time of the last ACTIVE heartbeat; unchanged on failure. */
  lastHeartbeatAt: string | null;
  anchorConsistent: boolean | 'unknown';
  checks: HeartbeatChecks;
  evaluatedAt: string;
  error?: string;
}

const ANCHOR_FIELDS = [
  'programId',
  'pool',
  'proxy',
  'marketAccounts',
  'bytecodeHash',
  'paramSlot',
] as const;
type AnchorField = (typeof ANCHOR_FIELDS)[number];
type ComparableAnchorValue = string | string[];

function resolveNow(now?: string | number | Date): number {
  if (now === undefined) return Date.now();
  if (now instanceof Date) return now.getTime();
  if (typeof now === 'number') return Number.isFinite(now) ? now : Date.now();
  const parsed = Date.parse(now);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function isComparable(value: unknown): value is ComparableAnchorValue {
  return (
    typeof value === 'string' ||
    (Array.isArray(value) && value.every((entry) => typeof entry === 'string'))
  );
}

function anchorValuesEqual(expected: ComparableAnchorValue, actual: ComparableAnchorValue): boolean {
  if (Array.isArray(expected) && Array.isArray(actual)) {
    return expected.length === actual.length && expected.every((v, i) => v === actual[i]);
  }
  if (!Array.isArray(expected) && !Array.isArray(actual)) return expected === actual;
  return false;
}

function compareAnchor(
  descriptor: ReviewedProfileDescriptor,
  observation: AnchorObservation
): {
  consistent: boolean;
  anchorConsistent: boolean | 'unknown';
  mismatches: string[];
  missing: string[];
  checked: number;
} {
  const mismatches: string[] = [];
  const missing: string[] = [];
  let checked = 0;
  for (const field of ANCHOR_FIELDS as readonly AnchorField[]) {
    const expected = descriptor.chainAnchor[field];
    if (expected === undefined || !isComparable(expected)) continue;
    checked += 1;
    const actual = observation[field];
    if (actual === undefined || actual === null) {
      missing.push(field);
      continue;
    }
    if (!isComparable(actual) || !anchorValuesEqual(expected, actual)) {
      mismatches.push(field);
    }
  }
  const anchorConsistent: boolean | 'unknown' =
    mismatches.length > 0 ? false : missing.length > 0 ? 'unknown' : true;
  return {
    consistent: mismatches.length === 0 && missing.length === 0 && checked > 0,
    anchorConsistent,
    mismatches,
    missing,
    checked,
  };
}

function activityCheckValue(status: ProfileActivityStatus): HeartbeatChecks['activity'] {
  if (status === 'LIVE') return 'live';
  if (status === 'UNKNOWN') return 'unknown';
  return 'frozen';
}

interface ActivityVerdict {
  status: ProfileActivityStatus;
  reason: string;
  code: ProfileReasonCode;
}

/** Combine descriptor evidence and reader evidence into one activity verdict. */
function evaluateActivity(
  descriptor: ReviewedProfileDescriptor,
  observation: AnchorObservation,
  nowMs: number
): ActivityVerdict {
  const signal = descriptor.chainAnchor.activitySignal;
  const observed = observation.activity;

  // 1) An official / chain retirement declaration is decisive.
  if (signal?.declaredInactiveAt || observed?.declaredInactive === true) {
    const at = signal?.declaredInactiveAt ?? 'observed by reader';
    return {
      status: 'DEPRECATED_DECLARED',
      reason: `活性失效：官方/链上停用声明 ${at}（参数仍一致也不是活跃场所）`,
      code: 'PROFILE_DEPRECATED',
    };
  }

  const maxSilenceHours = signal?.maxSilenceHours ?? DEFAULT_MAX_SILENCE_HOURS;
  const lastObservedAt = observed?.lastObservedAt ?? signal?.lastObservedAt;

  // 2) Silence beyond the window -> FROZEN.
  if (lastObservedAt) {
    const lastMs = Date.parse(lastObservedAt);
    const ageHours = Number.isFinite(lastMs) ? (nowMs - lastMs) / 3_600_000 : Number.NaN;
    if (!Number.isFinite(ageHours) || ageHours > maxSilenceHours) {
      return {
        status: 'FROZEN',
        reason: `活性冻结：最后活动 ${lastObservedAt}，静止 ${
          Number.isFinite(ageHours) ? `${ageHours.toFixed(1)}h` : '未知时长'
        } > ${maxSilenceHours}h`,
        code: 'PROFILE_ACTIVITY_FROZEN',
      };
    }
  }
  if (observed?.status === 'frozen') {
    return {
      status: 'FROZEN',
      reason: '活性冻结：reader 观测到锚点已停止活动',
      code: 'PROFILE_ACTIVITY_FROZEN',
    };
  }

  // 3) Explicit LIVE evidence is required (status + a fresh timestamp).
  const hasLiveEvidence =
    observed?.status === 'live' &&
    !!lastObservedAt &&
    (observed.recentTransactions === undefined || observed.recentTransactions > 0);
  if (hasLiveEvidence) {
    return {
      status: 'LIVE',
      reason: `活性 LIVE：最近活动 ${lastObservedAt}，处于 ${maxSilenceHours}h 窗口内`,
      code: 'OK',
    };
  }

  // 4) Anything else is UNKNOWN. UNKNOWN is NEVER treated as ACTIVE.
  return {
    status: 'UNKNOWN',
    reason: '无可靠活性信号（UNKNOWN 不得当作 ACTIVE）',
    code: 'PROFILE_ACTIVITY_UNKNOWN',
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`heartbeat_timeout_${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    );
  });
}

function makeResult(
  descriptor: ReviewedProfileDescriptor,
  evaluatedAt: string,
  overrides: Partial<HeartbeatResult>
): HeartbeatResult {
  return {
    profileId: descriptor.profileId,
    status: 'STALE',
    activityStatus: 'UNKNOWN',
    reasonCode: 'PROFILE_STALE',
    reason: '',
    lastHeartbeatAt: descriptor.lastHeartbeatAt,
    anchorConsistent: 'unknown',
    checks: {
      anchor: 'skipped',
      activity: activityCheckValue(descriptor.activityStatus),
      reviewAge: 'fresh',
    },
    evaluatedAt,
    ...overrides,
  };
}

const STATIC_CODE: Record<ReviewedProfileStatus, ProfileReasonCode> = {
  ACTIVE: 'OK',
  STALE: 'PROFILE_STALE',
  DEPRECATED: 'PROFILE_DEPRECATED',
  UNVERIFIED: 'PROFILE_UNVERIFIED',
};

/**
 * Run one read-only heartbeat for a descriptor. All failure modes resolve to a
 * non-ACTIVE result; this function never throws.
 */
export async function runHeartbeat(
  descriptor: ReviewedProfileDescriptor,
  reader: RpcReader | undefined,
  opts: HeartbeatOptions = {}
): Promise<HeartbeatResult> {
  const nowMs = resolveNow(opts.now);
  const evaluatedAt = new Date(nowMs).toISOString();
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxReviewAgeDays = opts.maxReviewAgeDays ?? DEFAULT_MAX_REVIEW_AGE_DAYS;

  // Static, fail-closed short circuit: a descriptor already marked non-ACTIVE
  // never needs (and never gets) a fresh ACTIVE verdict from a heartbeat.
  if (descriptor.status !== 'ACTIVE') {
    return makeResult(descriptor, evaluatedAt, {
      status: descriptor.status,
      activityStatus: descriptor.activityStatus,
      reasonCode: STATIC_CODE[descriptor.status],
      reason:
        descriptor.status === 'DEPRECATED'
          ? 'descriptor 已标记 DEPRECATED（官方停用/退役）'
          : descriptor.status === 'UNVERIFIED'
            ? 'descriptor 未核实（UNVERIFIED），禁止放行'
            : 'descriptor 已标记 STALE（锚点漂移/活性失效/心跳失败/复核过期）',
    });
  }

  const reviewedAtMs = Date.parse(descriptor.reviewedAt);
  if (Number.isFinite(reviewedAtMs) && (nowMs - reviewedAtMs) / 86_400_000 > maxReviewAgeDays) {
    return makeResult(descriptor, evaluatedAt, {
      status: 'STALE',
      reasonCode: 'PROFILE_STALE',
      reason: `复核过期：reviewedAt ${descriptor.reviewedAt} 超过 ${maxReviewAgeDays} 天`,
      checks: {
        anchor: 'skipped',
        activity: activityCheckValue(descriptor.activityStatus),
        reviewAge: 'expired',
      },
    });
  }

  // No injected reader -> cannot prove freshness -> fail closed.
  if (!reader) {
    return makeResult(descriptor, evaluatedAt, {
      status: 'STALE',
      reasonCode: 'PROFILE_HEARTBEAT_FAILED',
      reason: '未注入 RpcReader：无法证明锚点一致性或活性（fail-closed）',
      error: 'no_reader',
    });
  }

  let observation: AnchorObservation | null;
  try {
    observation = await withTimeout(
      Promise.resolve(
        reader.readAnchor(descriptor.chainAnchor, {
          profileId: descriptor.profileId,
          family: descriptor.family,
          chainId: descriptor.chainId,
          timeoutMs,
        })
      ),
      timeoutMs
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return makeResult(descriptor, evaluatedAt, {
      status: 'STALE',
      reasonCode: 'PROFILE_HEARTBEAT_FAILED',
      reason: `心跳失败（reader 抛错/超时），按最保守处理：${message}`,
      error: message,
    });
  }

  if (!observation || typeof observation !== 'object') {
    return makeResult(descriptor, evaluatedAt, {
      status: 'STALE',
      reasonCode: 'PROFILE_HEARTBEAT_FAILED',
      reason: '心跳返回空/畸形观测，按最保守处理',
      error: 'invalid_observation',
    });
  }

  const comparison = compareAnchor(descriptor, observation);
  if (!comparison.consistent) {
    const detail =
      comparison.mismatches.length > 0
        ? `锚点漂移字段 [${comparison.mismatches.join(', ')}]`
        : comparison.missing.length > 0
          ? `锚点无法观测字段 [${comparison.missing.join(', ')}]`
          : 'descriptor 无可比对锚点字段';
    return makeResult(descriptor, evaluatedAt, {
      status: 'STALE',
      reasonCode: comparison.mismatches.length > 0 ? 'PROFILE_ANCHOR_MISMATCH' : 'PROFILE_STALE',
      reason: `锚点一致性检查未通过：${detail}`,
      anchorConsistent: comparison.anchorConsistent,
      checks: {
        anchor: comparison.mismatches.length > 0 ? 'mismatch' : 'unknown',
        activity: activityCheckValue(descriptor.activityStatus),
        reviewAge: 'fresh',
      },
    });
  }

  const activity = evaluateActivity(descriptor, observation, nowMs);
  const observedAt = observation.observedAt ?? evaluatedAt;
  if (activity.status !== 'LIVE') {
    const status: ReviewedProfileStatus =
      activity.status === 'DEPRECATED_DECLARED' ? 'DEPRECATED' : 'STALE';
    return makeResult(descriptor, evaluatedAt, {
      status,
      activityStatus: activity.status,
      reasonCode: activity.code,
      reason: activity.reason,
      anchorConsistent: true,
      checks: {
        anchor: 'consistent',
        activity: activityCheckValue(activity.status),
        reviewAge: 'fresh',
      },
    });
  }

  return makeResult(descriptor, evaluatedAt, {
    status: 'ACTIVE',
    activityStatus: 'LIVE',
    reasonCode: 'OK',
    reason: activity.reason,
    lastHeartbeatAt: observedAt,
    anchorConsistent: true,
    checks: { anchor: 'consistent', activity: 'live', reviewAge: 'fresh' },
  });
}

/** Convenience wrapper: look up a registry descriptor, then run its heartbeat. */
export function runHeartbeatForProfile(
  profileId: string,
  reader: RpcReader | undefined,
  opts: HeartbeatOptions = {}
): Promise<HeartbeatResult> {
  const descriptor = getReviewedProfile(profileId);
  if (!descriptor) {
    const evaluatedAt = new Date(resolveNow(opts.now)).toISOString();
    return Promise.resolve({
      profileId,
      status: 'UNVERIFIED' as ReviewedProfileStatus,
      activityStatus: 'UNKNOWN' as ProfileActivityStatus,
      reasonCode: 'PROFILE_UNVERIFIED' as ProfileReasonCode,
      reason: `未知 profileId「${profileId}」：registry 未收录`,
      lastHeartbeatAt: null,
      anchorConsistent: 'unknown' as const,
      checks: {
        anchor: 'skipped' as const,
        activity: 'unknown' as const,
        reviewAge: 'fresh' as const,
      },
      evaluatedAt,
    });
  }
  return runHeartbeat(descriptor, reader, opts);
}
