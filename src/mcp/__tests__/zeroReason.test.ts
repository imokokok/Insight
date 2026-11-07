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
import { BILLING_ZERO_REASONS } from '@/lib/billing/exemptions';

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
  getToolDefinitions: () => [
    {
      name: 'get_oracle_prices_batch',
      description: 'batch',
      inputSchema: { type: 'object', properties: {} },
    },
  ],
}));

// eslint-disable-next-line import/first
import { createMcpServer } from '../server';

const AUTH = {
  type: 'apikey',
  apiKey: { keyId: 'key-test-1' },
} as unknown as Parameters<typeof createMcpServer>[0];

async function callBatch(): Promise<CreditBillingHeaderInput> {
  const receipt: CreditBillingHeaderInput = {};
  const server = createMcpServer(AUTH, { billingReceipt: receipt });
  const client = new Client({ name: 'billing-test', version: '0.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  try {
    await client.callTool({
      name: 'get_oracle_prices_batch',
      arguments: { queries: [{ provider: 'chainlink', symbol: 'ETH' }] },
    });
  } finally {
    await client.close();
    await server.close();
  }
  return receipt;
}

beforeEach(() => {
  jest.clearAllMocks();
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
