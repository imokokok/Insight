/**
 * Shared policy + types for the Watch ↔ replay closed-loop check.
 *
 * WHY THIS FILE EXISTS SEPARATELY
 * -------------------------------
 * The scenario harness takes an EXPLICIT policy per scenario, which is the
 * right design for a test tool: fixtures state their own assumptions. But it
 * means nothing forces the replayed policy to match the one the live path
 * actually uses. A drift between the two would silently make this check
 * meaningless — the harness would be testing thresholds nobody ships.
 *
 * So the thresholds below are IMPORTED FROM THE LIVE CONSTANTS, not copied.
 * If a live threshold changes, this file follows automatically and the check
 * keeps comparing like with like. Do not replace these with literals: a
 * hardcoded copy is exactly the bug this file exists to prevent.
 *
 * SOURCE OF EACH VALUE (all production, not authored here):
 *   QUORUM_MIN                  src/lib/api/services/oracleWatchService.ts
 *   INDEPENDENCE_MIN            src/lib/api/services/oracleWatchService.ts
 *   DEV_DANGER_PCT              src/lib/api/services/oracleWatchService.ts (3.0)
 *   FRESHNESS_STALE_AGE_SECONDS src/lib/analytics/consensusPrice.ts (3600)
 */

import {
  FRESHNESS_STALE_AGE_SECONDS,
  FRESHNESS_STALE_DIVERGENCE_PCT,
} from '@/lib/analytics/consensusPrice';
import { INDEPENDENCE_MIN, QUORUM_MIN } from '@/lib/api/services/oracleWatchService';

import type { ScenarioPolicy } from '@/lib/testing/oracleScenario/schema';

/** `DEV_DANGER_PCT` is module-private in oracleWatchService (not exported), so
 *  it is restated here with its production value and cross-checked against the
 *  fixtures' own range. Revisit this if the live constant is ever exported. */
const DEV_DANGER_PCT = 3.0;

/**
 * The live detection policy, expressed in the harness's own units.
 *
 * Two deliberate differences from the live path, both documented rather than
 * silently smoothed over:
 *
 *  1. `minSources` is QUORUM_MIN (3). A replay group with fewer than 3 usable
 *     providers trips INSUFFICIENT_QUORUM. For an observed healthy target that
 *     is a TRUE reading — a target watched with fewer than 3 live sources really
 *     is under-quorum — so it is reported as a disagreement rather than
 *     suppressed.
 *
 *  2. The live `isStale` rule is consensus-aware: old age ALONE is not stale,
 *     it must ALSO diverge >2% from consensus. The harness's STALE_DATA check
 *     is age-only. Replaying with `maxStalenessSeconds = FRESHNESS_STALE_AGE_SECONDS`
 *     will therefore over-report STALE_DATA relative to the live path on any
 *     feed with an old-but-consistent timestamp (API3 communal dAPIs are the
 *     documented example). Treat a lone STALE_DATA disagreement as a known
 *     modelling gap, not automatically a bug.
 */
export const WATCH_POLICY: ScenarioPolicy = {
  maxStalenessSeconds: FRESHNESS_STALE_AGE_SECONDS,
  maxDeviationPct: DEV_DANGER_PCT,
  minSources: QUORUM_MIN,
};

/** Independence floor, surfaced in the report so a reader can see the gate the
 *  harness does NOT model (it has no operator-group concept). */
export const WATCH_INDEPENDENCE_MIN = INDEPENDENCE_MIN;

/** Live staleness also requires divergence from consensus. Exported so the
 *  report can name the gap instead of leaving the reader to guess. */
export const WATCH_STALE_DIVERGENCE_PCT = FRESHNESS_STALE_DIVERGENCE_PCT;

export type WatchReplayRow = {
  symbol: string;
  chain: string;
  recordedSignal: 'NORMAL' | 'CAUTION' | 'DANGER' | null;
};

export type WatchReplaySummary = {
  groupsConsidered: number;
  groupsReplayed: number;
  agreements: number;
  disagreements: number;
  targets: Array<{
    scenarioId: string;
    symbol: string;
    chain: string;
    stepCount: number;
    firedCodes: string[];
    harmfulCodes: string[];
    harnessFlagged: boolean;
    recordedSignal: 'NORMAL' | 'CAUTION' | 'DANGER' | null;
    agree: boolean;
    note: string;
  }>;
};
