/**
 * HyperCore rail for MCP: `verify_evidence` with `kind=hyperliquid_perp`
 * previously failed closed with X402_PAYMENT_RAIL_UNAVAILABLE even though the
 * HyperCore config was present. It must now quote a Core-USDC payment.
 */

import { handleMcpPaidToolCall } from '../mcpBridge';

import type { X402Config } from '../config';

jest.mock('../hypercore', () => {
  const client = { quote: jest.fn(), verify: jest.fn(), settle: jest.fn() };
  return {
    __client: client,
    coreUsdAmountFromAtomic: (atomic: string) => (Number(atomic) / 1_000_000).toString(),
    createHypercoreFacilitatorClient: jest.fn(() => client),
    hypercorePayloadFromHeader: jest.fn(() => null),
  };
});

const hypercoreMock = jest.requireMock('../hypercore') as {
  __client: { quote: jest.Mock; verify: jest.Mock; settle: jest.Mock };
  createHypercoreFacilitatorClient: jest.Mock;
  hypercorePayloadFromHeader: jest.Mock;
};
const mockQuote = hypercoreMock.__client.quote;

function hypercoreConfig(): X402Config {
  return {
    enabled: true,
    evmEnabled: false,
    evmNetworks: [],
    payTo: '',
    evmPayTos: {},
    solana: null,
    hypercore: {
      enabled: true,
      network: 'hyperliquid:mainnet',
      payTo: '0x1111111111111111111111111111111111111111',
      facilitatorUrl: 'https://facilitator.example',
      merchantId: 'merchant',
      merchantSecret: 'secret',
      timeoutMs: 10_000,
    },
  } as unknown as X402Config;
}

function paidRequest(): Request {
  return new Request('https://www.oracleinsight.xyz/api/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name: 'verify_evidence',
        arguments: { kind: 'hyperliquid_perp', address: '0xabc', coin: 'ETH' },
      },
    }),
  });
}

describe('HyperCore MCP payment rail', () => {
  beforeEach(() => {
    // Jest runs with resetMocks, so re-install factory implementations here.
    hypercoreMock.createHypercoreFacilitatorClient.mockReturnValue(hypercoreMock.__client);
    hypercoreMock.hypercorePayloadFromHeader.mockReturnValue(null);
    mockQuote.mockReset();
    mockQuote.mockResolvedValue({
      scheme: 'exact',
      network: 'hyperliquid:mainnet',
      asset: 'USDC',
      payTo: '0x1111111111111111111111111111111111111111',
      maxAmountRequired: '4000',
      resource: 'https://www.oracleinsight.xyz/api/mcp',
      description: 'verify_evidence',
      mimeType: 'application/json',
      maxTimeoutSeconds: 300,
      extra: {},
    });
  });

  it('issues a 402 HyperCore quote instead of a 503 rail error', async () => {
    const response = await handleMcpPaidToolCall({
      request: paidRequest(),
      cfg: hypercoreConfig(),
      toolName: 'verify_evidence',
      runBusiness: async () => new Response('{}', { status: 200 }),
    });

    expect(response.status).toBe(402);
    expect(mockQuote).toHaveBeenCalledWith('https://www.oracleinsight.xyz/api/mcp', '0.004');
    expect(response.headers.get('X-Credit-Status')).toBe('quote');
    expect(response.headers.get('X-Credit-Cost')).toBe('4');
    expect(response.headers.get('X-Credit-Price-USD')).toBe('0.004');
    expect(response.headers.get('payment-required')).toBeTruthy();

    const body = (await response.json()) as { accepts: Array<{ network: string }> };
    expect(body.accepts[0].network).toBe('hyperliquid:mainnet');
  });

  it('returns the explicit rail error when HyperCore config is absent', async () => {
    const cfg = { ...hypercoreConfig(), hypercore: null } as unknown as X402Config;
    const response = await handleMcpPaidToolCall({
      request: paidRequest(),
      cfg,
      toolName: 'verify_evidence',
      runBusiness: async () => new Response('{}', { status: 200 }),
    });
    expect(response.status).toBe(503);
    const body = (await response.json()) as { error?: string };
    expect(body.error).toBe('X402_PAYMENT_RAIL_UNAVAILABLE');
  });
});
