/**
 * P0-2 reviewed-profile registry / heartbeat / guard tests.
 * Pure unit tests: every reader is an injected mock, no network access.
 */

import {
  assertProfileFresh,
  evaluateProfileStatus,
  type ProfileFreshnessDecision,
} from '../guard';
import {
  runHeartbeat,
  type AnchorObservation,
  type HeartbeatOptions,
  type RpcReader,
} from '../heartbeat';
import {
  getReviewedProfile,
  listReviewedProfileIds,
  registerReviewedProfile,
  REVIEWED_PROFILES,
} from '../registry';
import type { ReviewedProfileDescriptor } from '../types';

const NOW = '2026-11-05T09:00:00.000Z';
const FRESH_ACTIVITY = '2026-11-05T08:45:00.000Z';
const FROZEN_ACTIVITY = '2026-04-01T18:31:45Z'; // P0-1: Drift AMM frozen since 2026-04-01

/** An ACTIVE descriptor injected for mechanism tests (NOT the real Drift one). */
const ACTIVE_DESCRIPTOR: ReviewedProfileDescriptor = {
  profileId: 'test-active-swap-profile',
  family: 'swap',
  chainId: 8453,
  reviewedAt: '2026-11-05',
  evidenceRefs: [{ ref: 'src/lib/reviewed/__tests__/reviewed.test.ts', level: 'official' }],
  chainAnchor: {
    pool: '0xTESTPOOL0000000000000000000000000000000',
    bytecodeHash: '0xTESTBYTECODEHASH',
    activitySignal: { kind: 'onchainTimestamp', maxSilenceHours: 24 },
  },
  lastHeartbeatAt: null,
  status: 'ACTIVE',
  activityStatus: 'UNKNOWN',
  notes: 'injected active descriptor for heartbeat mechanism tests',
};

/** Build an observation that matches every registered anchor field. */
function matchingObservation(
  descriptor: ReviewedProfileDescriptor,
  overrides: Partial<AnchorObservation> = {}
): AnchorObservation {
  const a = descriptor.chainAnchor;
  return {
    programId: a.programId,
    pool: a.pool,
    proxy: a.proxy,
    marketAccounts: a.marketAccounts,
    bytecodeHash: a.bytecodeHash,
    paramSlot: a.paramSlot,
    observedAt: NOW,
    activity: {
      status: 'live',
      lastObservedAt: FRESH_ACTIVITY,
      recentTransactions: 12,
    },
    ...overrides,
  };
}

function readerReturning(observation: AnchorObservation | null): RpcReader {
  return { readAnchor: async () => observation };
}

const opts = (extra: HeartbeatOptions = {}): HeartbeatOptions => ({ now: NOW, ...extra });

beforeAll(() => {
  registerReviewedProfile(ACTIVE_DESCRIPTOR);
});

describe('registry', () => {
  it('contains all four families and every descriptor carries provenance', () => {
    const families = new Set(REVIEWED_PROFILES.map((d) => d.family));
    expect(families).toEqual(new Set(['lending', 'swap', 'perp', 'prediction']));
    expect(REVIEWED_PROFILES.length).toBeGreaterThanOrEqual(38);
    for (const d of REVIEWED_PROFILES) {
      expect(d.evidenceRefs.length).toBeGreaterThan(0);
      expect(d.reviewedAt).toBe('2026-11-05');
      expect(d.chainAnchor).toBeDefined();
    }
  });

  it('records the Drift case as parameters-consistent but activity-frozen', () => {
    const drift = getReviewedProfile('drift-v2-mainnet');
    expect(drift).toBeDefined();
    expect(drift?.status).toBe('STALE');
    expect(drift?.activityStatus).toBe('FROZEN');
    expect(drift?.chainAnchor.programId).toBe('dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH');
    expect(drift?.chainAnchor.marketAccounts).toHaveLength(3);
    expect(drift?.chainAnchor.activitySignal?.declaredInactiveAt).toBe('2026-04-01T17:36:27Z');
  });
});

describe('① Drift case: parameters consistent but activity frozen -> non-ACTIVE -> BLOCK', () => {
  it('real drift-v2-mainnet descriptor is STALE/FROZEN and the guard BLOCKs it', async () => {
    // Reader returns perfectly matching anchors + a "live" claim; static STALE
    // short-circuits regardless, so no UNKNOWN-to-ACTIVE promotion is possible.
    const drift = getReviewedProfile('drift-v2-mainnet')!;
    const hb = await runHeartbeat(drift, readerReturning(matchingObservation(drift)), opts());
    expect(hb.status).not.toBe('ACTIVE');
    expect(hb.status).toBe('STALE');
    expect(hb.reasonCode).toBe('PROFILE_STALE');

    const decision = await evaluateProfileStatus(
      'drift-v2-mainnet',
      readerReturning(matchingObservation(drift)),
      opts()
    );
    expect(decision.verdict).toBe('BLOCK');
    expect(decision.fresh).toBe(false);
    expect(decision.failClosed).toBe(true);
  });

  it('an ACTIVE descriptor + frozen activity observation is auto-downgraded by the heartbeat', async () => {
    const observation = matchingObservation(ACTIVE_DESCRIPTOR, {
      activity: { status: 'frozen', lastObservedAt: FROZEN_ACTIVITY },
    });
    const hb = await runHeartbeat(ACTIVE_DESCRIPTOR, readerReturning(observation), opts());
    expect(hb.status).not.toBe('ACTIVE');
    expect(hb.status).toBe('STALE');
    expect(hb.activityStatus).toBe('FROZEN');
    expect(hb.reasonCode).toBe('PROFILE_ACTIVITY_FROZEN');
    expect(hb.anchorConsistent).toBe(true); // parameters matched; ACTIVITY failed

    const decision = await evaluateProfileStatus(
      ACTIVE_DESCRIPTOR.profileId,
      readerReturning(observation),
      opts()
    );
    expect(decision.verdict).toBe('BLOCK');
    expect(decision.reasonCode).toBe('PROFILE_ACTIVITY_FROZEN');
  });

  it('UNKNOWN activity is NEVER promoted to ACTIVE (fail-closed)', async () => {
    const observation = matchingObservation(ACTIVE_DESCRIPTOR, { activity: undefined });
    const hb = await runHeartbeat(ACTIVE_DESCRIPTOR, readerReturning(observation), opts());
    expect(hb.activityStatus).toBe('UNKNOWN');
    expect(hb.status).not.toBe('ACTIVE');
    expect(hb.status).toBe('STALE');
    expect(hb.reasonCode).toBe('PROFILE_ACTIVITY_UNKNOWN');

    const decision = await evaluateProfileStatus(
      ACTIVE_DESCRIPTOR.profileId,
      readerReturning(observation),
      opts()
    );
    expect(decision.verdict).toBe('BLOCK');
  });

  it('official retirement declaration -> DEPRECATED / PROFILE_DEPRECATED', async () => {
    const observation = matchingObservation(ACTIVE_DESCRIPTOR, {
      activity: { declaredInactive: true },
    });
    const hb = await runHeartbeat(ACTIVE_DESCRIPTOR, readerReturning(observation), opts());
    expect(hb.status).toBe('DEPRECATED');
    expect(hb.reasonCode).toBe('PROFILE_DEPRECATED');
    const decision = await evaluateProfileStatus(
      ACTIVE_DESCRIPTOR.profileId,
      readerReturning(observation),
      opts()
    );
    expect(decision.verdict).toBe('BLOCK');
  });
});

describe('② Anchor drift (bytecode / paramSlot changed) -> STALE', () => {
  it('bytecodeHash mismatch -> PROFILE_ANCHOR_MISMATCH', async () => {
    const observation = matchingObservation(ACTIVE_DESCRIPTOR, { bytecodeHash: '0xDRIFTED' });
    const hb = await runHeartbeat(ACTIVE_DESCRIPTOR, readerReturning(observation), opts());
    expect(hb.status).toBe('STALE');
    expect(hb.reasonCode).toBe('PROFILE_ANCHOR_MISMATCH');
    expect(hb.anchorConsistent).toBe(false);
    expect(hb.reason).toContain('bytecodeHash');
  });

  it('paramSlot mismatch -> STALE for the Drift-style parameter slot', async () => {
    const drift = getReviewedProfile('drift-v2-mainnet')!;
    const clone: ReviewedProfileDescriptor = {
      ...drift,
      profileId: 'test-drift-param-drift',
      status: 'ACTIVE',
      activityStatus: 'LIVE',
      chainAnchor: { ...drift.chainAnchor },
    };
    registerReviewedProfile(clone);
    const observation = matchingObservation(clone, { paramSlot: 'marginRatioInitial=999@+1136' });
    const hb = await runHeartbeat(clone, readerReturning(observation), opts());
    expect(hb.status).toBe('STALE');
    expect(hb.reasonCode).toBe('PROFILE_ANCHOR_MISMATCH');
  });

  it('a registered anchor the reader could not observe -> STALE (not ACTIVE)', async () => {
    const observation = matchingObservation(ACTIVE_DESCRIPTOR, {
      activity: { status: 'live', lastObservedAt: FRESH_ACTIVITY },
    });
    delete observation.bytecodeHash;
    const hb = await runHeartbeat(ACTIVE_DESCRIPTOR, readerReturning(observation), opts());
    expect(hb.status).toBe('STALE');
    expect(hb.anchorConsistent).toBe('unknown');
  });
});

describe('③ reader throws / times out / returns null -> fail-closed', () => {
  it('reader throws -> PROFILE_HEARTBEAT_FAILED -> BLOCK', async () => {
    const throwing: RpcReader = {
      readAnchor: async () => {
        throw new Error('rpc boom');
      },
    };
    const hb = await runHeartbeat(ACTIVE_DESCRIPTOR, throwing, opts());
    expect(hb.status).toBe('STALE');
    expect(hb.reasonCode).toBe('PROFILE_HEARTBEAT_FAILED');
    const decision = await evaluateProfileStatus(ACTIVE_DESCRIPTOR.profileId, throwing, opts());
    expect(decision.verdict).toBe('BLOCK');
    expect(decision.failClosed).toBe(true);
  });

  it('reader times out -> PROFILE_HEARTBEAT_FAILED -> BLOCK', async () => {
    const hanging: RpcReader = {
      readAnchor: () => new Promise<AnchorObservation | null>(() => {}),
    };
    const hb = await runHeartbeat(ACTIVE_DESCRIPTOR, hanging, opts({ timeoutMs: 20 }));
    expect(hb.status).toBe('STALE');
    expect(hb.reasonCode).toBe('PROFILE_HEARTBEAT_FAILED');
    expect(hb.error).toContain('timeout');
  });

  it('reader returns null -> PROFILE_HEARTBEAT_FAILED -> BLOCK', async () => {
    const hb = await runHeartbeat(ACTIVE_DESCRIPTOR, readerReturning(null), opts());
    expect(hb.status).toBe('STALE');
    expect(hb.reasonCode).toBe('PROFILE_HEARTBEAT_FAILED');
  });

  it('no reader injected -> PROFILE_HEARTBEAT_FAILED -> BLOCK', async () => {
    const decision = await evaluateProfileStatus(ACTIVE_DESCRIPTOR.profileId, undefined, opts());
    expect(decision.verdict).toBe('BLOCK');
    expect(decision.reasonCode).toBe('PROFILE_HEARTBEAT_FAILED');
    expect(decision.status).toBe('STALE');
  });

  it('expired review -> STALE', async () => {
    const hb = await runHeartbeat(
      ACTIVE_DESCRIPTOR,
      readerReturning(matchingObservation(ACTIVE_DESCRIPTOR)),
      opts({ now: '2027-01-01T00:00:00.000Z', maxReviewAgeDays: 30 })
    );
    expect(hb.status).toBe('STALE');
    expect(hb.checks.reviewAge).toBe('expired');
  });
});

describe('④ ACTIVE: anchor consistent + proven LIVE -> ALLOW', () => {
  it('runHeartbeat returns ACTIVE/LIVE/OK', async () => {
    const hb = await runHeartbeat(
      ACTIVE_DESCRIPTOR,
      readerReturning(matchingObservation(ACTIVE_DESCRIPTOR)),
      opts()
    );
    expect(hb.status).toBe('ACTIVE');
    expect(hb.activityStatus).toBe('LIVE');
    expect(hb.reasonCode).toBe('OK');
    expect(hb.anchorConsistent).toBe(true);
    expect(hb.lastHeartbeatAt).toBe(NOW);
  });

  it('evaluateProfileStatus -> ALLOW, verdict OK', async () => {
    const decision: ProfileFreshnessDecision = await evaluateProfileStatus(
      ACTIVE_DESCRIPTOR.profileId,
      readerReturning(matchingObservation(ACTIVE_DESCRIPTOR)),
      opts()
    );
    expect(decision.verdict).toBe('ALLOW');
    expect(decision.fresh).toBe(true);
    expect(decision.reasonCode).toBe('OK');
    expect(decision.failClosed).toBe(false);
    expect(decision.status).toBe('ACTIVE');
  });

  it('assertProfileFresh is pure: same (opts, heartbeat) -> identical decision', () => {
    const hb = {
      profileId: ACTIVE_DESCRIPTOR.profileId,
      status: 'ACTIVE' as const,
      activityStatus: 'LIVE' as const,
      reasonCode: 'OK' as const,
      reason: 'ok',
      lastHeartbeatAt: NOW,
      anchorConsistent: true as const,
      checks: { anchor: 'consistent' as const, activity: 'live' as const, reviewAge: 'fresh' as const },
      evaluatedAt: NOW,
    };
    const a = assertProfileFresh(ACTIVE_DESCRIPTOR.profileId, { now: NOW, heartbeat: hb });
    const b = assertProfileFresh(ACTIVE_DESCRIPTOR.profileId, { now: NOW, heartbeat: hb });
    expect(a).toEqual(b);
    expect(a.verdict).toBe('ALLOW');
  });
});

describe('⑤ unknown profileId -> UNVERIFIED -> BLOCK', () => {
  const UNKNOWN_ID = 'this-profile-is-not-in-the-registry';

  it('registry has no such id', () => {
    expect(listReviewedProfileIds()).not.toContain(UNKNOWN_ID);
    expect(getReviewedProfile(UNKNOWN_ID)).toBeUndefined();
  });

  it('assertProfileFresh -> UNVERIFIED / PROFILE_UNVERIFIED / BLOCK', () => {
    const decision = assertProfileFresh(UNKNOWN_ID, { now: NOW });
    expect(decision.status).toBe('UNVERIFIED');
    expect(decision.reasonCode).toBe('PROFILE_UNVERIFIED');
    expect(decision.verdict).toBe('BLOCK');
    expect(decision.failClosed).toBe(true);
  });

  it('evaluateProfileStatus -> UNVERIFIED / PROFILE_UNVERIFIED / BLOCK even with a live reader', async () => {
    const decision = await evaluateProfileStatus(
      UNKNOWN_ID,
      readerReturning(matchingObservation(ACTIVE_DESCRIPTOR)),
      opts()
    );
    expect(decision.status).toBe('UNVERIFIED');
    expect(decision.reasonCode).toBe('PROFILE_UNVERIFIED');
    expect(decision.verdict).toBe('BLOCK');
  });
});
