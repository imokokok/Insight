/**
 * Peg-risk freshness contract.
 *
 * The page, the two read endpoints, and the client poll all sit on this one
 * tier: the server may serve data up to three minutes old (plus the monitor's
 * short in-process cache), and the client refreshes every three minutes.
 *
 * Keeping the TTL here (instead of hardcoding "180" in the page, the API
 * presets, and the client interval separately) is what stops the layers from
 * drifting into a "page 3 min / API 5 min" combination.
 */
export const PEG_SNAPSHOT_TTL_SECONDS = 180;

interface SnapshotWithTimestamp {
  lastUpdated: number;
}

/**
 * The newest `lastUpdated` across a snapshot set, as an ISO string.
 *
 * `lastUpdated` is stamped by the monitor when the snapshot is computed, so
 * this value only moves when the snapshot is actually recomputed. That makes
 * it a reliable cache-hit signal: repeated reads inside the TTL return the
 * same `asOf`, while reads after the TTL return a newer one.
 */
export function newestSnapshotAsOf(snapshots: readonly SnapshotWithTimestamp[]): string {
  let newest = 0;
  for (const snapshot of snapshots) {
    if (snapshot.lastUpdated > newest) newest = snapshot.lastUpdated;
  }
  return new Date(newest > 0 ? newest : Date.now()).toISOString();
}

/**
 * Oldest parseable timestamp among the supplied values.
 *
 * The page renders stablecoins and wrapped assets together, so its freshness
 * label should reflect the staler half rather than hiding it behind the newer
 * one.
 */
export function oldestIsoTimestamp(values: readonly (string | null | undefined)[]): string | null {
  let oldest = Number.POSITIVE_INFINITY;
  for (const value of values) {
    if (!value) continue;
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed) && parsed < oldest) oldest = parsed;
  }
  return Number.isFinite(oldest) ? new Date(oldest).toISOString() : null;
}
