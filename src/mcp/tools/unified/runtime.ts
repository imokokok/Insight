/**
 * Legacy MCP tool registry kept for the 60-day compatibility window.
 *
 * `tools/list` exposes only the 16 unified tools. Callers that hardcode an old
 * tool name keep working through `callLegacy` until the removal date recorded
 * in `LEGACY_TOOL_REMOVAL_DATE`. Legacy calls run the original handler with the
 * original validator, so behaviour and pricing are unchanged.
 */

import { assertX402PaymentScopeDeclaredForMcpTool } from '@/lib/api/x402/capabilityPayment';

import { prepareAerodromeSlipstreamSwapTool } from '../aerodromeSlipstreamTools';
import { agentBeginTradeTool } from '../agentBeginTradeTools';
import {
  getAnomaliesTool,
  getCorrelationTool,
  getCoverageTool,
  getLatencyTool,
  getMetricsTool,
} from '../analysisTools';
import {
  prepareBaseAgentSwapGuardTool,
  settleBaseAgentSwapGuardTool,
  verifyBaseAgentSwapGuardSettlementTool,
} from '../baseAgentSwapGuardTools';
import { baseLendingGuardExactCallTool, baseLendingGuardTool } from '../baseLendingGuardTools';
import { basePerpGuardExactCallTool, basePerpGuardTool } from '../basePerpGuardTools';
import { getOraclePricesBatchTool, getPriceHistoryTool } from '../batchTools';
import { bnbPerpGuardTool } from '../bnbPerpGuardTools';
import { getCrossChainSpreadsTool } from '../crossChainTools';
import {
  getAerodromeSlipstreamMarketTool,
  getPancakeSwapV3MarketTool,
  getQuickSwapV2MarketTool,
  getBaseDexMarketTool,
  getBaseDexVenueIntegrationsTool,
  getHanjiMonadMarketTool,
  getHyperliquidPerpMarketTool,
  getMonadDexMarketTool,
  getSolanaDexRouteTool,
} from '../dexMarketTools';
import { executionPreflightTool } from '../executionPreflightTools';
import { executionReceiptTool } from '../executionReceiptTools';
import {
  getFeedFreshnessTool,
  getFeedHealthTool,
  getFeedUptimeTool,
  getFeedsTool,
} from '../feedTools';
import {
  hyperliquidPerpGuardExactCallTool,
  hyperliquidPerpGuardTool,
} from '../hyperliquidPerpGuardTools';
import {
  prepareHyperliquidPerpOrderTool,
  verifyHyperliquidPerpExecutionTool,
} from '../hyperliquidPerpTools';
import { loopscaleVaultDepositTool } from '../loopscaleVaultDepositTools';
import { monadLendingGuardExactCallTool, monadLendingGuardTool } from '../monadLendingGuardTools';
import {
  multichainEvmLendingGuardExactCallTool,
  multichainEvmLendingGuardTool,
} from '../multichainEvmLendingGuardTools';
import {
  compareOracleDeviationTool,
  getConsensusPriceTool,
  getOracleHealthTool,
  getOraclePriceTool,
} from '../oracleTools';
import { oracleWatchHistoryTool } from '../oracleWatchHistoryTools';
import { oracleWatchTool } from '../oracleWatchTools';
import {
  oracleWatchWindowBeginTool,
  oracleWatchWindowCloseTool,
  oracleWatchWindowPollTool,
} from '../oracleWatchWindowTools';
import { preparePancakeSwapV3SwapTool } from '../pancakeSwapV3Tools';
import {
  positionLifecycleBeginTool,
  positionLifecycleCloseTool,
  positionLifecycleGuardTool,
  positionLifecycleReceiptTool,
} from '../positionLifecycleTools';
import { preTradeSafetyCheckTool } from '../preTradeSafetyTools';
import { getProtocolOracleExposureTool, getProtocolsTool } from '../protocolTools';
import { getDailyReportTool, getIncidentsTool } from '../reportTools';
import { getProviderReputationTool, getReputationRankingsTool } from '../reputationTools';
import {
  checkLiquidationRiskTool,
  getProtocolRiskParamsTool,
  getRiskSummaryTool,
} from '../riskTools';
import { robinhoodRwaContextTool, robinhoodRwaInstrumentTool } from '../rwaTools';
import { checkPositionSafetyTool } from '../safetyTools';
import { getSettlementEvidenceTool } from '../settlementEvidenceTools';
import { solanaLendingGuardTool } from '../solanaLendingGuardTools';
import { solanaPerpGuardTool } from '../solanaPerpGuardTools';
import {
  settleSolanaSwapGuardTool,
  solanaSwapGuardTool,
  verifySolanaSwapGuardSettlementTool,
} from '../solanaSwapGuardTools';
import { getStablecoinPegTool } from '../stablecoinTools';
import { getStablecoinListTool, getSymbolsTool, recommendOracleSetupTool } from '../utilityTools';
import { verifyExecutionPairTool } from '../verifyExecutionPairTools';
import { getWrappedAssetPegTool } from '../wrappedAssetTools';

import type { McpToolCallContext, McpToolDefinition } from '../types';

/**
 * Compatibility deadline: 60 days after the consolidation shipped
 * (2026-11-07 → 2027-01-06). After that date the legacy registry and the
 * `MCP_TOOL_PROFILE=legacy` rollback switch are deleted in one change; old
 * names then return `Unknown tool`.
 */
export const LEGACY_TOOL_REMOVAL_DATE = '2027-01-06';

/**
 * The pre-consolidation surface (80 tools on main; 81 on this branch after
 * `bnb_perp_guard` was added). `assess_rwa_evidence` is
 * intentionally absent: it was the only unsigned diagnostic and carried no
 * evidence value, so it was removed rather than kept for compatibility.
 */
export const LEGACY_MCP_TOOLS: McpToolDefinition[] = [
  robinhoodRwaInstrumentTool,
  robinhoodRwaContextTool,
  getOraclePriceTool,
  getConsensusPriceTool,
  getRiskSummaryTool,
  getOracleHealthTool,
  checkLiquidationRiskTool,
  compareOracleDeviationTool,
  getStablecoinPegTool,
  getProtocolRiskParamsTool,
  getSymbolsTool,
  recommendOracleSetupTool,
  getStablecoinListTool,
  getOraclePricesBatchTool,
  getPriceHistoryTool,
  getCrossChainSpreadsTool,
  getWrappedAssetPegTool,
  getProtocolsTool,
  getProtocolOracleExposureTool,
  getFeedFreshnessTool,
  getFeedsTool,
  getFeedHealthTool,
  getFeedUptimeTool,
  getReputationRankingsTool,
  getProviderReputationTool,
  getDailyReportTool,
  getIncidentsTool,
  getSettlementEvidenceTool,
  getLatencyTool,
  getAnomaliesTool,
  getCorrelationTool,
  getCoverageTool,
  getMetricsTool,
  getMonadDexMarketTool,
  getHanjiMonadMarketTool,
  getBaseDexMarketTool,
  getBaseDexVenueIntegrationsTool,
  getAerodromeSlipstreamMarketTool,
  prepareAerodromeSlipstreamSwapTool,
  prepareBaseAgentSwapGuardTool,
  settleBaseAgentSwapGuardTool,
  verifyBaseAgentSwapGuardSettlementTool,
  getPancakeSwapV3MarketTool,
  preparePancakeSwapV3SwapTool,
  getQuickSwapV2MarketTool,
  getSolanaDexRouteTool,
  getHyperliquidPerpMarketTool,
  prepareHyperliquidPerpOrderTool,
  verifyHyperliquidPerpExecutionTool,
  baseLendingGuardTool,
  baseLendingGuardExactCallTool,
  basePerpGuardTool,
  basePerpGuardExactCallTool,
  bnbPerpGuardTool,
  hyperliquidPerpGuardTool,
  hyperliquidPerpGuardExactCallTool,
  monadLendingGuardTool,
  monadLendingGuardExactCallTool,
  multichainEvmLendingGuardTool,
  multichainEvmLendingGuardExactCallTool,
  solanaLendingGuardTool,
  solanaPerpGuardTool,
  solanaSwapGuardTool,
  settleSolanaSwapGuardTool,
  verifySolanaSwapGuardSettlementTool,
  loopscaleVaultDepositTool,
  checkPositionSafetyTool,
  preTradeSafetyCheckTool,
  oracleWatchTool,
  oracleWatchHistoryTool,
  oracleWatchWindowBeginTool,
  oracleWatchWindowPollTool,
  oracleWatchWindowCloseTool,
  positionLifecycleBeginTool,
  positionLifecycleGuardTool,
  positionLifecycleReceiptTool,
  positionLifecycleCloseTool,
  executionReceiptTool,
  executionPreflightTool,
  agentBeginTradeTool,
  verifyExecutionPairTool,
];

export const LEGACY_TOOL_BY_NAME: ReadonlyMap<string, McpToolDefinition> = new Map(
  LEGACY_MCP_TOOLS.map((tool) => [tool.name, tool])
);

for (const tool of LEGACY_MCP_TOOLS) {
  assertX402PaymentScopeDeclaredForMcpTool(tool.name);
}

/** A legacy tool is no longer served after the compatibility window closes. */
export function legacyToolsExpired(now: Date = new Date()): boolean {
  return now.getTime() >= Date.parse(`${LEGACY_TOOL_REMOVAL_DATE}T00:00:00Z`);
}

/**
 * Run an original tool with its original validator and handler. This is the
 * only path unified tools use to reach business logic, which guarantees the
 * consolidation changed the surface and not the behaviour.
 */
export async function callLegacy<Args = unknown>(
  name: string,
  args: Args,
  context?: McpToolCallContext
): Promise<string> {
  const tool = LEGACY_TOOL_BY_NAME.get(name);
  if (!tool) {
    throw new Error(`Legacy MCP tool is not registered: ${name}`);
  }
  const validated = tool.parameters.parse(args);
  return tool.handler(validated, context);
}
