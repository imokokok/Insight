import { getToolCreditCost } from '@/lib/billing/metering';
import { assessExecutionPreflight } from '@/lib/preflight/executionPreflight';

import { executionPreflightTool } from '../executionPreflightTools';
import { getToolDefinitions } from '../index';

jest.mock('@/lib/preflight/executionPreflight', () => ({
  assessExecutionPreflight: jest.fn(),
}));

const mockedAssess = assessExecutionPreflight as jest.MockedFunction<
  typeof assessExecutionPreflight
>;

const args = {
  asset: 'MON',
  destinationAsset: 'USDC',
  chainId: 143,
  action: 'swap' as const,
  tradeAmountUsd: 1_000,
};

describe('execution_preflight MCP tool', () => {
  beforeEach(() => jest.clearAllMocks());

  it('is discoverable, validates route context, and is priced as a C3 gate', () => {
    expect(executionPreflightTool.name).toBe('execution_preflight');
    expect(executionPreflightTool.parameters.safeParse(args).success).toBe(true);
    expect(executionPreflightTool.parameters.safeParse({ ...args, chainId: 1.5 }).success).toBe(
      false
    );
    expect(getToolDefinitions().map((tool) => tool.name)).toContain('execution_preflight');
    expect(getToolCreditCost('execution_preflight')).toBe(5);
  });

  it('renders the decision, missing evidence, and scope without claiming execution safety', async () => {
    mockedAssess.mockResolvedValue({
      verdict: 'caution',
      recommendation: 'review_before_execution',
      action: 'swap',
      asset: 'MON',
      destinationAsset: 'USDC',
      chain: { id: 143, name: 'monad', profile: 'monad_pyth' },
      gates: {
        oracleSafety: {
          status: 'passed',
          verdict: 'PASS',
          participantCount: 3,
          crossProviderAgreement: 0.99,
          staleDataRisk: false,
        },
        venueQuote: { status: 'not_assessed', requested: false, eligibleToProceed: null },
        nativeOracle: {
          provider: 'pyth',
          status: 'passed',
          source: 'Pyth Core Monad:MON/USD',
          dataAgeSeconds: 10,
          onChainVerified: true,
        },
      },
      reasons: ['Oracle inputs passed, but no verified venue quote was supplied for this action.'],
      requiredBeforeAllow: ['Supply a fresh venue quote.'],
      assessment: { attestation: null },
      evaluatedAt: '2026-10-23T00:00:00.000Z',
    } as never);

    const output = await executionPreflightTool.handler(args);

    expect(output).toContain('Decision: **CAUTION**');
    expect(output).toContain('Chain profile: monad_pyth');
    expect(output).toContain('Native oracle: PASSED (pyth; age 10s; on-chain verified=true)');
    expect(output).toContain('Required before ALLOW:');
    expect(output).toContain('Scope: this decision evaluates the declared data inputs only.');
    expect(mockedAssess).toHaveBeenCalledWith(expect.objectContaining(args));
  });
});
