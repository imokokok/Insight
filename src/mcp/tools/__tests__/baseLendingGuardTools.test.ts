import { getToolCreditCost } from '@/lib/billing/metering';
import { assessBaseLendingGuard } from '@/lib/lending/baseLendingGuard';
import { createBaseLendingGuardDecision } from '@/lib/lending/baseLendingGuardAttestation';

import { baseLendingGuardExactCallTool, baseLendingGuardTool } from '../baseLendingGuardTools';
import { getToolDefinitions } from '../index';

jest.mock('@/lib/lending/baseLendingGuard', () => {
  const actual = jest.requireActual('@/lib/lending/baseLendingGuard');
  return { ...actual, assessBaseLendingGuard: jest.fn() };
});

jest.mock('@/lib/lending/baseLendingGuardAttestation', () => ({
  createBaseLendingGuardDecision: jest.fn(),
}));

const mockedAssess = assessBaseLendingGuard as jest.MockedFunction<typeof assessBaseLendingGuard>;
const mockedCreateDecision = createBaseLendingGuardDecision as jest.MockedFunction<
  typeof createBaseLendingGuardDecision
>;

describe('base_lending_guard MCP tool', () => {
  beforeEach(() => jest.clearAllMocks());

  it('is discoverable and bills both preview and exact evidence as C3 agent gates', () => {
    const names = getToolDefinitions().map((tool) => tool.name);
    expect(names).toContain('base_lending_guard');
    expect(names).toContain('base_lending_guard_exact_call');
    expect(getToolCreditCost('base_lending_guard')).toBe(5);
    expect(getToolCreditCost('base_lending_guard_exact_call')).toBe(5);
    expect(baseLendingGuardExactCallTool.description).toContain('never authorizes');
  });

  it('states that it does not execute or authorize a transaction', async () => {
    mockedAssess.mockResolvedValue({
      verdict: 'CAUTION',
      protocolId: 'aave-v3-base',
      action: 'borrow',
      market: {
        collateralSymbol: 'WETH',
        loanSymbol: 'USDC',
        marketId: null,
        maxLtv: 0.8,
        liquidationLtv: 0.83,
      },
      projected: { ltv: 0.74, liquidationBufferPct: 10.8, conservativeMaxDebtUsd: 7200 },
      oracleChecks: { collateral: { verdict: 'PASS' }, loan: { verdict: 'CAUTION' } },
      reasons: ['Oracle assessment requires review.'],
    } as never);

    const output = await baseLendingGuardTool.handler({
      protocolId: 'aave-v3-base',
      action: 'borrow',
      collateralSymbol: 'WETH',
      loanSymbol: 'USDC',
      collateralValueUsd: 10_000,
      debtValueUsd: 7_400,
    });

    expect(output).toContain('**CAUTION**');
    expect(output).toContain('never signs, sends, or authorizes');
  });

  it('offers an exact-call evidence result without implying execution authority', async () => {
    mockedAssess.mockResolvedValue({
      verdict: 'ALLOW',
      protocolId: 'aave-v3-base',
      action: 'borrow',
    } as never);
    mockedCreateDecision.mockResolvedValue({
      action: {
        target: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
        calldataHash: `0x${'1'.repeat(64)}`,
      },
      attestation: null,
    } as never);

    const output = await baseLendingGuardExactCallTool.handler({
      guard: {
        protocolId: 'aave-v3-base',
        action: 'borrow',
        collateralSymbol: 'WETH',
        loanSymbol: 'USDC',
        collateralValueUsd: 10_000,
        debtValueUsd: 4_000,
      },
      transaction: {
        chainId: 8453,
        from: '0x1111111111111111111111111111111111111111',
        to: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
        data: '0x1234',
        nonce: '7',
        value: '0',
      },
    });

    expect(mockedCreateDecision).toHaveBeenCalledTimes(1);
    expect(output).toContain('preview only');
    expect(output).toContain('does not authorize, submit, or observe execution');
  });
});
