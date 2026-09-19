import { getStablecoinConfig } from '@/lib/stablecoins/config';

import type {
  PreTradeSafetyInput,
  ProtocolSafetyContext,
  ProviderPriceDetail,
} from './preTradeSafetyService';

const ACTION_DIRECTION = {
  borrow: 'increase_debt',
  repay: 'reduce_debt',
  lend: 'supply_assets',
  liquidate: 'liquidation',
  swap: 'exchange',
} as const;

export function buildAssessmentScope(
  input: PreTradeSafetyInput,
  providers: Record<string, ProviderPriceDetail>,
  protocolSafety: ProtocolSafetyContext | null,
  protocolUnavailableReason: string | null,
  depegAvailable: boolean
) {
  const requestedDimensions = ['oracle_consensus', 'source_freshness'];
  const evaluatedDimensions: string[] = [];
  const unavailableDimensions: { dimension: string; reason: string }[] = [];
  const successful = Object.values(providers).filter((p) => p.status === 'success' && p.price > 0);
  if (successful.length) evaluatedDimensions.push('oracle_consensus');
  else
    unavailableDimensions.push({
      dimension: 'oracle_consensus',
      reason: 'NO_RESPONDING_PROVIDERS',
    });
  if (successful.length && successful.every((p) => p.dataAgeSeconds !== null))
    evaluatedDimensions.push('source_freshness');
  else
    unavailableDimensions.push({
      dimension: 'source_freshness',
      reason: 'SOURCE_TIMESTAMPS_UNAVAILABLE',
    });
  if (getStablecoinConfig(input.asset)) {
    requestedDimensions.push('stablecoin_peg');
    if (depegAvailable) evaluatedDimensions.push('stablecoin_peg');
    else
      unavailableDimensions.push({
        dimension: 'stablecoin_peg',
        reason: 'PEG_MONITOR_UNAVAILABLE',
      });
  }
  if (input.protocolId) {
    requestedDimensions.push('protocol_parameters');
    if (protocolSafety) evaluatedDimensions.push('protocol_parameters');
    else
      unavailableDimensions.push({
        dimension: 'protocol_parameters',
        reason: protocolUnavailableReason ?? 'ORACLE_EVIDENCE_UNAVAILABLE',
      });
  }
  return {
    requestedDimensions,
    evaluatedDimensions,
    unavailableDimensions,
    actionRiskDirection: ACTION_DIRECTION[input.action],
    evidenceChainId: input.chainId,
    chainScope: input.chainId === 0 ? 'chain_agnostic' : 'explicit_chain',
    destinationAssetEvaluated: false,
    positionStateEvaluated: false,
    protocolBufferGateApplied: input.action === 'borrow' && protocolSafety !== null,
    signed: false,
  };
}

export function buildSizingBasis(protocolSafety: ProtocolSafetyContext | null) {
  return {
    kind: 'oracle_condition_advisory_cap' as const,
    baselineUsd: 1_000_000,
    inputsUsed: [
      'max_provider_deviation_pct',
      ...(protocolSafety ? ['protocol_max_ltv_buffer'] : []),
    ],
    inputsMissing: [
      'venue_liquidity',
      'route_simulation',
      'account_position',
      'slippage',
      'customer_policy_limit',
    ],
    executionCapacityVerified: false as const,
    assumptions: [
      'Fixed USD baseline scaled by oracle dispersion and available protocol buffer; not executable liquidity or an account-specific limit.',
    ],
  };
}
