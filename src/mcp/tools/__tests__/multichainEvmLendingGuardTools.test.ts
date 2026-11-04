import { getToolCreditCost } from '@/lib/billing/metering';
import { assessMultichainEvmLendingGuard } from '@/lib/lending/multichainEvmLendingGuard';
import { createMultichainEvmLendingGuardDecision } from '@/lib/lending/multichainEvmLendingGuardAttestation';

import { getToolDefinitions } from '../index';
import {
  multichainEvmLendingGuardExactCallTool,
  multichainEvmLendingGuardTool,
} from '../multichainEvmLendingGuardTools';

jest.mock('@/lib/lending/multichainEvmLendingGuard', () => {
  const actual = jest.requireActual('@/lib/lending/multichainEvmLendingGuard');
  return { ...actual, assessMultichainEvmLendingGuard: jest.fn() };
});
jest.mock('@/lib/lending/multichainEvmLendingGuardAttestation', () => ({
  createMultichainEvmLendingGuardDecision: jest.fn(),
}));

const mockedAssess = assessMultichainEvmLendingGuard as jest.MockedFunction<
  typeof assessMultichainEvmLendingGuard
>;
const mockedCreate = createMultichainEvmLendingGuardDecision as jest.MockedFunction<
  typeof createMultichainEvmLendingGuardDecision
>;
const vault = '0x6666666666666666666666666666666666666666' as const;
const input = {
  chainId: 8453 as const,
  protocolId: 'euler-v2-base' as const,
  action: 'supply' as const,
  collateralSymbol: 'USDC',
  loanSymbol: 'USDC',
  collateralValueUsd: 100,
  debtValueUsd: 0,
  marketAddress: vault,
};

describe('multichain_evm_lending_guard MCP tools', () => {
  beforeEach(() => jest.clearAllMocks());

  it('is discoverable and metered as an agent gate', () => {
    const names = getToolDefinitions().map((tool) => tool.name);
    expect(names).toContain('multichain_evm_lending_guard');
    expect(names).toContain('multichain_evm_lending_guard_exact_call');
    expect(getToolCreditCost('multichain_evm_lending_guard')).toBe(5);
    expect(getToolCreditCost('multichain_evm_lending_guard_exact_call')).toBe(5);
  });

  it('makes the no-execution boundary explicit', async () => {
    mockedAssess.mockResolvedValue({
      verdict: 'ALLOW',
      protocolId: input.protocolId,
      action: input.action,
      chainId: input.chainId,
      market: {
        collateralSymbol: 'USDC',
        loanSymbol: 'USDC',
        marketId: null,
        marketAddress: vault,
        maxLtv: 1,
        liquidationLtv: 1,
      },
      projected: { ltv: 0, liquidationBufferPct: 100, conservativeMaxDebtUsd: 90 },
      oracleChecks: { collateral: { verdict: 'PASS' }, loan: { verdict: 'PASS' } },
      reasons: ['Passed.'],
    } as never);

    const output = await multichainEvmLendingGuardTool.handler(input);
    expect(output).toContain('never signs, sends, or authorizes');
  });

  it('creates exact-call evidence without submitting the transaction', async () => {
    mockedAssess.mockResolvedValue({
      verdict: 'ALLOW',
      protocolId: input.protocolId,
      action: input.action,
    } as never);
    mockedCreate.mockResolvedValue({
      action: { target: vault, calldataHash: `0x${'1'.repeat(64)}` },
      attestation: null,
    } as never);
    const transaction = {
      chainId: 8453 as const,
      from: '0x1111111111111111111111111111111111111111',
      to: vault,
      data: '0x1234' as const,
      nonce: '1',
      value: '0',
    };
    const output = await multichainEvmLendingGuardExactCallTool.handler({
      guard: input,
      transaction,
    });
    expect(mockedCreate).toHaveBeenCalledTimes(1);
    expect(output).toContain('does not authorize, submit, or observe execution');
  });
});
