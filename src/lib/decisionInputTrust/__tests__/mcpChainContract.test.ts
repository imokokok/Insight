/**
 * End-to-end contract tests for chain-scoped MCP inputs.
 *
 * These exercise the real dispatch → alias → product → implementation path so
 * that a dropped `chain`/`chain_id` cannot quietly turn a chain-scoped read
 * into a cross-chain aggregate, and so that unsupported execution chains are
 * classified `unavailable` (zero billing) instead of delivered prose.
 */

import {
  getConsensusPrice,
  type ConsensusPriceResponse,
  type ConsensusProviderPrice,
} from '@/lib/api/services/consensusPriceService';
import { fetchHistoricalOracleState } from '@/lib/api/services/oracleWatchHistory';
import { clearOracleWatchCache } from '@/lib/api/services/oracleWatchService';
import { assessProductOutcome } from '@/lib/billing/exemptions';
import { computeMarketReferenceContext } from '@/lib/marketReference/client';
import { scorePreTradeMultiHorizon } from '@/lib/ml/inference';
import { executeTool } from '@/mcp/tools';
import type { McpToolCallResult } from '@/mcp/tools/types';

jest.mock('@/lib/api/services/consensusPriceService', () => ({
  getConsensusPrice: jest.fn(),
}));

jest.mock('@/lib/api/services/oracleWatchAudit', () => ({
  recordOracleWatchCheck: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/attestations/oracleWatchAttestation', () => ({
  signWatchAttestation: jest.fn().mockResolvedValue(null),
}));

jest.mock('@/lib/ml/inference', () => ({
  ...jest.requireActual('@/lib/ml/inference'),
  scorePreTradeMultiHorizon: jest.fn(),
}));

jest.mock('@/lib/marketReference/client', () => ({
  computeMarketReferenceContext: jest.fn(),
}));

jest.mock('@/lib/api/services/oracleWatchHistory', () => ({
  fetchHistoricalOracleState: jest.fn(),
}));

const mockGetConsensusPrice = getConsensusPrice as jest.MockedFunction<typeof getConsensusPrice>;
const mockScoreMl = scorePreTradeMultiHorizon as jest.MockedFunction<
  typeof scorePreTradeMultiHorizon
>;
const mockMarketContext = computeMarketReferenceContext as jest.MockedFunction<
  typeof computeMarketReferenceContext
>;
const mockFetchHistorical = fetchHistoricalOracleState as jest.MockedFunction<
  typeof fetchHistoricalOracleState
>;

const EMPTY_STATE = {
  history: [],
  deviationVelocity1h: 0,
  deviationVelocity3h: 0,
  participantCountDelta1h: 0,
  rollingVolatility6h: 0,
  maxDeviationZscore24h: 0,
};

function makeProvider(overrides: Partial<ConsensusProviderPrice> = {}): ConsensusProviderPrice {
  return {
    provider: 'chainlink',
    symbol: 'BTC',
    price: 60000,
    deviationPct: 0.01,
    isOutlier: false,
    confidence: null,
    timestamp: Date.now(),
    dataAgeSeconds: 5,
    countsTowardOracleQuorum: true,
    reputationScore: null,
    status: 'success',
    isStale: false,
    ...overrides,
  };
}

function makeResponse(overrides: Partial<ConsensusPriceResponse> = {}): ConsensusPriceResponse {
  return {
    symbol: 'BTC',
    chain: 'hyperevm' as ConsensusPriceResponse['chain'],
    consensusPrice: 60000,
    method: 'median',
    recommendedMethod: 'median',
    confidence: 1,
    confidenceLevel: 'high',
    agreement: 0.99,
    participantCount: 1,
    excludedCount: 0,
    excludedProviders: [],
    priceRange: { min: 59900, max: 60100 },
    methodResults: [],
    providers: [makeProvider()],
    recommendedProvider: 'chainlink',
    ...overrides,
  };
}

function textOf(result: McpToolCallResult): string {
  return result.content.map((item) => item.text).join('\n');
}

beforeEach(() => {
  mockGetConsensusPrice.mockReset();
  clearOracleWatchCache();
  mockScoreMl.mockReturnValue({ combined: 0.15, score1h: 0.1, score6h: 0.15 });
  mockMarketContext.mockReset();
  mockMarketContext.mockResolvedValue(null);
  mockFetchHistorical.mockReset();
  mockFetchHistorical.mockResolvedValue(EMPTY_STATE);
});

describe('numeric chain_id on chain-name branches', () => {
  it.each([
    ['oracle_watch', { symbol: 'BTC', chain_id: 999 }],
    ['get_price_analytics', { assets: ['BTC'], chain_id: 999 }],
    ['oracle_watch_window', { op: 'begin', symbol: 'BTC', chain_id: 999 }],
    ['position_lifecycle', { op: 'begin', symbol: 'BTC', chain_id: 999 }],
  ])('%s rejects chain_id with a structured error instead of dropping it', async (name, args) => {
    const result = await executeTool(name, args);

    expect(result.isError).toBe(true);
    const body = JSON.parse(textOf(result)) as {
      error: {
        code: string;
        tool: string;
        field: string;
        op: string | null;
        hint: string;
      };
    };
    expect(body.error).toMatchObject({
      code: 'unknown_field',
      tool: name,
      field: 'chain_id',
    });
    expect(body.error.op).not.toBeNull();
    expect(body.error.hint).toContain('"chain"');

    // Structured validation errors carry no decision marker, so nothing is billed.
    expect(assessProductOutcome(textOf(result)).outcome).toBeNull();
    expect(mockGetConsensusPrice).not.toHaveBeenCalled();
  });
});

describe('chain 999 (hyperevm) data-plane behaviour', () => {
  it('oracle_watch keeps the chain filter and returns DANGER / insufficient_cross_oracle_quorum', async () => {
    mockGetConsensusPrice.mockResolvedValue(makeResponse({ participantCount: 1 }));

    const result = await executeTool('oracle_watch', { symbol: 'BTC', chain: 'hyperevm' });

    expect(result.isError).toBeFalsy();
    const text = textOf(result);
    expect(text).toContain('**Oracle Watch: BTC** on hyperevm');
    expect(text).toContain('- Verdict: DANGER');
    expect(text).toContain('- Reason: insufficient_cross_oracle_quorum');
    expect(text).toContain('(quorum NOT met)');

    // The chain must reach the provider resolver; an undefined chain would
    // aggregate every chain and could report a healthy verdict.
    expect(mockGetConsensusPrice.mock.calls[0]?.[0]).toBe('BTC');
    expect(mockGetConsensusPrice.mock.calls[0]?.[1]).toBe('hyperevm');
  });

  it('get_price_analytics reports participantCount for chain 999 without widening to all chains', async () => {
    mockGetConsensusPrice.mockResolvedValue(
      makeResponse({
        participantCount: 2,
        excludedCount: 0,
        providers: [makeProvider({ provider: 'chainlink' }), makeProvider({ provider: 'pyth' })],
      })
    );

    const result = await executeTool('get_price_analytics', { assets: ['BTC'], chain: 'hyperevm' });

    expect(result.isError).toBeFalsy();
    const text = textOf(result);
    expect(text).toContain('**Consensus price for BTC**');
    expect(text).toContain('- Chain: hyperevm');
    expect(text).toContain('- Participants: 2 (0 excluded)');
    expect(mockGetConsensusPrice.mock.calls[0]?.[0]).toBe('BTC');
    expect(mockGetConsensusPrice.mock.calls[0]?.[1]).toBe('hyperevm');
  });

  it.each(['swap', 'vault_deposit', 'repay'] as const)(
    'check_trade_safety action=%s is not integrated on chain 999',
    async (action) => {
      const result = await executeTool('check_trade_safety', { chain_id: 999, action });

      expect(result.isError).toBe(true);
      const text = textOf(result);
      expect(text).toContain('[unavailable:not_integrated]');
      expect(text).toContain('Direct HyperLend Core supply/borrow');
      expect(assessProductOutcome(text).outcome).toBe('unavailable');
    }
  );

  it.each(['open_perp', 'close_perp'] as const)(
    'check_trade_safety action=%s stays ecosystem_absent on chain 999 (perps execute on HyperCore)',
    async (action) => {
      const result = await executeTool('check_trade_safety', { chain_id: 999, action });

      expect(result.isError).toBe(true);
      const text = textOf(result);
      expect(text).toContain('[unavailable:ecosystem_absent]');
      expect(text).toContain('HyperCore');
      expect(assessProductOutcome(text).outcome).toBe('unavailable');
    }
  );

  it.each(['check_position', 'check_liquidation'] as const)(
    'check_trade_safety action=%s stays ecosystem_absent on chain 999 (no position surface)',
    async (action) => {
      const result = await executeTool('check_trade_safety', { chain_id: 999, action });

      expect(result.isError).toBe(true);
      const text = textOf(result);
      expect(text).toContain('[unavailable:ecosystem_absent]');
      expect(assessProductOutcome(text).outcome).toBe('unavailable');
    }
  );

  it.each(['lend', 'borrow'] as const)(
    'check_trade_safety action=%s reaches the HyperLend guard on chain 999 and demands protocol_id',
    async (action) => {
      const result = await executeTool('check_trade_safety', { chain_id: 999, action });

      expect(result.isError).toBe(true);
      const text = textOf(result);
      expect(text).toContain('"protocol_id" is required for lending/borrowing actions');
      expect(text).not.toContain('ecosystem_absent');
    }
  );
});

describe('trade_proof begin_evidence route quotes', () => {
  it.each([
    ['trade_proof', { op: 'begin_evidence' }],
    ['begin_trade_evidence', {}],
  ])('%s refuses a non-mainnet chain as unavailable before billing', async (name, extra) => {
    const result = await executeTool(name, {
      ...extra,
      asset: 'ETH',
      destination_asset: 'USDC',
      chain_id: 8453,
      action: 'swap',
      amount_usd: 1000,
      max_slippage_bps: 50,
      decision_input: {},
    });

    expect(result.isError).toBe(true);
    const text = textOf(result);
    expect(text).toContain('[unavailable:unsupported_chain]');
    expect(text).toContain('chain_id 8453');
    expect(text).toContain('chain_id 1');

    const assessment = assessProductOutcome(text);
    expect(assessment.outcome).toBe('unavailable');
    expect(assessment.downgradedFromRejected).toBe(false);
    // The guard runs before the handler, so no provider or quote work happened.
    expect(mockGetConsensusPrice).not.toHaveBeenCalled();
  });
});
