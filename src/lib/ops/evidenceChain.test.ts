import { createServiceRoleClient } from '@/lib/supabase/server';

import { getEvidenceChain } from './evidenceChain';

jest.mock('@/lib/supabase/server', () => ({ createServiceRoleClient: jest.fn() }));

const mockedClient = createServiceRoleClient as jest.MockedFunction<typeof createServiceRoleClient>;

interface ReceiptSeed {
  id: string;
  execution_status?: string;
  slippage_satisfied?: boolean | null;
  pre_trade_uid?: string | null;
  attested?: boolean;
  tx_hash?: string;
  price_delta_bps?: number | null;
  max_slippage_bps?: number | null;
}

function receipt(seed: ReceiptSeed) {
  return {
    id: seed.id,
    created_at: '2026-10-10T00:00:00Z',
    uid: `0x${seed.id.padStart(64, '0')}`,
    attested: seed.attested ?? true,
    source: 'mcp',
    environment: 'production',
    action: 'swap',
    execution_status: seed.execution_status ?? 'FAITHFUL',
    fill_status: 'FULL',
    slippage_satisfied: seed.slippage_satisfied ?? true,
    price_delta_bps: seed.price_delta_bps ?? 5,
    max_slippage_bps: seed.max_slippage_bps ?? 50,
    subject_chain_id: 8453,
    settlement_chain_id: 8453,
    source_asset_id: 'eip155:8453/erc20:0x1',
    destination_asset_id: 'eip155:8453/erc20:0x2',
    tx_hash: seed.tx_hash ?? '0xdeadbeef',
    executed_at: '2026-10-10T00:00:05Z',
    pre_trade_uid: seed.pre_trade_uid ?? null,
  };
}

function anchor(uid: string, verdict: string, id = 'check-1') {
  return {
    id,
    attestation_uid: uid,
    verdict,
    asset: 'ETH',
    chain_id: 8453,
    coverage_status: 'SUFFICIENT',
    signed: true,
    created_at: '2026-10-09T23:59:59Z',
  };
}

/**
 * Wire the two read paths: the paged receipt scan (`.range(...)`) and the anchor
 * lookup (`.in(...)`). A short page stops `pagedSelect` after the first call.
 */
function mockTables(receipts: unknown[], anchors: unknown[], receiptError = false) {
  const from = jest.fn((table: string) => {
    if (table === 'execution_receipts') {
      return {
        select: () => ({
          gte: () => ({
            order: () => ({
              range: () =>
                Promise.resolve({
                  data: receiptError ? null : receipts,
                  error: receiptError ? { message: 'boom' } : null,
                }),
            }),
          }),
        }),
      };
    }
    if (table === 'pre_trade_checks') {
      return { select: () => ({ in: () => Promise.resolve({ data: anchors, error: null }) }) };
    }
    throw new Error(`unexpected table ${table}`);
  });
  mockedClient.mockReturnValue({ from } as never);
  return { from };
}

beforeEach(() => jest.clearAllMocks());

it('pairs an execution to the pre-trade check that authorised it', async () => {
  mockTables([receipt({ id: '1', pre_trade_uid: '0xuid-1' })], [anchor('0xuid-1', 'PASS')]);

  const chain = await getEvidenceChain(24);

  expect(chain.summary).toMatchObject({
    receipts: 1,
    paired: 1,
    unpaired: 0,
    faithful: 1,
    deviated: 0,
    executedAgainstWarning: 0,
    slippageBreaches: 0,
  });
  expect(chain.recent[0]).toMatchObject({
    pairedCheckId: 'check-1',
    pairedVerdict: 'PASS',
    pairedAsset: 'ETH',
    pairedChainId: 8453,
  });
  expect(chain.unpaired).toHaveLength(0);
});

it('flags executions that cannot be paired to an authorising check', async () => {
  mockTables(
    [receipt({ id: '1', pre_trade_uid: null }), receipt({ id: '2', pre_trade_uid: '0xmissing' })],
    [anchor('0xuid-1', 'PASS')]
  );

  const chain = await getEvidenceChain(24);

  expect(chain.summary.receipts).toBe(2);
  expect(chain.summary.paired).toBe(0);
  expect(chain.summary.unpaired).toBe(2);
  expect(chain.unpaired.map((row) => row.id)).toEqual(['1', '2']);
});

it('counts an execution that ran despite a warning verdict, and one that breached slippage', async () => {
  mockTables(
    [
      receipt({ id: '1', pre_trade_uid: '0xuid-block', execution_status: 'DEVIATED' }),
      receipt({
        id: '2',
        pre_trade_uid: '0xuid-pass',
        execution_status: 'FAITHFUL',
        slippage_satisfied: false,
        price_delta_bps: 120,
        max_slippage_bps: 50,
      }),
      receipt({ id: '3', pre_trade_uid: '0xuid-block', execution_status: 'NOT_EXECUTED' }),
    ],
    [anchor('0xuid-block', 'BLOCK', 'check-block'), anchor('0xuid-pass', 'PASS', 'check-pass')]
  );

  const chain = await getEvidenceChain(24);

  expect(chain.summary.executedAgainstWarning).toBe(1);
  expect(chain.summary.slippageBreaches).toBe(1);
  expect(chain.summary.deviated).toBe(1);
  expect(chain.summary.notExecuted).toBe(1);
  expect(chain.deviations.map((row) => row.id)).toEqual(['1', '2']);
});

it('reports a receipt-query failure instead of an empty-but-plausible view', async () => {
  mockTables([], [], true);

  const chain = await getEvidenceChain(24);

  expect(chain.summary.errored).toBe(true);
  expect(chain.summary.receipts).toBe(0);
  expect(chain.recent).toHaveLength(0);
});
