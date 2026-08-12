import { DatabaseQueries } from '@/lib/supabase/queries';

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Verifies the migration-0025-aware deactivation behaviour directly against a
 * mocked Supabase client. These are the audit-correctness guarantees the
 * reasonability review called out:
 *   - health path writes `health_failed`
 *   - discover path writes `discover_pruned`
 *   - reactivation clears the reason/at and resets the absent counter
 *   - rediscovered feeds reset the absent counter + stamp last_discovery_at
 */
interface MockQueryBuilder {
  update: (payload: Record<string, unknown>) => MockQueryBuilder;
  eq: () => MockQueryBuilder;
  gte: () => MockQueryBuilder;
  order: () => MockQueryBuilder;
  limit: () => MockQueryBuilder;
  select: () => MockQueryBuilder;
  single: () => MockQueryBuilder;
  maybeSingle: () => Promise<{ data: { absent_discovery_runs: number } | null; error: null }>;
  then: (
    resolve: (value: { data: { absent_discovery_runs: number } | null; error: null }) => void
  ) => void;
}

function makeMockClient(readAbsent = 0) {
  const updates: Array<Record<string, unknown>> = [];
  const readData = { absent_discovery_runs: readAbsent };

  const chain: MockQueryBuilder = {
    update(payload) {
      updates.push(payload);
      return chain;
    },
    eq() {
      return chain;
    },
    gte() {
      return chain;
    },
    order() {
      return chain;
    },
    limit() {
      return chain;
    },
    select() {
      return chain;
    },
    single() {
      return chain;
    },
    maybeSingle() {
      return Promise.resolve({ data: readData, error: null });
    },
    then(resolve) {
      resolve({ data: readData, error: null });
    },
  };

  const client = { from: () => chain } as unknown as SupabaseClient;

  return { client, updates };
}

describe('DatabaseQueries — deactivation observability (migration 0025)', () => {
  it('deactivateStaleFeeds stamps reason=health_failed + deactivated_at', async () => {
    const { client, updates } = makeMockClient();
    const q = new DatabaseQueries(client);
    await q.deactivateStaleFeeds(3);

    const payload = updates[0];
    expect(payload.is_active).toBe(false);
    expect(payload.deactivated_reason).toBe('health_failed');
    expect(typeof payload.deactivated_at).toBe('string');
  });

  it('deactivateOracleFeeds stamps reason=discover_pruned + deactivated_at', async () => {
    const { client, updates } = makeMockClient();
    const q = new DatabaseQueries(client);
    await q.deactivateOracleFeeds('api3', 'BTC', 1);

    const payload = updates[0];
    expect(payload.is_active).toBe(false);
    expect(payload.deactivated_reason).toBe('discover_pruned');
    expect(typeof payload.deactivated_at).toBe('string');
  });

  it('reactivateOracleFeed clears reason/at and resets absent counter', async () => {
    const { client, updates } = makeMockClient();
    const q = new DatabaseQueries(client);
    await q.reactivateOracleFeed('api3', 'BTC', 1);

    const payload = updates[0];
    expect(payload.is_active).toBe(true);
    expect(payload.consecutive_failures).toBe(0);
    expect(payload.deactivated_reason).toBeNull();
    expect(payload.deactivated_at).toBeNull();
    expect(payload.absent_discovery_runs).toBe(0);
    expect(typeof payload.last_success_at).toBe('string');
  });

  it('recordFeedDiscovered resets absent counter + stamps last_discovery_at', async () => {
    const { client, updates } = makeMockClient();
    const q = new DatabaseQueries(client);
    await q.recordFeedDiscovered('redstone', 'ETH', 1);

    const payload = updates[0];
    expect(payload.absent_discovery_runs).toBe(0);
    expect(typeof payload.last_discovery_at).toBe('string');
  });

  it('incrementAbsentDiscoveryRuns increments the counter by 1', async () => {
    const { client, updates } = makeMockClient(1);
    const q = new DatabaseQueries(client);
    const next = await q.incrementAbsentDiscoveryRuns('redstone', 'ETH', 1);

    // Mock returns the configured read value; the increment logic is proven by
    // the update payload being previous+1.
    expect(next).toBe(1);
    const incrementPayload = updates.find((u) => 'absent_discovery_runs' in u);
    expect(incrementPayload?.absent_discovery_runs).toBe(2);
  });
});
