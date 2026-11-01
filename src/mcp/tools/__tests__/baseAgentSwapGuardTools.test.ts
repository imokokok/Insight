import { getToolCreditCost } from '@/lib/billing/metering';
import {
  prepareBaseAgentSwapGuard,
  type BaseAgentSwapGuardResult,
} from '@/lib/dex/baseAgentSwapGuard';

import { prepareBaseAgentSwapGuardTool } from '../baseAgentSwapGuardTools';
import { getToolDefinitions } from '../index';

jest.mock('@/lib/dex/baseAgentSwapGuard', () => ({
  ...jest.requireActual('@/lib/dex/baseAgentSwapGuard'),
  prepareBaseAgentSwapGuard: jest.fn(),
}));

const mockedGuard = prepareBaseAgentSwapGuard as jest.MockedFunction<
  typeof prepareBaseAgentSwapGuard
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
  beforeEach(() => jest.clearAllMocks());

  it('is discoverable, validates the narrow profile and is priced as an agent gate', () => {
    expect(getToolDefinitions().map((tool) => tool.name)).toContain(
      'prepare_base_agent_swap_guard'
    );
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
    expect(output.agentInstructions).toContain(
      'Present the exact approval and swap calls plus decisionHash to the user before requesting any signature.'
    );
  });

  it('tells an agent not to sign a BLOCK result', async () => {
    mockedGuard.mockResolvedValue(result('BLOCK'));

    const output = JSON.parse(await prepareBaseAgentSwapGuardTool.handler(args));

    expect(output.agentInstructions[0]).toContain('Do not request a signature');
  });
});
