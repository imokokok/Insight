/**
 * @jest-environment node
 */

/**
 * MCP zero-charge reasons must be observable end to end:
 *
 *   1. the receipt drives `X-Credit-Zero-Reason` on the HTTP transport;
 *   2. the same value is written to the ledger `waiver` row;
 *   3. the documented vocabulary matches the code.
 *
 * The tool executor and the billing/middleware modules are mocked so the test
 * exercises the server's branch wiring without Supabase or upstream calls.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import {
  applyCreditBillingHeaders,
  type CreditBillingHeaderInput,
} from '@/lib/billing/billingHeaders';
import { BILLING_ZERO_REASONS, REJECTED_EVIDENCE_ITEMS } from '@/lib/billing/exemptions';
import { clearMcpRequestCache } from '@/lib/billing/requestIdempotency';

import { createMcpServer } from '../server';

import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

const recordWaivedCreditMock = jest.fn();
const precheckCreditsMock = jest.fn();
const precheckQuotaMock = jest.fn();
const recordUsageMock = jest.fn();
const consumeQuotaMock = jest.fn();

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

const executeToolMock = jest.fn();

jest.mock('../tools', () => ({
  executeTool: (...args: unknown[]) => executeToolMock(...(args as [])),
  canonicalizeToolCall: (name: unknown, args: unknown) => ({ name, args }),
  getToolDefinitions: () => [
    {
      name: 'get_oracle_prices_batch',
      description: 'batch',
      inputSchema: { type: 'object', properties: {} },
    },
  ],
}));

const AUTH = {
  type: 'apikey',
  apiKey: { keyId: 'key-test-1' },
} as unknown as Parameters<typeof createMcpServer>[0];

const COMPLETE_REJECTED_EVIDENCE = {
  reason_code: 'SLIPPAGE_LIMIT_EXCEEDED',
  input_digest: 'a'.repeat(64),
  triggered_threshold: { rule_id: 'slippage', threshold: 50, observed: 120 },
  data_sources: [
    {
      source_id: 'jupiter',
      value: 'quote',
      read_at: '2026-11-08T00:00:00Z',
      block_number: 1,
    },
  ],
  risk_ruleset_version: 'v2.1',
};

async function callToolWithResult(
  name: string,
  args: Record<string, unknown>
): Promise<{ receipt: CreditBillingHeaderInput; result: CallToolResult }> {
  const receipt: CreditBillingHeaderInput = {};
  const server = createMcpServer(AUTH, { billingReceipt: receipt });
  const client = new Client({ name: 'billing-test', version: '0.0.0' });
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

async function callTool(
  name: string,
  args: Record<string, unknown>
): Promise<CreditBillingHeaderInput> {
  return (await callToolWithResult(name, args)).receipt;
}

async function callBatch(): Promise<CreditBillingHeaderInput> {
  return callTool('get_oracle_prices_batch', {
    queries: [{ provider: 'chainlink', symbol: 'ETH' }],
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  clearMcpRequestCache();
  // `resetMocks: true` wipes implementations between tests, so re-arm here.
  precheckCreditsMock.mockResolvedValue({ ok: true, balance: 100 });
  recordWaivedCreditMock.mockResolvedValue(undefined);
  precheckQuotaMock.mockResolvedValue({ allowed: true, balance: 100 });
  recordUsageMock.mockReturnValue(undefined);
  consumeQuotaMock.mockResolvedValue({ allowed: true, cost: 0, items: 0, charged: 0 });
});

describe('MCP zero-charge reason', () => {
  it('reports upstream_failed when every batch item failed', async () => {
    executeToolMock.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: [
            '**Batch price results (1 query)**',
            '',
            '**Successful:**',
            'No successful prices.',
            '',
            '**Failures:**',
            '- ETH: upstream 503',
          ].join('\n'),
        },
      ],
    });

    const receipt = await callBatch();

    // ① response header
    const headers = new Headers();
    applyCreditBillingHeaders(headers, receipt);
    expect(headers.get('X-Credit-Zero-Reason')).toBe('upstream_failed');
    expect(receipt.status).toBe('waived');
    expect(receipt.costCredits).toBe(0);

    // ② ledger waiver reason
    expect(recordWaivedCreditMock).toHaveBeenCalledTimes(1);
    expect(recordWaivedCreditMock.mock.calls[0][0]).toMatchObject({
      keyId: 'key-test-1',
      ref: '/mcp/tools/get_oracle_prices_batch',
      reason: 'upstream_failed',
    });
  });

  it('still reports insufficient_data when the evidence grade says so', async () => {
    executeToolMock.mockResolvedValue({
      content: [{ type: 'text', text: 'Evidence grade: INSUFFICIENT_DATA (freshness stale)' }],
    });

    const receipt = await callBatch();

    const headers = new Headers();
    applyCreditBillingHeaders(headers, receipt);
    expect(headers.get('X-Credit-Zero-Reason')).toBe('insufficient_data');
    expect(recordWaivedCreditMock.mock.calls[0][0]).toMatchObject({
      reason: 'insufficient_data',
    });
  });

  it('replays a deterministic all-failed outcome from the shared cache', async () => {
    executeToolMock.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: '**Batch price results (1 query)**\n\n**Successful:**\nNo successful prices.\n',
        },
      ],
    });

    const first = await callBatch();
    expect(first.zeroReason).toBe('upstream_failed');

    const replay = await callBatch();
    expect(executeToolMock).toHaveBeenCalledTimes(1);
    expect(replay.status).toBe('replayed');
    expect(replay.zeroReason).toBe('replay');
    expect(replay.costCredits).toBe(0);
    expect(recordWaivedCreditMock).toHaveBeenCalledTimes(1);
  });

  it('waives an offline verification with reason tool_free', async () => {
    executeToolMock.mockResolvedValue({
      content: [{ type: 'text', text: '{"kind":"execution_pair","valid":true}' }],
    });

    const receipt = await callTool('verify_evidence', { kind: 'execution_pair' });

    const headers = new Headers();
    applyCreditBillingHeaders(headers, receipt);
    expect(headers.get('X-Credit-Status')).toBe('waived');
    expect(headers.get('X-Credit-Zero-Reason')).toBe('tool_free');
    expect(receipt.costCredits).toBe(0);
    expect(consumeQuotaMock).not.toHaveBeenCalled();

    expect(recordWaivedCreditMock).toHaveBeenCalledTimes(1);
    expect(recordWaivedCreditMock.mock.calls[0][0]).toMatchObject({
      keyId: 'key-test-1',
      ref: '/mcp/tools/verify_evidence',
      reason: 'tool_free',
    });
  });

  it('charges an unrecognised verification kind at C4 and reports charged', async () => {
    executeToolMock.mockResolvedValue({
      content: [{ type: 'text', text: '{"kind":"something_else","valid":true}' }],
    });
    consumeQuotaMock.mockResolvedValue({
      allowed: true,
      cost: 40,
      items: 1,
      charged: 40,
      confirmed: true,
      source: 'credits',
      receipt: 'key-test-1:test',
    });

    const receipt = await callTool('verify_evidence', { kind: 'something_else' });

    const headers = new Headers();
    applyCreditBillingHeaders(headers, receipt);
    expect(headers.get('X-Credit-Status')).toBe('charged');
    expect(receipt.status).toBe('charged');
    expect(receipt.costCredits).toBe(40);
    expect(consumeQuotaMock).toHaveBeenCalledTimes(1);
    expect(recordWaivedCreditMock).not.toHaveBeenCalled();
  });

  it('charges a structured rejected verdict with all five evidence items', async () => {
    precheckCreditsMock.mockResolvedValue({ ok: true, balance: 100 });
    precheckQuotaMock.mockResolvedValue({ allowed: true, balance: 100 });
    consumeQuotaMock.mockResolvedValue({
      allowed: true,
      cost: 10,
      items: 1,
      charged: 10,
      confirmed: true,
      source: 'credits',
      receipt: 'key-test-1:test',
    });
    executeToolMock.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            decision: 'rejected',
            evidence: COMPLETE_REJECTED_EVIDENCE,
          }),
        },
      ],
      // The transport still flags the refusal as an error; the verdict is billable.
      isError: true,
    });

    const { receipt, result } = await callToolWithResult('prepare_perp_order', {
      venue: 'solana_drift',
    });

    expect(receipt.status).toBe('charged');
    expect(receipt.costCredits).toBe(10);
    expect(result.isError).toBe(true);
    expect(consumeQuotaMock).toHaveBeenCalledTimes(1);
    expect(recordWaivedCreditMock).not.toHaveBeenCalled();
  });

  it.each(REJECTED_EVIDENCE_ITEMS)(
    'downgrades a rejection missing %s to unavailable and zero-charges',
    async (missingItem) => {
      const evidence: Record<string, unknown> = { ...COMPLETE_REJECTED_EVIDENCE };
      delete evidence[missingItem];
      executeToolMock.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({ decision: 'rejected', evidence }),
          },
        ],
        isError: true,
      });

      const { receipt, result } = await callToolWithResult('prepare_perp_order', {
        venue: 'solana_drift',
      });

      expect(receipt.status).toBe('waived');
      expect(receipt.costCredits).toBe(0);
      expect(receipt.zeroReason).toBe(BILLING_ZERO_REASONS.rejectedWithoutEvidence);
      expect(consumeQuotaMock).not.toHaveBeenCalled();
      expect(recordWaivedCreditMock).toHaveBeenCalledTimes(1);
      expect(recordWaivedCreditMock.mock.calls[0][0]).toMatchObject({
        reason: BILLING_ZERO_REASONS.rejectedWithoutEvidence,
      });
      expect(result.isError).toBe(false);

      const body = JSON.parse((result.content[0] as { text: string }).text);
      expect(body.decision).toBe('unavailable');
      expect(body.chargeable).toBe(false);
      expect(body.unavailable.missing).toEqual([missingItem]);
    }
  );

  it('downgrades a thrown rejected marker that carries no evidence payload', async () => {
    executeToolMock.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: 'Error executing prepare_perp_order: [rejected:invalid_request] venue solana_drift: slippage exceeded',
        },
      ],
      isError: true,
    });

    const { receipt, result } = await callToolWithResult('prepare_perp_order', {
      venue: 'solana_drift',
    });

    expect(receipt.status).toBe('waived');
    expect(receipt.costCredits).toBe(0);
    expect(receipt.zeroReason).toBe(BILLING_ZERO_REASONS.rejectedWithoutEvidence);
    expect(consumeQuotaMock).not.toHaveBeenCalled();
    expect(result.isError).toBe(false);

    const body = JSON.parse((result.content[0] as { text: string }).text);
    expect(body.decision).toBe('unavailable');
    expect(body.unavailable.missing).toEqual(REJECTED_EVIDENCE_ITEMS);
  });

  it('waives an unavailable product outcome whether it is returned or thrown', async () => {
    const results = [
      {
        content: [
          { type: 'text', text: JSON.stringify({ decision: 'unavailable', chargeable: false }) },
        ],
      },
      {
        content: [
          {
            type: 'text',
            text: 'Error executing prepare_perp_order: [unavailable:upstream_unavailable] venue solana_drift: rpc down',
          },
        ],
        isError: true,
      },
    ];

    for (const [index, result] of results.entries()) {
      jest.clearAllMocks();
      precheckCreditsMock.mockResolvedValue({ ok: true, balance: 100 });
      recordWaivedCreditMock.mockResolvedValue(undefined);
      precheckQuotaMock.mockResolvedValue({ allowed: true, balance: 100 });
      executeToolMock.mockResolvedValue(result);

      const receipt = await callTool('prepare_perp_order', {
        venue: index === 0 ? 'solana_drift' : 'synthetix-perps-v3-base',
      });

      const headers = new Headers();
      applyCreditBillingHeaders(headers, receipt);
      expect(receipt.status).toBe('waived');
      expect(receipt.costCredits).toBe(0);
      expect(headers.get('X-Credit-Status')).toBe('waived');
      expect(headers.get('X-Credit-Zero-Reason')).toBe('upstream_failed');
      expect(consumeQuotaMock).not.toHaveBeenCalled();
      expect(recordWaivedCreditMock).toHaveBeenCalledTimes(1);
      expect(recordWaivedCreditMock.mock.calls[0][0]).toMatchObject({
        reason: 'upstream_failed',
      });
    }
  });

  it('keeps unclassified execution errors unbilled and preserves isError', async () => {
    executeToolMock.mockResolvedValue({
      content: [{ type: 'text', text: 'Error executing prepare_perp_order: boom' }],
      isError: true,
    });

    const receipt = await callTool('prepare_perp_order', { venue: 'solana_drift' });

    expect(receipt.status).toBe('not_charged');
    expect(receipt.costCredits).toBe(0);
    expect(consumeQuotaMock).not.toHaveBeenCalled();
  });

  it('keeps the three documented surfaces on the same vocabulary', () => {
    const files = [
      'src/lib/billing/billingHeaders.ts',
      'src/mcp/middleware.ts',
      'docs/operations/integration-reliability.md',
    ];
    const reasons = Object.values(BILLING_ZERO_REASONS);
    for (const file of files) {
      const text = readFileSync(path.join(process.cwd(), file), 'utf8');
      for (const reason of reasons) {
        expect([file, reason, text.includes(reason)]).toEqual([file, reason, true]);
      }
    }
  });
});
