import { getToolCreditCost } from '@/lib/billing/metering';
import { makeSwapTransaction } from '@/lib/dex/__tests__/solanaSwapFixtures';
import type { SolanaSwapGuardResult } from '@/lib/dex/solanaSwapGuard';
import { createSolanaSwapGuardDecision } from '@/lib/dex/solanaSwapGuardAttestation';
import {
  settleSolanaSwapGuard,
  verifySolanaSwapGuardSettlement,
} from '@/lib/dex/solanaSwapGuardSettlement';
import { executionAdapterRegistry } from '@/lib/execution/adapters';

import {
  settleSolanaSwapGuardTool,
  solanaSwapGuardTool,
  verifySolanaSwapGuardSettlementTool,
} from '../solanaSwapGuardTools';
import { LEGACY_TOOL_BY_NAME } from '../unified/runtime';

jest.mock('@/lib/execution/adapters', () => ({
  executionAdapterRegistry: {
    preflight: jest.fn(),
  },
}));
jest.mock('@/lib/dex/solanaSwapGuardAttestation', () => ({
  createSolanaSwapGuardDecision: jest.fn(),
}));
jest.mock('@/lib/dex/solanaSwapGuardSettlement', () => ({
  settleSolanaSwapGuard: jest.fn(),
  verifySolanaSwapGuardSettlement: jest.fn(),
}));

const mockedPreflight = executionAdapterRegistry.preflight as jest.MockedFunction<
  typeof executionAdapterRegistry.preflight
>;
const mockedDecision = createSolanaSwapGuardDecision as jest.MockedFunction<
  typeof createSolanaSwapGuardDecision
>;
const mockedSettle = settleSolanaSwapGuard as jest.MockedFunction<typeof settleSolanaSwapGuard>;
const mockedVerifySettlement = verifySolanaSwapGuardSettlement as jest.MockedFunction<
  typeof verifySolanaSwapGuardSettlement
>;

const args = {
  guard: {
    profileId: 'solana-orca-whirlpool-usdc-usdt-1',
    direction: 'usdc-to-usdt',
    sourceDecisionPriceUsd: 1,
    destinationDecisionPriceUsd: 0.9987,
    policy: { maxSlippageBps: 50, maxReferenceDeviationBps: 100 },
  },
  transaction: makeSwapTransaction({ amount: 1_000_000n, minOut: 1_001_000n }),
};

function guardResult(verdict: SolanaSwapGuardResult['verdict']): SolanaSwapGuardResult {
  return {
    schema: 'insight.solana-swap-guard.v1',
    verdict,
    chainId: 0,
    chainRef: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    profileId: 'solana-orca-whirlpool-usdc-usdt-1',
    direction: 'usdc-to-usdt',
    evaluatedAt: '2026-11-03T00:00:00.000Z',
    scope: {
      transactionAuthority: 'none',
      tradeSize: 'decoded_exact_input_amount_and_declared_prices',
      protocolRiskEnforcement: 'live_unsigned_transaction_simulation',
    },
    policy: args.guard.policy,
    market: {
      venue: 'orca-whirlpool',
      market: 'USDC/USDT',
      sourceAsset: 'USDC',
      destinationAsset: 'USDT',
      pool: '4fuUiYxTQ6QCrdSq9ouBYcTM7bqSwYTSyLueGZLTy4T4',
      parameterSource: 'whirlpool-account-live',
      exactSwap: {
        amountInRaw: '1000000',
        minOutRaw: '1001000',
        impliedMinDestinationPerSource: 1.001,
        impliedMinRoutePriceUsd: 0.9997,
      },
    },
    exactAction: null,
    protocolChecks: { status: 'VERIFIED', accounts: [], poolState: null },
    simulation: null,
    oracleChecks: {
      source: {
        verdict: 'ALLOW',
        maxDeviationPct: 0,
        staleDataRisk: false,
        participantCount: 6,
        attestationUid: null,
        attester: null,
      },
      destination: {
        verdict: 'ALLOW',
        maxDeviationPct: 0,
        staleDataRisk: false,
        participantCount: 6,
        attestationUid: null,
        attester: null,
      },
    },
    reasons: [],
    next: {
      execution: 'not_performed',
      priorSeal:
        'Bind only an ALLOW decision to this exact Solana message through PriorSeal before user authorization.',
    },
  };
}

describe('solana_swap_guard MCP tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedDecision.mockImplementation((guard) => ({
      schema: 'insight.solana-swap-guard-decision.v1',
      guard,
      transaction: {},
      action: null,
      decisionHash: `0x${'22'.repeat(32)}`,
      attestation: null,
    }));
  });

  it('is discoverable, priced, and validates its narrow input', () => {
    for (const name of [
      'solana_swap_guard',
      'settle_solana_swap_guard',
      'verify_solana_swap_guard_settlement',
    ]) {
      expect(LEGACY_TOOL_BY_NAME.has(name)).toBe(true);
    }
    expect(solanaSwapGuardTool.parameters.safeParse(args).success).toBe(true);
    expect(
      solanaSwapGuardTool.parameters.safeParse({
        ...args,
        guard: { ...args.guard, profileId: 'unreviewed-pool' },
      }).success
    ).toBe(false);
    expect(
      solanaSwapGuardTool.parameters.safeParse({
        ...args,
        guard: { ...args.guard, policy: { ...args.guard.policy, maxSlippageBps: 5_000 } },
      }).success
    ).toBe(false);
    expect(getToolCreditCost('solana_swap_guard')).toBe(20);
    expect(getToolCreditCost('settle_solana_swap_guard')).toBe(40);
    // The verifier checks an offline signature, so its static price is 0 —
    // matching what the charge path actually applies.
    expect(getToolCreditCost('verify_solana_swap_guard_settlement')).toBe(0);
  });

  it('requires human confirmation only for an attested ALLOW', async () => {
    mockedPreflight.mockResolvedValue({
      schema: 'insight.prepared-execution.v1',
      native: guardResult('ALLOW'),
    } as never);
    mockedDecision.mockImplementation((guard) => ({
      schema: 'insight.solana-swap-guard-decision.v1',
      guard,
      transaction: {},
      action: null,
      decisionHash: `0x${'22'.repeat(32)}`,
      attestation: { schema: 'insight.solana-swap-guard-decision.v1' } as never,
    }));
    const output = JSON.parse(await solanaSwapGuardTool.handler(args));
    expect(output.verdict).toBe('ALLOW');
    expect(output.decision.decisionHash).toBe(`0x${'22'.repeat(32)}`);
    expect(output.agentInstructions[0]).toContain('Present the signed Insight decision');
  });

  it('refuses to turn an unattested ALLOW into an authorization input', async () => {
    mockedPreflight.mockResolvedValue({
      schema: 'insight.prepared-execution.v1',
      native: guardResult('ALLOW'),
    } as never);
    const output = JSON.parse(await solanaSwapGuardTool.handler(args));
    expect(output.agentInstructions[0]).toContain('Do not request a signature');
  });

  it('tells an agent not to sign a BLOCK result', async () => {
    mockedPreflight.mockResolvedValue({
      schema: 'insight.prepared-execution.v1',
      native: guardResult('BLOCK'),
    } as never);
    const output = JSON.parse(await solanaSwapGuardTool.handler(args));
    expect(output.agentInstructions[0]).toContain('Do not request a signature');
  });
});

describe('settle_solana_swap_guard MCP tool', () => {
  it('surfaces the settlement payload and preserves non-SETTLED warnings', async () => {
    mockedSettle.mockResolvedValue({
      ok: true,
      settlement: {
        schema: 'insight.solana-swap-guard-settlement.v1',
        payload: {
          decisionHash: `0x${'22'.repeat(32)}`,
          signature: '5'.repeat(87),
          taker: 'Taker',
          profileId: 'solana-orca-whirlpool-usdc-usdt-1',
          direction: 'usdc-to-usdt',
          amountInRaw: '1000000',
          minOutRaw: '1001000',
          sourceAmountRaw: '1000000',
          destinationAmountRaw: '1002000',
          status: 'SETTLED',
          reconciliation: 'AMOUNTS_AND_MIN_OUT_RECONCILED',
          slot: 1,
          executedAt: 1,
          issuedAt: 1,
          schemaVersion: 1 as const,
        },
        signer: { algorithm: 'ed25519', publicKey: 'k' },
        signature: 'sig',
      },
      reason: 'AMOUNTS_AND_MIN_OUT_RECONCILED',
      facts: {
        signature: '5'.repeat(87),
        status: 'CONFIRMED',
        slot: 1,
        sourceAmountRaw: '1000000',
        destinationAmountRaw: '1002000',
        feeLamports: '5000',
      },
    });
    const output = JSON.parse(
      await settleSolanaSwapGuardTool.handler({ decision: {}, signature: '5'.repeat(87) })
    );
    expect(output.settlement.payload.status).toBe('SETTLED');
    expect(output.agentInstructions[0]).toContain('Preserve the signed settlement');

    mockedSettle.mockResolvedValue({
      ok: true,
      settlement: {
        schema: 'insight.solana-swap-guard-settlement.v1',
        payload: {
          decisionHash: `0x${'22'.repeat(32)}`,
          signature: '5'.repeat(87),
          taker: 'Taker',
          profileId: 'solana-orca-whirlpool-usdc-usdt-1',
          direction: 'usdc-to-usdt',
          amountInRaw: '1000000',
          minOutRaw: '1001000',
          sourceAmountRaw: null,
          destinationAmountRaw: null,
          status: 'UNRECONCILED',
          reconciliation: 'SOURCE_AMOUNT_MISMATCH',
          slot: 1,
          executedAt: 1,
          issuedAt: 1,
          schemaVersion: 1 as const,
        },
        signer: { algorithm: 'ed25519', publicKey: 'k' },
        signature: 'sig',
      },
      reason: 'SOURCE_AMOUNT_MISMATCH',
      facts: {
        signature: '5'.repeat(87),
        status: 'CONFIRMED',
        slot: 1,
        sourceAmountRaw: null,
        destinationAmountRaw: null,
        feeLamports: '5000',
      },
    });
    const warned = JSON.parse(
      await settleSolanaSwapGuardTool.handler({ decision: {}, signature: '5'.repeat(87) })
    );
    expect(warned.agentInstructions.join(' ')).toContain('Review the settlement');
  });

  it('throws a machine-readable failure when settlement fails', async () => {
    mockedSettle.mockResolvedValue({
      ok: false,
      code: 'DECISION_INVALID',
      message: 'nope',
    });
    await expect(
      settleSolanaSwapGuardTool.handler({ decision: {}, signature: '5'.repeat(87) })
    ).rejects.toThrow('DECISION_INVALID');
  });
});

describe('verify_solana_swap_guard_settlement MCP tool', () => {
  it('passes the verification result through', async () => {
    mockedVerifySettlement.mockReturnValue({
      valid: true,
      signatureValid: true,
      trusted: true,
      reason: 'OK',
      settlement: null,
      attester: 'k',
      issuedAt: 1,
    });
    const output = JSON.parse(
      await verifySolanaSwapGuardSettlementTool.handler({ settlement: {} })
    );
    expect(output.verification.valid).toBe(true);
    expect(output.note).toContain('does not re-read the chain');
  });
});
