/**
 * @jest-environment node
 */

import { routeCheckTradeSafety, routeMarketQuote, routePrepareSwap } from '../adapters';
import {
  CheckTradeSafetyInputSchema,
  GetMarketQuoteInputSchema,
  PrepareSwapInputSchema,
} from '../schemas';

const mockCallLegacy = jest.fn(async (name: string) => `legacy:${name}`);
jest.mock('../runtime', () => ({
  callLegacy: (name: string, args: unknown, context: unknown) =>
    mockCallLegacy(name, args, context),
}));

const mockQuoteSolanaJupiterSwap = jest.fn();
const mockPrepareSolanaJupiterSwap = jest.fn();
jest.mock('@/lib/dex/solanaJupiterSwap', () => {
  class SolanaJupiterSwapError extends Error {
    constructor(
      readonly code: string,
      message: string
    ) {
      super(message);
    }
  }
  return {
    SolanaJupiterSwapError,
    quoteSolanaJupiterSwap: (...args: unknown[]) => mockQuoteSolanaJupiterSwap(...args),
    prepareSolanaJupiterSwap: (...args: unknown[]) => mockPrepareSolanaJupiterSwap(...args),
  };
});

const mockAssessSolanaJupiterSwapGuard = jest.fn();
jest.mock('@/lib/dex/solanaJupiterSwapGuard', () => ({
  assessSolanaJupiterSwapGuard: (...args: unknown[]) => mockAssessSolanaJupiterSwapGuard(...args),
}));

const BASE58_WALLET = '11111111111111111111111111111111';

function jupiterArgs() {
  return PrepareSwapInputSchema.parse({
    venue: 'solana_jupiter',
    input_mint: 'So11111111111111111111111111111111111111112',
    output_mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    amount_in: '1',
    max_slippage_bps: 50,
    wallet: BASE58_WALLET,
    source_decision_price_usd: 250,
  });
}

function jupiterQuote(overrides: Record<string, unknown> = {}) {
  return {
    quote: {
      amountInRaw: '1000000000',
      amountOutRaw: '250000000',
      minimumOutRaw: '249000000',
      priceImpactPct: 0.01,
      slippageBps: 50,
      contextSlot: 1,
      quotedAt: '2026-11-08T00:00:00.000Z',
      route: [{ ammKey: 'pool-1', label: 'Orca', inputMint: 'in', outputMint: 'out' }],
      ...overrides,
    },
    raw: { quote: 'raw' },
    finalizedSlot: 100,
    quoteTtlSeconds: 30,
  };
}

beforeEach(() => {
  // jest.config sets resetMocks: true, so implementations are reattached here.
  jest.clearAllMocks();
  mockCallLegacy.mockImplementation(async (name: string) => `legacy:${name}`);
});

describe('routeCheckTradeSafety chain gate', () => {
  it('refuses HyperEVM 999 before any position protocol branch', async () => {
    for (const action of ['check_position', 'check_liquidation'] as const) {
      await expect(
        routeCheckTradeSafety(CheckTradeSafetyInputSchema.parse({ chain_id: 999, action }))
      ).rejects.toThrow('[unavailable:ecosystem_absent]');
    }
    expect(mockCallLegacy).not.toHaveBeenCalled();
  });

  it('refuses a non-lending chain instead of falling back to the Base model', async () => {
    await expect(
      routeCheckTradeSafety(
        CheckTradeSafetyInputSchema.parse({ chain_id: 1, action: 'check_position' })
      )
    ).rejects.toThrow('[unavailable:not_integrated]');
    expect(mockCallLegacy).not.toHaveBeenCalled();
  });

  it('still enters the Base lending branch for 8453', async () => {
    await expect(
      routeCheckTradeSafety(
        CheckTradeSafetyInputSchema.parse({ chain_id: 8453, action: 'check_position' })
      )
    ).rejects.toThrow('"protocol_id" is required');
  });
});

describe('get_market_quote venue routing', () => {
  it('routes base_uniswap_v3 to its real legacy implementation', async () => {
    const text = await routeMarketQuote(
      GetMarketQuoteInputSchema.parse({ venue: 'base_uniswap_v3' })
    );
    expect(text).toBe('legacy:get_base_dex_market');
    expect(mockCallLegacy).toHaveBeenCalledWith('get_base_dex_market', {}, undefined);
  });
});

describe('Jupiter swap wiring', () => {
  it('returns a structured unavailable verdict for an unreviewed route without building', async () => {
    mockQuoteSolanaJupiterSwap.mockResolvedValue(jupiterQuote());
    mockAssessSolanaJupiterSwapGuard.mockResolvedValue({
      verdict: 'BLOCK',
      status: 'blocked',
      productOutcome: 'unavailable',
      executable: false,
      reasons: ['COVERAGE_INTEGRATED_NOT_REVIEWED_pool:pool-2'],
      riskVerdictRef: { verdict: 'BLOCK' },
    });

    await expect(routePrepareSwap(jupiterArgs())).rejects.toThrow(
      '[unavailable:integrated_not_reviewed]'
    );
    expect(mockPrepareSolanaJupiterSwap).not.toHaveBeenCalled();
  });

  it('rejects a guard-blocked decision without building', async () => {
    mockQuoteSolanaJupiterSwap.mockResolvedValue(jupiterQuote());
    mockAssessSolanaJupiterSwapGuard.mockResolvedValue({
      verdict: 'BLOCK',
      status: 'blocked',
      productOutcome: 'rejected',
      executable: false,
      reasons: ['PRICE_IMPACT_ABOVE_LIMIT'],
      riskVerdictRef: { verdict: 'BLOCK' },
    });

    await expect(routePrepareSwap(jupiterArgs())).rejects.toThrow('[rejected:invalid_request]');
    expect(mockPrepareSolanaJupiterSwap).not.toHaveBeenCalled();
  });

  it('builds only when executable and passes the risk verdict and quote through', async () => {
    const preparedQuote = jupiterQuote();
    const riskVerdictRef = { verdict: 'PASS', quoteDigest: '0xdigest' };
    mockQuoteSolanaJupiterSwap.mockResolvedValue(preparedQuote);
    mockAssessSolanaJupiterSwapGuard.mockResolvedValue({
      verdict: 'PASS',
      status: 'clear',
      productOutcome: 'approved',
      executable: true,
      reasons: [],
      riskVerdictRef,
    });
    mockPrepareSolanaJupiterSwap.mockResolvedValue({ transaction: { base64: 'tx' } });

    const text = await routePrepareSwap(jupiterArgs());
    const body = JSON.parse(text);
    expect(body.state).toBe('READY');
    expect(body.guard.executable).toBe(true);
    expect(body.guard.risk_verdict_ref).toEqual(riskVerdictRef);
    expect(body.swap).toEqual({ transaction: { base64: 'tx' } });

    expect(mockPrepareSolanaJupiterSwap).toHaveBeenCalledTimes(1);
    const [request, options] = mockPrepareSolanaJupiterSwap.mock.calls[0];
    expect(request.riskVerdict).toEqual(riskVerdictRef);
    expect(options.preparedQuote).toBe(preparedQuote);
  });
});
