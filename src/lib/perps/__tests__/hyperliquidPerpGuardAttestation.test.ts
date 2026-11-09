import { privateKeyToAccount } from 'viem/accounts';

import { assessHyperliquidPerpGuard } from '../hyperliquidPerpGuard';
import {
  bindHyperliquidPerpExactOrder,
  hyperliquidPerpOrderIntentHash,
} from '../hyperliquidPerpGuardAction';
import {
  createHyperliquidPerpGuardDecision,
  hyperliquidPerpGuardDecisionHash,
  verifyHyperliquidPerpGuardDecision,
} from '../hyperliquidPerpGuardAttestation';

const NOW_MS = 1_792_252_800_000;

const signer = privateKeyToAccount(`0x${'22'.repeat(32)}`);
const deps = {
  signer,
  now: () => 1_792_252_800,
  verifyUrl: 'https://www.oracleinsight.xyz/api/v1/safety/hyperliquid-perp-guard/verify',
  trustAttester: async (address: string) => address.toLowerCase() === signer.address.toLowerCase(),
};

function orderEnvelope(overrides: Record<string, unknown> = {}) {
  return {
    action: {
      type: 'order',
      orders: [
        {
          a: 0,
          b: true,
          p: '50000',
          s: '0.5',
          r: false,
          t: { limit: { tif: 'Ioc' } },
          c: `0x${'ab'.repeat(16)}`,
        },
      ],
      grouping: 'na',
    },
    expiresAfter: NOW_MS + 30_000,
    ...overrides,
  };
}

async function guard(verdictOverrides: Record<string, unknown> = {}) {
  return assessHyperliquidPerpGuard(
    {
      protocolId: 'hyperliquid-perps-mainnet',
      action: 'open_long',
      assetSymbol: 'BTC',
      marginAssetSymbol: 'USDC',
      sizeUsd: 25_000,
      marginValueUsd: 2_500,
    },
    {
      checkOracle: (async () => ({
        verdict: 'PASS',
        consensusPrice: 50_000,
        maxDeviationPct: 0.2,
        staleDataRisk: false,
        participantCount: 4,
      })) as never,
      fetchVenueState: (async () => ({
        source: 'dex-market',
        venue: 'hyperliquid-perp',
        network: 'hyperliquid:mainnet',
        market: 'BTC-PERP',
        coin: 'BTC',
        observedAt: new Date(NOW_MS).toISOString(),
        sourceFreshnessSeconds: 1,
        assetIndex: 0,
        perpetual: {
          markPrice: 50_000,
          midPrice: 50_000,
          oraclePrice: 50_000,
          fundingRate: 0.0000125,
          openInterest: 100,
          dayNotionalVolume: 1_000_000_000,
          sizeDecimals: 5,
          maxLeverage: 40,
        },
        book: {
          timestamp: new Date(NOW_MS).toISOString(),
          bids: [{ price: 49_999, size: 2 }],
          asks: [{ price: 50_001, size: 2 }],
        },
      })) as never,
    }
  ).then((result) => ({ ...result, ...verdictOverrides }) as typeof result);
}

describe('bindHyperliquidPerpExactOrder', () => {
  it('binds a matching envelope to the assessed action', async () => {
    const g = await guard();
    const exact = bindHyperliquidPerpExactOrder(g, orderEnvelope(), { nowMs: NOW_MS });
    expect(exact.binding).toMatchObject({
      coin: 'BTC',
      assetIndex: 0,
      isBuy: true,
      size: '0.5',
      limitPrice: '50000',
      reduceOnly: false,
      impliedSizeUsd: 25_000,
      builder: null,
    });
    expect(exact.binding.intentHash).toBe(hyperliquidPerpOrderIntentHash(orderEnvelope()));
  });

  it('rejects a side that contradicts the assessed action', async () => {
    const g = await guard();
    expect(() =>
      bindHyperliquidPerpExactOrder(
        g,
        orderEnvelope({
          action: {
            type: 'order',
            orders: [
              {
                a: 0,
                b: false,
                p: '50000',
                s: '0.5',
                r: false,
                t: { limit: { tif: 'Ioc' } },
                c: `0x${'ab'.repeat(16)}`,
              },
            ],
            grouping: 'na',
          },
          expiresAfter: NOW_MS + 30_000,
        }),
        { nowMs: NOW_MS }
      )
    ).toThrow('does not match the assessed');
  });

  it('rejects an expired or too-distant envelope', async () => {
    const g = await guard();
    expect(() =>
      bindHyperliquidPerpExactOrder(g, orderEnvelope({ expiresAfter: NOW_MS - 1 }), {
        nowMs: NOW_MS,
      })
    ).toThrow('expired');
    expect(() =>
      bindHyperliquidPerpExactOrder(g, orderEnvelope({ expiresAfter: NOW_MS + 300_000 }), {
        nowMs: NOW_MS,
      })
    ).toThrow('outside the reviewed');
  });

  it('rejects an implied notional beyond the reviewed tolerance', async () => {
    const g = await guard();
    expect(() =>
      bindHyperliquidPerpExactOrder(
        g,
        orderEnvelope({
          action: {
            type: 'order',
            orders: [
              {
                a: 0,
                b: true,
                p: '60000',
                s: '0.5',
                r: false,
                t: { limit: { tif: 'Ioc' } },
                c: `0x${'ab'.repeat(16)}`,
              },
            ],
            grouping: 'na',
          },
          expiresAfter: NOW_MS + 30_000,
        }),
        { nowMs: NOW_MS }
      )
    ).toThrow('beyond the reviewed tolerance');
  });

  it('rejects reduce-only envelopes and resting order types', async () => {
    const g = await guard();
    const reduceOnly = JSON.parse(JSON.stringify(orderEnvelope()));
    reduceOnly.action.orders[0].r = true;
    expect(() => bindHyperliquidPerpExactOrder(g, reduceOnly, { nowMs: NOW_MS })).toThrow();
  });

  it('rejects an envelope whose asset index departs from the observed market index', async () => {
    // A HIP-3 builder-deployed perp dex carries asset ids 100000+; a same-symbol
    // order on such a market must not be bindable to a main-dex assessment.
    const g = await guard();
    const hip3 = JSON.parse(JSON.stringify(orderEnvelope()));
    hip3.action.orders[0].a = 100_005;
    expect(() => bindHyperliquidPerpExactOrder(g, hip3, { nowMs: NOW_MS })).toThrow(
      'does not match the market index observed'
    );
  });

  it('rejects an envelope when the guard lacks observed venue evidence', async () => {
    const g = await guard();
    const noVenue = {
      ...g,
      venue: { ...g.venue, status: 'unavailable' as const, observedAssetIndex: null },
    };
    expect(() =>
      bindHyperliquidPerpExactOrder(noVenue, orderEnvelope(), { nowMs: NOW_MS })
    ).toThrow('requires fresh venue evidence');
  });
});

describe('createHyperliquidPerpGuardDecision / verify', () => {
  it('round-trips an attested decision through verification', async () => {
    const g = await guard();
    const decision = await createHyperliquidPerpGuardDecision(g, orderEnvelope(), {
      ...deps,
      now: () => 1_792_252_800,
    });
    expect(decision.attestation).not.toBeNull();
    expect(decision.attestation!.data.intentHash).toBe(decision.binding.intentHash);
    const verification = await verifyHyperliquidPerpGuardDecision(decision, {
      now: () => 1_792_252_800,
      trustAttester: deps.trustAttester,
    });
    expect(verification).toMatchObject({ valid: true, reason: 'verified' });
  });

  it('returns an unattested preview when the signer is untrusted', async () => {
    const g = await guard();
    const decision = await createHyperliquidPerpGuardDecision(g, orderEnvelope(), {
      signer,
      now: () => 1_792_252_800,
      trustAttester: async () => false,
    });
    expect(decision.attestation).toBeNull();
    const verification = await verifyHyperliquidPerpGuardDecision(decision);
    expect(verification.reason).toBe('missing_attestation');
  });

  it('detects an envelope tamper as a decision-hash mismatch', async () => {
    const g = await guard();
    const decision = await createHyperliquidPerpGuardDecision(g, orderEnvelope(), deps);
    const tampered = JSON.parse(JSON.stringify(decision));
    tampered.order.action.orders[0].p = '49000';
    const verification = await verifyHyperliquidPerpGuardDecision(tampered, {
      now: () => 1_792_252_800,
    });
    expect(verification.reason).toBe('decision_hash_mismatch');
  });

  it('detects a binding that does not match the envelope', async () => {
    const g = await guard();
    const decision = await createHyperliquidPerpGuardDecision(g, orderEnvelope(), deps);
    const tamperedBinding = { ...decision.binding, size: '0.6' };
    const forged = {
      schema: decision.schema,
      guard: decision.guard,
      order: decision.order,
      binding: tamperedBinding,
      decisionHash: hyperliquidPerpGuardDecisionHash({
        guard: decision.guard,
        order: decision.order,
        binding: tamperedBinding,
      }),
      attestation: null,
    };
    const verification = await verifyHyperliquidPerpGuardDecision(forged);
    expect(verification.reason).toBe('missing_attestation');

    // With a forged attestation over the inconsistent binding, the re-binding
    // check must reject it even though every hash is internally consistent.
    const reSigned = await createHyperliquidPerpGuardDecision(g, orderEnvelope(), deps);
    const fullyForged = {
      ...reSigned,
      binding: tamperedBinding,
      decisionHash: hyperliquidPerpGuardDecisionHash({
        guard: reSigned.guard,
        order: reSigned.order,
        binding: tamperedBinding,
      }),
    };
    fullyForged.attestation = {
      ...reSigned.attestation!,
      data: {
        ...reSigned.attestation!.data,
        decisionHash: fullyForged.decisionHash,
      },
    };
    const verdict = await verifyHyperliquidPerpGuardDecision(fullyForged, {
      now: () => 1_792_252_800,
    });
    expect(verdict.reason).toBe('binding_mismatch');
  });

  it('rejects an expired decision', async () => {
    const g = await guard();
    const decision = await createHyperliquidPerpGuardDecision(g, orderEnvelope(), deps);
    const verification = await verifyHyperliquidPerpGuardDecision(decision, {
      now: () => 1_792_252_800 + 301,
    });
    expect(verification).toMatchObject({ valid: false, reason: 'expired', expired: true });
  });
});
