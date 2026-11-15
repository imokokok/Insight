/**
 * Tokenized Stock Guard unit tests: pure policy rules, upstream fail-closed
 * behavior, and the EIP-712 decision attestation round-trip. Upstream HTTP is
 * injected via a fake fetchImpl; the clock is injected as a fixed Date.
 */

import { privateKeyToAccount } from 'viem/accounts';

import {
  assessTokenizedStockGuard,
  evaluateTokenizedStockRequest,
  TokenizedStockGuardInputSchema,
} from '../tokenizedStockGuard';
import {
  createTokenizedStockGuardDecision,
  tokenizedStockGuardDecisionHash,
  verifyTokenizedStockGuardDecision,
} from '../tokenizedStockGuardAttestation';
import { createTokenizedStocksClient, TokenizedStocksClientError } from '../tokenizedStocksClient';

import type { TokenizedStockQuote } from '../tokenizedStocksClient';

const SUNDAY_NOON = new Date('2026-11-15T16:10:00Z'); // US market closed (weekend)
const WEDNESDAY_SESSION = new Date('2026-11-18T15:00:00Z'); // US market open (EDT)

function quote(overrides: Partial<TokenizedStockQuote> = {}): TokenizedStockQuote {
  return {
    symbol: 'TSLAc',
    contractAddress: '0xabc0000000000000000000000000000000000001',
    navPrice: 412.5,
    navPriceUpdatedAt: '2026-11-13T21:03:00Z',
    multiplier: 1,
    pausedFeatures: [],
    ...overrides,
  };
}

function input(overrides: Record<string, unknown> = {}) {
  return TokenizedStockGuardInputSchema.parse({
    asset: 'TSLAc',
    action: 'borrow',
    tradeAmountUsd: 10000,
    ...overrides,
  });
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

describe('evaluateTokenizedStockRequest', () => {
  it('blocks settlement-sensitive actions against an off-hours frozen reference', () => {
    const result = evaluateTokenizedStockRequest({
      action: 'borrow',
      tradeAmountUsd: 10000,
      quote: quote(),
      now: SUNDAY_NOON,
    });
    expect(result.verdict).toBe('BLOCK');
    expect(result.actionability).toBe('DO_NOT_USE');
    expect(result.reasons).toContain('NAV_FROZEN_SETTLEMENT_FORBIDDEN');
  });

  it('returns WAIT (trade-only) for non-settlement actions off-hours', () => {
    const result = evaluateTokenizedStockRequest({
      action: 'swap',
      tradeAmountUsd: 10000,
      quote: quote(),
      now: SUNDAY_NOON,
    });
    expect(result.verdict).toBe('WAIT');
    expect(result.actionability).toBe('TRADE_ONLY');
    expect(result.reasons).toContain('NAV_FROZEN_OFF_HOURS_TRADE_ONLY');
    expect(result.advisories).toContain('OFF_HOURS_FEED_HOLDING_LAST_VALUE');
  });

  it('allows a fresh in-session reference with a matching decision price', () => {
    const result = evaluateTokenizedStockRequest({
      action: 'swap',
      tradeAmountUsd: 10000,
      decisionPriceUsd: 412.5,
      quote: quote({ navPriceUpdatedAt: '2026-11-18T14:59:00Z' }),
      now: WEDNESDAY_SESSION,
    });
    expect(result.verdict).toBe('ALLOW');
    expect(result.actionability).toBe('SETTLEMENT_SAFE');
    expect(result.reasons).toHaveLength(0);
  });

  it('blocks a caller price that deviates beyond tolerance (Moonwell class)', () => {
    const result = evaluateTokenizedStockRequest({
      action: 'borrow',
      tradeAmountUsd: 5_000_000,
      decisionPriceUsd: 16500, // 40x the 412.5 reference
      quote: quote({ navPriceUpdatedAt: '2026-11-18T14:59:00Z' }),
      now: WEDNESDAY_SESSION,
    });
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons).toContain('PRICE_DEVIATION_EXCEEDS_TOLERANCE');
    expect(result.reference.deviationBps).toBeGreaterThan(1000);
  });

  it('advises when the caller price matches the raw NAV but not the multiplier-adjusted reference', () => {
    const result = evaluateTokenizedStockRequest({
      action: 'swap',
      tradeAmountUsd: 10000,
      // NAV 350 x multiplier 1.25 = reference 437.5; the caller price 350
      // matches the unadjusted NAV but deviates 2000 bps from the reference.
      decisionPriceUsd: 350,
      quote: quote({ navPrice: 350, multiplier: 1.25, navPriceUpdatedAt: '2026-11-18T14:59:00Z' }),
      now: WEDNESDAY_SESSION,
    });
    expect(result.reasons).toContain('PRICE_DEVIATION_EXCEEDS_TOLERANCE');
    expect(result.advisories).toContain(
      'DECISION_PRICE_MATCHES_UNADJUSTED_NAV_MULTIPLIER_NOT_APPLIED'
    );
    expect(result.advisories).toContain('MULTIPLIER_TOTAL_RETURN_ADJUSTED');
  });

  it('treats a missing NAV as NOT_PRICEABLE, not zero', () => {
    const result = evaluateTokenizedStockRequest({
      action: 'borrow',
      tradeAmountUsd: 10000,
      quote: quote({ navPrice: null }),
      now: SUNDAY_NOON,
    });
    expect(result.verdict).toBe('NOT_PRICEABLE');
    expect(result.actionability).toBe('NO_PRICE');
    expect(result.reasons).toContain('NAV_ABSENT');
  });

  it('blocks a stale feed while the market is open (heartbeat violated)', () => {
    const result = evaluateTokenizedStockRequest({
      action: 'swap',
      tradeAmountUsd: 10000,
      quote: quote({ navPriceUpdatedAt: '2026-11-17T12:00:00Z' }), // > 24h old in-session
      now: WEDNESDAY_SESSION,
    });
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons).toContain('NAV_STALE_DURING_MARKET_HOURS');
  });

  it('flags paused features', () => {
    const result = evaluateTokenizedStockRequest({
      action: 'swap',
      tradeAmountUsd: 10000,
      quote: quote({ pausedFeatures: ['transfers'], navPriceUpdatedAt: '2026-11-18T14:59:00Z' }),
      now: WEDNESDAY_SESSION,
    });
    expect(result.reasons).toContain('PAUSED_FEATURES_PRESENT');
    expect(result.verdict).toBe('BLOCK');
  });
});

describe('assessTokenizedStockGuard', () => {
  const clientWith = (q: TokenizedStockQuote | null) => ({
    getQuote: async () => q,
  });

  it('is fail-closed when the issuer directory is unavailable', async () => {
    const failingClient = {
      getQuote: async (): Promise<TokenizedStockQuote> => {
        throw new TokenizedStocksClientError('directory request failed');
      },
    };
    const result = await assessTokenizedStockGuard(input(), {
      now: SUNDAY_NOON,
      client: failingClient,
    });
    expect(result.verdict).toBe('BLOCK');
    expect(result.reasons).toContain('REFERENCE_SOURCE_UNAVAILABLE');
    expect(result.dataSource.status).toBe('unavailable');
  });

  it('returns NOT_PRICEABLE for a token outside the issuer directory', async () => {
    const result = await assessTokenizedStockGuard(input({ asset: 'ZZZZ' }), {
      now: SUNDAY_NOON,
      client: clientWith(null),
    });
    expect(result.verdict).toBe('NOT_PRICEABLE');
    expect(result.reasons).toContain('TOKEN_NOT_IN_ISSUER_DIRECTORY');
  });

  it('evaluates a live quote end to end', async () => {
    const result = await assessTokenizedStockGuard(input({ action: 'swap' }), {
      now: SUNDAY_NOON,
      client: clientWith(quote()),
    });
    expect(result.schema).toBe('insight.tokenized-stock-guard.v1');
    expect(result.verdict).toBe('WAIT');
    expect(result.dataSource.status).toBe('live');
    expect(result.dataSource.symbol).toBe('TSLAc');
    expect(result.limitations.join(' ')).toContain('single-source');
  });
});

describe('tokenizedStocksClient', () => {
  function fetchWithPages(pages: Array<{ tokens: unknown[]; next_page_token?: string }>) {
    const calls: string[] = [];
    const fetchImpl = ((url: string) => {
      calls.push(url);
      const page = pages[calls.length - 1];
      if (!page) throw new Error('unexpected extra page request');
      return Promise.resolve(jsonResponse(page));
    }) as unknown as typeof fetch;
    return { fetchImpl, calls };
  }

  it('paginates and resolves a case-insensitive quote', async () => {
    const { fetchImpl, calls } = fetchWithPages([
      { tokens: [{ symbol: 'AAPLc' }], next_page_token: 'p2' },
      {
        tokens: [
          {
            symbol: 'TSLAc',
            nav_price: '412.5',
            nav_price_updated_at: '2026-11-13T21:03:00Z',
            multiplier: 1,
          },
        ],
      },
    ]);
    const client = createTokenizedStocksClient({ fetchImpl, cacheMs: 60_000, now: () => 0 });
    const q = await client.getQuote('tslac');
    expect(q?.navPrice).toBe(412.5);
    expect(calls).toHaveLength(2);
    expect(calls[0]).toContain('page_size=500');
    expect(calls[1]).toContain('page_token=p2');
  });

  it('serves repeat lookups from the TTL cache', async () => {
    const { fetchImpl, calls } = fetchWithPages([
      { tokens: [{ symbol: 'TSLAc', nav_price: 412.5 }] },
    ]);
    const client = createTokenizedStocksClient({ fetchImpl, cacheMs: 60_000, now: () => 0 });
    await client.getQuote('TSLAc');
    await client.getQuote('TSLAc');
    expect(calls).toHaveLength(1);
  });

  it('throws a client error on HTTP failure (never a silent pass)', async () => {
    const fetchImpl = (() =>
      Promise.resolve(new Response('nope', { status: 503 }))) as unknown as typeof fetch;
    const client = createTokenizedStocksClient({ fetchImpl, now: () => 0 });
    await expect(client.getQuote('TSLAc')).rejects.toBeInstanceOf(TokenizedStocksClientError);
  });
});

describe('tokenizedStockGuardAttestation', () => {
  // A real throwaway key so the EIP-712 sign -> verify round-trip is genuine.
  const account = privateKeyToAccount(
    '0x0000000000000000000000000000000000000000000000000000000000000001'
  );
  const realSigner = {
    address: account.address,
    signTypedData: (args: unknown) =>
      account.signTypedData(args as Parameters<typeof account.signTypedData>[0]),
  };

  it('round-trips a signed decision through the public verifier', async () => {
    const guard = await assessTokenizedStockGuard(input({ action: 'swap' }), {
      now: SUNDAY_NOON,
      client: { getQuote: async () => quote() },
    });
    const decision = await createTokenizedStockGuardDecision(guard, {
      signer: realSigner,
      trustAttester: async () => true,
      now: () => 1_700_000_000,
      verifyUrl: 'https://www.oracleinsight.xyz/api/v1/safety/tokenized-stock-guard/verify',
    });
    expect(decision.attestation).not.toBeNull();
    expect(decision.decisionHash).toBe(tokenizedStockGuardDecisionHash(guard));

    const verification = await verifyTokenizedStockGuardDecision(
      JSON.parse(JSON.stringify(decision)),
      {
        now: () => 1_700_000_100,
        trustAttester: async () => true,
      }
    );
    expect(verification.valid).toBe(true);
    expect(verification.hashMatches).toBe(true);
    expect(verification.signatureValid).toBe(true);
  });

  it('returns a null attestation without a configured signer (non-breaking)', async () => {
    const guard = await assessTokenizedStockGuard(input({ action: 'swap' }), {
      now: SUNDAY_NOON,
      client: { getQuote: async () => quote() },
    });
    const decision = await createTokenizedStockGuardDecision(guard, { signer: null });
    expect(decision.attestation).toBeNull();
    const verification = await verifyTokenizedStockGuardDecision(decision);
    expect(verification.valid).toBe(false);
    expect(verification.reason).toContain('no attestation');
  });

  it('rejects a tampered guard result', async () => {
    const guard = await assessTokenizedStockGuard(input({ action: 'swap' }), {
      now: SUNDAY_NOON,
      client: { getQuote: async () => quote() },
    });
    const decision = await createTokenizedStockGuardDecision(guard, {
      signer: realSigner,
      trustAttester: async () => true,
    });
    const tampered = JSON.parse(JSON.stringify(decision));
    tampered.guard.verdict = 'ALLOW';
    const verification = await verifyTokenizedStockGuardDecision(tampered, {
      trustAttester: async () => true,
    });
    expect(verification.valid).toBe(false);
    expect(verification.reason).toContain('hash');
  });
});
