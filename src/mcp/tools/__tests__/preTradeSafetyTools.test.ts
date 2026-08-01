import { preTradeSafetyCheck } from '@/lib/api/services/preTradeSafetyService';

import { preTradeSafetyCheckTool } from '../preTradeSafetyTools';

// Mock the underlying service so we can drive each verdict path.
jest.mock('@/lib/api/services/preTradeSafetyService', () => ({
  preTradeSafetyCheck: jest.fn(),
}));

const mockedCheck = preTradeSafetyCheck as jest.MockedFunction<typeof preTradeSafetyCheck>;

const baseArgs = {
  asset: 'ETH',
  chainId: 1,
  action: 'swap' as const,
  tradeAmountUsd: 50000,
};

describe('pre_trade_safety_check MCP tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has a stable name and requires the core parameters', () => {
    expect(preTradeSafetyCheckTool.name).toBe('pre_trade_safety_check');
    expect(preTradeSafetyCheckTool.description).toMatch(/PASS.*CAUTION.*DANGER.*BLOCK/);
    // Schema should reject a missing asset.
    const parsed = preTradeSafetyCheckTool.parameters.safeParse({
      ...baseArgs,
      asset: '',
    });
    expect(parsed.success).toBe(false);
  });

  it('renders PASS guidance and the verdict emoji', async () => {
    mockedCheck.mockResolvedValue({
      verdict: 'PASS',
      consensusPrice: 1860.5,
      maxDeviationPct: 0.1,
      manipulationRiskScore: 0.03,
      staleDataRisk: false,
      crossProviderAgreement: 0.99,
      recommendedMaxPositionUsd: 920000,
      participantCount: 3,
      providerPrices: {
        chainlink: {
          price: 1860,
          deviationPct: 0.1,
          isOutlier: false,
          dataAgeSeconds: 5,
          isStale: false,
          confidence: 0.95,
          reputationScore: 90,
          status: 'success',
        },
      },
      depegWarnings: [],
      warnings: ['No oracle risk signals detected.'],
      contributingFactors: [],
      mlScore: null,
      mlModelVersion: null,
      mlScore1h: null,
      mlScore6h: null,
      anomalyScore: 0.05,
      attestation: null,
      protocolSafety: null,
      evaluatedAt: '2026-08-01T00:00:00.000Z',
      latencyMs: 42,
    });

    const output = await preTradeSafetyCheckTool.handler(baseArgs);

    expect(output).toContain('🟢 PASS');
    expect(output).toContain('Guidance: Oracle data looks healthy');
    expect(output).toContain('chainlink: $1,860.00');
    expect(output).toContain('**Risk factors:**');
    expect(output).toContain('None — all risk signals within normal range.');
    // The anomaly + ML signals section is always rendered.
    expect(output).toContain('**Risk signals:**');
    expect(output).toContain('| Anomaly Score (novel) |');
    expect(output).toContain('Anomaly (model-free): 0.05');
  });

  it('renders BLOCK guidance and surfaces contributing factors + depeg', async () => {
    mockedCheck.mockResolvedValue({
      verdict: 'BLOCK',
      consensusPrice: 0,
      maxDeviationPct: 9.5,
      manipulationRiskScore: 1,
      staleDataRisk: true,
      crossProviderAgreement: 0.6,
      recommendedMaxPositionUsd: 0,
      participantCount: 0,
      providerPrices: {},
      depegWarnings: [{ stablecoin: 'USDT', deviationPct: 3.5, riskLevel: 'critical' }],
      warnings: ['Oracle data is stale (max age 650s).'],
      contributingFactors: [
        {
          rule: 'data_stale_seconds',
          value: 650,
          threshold: 600,
          triggeredVerdict: 'BLOCK',
          message: 'Stale oracle data (max age 650s) exceeds block threshold.',
        },
      ],
      mlScore: null,
      mlModelVersion: null,
      mlScore1h: null,
      mlScore6h: null,
      anomalyScore: 0,
      attestation: null,
      protocolSafety: null,
      evaluatedAt: '2026-08-01T00:00:00.000Z',
      latencyMs: 88,
    });

    const output = await preTradeSafetyCheckTool.handler(baseArgs);

    expect(output).toContain('🔴 BLOCK');
    expect(output).toContain('Guidance: CRITICAL oracle risk detected. DO NOT execute');
    expect(output).toContain('[BLOCK] data_stale_seconds');
    expect(output).toContain('USDT');
    expect(output).toContain('(no provider data)');
  });

  it('renders DANGER and CAUTION guidance distinctly', async () => {
    for (const verdict of ['CAUTION', 'DANGER'] as const) {
      mockedCheck.mockResolvedValue({
        verdict,
        consensusPrice: 1860,
        maxDeviationPct: 1.5,
        manipulationRiskScore: 0.4,
        staleDataRisk: false,
        crossProviderAgreement: 0.9,
        recommendedMaxPositionUsd: 500000,
        participantCount: 2,
        providerPrices: {},
        depegWarnings: [],
        warnings: ['elevated'],
        contributingFactors: [],
        mlScore: null,
        mlModelVersion: null,
        mlScore1h: null,
        mlScore6h: null,
        anomalyScore: 0,
        attestation: null,
        protocolSafety: null,
        evaluatedAt: '2026-08-01T00:00:00.000Z',
        latencyMs: 10,
      });

      const output = await preTradeSafetyCheckTool.handler(baseArgs);
      if (verdict === 'CAUTION') {
        expect(output).toContain('🟡 CAUTION');
        expect(output).toMatch(/Minor oracle risk signals/i);
      } else {
        expect(output).toContain('🟠 DANGER');
        expect(output).toMatch(/DO NOT execute this trade without human review/i);
      }
    }
  });

  it('forwards the full input (including targetProviders) to the service', async () => {
    mockedCheck.mockResolvedValue({
      verdict: 'PASS',
      consensusPrice: 1,
      maxDeviationPct: 0,
      manipulationRiskScore: 0,
      staleDataRisk: false,
      crossProviderAgreement: 1,
      recommendedMaxPositionUsd: 1000000,
      participantCount: 1,
      providerPrices: {},
      depegWarnings: [],
      warnings: ['No oracle risk signals detected.'],
      contributingFactors: [],
      mlScore: null,
      mlModelVersion: null,
      mlScore1h: null,
      mlScore6h: null,
      anomalyScore: 0,
      attestation: null,
      protocolSafety: null,
      evaluatedAt: '2026-08-01T00:00:00.000Z',
      latencyMs: 1,
    });

    await preTradeSafetyCheckTool.handler({
      ...baseArgs,
      targetProviders: ['chainlink', 'redstone'],
    });

    expect(mockedCheck).toHaveBeenCalledWith({
      asset: 'ETH',
      chainId: 1,
      action: 'swap',
      tradeAmountUsd: 50000,
      targetProviders: ['chainlink', 'redstone'],
    });
  });

  it('flags a novel-manipulation signal when anomaly is elevated but ML is calm', async () => {
    // Anomaly layer (model-free) flags an outlier the supervised ML does not —
    // the exact "unknown-unknown" case this layer exists to catch.
    mockedCheck.mockResolvedValue({
      verdict: 'CAUTION',
      consensusPrice: 1860,
      maxDeviationPct: 1.5,
      manipulationRiskScore: 0.2,
      staleDataRisk: false,
      crossProviderAgreement: 0.9,
      recommendedMaxPositionUsd: 500000,
      participantCount: 3,
      providerPrices: {},
      depegWarnings: [],
      warnings: ['elevated anomaly'],
      contributingFactors: [],
      mlScore: 0.2,
      mlModelVersion: '2026-08-01T00:00:00.000Z',
      mlScore1h: 0.18,
      mlScore6h: 0.2,
      anomalyScore: 0.82,
      attestation: null,
      protocolSafety: null,
      evaluatedAt: '2026-08-01T00:00:00.000Z',
      latencyMs: 12,
    });

    const output = await preTradeSafetyCheckTool.handler(baseArgs);

    // Both horizon scores are surfaced.
    expect(output).toContain('ML 1h (near-term): 0.18');
    expect(output).toContain('ML 6h (strategic): 0.20');
    // Anomaly is flagged elevated...
    expect(output).toContain('Anomaly (model-free): 0.82 ⚠️ ELEVATED');
    // ...and the novel-manipulation warning fires because ML is calm (< 0.5).
    expect(output).toContain('Novel-manipulation signal');
  });
});
