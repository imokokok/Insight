/**
 * The operator kill switch is the one control that must work when everything
 * else is suspect: it is read before any upstream oracle data, and it must
 * produce a provable, accounted-for refusal rather than a special-case error.
 * These tests pin that contract down, including the deliberate fail-open
 * behaviour when the switch itself cannot be read.
 */

import { getConsensusPrice } from '@/lib/api/services/consensusPriceService';
import { preTradeSafetyCheck } from '@/lib/api/services/preTradeSafetyService';
import { UnsupportedSymbolError } from '@/lib/errors';
import { calculateAllStablecoinSnapshots } from '@/lib/stablecoins/monitor';
import { createServiceRoleClient } from '@/lib/supabase/server';

jest.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: jest.fn() }));
jest.mock('@/lib/api/services/consensusPriceService', () => ({ getConsensusPrice: jest.fn() }));
jest.mock('@/lib/stablecoins/monitor', () => ({ calculateAllStablecoinSnapshots: jest.fn() }));

// A deterministic attester key so the halted refusal is a genuinely signed
// envelope — the point of the check is that a halt is provable, not just a 5xx.
process.env.ATTESTATION_SIGNER_PRIVATE_KEY = `0x${'12'.repeat(32)}`;
process.env.ATTESTATION_KEY_VALID_FROM = '2020-01-01';

const mockedCreateClient = createServiceRoleClient as jest.MockedFunction<
  typeof createServiceRoleClient
>;
const mockedGetConsensusPrice = getConsensusPrice as jest.MockedFunction<typeof getConsensusPrice>;
const mockedSnapshots = calculateAllStablecoinSnapshots as jest.MockedFunction<
  typeof calculateAllStablecoinSnapshots
>;

const auditInsert = jest.fn();

/** Serve the control-row read and the pre_trade_checks audit insert. */
function mockClient(control: { data: unknown; error: unknown }) {
  const maybeSingle = jest.fn().mockResolvedValue(control);
  const from = jest.fn((table: string) => {
    if (table === 'ops_issuance_control')
      return { select: () => ({ eq: () => ({ maybeSingle }) }) };
    if (table === 'pre_trade_checks') return { insert: auditInsert };
    throw new Error(`unexpected table ${table}`);
  });
  mockedCreateClient.mockReturnValue({ from } as never);
  return { from, maybeSingle };
}

const INPUT = { asset: 'ETH', chainId: 8453, action: 'swap' as const, tradeAmountUsd: 10_000 };

beforeEach(() => {
  jest.clearAllMocks();
  auditInsert.mockResolvedValue({ error: null });
  mockedSnapshots.mockResolvedValue([]);
});

it('short-circuits to a signed BLOCK before any upstream call while halted', async () => {
  const { from } = mockClient({
    data: {
      halted: true,
      reason: 'provider X quarantined',
      changed_by: 'owner-1',
      changed_by_email: 'owner@example.com',
      changed_at: '2026-10-10T00:00:00Z',
      revision: 2,
    },
    error: null,
  });

  const result = await preTradeSafetyCheck(INPUT);

  expect(result.verdict).toBe('BLOCK');
  expect(result.contributingFactors).toHaveLength(1);
  expect(result.contributingFactors[0].rule).toBe('issuance_halted');
  expect(result.warnings.join(' ')).toContain('provider X quarantined');

  // The refusal is provable rather than an error: it carries the usual envelope.
  expect(result.attestation).not.toBeNull();
  expect(result.attestation?.uid).toMatch(/^0x[0-9a-f]{64}$/);

  // The whole point of reading the switch first: no oracle data is consulted,
  // so an incident that implicates those sources cannot influence the outcome.
  expect(mockedGetConsensusPrice).not.toHaveBeenCalled();
  expect(mockedSnapshots).not.toHaveBeenCalled();

  // And the refusal is accounted for exactly like a normal check.
  expect(from).toHaveBeenCalledWith('pre_trade_checks');
  expect(auditInsert).toHaveBeenCalledTimes(1);
  expect(auditInsert.mock.calls[0][0]).toMatchObject({ verdict: 'BLOCK', signed: true });
});

it('runs the normal pipeline when the switch cannot be read (fail open)', async () => {
  mockClient({ data: null, error: null });
  mockedGetConsensusPrice.mockRejectedValue(new UnsupportedSymbolError('no coverage'));

  const result = await preTradeSafetyCheck(INPUT);

  expect(mockedGetConsensusPrice).toHaveBeenCalledTimes(1);
  expect(result.contributingFactors.some((factor) => factor.rule === 'issuance_halted')).toBe(
    false
  );
});
