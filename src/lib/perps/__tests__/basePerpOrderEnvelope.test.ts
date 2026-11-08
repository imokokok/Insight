import { assessProductOutcome, missingRejectedEvidenceItems } from '@/lib/billing/exemptions';

import { decodeBasePerpExactCall, PERPS_MARKET_PROXY } from '../basePerpAction';
import {
  prepareBasePerpOrderEnvelope,
  type BasePerpOrderEnvelopeDependencies,
  type BasePerpOrderEnvelopeRequest,
} from '../basePerpOrderEnvelope';

import type { BasePerpGuardResult } from '../basePerpGuard';
import type { PerpOrderAdapterError } from '../perpOrderEnvelope';

const NOW = new Date('2026-11-08T00:00:00.000Z');
const ACCOUNT = '0x1111111111111111111111111111111111111111';

const COMPLETE_EVIDENCE = {
  reason_code: 'TEST',
  input_digest: `0x${'11'.repeat(32)}`,
  triggered_threshold: { rule: 'test', threshold: 1, observed: 2 },
  data_sources: [{ source: 'test' }],
  risk_ruleset_version: 'test-v1',
};

async function captureAdapterError(run: Promise<unknown>): Promise<PerpOrderAdapterError> {
  try {
    await run;
  } catch (error) {
    return error as PerpOrderAdapterError;
  }
  throw new Error('expected the adapter to reject');
}

const REQUEST: BasePerpOrderEnvelopeRequest = {
  chain: 'eip155:8453',
  market: 'ETH',
  side: 'long',
  quantity: '0.5',
  leverage: 3,
  maxSlippageBps: 50,
  orderType: 'market',
  accountId: '42',
  accountOwner: ACCOUNT,
};

function guardResult(
  verdict: 'ALLOW' | 'CAUTION' | 'BLOCK',
  reasons: string[] = ['guard assessment reason']
): BasePerpGuardResult {
  return {
    schema: 'insight.base-perp-guard.v1',
    verdict,
    protocolId: 'synthetix-perps-v3-base',
    action: 'open_long',
    evaluatedAt: NOW.toISOString(),
    scope: {
      chainId: 8453,
      transactionAuthority: 'none',
      valuation: 'caller_declared_post_action_usd',
    },
    market: {
      assetSymbol: 'ETH',
      marginAssetSymbol: 'USDC',
      maxLeverage: 25,
      parameterSource: 'reviewed-profile',
    },
    projected: {
      sizeUsd: 1_500,
      marginValueUsd: 500,
      effectiveLeverage: 3,
      liquidationBufferPct: 88,
      conservativeMaxSizeUsd: 11_250,
    },
    oracleChecks: {
      underlying: {
        verdict: 'PASS',
        maxDeviationPct: 0.1,
        staleDataRisk: false,
        participantCount: 4,
        attestationUid: null,
        attester: null,
      },
      margin: {
        verdict: 'PASS',
        maxDeviationPct: 0.1,
        staleDataRisk: false,
        participantCount: 4,
        attestationUid: null,
        attester: null,
      },
    },
    liquidity: { status: 'not_requested', assetSymbol: 'ETH' } as never,
    reasons,
    next: {
      execution: 'not_performed',
      priorSeal: 'Bind this decision to an exact, user-authorized order before execution.',
    },
  };
}

function dependencies(
  overrides: Partial<BasePerpOrderEnvelopeDependencies> = {}
): BasePerpOrderEnvelopeDependencies {
  return {
    fetchQuote: jest.fn(async () => ({
      referencePriceUsd: 3_000,
      observedAt: NOW.toISOString(),
      sourceFreshnessSeconds: 1,
      participantCount: 4,
    })),
    getBlockNumber: jest.fn(async () => 12_345_678),
    assessGuard: jest.fn(async () => guardResult('ALLOW')) as never,
    now: () => NOW,
    ...overrides,
  };
}

describe('prepareBasePerpOrderEnvelope', () => {
  it('builds a signable commitOrder envelope on the reviewed market', async () => {
    const result = await prepareBasePerpOrderEnvelope(REQUEST, dependencies());

    expect(result.verdict).toBe('READY_TO_SIGN');
    expect(result.market.marketId).toBe('100');
    expect(result.observation.blockNumber).toBe(12_345_678);
    expect(result.quote.referencePriceUsd).toBe(3_000);
    expect(result.quote.acceptablePrice).toBe('3015000000000000000000');
    expect(result.quote.validUntil).toBe(Math.floor(NOW.getTime() / 1000) + 30);
    expect(result.risk.verdict).toBe('ALLOW');
    expect(result.risk.assessmentHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(result.unsignedTransaction).not.toBeNull();

    const unsigned = result.unsignedTransaction!;
    const decoded = decodeBasePerpExactCall(
      {
        chainId: 8453,
        from: ACCOUNT,
        to: unsigned.to,
        data: unsigned.data,
        nonce: 0,
        value: 0,
      },
      {
        protocolId: 'synthetix-perps-v3-base',
        action: 'open_long',
        assetSymbol: 'ETH',
      }
    );
    expect(unsigned.to).toBe(PERPS_MARKET_PROXY);
    expect(decoded.marketId).toBe('100');
    expect(decoded.accountId).toBe('42');
    expect(decoded.sizeDelta).toBe('500000000000000000');
    expect(decoded.acceptablePrice).toBe('3015000000000000000000');
  });

  it('fails with UNSUPPORTED_MARKET for a market outside the reviewed set', async () => {
    await expect(
      prepareBasePerpOrderEnvelope({ ...REQUEST, market: 'HYPE' }, dependencies())
    ).rejects.toMatchObject({
      code: 'UNSUPPORTED_MARKET',
      outcome: 'unavailable',
      evidence: null,
    });
  });

  it('fails with UPSTREAM_UNAVAILABLE when the quote query times out', async () => {
    await expect(
      prepareBasePerpOrderEnvelope(
        REQUEST,
        dependencies({
          fetchQuote: () => new Promise(() => {}),
          queryTimeoutMs: 20,
        })
      )
    ).rejects.toMatchObject({
      code: 'UPSTREAM_UNAVAILABLE',
      outcome: 'unavailable',
      evidence: null,
    });
  });

  it('rejects a limit price outside the caller slippage cap with complete evidence', async () => {
    const error = await captureAdapterError(
      prepareBasePerpOrderEnvelope(
        { ...REQUEST, orderType: 'limit', limitPrice: '3100' },
        dependencies()
      )
    );

    expect(error.code).toBe('SLIPPAGE_EXCEEDED');
    expect(error.outcome).toBe('rejected');
    expect(missingRejectedEvidenceItems(error.evidence)).toEqual([]);
    const assessment = assessProductOutcome(
      JSON.stringify({ productOutcome: error.outcome, evidence: error.evidence })
    );
    expect(assessment.outcome).toBe('rejected');
    expect(assessment.downgradedFromRejected).toBe(false);
  });

  it('keeps an invalid parameter failure unavailable even though the venue is covered', async () => {
    const error = await captureAdapterError(
      prepareBasePerpOrderEnvelope(
        { ...REQUEST, orderType: 'limit', limitPrice: '0' },
        dependencies()
      )
    );

    expect(error.code).toBe('INVALID_INPUT');
    expect(error.outcome).toBe('unavailable');
    expect(error.evidence).toBeNull();
    // Filling every evidence field must not turn a coverage/parameter gap into
    // a chargeable rejection: the verdict semantics decide, not the payload.
    const assessment = assessProductOutcome(
      JSON.stringify({ productOutcome: error.outcome, evidence: COMPLETE_EVIDENCE })
    );
    expect(assessment.outcome).toBe('unavailable');
  });

  it('carries a guard BLOCK conclusion and withholds the unsigned call', async () => {
    const result = await prepareBasePerpOrderEnvelope(
      REQUEST,
      dependencies({
        assessGuard: jest.fn(async () => guardResult('BLOCK', ['oracle DANGER'])) as never,
      })
    );

    expect(result.verdict).toBe('BLOCK');
    expect(result.unsignedTransaction).toBeNull();
    expect(result.exactCall).toBeNull();
    expect(result.risk.verdict).toBe('BLOCK');
    expect(result.blockingReasons.join(' ')).toContain('oracle DANGER');
  });
});
