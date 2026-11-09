import { assertX402PaymentScopeDeclaredForMcpTool } from '@/lib/api/x402/capabilityPayment';
import { isUpstreamTimeoutError, UPSTREAM_TIMEOUT_CODE } from '@/lib/billing/exemptions';
import { createLogger } from '@/lib/utils/logger';

import {
  prepareBaseAgentSwapGuardTool,
  settleBaseAgentSwapGuardTool,
  verifyBaseAgentSwapGuardSettlementTool,
} from './baseAgentSwapGuardTools';
import {
  AerodromeSlipstreamMarketJsonSchema,
  AerodromeSlipstreamSwapPreparationJsonSchema,
  PancakeSwapV3MarketJsonSchema,
  PancakeSwapV3SwapPreparationJsonSchema,
  QuickSwapV2MarketJsonSchema,
  AnomaliesJsonSchema,
  BaseDexMarketJsonSchema,
  BaseDexVenueIntegrationJsonSchema,
  BaseLendingGuardExactJsonSchema,
  BaseLendingGuardJsonSchema,
  BasePerpGuardExactJsonSchema,
  BasePerpGuardJsonSchema,
  BnbPerpGuardJsonSchema,
  MonadLendingGuardExactJsonSchema,
  MonadLendingGuardJsonSchema,
  MultichainEvmLendingGuardExactJsonSchema,
  MultichainEvmLendingGuardJsonSchema,
  HyperliquidPerpMarketJsonSchema,
  HyperliquidPerpExecutionVerificationJsonSchema,
  HyperliquidPerpOrderPreflightJsonSchema,
  HyperliquidPerpGuardExactJsonSchema,
  HyperliquidPerpGuardJsonSchema,
  SolanaPerpGuardJsonSchema,
  BatchPriceJsonSchema,
  ConsensusPriceJsonSchema,
  CorrelationJsonSchema,
  CoverageJsonSchema,
  CrossChainSpreadJsonSchema,
  DateQueryJsonSchema,
  DeviationJsonSchema,
  ExecutionReceiptJsonSchema,
  ExecutionPreflightJsonSchema,
  AgentBeginTradeJsonSchema,
  VerifyExecutionPairJsonSchema,
  FeedFreshnessJsonSchema,
  FeedHealthJsonSchema,
  FeedsJsonSchema,
  IncidentsJsonSchema,
  SettlementEvidenceJsonSchema,
  LatencyJsonSchema,
  MetricsJsonSchema,
  HanjiMonadMarketJsonSchema,
  MonadDexMarketJsonSchema,
  OraclePriceJsonSchema,
  OracleSetupRecommendationJsonSchema,
  OracleWatchHistoryJsonSchema,
  OracleWatchJsonSchema,
  PositionLifecycleGuardJsonSchema,
  PositionLifecycleReceiptJsonSchema,
  LifecycleTokenJsonSchema,
  ProductBeginJsonSchema,
  ProductTokenJsonSchema,
  PositionSafetyJsonSchema,
  PreTradeSafetyJsonSchema,
  PriceHistoryJsonSchema,
  ProviderReputationJsonSchema,
  ProtocolOracleExposureJsonSchema,
  ProtocolRiskParamsJsonSchema,
  ProtocolsJsonSchema,
  ReputationRankingsJsonSchema,
  RiskSummaryJsonSchema,
  SolanaDexRouteJsonSchema,
  StablecoinJsonSchema,
  SymbolQueryJsonSchema,
  WrappedAssetJsonSchema,
} from './jsonSchemas';
import { loopscaleVaultDepositTool } from './loopscaleVaultDepositTools';
import { solanaLendingGuardTool } from './solanaLendingGuardTools';
import {
  settleSolanaSwapGuardTool,
  solanaSwapGuardTool,
  verifySolanaSwapGuardSettlementTool,
} from './solanaSwapGuardTools';
import { UNIFIED_MCP_TOOLS, UNIFIED_TOOL_BY_NAME } from './unified';
import { canonicalizeAlias } from './unified/aliases';
import {
  LEGACY_MCP_TOOLS,
  LEGACY_TOOL_BY_NAME,
  LEGACY_TOOL_REMOVAL_DATE,
  legacyToolsExpired,
} from './unified/runtime';

import type { McpToolCallContext, McpToolCallResult, McpToolDefinition } from './types';

const logger = createLogger(`mcp-tools`);

/**
 * Default `core` lists the 4 canonical product tools plus their 16 deprecated
 * alias spellings. `MCP_TOOL_PROFILE=legacy` re-exposes the 81 legacy tools for
 * rollback only until LEGACY_TOOL_REMOVAL_DATE.
 */
function toolProfile(): 'core' | 'legacy' {
  return process.env.MCP_TOOL_PROFILE === `legacy` ? `legacy` : `core`;
}

const JSON_SCHEMA_MAP: Record<
  string,
  { type: 'object'; properties?: Record<string, unknown>; required?: string[] }
> = {
  get_robinhood_rwa_context: {
    type: 'object',
    properties: {
      symbol: {
        type: 'string',
        pattern: '^[A-Za-z][A-Za-z0-9.-]{0,15}$',
        description: 'Robinhood Stock Token symbol, e.g. AAPL, NVDA, SPY',
      },
      verifyOnchain: {
        type: 'boolean',
        default: true,
        description: 'Cross-check the REST multiplier and pause state on Robinhood Chain',
      },
    },
    required: ['symbol'],
  },
  get_robinhood_rwa_instrument: {
    type: 'object',
    properties: {
      symbol: {
        type: 'string',
        pattern: '^[A-Za-z][A-Za-z0-9.-]{0,15}$',
        description: 'Robinhood Stock Token symbol, e.g. AAPL, NVDA, SPY',
      },
      verifyOnchain: {
        type: 'boolean',
        default: true,
        description: 'Also collect the existing on-chain issuer-context integrity checks',
      },
    },
    required: ['symbol'],
  },
  get_oracle_price: OraclePriceJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  get_consensus_price: ConsensusPriceJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  get_risk_summary: RiskSummaryJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  get_oracle_health: DateQueryJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  check_liquidation_risk: DateQueryJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  compare_oracle_deviation: DeviationJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  get_stablecoin_peg: StablecoinJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  get_protocol_risk_params: ProtocolRiskParamsJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  get_symbols: SymbolQueryJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  recommend_oracle_setup: OracleSetupRecommendationJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  get_stablecoin_list: SymbolQueryJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  get_oracle_prices_batch: BatchPriceJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  get_price_history: PriceHistoryJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  get_cross_chain_spreads: CrossChainSpreadJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  get_wrapped_asset_peg: WrappedAssetJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  get_protocols: ProtocolsJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  get_protocol_oracle_exposure: ProtocolOracleExposureJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  get_feed_freshness: FeedFreshnessJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  get_feeds: FeedsJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  get_feed_health: FeedHealthJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  get_feed_uptime: LatencyJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  get_reputation_rankings: ReputationRankingsJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  get_provider_reputation: ProviderReputationJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  get_daily_report: DateQueryJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  get_incidents: IncidentsJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  get_settlement_evidence: SettlementEvidenceJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  get_latency: LatencyJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  get_anomalies: AnomaliesJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  get_correlation: CorrelationJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  get_coverage: CoverageJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  get_metrics: MetricsJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  get_monad_dex_market: MonadDexMarketJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  get_hanji_monad_market: HanjiMonadMarketJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  get_base_dex_market: BaseDexMarketJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  get_base_dex_venue_integrations: BaseDexVenueIntegrationJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  get_aerodrome_slipstream_market: AerodromeSlipstreamMarketJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  prepare_aerodrome_slipstream_swap:
    AerodromeSlipstreamSwapPreparationJsonSchema.toJSONSchema() as {
      type: 'object';
      properties?: Record<string, unknown>;
      required?: string[];
    },
  prepare_base_agent_swap_guard: prepareBaseAgentSwapGuardTool.parameters.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  settle_base_agent_swap_guard: settleBaseAgentSwapGuardTool.parameters.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  verify_base_agent_swap_guard_settlement:
    verifyBaseAgentSwapGuardSettlementTool.parameters.toJSONSchema() as {
      type: 'object';
      properties?: Record<string, unknown>;
      required?: string[];
    },
  get_pancakeswap_v3_market: PancakeSwapV3MarketJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  prepare_pancakeswap_v3_swap: PancakeSwapV3SwapPreparationJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  get_quickswap_v2_market: QuickSwapV2MarketJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  base_lending_guard: BaseLendingGuardJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  base_lending_guard_exact_call: BaseLendingGuardExactJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  base_perp_guard: BasePerpGuardJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  base_perp_guard_exact_call: BasePerpGuardExactJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  bnb_perp_guard: BnbPerpGuardJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  hyperliquid_perp_guard: HyperliquidPerpGuardJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  hyperliquid_perp_guard_exact_call: HyperliquidPerpGuardExactJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  monad_lending_guard: MonadLendingGuardJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  monad_lending_guard_exact_call: MonadLendingGuardExactJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  multichain_evm_lending_guard: MultichainEvmLendingGuardJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  multichain_evm_lending_guard_exact_call:
    MultichainEvmLendingGuardExactJsonSchema.toJSONSchema() as {
      type: 'object';
      properties?: Record<string, unknown>;
      required?: string[];
    },
  solana_lending_guard: solanaLendingGuardTool.parameters.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  solana_perp_guard: SolanaPerpGuardJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  solana_swap_guard: solanaSwapGuardTool.parameters.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  settle_solana_swap_guard: settleSolanaSwapGuardTool.parameters.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  verify_solana_swap_guard_settlement:
    verifySolanaSwapGuardSettlementTool.parameters.toJSONSchema() as {
      type: 'object';
      properties?: Record<string, unknown>;
      required?: string[];
    },
  loopscale_vault_deposit: loopscaleVaultDepositTool.parameters.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  get_solana_dex_route: SolanaDexRouteJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  get_hyperliquid_perp_market: HyperliquidPerpMarketJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  prepare_hyperliquid_perp_order: HyperliquidPerpOrderPreflightJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  verify_hyperliquid_perp_execution:
    HyperliquidPerpExecutionVerificationJsonSchema.toJSONSchema() as {
      type: 'object';
      properties?: Record<string, unknown>;
      required?: string[];
    },
  check_position_safety: PositionSafetyJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  pre_trade_safety_check: PreTradeSafetyJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  oracle_watch: OracleWatchJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  oracle_watch_history: OracleWatchHistoryJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  oracle_watch_window_begin: ProductBeginJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  oracle_watch_window_poll: ProductTokenJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  oracle_watch_window_close: ProductTokenJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  position_lifecycle_begin: ProductBeginJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  position_lifecycle_guard: PositionLifecycleGuardJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  position_lifecycle_receipt: PositionLifecycleReceiptJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  position_lifecycle_close: LifecycleTokenJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  execution_receipt: ExecutionReceiptJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  execution_preflight: ExecutionPreflightJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  agent_begin_trade: AgentBeginTradeJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
  verify_execution_pair: VerifyExecutionPairJsonSchema.toJSONSchema() as {
    type: 'object';
    properties?: Record<string, unknown>;
    required?: string[];
  },
};

// Wire schemas are separate from runtime validators because Zod transforms
// cannot always be represented in JSON Schema. Legacy tools must keep their
// advertised schema for the compatibility window; unified tools carry theirs.
for (const tool of UNIFIED_MCP_TOOLS) {
  if (!tool.inputSchema) {
    throw new Error(
      `Unified MCP tool "${tool.name}" is missing an inputSchema. Add one in ./unified/schemas.`
    );
  }
  assertX402PaymentScopeDeclaredForMcpTool(tool.name);
}

for (const tool of LEGACY_MCP_TOOLS) {
  if (!JSON_SCHEMA_MAP[tool.name]) {
    throw new Error(
      `MCP tool "${tool.name}" is missing a JSON schema entry in JSON_SCHEMA_MAP. ` +
        `Add a corresponding schema in ./jsonSchemas and register it in the map.`
    );
  }
  assertX402PaymentScopeDeclaredForMcpTool(tool.name);
}

/**
 * Which registry serves a tool name under the current profile.
 *
 * Order: canonical product names are always unified; a deprecated alias under
 * the legacy profile resolves to the real legacy implementation when one
 * exists; every other alias is unified (it canonicalizes onto its product);
 * remaining unified names follow; legacy is the last fallback.
 */
export function resolveToolSource(name: string): 'unified' | 'legacy' | 'unknown' {
  const legacy = LEGACY_TOOL_BY_NAME.get(name);
  if (toolProfile() === 'legacy' && legacy && !legacyToolsExpired()) {
    return 'legacy';
  }
  if (UNIFIED_TOOL_BY_NAME.has(name)) return 'unified';
  if (legacy && !legacyToolsExpired()) return 'legacy';
  return 'unknown';
}

export interface CanonicalToolCall {
  name: string;
  args: unknown;
}

/**
 * The one canonicalization used at the JSON-RPC boundary. Deprecated aliases
 * become their product tool plus the op selector; the legacy profile keeps the
 * old spelling so rollback still reaches the real legacy implementation.
 */
export function canonicalizeToolCall(name: string, args: unknown): CanonicalToolCall {
  if (resolveToolSource(name) === 'legacy') return { name, args };
  const canonical = canonicalizeAlias(name, args);
  return canonical ? { name: canonical.name, args: canonical.args } : { name, args };
}

export interface DispatchedTool {
  definition: McpToolDefinition;
  source: 'unified' | 'legacy';
  name: string;
  args: unknown;
}

/** Resolve a name to the definition and args the dispatcher will actually run. */
export function resolveDispatchedTool(name: string, args: unknown): DispatchedTool | null {
  const source = resolveToolSource(name);
  if (source === 'unified') {
    const canonical = canonicalizeAlias(name, args);
    const target = canonical?.name ?? name;
    const definition = UNIFIED_TOOL_BY_NAME.get(target);
    if (!definition) return null;
    return { definition, source, name: target, args: canonical?.args ?? args };
  }
  if (source === 'legacy') {
    const definition = LEGACY_TOOL_BY_NAME.get(name);
    if (!definition) return null;
    return { definition, source, name, args };
  }
  return null;
}

export function getToolDefinitions() {
  const tools = toolProfile() === 'legacy' ? LEGACY_MCP_TOOLS : UNIFIED_MCP_TOOLS;
  return tools.map((tool) => {
    // Advertise the schema the dispatcher will validate with, so tools/list and
    // execution never describe different input shapes for the same name.
    if (resolveToolSource(tool.name) === 'unified') {
      const unified = UNIFIED_TOOL_BY_NAME.get(tool.name)!;
      return {
        name: tool.name,
        description: unified.description,
        inputSchema: unified.inputSchema,
        ...(unified.pricing ? { pricing: unified.pricing } : {}),
        ...(unified.deprecated ? { deprecated: unified.deprecated } : {}),
      };
    }
    return {
      name: tool.name,
      description: tool.description,
      inputSchema: JSON_SCHEMA_MAP[tool.name],
    };
  });
}

export async function executeTool(
  name: string,
  args: unknown,
  context?: McpToolCallContext
): Promise<McpToolCallResult> {
  const dispatched = resolveDispatchedTool(name, args);
  if (!dispatched) {
    const removalHint =
      LEGACY_TOOL_BY_NAME.has(name) && legacyToolsExpired()
        ? ` (legacy name removed on ${LEGACY_TOOL_REMOVAL_DATE})`
        : ``;
    return {
      content: [{ type: `text`, text: `Unknown tool: ${name}${removalHint}` }],
      isError: true,
    };
  }

  if (dispatched.source === 'unified') {
    // A numeric `chain_id` on a branch that names its chain `chain` would be
    // stripped by Zod and the call would silently widen to every chain. Refuse
    // it before validation so the caller gets an actionable, structured error.
    if (droppedChainIdField(dispatched.name, dispatched.args)) {
      return {
        content: [{ type: `text`, text: droppedChainIdError(name, dispatched) }],
        isError: true,
      };
    }

    // Independent route quotes are Ethereum-mainnet only. Refuse other chains
    // before the handler turns the quote error into an unbilled-looking prose
    // refusal that the outcome classifier cannot see.
    if (dispatched.name === 'trade_proof') {
      const unsupportedChainId = unsupportedRouteQuoteChain(dispatched.args);
      if (unsupportedChainId !== null) {
        return {
          content: [
            {
              type: `text`,
              text: `[unavailable:unsupported_chain] trade_proof begin_evidence: independent on-chain route quotes are available only on Ethereum mainnet (chain_id 1). chain_id ${unsupportedChainId} was refused before any evidence handle or charge was created. No execution handle was issued, so no execution receipt can be bound.`,
            },
          ],
          isError: true,
        };
      }
    }
  }

  try {
    const validatedArgs = dispatched.definition.parameters.parse(dispatched.args);
    const result = await dispatched.definition.handler(validatedArgs, context);
    return { content: [{ type: `text`, text: result }] };
  } catch (error) {
    return toolError(name, error);
  }
}

/**
 * Branches whose schema names the chain with `chain` (a chain *name*). A
 * numeric `chain_id` is the spelling of a different branch family; Zod strips
 * unknown keys, so accepting it here would turn a chain-scoped read into a
 * cross-chain aggregate. `chain_id` is still valid for the ops absent here,
 * such as `trade_guard` op `check_safety`.
 */
const CHAIN_NAME_BRANCHES: Readonly<Record<string, readonly string[]>> = {
  trade_guard: ['oracle_price', 'price_analytics'],
  oracle_watch_window: ['snapshot', 'history', 'begin'],
  position_lifecycle: ['begin'],
};

function droppedChainIdField(toolName: string, args: unknown): boolean {
  if (!args || typeof args !== 'object') return false;
  const record = args as Record<string, unknown>;
  if (!Object.prototype.hasOwnProperty.call(record, 'chain_id')) return false;
  const branches = CHAIN_NAME_BRANCHES[toolName];
  return typeof record.op === 'string' && branches?.includes(record.op) === true;
}

function droppedChainIdError(callerName: string, dispatched: DispatchedTool): string {
  const record =
    dispatched.args && typeof dispatched.args === 'object'
      ? (dispatched.args as Record<string, unknown>)
      : {};
  return JSON.stringify({
    error: {
      code: 'unknown_field',
      tool: callerName,
      resolved_tool: dispatched.name,
      op: typeof record.op === 'string' ? record.op : null,
      field: 'chain_id',
      message: `"chain_id" is not an input for ${callerName}; it would be dropped before the call and the chain filter would silently widen to every chain.`,
      hint: 'Use "chain" with a chain name such as "ethereum", "base" or "hyperevm". Numeric chain ids are accepted only by ops that declare "chain_id".',
    },
  });
}

/** Independent route quotes are mainnet-only; `null` means the call may proceed. */
function unsupportedRouteQuoteChain(args: unknown): number | null {
  if (!args || typeof args !== 'object') return null;
  const record = args as Record<string, unknown>;
  if (record.op !== 'begin_evidence') return null;
  const chainId = record.chain_id;
  if (typeof chainId !== 'number' || !Number.isInteger(chainId)) return null;
  return chainId === 1 ? null : chainId;
}

function toolError(name: string, error: unknown): McpToolCallResult {
  const message = error instanceof Error ? error.message : String(error);
  // Tool inputs can contain transaction details and signed evidence. Keep
  // them, and validation error text that may echo them, out of Sentry.
  logger.error(`MCP tool execution failed`, undefined, {
    tool: name,
    category: error instanceof Error && error.name === `ZodError` ? `validation` : `execution`,
  });

  // Timeouts are an upstream/chain availability condition, not a delivered
  // result. Surface a stable machine-readable code so a caller can retry
  // deliberately instead of parsing free-form error text.
  const code = isUpstreamTimeoutError(error) ? `${UPSTREAM_TIMEOUT_CODE}: ` : '';
  return {
    content: [{ type: `text`, text: `${code}Error executing ${name}: ${message}` }],
    isError: true,
  };
}
