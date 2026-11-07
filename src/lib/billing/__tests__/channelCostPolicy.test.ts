import { X402_CREDIT_USD } from '@/lib/api/x402/config';
import { priceAtomicForTool } from '@/lib/api/x402/mcpBridge';
import { UNIFIED_MCP_TOOLS } from '@/mcp/tools/unified';
import { LEGACY_MCP_TOOLS } from '@/mcp/tools/unified/runtime';

import {
  CREDIT_USD,
  MICRO_USDC_PER_CREDIT,
  creditChargeForChannel,
  findChannelConflicts,
  findChannelCostViolations,
  getMcpToolCreditCharge,
  isChainSettlementTool,
  isCreditsCallableTool,
  minCreditsForFloorAtomic,
  type ChannelGuardCall,
} from '../channelCostPolicy';

const ALL_TOOL_NAMES = new Set<string>([
  ...UNIFIED_MCP_TOOLS.map((tool) => tool.name),
  ...LEGACY_MCP_TOOLS.map((tool) => tool.name),
]);

/**
 * One representative argument set per chain a dynamic tool can bind to. A
 * fixed-chain or chain-neutral tool just runs with `{}`; these variants make
 * the BNB/Monad/Solana/HyperEVM realms visible to the guard.
 */
const CHAIN_VARIANTS: Readonly<Record<string, readonly unknown[]>> = {
  get_pancakeswap_v3_market: [
    { profileId: 'base-reviewed' },
    { profileId: 'bnb-reviewed' },
    { profileId: 'monad-reviewed' },
  ],
  prepare_pancakeswap_v3_swap: [
    { profileId: 'base-reviewed' },
    { profileId: 'bnb-reviewed' },
    { profileId: 'monad-reviewed' },
  ],
  prepare_base_agent_swap_guard: [{ profileId: 'bnb-reviewed' }, { profileId: 'monad-reviewed' }],
  settle_base_agent_swap_guard: [{ decision: { guard: { scope: { chainId: 56 } } } }],
  verify_base_agent_swap_guard_settlement: [{ decision: { settlement: { chainId: 56 } } }],
  check_trade_safety: [
    { chain_id: 56 },
    { chain_id: 8453 },
    { chain_id: 143 },
    { chain_id: 999 },
    { chain_id: 'solana' },
    { chain_id: 'hyperliquid' },
  ],
  prepare_swap: [
    { venue: 'base_pancakeswap', profile_id: 'bnb-reviewed' },
    { venue: 'solana_jupiter' },
    { venue: 'hyperliquid_perp' },
  ],
  get_market_quote: [
    { venue: 'base_pancakeswap', profile_id: 'bnb-reviewed' },
    { venue: 'solana_jupiter' },
    { venue: 'hyperliquid_perp' },
  ],
  issue_execution_receipt: [
    { mode: 'settle_solana_swap' },
    { mode: 'settle_base_agent_swap', decision: { guard: { scope: { chainId: 56 } } } },
  ],
  verify_evidence: [
    { kind: 'solana_swap' },
    { kind: 'base_agent_swap', settlement: { chainId: 56 } },
  ],
  multichain_evm_lending_guard: [{ chainId: 56 }],
  multichain_evm_lending_guard_exact_call: [{ chainId: 56 }],
};

function guardCalls(): ChannelGuardCall[] {
  const calls: ChannelGuardCall[] = [];
  for (const toolName of ALL_TOOL_NAMES) {
    calls.push({ toolName });
    for (const args of CHAIN_VARIANTS[toolName] ?? []) calls.push({ toolName, args });
  }
  return calls;
}

describe('credit and x402 channel cost policy', () => {
  it('pins one credit to $0.001 = 1000 micro-USDC', () => {
    expect(CREDIT_USD).toBe(0.001);
    expect(CREDIT_USD).toBe(X402_CREDIT_USD);
    expect(MICRO_USDC_PER_CREDIT).toBe(1000);
  });

  it('rounds the chain floor up to whole credits', () => {
    expect(minCreditsForFloorAtomic('4861')).toBe(5); // BNB: ceil(4.861)
    expect(minCreditsForFloorAtomic('1800')).toBe(2); // Base
    expect(minCreditsForFloorAtomic('1100')).toBe(2); // HyperEVM
    expect(minCreditsForFloorAtomic('900')).toBe(1); // Solana
    expect(minCreditsForFloorAtomic('2000')).toBe(2);
    expect(minCreditsForFloorAtomic('5000')).toBe(5);
    expect(minCreditsForFloorAtomic('5001')).toBe(6);
    expect(minCreditsForFloorAtomic(1n)).toBe(1);
  });

  it('leaves a credits-only tool at its list price even when it is bound to a chain', () => {
    expect(getMcpToolCreditCharge('get_pancakeswap_v3_market', { profileId: 'bnb-reviewed' })).toBe(
      2
    );
    expect(
      getMcpToolCreditCharge('get_pancakeswap_v3_market', { profileId: 'base-reviewed' })
    ).toBe(2);
  });

  it('lifts only a declared chain-settlement tool to the floor', () => {
    // Synthetic chain-settling tool on BNB (floor 4861 → 5 credits).
    expect(
      creditChargeForChannel({
        listPrice: 2,
        chainSettlementCost: true,
        minCreditsForChain: 5,
      })
    ).toBe(5);
    // Same price and floor, but the tool carries no chain cost: list price wins.
    expect(
      creditChargeForChannel({
        listPrice: 2,
        chainSettlementCost: false,
        minCreditsForChain: 5,
      })
    ).toBe(2);
    // Free verification stays free even if it were classified chain-settling.
    expect(
      creditChargeForChannel({
        listPrice: 0,
        chainSettlementCost: true,
        minCreditsForChain: 5,
      })
    ).toBe(0);
  });

  it('keeps explicit free and entitlement-covered calls at zero credits', () => {
    expect(getMcpToolCreditCharge('verify_evidence', { kind: 'execution_pair' })).toBe(0);
    expect(getMcpToolCreditCharge('oracle_watch_window_poll')).toBe(0);
  });

  it('leaves the x402 quote untouched so the BNB floor challenge still refuses C1', () => {
    // Credits carry no chain cost, so both channels keep their list prices:
    // x402 stays at 2000 and remains floor_excluded on BNB (4861).
    expect(priceAtomicForTool('get_pancakeswap_v3_market', { profileId: 'bnb-reviewed' })).toBe(
      '2000'
    );
    expect(getMcpToolCreditCharge('get_pancakeswap_v3_market', { profileId: 'bnb-reviewed' })).toBe(
      2
    );
  });

  // A02: only a chain-settling tool gets a floor-backed minimum; credits-only
  // tools carry no chain cost and must keep their list price.
  it('finds no chain-settlement MCP call below its chain floor', () => {
    expect(findChannelCostViolations(guardCalls())).toEqual([]);
  });

  // A07: the guard itself must fail and name the tool when a chain-cost tool
  // is wired into the credits channel.
  it('names a tool that is both chain-settling and credits-callable', () => {
    expect(
      findChannelConflicts([
        { toolName: 'settle_onchain_swap', creditsCallable: true, chainSettlementCost: true },
      ])
    ).toEqual(['settle_onchain_swap']);
  });

  it('accepts a tool that settles on-chain only through x402', () => {
    expect(
      findChannelConflicts([
        { toolName: 'settle_onchain_swap', creditsCallable: false, chainSettlementCost: true },
      ])
    ).toEqual([]);
  });

  it('finds no real catalog tool on both channels', () => {
    const declarations = [...ALL_TOOL_NAMES].map((toolName) => ({
      toolName,
      creditsCallable: isCreditsCallableTool(toolName),
      chainSettlementCost: isChainSettlementTool(toolName),
    }));
    expect(findChannelConflicts(declarations)).toEqual([]);
  });
});
