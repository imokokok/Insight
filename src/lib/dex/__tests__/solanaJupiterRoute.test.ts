import {
  assertSolanaJupiterRouteProfile,
  getSolanaJupiterRouteSnapshot,
  SOLANA_USDC,
  SOLANA_WRAPPED_SOL,
  solanaJupiterSolUsdcProfile,
} from '../solanaJupiterRoute';

const MAINNET_GENESIS_HASH = '5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d';

function jsonResponse(body: unknown, ok = true): Response {
  return { ok, json: async () => body } as Response;
}

function fetcher(url: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const value = String(url);
  if (value === 'https://solana.example') {
    const request = JSON.parse(String(init?.body)) as { method: string };
    if (request.method === 'getGenesisHash')
      return Promise.resolve(jsonResponse({ result: MAINNET_GENESIS_HASH }));
    if (request.method === 'getSlot') return Promise.resolve(jsonResponse({ result: 1_000 }));
  }
  const parsed = new URL(value);
  const amount = parsed.searchParams.get('amount');
  if (parsed.hostname === 'api.jup.ag' && amount) {
    const outAmount = (BigInt(amount) / 1_000n).toString();
    return Promise.resolve(
      jsonResponse({
        inputMint: SOLANA_WRAPPED_SOL,
        outputMint: SOLANA_USDC,
        inAmount: amount,
        outAmount,
        otherAmountThreshold: (BigInt(outAmount) - 1n).toString(),
        swapMode: 'ExactIn',
        slippageBps: 50,
        priceImpactPct: '0.42',
        contextSlot: 999,
        routePlan: [
          {
            swapInfo: {
              ammKey: '5BKxfWMbmYBAEWvyPZS9esPducUba9GqyMjtLCfbaqyF',
              label: 'Meteora DLMM',
              inputMint: SOLANA_WRAPPED_SOL,
              outputMint: SOLANA_USDC,
              inAmount: amount,
              outAmount,
            },
            percent: 100,
          },
        ],
      })
    );
  }
  throw new Error(`unexpected URL ${value}`);
}

describe('Solana Jupiter route evidence', () => {
  it('pins the SOL/USDC route profile to wrapped SOL and canonical USDC', () => {
    expect(solanaJupiterSolUsdcProfile()).toMatchObject({
      id: 'solana-jupiter-sol-usdc',
      market: 'SOL/USDC',
      input: { mint: SOLANA_WRAPPED_SOL, decimals: 9 },
      output: { mint: SOLANA_USDC, decimals: 6 },
      quoteAmountsRaw: ['1000000000', '10000000000', '100000000000'],
    });
  });

  it('returns a validated, mainnet-bound exact-input quote ladder', async () => {
    const snapshot = await getSolanaJupiterRouteSnapshot(solanaJupiterSolUsdcProfile(), {
      apiKey: 'test-key',
      endpoints: ['https://solana.example'],
      fetcher,
      nowMs: Date.now(),
    });

    expect(snapshot).toMatchObject({
      source: 'dex-route',
      venue: 'jupiter',
      network: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      market: 'SOL/USDC',
      finalizedSlot: 1_000,
    });
    expect(snapshot.quotes).toHaveLength(3);
    expect(snapshot.quotes[0]).toMatchObject({
      amountInRaw: '1000000000',
      amountIn: 1,
      amountOutRaw: '1000000',
      amountOut: 1,
      effectiveOutputPerInput: 1,
      contextSlot: 999,
      priceImpactPct: 0.42,
    });
    expect(snapshot.quotes[0]?.route[0]).toMatchObject({ label: 'Meteora DLMM', percent: 100 });
  });

  it('rejects an invalid raw quote ladder before it can reach Jupiter', () => {
    expect(() =>
      assertSolanaJupiterRouteProfile({
        ...solanaJupiterSolUsdcProfile(),
        quoteAmountsRaw: ['1000000000', '1000000000'],
      })
    ).toThrow('unordered quote ladder');
  });

  it('requires the server-side Jupiter credential', async () => {
    await expect(
      getSolanaJupiterRouteSnapshot(solanaJupiterSolUsdcProfile(), {
        endpoints: ['https://solana.example'],
        fetcher,
        nowMs: Date.now(),
      })
    ).rejects.toThrow('not configured');
  });
});
