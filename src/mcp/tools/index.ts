import { createLogger } from '@/lib/utils/logger';

import {
  getAnomaliesTool,
  getCorrelationTool,
  getCoverageTool,
  getLatencyTool,
  getMetricsTool,
} from './analysisTools';
import { getOraclePricesBatchTool, getPriceHistoryTool } from './batchTools';
import { getCrossChainSpreadsTool } from './crossChainTools';
import {
  getFeedFreshnessTool,
  getFeedHealthTool,
  getFeedUptimeTool,
  getFeedsTool,
} from './feedTools';
import {
  AnomaliesJsonSchema,
  BatchPriceJsonSchema,
  ConsensusPriceJsonSchema,
  CorrelationJsonSchema,
  CoverageJsonSchema,
  CrossChainSpreadJsonSchema,
  DateQueryJsonSchema,
  DeviationJsonSchema,
  FeedFreshnessJsonSchema,
  FeedHealthJsonSchema,
  FeedsJsonSchema,
  IncidentsJsonSchema,
  LatencyJsonSchema,
  MetricsJsonSchema,
  OraclePriceJsonSchema,
  OracleSetupRecommendationJsonSchema,
  OracleWatchHistoryJsonSchema,
  OracleWatchJsonSchema,
  PositionSafetyJsonSchema,
  PreTradeSafetyJsonSchema,
  PriceHistoryJsonSchema,
  ProviderReputationJsonSchema,
  ProtocolOracleExposureJsonSchema,
  ProtocolRiskParamsJsonSchema,
  ProtocolsJsonSchema,
  ReputationRankingsJsonSchema,
  RiskSummaryJsonSchema,
  StablecoinJsonSchema,
  SymbolQueryJsonSchema,
  WrappedAssetJsonSchema,
} from './jsonSchemas';
import {
  compareOracleDeviationTool,
  getConsensusPriceTool,
  getOracleHealthTool,
  getOraclePriceTool,
} from './oracleTools';
import { oracleWatchHistoryTool } from './oracleWatchHistoryTools';
import { oracleWatchTool } from './oracleWatchTools';
import { preTradeSafetyCheckTool } from './preTradeSafetyTools';
import { getProtocolOracleExposureTool, getProtocolsTool } from './protocolTools';
import { getDailyReportTool, getIncidentsTool } from './reportTools';
import { getProviderReputationTool, getReputationRankingsTool } from './reputationTools';
import {
  checkLiquidationRiskTool,
  getProtocolRiskParamsTool,
  getRiskSummaryTool,
} from './riskTools';
import { checkPositionSafetyTool } from './safetyTools';
import { getStablecoinPegTool } from './stablecoinTools';
import { getStablecoinListTool, getSymbolsTool, recommendOracleSetupTool } from './utilityTools';
import { getWrappedAssetPegTool } from './wrappedAssetTools';

import type { McpToolCallResult, McpToolDefinition } from './types';

const logger = createLogger('mcp-tools');

const MCP_TOOLS: McpToolDefinition[] = [
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
  getLatencyTool,
  getAnomaliesTool,
  getCorrelationTool,
  getCoverageTool,
  getMetricsTool,
  checkPositionSafetyTool,
  preTradeSafetyCheckTool,
  oracleWatchTool,
  oracleWatchHistoryTool,
];

const JSON_SCHEMA_MAP: Record<
  string,
  { type: 'object'; properties?: Record<string, unknown>; required?: string[] }
> = {
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
};

// Dev-only sanity check: every registered tool MUST have an explicit JSON
// schema entry. Without this, a newly added tool that forgets to register a
// JSON schema would silently fall back to `parameters.toJSONSchema()`, which
// breaks for schemas containing transforms/pipes (zod v4 limitation) and is
// exactly how the runtime/advertised schema drift this map exists to prevent
// would creep back in.
if (process.env.NODE_ENV !== 'production') {
  for (const tool of MCP_TOOLS) {
    if (!JSON_SCHEMA_MAP[tool.name]) {
      throw new Error(
        `MCP tool "${tool.name}" is missing a JSON schema entry in JSON_SCHEMA_MAP. ` +
          'Add a corresponding schema in ./jsonSchemas and register it in the map.'
      );
    }
  }
}

export function getToolDefinitions() {
  return MCP_TOOLS.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: JSON_SCHEMA_MAP[tool.name] ?? tool.parameters.toJSONSchema(),
  }));
}

export async function executeTool(name: string, args: unknown): Promise<McpToolCallResult> {
  const tool = MCP_TOOLS.find((t) => t.name === name);

  if (!tool) {
    return {
      content: [{ type: 'text', text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }

  try {
    const validatedArgs = tool.parameters.parse(args);
    const result = await tool.handler(validatedArgs);
    return {
      content: [{ type: 'text', text: result }],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Tool ${name} execution failed`, error instanceof Error ? error : undefined, {
      args,
    });

    return {
      content: [{ type: 'text', text: `Error executing ${name}: ${message}` }],
      isError: true,
    };
  }
}
