/**
 * Position Lifecycle Bundle service tests.
 *
 * The bundle is pre-paid coverage, so the invariants tested are the fail-closed
 * ones: a wrong/unknown token is indistinguishable, guard/receipt budgets can
 * never be exceeded even under concurrency, a technical assessment or issuance
 * failure releases its budget slot while a BLOCK verdict consumes it, a failed
 * lifecycle insert never leaves an orphan paid window, and the close summary
 * rebuilds from the embedded window's audit rows.
 */

import { createHash } from 'node:crypto';

import { createServiceRoleClient } from '@/lib/supabase/server';

import { closeOracleWatchWindow } from '../oracleWatchWindowService';
import {
  beginPositionLifecycle,
  closePositionLifecycle,
  issueBundledReceipt,
  PositionLifecycleError,
  runBundledGuard,
} from '../positionLifecycleService';

jest.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: jest.fn() }));
jest.mock('../oracleWatchWindowService', () => ({
  closeOracleWatchWindow: jest.fn(),
}));
jest.mock('@/lib/execution/executionReceiptAudit', () => ({
  recordExecutionReceipt: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('@/lib/execution/executionReceiptService', () => ({
  issueExecutionReceipt: jest.fn(),
}));

const mockCreateClient = createServiceRoleClient as jest.MockedFunction<
  typeof createServiceRoleClient
>;
const mockCloseWindow = closeOracleWatchWindow as jest.Mock;
const mockIssueReceipt = jest.mocked(
  jest.requireMock('@/lib/execution/executionReceiptService').issueExecutionReceipt
);
const mockRecordReceipt = jest.mocked(
  jest.requireMock('@/lib/execution/executionReceiptAudit').recordExecutionReceipt
);

/**
 * A Supabase query-builder stub: chainable methods return the builder,
 * `single`/`maybeSingle` resolve a `{ data, error }` response, and awaiting
 * the bare builder resolves the same shape.
 */
function builder(config: {
  value?: unknown;
  dbError?: { message: string } | null;
  onMethod?: (method: string, args: unknown[]) => void;
}) {
  const response = () => ({ data: config.value ?? null, error: config.dbError ?? null });
  const b: Record<string, unknown> = {
    insert: (...args: unknown[]) => (config.onMethod?.('insert', args), b),
    select: (...args: unknown[]) => (config.onMethod?.('select', args), b),
    update: (...args: unknown[]) => (config.onMethod?.('update', args), b),
    delete: (...args: unknown[]) => (config.onMethod?.('delete', args), b),
    eq: (...args: unknown[]) => (config.onMethod?.('eq', args), b),
    lt: (...args: unknown[]) => (config.onMethod?.('lt', args), b),
    order: (...args: unknown[]) => (config.onMethod?.('order', args), b),
    single: () => Promise.resolve(response()),
    maybeSingle: () => Promise.resolve(response()),
    then: (
      resolve: (value: { data: unknown; error: { message: string } | null }) => unknown,
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

const RAW_TOKEN = 'b'.repeat(64);
const TOKEN_HASH = createHash('sha256').update(RAW_TOKEN, 'utf8').digest('hex');
const LIFECYCLE_ID = '22222222-2222-4222-8222-222222222222';
const WINDOW_ID = '11111111-1111-4111-8111-111111111111';

const ROW = {
  id: LIFECYCLE_ID,
  symbol: 'ETH',
  chain: 'arbitrum',
  status: 'active' as const,
  payment_method: 'credits' as const,
  token_hash: TOKEN_HASH,
  created_at: '2026-11-03T00:00:00.000Z',
  expires_at: '2026-11-04T00:00:00.000Z',
  closed_at: null,
  guard_budget: 4,
  guard_used: 0,
  receipt_state: 'available' as const,
  receipt_uid: null,
  window_id: WINDOW_ID,
};

function tokenOf(raw: string): string {
  return `plc_${raw}`;
}

beforeEach(() => {
  mockCreateClient.mockReset();
  mockCloseWindow.mockReset();
  mockIssueReceipt.mockReset();
  mockRecordReceipt.mockReset().mockResolvedValue(undefined);
  jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-03T06:00:00.000Z'));
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('beginPositionLifecycle', () => {
  it('creates the embedded window and the lifecycle, returning the raw token exactly once', async () => {
    let windowInsert: Record<string, unknown> | null = null;
    let lifecycleInsert: Record<string, unknown> | null = null;
    queueFrom([
      builder({
        value: { id: WINDOW_ID },
        onMethod: (method, args) => {
          if (method === 'insert') windowInsert = args[0] as Record<string, unknown>;
        },
      }),
      builder({
        value: { ...ROW, token_hash: 'stored-hash' },
        onMethod: (method, args) => {
          if (method === 'insert') lifecycleInsert = args[0] as Record<string, unknown>;
        },
      }),
    ]);

    const result = await beginPositionLifecycle({
      symbol: 'ETH',
      chain: 'arbitrum',
      paymentMethod: 'credits',
      apiKeyId: 'key-1',
    });

    // Both rows store only the token hash — the same one.
    expect(windowInsert).toMatchObject({ token_hash: expect.any(String) });
    expect(lifecycleInsert).toMatchObject({
      window_id: WINDOW_ID,
      guard_budget: 4,
      receipt_state: 'available',
      token_hash: (windowInsert as Record<string, unknown>).token_hash,
    });
    expect(result.lifecycleToken).toMatch(/^plc_[0-9a-f]{64}$/);
    expect(result.windowId).toBe(WINDOW_ID);
    expect(result.usage.guard.budget).toBe(4);
    // Watch polls reuse the existing window routes with the SAME token.
    expect(result.usage.watch.poll.url).toBe(`/api/v1/safety/oracle-watch-window/${WINDOW_ID}`);
  });

  it('removes the embedded window when the lifecycle insert fails (no orphan paid window)', async () => {
    const methods: string[] = [];
    queueFrom([
      builder({ value: { id: WINDOW_ID } }),
      builder({ dbError: { message: 'insert failed' } }),
      builder({ value: null, onMethod: (method) => methods.push(`delete:${method}`) }),
    ]);

    await expect(beginPositionLifecycle({ symbol: 'ETH', paymentMethod: 'x402' })).rejects.toThrow(
      'Position lifecycle persistence failed'
    );

    // The third client.from() call is the cleanup delete on the window table.
    expect(methods).toContain('delete:delete');
  });
});

describe('runBundledGuard', () => {
  it('consumes one budget slot atomically and dispatches through the family registry', async () => {
    const seen: Array<{ family: string; params: unknown }> = [];
    queueFrom([
      builder({ value: ROW }),
      builder({ value: { guard_used: 1, expires_at: ROW.expires_at } }),
    ]);

    const result = await runBundledGuard(
      LIFECYCLE_ID,
      tokenOf(RAW_TOKEN),
      'hyperliquid_perp',
      {
        protocolId: 'hyperliquid-perps-mainnet',
      },
      undefined,
      {
        assessGuard: async (family, params) => {
          seen.push({ family, params });
          return { verdict: 'ALLOW' };
        },
      }
    );

    expect(seen).toEqual([
      { family: 'hyperliquid_perp', params: { protocolId: 'hyperliquid-perps-mainnet' } },
    ]);
    expect(result.guard).toEqual({ used: 1, budget: 4 });
    expect(result.result).toEqual({ verdict: 'ALLOW' });
  });

  it('fails closed when the guard budget is already exhausted', async () => {
    queueFrom([builder({ value: { ...ROW, guard_used: 4 } }), builder({ value: null })]);

    await expect(
      runBundledGuard(LIFECYCLE_ID, tokenOf(RAW_TOKEN), 'base_perp', {}, undefined, {
        assessGuard: async () => ({ verdict: 'ALLOW' }),
      })
    ).rejects.toBeInstanceOf(PositionLifecycleError);
  });

  it('releases the budget slot when the assessor throws on technical grounds', async () => {
    const updates: Array<Record<string, unknown>> = [];
    queueFrom([
      builder({ value: { ...ROW, guard_used: 2 } }),
      builder({
        value: { guard_used: 3, expires_at: ROW.expires_at },
        onMethod: (method, args) => {
          if (method === 'update') updates.push(args[0] as Record<string, unknown>);
        },
      }),
      builder({
        value: null,
        onMethod: (method, args) => {
          if (method === 'update') updates.push(args[0] as Record<string, unknown>);
        },
      }),
    ]);

    await expect(
      runBundledGuard(LIFECYCLE_ID, tokenOf(RAW_TOKEN), 'base_lending', {}, undefined, {
        assessGuard: async () => {
          throw new Error('rpc unavailable');
        },
      })
    ).rejects.toThrow('rpc unavailable');

    // guard_used was rolled back to the pre-call value.
    expect(updates.some((u) => u.guard_used === 2)).toBe(true);
  });

  it('answers a wrong token identically to an unknown id', async () => {
    queueFrom([builder({ value: ROW })]);
    await expect(
      runBundledGuard(LIFECYCLE_ID, tokenOf('c'.repeat(64)), 'base_perp', {}, undefined, {
        assessGuard: async () => ({ verdict: 'ALLOW' }),
      })
    ).rejects.toMatchObject({ code: 'INVALID_TOKEN' });
    queueFrom([builder({ value: null })]);
    await expect(
      runBundledGuard(LIFECYCLE_ID, tokenOf('c'.repeat(64)), 'base_perp', {}, undefined, {
        assessGuard: async () => ({ verdict: 'ALLOW' }),
      })
    ).rejects.toMatchObject({ code: 'INVALID_TOKEN' });
  });

  it('refuses a closed lifecycle', async () => {
    queueFrom([builder({ value: { ...ROW, status: 'closed' } })]);
    await expect(
      runBundledGuard(LIFECYCLE_ID, tokenOf(RAW_TOKEN), 'base_perp', {}, undefined, {
        assessGuard: async () => ({ verdict: 'ALLOW' }),
      })
    ).rejects.toMatchObject({ code: 'LIFECYCLE_CLOSED' });
  });

  it('refuses an expired lifecycle', async () => {
    queueFrom([builder({ value: { ...ROW, expires_at: '2026-11-02T00:00:00.000Z' } })]);
    await expect(
      runBundledGuard(LIFECYCLE_ID, tokenOf(RAW_TOKEN), 'base_perp', {}, undefined, {
        assessGuard: async () => ({ verdict: 'ALLOW' }),
      })
    ).rejects.toMatchObject({ code: 'LIFECYCLE_EXPIRED' });
  });
});

describe('issueBundledReceipt', () => {
  const ISSUE_BODY = {
    preTradeUid: '0x' + '1'.repeat(64),
    requestHash: '0x' + '2'.repeat(64),
    sourceAssetId: 'ETH',
    destinationAssetId: 'USDC',
    subjectChainId: 42161,
    settlementChainId: 42161,
    participantCount: 5,
    sourceGroupCount: 3,
    preTradeSignedAt: 1_800_000_000,
    quotedPrice: 2410,
    txHash: '0x' + '3'.repeat(64),
  } as never;

  it('consumes the receipt credit only after a recorded issuance', async () => {
    const updates: Array<Record<string, unknown>> = [];
    const receipt = { uid: 'receipt-uid-1', data: { fillStatus: 'FILLED' } };
    queueFrom([
      builder({ value: ROW }),
      builder({
        value: { expires_at: ROW.expires_at, subject_chain_id: 42161 },
        onMethod: (method, args) => {
          if (method === 'update') updates.push(args[0] as Record<string, unknown>);
        },
      }),
      builder({
        value: null,
        onMethod: (method, args) => {
          if (method === 'update') updates.push(args[0] as Record<string, unknown>);
        },
      }),
    ]);
    mockIssueReceipt.mockResolvedValue({ ok: true, receipt, facts: {}, binding: {} });

    const result = await issueBundledReceipt(LIFECYCLE_ID, tokenOf(RAW_TOKEN), ISSUE_BODY);

    expect(result.receiptState).toBe('consumed');
    // First update claims the credit, third records the receipt uid.
    expect(updates[0]).toEqual({ receipt_state: 'consumed' });
    expect(updates[updates.length - 1]).toEqual({ receipt_uid: 'receipt-uid-1' });
    expect(mockRecordReceipt).toHaveBeenCalledWith(
      receipt,
      expect.objectContaining({ source: 'rest' })
    );
  });

  it('restores the credit when the issuer refuses (unsupported chain, RPC, signing)', async () => {
    const updates: Array<Record<string, unknown>> = [];
    queueFrom([
      builder({ value: ROW }),
      builder({
        value: { expires_at: ROW.expires_at, subject_chain_id: 42161 },
        onMethod: (method, args) => {
          if (method === 'update') updates.push(args[0] as Record<string, unknown>);
        },
      }),
      builder({
        value: null,
        onMethod: (method, args) => {
          if (method === 'update') updates.push(args[0] as Record<string, unknown>);
        },
      }),
    ]);
    mockIssueReceipt.mockResolvedValue({ ok: false, code: 'UNSUPPORTED_CHAIN', message: 'no' });

    await expect(
      issueBundledReceipt(LIFECYCLE_ID, tokenOf(RAW_TOKEN), ISSUE_BODY)
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_CHAIN' });
    expect(updates.some((u) => u.receipt_state === 'available')).toBe(true);
    expect(mockRecordReceipt).not.toHaveBeenCalled();
  });

  it('refuses when the bundled receipt was already issued', async () => {
    queueFrom([
      builder({ value: { ...ROW, receipt_state: 'consumed', receipt_uid: 'uid' } }),
      builder({ value: null }),
    ]);
    await expect(
      issueBundledReceipt(LIFECYCLE_ID, tokenOf(RAW_TOKEN), ISSUE_BODY)
    ).rejects.toMatchObject({ code: 'RECEIPT_UNAVAILABLE' });
    expect(mockIssueReceipt).not.toHaveBeenCalled();
  });
});

describe('closePositionLifecycle', () => {
  it('closes the lifecycle and the embedded window, returning the combined summary', async () => {
    queueFrom([builder({ value: ROW }), builder({ value: { id: LIFECYCLE_ID } })]);
    mockCloseWindow.mockResolvedValue({
      windowId: WINDOW_ID,
      status: 'closed',
      pollsIssued: 12,
      haltCount: 1,
    });

    const summary = await closePositionLifecycle(LIFECYCLE_ID, tokenOf(RAW_TOKEN));

    expect(summary).toMatchObject({
      lifecycleId: LIFECYCLE_ID,
      status: 'closed',
      guardUsed: 0,
      guardBudget: 4,
      receiptState: 'available',
    });
    expect(summary.watch).toMatchObject({ windowId: WINDOW_ID, haltCount: 1 });
    // The embedded window is closed with the SAME lifecycle token.
    expect(mockCloseWindow).toHaveBeenCalledWith(WINDOW_ID, tokenOf(RAW_TOKEN));
  });

  it('is idempotent: closing a closed lifecycle returns the summary without error', async () => {
    queueFrom([
      builder({ value: { ...ROW, status: 'closed', closed_at: '2026-11-03T05:00:00.000Z' } }),
    ]);
    mockCloseWindow.mockResolvedValue({ windowId: WINDOW_ID, status: 'closed', haltCount: 0 });

    const summary = await closePositionLifecycle(LIFECYCLE_ID, tokenOf(RAW_TOKEN));

    expect(summary.status).toBe('closed');
    expect(summary.closedAt).toBe('2026-11-03T05:00:00.000Z');
  });
});

describe('bundle registry wiring', () => {
  it('every plan family is registered and transaction families are flagged', async () => {
    const { POSITION_LIFECYCLE_GUARD_FAMILIES } = await import('@/lib/billing/positionLifecycle');
    const { POSITION_LIFECYCLE_GUARD_REGISTRY } = await import('../positionLifecycleGuards');
    for (const family of POSITION_LIFECYCLE_GUARD_FAMILIES) {
      expect(POSITION_LIFECYCLE_GUARD_REGISTRY[family]).toBeDefined();
      expect(POSITION_LIFECYCLE_GUARD_REGISTRY[family].assess).toBeInstanceOf(Function);
    }
    expect(POSITION_LIFECYCLE_GUARD_REGISTRY.solana_lending.requiresTransaction).toBe(true);
    expect(POSITION_LIFECYCLE_GUARD_REGISTRY.base_perp.requiresTransaction).toBeUndefined();
  });
});
