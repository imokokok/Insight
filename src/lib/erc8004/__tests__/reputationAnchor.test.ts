import { keccak256, toHex } from 'viem';

import {
  buildFeedbackHash,
  enqueueReputationAnchor,
  normalizeVerdictTag,
  REPUTATION_FEEDBACK_VALUE,
  REPUTATION_FEEDBACK_VALUE_DECIMALS,
  REPUTATION_TAG1,
} from '../reputationAnchor';

const supabaseInsert = jest.fn();

jest.mock('@/lib/supabase/server', () => ({
  createServiceRoleClient: () => ({
    from: () => ({ insert: supabaseInsert }),
  }),
}));

const PAYER = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

function validInput() {
  return {
    requestId: 'req_abc123',
    payer: PAYER,
    agentId: 364913,
    verdict: 'PASS',
    attestationUid: '0xabc123',
    paymentNetwork: 'eip155:8453',
    paymentTxHash: '0xdeadbeef',
    amountUsdc: '0.02',
  };
}

describe('normalizeVerdictTag', () => {
  it('maps known verdicts case-insensitively', () => {
    expect(normalizeVerdictTag('PASS')).toBe('pass');
    expect(normalizeVerdictTag('Warn')).toBe('warn');
    expect(normalizeVerdictTag('BLOCK')).toBe('block');
  });

  it('clamps unknown verdicts', () => {
    expect(normalizeVerdictTag('WEIRD')).toBe('unknown');
    expect(normalizeVerdictTag(null)).toBe('unknown');
    expect(normalizeVerdictTag('')).toBe('unknown');
  });
});

describe('buildFeedbackHash', () => {
  it('binds the attestation UID deterministically without disclosing it', () => {
    const hash = buildFeedbackHash('0xabc123');
    expect(hash).toBe(keccak256(toHex('0xabc123')));
    expect(buildFeedbackHash('0xabc123')).toBe(hash);
    expect(hash).not.toContain('0xabc123'.slice(2));
  });

  it('returns the zero hash when no UID is present', () => {
    expect(buildFeedbackHash(null)).toMatch(/^0x0{64}$/);
    expect(buildFeedbackHash(undefined)).toMatch(/^0x0{64}$/);
  });
});

describe('enqueueReputationAnchor', () => {
  beforeEach(() => {
    supabaseInsert.mockReset();
  });

  it('rejects non-EVM payers without touching the queue', async () => {
    const outcome = await enqueueReputationAnchor({ ...validInput(), payer: 'not-an-address' });
    expect(outcome).toMatchObject({ queued: false, reason: 'invalid_input' });
    expect(supabaseInsert).not.toHaveBeenCalled();
  });

  it('rejects non-positive agent ids', async () => {
    const outcome = await enqueueReputationAnchor({ ...validInput(), agentId: 0 });
    expect(outcome).toMatchObject({ queued: false, reason: 'invalid_input' });
    expect(supabaseInsert).not.toHaveBeenCalled();
  });

  it('queues a valid settlement with the verdict clamped to the tag set', async () => {
    supabaseInsert.mockResolvedValue({ error: null });
    const outcome = await enqueueReputationAnchor(validInput());
    expect(outcome).toEqual({ queued: true });
    expect(supabaseInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        request_id: 'req_abc123',
        payer: PAYER.toLowerCase(),
        agent_id: 364913,
        verdict: 'pass',
      })
    );
  });

  it('reports duplicates from the daily unique index as not queued', async () => {
    supabaseInsert.mockResolvedValue({ error: { code: '23505', message: 'duplicate key' } });
    const outcome = await enqueueReputationAnchor(validInput());
    expect(outcome).toEqual({ queued: false, reason: 'duplicate' });
  });

  it('never throws on unexpected insert errors', async () => {
    supabaseInsert.mockResolvedValue({ error: { code: 'P0001', message: 'boom' } });
    const outcome = await enqueueReputationAnchor(validInput());
    expect(outcome.queued).toBe(false);
    expect(outcome.reason === 'error' && outcome.detail === 'boom').toBe(true);
  });

  it('exposes the registry write constants used by the anchor batch', () => {
    expect(REPUTATION_FEEDBACK_VALUE).toBe(100n);
    expect(REPUTATION_FEEDBACK_VALUE_DECIMALS).toBe(0);
    expect(REPUTATION_TAG1).toBe('oracle-safety-check');
  });
});
