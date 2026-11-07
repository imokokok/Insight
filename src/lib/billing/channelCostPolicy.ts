/**
 * @fileoverview Channel cost policy: the credit channel vs the x402 channel.
 *
 * Credits (API-key calls) and x402 (on-chain settlement) are two separate
 * pricing curves, but they expose the same MCP catalog. A tool whose execution
 * necessarily incurs on-chain settlement cost must therefore be sold through
 * x402 only; it may never be reached through credits, and no tool may silently
 * skip the chain floor check.
 *
 * Rules, in priority order (declared here so they cannot drift into prose):
 *   1. Raise the credit price until `credits × $0.001` covers the chain floor.
 *   2. If the business rejects that price and the tool necessarily settles
 *      on-chain, list it in {@link CHAIN_SETTLEMENT_TOOLS} so it is x402-only.
 *   3. Never exempt a tool silently: every credits-priced tool is covered by
 *      the floor guard, and every chain-settlement tool is covered by the
 *      channel guard.
 */

import {
  x402PaymentScopeForMcpTool,
  type X402PaymentScope,
} from '@/lib/api/x402/capabilityPayment';
import {
  builtInNetworkFloorAtomic,
  SOLANA_MAINNET_CAIP2,
  X402_CREDIT_USD,
} from '@/lib/api/x402/config';

import { getMcpToolCreditCostForCall } from './productPricing';

/** USDC has 6 decimals; one credit is $0.001, i.e. 1000 micro-USDC. */
export const MICRO_USDC_PER_CREDIT = 1000;

/** Must stay equal to the x402 per-credit factor; the guard test pins it. */
export const CREDIT_USD = X402_CREDIT_USD;

/**
 * Tools whose execution necessarily incurs an on-chain settlement cost. They
 * are x402-only: the credits gate rejects them before execution. Empty today —
 * every shipped MCP tool reads, prices, or signs evidence off-chain.
 */
export const CHAIN_SETTLEMENT_TOOLS: ReadonlySet<string> = new Set();

/** True when a tool must be sold through x402 and never through credits. */
export function isChainSettlementTool(toolName: string): boolean {
  return CHAIN_SETTLEMENT_TOOLS.has(toolName);
}

/** Credentials/credits may reach a tool unless it is declared x402-only. */
export function isCreditsCallableTool(toolName: string): boolean {
  return !isChainSettlementTool(toolName);
}

/**
 * Smallest integer credits whose USD value covers `floorAtomic` micro-USDC:
 * `ceil(floorAtomic / 1000)`. A non-positive floor still costs one credit so
 * a zero floor can never mint a free call.
 */
export function minCreditsForFloorAtomic(floorAtomic: string | bigint): number {
  const floor = typeof floorAtomic === 'bigint' ? floorAtomic : BigInt(floorAtomic);
  if (floor < 0n) throw new Error(`Channel floor cannot be negative: ${floor.toString()}`);
  const credits = (floor + BigInt(MICRO_USDC_PER_CREDIT - 1)) / BigInt(MICRO_USDC_PER_CREDIT);
  return Math.max(1, Number(credits));
}

/** Payment network a capability settles on, or null for chain-neutral scopes. */
export function paymentNetworkForScope(scope: X402PaymentScope): string | null {
  if (scope.kind === 'evm') return scope.network;
  if (scope.kind === 'solana') return SOLANA_MAINNET_CAIP2;
  return null;
}

/**
 * Minimum credits for one MCP call, derived from the chain its arguments bind
 * the capability to. `null` means the call has no chain floor to clear.
 */
export function minCreditsForMcpCall(toolName: string, args?: unknown): number | null {
  const scope = x402PaymentScopeForMcpTool(toolName, args);
  if (scope === null) return null;
  const network = paymentNetworkForScope(scope);
  if (network === null) return null;
  const floorAtomic = builtInNetworkFloorAtomic(network);
  return floorAtomic === null ? null : minCreditsForFloorAtomic(floorAtomic);
}

/**
 * Credits charged for one call. The chain floor is applied only to tools in
 * {@link CHAIN_SETTLEMENT_TOOLS}: those calls do incur settlement cost, so
 * rule 1 lifts them to `max(listPrice, minCredits)`. A credits-only tool has
 * no chain cost and keeps its list price verbatim — the x402 floor is not
 * evidence of a cost the credits channel ever pays.
 */
export function creditChargeForChannel(input: {
  readonly listPrice: number;
  readonly chainSettlementCost: boolean;
  readonly minCreditsForChain: number | null;
}): number {
  if (!input.chainSettlementCost || input.listPrice === 0) return input.listPrice;
  return input.minCreditsForChain === null
    ? input.listPrice
    : Math.max(input.listPrice, input.minCreditsForChain);
}

/** Credits charged for one MCP call under the current classification. */
export function getMcpToolCreditCharge(toolName: string, args?: unknown): number {
  return creditChargeForChannel({
    listPrice: getMcpToolCreditCostForCall(toolName, args),
    chainSettlementCost: isChainSettlementTool(toolName),
    minCreditsForChain: minCreditsForMcpCall(toolName, args),
  });
}

export type ChannelGuardCall = { readonly toolName: string; readonly args?: unknown };

export type ChannelCostViolation =
  | {
      readonly toolName: string;
      readonly reason: 'credits_below_floor';
      readonly network: string;
      readonly creditAtomic: string;
      readonly floorAtomic: string;
    }
  | { readonly toolName: string; readonly reason: 'chain_settlement_on_credits' };

/**
 * Executable form of rule 1 + 3, scoped to chain-settling tools: such a tool
 * may not be credits-priced below the floor of the chain it settles on, and
 * may not remain credits-callable at all. Credits-only tools carry no chain
 * cost, so they are not compared against a floor.
 */
export function findChannelCostViolations(
  calls: readonly ChannelGuardCall[]
): ChannelCostViolation[] {
  const violations: ChannelCostViolation[] = [];
  for (const call of calls) {
    if (!isChainSettlementTool(call.toolName)) continue;
    if (isCreditsCallableTool(call.toolName)) {
      violations.push({ toolName: call.toolName, reason: 'chain_settlement_on_credits' });
      continue;
    }
    const credits = getMcpToolCreditCharge(call.toolName, call.args);
    if (credits <= 0) continue; // explicit free / entitlement-covered call
    const scope = x402PaymentScopeForMcpTool(call.toolName, call.args);
    const network = scope === null ? null : paymentNetworkForScope(scope);
    if (network === null) continue;
    const floorAtomic = builtInNetworkFloorAtomic(network);
    if (floorAtomic === null) continue;
    const creditAtomic = String(BigInt(Math.round(credits)) * BigInt(MICRO_USDC_PER_CREDIT));
    if (BigInt(creditAtomic) < BigInt(floorAtomic)) {
      violations.push({
        toolName: call.toolName,
        reason: 'credits_below_floor',
        network,
        creditAtomic,
        floorAtomic,
      });
    }
  }
  return violations;
}

export type ChannelDeclaration = {
  readonly toolName: string;
  readonly creditsCallable: boolean;
  readonly chainSettlementCost: boolean;
};

/**
 * Executable form of rule 2 (A07): a tool cannot be both credits-callable
 * and chain-settling. Returns the offending tool names.
 */
export function findChannelConflicts(declarations: readonly ChannelDeclaration[]): string[] {
  return declarations
    .filter((declaration) => declaration.creditsCallable && declaration.chainSettlementCost)
    .map((declaration) => declaration.toolName);
}
