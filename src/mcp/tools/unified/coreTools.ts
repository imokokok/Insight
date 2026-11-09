import {
  routeCheckTradeSafety,
  routeIssueExecutionReceipt,
  routeMarketQuote,
  routeOracleHealth,
  routePreparePerpOrder,
  routePrepareSwap,
  routePriceAnalytics,
  routeSearchRegistry,
  routeVerifyEvidence,
} from './adapters';
import { callLegacy } from './runtime';
import {
  BeginTradeEvidenceInputSchema,
  CheckTradeSafetyInputSchema,
  GetMarketQuoteInputSchema,
  GetOracleHealthInputSchema,
  GetOraclePriceInputSchema,
  GetPriceAnalyticsInputSchema,
  IssueExecutionReceiptInputSchema,
  PreparePerpOrderInputSchema,
  PrepareSwapInputSchema,
  SearchOracleRegistryInputSchema,
  VerifyEvidenceInputSchema,
} from './schemas';
import { defineTool, jsonSchema } from './tool';

import type { McpToolDefinition } from '../types';

/** 11 core tools: price truth, safety gates and the verifiable execution loop. */
/**
 * `z.toJSONSchema` lifts a discriminated union to `anyOf` without a root
 * `type`, which MCP clients and our surface test both expect to be an object.
 * Keep the per-venue `anyOf` constraints and hoist each branch's properties so
 * the advertised schema still lists every field a caller may send.
 */
const preparePerpOrderJsonSchema = (() => {
  const schema = jsonSchema(PreparePerpOrderInputSchema) as unknown as {
    anyOf?: Array<{ properties?: Record<string, unknown> }>;
    [key: string]: unknown;
  };
  const properties = Object.assign(
    {},
    ...(schema.anyOf ?? []).map((branch) => branch.properties ?? {})
  );
  return { ...schema, type: 'object' as const, properties };
})();

export const CORE_MCP_TOOLS: McpToolDefinition[] = [
  defineTool({
    name: 'get_oracle_price',
    description:
      'Read the current price one oracle provider reports for one asset. Use it for a single fresh or cached provider read (for example when a route quote needs a reference price). Do not use it for cross-provider consensus, historical series, deviation or risk analytics — use get_price_analytics instead. Returns the price, provider, symbol, chain, confidence/decimals, source timestamp and cache status.',
    parameters: GetOraclePriceInputSchema,
    inputSchema: jsonSchema(GetOraclePriceInputSchema),
    handler: async (args, context) =>
      callLegacy(
        'get_oracle_price',
        {
          provider: args.provider,
          symbol: args.asset,
          chain: args.chain,
          forceRefresh: args.force_refresh,
        },
        context
      ),
  }),
  defineTool({
    name: 'get_price_analytics',
    description:
      'Run multi-oracle price analytics: consensus across providers, batch reads, historical series, cross-chain spreads, deviation, correlation or a risk summary. Use it when one price is not enough and the caller needs to compare, stress or trend oracle data. Do not use it for a single provider spot read (get_oracle_price) or for feed uptime (get_oracle_health). Returns the requested analysis rows plus provider participation and reference prices.',
    parameters: GetPriceAnalyticsInputSchema,
    inputSchema: jsonSchema(GetPriceAnalyticsInputSchema),
    handler: routePriceAnalytics,
  }),
  defineTool({
    name: 'get_oracle_health',
    description:
      'Read oracle ecosystem, feed, provider, protocol or asset health. Use it to answer freshness, uptime, latency, anomaly, coverage, peg, exposure, incident and daily-report questions before trusting a price or a protocol. Do not use it for a price quote (get_oracle_price) or for a trade gate (check_trade_safety). Returns the matching health rows, verdicts, counts and timestamps for the selected scope.',
    parameters: GetOracleHealthInputSchema,
    inputSchema: jsonSchema(GetOracleHealthInputSchema),
    handler: routeOracleHealth,
  }),
  defineTool({
    name: 'search_oracle_registry',
    description:
      'Search Insight-reviewed registry and evidence resources: symbols, feeds, protocols, stablecoins, protocol risk parameters, RWA instruments/context, settlement-evidence packs and oracle setup recommendations. Use it to discover the exact ids a price, safety or execution tool expects. Do not use it to read live prices or health. Returns matching registry rows or one lookup record, with ids and reviewed metadata.',
    parameters: SearchOracleRegistryInputSchema,
    inputSchema: jsonSchema(SearchOracleRegistryInputSchema),
    handler: routeSearchRegistry,
  }),
  defineTool({
    name: 'get_market_quote',
    description:
      'Read one reviewed venue market: pool/market metadata, pinned quote context and venue constraints for Base, Monad, Solana or Hyperliquid. Use it before preparing or gating a trade when the agent needs the reviewed profile or market id. Do not use it as execution authorization or for prices outside the reviewed venues. Returns the market record, reviewed profile ids and current quote context.',
    parameters: GetMarketQuoteInputSchema,
    inputSchema: jsonSchema(GetMarketQuoteInputSchema),
    handler: routeMarketQuote,
  }),
  defineTool({
    name: 'check_trade_safety',
    description:
      'Run the pre-trade oracle safety gate for swaps, lending, perps, vault deposits and position stress tests across Base, Monad, multichain EVM, Solana and Hyperliquid. Use it immediately before an agent trades or signs, and pass the family native payload in `guard` when the venue needs exact-call fields. Do not use it after execution (use trade_proof) and do not treat its PASS as principal authorization. Returns a verdict (PASS/CAUTION/DANGER/BLOCK), reason codes, oracle evidence and a signed attestation or decision when the family supports one.',
    parameters: CheckTradeSafetyInputSchema,
    inputSchema: jsonSchema(CheckTradeSafetyInputSchema),
    handler: routeCheckTradeSafety,
  }),
  defineTool({
    name: 'begin_trade_evidence',
    description:
      'Open the verifiable execution loop: certify a swap/DeFi intent before the agent executes. Use it when a principal needs a signed pre-trade handle to bind an execution receipt later. Do not use it as trade authorization and do not call it after the trade. Returns preTradeUid, destinationPreTradeUid, requestHash, CAIP-19 asset ids, certified cross-rate, the 50 bps band, verdicts and the signed pre-trade attestations.',
    parameters: BeginTradeEvidenceInputSchema,
    inputSchema: jsonSchema(BeginTradeEvidenceInputSchema),
    handler: async (args, context) =>
      callLegacy(
        'agent_begin_trade',
        {
          asset: args.asset,
          destinationAsset: args.destination_asset,
          chainId: args.chain_id,
          action: args.action,
          tradeAmountUsd: args.amount_usd,
          maxSlippageBps: args.max_slippage_bps,
          targetProviders: args.providers,
          protocolId: args.protocol_id,
          sourceGroupCount: args.source_group_count,
          decisionInput: args.decision_input,
        },
        context
      ),
  }),
  defineTool({
    name: 'prepare_swap',
    description:
      'Prepare unsigned, reviewed swap calldata for local signing on Base Aerodrome Slipstream, Base PancakeSwap V3, the Base agent swap guard, or a Solana Loopscale vault deposit. Use it when the user wants an executable transaction bound to a reviewed pool and policy. Do not use it to sign, submit or route arbitrary calldata, and do not skip the matching safety gate. Returns the unsigned transaction envelope (to/value/calldata), reviewed profile, quote and, where supported, a signed decision.',
    parameters: PrepareSwapInputSchema,
    inputSchema: jsonSchema(PrepareSwapInputSchema),
    handler: routePrepareSwap,
  }),
  defineTool({
    name: 'prepare_perp_order',
    description:
      'Prepare an unsigned perpetual order for one reviewed venue, without signing or submitting it. Venue decides the artifact shape: hyperliquid returns an unsigned exchange order envelope (HyperCore); synthetix-perps-v3-base returns EVM calldata for commitOrder whose acceptablePrice is derived from Insight cross-oracle consensus, not the Synthetix mark price; aster-perps-bnb-mainnet returns a canonical centralized REST order payload (not calldata, and it proves payload binding rather than on-chain execution); solana_drift returns a Borsh instruction payload that the caller must complete with the Drift SDK. The reviewed guard runs inside each adapter, so the result carries the risk verdict reference. Use it when an agent has decided on venue, market, side and size. Do not use it to create a nonce, sign, or submit an order. Returns the shared prepared-execution envelope: `state` (READY, CAUTION, REQUIRES_COMPLETION, BLOCK or UNAVAILABLE), a payload whose `kind` is `evm-transaction`, `venue-rest-order`, `solana-instruction` or null, a required `validity_anchor` (timestamp, EVM block, Solana block height or venue policy), caller requirements and the guard verdict reference. It never returns a uniformly described executable trade package, and a payload that still needs caller completion is never labelled READY. A `venue-rest-order` payload exposes `execution_binding` with `proves_onchain_execution: false` and the `signing` requirement. Solana message payloads carry `transactionHash` (sha256 of the exact unsigned bytes, byte binding only, not signature-verifiable) and `messageHash` (null when the message segment cannot be derived).',
    parameters: PreparePerpOrderInputSchema,
    inputSchema: preparePerpOrderJsonSchema,
    handler: routePreparePerpOrder,
  }),
  defineTool({
    name: 'issue_execution_receipt',
    description:
      'Close the loop after an agent executes: issue a signed execution-price receipt from the pre-trade handle plus the settlement transaction, or settle a guarded Base/Solana swap. Use it only after the trade settled. Do not use it before execution and do not treat the verdict as principal authorization. Returns a signed receipt or settlement with FAITHFUL/DEVIATED/NOT_EXECUTED/UNDETERMINED (or settlement status), price delta, binding ids and verify URL.',
    parameters: IssueExecutionReceiptInputSchema,
    inputSchema: jsonSchema(IssueExecutionReceiptInputSchema),
    handler: routeIssueExecutionReceipt,
  }),
  defineTool({
    name: 'verify_evidence',
    description:
      'Verify signed evidence produced by Insight or by an agent: a pre-trade/execution pair, a Base agent-swap settlement, a Solana swap settlement, or one Hyperliquid order/fill record. Use it when a third party needs to check binding and signatures before trusting a claim. Do not use it to re-assess oracle risk or to authorize trading. Returns valid/invalid, the closed-loop or settlement status, binding assertions and machine-readable reasons.',
    parameters: VerifyEvidenceInputSchema,
    inputSchema: jsonSchema(VerifyEvidenceInputSchema),
    handler: routeVerifyEvidence,
  }),
];
