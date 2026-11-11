/**
 * @deprecated Import from `@/lib/safety/preTrade` instead.
 *
 * This compatibility facade preserves existing consumers while the pre-trade
 * assessment becomes an application module shared by HTTP, MCP and guards.
 */

export { preTradeSafetyCheck } from '@/lib/safety/preTrade';
export type {
  AuditMeta,
  ContributingFactor,
  DepegWarning,
  LendingSafetyAction,
  PreTradeSafetyInput,
  PreTradeSafetyResult,
  ProtocolSafetyContext,
  ProviderPriceDetail,
  SafetyVerdict,
  TradeAction,
} from '@/lib/safety/preTrade';
