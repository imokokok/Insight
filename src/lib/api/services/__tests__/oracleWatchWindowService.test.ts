/**
 * Monitored-window lifecycle tests.
 *
 * The window is pre-paid coverage, so the invariants that matter are the
 * fail-closed ones: a wrong/unknown token is indistinguishable, an exhausted
 * poll budget never issues an unpaid signal, a concurrent-poll race fails
 * closed, and the close summary is rebuilt from audit rows — not from memory.
 */

import { createHash } from 'node:crypto';

import { rateLimitStore } from '@/lib/api/middleware/rateLimitStore';
import { createServiceRoleClient } from '@/lib/supabase/server';

import { recordOracleWatchCheck } from '../oracleWatchAudit';
import { getOracleWatchSignal } from '../oracleWatchService';
import {
  OracleWatchWindowError,
  beginOracleWatchWindow,
  closeOracleWatchWindow,
  pollOracleWatchWindow,
} from '../oracleWatchWindowService';

import type { OracleWatchResult } from '../oracleWatchService';

jest.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: jest.fn() }));
jest.mock('../oracleWatchService', () => ({ getOracleWatchSignal: jest.fn() }));
jest.mock('@/lib/attestations/oracleWatchAttestation', () => ({
  signWatchAttestation: jest.fn().mockResolvedValue(null),
}));
jest.mock('../oracleWatchAudit', () => ({
  recordOracleWatchCheck: jest.fn().mockResolvedValue(undefined),
}));

const mockCreateClient = createServiceRoleClient as jest.MockedFunction<
  typeof createServiceRoleClient
>;
const mockGetSignal = getOracleWatchSignal as jest.MockedFunction<typeof getOracleWatchSignal>;
const mockRecordCheck = recordOracleWatchCheck as jest.MockedFunction<
  typeof recordOracleWatchCheck
>;

function signal(overrides: Partial<OracleWatchResult> = {}): OracleWatchResult {
  return {
    symbol: 'ETH',
    chain: 'arbitrum',
    verdict: 'normal',
    recommendation: 'proceed',
    maxDeviationPct: 0.2,
    agreement: 0.998,
    participantCount: 5,
    outlierCount: 0,
    staleCount: 0,
    consensusPrice: 2410.5,
    reason: 'all_gates_passed',
    mlRiskScore: 0.05,
    mlScore1h: 0.05,
    mlScore6h: 0.04,
    mlRiskLevel: 'low',
    avgReputation: 90,
    minReputation: 85,
    quorumSatisfied: true,
    requiredParticipantCount: 3,
    reasonCodes: [],
    sourceGroupCount: 3,
    requiredSourceGroupCount: 2,
    independenceSatisfied: true,
    trustScore: 96,
    trustLevel: 'high',
    trustComponents: {
      quorum: 1,
      agreement: 1,
      deviation: 1,
      ml: 0.95,
      reputation: 0.9,
      cleanliness: 1,
    },
    providers: [],
    evaluatedAt: '2026-11-03T12:00:00.000Z',
    ...overrides,
  };
}

/**
 * A Supabase query-builder stub: chainable methods return the builder,
 * `single`/`maybeSingle` resolve a `{ data, error }` response, and awaiting
 * the bare builder (fire-and-forget update in close) resolves the same shape.
 */
function builder(config: {
  value?: unknown;
  count?: number;
  dbError?: { message: string } | null;
  onMethod?: (method: string, args: unknown[]) => void;
}) {
  const response = () => ({
    data: config.value ?? null,
    count: config.count ?? null,
    error: config.dbError ?? null,
  });
  const b: Record<string, unknown> = {
    insert: (...args: unknown[]) => (config.onMethod?.('insert', args), b),
    select: (...args: unknown[]) => (config.onMethod?.('select', args), b),
    update: (...args: unknown[]) => (config.onMethod?.('update', args), b),
    eq: (...args: unknown[]) => (config.onMethod?.('eq', args), b),
    lt: (...args: unknown[]) => (config.onMethod?.('lt', args), b),
    gt: (...args: unknown[]) => (config.onMethod?.('gt', args), b),
    order: (...args: unknown[]) => (config.onMethod?.('order', args), b),
    single: () => Promise.resolve(response()),
    maybeSingle: () => Promise.resolve(response()),
    then: (
      resolve: (value: {
        data: unknown;
        count: number | null;
        error: { message: string } | null;
      }) => unknown,
      reject: (reason?: unknown) => unknown
    ) => Promise.resolve(response()).then(resolve, reject),
  };
  return b;
}

/** Queue of `client.from(table)` results, consumed left to right. */
function queueFrom(handlers: Array<Record<string, unknown>>): jest.Mock {
  const from = jest.fn(() => handlers.shift());
  mockCreateClient.mockReturnValue({ from } as unknown as ReturnType<
    typeof createServiceRoleClient
  >);
  return from;
}

const RAW_TOKEN = 'a'.repeat(64);
const ROW = {
  id: '11111111-1111-4111-8111-111111111111',
  symbol: 'ETH',
  chain: 'arbitrum',
  status: 'active' as const,
  payment_method: 'credits' as const,
  token_hash: createHash('sha256').update(RAW_TOKEN, 'utf8').digest('hex'),
  created_at: '2026-11-03T00:00:00.000Z',
  expires_at: '2026-11-04T00:00:00.000Z',
  closed_at: null,
  poll_count: 0,
};

beforeEach(() => {
  mockCreateClient.mockReset();
  mockGetSignal.mockReset().mockResolvedValue(signal());
  mockRecordCheck.mockReset().mockResolvedValue(undefined);
  rateLimitStore.clear?.();
  jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-03T06:00:00.000Z'));
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('beginOracleWatchWindow', () => {
  it('maps the DB concurrency trigger onto a ProductLimitError', async () => {
    queueFrom([
      builder({ count: 0 }),
      builder({
        dbError: { message: 'product_concurrency_limit: open_windows limit 5 reached' },
      }),
    ]);

    await expect(
      beginOracleWatchWindow({
        symbol: 'ETH',
        chain: 'arbitrum',
        paymentMethod: 'credits',
        apiKeyId: 'key-1',
      })
    ).rejects.toMatchObject({
      name: 'ProductLimitError',
      scope: 'open_windows',
      limit: 5,
      retryAfterBasis: 'recheck',
    });
  });

  it('persists only the token hash and returns the raw token exactly once', async () => {
    let captured: Record<string, unknown> | null = null;
    queueFrom([
      builder({ count: 0 }), // open windows for this key
      builder({
        value: { ...ROW, token_hash: 'stored-hash' },
        onMethod: (method, args) => {
          if (method === 'insert') captured = args[0] as Record<string, unknown>;
        },
      }),
    ]);

    const result = await beginOracleWatchWindow({
      symbol: 'ETH',
      chain: 'arbitrum',
      paymentMethod: 'credits',
      apiKeyId: 'key-1',
    });

    expect(captured).toMatchObject({
      symbol: 'ETH',
      chain: 'arbitrum',
      status: 'active',
      payment_method: 'credits',
      api_key_id: 'key-1',
    });
    if (!captured) throw new Error('insert payload was not captured');
    const storedHash = captured.token_hash as string;
    // The stored hash must verify exactly the way pollOracleWatchWindow will:
    // strip the cosmetic oww_ prefix, then sha256.
    const presented = result.windowToken.replace(/^oww_/, '');
    expect(storedHash).toBe(createHash('sha256').update(presented, 'utf8').digest('hex'));
    expect(result.windowToken.startsWith('oww_')).toBe(true);
    expect(result.windowToken).not.toContain(storedHash);
    // 24h window ending at 2026-11-04T06:00Z, persisted and echoed from the row.
    expect(captured.expires_at).toBe('2026-11-04T06:00:00.000Z');
    expect(result.window.expiresAt).toBe(ROW.expires_at);
    expect(result.window.status).toBe('active');
  });

  it('throws when the window row cannot be persisted', async () => {
    queueFrom([builder({ dbError: { message: 'insert failed' } })]);

    await expect(beginOracleWatchWindow({ symbol: 'ETH', paymentMethod: 'x402' })).rejects.toThrow(
      'Monitored window persistence failed'
    );
  });
});

describe('pollOracleWatchWindow', () => {
  it('issues the signal, records the audit row under the window, and reports usage', async () => {
    const updateCalls: Array<[string, unknown[]]> = [];
    queueFrom([
      builder({ value: ROW }), // load
      builder({
        value: { poll_count: 1 },
        onMethod: (method, args) => updateCalls.push([method, args]),
      }), // accounting
    ]);

    const result = await pollOracleWatchWindow(ROW.id, `oww_${RAW_TOKEN}`);

    expect(result.signal.verdict).toBe('normal');
    expect(result.window.pollCount).toBe(1);
    expect(result.window.pollCap).toBe(300);
    expect(mockGetSignal).toHaveBeenCalledWith('ETH', 'arbitrum');
    expect(mockRecordCheck).toHaveBeenCalledTimes(1);
    expect(mockRecordCheck.mock.calls[0][2]).toMatchObject({
      source: 'rest',
      windowId: ROW.id,
    });
    // The budget bump is conditional on poll_count < cap.
    const lt = updateCalls.find(([method]) => method === 'lt');
    expect(lt?.[1]).toEqual(['poll_count', 300]);
  });

  it('treats a malformed token as invalid without touching the database', async () => {
    const from = queueFrom([]);
    await expect(pollOracleWatchWindow(ROW.id, 'not-a-token')).rejects.toMatchObject({
      code: 'INVALID_TOKEN',
    });
    expect(from).not.toHaveBeenCalled();
  });

  it('answers a wrong token and an unknown windowId identically', async () => {
    queueFrom([builder({ value: ROW })]);
    await expect(pollOracleWatchWindow(ROW.id, `oww_${'b'.repeat(64)}`)).rejects.toMatchObject({
      code: 'INVALID_TOKEN',
    });

    queueFrom([builder({ value: null })]);
    await expect(
      pollOracleWatchWindow('22222222-2222-4222-8222-222222222222', `oww_${RAW_TOKEN}`)
    ).rejects.toMatchObject({ code: 'INVALID_TOKEN' });
  });

  it.each([
    ['WINDOW_CLOSED', { ...ROW, status: 'closed' as const, closed_at: '2026-11-03T01:00:00.000Z' }],
    ['WINDOW_EXPIRED', { ...ROW, expires_at: '2026-11-03T00:00:00.000Z' }],
  ])('refuses a %s window', async (code, row) => {
    queueFrom([builder({ value: row })]);
    await expect(pollOracleWatchWindow(ROW.id, `oww_${RAW_TOKEN}`)).rejects.toMatchObject({ code });
  });

  it('refuses to poll once the poll budget is exhausted', async () => {
    queueFrom([builder({ value: { ...ROW, poll_count: 300 } })]);
    await expect(pollOracleWatchWindow(ROW.id, `oww_${RAW_TOKEN}`)).rejects.toMatchObject({
      code: 'POLL_CAP_REACHED',
    });
    expect(mockGetSignal).not.toHaveBeenCalled();
  });

  it('enforces the minimum poll interval with a retry hint', async () => {
    // Date.now() is 06:00:00Z; the last poll was 10s ago.
    queueFrom([
      builder({
        value: { ...ROW, poll_count: 5, last_poll_at: '2026-11-03T05:59:50.000Z' },
      }),
    ]);
    await expect(pollOracleWatchWindow(ROW.id, `oww_${RAW_TOKEN}`)).rejects.toMatchObject({
      code: 'POLL_TOO_SOON',
      retryAfterSeconds: 20,
    });
  });

  it('fails closed when a concurrent poll consumes the last budget slot', async () => {
    queueFrom([
      builder({ value: { ...ROW, poll_count: 299 } }), // load: one slot left
      builder({ value: null }), // conditional update matched nothing
    ]);
    await expect(pollOracleWatchWindow(ROW.id, `oww_${RAW_TOKEN}`)).rejects.toMatchObject({
      code: 'POLL_CAP_REACHED',
    });
    expect(mockGetSignal).not.toHaveBeenCalled();
    expect(mockRecordCheck).not.toHaveBeenCalled();
  });
});

describe('closeOracleWatchWindow', () => {
  it('closes the window and rebuilds the summary from audit rows', async () => {
    const checks = [
      { verdict: 'normal', recommendation: 'proceed', created_at: '2026-11-03T06:05:00.000Z' },
      {
        verdict: 'caution',
        recommendation: 'proceed_with_caution',
        created_at: '2026-11-03T07:05:00.000Z',
      },
      { verdict: 'danger', recommendation: 'halt', created_at: '2026-11-03T08:05:00.000Z' },
      { verdict: 'danger', recommendation: 'halt', created_at: '2026-11-03T09:05:00.000Z' },
    ];
    const methods: Array<[string, unknown[]]> = [];
    queueFrom([
      builder({ value: ROW, onMethod: (m, a) => methods.push([m, a]) }), // load
      builder({ onMethod: (m, a) => methods.push([m, a]) }), // close update
      builder({ value: checks, onMethod: (m, a) => methods.push([m, a]) }), // summary query
    ]);

    const summary = await closeOracleWatchWindow(ROW.id, `oww_${RAW_TOKEN}`);

    expect(summary).toMatchObject({
      windowId: ROW.id,
      status: 'closed',
      expired: false,
      pollsIssued: 4,
      haltCount: 2,
      firstHaltAt: '2026-11-03T08:05:00.000Z',
      lastHaltAt: '2026-11-03T09:05:00.000Z',
      verdictCounts: { normal: 1, caution: 1, danger: 2 },
      recommendationCounts: { proceed: 1, proceed_with_caution: 1, halt: 2 },
    });
    expect(summary.closedAt).toBe('2026-11-03T06:00:00.000Z');
    // The summary query is scoped to the window and ordered oldest-first.
    const orderCall = methods.find(([m]) => m === 'order');
    expect(orderCall?.[1]).toEqual(['created_at', { ascending: true }]);
  });

  it('is idempotent on an already-closed window and never re-closes it', async () => {
    const closedRow = {
      ...ROW,
      status: 'closed' as const,
      closed_at: '2026-11-03T01:00:00.000Z',
    };
    const methods: Array<[string, unknown[]]> = [];
    queueFrom([
      builder({ value: closedRow, onMethod: (m, a) => methods.push([m, a]) }),
      builder({ value: [], onMethod: (m, a) => methods.push([m, a]) }),
    ]);

    const summary = await closeOracleWatchWindow(ROW.id, `oww_${RAW_TOKEN}`);

    expect(summary.closedAt).toBe('2026-11-03T01:00:00.000Z');
    expect(summary.pollsIssued).toBe(0);
    // Only the load + summary reads ran; no second close update.
    expect(methods.filter(([m]) => m === 'update')).toHaveLength(0);
  });

  it('marks an expired window as expired in its summary', async () => {
    queueFrom([
      builder({ value: { ...ROW, expires_at: '2026-11-03T00:00:00.000Z' } }),
      builder({}),
      builder({ value: [] }),
    ]);

    const summary = await closeOracleWatchWindow(ROW.id, `oww_${RAW_TOKEN}`);
    expect(summary.expired).toBe(true);
  });

  it('throws a generic failure when the close update fails', async () => {
    queueFrom([builder({ value: ROW }), builder({ dbError: { message: 'update failed' } })]);

    await expect(closeOracleWatchWindow(ROW.id, `oww_${RAW_TOKEN}`)).rejects.toThrow(
      'Monitored window close failed'
    );
  });

  it('accepts the lifecycle token for its embedded window', async () => {
    queueFrom([builder({ value: ROW }), builder({}), builder({ value: [] })]);

    // A lifecycle bundles this window and hands out one `plc_` token for it.
    const summary = await closeOracleWatchWindow(ROW.id, `plc_${RAW_TOKEN}`);

    expect(summary.status).toBe('closed');
  });

  it('rejects an invalid token', async () => {
    queueFrom([builder({ value: ROW })]);
    await expect(closeOracleWatchWindow(ROW.id, 'garbage')).rejects.toBeInstanceOf(
      OracleWatchWindowError
    );
  });
});
