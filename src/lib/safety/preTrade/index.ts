/**
 * Canonical application boundary for an Insight pre-trade assessment.
 *
 * HTTP routes, MCP tools and other product modules import from this entrypoint.
 * It intentionally exposes the stable use case and its public contract, rather
 * than implementation helpers or infrastructure details.
 */

export { preTradeSafetyCheck } from './assess';
export type { PreTradeSafetyResult } from './assess';
export type {
  AuditMeta,
  ContributingFactor,
  DepegWarning,
  LendingSafetyAction,
  PreTradeSafetyInput,
  ProtocolSafetyContext,
  ProviderPriceDetail,
  SafetyVerdict,
  TradeAction,
} from './contracts';
