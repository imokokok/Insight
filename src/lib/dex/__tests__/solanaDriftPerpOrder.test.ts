/** @jest-environment node */

import { DRIFT_V2_MAINNET_PROGRAM_ID } from '@/lib/perps/driftPerpMarket';
import { decodeSolanaPerpExactCall } from '@/lib/perps/solanaPerpAction';
import type { SolanaPerpGuardResult } from '@/lib/perps/solanaPerpGuard';

import {
  prepareSolanaDriftPerpOrder,
  type SolanaDriftPerpOrderError,
  type SolanaDriftPerpOrderOptions,
} from '../solanaDriftPerpOrder';

const AUTHORITY = '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin';
const NOW = 1_700_000_000_000;

async function captureDriftError(run: Promise<unknown>): Promise<SolanaDriftPerpOrderError> {
  try {
    await run;
  } catch (error) {
    return error as SolanaDriftPerpOrderError;
  }
  throw new Error('expected the Drift adapter to reject');
}

function guardResult(overrides: { verdict?: 'ALLOW' | 'CAUTION' | 'BLOCK' } = {}) {
  const verdict = overrides.verdict ?? 'ALLOW';
  return {
    schema: 'insight.solana-perp-guard.v1',
    verdict,
    protocolId: 'drift-v2-mainnet',
    action: 'open_long',
    evaluatedAt: new Date(NOW).toISOString(),
    scope: {
      venue: 'drift',
      network: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
      transactionAuthority: 'none',
      valuation: 'caller_declared_post_action_usd',
    },
    market: {
      assetSymbol: 'BTC',
      marginAssetSymbol: 'USDC',
      maxLeverage: 20,
      maxLeverageSource: 'reviewed-profile',
      parameterSource: 'reviewed-profile',
    },
    projected: {
      sizeUsd: 25_000,
      marginValueUsd: 2_500,
      effectiveLeverage: 10,
      liquidationBufferPct: 50,
      conservativeMaxSizeUsd: 45_000,
    },
    oracleChecks: {
      underlying: {
        verdict: 'PASS',
        consensusPrice: 68_000,
        maxDeviationPct: 0.1,
        staleDataRisk: false,
        participantCount: 3,
        attestationUid: null,
        attester: null,
      },
      margin: {
        verdict: 'PASS',
        consensusPrice: 1,
        maxDeviationPct: 0.01,
        staleDataRisk: false,
        participantCount: 3,
        attestationUid: null,
        attester: null,
      },
    },
    venue: {
      status: 'observed',
      observedAt: new Date(NOW).toISOString(),
      sourceFreshnessSeconds: 2,
      markPrice: 68_000,
      oraclePrice: 68_000,
      markOracleDeviationBps: 0,
      displayedTopDepthNotionalUsd: null,
      fundingRate: null,
      openInterestCoin: null,
      dayNotionalVolume: null,
      liveMaxLeverage: 20,
      consensusVenueDeviationPct: null,
      drift: {
        marketIndex: 1,
        marketAccountAddress: 'DriftBtcPerpMarketPdaOnSolanaMainnet0000000',
        oracleSource: 'pythLazer',
        oracleSourceSupported: true,
        oracleConfidence: 12.3,
        markPriceTwap: 68_001,
        last24hAvgFundingRatePerHourPercent: null,
        fundingPeriodSeconds: 3_600,
        openInterestNotionalUsd: 83_946_000,
        maxOpenInterestBase: 1_000_000,
        openInterestUtilizationPct: 12.35,
        netBaseAssetAmount: 111.1,
        marginRatioMaintenance: 0.025,
        contractTier: 'A',
        marketStatus: 'active',
        pausedOperationsMask: 0,
        ammLastUpdateSlot: 123_456_789,
        unavailableReason: null,
      },
    },
    reasons: ['Oracle checks passed and declared post-action leverage remains below the band.'],
    next: { execution: 'not_performed', priorSeal: 'bind before execution' },
  } as SolanaPerpGuardResult;
}

function options(
  overrides: Partial<SolanaDriftPerpOrderOptions> & {
    verdict?: 'ALLOW' | 'CAUTION' | 'BLOCK';
  } = {}
): SolanaDriftPerpOrderOptions {
  const { verdict, ...rest } = overrides;
  return {
    assessGuard: jest.fn(async () => guardResult({ verdict })),
    nowMs: NOW,
    timeoutMs: 1_000,
    ...rest,
  };
}

const BASE_REQUEST = {
  assetSymbol: 'BTC',
  action: 'open_long' as const,
  sizeUsd: 25_000,
  marginValueUsd: 2_500,
  authority: AUTHORITY,
  expiresAfterSeconds: 30,
};

describe('Solana Drift perp order payload', () => {
  it('builds a canonical place_perp_order payload that the reviewed decoder accepts', async () => {
    const result = await prepareSolanaDriftPerpOrder(BASE_REQUEST, options());

    expect(result).toMatchObject({
      schema: 'insight.solana-drift-perp-order.v1',
      venue: 'drift',
      chainId: 0,
      verdict: 'READY_TO_SIGN',
      market: {
        assetSymbol: 'BTC',
        marketName: 'BTC-PERP',
        marketIndex: 1,
        observedSlot: 123_456_789,
      },
      riskVerdictRef: { source: 'solana_perp_guard', verdict: 'ALLOW' },
    });
    expect(result.order).toMatchObject({
      orderType: 'market',
      marketType: 'perp',
      direction: 'long',
      marketIndex: 1,
      limitPrice: '0',
      reduceOnly: false,
    });
    expect(result.order?.baseAssetAmountRaw).toBe(Math.round((25_000 / 68_000) * 1e9).toString());
    expect(result.instruction?.programId).toBe(DRIFT_V2_MAINNET_PROGRAM_ID);

    const decoded = decodeSolanaPerpExactCall({
      network: 'mainnet-beta',
      messageVersion: 'legacy',
      feePayer: AUTHORITY,
      recentBlockhash: '11111111111111111111111111111111',
      header: {
        numRequiredSignatures: 1,
        numReadonlySignedAccounts: 0,
        numReadonlyUnsignedAccounts: 1,
      },
      accountKeys: [AUTHORITY, DRIFT_V2_MAINNET_PROGRAM_ID],
      addressTableLookups: [],
      loadedAddresses: { writable: [], readonly: [] },
      instructions: [
        {
          programIdIndex: 1,
          accountIndexes: [],
          data: result.instruction!.dataBase58,
        },
      ],
    });

    expect(decoded.action).toBe('open_long');
    expect(decoded.marketIndex).toBe(1);
    expect(decoded.baseAssetAmount).toBe(result.order?.baseAssetAmountRaw);
    expect(decoded.maxTs).toBe(Math.floor((NOW + 30_000) / 1_000));
  });

  it('classifies an unreviewed market as MARKET_NOT_FOUND', async () => {
    const assessGuard = jest.fn();
    await expect(
      prepareSolanaDriftPerpOrder(
        { ...BASE_REQUEST, assetSymbol: 'DOGE' },
        { ...options(), assessGuard }
      )
    ).rejects.toMatchObject({ code: 'MARKET_NOT_FOUND' });
    expect(assessGuard).not.toHaveBeenCalled();
  });

  it('classifies a guard timeout as UPSTREAM_UNAVAILABLE', async () => {
    await expect(
      prepareSolanaDriftPerpOrder(BASE_REQUEST, {
        assessGuard: jest.fn(() => new Promise<SolanaPerpGuardResult>(() => {})),
        nowMs: NOW,
        timeoutMs: 100,
      })
    ).rejects.toMatchObject({ code: 'UPSTREAM_UNAVAILABLE', retryable: true });
  });

  it('forwards a blocking guard verdict and builds no payload', async () => {
    const result = await prepareSolanaDriftPerpOrder(BASE_REQUEST, options({ verdict: 'BLOCK' }));

    expect(result.verdict).toBe('BLOCK');
    expect(result.order).toBeNull();
    expect(result.instruction).toBeNull();
    expect(result.orderExpiresAt).toBeNull();
    expect(result.riskVerdictRef.verdict).toBe('BLOCK');
    expect(result.blockingReasons.join(' ')).toMatch(/Oracle checks passed/);
  });

  it('keeps CAUTION as a forwarded verdict while still encoding the order', async () => {
    const result = await prepareSolanaDriftPerpOrder(BASE_REQUEST, options({ verdict: 'CAUTION' }));

    expect(result.verdict).toBe('CAUTION');
    expect(result.riskVerdictRef.verdict).toBe('CAUTION');
    expect(result.instruction).not.toBeNull();
  });

  it('classifies every Drift failure as unavailable, never a chargeable rejection', async () => {
    const runs = [
      prepareSolanaDriftPerpOrder(
        { ...BASE_REQUEST, assetSymbol: 'DOGE' },
        { ...options(), assessGuard: jest.fn() }
      ),
      prepareSolanaDriftPerpOrder({ ...BASE_REQUEST, expiresAfterSeconds: 3 }, options()),
      prepareSolanaDriftPerpOrder(BASE_REQUEST, {
        assessGuard: jest.fn(() => new Promise<SolanaPerpGuardResult>(() => {})),
        nowMs: NOW,
        timeoutMs: 100,
      }),
    ];

    for (const run of runs) {
      const error = await captureDriftError(run);
      expect(error.outcome).toBe('unavailable');
      expect(error).not.toHaveProperty('evidence');
    }
  });
});
