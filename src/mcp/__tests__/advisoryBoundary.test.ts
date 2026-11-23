/**
 * @jest-environment node
 */

/**
 * Advisory boundary on the MCP surface, mirroring the REST contract
 * (`ApiResponseBuilder.meta.insightDoesNotEnforce`) and the published registry
 * (GET /.well-known/oracle-keys.json `advisory_boundary`):
 *
 *   1. the server advertises the boundary in its MCP `instructions`
 *      (the first thing an agent reads at initialize);
 *   2. every tool result — success, error, and idempotency replay — carries
 *      `_meta.insightDoesNotEnforce: true`;
 *   3. a tool cannot override the flag (same force-override contract as REST).
 *
 * Only the DB boundary, tool executor and auth are mocked so no Supabase or
 * upstream call is made (same harness as budgetWarning.test.ts).
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

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

const AUTH = {
  type: 'apikey',
  userId: 'user-test-1',
  apiKey: { keyId: 'key-boundary-1', userId: 'user-test-1', plan: 'developer' },
} as unknown as Parameters<typeof createMcpServer>[0];

function primeAllowed(): void {
  precheckCreditsMock.mockResolvedValue({
    ok: true,
    balance: 480,
    budget: 10,
    used: 2,
    budgetWarning: false,
  });
  consumeCreditsMock.mockResolvedValue({
    ok: true,
    confirmed: true,
    idempotent: false,
    balance: 478,
    cost: 2,
  });
  recordWaivedCreditMock.mockResolvedValue(undefined);
  authenticateMock.mockResolvedValue({ success: true, auth: AUTH });
  incrementMock.mockImplementation(async () => ({ count: 1, resetTime: Date.now() + 60_000 }));
}

async function callTool(
  result: unknown,
  marker: string
): Promise<{
  content: { type: string; text: string }[];
  isError?: boolean;
  _meta?: Record<string, unknown>;
}> {
  executeToolMock.mockResolvedValue(result);
  const server = createMcpServer(AUTH);
  const client = new Client({ name: 'advisory-boundary-test', version: '0.0.0' });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  try {
    return (await client.callTool({ name: 'get_symbols', arguments: { marker } })) as {
      content: { type: string; text: string }[];
      isError?: boolean;
      _meta?: Record<string, unknown>;
    };
  } finally {
    await client.close();
    await server.close();
  }
}

beforeEach(() => {
  jest.clearAllMocks();
  // jest.config.js sets resetMocks: true, so re-arm every implementation.
  primeAllowed();
});

describe('MCP advisory boundary', () => {
  it('advertises the boundary in server instructions at initialize', async () => {
    const server = createMcpServer(AUTH);
    const client = new Client({ name: 'advisory-boundary-init', version: '0.0.0' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
    try {
      const instructions = client.getInstructions();
      expect(instructions).toContain('never signs or broadcasts transactions');
      expect(instructions).toContain('never gates or blocks execution');
      expect(instructions).toContain('advisory-only');
      expect(instructions).toContain('/.well-known/oracle-keys.json');
    } finally {
      await client.close();
      await server.close();
    }
  });

  it('injects insightDoesNotEnforce into every success result _meta', async () => {
    const result = await callTool(
      { content: [{ type: 'text', text: 'Supported symbols: ETH, BTC, SOL' }] },
      'success'
    );
    expect(result._meta?.insightDoesNotEnforce).toBe(true);
  });

  it('injects the flag on error results too', async () => {
    const result = await callTool(
      {
        content: [{ type: 'text', text: 'boom: transient internal failure' }],
        isError: true,
      },
      'error'
    );
    expect(result.isError).toBe(true);
    expect(result._meta?.insightDoesNotEnforce).toBe(true);
  });

  it('force-overrides a tool-supplied _meta (callers cannot unset the flag)', async () => {
    const result = await callTool(
      {
        content: [{ type: 'text', text: 'Supported symbols: ETH, BTC, SOL' }],
        _meta: { insightDoesNotEnforce: false, custom: 'kept' },
      },
      'override'
    );
    expect(result._meta?.insightDoesNotEnforce).toBe(true);
    expect(result._meta?.custom).toBe('kept');
  });
});
