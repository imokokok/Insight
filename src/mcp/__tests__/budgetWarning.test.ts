/**
 * @jest-environment node
 */

/**
 * The advisory spend-cap signal must be observable on the MCP surface, the
 * same way REST exposes it: once a call brings an API key to >=80% of its
 * monthly budget, the response carries `X-Credit-Budget-Warning: 80`.
 *
 * Before this test the MCP receipt had no `budgetWarning` field at all, so the
 * header could never be emitted regardless of the precheck payload. These
 * tests drive the real paths:
 *
 *   1. `createMcpServer` + `InMemoryTransport` → receipt;
 *   2. `handleMcpHttpRequest` → the real HTTP transport response headers;
 *   3. the shared header contract / CORS expose list.
 *
 * Only the DB boundary (`precheckCredits` / `consumeCredits`), the tool
 * executor and auth are mocked so no Supabase or upstream call is made.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { corsExposeHeaders } from '@/lib/api/x402/corsExposeHeaders';
import {
  applyCreditBillingHeaders,
  CREDIT_BILLING_HEADER_NAMES,
  type CreditBillingHeaderInput,
} from '@/lib/billing/billingHeaders';

const precheckCreditsMock = jest.fn();
const consumeCreditsMock = jest.fn();
const recordWaivedCreditMock = jest.fn();
const executeToolMock = jest.fn();
const authenticateMock = jest.fn();
const incrementMock = jest.fn();

jest.mock('@/lib/billing/creditWallet', () => ({
  makeMeteringKey: (prefix: string) => `${prefix}:test`,
  precheckCredits: (...args: unknown[]) => precheckCreditsMock(...(args as [])),
  consumeCredits: (...args: unknown[]) => consumeCreditsMock(...(args as [])),
  recordWaivedCredit: (...args: unknown[]) => recordWaivedCreditMock(...(args as [])),
}));

jest.mock('@/lib/api/apiKey', () => ({
  // A plain function: `resetMocks` would wipe a jest.fn() implementation and
  // make the fire-and-forget `.catch()` in recordMcpToolUsage throw.
  logApiKeyUsage: () => Promise.resolve(undefined),
}));

jest.mock('../auth', () => ({
  authenticateMcpRequest: (...args: unknown[]) => authenticateMock(...(args as [])),
}));

jest.mock('@/lib/api/middleware/rateLimitStore', () => ({
  rateLimitStore: { increment: (...args: unknown[]) => incrementMock(...(args as [])) },
}));

jest.mock('../tools', () => ({
  executeTool: (...args: unknown[]) => executeToolMock(...(args as [])),
  canonicalizeToolCall: (name: unknown, args: unknown) => ({ name, args }),
  getToolDefinitions: () => [
    {
      name: 'get_symbols',
      description: 'symbols',
      inputSchema: { type: 'object', properties: {} },
    },
  ],
}));

// eslint-disable-next-line import/first
import { createMcpServer } from '../server';
// eslint-disable-next-line import/first
import { handleMcpHttpRequest } from '../transports/http';

const AUTH = {
  type: 'apikey',
  userId: 'user-test-1',
  apiKey: { keyId: 'key-budget-1', userId: 'user-test-1', plan: 'developer' },
} as unknown as Parameters<typeof createMcpServer>[0];

const OK_RESULT = {
  content: [{ type: 'text' as const, text: 'Supported symbols: ETH, BTC, SOL' }],
};

function primePrecheck(payload: Record<string, unknown>): void {
  precheckCreditsMock.mockResolvedValue(payload);
}

async function callInMemory(args: Record<string, unknown>): Promise<CreditBillingHeaderInput> {
  const receipt: CreditBillingHeaderInput = {};
  const server = createMcpServer(AUTH, { billingReceipt: receipt });
  const client = new Client({ name: 'budget-warning-test', version: '0.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  try {
    await client.callTool({ name: 'get_symbols', arguments: args });
  } finally {
    await client.close();
    await server.close();
  }
  return receipt;
}

function receiptHeaders(receipt: CreditBillingHeaderInput): Headers {
  const headers = new Headers();
  applyCreditBillingHeaders(headers, receipt);
  return headers;
}

function mcpPost(args: Record<string, unknown>): Request {
  return new Request('http://localhost:3000/api/mcp', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
      'x-api-key': 'ins_placeholder',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: 'get_symbols', arguments: args },
    }),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  // jest.config.js sets resetMocks: true, so re-arm every implementation.
  primePrecheck({ ok: true, balance: 480, budget: 10, used: 2, budgetWarning: false });
  consumeCreditsMock.mockResolvedValue({
    ok: true,
    confirmed: true,
    idempotent: false,
    balance: 478,
    cost: 2,
  });
  recordWaivedCreditMock.mockResolvedValue(undefined);
  executeToolMock.mockResolvedValue(OK_RESULT);
  authenticateMock.mockResolvedValue({ success: true, auth: AUTH });
  incrementMock.mockImplementation(async () => ({ count: 1, resetTime: Date.now() + 60_000 }));
});

describe('MCP budget warning on createMcpServer + InMemoryTransport', () => {
  it('sets budgetWarning on the receipt when the precheck flags >= 80%', async () => {
    primePrecheck({ ok: true, balance: 478, budget: 10, used: 8, budgetWarning: true });

    const receipt = await callInMemory({ filter: 'warn' });
    const headers = receiptHeaders(receipt);

    expect(receipt.budgetWarning).toBe(true);
    expect(headers.get('X-Credit-Budget-Warning')).toBe('80');
    expect(headers.get('X-Credit-Status')).toBe('charged');
    expect(headers.get('X-Credit-Cost')).toBe('2');
  });

  it('omits the header below the 80% threshold', async () => {
    primePrecheck({ ok: true, balance: 480, budget: 10, used: 2, budgetWarning: false });

    const receipt = await callInMemory({ filter: 'below' });
    const headers = receiptHeaders(receipt);

    expect(receipt.budgetWarning).not.toBe(true);
    expect(headers.get('X-Credit-Budget-Warning')).toBeNull();
    expect(headers.get('X-Credit-Status')).toBe('charged');
  });

  it('never emits an empty header when the key has no budget', async () => {
    primePrecheck({ ok: true, balance: 480, budget: null, used: 0, budgetWarning: false });

    const receipt = await callInMemory({ filter: 'no-budget' });
    const headers = receiptHeaders(receipt);

    expect(receipt.budgetWarning).not.toBe(true);
    expect(headers.get('X-Credit-Budget-Warning')).toBeNull();
  });
});

describe('MCP budget warning on the real HTTP transport', () => {
  it('emits the header (and exposes it to browsers) at >= 80%', async () => {
    primePrecheck({ ok: true, balance: 478, budget: 10, used: 8, budgetWarning: true });

    const { response, cleanup } = await handleMcpHttpRequest(mcpPost({ filter: 'http-warn' }));
    await cleanup();

    expect(response.status).toBe(200);
    expect(response.headers.get('X-Credit-Budget-Warning')).toBe('80');
    expect(response.headers.get('Access-Control-Expose-Headers')).toContain(
      'X-Credit-Budget-Warning'
    );
  });

  it('omits the header below the threshold', async () => {
    primePrecheck({ ok: true, balance: 480, budget: 10, used: 2, budgetWarning: false });

    const { response, cleanup } = await handleMcpHttpRequest(mcpPost({ filter: 'http-below' }));
    await cleanup();

    expect(response.status).toBe(200);
    expect(response.headers.get('X-Credit-Budget-Warning')).toBeNull();
  });
});

describe('budget-warning header contract', () => {
  it('keeps the header in the billing constant and the CORS expose list', () => {
    expect(CREDIT_BILLING_HEADER_NAMES).toContain('X-Credit-Budget-Warning');
    expect(corsExposeHeaders('X-RateLimit-Limit')).toContain('X-Credit-Budget-Warning');
  });
});
