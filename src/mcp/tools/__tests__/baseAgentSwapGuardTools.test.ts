import { getToolCreditCost } from '@/lib/billing/metering';
import {
  prepareBaseAgentSwapGuard,
  type BaseAgentSwapGuardResult,
} from '@/lib/dex/baseAgentSwapGuard';
import { createBaseAgentSwapGuardDecision } from '@/lib/dex/baseAgentSwapGuardAttestation';

import { prepareBaseAgentSwapGuardTool } from '../baseAgentSwapGuardTools';
import { LEGACY_TOOL_BY_NAME } from '../unified/runtime';

jest.mock('@/lib/dex/baseAgentSwapGuard', () => ({
  ...jest.requireActual('@/lib/dex/baseAgentSwapGuard'),
  prepareBaseAgentSwapGuard: jest.fn(),
}));
jest.mock('@/lib/dex/baseAgentSwapGuardAttestation', () => ({
  createBaseAgentSwapGuardDecision: jest.fn(),
}));

const mockedGuard = prepareBaseAgentSwapGuard as jest.MockedFunction<
  typeof prepareBaseAgentSwapGuard
>;
const mockedDecision = createBaseAgentSwapGuardDecision as jest.MockedFunction<
  typeof createBaseAgentSwapGuardDecision
>;

const args = {
  profileId: 'base-aerodrome-slipstream-weth-usdc-cl100',
  amountIn: '1',
  recipient: '0x1111111111111111111111111111111111111111',
  deadlineUnixSeconds: 1_800_000_000,
  sourceDecisionPriceUsd: 2_000,
  destinationDecisionPriceUsd: 1,
  policy: {
    maxSlippageBps: 50,
    maxPriceImpactBps: 50,
    maxTwapDeviationBps: 50,
    maxReferenceDeviationBps: 100,
    maxQuoteAgeSeconds: 60,
  },
};

function result(verdict: BaseAgentSwapGuardResult['verdict']): BaseAgentSwapGuardResult {
  return {
    schema: 'insight.base-agent-swap-guard.v1',
    verdict,
    reasonCodes: verdict === 'ALLOW' ? [] : ['TEST_REASON'],
    evaluatedAt: '2026-11-01T00:00:00.000Z',
    validUntil: verdict === 'ALLOW' ? 1_800_000_000 : null,
    scope: {
      chainId: 8453,
      profileId: args.profileId,
      transactionAuthority: 'none',
      supportedCallShape: 'reviewed_single_hop_direct_router',
      accountAbstraction: 'not_assessed',
    },
    policy: args.policy,
    market: null,
    binding: null,
    oracleChecks: null,
    preTradeAttestations: null,
    transactionsToSign: null,
    next:
      verdict === 'ALLOW'
        ? {
            humanConfirmationRequired: true,
            action: 'bind_and_request_user_confirmation',
            priorSeal:
              'Bind decisionHash and the identical approval/swap calls before authorization.',
          }
        : {
            humanConfirmationRequired: true,
            action: 'do_not_sign',
            priorSeal: 'No authorization may be created from a BLOCK result.',
          },
    decisionHash: `0x${'11'.repeat(32)}`,
    caveats: [],
  };
}

describe('prepare_base_agent_swap_guard MCP tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedDecision.mockImplementation(async (guard) => ({
      schema: 'insight.base-agent-swap-guard-decision.v1',
      guard,
      decisionHash: guard.decisionHash,
      attestation:
        guard.verdict === 'ALLOW' ? ({ type: 'BaseAgentSwapGuardDecision' } as never) : null,
    }));
  });

  it('is discoverable, validates the narrow profile and is priced as an agent gate', () => {
    expect(LEGACY_TOOL_BY_NAME.has('prepare_base_agent_swap_guard')).toBe(true);
    expect(prepareBaseAgentSwapGuardTool.parameters.safeParse(args).success).toBe(true);
    expect(
      prepareBaseAgentSwapGuardTool.parameters.safeParse({
        ...args,
        profileId: 'arbitrary-aggregator-route',
      }).success
    ).toBe(false);
    expect(
      prepareBaseAgentSwapGuardTool.parameters.safeParse({
        ...args,
        policy: { ...args.policy, maxSlippageBps: 1_001 },
      }).success
    ).toBe(false);
    expect(getToolCreditCost('prepare_base_agent_swap_guard')).toBe(5);
  });

  it('tells an agent to request human confirmation only after ALLOW', async () => {
    mockedGuard.mockResolvedValue(result('ALLOW'));

    const output = JSON.parse(await prepareBaseAgentSwapGuardTool.handler(args));

    expect(mockedGuard).toHaveBeenCalledWith(args);
    expect(output.verdict).toBe('ALLOW');
    expect(output.decision).toMatchObject({
      schema: 'insight.base-agent-swap-guard-decision.v1',
      decisionHash: `0x${'11'.repeat(32)}`,
    });
    expect(output.agentInstructions).toContain(
      'Present the signed Insight decision and both exact calls to the user before requesting any signature.'
    );
  });

  it('tells an agent not to sign a BLOCK result', async () => {
    mockedGuard.mockResolvedValue(result('BLOCK'));

    const output = JSON.parse(await prepareBaseAgentSwapGuardTool.handler(args));

    expect(output.agentInstructions[0]).toContain('Do not request a signature');
  });

  it('does not let an unsigned ALLOW become a portable authorization input', async () => {
    mockedGuard.mockResolvedValue(result('ALLOW'));
    mockedDecision.mockResolvedValueOnce({
      schema: 'insight.base-agent-swap-guard-decision.v1',
      guard: result('ALLOW'),
      decisionHash: `0x${'11'.repeat(32)}`,
      attestation: null,
    });

    const output = JSON.parse(await prepareBaseAgentSwapGuardTool.handler(args));

    expect(output.agentInstructions[0]).toContain('Do not request a signature');
  });
});
