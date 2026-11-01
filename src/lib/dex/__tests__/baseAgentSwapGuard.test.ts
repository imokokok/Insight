import { encodeFunctionData, parseAbi } from 'viem';

import {
  baseAgentSwapGuardDecisionHash,
  prepareBaseAgentSwapGuard,
  type BaseAgentSwapGuardDependencies,
  type BaseAgentSwapGuardInput,
} from '../baseAgentSwapGuard';

const AERODROME_EXACT_INPUT_SINGLE_ABI = parseAbi([
  'function exactInputSingle((address tokenIn,address tokenOut,int24 tickSpacing,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96) params) payable returns (uint256 amountOut)',
]);
const PANCAKE_EXACT_INPUT_SINGLE_ABI = parseAbi([
  'function exactInputSingle((address tokenIn,address tokenOut,uint24 fee,address recipient,uint256 deadline,uint256 amountIn,uint256 amountOutMinimum,uint160 sqrtPriceLimitX96) params) payable returns (uint256 amountOut)',
]);
const ERC20_APPROVE_ABI = parseAbi([
  'function approve(address spender,uint256 amount) returns (bool)',
]);

const input: BaseAgentSwapGuardInput = {
  profileId: 'base-aerodrome-slipstream-weth-usdc-cl100',
  amountIn: '1.25',
  recipient: '0x1111111111111111111111111111111111111111',
  deadlineUnixSeconds: 1_700_000_060,
  sourceDecisionPriceUsd: 2_000,
  destinationDecisionPriceUsd: 1,
  policy: {
    maxSlippageBps: 50,
    maxPriceImpactBps: 25,
    maxTwapDeviationBps: 25,
    maxReferenceDeviationBps: 100,
    maxQuoteAgeSeconds: 60,
  },
};

const preparedAerodrome = {
  kind: 'aerodrome-slipstream-exact-input-v1',
  chainId: 8453,
  transaction: {
    to: '0xBE6D8f0d05cC4be24d5167a3eF062215bE6D18a5',
    data: encodeFunctionData({
      abi: AERODROME_EXACT_INPUT_SINGLE_ABI,
      functionName: 'exactInputSingle',
      args: [
        {
          tokenIn: '0x4200000000000000000000000000000000000006',
          tokenOut: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          tickSpacing: 100,
          recipient: input.recipient,
          deadline: 1_700_000_060n,
          amountIn: 1_250_000_000_000_000_000n,
          amountOutMinimum: 2_487_500_000n,
          sqrtPriceLimitX96: 0n,
        },
      ],
    }),
    value: '0x0',
  },
  approval: {
    token: '0x4200000000000000000000000000000000000006',
    spender: '0xBE6D8f0d05cC4be24d5167a3eF062215bE6D18a5',
    amountRaw: '1250000000000000000',
    data: encodeFunctionData({
      abi: ERC20_APPROVE_ABI,
      functionName: 'approve',
      args: ['0xBE6D8f0d05cC4be24d5167a3eF062215bE6D18a5', 1_250_000_000_000_000_000n],
    }),
  },
  exactInput: {
    profileId: 'base-aerodrome-slipstream-weth-usdc-cl100',
    tokenIn: '0x4200000000000000000000000000000000000006',
    tokenOut: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    tickSpacing: 100,
    amountInRaw: '1250000000000000000',
    quotedAmountOutRaw: '2500000000',
    amountOutMinimumRaw: '2487500000',
    recipient: input.recipient,
    deadlineUnixSeconds: input.deadlineUnixSeconds,
    maxSlippageBps: 50,
  },
  quote: {
    venue: 'aerodrome-slipstream',
    market: 'WETH/USDC',
    sourceFreshnessSeconds: 2,
    observedAt: '2023-11-14T22:13:20.000Z',
    block: {
      number: '123',
      hash: `0x${'11'.repeat(32)}`,
      timestamp: '2023-11-14T22:13:20.000Z',
    },
    contracts: {
      factory: '0x5e7BB104d84c7CB9B682AaC2F3d509f5F406809A',
      quoterV2: '0x254cF9E1E6e233aa1AC962CB9B05b2cfeAaE15b0',
      pool: '0xb2cc224c1c9feE385f8ad6a55b4d94E92359DC59',
    },
    quote: {
      amountIn: 1.25,
      amountInRaw: '1250000000000000000',
      amountOut: 2_500,
      amountOutRaw: '2500000000',
      effectiveToken1PerToken0: 2_000,
      initializedTicksCrossed: 1,
      priceImpactBps: 6,
    },
    twapDeviationBpsFromSpot: 5,
  },
  router: {
    address: '0xBE6D8f0d05cC4be24d5167a3eF062215bE6D18a5',
    codeHash: '0x8ca2876cc2c509da1648ef2ad21a8849c261cf7316b675119b98ba298c8657e7',
  },
  caveats: [],
} as const;

const pancakeInput: BaseAgentSwapGuardInput = {
  ...input,
  profileId: 'base-pancakeswap-v3-usdc-usdt-100',
  sourceDecisionPriceUsd: 1,
};

const preparedPancake = {
  kind: 'pancakeswap-v3-exact-input-v1',
  chainId: 8453,
  transaction: {
    to: '0x1b81D678ffb9C0263b24A97847620C99d213eB14',
    data: encodeFunctionData({
      abi: PANCAKE_EXACT_INPUT_SINGLE_ABI,
      functionName: 'exactInputSingle',
      args: [
        {
          tokenIn: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
          tokenOut: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
          fee: 100,
          recipient: input.recipient,
          deadline: 1_700_000_060n,
          amountIn: 1_250_000n,
          amountOutMinimum: 1_242_755n,
          sqrtPriceLimitX96: 0n,
        },
      ],
    }),
    value: '0x0',
  },
  approval: {
    token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    spender: '0x1b81D678ffb9C0263b24A97847620C99d213eB14',
    amountRaw: '1250000',
    data: encodeFunctionData({
      abi: ERC20_APPROVE_ABI,
      functionName: 'approve',
      args: ['0x1b81D678ffb9C0263b24A97847620C99d213eB14', 1_250_000n],
    }),
  },
  exactInput: {
    profileId: 'base-pancakeswap-v3-usdc-usdt-100',
    tokenIn: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    tokenOut: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
    feeTier: 100,
    amountInRaw: '1250000',
    quotedAmountOutRaw: '1249000',
    amountOutMinimumRaw: '1242755',
    recipient: input.recipient,
    deadlineUnixSeconds: input.deadlineUnixSeconds,
    maxSlippageBps: 50,
  },
  quote: {
    venue: 'pancakeswap-v3',
    market: 'USDC/USDT',
    sourceFreshnessSeconds: 2,
    observedAt: '2023-11-14T22:13:20.000Z',
    block: {
      number: '123',
      hash: `0x${'44'.repeat(32)}`,
      timestamp: '2023-11-14T22:13:20.000Z',
    },
    contracts: {
      factory: '0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865',
      quoterV2: '0xB048Bbc1Ee6b733FFfCFb9e9CeF7375518e25997',
      pool: '0x5f07bb9fee6062e9d09a52e6d587c64bad6ba706',
    },
    quote: {
      amountIn: 1.25,
      amountInRaw: '1250000',
      amountOut: 1.249,
      amountOutRaw: '1249000',
      effectiveToken1PerToken0: 0.9992,
      priceImpactBps: 6,
    },
    twap: { deviationBpsFromSpot: 5 },
  },
  router: {
    address: '0x1b81D678ffb9C0263b24A97847620C99d213eB14',
    codeHash: '0x2cbdac93453dc8ebb7906446b3af75ada8ff43a6225a08ed2e0ee6eb12057b42',
  },
  caveats: [],
} as const;

function check(
  verdict: 'PASS' | 'CAUTION' | 'DANGER' | 'BLOCK',
  decisionInputStatus: 'SUFFICIENT' | 'INSUFFICIENT_EVIDENCE' | 'BLOCK' | null,
  consensusPrice: number
) {
  return {
    verdict,
    consensusPrice,
    maxDeviationPct: 0.1,
    staleDataRisk: false,
    participantCount: 3,
    attestation: { uid: `0x${'33'.repeat(32)}` },
    decisionInputAssessment:
      decisionInputStatus === null ? undefined : { status: decisionInputStatus },
  };
}

function dependencies(
  source = check('PASS', 'SUFFICIENT', 2_000),
  destination = check('PASS', null, 1)
): BaseAgentSwapGuardDependencies {
  return {
    nowUnixSeconds: () => 1_700_000_000,
    prepareAerodrome: jest.fn().mockResolvedValue(preparedAerodrome),
    preparePancake: jest.fn(),
    preTrade: jest.fn().mockResolvedValueOnce(destination).mockResolvedValueOnce(source) as never,
  };
}

describe('Base Agent Swap Guard', () => {
  it('returns only exact unsigned calls when the reviewed route and both oracle gates pass', async () => {
    const deps = dependencies();
    const result = await prepareBaseAgentSwapGuard(input, deps);

    expect(result.verdict).toBe('ALLOW');
    expect(result.reasonCodes).toEqual([]);
    expect(result.validUntil).toBe(1_700_000_060);
    expect(result.transactionsToSign).toEqual({
      approval: {
        to: preparedAerodrome.approval.spender,
        value: '0x0',
        data: preparedAerodrome.approval.data,
      },
      swap: {
        to: preparedAerodrome.transaction.to,
        value: '0x0',
        data: preparedAerodrome.transaction.data,
      },
    });
    expect(result.binding?.swap.calldataHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(result.preTradeAttestations?.source).toMatchObject({
      uid: `0x${'33'.repeat(32)}`,
    });
    const { decisionHash, ...unsigned } = result;
    expect(decisionHash).toBe(baseAgentSwapGuardDecisionHash(unsigned));
    expect(deps.preTrade).toHaveBeenCalledTimes(2);
    expect(result.market?.exactInput).toMatchObject({
      destinationConsensusPriceUsd: 1,
      routeQuotePriceUsd: 2_000,
    });
    expect(deps.preTrade).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        asset: 'USDC',
        destinationAsset: 'WETH',
        chainId: 8453,
      })
    );
    expect(deps.preTrade).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        asset: 'WETH',
        destinationAsset: 'USDC',
        chainId: 8453,
        decisionInput: expect.objectContaining({
          quotePriceUsd: 2_000,
          reviewedAerodromeSlipstream: expect.objectContaining({ amountIn: '1.25' }),
        }),
      })
    );
  });

  it('suppresses calls when the oracle lane is cautious, preserving a human-review boundary', async () => {
    const result = await prepareBaseAgentSwapGuard(
      input,
      dependencies(check('CAUTION', 'SUFFICIENT', 2_000))
    );

    expect(result).toMatchObject({
      verdict: 'CAUTION',
      reasonCodes: ['ORACLE_CAUTION_REQUIRES_NEW_ASSESSMENT'],
      transactionsToSign: null,
      next: { action: 'show_caution_and_create_a_new_assessment' },
    });
  });

  it('uses the Pancake profile only through its separately decoded fee-tier call shape', async () => {
    const deps = dependencies(check('PASS', 'SUFFICIENT', 1), check('PASS', null, 1));
    (deps.preparePancake as jest.Mock).mockResolvedValueOnce(preparedPancake);

    const result = await prepareBaseAgentSwapGuard(pancakeInput, deps);

    expect(result).toMatchObject({
      verdict: 'ALLOW',
      market: {
        venue: 'pancakeswap-v3',
        sourceAsset: 'USDC',
        destinationAsset: 'USDT',
        exactInput: { routeQuotePriceUsd: 0.9992 },
      },
    });
    expect(deps.prepareAerodrome).not.toHaveBeenCalled();
    expect(deps.preTrade).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        asset: 'USDC',
        destinationAsset: 'USDT',
        decisionInput: expect.objectContaining({
          reviewedUniswapV3: expect.objectContaining({ amountIn: '1.25' }),
        }),
      })
    );
  });

  it('blocks before oracle calls when the reviewed quote violates the policy', async () => {
    const deps = dependencies();
    const result = await prepareBaseAgentSwapGuard(
      { ...input, policy: { ...input.policy, maxPriceImpactBps: 5 } },
      deps
    );

    expect(result).toMatchObject({
      verdict: 'BLOCK',
      reasonCodes: ['PRICE_IMPACT_EXCEEDS_POLICY'],
      transactionsToSign: null,
      oracleChecks: null,
    });
    expect(deps.preTrade).not.toHaveBeenCalled();
  });

  it('refuses prepared calldata when its recipient is not the reviewed request recipient', async () => {
    const deps = dependencies();
    (deps.prepareAerodrome as jest.Mock).mockResolvedValueOnce({
      ...preparedAerodrome,
      exactInput: {
        ...preparedAerodrome.exactInput,
        recipient: '0x2222222222222222222222222222222222222222',
      },
    });

    const result = await prepareBaseAgentSwapGuard(input, deps);

    expect(result).toMatchObject({
      verdict: 'BLOCK',
      reasonCodes: ['PREPARED_CALL_BINDING_INVALID'],
      transactionsToSign: null,
    });
    expect(deps.preTrade).not.toHaveBeenCalled();
  });

  it('blocks when the source decision-input assessment is not sufficient', async () => {
    const result = await prepareBaseAgentSwapGuard(
      input,
      dependencies(check('PASS', 'INSUFFICIENT_EVIDENCE', 2_000))
    );

    expect(result).toMatchObject({
      verdict: 'BLOCK',
      reasonCodes: ['SOURCE_DECISION_INPUT_INSUFFICIENT'],
      transactionsToSign: null,
    });
  });

  it('fails closed when direct preparation cannot establish reviewed evidence', async () => {
    const deps = dependencies();
    (deps.prepareAerodrome as jest.Mock).mockRejectedValueOnce(new Error('RPC unavailable'));

    const result = await prepareBaseAgentSwapGuard(input, deps);

    expect(result).toMatchObject({
      verdict: 'BLOCK',
      reasonCodes: ['PREPARATION_OR_EVIDENCE_UNAVAILABLE'],
      market: null,
      binding: null,
      transactionsToSign: null,
    });
  });

  it('does not let an agent-provided destination price set the USD route conversion', async () => {
    const deps = dependencies();
    const result = await prepareBaseAgentSwapGuard(
      { ...input, destinationDecisionPriceUsd: 0.9 },
      deps
    );

    expect(result).toMatchObject({
      verdict: 'BLOCK',
      reasonCodes: ['DESTINATION_DECISION_PRICE_DEVIATION_EXCEEDED'],
      oracleChecks: {
        source: null,
        destination: expect.objectContaining({ decisionPriceUsd: 0.9 }),
      },
      transactionsToSign: null,
    });
    expect(result.oracleChecks?.destination?.decisionPriceDeviationBps).toBeCloseTo(1_000);
    expect(deps.preTrade).toHaveBeenCalledTimes(1);
  });

  it('suppresses calls if the pinned quote expires while oracle evidence is being collected', async () => {
    const deps = dependencies();
    deps.nowUnixSeconds = jest
      .fn()
      .mockReturnValueOnce(1_700_000_000)
      .mockReturnValueOnce(1_700_000_060);

    const result = await prepareBaseAgentSwapGuard(input, deps);

    expect(result).toMatchObject({
      verdict: 'BLOCK',
      reasonCodes: ['QUOTE_EXPIRED_DURING_ASSESSMENT'],
      oracleChecks: { source: null, destination: expect.any(Object) },
      transactionsToSign: null,
    });
    expect(deps.preTrade).toHaveBeenCalledTimes(1);
  });

  it('rejects malformed or substituted calldata even when a preparer reports matching metadata', async () => {
    const deps = dependencies();
    (deps.prepareAerodrome as jest.Mock).mockResolvedValueOnce({
      ...preparedAerodrome,
      transaction: { ...preparedAerodrome.transaction, data: '0x1234' },
    });

    const result = await prepareBaseAgentSwapGuard(input, deps);

    expect(result).toMatchObject({
      verdict: 'BLOCK',
      reasonCodes: ['PREPARED_CALL_BINDING_INVALID'],
      transactionsToSign: null,
    });
    expect(deps.preTrade).not.toHaveBeenCalled();
  });

  it('fails closed if preparation metadata names an unreviewed router deployment', async () => {
    const deps = dependencies();
    (deps.prepareAerodrome as jest.Mock).mockResolvedValueOnce({
      ...preparedAerodrome,
      router: { ...preparedAerodrome.router, codeHash: `0x${'66'.repeat(32)}` },
    });

    const result = await prepareBaseAgentSwapGuard(input, deps);

    expect(result).toMatchObject({
      verdict: 'BLOCK',
      reasonCodes: ['PREPARED_CALL_BINDING_INVALID'],
      transactionsToSign: null,
    });
    expect(deps.preTrade).not.toHaveBeenCalled();
  });
});
