import { getToolCreditCost } from '@/lib/billing/metering';
import { assessSolanaPerpGuard } from '@/lib/perps/solanaPerpGuard';

import { solanaPerpGuardTool } from '../solanaPerpGuardTools';
import { LEGACY_TOOL_BY_NAME } from '../unified/runtime';

jest.mock('@/lib/perps/solanaPerpGuard', () => {
  const actual = jest.requireActual('@/lib/perps/solanaPerpGuard');
  return { ...actual, assessSolanaPerpGuard: jest.fn() };
});

const mockAssess = assessSolanaPerpGuard as jest.Mock;

const RESULT = {
  schema: 'insight.solana-perp-guard.v1',
  verdict: 'CAUTION',
  protocolId: 'drift-v2-mainnet',
  action: 'open_long',
  evaluatedAt: '2026-11-04T00:00:00.000Z',
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
  },
  projected: {
    sizeUsd: 25_000,
    marginValueUsd: 2_500,
    effectiveLeverage: 10,
    liquidationBufferPct: 5,
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
    observedAt: '2026-11-04T00:00:00.000Z',
    sourceFreshnessSeconds: 2,
    markPrice: 68_100,
    oraclePrice: 68_000,
    markOracleDeviationBps: 14.7,
    displayedTopDepthNotionalUsd: null,
    fundingRate: 0.000_012_5,
    openInterestCoin: 1_234.5,
    dayNotionalVolume: null,
    liveMaxLeverage: 20,
    consensusVenueDeviationPct: 0.15,
    drift: {
      marketIndex: 1,
      marketAccountAddress: 'DriftBtcPerpMarketPdaOnSolanaMainnet0000000',
      oracleSource: 'pythLazer',
      oracleSourceSupported: true,
      oracleConfidence: 12.3,
      markPriceTwap: 68_001,
      last24hAvgFundingRatePerHourPercent: 0.001_25,
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
  reasons: ['Oracle checks passed.', 'Leverage remains inside the reviewed band.'],
  next: {
    execution: 'not_performed',
    priorSeal: 'Bind to an exact user-authorized order separately.',
  },
} as never;

const VALID_ARGS = {
  protocolId: 'drift-v2-mainnet' as const,
  action: 'open_long' as const,
  assetSymbol: 'BTC',
  marginAssetSymbol: 'USDC',
  sizeUsd: 25_000,
  marginValueUsd: 2_500,
};

describe('solana_perp_guard tool', () => {
  it('is discoverable, x402-declared, and metered at C3', () => {
    const tool = LEGACY_TOOL_BY_NAME.get('solana_perp_guard');

    expect(tool).toBeDefined();
    expect(getToolCreditCost('solana_perp_guard')).toBe(5);
  });

  it('validates its parameters against the shared guard schema', () => {
    expect(solanaPerpGuardTool.parameters.safeParse(VALID_ARGS).success).toBe(true);
    expect(
      solanaPerpGuardTool.parameters.safeParse({ ...VALID_ARGS, marginAssetSymbol: 'USDT' }).success
    ).toBe(false);
    expect(solanaPerpGuardTool.parameters.safeParse({ ...VALID_ARGS, sizeUsd: -1 }).success).toBe(
      false
    );
  });

  it('renders the verdict, disclosed venue evidence, and machine-readable JSON', async () => {
    mockAssess.mockResolvedValueOnce(RESULT);

    const output = await solanaPerpGuardTool.handler(VALID_ARGS);

    expect(output).toContain('Decision: **CAUTION**');
    expect(output).toContain('mark/oracle 14.7 bps');
    expect(output).toContain('live max leverage 20x');
    expect(output).toContain('never signs, sends, or authorizes a transaction');

    const jsonBlock = output.slice(output.lastIndexOf('```json') + 7, output.lastIndexOf('```'));
    const parsed = JSON.parse(jsonBlock);
    expect(parsed.verdict).toBe('CAUTION');
    expect(parsed.scope.network).toBe('solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp');
  });

  it('reports unavailable venue evidence instead of inventing values', async () => {
    const unavailable = {
      ...(RESULT as Record<string, unknown>),
      venue: {
        ...(RESULT as Record<string, unknown>).venue,
        status: 'unavailable',
      },
    } as never;
    mockAssess.mockResolvedValueOnce(unavailable);

    const output = await solanaPerpGuardTool.handler(VALID_ARGS);

    expect(output).toContain('unavailable (verdict rests on oracle consensus only)');
  });
});
