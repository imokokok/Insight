import {
  CAPTURE_CONTINUITY_MIN_COVERED_SLOTS,
  CAPTURE_CONTINUITY_WINDOW_SLOTS,
  CAPTURE_SLOT_INTERVAL_MS,
  expectedRecentSlotMs,
  readCaptureContinuity,
} from '../captureContinuity';

type ChainState = {
  gte: string | null;
  lte: string | null;
};

function makeClient(
  result:
    | { error: null; data: { snapshot_ts: string }[] }
    | { error: { message: string }; data?: never }
) {
  const state: ChainState = { gte: null, lte: null };
  const client = {
    from: (_table: string) => ({
      select: (_columns: string) => ({
        gte: (_column: string, value: string) => {
          state.gte = value;
          return {
            lte: (_lteColumn: string, value2: string) => {
              state.lte = value2;
              return Promise.resolve(result);
            },
          };
        },
      }),
    }),
    __chainState: state,
  };
  return client;
}

const NOW_MS = Date.UTC(2026, 10, 9, 10, 10, 0); // aligned to :10, grid slot 10:00

describe('expectedRecentSlotMs', () => {
  it('returns the 8 grid slots before the newest in-flight slot', () => {
    const slots = expectedRecentSlotMs(NOW_MS);
    expect(slots).toHaveLength(CAPTURE_CONTINUITY_WINDOW_SLOTS);
    expect(slots[0]).toBe(NOW_MS - 25 * 60 * 1000); // 09:45
    expect(slots[slots.length - 1]).toBe(
      NOW_MS - 25 * 60 * 1000 - (CAPTURE_CONTINUITY_WINDOW_SLOTS - 1) * CAPTURE_SLOT_INTERVAL_MS
    ); // 08:00
  });

  it('aligns to the 15-minute grid even for unaligned timestamps', () => {
    const unaligned = NOW_MS + 7 * 1000;
    expect(expectedRecentSlotMs(unaligned)).toEqual(expectedRecentSlotMs(NOW_MS));
  });
});

describe('readCaptureContinuity', () => {
  it('is ok when every expected slot has a receipt', async () => {
    const slots = expectedRecentSlotMs(NOW_MS);
    const client = makeClient({
      error: null,
      data: slots.map((slotMs) => ({ snapshot_ts: new Date(slotMs).toISOString() })),
    });

    const result = await readCaptureContinuity(client as never, NOW_MS);

    expect(result.check).toBe('ok');
    expect(result.details).toMatchObject({
      windowMinutes: 120,
      expectedSlots: 8,
      coveredSlots: 8,
      missingSlotMs: [],
    });
  });

  it('tolerates one missing slot while the fallback dispatcher recovers it', async () => {
    const slots = expectedRecentSlotMs(NOW_MS);
    const client = makeClient({
      error: null,
      data: slots.slice(1).map((slotMs) => ({ snapshot_ts: new Date(slotMs).toISOString() })),
    });

    const result = await readCaptureContinuity(client as never, NOW_MS);

    expect(result.check).toBe('ok');
    expect(result.details?.coveredSlots).toBe(CAPTURE_CONTINUITY_MIN_COVERED_SLOTS);
    expect(result.details?.missingSlotMs).toEqual([slots[0]]);
  });

  it('is degraded when two or more consecutive slots have no receipt', async () => {
    const slots = expectedRecentSlotMs(NOW_MS);
    const client = makeClient({
      error: null,
      data: slots.slice(2).map((slotMs) => ({ snapshot_ts: new Date(slotMs).toISOString() })),
    });

    const result = await readCaptureContinuity(client as never, NOW_MS);

    expect(result.check).toBe('degraded');
    expect(result.details?.coveredSlots).toBe(6);
    expect(result.details?.missingSlotMs).toEqual(slots.slice(0, 2));
  });

  it('is degraded when the receipt ledger is empty for the whole window', async () => {
    const client = makeClient({ error: null, data: [] });

    const result = await readCaptureContinuity(client as never, NOW_MS);

    expect(result.check).toBe('degraded');
    expect(result.details?.coveredSlots).toBe(0);
  });

  it('maps receipts that are slightly off the grid onto the covering slot', async () => {
    const slots = expectedRecentSlotMs(NOW_MS);
    const client = makeClient({
      error: null,
      data: slots.map((slotMs) => ({
        snapshot_ts: new Date(slotMs + 4 * 1000).toISOString(),
      })),
    });

    const result = await readCaptureContinuity(client as never, NOW_MS);

    expect(result.check).toBe('ok');
    expect(result.details?.coveredSlots).toBe(8);
  });

  it('returns unknown on a query error so readiness is not blocked by a broken receipt read', async () => {
    const client = makeClient({ error: { message: 'relation does not exist' } });

    const result = await readCaptureContinuity(client as never, NOW_MS);

    expect(result).toEqual({ check: 'unknown' });
  });

  it('bounds the receipt query to the expected window', async () => {
    const slots = expectedRecentSlotMs(NOW_MS);
    const client = makeClient({
      error: null,
      data: slots.map((slotMs) => ({ snapshot_ts: new Date(slotMs).toISOString() })),
    });

    await readCaptureContinuity(client as never, NOW_MS);

    const state = (client as never as { __chainState: ChainState }).__chainState;
    expect(state.gte).toBe(new Date(slots[slots.length - 1]).toISOString());
    expect(state.lte).toBe(new Date(slots[0]).toISOString());
  });
});
