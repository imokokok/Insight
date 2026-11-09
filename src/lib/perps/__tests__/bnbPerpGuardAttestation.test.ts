import { privateKeyToAccount } from 'viem/accounts';

import type { AsterPerpMarketState } from '@/lib/dex/asterPerpMarket';

import {
  bindBnbPerpExactOrder,
  bnbPerpGuardDecisionHash,
  createBnbPerpGuardDecision,
  verifyBnbPerpGuardDecision,
} from '../bnbPerpGuardAttestation';
import { prepareBnbPerpOrderEnvelope } from '../bnbPerpOrderEnvelope';

import type { BnbPerpGuardResult } from '../bnbPerpGuard';

const NOW = new Date('2026-11-08T00:00:00.000Z');
const NOW_SEC = Math.floor(NOW.getTime() / 1000);

const signer = privateKeyToAccount(`0x${'33'.repeat(32)}`);
const deps = {
  signer,
  now: () => NOW_SEC,
  verifyUrl: 'https://www.oracleinsight.xyz/api/v1/safety/bnb-perp-guard/verify',
  trustAttester: async (address: string) => address.toLowerCase() === signer.address.toLowerCase(),
};

const REQUEST = {
  chain: 'eip155:56' as const,
  market: 'ETH',
  side: 'long' as const,
  quantity: '0.5',
  leverage: 3,
  maxSlippageBps: 50,
  orderType: 'market' as const,
  clientOrderId: 'insight-order-001',
};

function venueState(overrides: Partial<AsterPerpMarketState> = {}): AsterPerpMarketState {
  return {
    symbol: 'ETHUSDT',
    marketStatus: 'TRADING',
    observedAt: NOW.toISOString(),
    sourceFreshnessSeconds: 1,
    markPrice: 3_000,
    indexPrice: 3_001,
    fundingRatePerInterval: 0.0001,
    nextFundingTimeMs: null,
    openInterestBase: null,
    dayNotionalVolume: null,
    liveMaxLeverage: 20,
    ...overrides,
  };
}

function guardResult(
  verdict: 'ALLOW' | 'CAUTION' | 'BLOCK' = 'ALLOW',
  reasons: string[] = ['guard assessment reason']
): BnbPerpGuardResult {
  return {
    schema: 'insight.bnb-perp-guard.v1',
    verdict,
    protocolId: 'aster-perps-bnb-mainnet',
    action: 'open_long',
    evaluatedAt: NOW.toISOString(),
    scope: {
      venue: 'aster',
      network: 'eip155:56',
      transactionAuthority: 'none',
      valuation: 'caller_declared_post_action_usd',
    },
    market: {
      assetSymbol: 'ETH',
      marginAssetSymbol: 'USDT',
      maxLeverage: 20,
      maxLeverageSource: 'reviewed-profile',
      parameterSource: 'reviewed-profile',
    },
    projected: {
      sizeUsd: 1_500,
      marginValueUsd: 500,
      effectiveLeverage: 3,
      liquidationBufferPct: 85,
      conservativeMaxSizeUsd: 9_000,
    },
    oracleChecks: {
      underlying: {
        verdict: 'PASS',
        consensusPrice: 3_000,
        maxDeviationPct: 0.1,
        staleDataRisk: false,
        participantCount: 3,
        attestationUid: null,
        attester: null,
      },
      margin: {
        verdict: 'PASS',
        consensusPrice: 1,
        maxDeviationPct: 0.1,
        staleDataRisk: false,
        participantCount: 3,
        attestationUid: null,
        attester: null,
      },
    },
    venue: {
      status: 'observed',
      observedAt: NOW.toISOString(),
      sourceFreshnessSeconds: 1,
      markPrice: 3_000,
      indexPrice: 3_001,
      markIndexDeviationBps: 3.33,
      displayedTopDepthNotionalUsd: null,
      fundingRatePerInterval: 0.0001,
      nextFundingTimeMs: null,
      openInterestBase: null,
      dayNotionalVolume: null,
      liveMaxLeverage: 20,
      consensusVenueDeviationPct: null,
      aster: { symbol: 'ETHUSDT', marketStatus: 'TRADING', unavailableReason: null },
    },
    reasons,
    next: {
      execution: 'not_performed',
      priorSeal: 'Bind this decision to one exact, user-authorized Aster order before execution.',
    },
  };
}

async function preparedEnvelope(guard: BnbPerpGuardResult) {
  return prepareBnbPerpOrderEnvelope(REQUEST, {
    fetchVenueState: async () => venueState(),
    getBlockNumber: async () => 45_678_901,
    assessGuard: (async () => guard) as never,
    now: () => NOW,
  });
}

describe('bindBnbPerpExactOrder', () => {
  it('binds a prepared envelope to the assessed action and re-derives the payload hash', async () => {
    const g = guardResult();
    const envelope = await preparedEnvelope(g);
    const exact = bindBnbPerpExactOrder(g, envelope, { nowSec: NOW_SEC });
    expect(exact.binding).toMatchObject({
      chainId: 56,
      venueSymbol: 'ETHUSDT',
      assetSymbol: 'ETH',
      side: 'BUY',
      orderType: 'MARKET',
      quantity: '0.5',
      price: '0',
      clientOrderId: 'insight-order-001',
      quoteValidUntil: NOW_SEC + 30,
      impliedSizeUsd: 1_500,
      assessmentHash: envelope.risk.assessmentHash,
    });
    expect(exact.binding.payloadHash).toBe(envelope.unsignedOrderEnvelope!.payloadHash);
  });

  it('rejects an envelope prepared against a different guard assessment', async () => {
    const g = guardResult();
    const envelope = await preparedEnvelope(g);
    const other = guardResult('CAUTION', ['another assessment']);
    expect(() => bindBnbPerpExactOrder(other, envelope, { nowSec: NOW_SEC })).toThrow(
      'different guard assessment'
    );
  });

  it('rejects a side that contradicts the assessed action', async () => {
    const g = guardResult();
    const envelope = await preparedEnvelope(g);
    const flipped = {
      ...envelope,
      unsignedOrderEnvelope: {
        ...envelope.unsignedOrderEnvelope!,
        payload: { ...envelope.unsignedOrderEnvelope!.payload, side: 'SELL' as const },
      },
    };
    expect(() => bindBnbPerpExactOrder(g, flipped, { nowSec: NOW_SEC })).toThrow(
      'does not match the assessed'
    );
  });

  it('rejects a BLOCK verdict, a payload-hash mismatch, and verdict disagreement', async () => {
    const blockedGuard = guardResult('BLOCK', ['venue integrity BLOCK']);
    const blockedEnvelope = await prepareBnbPerpOrderEnvelope(REQUEST, {
      fetchVenueState: async () => venueState(),
      getBlockNumber: async () => 45_678_901,
      assessGuard: (async () => blockedGuard) as never,
      now: () => NOW,
    });
    expect(() => bindBnbPerpExactOrder(blockedGuard, blockedEnvelope, { nowSec: NOW_SEC })).toThrow(
      'BLOCK'
    );
    const g = guardResult();
    const envelope = await preparedEnvelope(g);
    const mismatched = {
      ...envelope,
      unsignedOrderEnvelope: {
        ...envelope.unsignedOrderEnvelope!,
        payloadHash: `0x${'ff'.repeat(32)}`,
      },
    };
    expect(() => bindBnbPerpExactOrder(g, mismatched, { nowSec: NOW_SEC })).toThrow('payload hash');
  });

  it('rejects an expired envelope quote', async () => {
    const g = guardResult();
    const envelope = await preparedEnvelope(g);
    expect(() => bindBnbPerpExactOrder(g, envelope, { nowSec: NOW_SEC + 31 })).toThrow('expired');
  });
});

describe('createBnbPerpGuardDecision / verify', () => {
  it('round-trips an attested decision through verification', async () => {
    const g = guardResult();
    const envelope = await preparedEnvelope(g);
    const decision = await createBnbPerpGuardDecision(g, envelope, deps);
    expect(decision.attestation).not.toBeNull();
    expect(decision.attestation!.data.intentHash).toBe(decision.binding.intentHash);
    expect(decision.attestation!.data.payloadHash).toBe(decision.binding.payloadHash);
    expect(decision.attestation!.data.chainId).toBe(56);
    const verification = await verifyBnbPerpGuardDecision(decision, {
      now: () => NOW_SEC,
      trustAttester: deps.trustAttester,
    });
    expect(verification).toMatchObject({ valid: true, reason: 'verified' });
  });

  it('round-trips a limit-order decision with a bound price', async () => {
    const g = guardResult();
    const envelope = await prepareBnbPerpOrderEnvelope(
      { ...REQUEST, orderType: 'limit' as const, limitPrice: '3010' },
      {
        fetchVenueState: async () => venueState(),
        getBlockNumber: async () => 45_678_901,
        assessGuard: (async () => g) as never,
        now: () => NOW,
      }
    );
    const decision = await createBnbPerpGuardDecision(g, envelope, deps);
    expect(decision.binding.orderType).toBe('LIMIT');
    expect(decision.binding.price).toBe('3010');
    const verification = await verifyBnbPerpGuardDecision(decision, {
      now: () => NOW_SEC,
      trustAttester: deps.trustAttester,
    });
    expect(verification.reason).toBe('verified');
  });

  it('returns an unattested preview when the signer is untrusted', async () => {
    const g = guardResult();
    const envelope = await preparedEnvelope(g);
    const decision = await createBnbPerpGuardDecision(g, envelope, {
      signer,
      now: () => NOW_SEC,
      trustAttester: async () => false,
    });
    expect(decision.attestation).toBeNull();
    const verification = await verifyBnbPerpGuardDecision(decision);
    expect(verification.reason).toBe('missing_attestation');
  });

  it('detects an envelope tamper as a decision-hash mismatch', async () => {
    const g = guardResult();
    const envelope = await preparedEnvelope(g);
    const decision = await createBnbPerpGuardDecision(g, envelope, deps);
    const tampered = JSON.parse(JSON.stringify(decision));
    tampered.envelope.quote.referencePriceUsd = 2_900;
    const verification = await verifyBnbPerpGuardDecision(tampered, { now: () => NOW_SEC });
    expect(verification.reason).toBe('decision_hash_mismatch');
  });

  it('detects a binding that does not match the envelope as a binding mismatch', async () => {
    const g = guardResult();
    const envelope = await preparedEnvelope(g);
    const reSigned = await createBnbPerpGuardDecision(g, envelope, deps);
    const tamperedBinding = { ...reSigned.binding, quantity: '0.6' };
    const fullyForged = {
      ...reSigned,
      binding: tamperedBinding,
      decisionHash: bnbPerpGuardDecisionHash({
        guard: reSigned.guard,
        envelope: reSigned.envelope,
        binding: tamperedBinding,
      }),
    };
    fullyForged.attestation = {
      ...reSigned.attestation!,
      data: {
        ...reSigned.attestation!.data,
        quantity: '0.6',
        decisionHash: fullyForged.decisionHash,
      },
    };
    const verdict = await verifyBnbPerpGuardDecision(fullyForged, { now: () => NOW_SEC });
    expect(verdict.reason).toBe('binding_mismatch');
  });

  it('rejects a decision whose envelope quote has expired even with valid signatures', async () => {
    const g = guardResult();
    const envelope = await preparedEnvelope(g);
    const decision = await createBnbPerpGuardDecision(g, envelope, deps);
    const verification = await verifyBnbPerpGuardDecision(decision, {
      now: () => NOW_SEC + 31,
    });
    expect(verification).toMatchObject({ valid: false, reason: 'expired', expired: true });
  });
});

describe('bindBnbPerpExactOrder hardening', () => {
  it('rejects a payload whose venue symbol is not the reviewed Aster market', async () => {
    const g = guardResult();
    const envelope = await preparedEnvelope(g);
    const tampered = JSON.parse(JSON.stringify(envelope));
    tampered.unsignedOrderEnvelope.payload.symbol = 'FOOUSDT';
    tampered.market.venueSymbol = 'FOOUSDT';
    expect(() => bindBnbPerpExactOrder(g, tampered, { nowSec: NOW_SEC })).toThrow(
      'Payload venue symbol is not the reviewed Aster market'
    );
  });

  it('rejects reduce-only payloads', async () => {
    const g = guardResult();
    const envelope = await preparedEnvelope(g);
    const tampered = JSON.parse(JSON.stringify(envelope));
    tampered.unsignedOrderEnvelope.payload.reduceOnly = true;
    expect(() => bindBnbPerpExactOrder(g, tampered, { nowSec: NOW_SEC })).toThrow();
  });

  it('rejects MARKET payloads that carry a price', async () => {
    const g = guardResult();
    const envelope = await preparedEnvelope(g);
    const tampered = JSON.parse(JSON.stringify(envelope));
    tampered.unsignedOrderEnvelope.payload.price = '3000';
    expect(() => bindBnbPerpExactOrder(g, tampered, { nowSec: NOW_SEC })).toThrow(
      'MARKET payloads must not carry a price or time in force'
    );
  });

  it('rejects LIMIT payloads without a priced IOC order', async () => {
    const g = guardResult();
    const envelope = await prepareBnbPerpOrderEnvelope(
      { ...REQUEST, orderType: 'limit' as const, limitPrice: '2990' },
      {
        fetchVenueState: async () => venueState(),
        getBlockNumber: async () => 45_678_901,
        assessGuard: (async () => g) as never,
        now: () => NOW,
      }
    );
    const tampered = JSON.parse(JSON.stringify(envelope));
    delete tampered.unsignedOrderEnvelope.payload.price;
    delete tampered.unsignedOrderEnvelope.payload.timeInForce;
    expect(() => bindBnbPerpExactOrder(g, tampered, { nowSec: NOW_SEC })).toThrow(
      'LIMIT payloads must carry a price with IOC time in force'
    );
  });

  it('rejects an envelope whose declared intent hash departs from its content', async () => {
    const g = guardResult();
    const envelope = await preparedEnvelope(g);
    const tampered = JSON.parse(JSON.stringify(envelope));
    tampered.intentHash = `0x${'0'.repeat(64)}`;
    expect(() => bindBnbPerpExactOrder(g, tampered, { nowSec: NOW_SEC })).toThrow(
      'Envelope intent hash does not match its recomputed value'
    );
  });
});
