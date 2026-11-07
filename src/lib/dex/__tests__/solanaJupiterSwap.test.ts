import {
  prepareSolanaJupiterSwap,
  SolanaJupiterSwapError,
  type SolanaJupiterSwapRequest,
} from '../solanaJupiterSwap';
import { SOLANA_USDC_MINT, SOLANA_WSOL_MINT } from '../solanaOrcaWhirlpool';

const MAINNET_GENESIS_HASH = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';
const AUTHORITY = '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin';
const NOW = 1_700_000_000_000;

const BASE_REQUEST: SolanaJupiterSwapRequest = {
  inputMint: SOLANA_WSOL_MINT,
  outputMint: SOLANA_USDC_MINT,
  amount: '1.5',
  slippageBps: 50,
  userPublicKey: AUTHORITY,
  maxSlippageBps: 100,
  quoteTtlSeconds: 30,
};

function jsonResponse(body: unknown, status = 200): Response {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
}

function quoteBody(): Record<string, unknown> {
  return {
    inputMint: SOLANA_WSOL_MINT,
    outputMint: SOLANA_USDC_MINT,
    inAmount: '1500000000',
    outAmount: '250000000',
    otherAmountThreshold: '249000000',
    swapMode: 'ExactIn',
    slippageBps: 50,
    priceImpactPct: '0.01',
    contextSlot: 999,
    routePlan: [
      {
        swapInfo: {
          ammKey: '5BKxfWMbmYBAEWvyPZS9esPducUba9GqyMjtLCfbaqyF',
          label: 'Meteora DLMM',
          inputMint: SOLANA_WSOL_MINT,
          outputMint: SOLANA_USDC_MINT,
          inAmount: '1500000000',
          outAmount: '250000000',
        },
        percent: 100,
      },
    ],
  };
}

function rpcFetcher(url: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const value = String(url);
  if (value === 'https://solana.example') {
    const request = JSON.parse(String(init?.body)) as { method: string; params: unknown[] };
    if (request.method === 'getGenesisHash') {
      return Promise.resolve(jsonResponse({ result: MAINNET_GENESIS_HASH }));
    }
    if (request.method === 'getSlot') return Promise.resolve(jsonResponse({ result: 1_000 }));
    if (request.method === 'getTokenSupply') {
      const mint = request.params[0];
      const decimals = mint === SOLANA_WSOL_MINT ? 9 : 6;
      return Promise.resolve(jsonResponse({ result: { value: { decimals } } }));
    }
  }
  const parsed = new URL(value);
  if (parsed.hostname === 'api.jup.ag' && parsed.pathname.endsWith('/quote')) {
    return Promise.resolve(jsonResponse(quoteBody()));
  }
  if (parsed.hostname === 'api.jup.ag' && parsed.pathname.endsWith('/swap')) {
    return Promise.resolve(
      jsonResponse({ swapTransaction: 'A'.repeat(200), lastValidBlockHeight: 1_234 })
    );
  }
  throw new Error(`unexpected URL ${value}`);
}

async function expectCode(promise: Promise<unknown>, code: string): Promise<void> {
  try {
    await promise;
    throw new Error('Expected the adapter to reject');
  } catch (error) {
    expect(error).toBeInstanceOf(SolanaJupiterSwapError);
    expect((error as SolanaJupiterSwapError).code).toBe(code);
  }
}

describe('Solana Jupiter spot swap', () => {
  it('builds a signable transaction with route, slot and quote validity', async () => {
    const result = await prepareSolanaJupiterSwap(BASE_REQUEST, {
      apiKey: 'test-key',
      endpoints: ['https://solana.example'],
      fetcher: rpcFetcher as typeof fetch,
      nowMs: NOW,
      timeoutMs: 1_000,
    });

    expect(result).toMatchObject({
      schema: 'insight.solana-jupiter-swap.v1',
      venue: 'jupiter',
      network: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      chainId: 0,
      verdict: 'READY_TO_SIGN',
      slot: 1_000,
      quoteValiditySeconds: 30,
      riskVerdictRef: null,
    });
    expect(result.quote).toMatchObject({
      amountInRaw: '1500000000',
      amountIn: 1.5,
      amountOutRaw: '250000000',
      amountOut: 250,
      minimumOutRaw: '249000000',
      contextSlot: 999,
      route: [{ label: 'Meteora DLMM', percent: 100 }],
    });
    expect(result.transaction).toMatchObject({
      base64: 'A'.repeat(200),
      lastValidBlockHeight: 1_234,
      signatureRequired: 'user',
    });
    expect(result.quoteExpiresAt).toBe(new Date(NOW + 30_000).toISOString());
  });

  it('classifies a pair with no route as MARKET_NOT_FOUND', async () => {
    const noRouteFetcher = (url: RequestInfo | URL, init?: RequestInit) => {
      if (String(url).startsWith('https://api.jup.ag')) {
        return Promise.resolve(
          jsonResponse({ error: 'Could not find any route', errorCode: 'NO_ROUTE' }, 400)
        );
      }
      return rpcFetcher(url, init);
    };

    await expectCode(
      prepareSolanaJupiterSwap(BASE_REQUEST, {
        apiKey: 'test-key',
        endpoints: ['https://solana.example'],
        fetcher: noRouteFetcher as typeof fetch,
        nowMs: NOW,
        timeoutMs: 1_000,
      }),
      'MARKET_NOT_FOUND'
    );
  });

  it('classifies an upstream timeout as UPSTREAM_UNAVAILABLE', async () => {
    const timeoutFetcher = (url: RequestInfo | URL, init?: RequestInit) => {
      if (String(url).startsWith('https://api.jup.ag')) {
        return new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'));
          });
        });
      }
      return rpcFetcher(url, init);
    };

    await expectCode(
      prepareSolanaJupiterSwap(BASE_REQUEST, {
        apiKey: 'test-key',
        endpoints: ['https://solana.example'],
        fetcher: timeoutFetcher as typeof fetch,
        nowMs: NOW,
        timeoutMs: 100,
      }),
      'UPSTREAM_UNAVAILABLE'
    );
  });

  it('rejects slippage above the caller ceiling as UNSUPPORTED', async () => {
    const fetcher = jest.fn();

    await expectCode(
      prepareSolanaJupiterSwap(
        { ...BASE_REQUEST, slippageBps: 500, maxSlippageBps: 100 },
        { apiKey: 'test-key', endpoints: ['https://solana.example'], fetcher: fetcher as never }
      ),
      'UNSUPPORTED'
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('rejects exact-output direction as UNSUPPORTED before any upstream call', async () => {
    const fetcher = jest.fn();

    await expectCode(
      prepareSolanaJupiterSwap(
        { ...BASE_REQUEST, direction: 'exact-out' },
        { apiKey: 'test-key', endpoints: ['https://solana.example'], fetcher: fetcher as never }
      ),
      'UNSUPPORTED'
    );
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('forwards a blocking guard verdict instead of building a transaction', async () => {
    const fetcher = jest.fn();
    const result = await prepareSolanaJupiterSwap(
      {
        ...BASE_REQUEST,
        riskVerdict: {
          source: 'solana_swap_guard',
          verdict: 'BLOCK',
          reasons: ['oracle divergence above the reviewed band'],
        },
      },
      { apiKey: 'test-key', endpoints: ['https://solana.example'], fetcher: fetcher as never }
    );

    expect(result.verdict).toBe('BLOCK');
    expect(result.transaction).toBeNull();
    expect(result.quote).toBeNull();
    expect(result.blockingReasons.join(' ')).toMatch(/oracle divergence/);
    expect(result.riskVerdictRef?.verdict).toBe('BLOCK');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('treats a CAUTION guard verdict as blocking instead of building a transaction', async () => {
    const fetcher = jest.fn();
    const result = await prepareSolanaJupiterSwap(
      {
        ...BASE_REQUEST,
        riskVerdict: {
          source: 'solana_jupiter_swap_guard',
          verdict: 'CAUTION',
          reasons: ['PRICE_IMPACT_REQUIRES_REVIEW: 0.6%'],
        },
      },
      { apiKey: 'test-key', endpoints: ['https://solana.example'], fetcher: fetcher as never }
    );

    expect(result.verdict).toBe('BLOCK');
    expect(result.transaction).toBeNull();
    expect(result.quote).toBeNull();
    expect(result.blockingReasons.join(' ')).toMatch(/PRICE_IMPACT_REQUIRES_REVIEW/);
    expect(result.riskVerdictRef?.verdict).toBe('CAUTION');
    expect(fetcher).not.toHaveBeenCalled();
  });
});
