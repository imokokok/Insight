/**
 * The audit row is the answer to "which receipt did this agent gate on".
 *
 * These tests pin the parts that make it trustworthy: every gate input lands on
 * the row, a missing receipt is recorded as a failure rather than silently
 * dropped, and none of it can break the signal path.
 */

import type { OracleWatchAttestation } from '@/lib/attestations/oracleWatchAttestation';
import { createServiceRoleClient } from '@/lib/supabase/server';

import { recordOracleWatchCheck, recordOracleWatchCheckAsync } from '../oracleWatchAudit';

import type { OracleWatchResult } from '../oracleWatchService';

jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: jest.fn(),
}));

const mockCreateClient = createServiceRoleClient as jest.MockedFunction<
  typeof createServiceRoleClient
>;

function signal(overrides: Partial<OracleWatchResult> = {}): OracleWatchResult {
  return {
    symbol: 'ETH',
    chain: 'arbitrum',
    verdict: 'danger',
    recommendation: 'halt',
    maxDeviationPct: 3.2,
    agreement: 0.91,
    participantCount: 3,
    outlierCount: 1,
    staleCount: 0,
    consensusPrice: 2410.5,
    reason: 'insufficient_oracle_independence',
    mlRiskScore: 0.62,
    mlScore1h: 0.5,
    mlScore6h: 0.7,
    mlRiskLevel: 'high',
    avgReputation: 84,
    minReputation: 71,
    quorumSatisfied: true,
    requiredParticipantCount: 3,
    reasonCodes: ['INSUFFICIENT_INDEPENDENCE', 'MAX_DEVIATION'],
    sourceGroupCount: 1,
    requiredSourceGroupCount: 2,
    independenceSatisfied: false,
    trustScore: 38,
    trustLevel: 'low',
    trustComponents: {
      quorum: 0,
      agreement: 0.91,
      deviation: 0,
      ml: 0.38,
      reputation: 0.84,
      cleanliness: 0.5,
    },
    providers: [],
    evaluatedAt: '2026-08-29T12:00:00.000Z',
    ...overrides,
  };
}

/** Audit only reads identity fields off the receipt — no signing needed. */
function receipt(overrides: Partial<OracleWatchAttestation> = {}): OracleWatchAttestation {
  return {
    uid: '0x' + 'ab'.repeat(32),
    schemaVersion: 2,
    attester: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
    attesterLabel: 'test',
    signedAt: '2026-08-29T12:00:00.000Z',
    validForSeconds: 600,
    validUntil: 1_755_000_000,
    signature: '0xdeadbeef',
    verifyUrl: 'https://example.test/verify',
    data: {} as OracleWatchAttestation['data'],
    eip712: {
      domain: { name: 'Insight Oracle Watch', version: '1', chainId: 1 },
      types: { OracleWatchCheck: [] },
      primaryType: 'OracleWatchCheck',
    },
    ...overrides,
  };
}

function mockInsert(resolved: { error: { message: string } | null }) {
  const insert = jest.fn().mockResolvedValue(resolved);
  mockCreateClient.mockReturnValue({
    from: jest.fn().mockReturnValue({ insert }),
  } as unknown as ReturnType<typeof createServiceRoleClient>);
  return insert;
}

beforeEach(() => {
  mockCreateClient.mockReset();
});

describe('recordOracleWatchCheck', () => {
  it('writes every gate input an investigation would need', async () => {
    const insert = mockInsert({ error: null });

    await recordOracleWatchCheck(signal(), receipt(), {
      source: 'rest',
      apiKeyId: 'key-1',
      latencyMs: 42,
      subjectChainId: 42161,
    });

    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert.mock.calls[0][0]).toMatchObject({
      uid: receipt().uid,
      attested: true,
      schema_version: 2,
      symbol: 'ETH',
      chain: 'arbitrum',
      subject_chain_id: 42161,
      verdict: 'danger',
      recommendation: 'halt',
      reason: 'insufficient_oracle_independence',
      reason_codes: ['INSUFFICIENT_INDEPENDENCE', 'MAX_DEVIATION'],
      // Both gates, with the thresholds they were judged against — otherwise a
      // DANGER cannot be re-derived from the row months later.
      participant_count: 3,
      required_participant_count: 3,
      quorum_satisfied: true,
      source_group_count: 1,
      required_source_group_count: 2,
      independence_satisfied: false,
      source: 'rest',
      api_key_id: 'key-1',
      latency_ms: 42,
    });
  });

  it('records attested=false when no receipt was issued', async () => {
    const insert = mockInsert({ error: null });

    await recordOracleWatchCheck(signal(), null, { source: 'mcp' });

    expect(insert.mock.calls[0][0]).toMatchObject({
      attested: false,
      uid: null,
      attester: null,
      valid_until: null,
      source: 'mcp',
      api_key_id: null,
    });
  });

  it('converts the receipt validity window to a timestamp', async () => {
    const insert = mockInsert({ error: null });

    await recordOracleWatchCheck(signal(), receipt(), { source: 'sample' });

    expect(insert.mock.calls[0][0].valid_until).toBe(new Date(1_755_000_000 * 1000).toISOString());
  });

  it('never throws when the write fails', async () => {
    mockInsert({ error: { message: 'relation does not exist' } });

    await expect(
      recordOracleWatchCheck(signal(), receipt(), { source: 'rest' })
    ).resolves.toBeUndefined();
  });

  it('never throws when the supabase client cannot be constructed', async () => {
    mockCreateClient.mockImplementation(() => {
      throw new Error('missing env');
    });

    await expect(
      recordOracleWatchCheck(signal(), receipt(), { source: 'mcp' })
    ).resolves.toBeUndefined();
  });

  it('records a v1 receipt under its own schema version', async () => {
    const insert = mockInsert({ error: null });

    await recordOracleWatchCheck(signal(), receipt({ schemaVersion: 1 }), { source: 'rest' });

    expect(insert.mock.calls[0][0].schema_version).toBe(1);
  });
});

describe('recordOracleWatchCheckAsync', () => {
  it('returns immediately and still performs the write', async () => {
    const insert = mockInsert({ error: null });

    // Returns void — nothing for the caller to await, so a slow or failing DB
    // can never add latency to the signal an agent is gating on.
    expect(recordOracleWatchCheckAsync(signal(), receipt(), { source: 'rest' })).toBeUndefined();
    expect(insert).not.toHaveBeenCalled();

    // ...and the write is still issued once the microtask queue drains.
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it('swallows a rejected write instead of surfacing an unhandled rejection', async () => {
    const insert = jest.fn().mockRejectedValue(new Error('boom'));
    mockCreateClient.mockReturnValue({
      from: jest.fn().mockReturnValue({ insert }),
    } as unknown as ReturnType<typeof createServiceRoleClient>);

    expect(() =>
      recordOracleWatchCheckAsync(signal(), receipt(), { source: 'rest' })
    ).not.toThrow();

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(insert).toHaveBeenCalledTimes(1);
  });
});
