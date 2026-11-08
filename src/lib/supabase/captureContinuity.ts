import type { SupabaseClient } from '@supabase/supabase-js';

export const CAPTURE_SLOT_INTERVAL_MS = 15 * 60 * 1000;
export const CAPTURE_CONTINUITY_WINDOW_SLOTS = 8;
export const CAPTURE_CONTINUITY_MIN_COVERED_SLOTS = 7;

export type CaptureContinuityCheck = 'ok' | 'degraded' | 'unknown';

export type CaptureContinuityDetails = {
  windowMinutes: number;
  expectedSlots: number;
  coveredSlots: number;
  missingSlotMs: number[];
};

export type CaptureContinuity = {
  check: CaptureContinuityCheck;
  details?: CaptureContinuityDetails;
};

/**
 * The readiness endpoint's age check on the latest captured slot can only see
 * the newest slot. A dead capture window that ends before the next check leaves
 * zero pending slots, an empty backlog, and a fresh latest slot, while a run of
 * interior slots was never captured at all. This check compares the receipt
 * ledger against the fixed 15-minute slot grid instead.
 *
 * The window is the 8 grid slots immediately before the newest (in-flight)
 * grid slot, i.e. 15 to 120 minutes old at evaluation time. One missing slot
 * is tolerated: the receipt-gated fallback dispatcher recovers a delayed slot
 * within its own window and backfills the receipt. Two or more consecutive
 * missing receipts mean neither the primary capture nor the fallback produced
 * raw evidence, so the control plane is degraded even though the newest slot
 * looks fresh.
 */
export function expectedRecentSlotMs(nowMs: number): number[] {
  const newestGridSlotMs = Math.floor(nowMs / CAPTURE_SLOT_INTERVAL_MS) * CAPTURE_SLOT_INTERVAL_MS;
  const slots: number[] = [];
  for (let k = 1; k <= CAPTURE_CONTINUITY_WINDOW_SLOTS; k += 1) {
    slots.push(newestGridSlotMs - k * CAPTURE_SLOT_INTERVAL_MS);
  }
  return slots;
}

type ReceiptRow = { snapshot_ts: string | null };

type ReceiptFetch = { error: { message: string } } | { error: null; data: ReceiptRow[] };

/**
 * Reads the Supabase receipt ledger for the recent slot grid. `unknown` is
 * returned on query failure and intentionally does not fail readiness: a
 * broken receipt read is a Supabase-plane symptom that the separate liveness
 * check already reports, while `degraded` is the specific capture/projection
 * continuity verdict this module owns.
 */
export async function readCaptureContinuity(
  client: SupabaseClient,
  nowMs: number
): Promise<CaptureContinuity> {
  const expected = expectedRecentSlotMs(nowMs);
  const oldestExpectedMs = expected[expected.length - 1] ?? nowMs;

  const query = client
    .from('turso_price_slot_receipts')
    .select('snapshot_ts')
    .gte('snapshot_ts', new Date(oldestExpectedMs).toISOString())
    .lte('snapshot_ts', new Date(expected[0]).toISOString());

  const result = (await query) as unknown as ReceiptFetch;
  if (result.error) {
    return { check: 'unknown' };
  }

  const coveredSlotMs = new Set(
    result.data.flatMap((row) => {
      if (!row.snapshot_ts) return [];
      const slotMs = new Date(row.snapshot_ts).getTime();
      if (!Number.isFinite(slotMs)) return [];
      return [Math.floor(slotMs / CAPTURE_SLOT_INTERVAL_MS) * CAPTURE_SLOT_INTERVAL_MS];
    })
  );

  const missingSlotMs = expected.filter((slotMs) => !coveredSlotMs.has(slotMs));
  const coveredSlots = expected.length - missingSlotMs.length;

  return {
    check: coveredSlots >= CAPTURE_CONTINUITY_MIN_COVERED_SLOTS ? 'ok' : 'degraded',
    details: {
      windowMinutes: (CAPTURE_CONTINUITY_WINDOW_SLOTS * CAPTURE_SLOT_INTERVAL_MS) / 60_000,
      expectedSlots: expected.length,
      coveredSlots,
      missingSlotMs,
    },
  };
}
