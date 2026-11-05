/**
 * P0-2 evidence-graded enforcement tests.
 * Pure unit tests: no RPC reader, no network, no clock reads. A completed
 * heartbeat is injected as data where the heartbeat-integration behaviour is
 * under test.
 */

import {
  assertProfileEnforcement,
  enforceReviewedProfile,
  type ProfileEnforcement,
} from '../enforcement';
import type { HeartbeatResult } from '../heartbeat';
import { listReviewedProfileIds } from '../registry';

const DRIFT = 'drift-v2-mainnet';
const NON_DRIFT_ACTIVE = 'hyperliquid-perps-mainnet';
const UNKNOWN_ID = 'profile-not-in-registry';

/** A completed, injected heartbeat result (never executed by enforcement). */
function heartbeat(
  profileId: string,
  overrides: Partial<HeartbeatResult> = {}
): HeartbeatResult {
  return {
    profileId,
    status: 'STALE',
    activityStatus: 'FROZEN',
    reasonCode: 'PROFILE_ACTIVITY_FROZEN',
    reason: 'frozen activity observed',
    lastHeartbeatAt: null,
    anchorConsistent: true,
    checks: { anchor: 'consistent', activity: 'frozen', reviewAge: 'fresh' },
    evaluatedAt: '2026-11-05T09:00:00.000Z',
    ...overrides,
  };
}

describe('① Rule 1: only first-hand disproved profiles are hard-BLOCKed by default', () => {
  it('drift-v2-mainnet (STALE/FROZEN + first-hand evidence) -> enforced BLOCK', () => {
    const decision: ProfileEnforcement = enforceReviewedProfile(DRIFT);

    expect(decision.profileId).toBe(DRIFT);
    expect(decision.evidenceLevel).toBe('first-hand');
    expect(decision.status).toBe('STALE');
    expect(decision.enforced).toBe(true);
    expect(decision.verdict).toBe('BLOCK');
    expect(decision.reasonCode).toBe('PROFILE_ACTIVITY_FROZEN');
    expect(decision.strict).toBe(false);
    expect(decision.advisory).toMatch(/一手证伪证据/);
    expect(decision.advisory).toMatch(/强制 BLOCK/);
  });

  it('across the whole registry, the default grading hard-BLOCKs ONLY Drift', () => {
    const enforced = listReviewedProfileIds().filter((id) => enforceReviewedProfile(id).enforced);
    expect(enforced).toEqual([DRIFT]);
  });

  it('Drift stays hard-BLOCKed when a (non-ACTIVE) heartbeat is injected', () => {
    // The first-hand static evidence is decisive; a heartbeat does not undo it.
    const decision = enforceReviewedProfile(DRIFT, { heartbeat: heartbeat(DRIFT) });
    expect(decision.evidenceLevel).toBe('first-hand');
    expect(decision.enforced).toBe(true);
    expect(decision.verdict).toBe('BLOCK');
  });
});

describe('② Rule 2: every other profile is advisory-only (verdict null, verdict unchanged)', () => {
  it('a non-Drift ACTIVE profile -> evidenceLevel none, verdict null, reasonCode OK', () => {
    const decision = enforceReviewedProfile(NON_DRIFT_ACTIVE);

    expect(decision.evidenceLevel).toBe('none');
    expect(decision.status).toBe('ACTIVE');
    expect(decision.enforced).toBe(false);
    expect(decision.verdict).toBeNull();
    expect(decision.reasonCode).toBe('OK');
    expect(decision.strict).toBe(false);
    expect(decision.advisory).toMatch(/仅附 advisory/);
    expect(decision.advisory).toMatch(/不改动 verdict/);
  });

  it('an ACTIVE profile with UNKNOWN activity is still advisory-only', () => {
    // aave-v3-base: status ACTIVE, activityStatus UNKNOWN. No reliable activity
    // signal must NOT be promoted to a hard BLOCK by this layer.
    const decision = enforceReviewedProfile('aave-v3-base');
    expect(decision.status).toBe('ACTIVE');
    expect(decision.enforced).toBe(false);
    expect(decision.verdict).toBeNull();
  });

  it('an unknown profileId (UNVERIFIED) is advisory-only by default', () => {
    const decision = enforceReviewedProfile(UNKNOWN_ID);
    expect(decision.evidenceLevel).toBe('none');
    expect(decision.status).toBe('UNVERIFIED');
    expect(decision.enforced).toBe(false);
    expect(decision.verdict).toBeNull();
    expect(decision.reasonCode).toBe('PROFILE_UNVERIFIED');
    expect(decision.advisory).toMatch(/不改动 verdict/);
  });

  it('a non-ACTIVE injected heartbeat is advisory-only by default (no upgrade to BLOCK)', () => {
    // Even when a heartbeat reports frozen activity, the default grading does
    // NOT hard-BLOCK a profile without first-hand static evidence; strict mode
    // is what turns such detections into BLOCK once infra is ready.
    const decision = enforceReviewedProfile(NON_DRIFT_ACTIVE, {
      heartbeat: heartbeat(NON_DRIFT_ACTIVE),
    });
    expect(decision.status).toBe('STALE');
    expect(decision.reasonCode).toBe('PROFILE_ACTIVITY_FROZEN');
    expect(decision.enforced).toBe(false);
    expect(decision.verdict).toBeNull();
    expect(decision.advisory).toMatch(/仅附 advisory/);
  });

  it('ignores an injected heartbeat belonging to a different profileId', () => {
    const decision = enforceReviewedProfile(NON_DRIFT_ACTIVE, {
      heartbeat: heartbeat(DRIFT),
    });
    expect(decision.status).toBe('ACTIVE');
    expect(decision.reasonCode).toBe('OK');
    expect(decision.verdict).toBeNull();
  });
});

describe('③ Rule 3: strict (default false) BLOCKs every non-ACTIVE profile', () => {
  it('strict defaults to false', () => {
    expect(enforceReviewedProfile(DRIFT).strict).toBe(false);
    expect(enforceReviewedProfile(UNKNOWN_ID).strict).toBe(false);
  });

  it('strict:true BLOCKs an UNVERIFIED profile', () => {
    const decision = enforceReviewedProfile(UNKNOWN_ID, { strict: true });
    expect(decision.strict).toBe(true);
    expect(decision.status).toBe('UNVERIFIED');
    expect(decision.enforced).toBe(true);
    expect(decision.verdict).toBe('BLOCK');
    expect(decision.reasonCode).toBe('PROFILE_UNVERIFIED');
    expect(decision.advisory).toMatch(/所有非 ACTIVE 一律 BLOCK/);
  });

  it('strict:true BLOCKs a non-Drift ACTIVE profile once a heartbeat reports it non-ACTIVE', () => {
    const decision = enforceReviewedProfile(NON_DRIFT_ACTIVE, {
      strict: true,
      heartbeat: heartbeat(NON_DRIFT_ACTIVE),
    });
    expect(decision.status).toBe('STALE');
    expect(decision.enforced).toBe(true);
    expect(decision.verdict).toBe('BLOCK');
  });

  it('strict:true leaves a genuinely ACTIVE profile unblocked', () => {
    const decision = enforceReviewedProfile(NON_DRIFT_ACTIVE, { strict: true });
    expect(decision.status).toBe('ACTIVE');
    expect(decision.enforced).toBe(false);
    expect(decision.verdict).toBeNull();
  });

  it('strict:true still BLOCKs Drift (first-hand evidence)', () => {
    const decision = enforceReviewedProfile(DRIFT, { strict: true });
    expect(decision.evidenceLevel).toBe('first-hand');
    expect(decision.enforced).toBe(true);
    expect(decision.verdict).toBe('BLOCK');
  });
});

describe('④ purity and the assertProfileEnforcement grading contract', () => {
  it('enforceReviewedProfile is pure: same arguments -> identical result', () => {
    const opts = { heartbeat: heartbeat(NON_DRIFT_ACTIVE) };
    expect(enforceReviewedProfile(NON_DRIFT_ACTIVE, opts)).toEqual(
      enforceReviewedProfile(NON_DRIFT_ACTIVE, opts)
    );
  });

  it('assertProfileEnforcement returns the same decision without throwing', () => {
    const ids = [...listReviewedProfileIds(), UNKNOWN_ID];
    for (const id of ids) {
      const plain = enforceReviewedProfile(id);
      expect(assertProfileEnforcement(id)).toEqual(plain);
      const strict = enforceReviewedProfile(id, { strict: true });
      expect(assertProfileEnforcement(id, { strict: true })).toEqual(strict);
    }
  });

  it('grading invariants hold: default BLOCK implies first-hand; strict BLOCK implies non-ACTIVE', () => {
    for (const id of [...listReviewedProfileIds(), UNKNOWN_ID]) {
      const plain = assertProfileEnforcement(id);
      if (plain.enforced) expect(plain.evidenceLevel).toBe('first-hand');
      const strict = assertProfileEnforcement(id, { strict: true });
      if (strict.enforced) expect(strict.status).not.toBe('ACTIVE');
    }
  });
});
