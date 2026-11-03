import { createServiceRoleClient } from '@/lib/supabase/server';

import {
  applyIssuanceChange,
  readIssuanceControl,
  readIssuanceHistory,
  readIssuanceHalt,
} from './issuanceControl';

jest.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: jest.fn() }));

const mockedClient = createServiceRoleClient as jest.MockedFunction<typeof createServiceRoleClient>;

function controlRow(overrides: Record<string, unknown> = {}) {
  return {
    halted: false,
    reason: null,
    changed_by: null,
    changed_by_email: null,
    changed_at: null,
    revision: 0,
    ...overrides,
  };
}

/** Mock the `.from('ops_issuance_control').select().eq().maybeSingle()` chain. */
function mockControlRead(result: { data: unknown; error: unknown }) {
  const maybeSingle = jest.fn().mockResolvedValue(result);
  const eq = jest.fn(() => ({ maybeSingle }));
  const select = jest.fn(() => ({ eq }));
  const from = jest.fn(() => ({ select }));
  mockedClient.mockReturnValue({ from } as never);
  return { from, maybeSingle };
}

beforeEach(() => jest.clearAllMocks());

describe('readIssuanceControl', () => {
  it('reports the halting state, its actor and its revision', async () => {
    mockControlRead({
      data: controlRow({
        halted: true,
        reason: 'oracle provider X quarantined',
        changed_by: 'owner-1',
        changed_by_email: 'owner@example.com',
        changed_at: '2026-10-10T00:00:00Z',
        revision: 3,
      }),
      error: null,
    });

    const snapshot = await readIssuanceControl();

    expect(snapshot.errored).toBe(false);
    expect(snapshot.state).toEqual({
      halted: true,
      reason: 'oracle provider X quarantined',
      changedBy: 'owner-1',
      changedByEmail: 'owner@example.com',
      changedAt: '2026-10-10T00:00:00Z',
      revision: 3,
    });
    expect(await readIssuanceHalt()).toEqual({
      halted: true,
      reason: 'oracle provider X quarantined',
    });
  });

  it('treats a missing singleton row as UNKNOWN, never as "not halted"', async () => {
    mockControlRead({ data: null, error: null });

    const snapshot = await readIssuanceControl();

    expect(snapshot).toEqual({ state: null, errored: true });
    // The hot path fails OPEN on an unverifiable switch; see the module header.
    expect(await readIssuanceHalt()).toEqual({ halted: false, reason: null });
  });

  it('fails open (and reports it) when the query errors', async () => {
    mockControlRead({ data: null, error: { message: 'relation does not exist' } });

    expect(await readIssuanceControl()).toEqual({ state: null, errored: true });
    expect(await readIssuanceHalt()).toEqual({ halted: false, reason: null });
  });

  it('fails open when the privileged client cannot even be constructed', async () => {
    mockedClient.mockImplementation(() => {
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
    });

    expect(await readIssuanceControl()).toEqual({ state: null, errored: true });
    expect(await readIssuanceHalt()).toEqual({ halted: false, reason: null });
  });
});

describe('applyIssuanceChange', () => {
  it('returns the resulting state from the atomic database function', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: [controlRow({ halted: true, reason: 'incident 4211', revision: 4 })],
      error: null,
    });
    mockedClient.mockReturnValue({ rpc } as never);

    const state = await applyIssuanceChange({
      halted: true,
      reason: 'incident 4211',
      actorId: 'owner-1',
      actorEmail: 'owner@example.com',
    });

    expect(state.halted).toBe(true);
    expect(state.revision).toBe(4);
    expect(rpc).toHaveBeenCalledWith('ops_apply_issuance_change', {
      p_halted: true,
      p_reason: 'incident 4211',
      p_actor: 'owner-1',
      p_actor_email: 'owner@example.com',
    });
  });

  it('throws instead of reporting a silent success when the write fails', async () => {
    mockedClient.mockReturnValue({
      rpc: jest.fn().mockResolvedValue({ data: null, error: { message: 'reason is required' } }),
    } as never);

    await expect(
      applyIssuanceChange({ halted: false, reason: 'all clear', actorId: 'a', actorEmail: null })
    ).rejects.toThrow('reason is required');
  });
});

describe('readIssuanceHistory', () => {
  it('maps audit rows newest-first', async () => {
    const limit = jest.fn().mockResolvedValue({
      data: [
        {
          id: 9,
          created_at: '2026-10-10T01:00:00Z',
          actor_id: 'owner-1',
          actor_email: 'owner@example.com',
          action: 'issuance.halt.engage',
          target: 'issuance_control',
          reason: 'quarantine',
          before_state: { halted: false, revision: 3 },
          after_state: { halted: true, revision: 4 },
        },
      ],
      error: null,
    });
    const order = jest.fn(() => ({ limit }));
    const select = jest.fn(() => ({ order }));
    mockedClient.mockReturnValue({ from: jest.fn(() => ({ select })) } as never);

    const history = await readIssuanceHistory();

    expect(history.errored).toBe(false);
    expect(history.actions).toEqual([
      {
        id: '9',
        createdAt: '2026-10-10T01:00:00Z',
        actorId: 'owner-1',
        actorEmail: 'owner@example.com',
        action: 'issuance.halt.engage',
        target: 'issuance_control',
        reason: 'quarantine',
        beforeState: { halted: false, revision: 3 },
        afterState: { halted: true, revision: 4 },
      },
    ]);
  });

  it('reports a read failure instead of an empty history', async () => {
    const limit = jest.fn().mockResolvedValue({ data: null, error: { message: 'nope' } });
    const order = jest.fn(() => ({ limit }));
    const select = jest.fn(() => ({ order }));
    mockedClient.mockReturnValue({ from: jest.fn(() => ({ select })) } as never);

    expect(await readIssuanceHistory()).toEqual({ actions: [], errored: true });
  });
});
