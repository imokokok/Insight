/**
 * @jest-environment node
 */

/**
 * End-to-end wiring check for the rejected-verdict evidence package on the
 * consolidated unified tool surface:
 *
 *   `trade_guard` (op: prepare_perp_order)
 *   -> adapter failure carrying the five reproducibility items
 *   -> structured rejected verdict
 *   -> `assessProductOutcome` bills it (C3), instead of downgrading to zero.
 *
 * The adapter registry is the only upstream seam that is mocked; the unified
 * adapter, the product tool dispatcher and the server billing gate run for real.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { type CreditBillingHeaderInput } from '@/lib/billing/billingHeaders';
import { getMcpToolCreditCharge } from '@/lib/billing/channelCostPolicy';
import { assessProductOutcome } from '@/lib/billing/exemptions';
import {
  getRejectedOutcomeCounts,
  resetRejectedOutcomeCounts,
} from '@/lib/billing/rejectedOutcomeMonitor';
import { clearMcpRequestCache } from '@/lib/billing/requestIdempotency';
import { PerpOrderAdapterError } from '@/lib/perps/perpOrderEnvelope';

import { createMcpServer } from '../server';
import { canonicalizeToolCall } from '../tools';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

const recordWaivedCreditMock = jest.fn();
const precheckCreditsMock = jest.fn();
const precheckQuotaMock = jest.fn();
const recordUsageMock = jest.fn();
const consumeQuotaMock = jest.fn();
const mockPreflight = jest.fn();

jest.mock('@/lib/billing/creditWallet', () => ({
  makeMeteringKey: (prefix: string) => `${prefix}:test`,
  precheckCredits: (...args: unknown[]) => precheckCreditsMock(...(args as [])),
  recordWaivedCredit: (...args: unknown[]) => recordWaivedCreditMock(...(args as [unknown])),
}));

jest.mock('../middleware', () => ({
  consumeMcpQuota: (...args: unknown[]) => consumeQuotaMock(...(args as [])),
  precheckMcpToolQuota: (...args: unknown[]) => precheckQuotaMock(...(args as [])),
  recordMcpToolUsage: (...args: unknown[]) => recordUsageMock(...(args as [])),
}));

jest.mock('@/lib/execution/adapters', () => ({
  executionAdapterRegistry: {
    preflight: (...args: unknown[]) => mockPreflight(...(args as [])),
  },
}));

const AUTH = {
  type: 'apikey',
  apiKey: { keyId: 'key-test-1' },
} as unknown as Parameters<typeof createMcpServer>[0];

const COMPLETE_EVIDENCE = {
  reason_code: 'SLIPPAGE_LIMIT_EXCEEDED',
  input_digest: 'a'.repeat(64),
  triggered_threshold: { rule_id: 'slippage-cap', threshold_bps: 50, observed_bps: 120 },
  data_sources: [
    {
      source: 'insight-cross-oracle-consensus',
      observedAt: '2026-11-08T00:00:00Z',
      sourceFreshnessSeconds: 12,
      participantCount: 6,
    },
  ],
  risk_ruleset_version: 'base-perp-order/slippage-cap',
};

const BASE_ARGS = {
  op: 'prepare_perp_order',
  venue: 'synthetix-perps-v3-base',
  market: 'BTC',
  side: 'buy',
  quantity: '0.01',
  leverage: 2,
  max_slippage_bps: 50,
  order_type: 'limit',
  limit_price: '120000',
  account_id: '1',
  account_owner: '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
};

const GUARD_PRICE = getMcpToolCreditCharge('trade_guard', BASE_ARGS);

const BNB_ARGS = {
  op: 'prepare_perp_order',
  venue: 'aster-perps-bnb-mainnet',
  market: 'BTC',
  side: 'buy',
  quantity: '0.01',
  leverage: 2,
  max_slippage_bps: 50,
  order_type: 'limit',
  limit_price: '120000',
  client_order_id: 'evidence-test',
};

const DRIFT_ARGS = {
  op: 'prepare_perp_order',
  venue: 'solana_drift',
  market: 'SOL',
  side: 'buy',
  size_usd: 100,
  margin_value_usd: 20,
  wallet: '11111111111111111111111111111111',
};

function textOf(result: CallToolResult): string {
  return result.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');
}

async function callToolWithResult(
  name: string,
  args: Record<string, unknown>
): Promise<{ receipt: CreditBillingHeaderInput; result: CallToolResult }> {
  const receipt: CreditBillingHeaderInput = {};
  const server = createMcpServer(AUTH, { billingReceipt: receipt });
  const client = new Client({ name: 'rejected-evidence-test', version: '0.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  try {
    const result = (await client.callTool({ name, arguments: args })) as CallToolResult;
    return { receipt, result };
  } finally {
    await client.close();
    await server.close();
  }
}

function slippageError(
  evidence: typeof COMPLETE_EVIDENCE | null,
  code: 'SLIPPAGE_EXCEEDED' | 'INVALID_INPUT' = 'SLIPPAGE_EXCEEDED'
): PerpOrderAdapterError {
  return new PerpOrderAdapterError(code, 'limit price 120000 is outside the 50 bps cap', {
    evidence: evidence as never,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  clearMcpRequestCache();
  resetRejectedOutcomeCounts();
  precheckCreditsMock.mockResolvedValue({ ok: true, balance: 100 });
  recordWaivedCreditMock.mockResolvedValue(undefined);
  precheckQuotaMock.mockResolvedValue({ allowed: true, balance: 100 });
  recordUsageMock.mockReturnValue(undefined);
  consumeQuotaMock.mockResolvedValue({
    allowed: true,
    cost: GUARD_PRICE,
    charged: GUARD_PRICE,
    items: 1,
    source: 'credits',
    confirmed: true,
  });
});

describe('trade_guard prepare_perp_order rejected-evidence chain', () => {
  it('prices the consolidated trade_guard op, so a billed rejection is visible', () => {
    // Canonicalisation must keep the product name: collapsing back to the
    // legacy free name would silently turn every billed verdict into a free call.
    expect(canonicalizeToolCall('trade_guard', BASE_ARGS).name).toBe('trade_guard');
    expect(GUARD_PRICE).toBeGreaterThan(0);
  });

  it('bills a Synthetix slippage rejection that carries all five items', async () => {
    mockPreflight.mockRejectedValue(slippageError(COMPLETE_EVIDENCE));

    const { receipt, result } = await callToolWithResult('trade_guard', BASE_ARGS);
    const body = JSON.parse(textOf(result)) as {
      decision: string;
      evidence: unknown;
      venue: string;
    };

    expect(body.decision).toBe('rejected');
    expect(body.venue).toBe('synthetix-perps-v3-base');
    expect(body.evidence).toEqual(COMPLETE_EVIDENCE);
    expect(result.isError).toBeFalsy();
    expect(receipt.status).toBe('charged');
    expect(receipt.costCredits).toBeGreaterThan(0);
    expect(recordWaivedCreditMock).not.toHaveBeenCalled();
    expect(getRejectedOutcomeCounts()).toEqual({ billable: 1, downgraded: 0 });
  });

  it('bills an Aster slippage rejection the same way', async () => {
    mockPreflight.mockRejectedValue(slippageError(COMPLETE_EVIDENCE));

    const { receipt, result } = await callToolWithResult('trade_guard', BNB_ARGS);

    expect((JSON.parse(textOf(result)) as { decision: string }).decision).toBe('rejected');
    expect(receipt.status).toBe('charged');
    expect(getRejectedOutcomeCounts()).toEqual({ billable: 1, downgraded: 0 });
  });

  it('keeps a complete evidence package at zero charge when the outcome is unavailable', async () => {
    // The five items are present, but an invalid input never formed a verdict.
    mockPreflight.mockRejectedValue(slippageError(COMPLETE_EVIDENCE, 'INVALID_INPUT'));

    const { receipt, result } = await callToolWithResult('trade_guard', BASE_ARGS);

    // The gate returns a downgraded `unavailable` envelope, so the transport
    // error flag is cleared even though the refusal never formed a verdict.
    expect(result.isError).toBe(false);
    expect(receipt.status).toBe('waived');
    expect(receipt.costCredits).toBe(0);
    expect(recordWaivedCreditMock).toHaveBeenCalledTimes(1);
    // The producer keeps its verdict literal; the gate is what turns an
    // incomplete package into an unavailable, zero-charge call.
    expect(getRejectedOutcomeCounts()).toEqual({ billable: 0, downgraded: 1 });
    expect(assessProductOutcome(textOf(result)).outcome).toBe('unavailable');
  });

  it('keeps an incomplete rejection at zero charge instead of guessing', async () => {
    mockPreflight.mockRejectedValue(slippageError({ ...COMPLETE_EVIDENCE, data_sources: [] }));

    const { receipt } = await callToolWithResult('trade_guard', BASE_ARGS);

    expect(receipt.status).toBe('waived');
    expect(receipt.costCredits).toBe(0);
    expect(recordWaivedCreditMock).toHaveBeenCalledTimes(1);
    expect(getRejectedOutcomeCounts()).toEqual({ billable: 0, downgraded: 1 });
  });

  it('keeps a Drift failure unavailable even when evidence-shaped fields exist', async () => {
    mockPreflight.mockRejectedValue({
      code: 'SLIPPAGE_EXCEEDED',
      outcome: 'unavailable',
      evidence: COMPLETE_EVIDENCE,
      message: 'Drift order book depth is insufficient',
    });

    const { receipt } = await callToolWithResult('trade_guard', DRIFT_ARGS);

    expect(receipt.status).toBe('waived');
    expect(receipt.costCredits).toBe(0);
    expect(getRejectedOutcomeCounts()).toEqual({ billable: 0, downgraded: 1 });
  });

  it('still downgrades a bare rejected marker without evidence', () => {
    const assessment = assessProductOutcome('[rejected:invalid_request] missing payload');

    expect(assessment.outcome).toBe('unavailable');
    expect(assessment.downgradedFromRejected).toBe(true);
    expect(assessment.missingEvidence.length).toBeGreaterThan(0);
  });
});
