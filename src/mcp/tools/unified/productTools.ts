import { z } from 'zod';

import {
  ORACLE_WATCH_WINDOW_OPS,
  POSITION_LIFECYCLE_OPS,
  TRADE_GUARD_OPS,
  TRADE_PROOF_OPS,
} from './aliases';
import { CORE_MCP_TOOLS } from './coreTools';
import { callLegacy } from './runtime';
import {
  OracleWatchInputSchema,
  OracleWatchWindowBeginInputSchema,
  OracleWatchWindowControlInputSchema,
  PositionLifecycleBeginInputSchema,
  PositionLifecycleStepInputSchema,
} from './schemas';
import { defineTool, jsonSchema } from './tool';

import type { McpToolCallContext, McpToolDefinition } from '../types';

/**
 * The five pre-consolidation product state-machine tools. They remain the
 * implementation behind the deprecated alias names and the new product tools;
 * they are no longer advertised as canonical names.
 */
export const LEGACY_PRODUCT_MCP_TOOLS: McpToolDefinition[] = [
  defineTool({
    name: 'oracle_watch',
    description:
      'Read one oracle-trust snapshot or historical series for an asset. Use it for a one-off check of whether a symbol is currently trustworthy or how its recent history looks. Do not use it for continuous monitoring — buy a 24h window with oracle_watch_window_begin. Returns the current trust signal (or the requested history series) with provider participation and freshness.',
    parameters: OracleWatchInputSchema,
    inputSchema: jsonSchema(OracleWatchInputSchema),
    handler: async (args, context) =>
      args.op === 'history'
        ? callLegacy(
            'oracle_watch_history',
            {
              symbol: args.symbol,
              chain: args.chain,
              days: args.days ?? 7,
              interval: args.interval ?? 'hourly',
            },
            context
          )
        : callLegacy('oracle_watch', { symbol: args.symbol, chain: args.chain }, context),
  }),
  defineTool({
    name: 'oracle_watch_window_begin',
    description:
      'Buy a 24h Oracle Watch window for one asset and return the one-time control token. Use it when an agent will poll throughout a window instead of paying per snapshot. Do not use it repeatedly for the same window and never share the token. Returns windowId, the oww_ token, the covered expiry and the credits charged.',
    parameters: OracleWatchWindowBeginInputSchema,
    inputSchema: jsonSchema(OracleWatchWindowBeginInputSchema),
    handler: async (args, context) =>
      callLegacy('oracle_watch_window_begin', { symbol: args.symbol, chain: args.chain }, context),
  }),
  defineTool({
    name: 'oracle_watch_window_control',
    description:
      'Poll or close an already purchased Oracle Watch window using its one-time oww_ token. Poll returns a fresh signal at zero extra credits; close returns the complete window summary and the final signal. Use it only with a window token from oracle_watch_window_begin. Do not use it for a one-off snapshot (oracle_watch) and never reuse a token after close. Returns the signal (poll) or the combined summary (close).',
    parameters: OracleWatchWindowControlInputSchema,
    inputSchema: jsonSchema(OracleWatchWindowControlInputSchema),
    handler: async (args, context) =>
      args.op === 'poll'
        ? callLegacy(
            'oracle_watch_window_poll',
            { windowId: args.window_id, windowToken: args.window_token },
            context
          )
        : callLegacy(
            'oracle_watch_window_close',
            { windowId: args.window_id, windowToken: args.window_token },
            context
          ),
  }),
  defineTool({
    name: 'position_lifecycle_begin',
    description:
      'Buy a 24h Position Lifecycle bundle for one position subject and return the one-time control token. Use it when an agent needs guard, execution-receipt and close steps inside one prepaid window. Do not use it for a single guard (use check_trade_safety) and never share the token. Returns lifecycleId, the plc_ token, the covered expiry and the credits charged.',
    parameters: PositionLifecycleBeginInputSchema,
    inputSchema: jsonSchema(PositionLifecycleBeginInputSchema),
    handler: async (args, context) =>
      callLegacy('position_lifecycle_begin', { symbol: args.symbol, chain: args.chain }, context),
  }),
  defineTool({
    name: 'position_lifecycle_step',
    description:
      'Run one step inside a purchased Position Lifecycle bundle: guard (family-specific safety assessment), receipt (signed execution receipt), or close (combined summary). Guard and receipt cost zero extra credits inside the bundle. Returns the step result (guard verdict, signed receipt, or the combined lifecycle summary). Use it only with a lifecycle token from position_lifecycle_begin. Do not use it for unrelated positions and never reuse a token after close.',
    parameters: PositionLifecycleStepInputSchema,
    inputSchema: jsonSchema(PositionLifecycleStepInputSchema),
    handler: async (args, context) => {
      if (args.op === 'guard') {
        return callLegacy(
          'position_lifecycle_guard',
          {
            lifecycleId: args.lifecycle_id,
            lifecycleToken: args.lifecycle_token,
            family: args.family,
            params: args.params,
            transaction: args.transaction,
          },
          context
        );
      }
      if (args.op === 'receipt') {
        return callLegacy(
          'position_lifecycle_receipt',
          {
            lifecycleId: args.lifecycle_id,
            lifecycleToken: args.lifecycle_token,
            receipt: args.receipt,
          },
          context
        );
      }
      return callLegacy(
        'position_lifecycle_close',
        { lifecycleId: args.lifecycle_id, lifecycleToken: args.lifecycle_token },
        context
      );
    },
  }),
];

/** Every implementation the product dispatchers delegate to, by canonical name. */
const IMPLEMENTATION_BY_NAME: ReadonlyMap<string, McpToolDefinition> = new Map(
  [...CORE_MCP_TOOLS, ...LEGACY_PRODUCT_MCP_TOOLS].map((tool) => [tool.name, tool])
);

function implementationFor(name: string): McpToolDefinition {
  const implementation = IMPLEMENTATION_BY_NAME.get(name);
  if (!implementation) {
    throw new Error(`Product dispatch target "${name}" is not registered.`);
  }
  return implementation;
}

/**
 * Thin dispatch: run the canonical implementation for one op. The implementation
 * keeps ownership of schema validation and business logic, so the product tool
 * never carries a second copy of either.
 */
async function runOp(
  implementationName: string,
  args: unknown,
  context?: McpToolCallContext
): Promise<string> {
  const implementation = implementationFor(implementationName);
  const validated = implementation.parameters.parse(args);
  return implementation.handler(validated, context);
}

/** One audit/availability note per op, so a product tool behaves like its op. */
function jsonShapeKey(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  const { description: _description, ...rest } = value as Record<string, unknown>;
  return JSON.stringify(rest);
}

/**
 * Advertise every branch field once. Fields shared by several ops collapse to
 * one definition; fields whose constraints genuinely differ (e.g. `mode` in
 * price analytics vs the safety gate) become an `anyOf` so a client-side
 * validator never rejects a valid op.
 */
function mergeJsonProperty(existing: unknown, next: unknown): unknown {
  if (existing === undefined) return next;
  const previous = Array.isArray((existing as { anyOf?: unknown }).anyOf)
    ? ((existing as { anyOf: unknown[] }).anyOf as unknown[])
    : [existing];
  const incoming = Array.isArray((next as { anyOf?: unknown }).anyOf)
    ? ((next as { anyOf: unknown[] }).anyOf as unknown[])
    : [next];
  const merged = [...previous];
  for (const candidate of incoming) {
    if (!merged.some((value) => jsonShapeKey(value) === jsonShapeKey(candidate))) {
      merged.push(candidate);
    }
  }
  return merged.length === 1 ? merged[0] : { anyOf: merged };
}

function productInputSchema(
  ops: readonly string[],
  branchNames: readonly string[]
): NonNullable<McpToolDefinition['inputSchema']> {
  const properties: Record<string, unknown> = {
    op: { type: 'string', enum: [...ops] },
  };
  for (const name of branchNames) {
    const branch = implementationFor(name).inputSchema;
    for (const [field, definition] of Object.entries(branch?.properties ?? {})) {
      if (field === 'op') continue;
      properties[field] = mergeJsonProperty(properties[field], definition);
    }
  }
  return { type: 'object', properties, required: ['op'] };
}

/** Runtime validator: the op selector is authoritative; each branch is parsed
 *  by its own implementation, which owns the domain constraints. */
function productParameters(ops: readonly string[]) {
  return z.looseObject({ op: z.enum(ops as [string, ...string[]]) });
}

const TRADE_GUARD_IMPLEMENTATION: Readonly<Record<string, string>> = {
  oracle_price: 'get_oracle_price',
  price_analytics: 'get_price_analytics',
  oracle_health: 'get_oracle_health',
  search_registry: 'search_oracle_registry',
  market_quote: 'get_market_quote',
  check_safety: 'check_trade_safety',
  prepare_swap: 'prepare_swap',
  prepare_perp_order: 'prepare_perp_order',
};

const TRADE_PROOF_IMPLEMENTATION: Readonly<Record<string, string>> = {
  begin_evidence: 'begin_trade_evidence',
  issue_receipt: 'issue_execution_receipt',
  verify_evidence: 'verify_evidence',
};

const ORACLE_WATCH_WINDOW_IMPLEMENTATION: Readonly<Record<string, string>> = {
  snapshot: 'oracle_watch',
  history: 'oracle_watch',
  begin: 'oracle_watch_window_begin',
  poll: 'oracle_watch_window_control',
  close: 'oracle_watch_window_control',
};

const POSITION_LIFECYCLE_IMPLEMENTATION: Readonly<Record<string, string>> = {
  begin: 'position_lifecycle_begin',
  guard: 'position_lifecycle_step',
  receipt: 'position_lifecycle_step',
  close: 'position_lifecycle_step',
};

async function dispatchByOp(
  productName: string,
  routes: Readonly<Record<string, string>>,
  args: { op: string } & Record<string, unknown>,
  context?: McpToolCallContext
): Promise<string> {
  const implementation = routes[args.op];
  if (implementation === undefined) {
    throw new Error(`${productName}: unsupported op "${args.op}".`);
  }
  return runOp(implementation, args, context);
}

/**
 * The four consolidated product tools. Each one is a thin op dispatcher over
 * the implementations above — no business logic is duplicated here.
 */
export const PRODUCT_MCP_TOOLS: McpToolDefinition[] = [
  defineTool({
    name: 'trade_guard',
    pricing: { credits: 40, usd: '0.040', minCredits: 2, minUsd: '0.002' },
    description:
      'Use it for every pre-execution trust decision: one oracle price, price analytics, oracle health, oracle registry search, a venue market quote, or the pre-trade safety gate including prepare_swap and prepare_perp_order. Each call selects the branch with "op". Do not use it to prove execution after the fact (use trade_proof), to poll a prepaid monitoring window (use oracle_watch_window), or to manage a position bundle (use position_lifecycle). Returns the op payload: price and analytics rows for read ops, a venue quote for market_quote, a READY/CAUTION/BLOCK verdict with reasons for check_safety, and an unsigned prepared transaction, Solana message, venue order or instruction for prepare_* ops. Absorbs the deprecated names get_oracle_price, get_price_analytics, get_oracle_health, search_oracle_registry, get_market_quote, check_trade_safety, prepare_swap and prepare_perp_order. Metering: oracle_price, market_quote and search_registry are 2 credits ($0.002); price_analytics and oracle_health are 4 credits ($0.004); check_safety, prepare_swap and prepare_perp_order are 40 credits ($0.040), which is both the per-call price and the product ceiling. Deprecated alias spellings are callable at the same price until 2027-01-06.',
    parameters: productParameters(TRADE_GUARD_OPS),
    inputSchema: productInputSchema(TRADE_GUARD_OPS, Object.values(TRADE_GUARD_IMPLEMENTATION)),
    handler: async (args, context) =>
      dispatchByOp('trade_guard', TRADE_GUARD_IMPLEMENTATION, args, context),
  }),
  defineTool({
    name: 'trade_proof',
    pricing: { credits: 40, usd: '0.040' },
    description:
      'Use it to open a trade-evidence session, issue an execution receipt, or verify an evidence artifact after a trade. Each call selects the branch with "op": begin_evidence, issue_receipt or verify_evidence. Do not use it to decide whether a trade is safe before signing (use trade_guard) and do not use it to settle a swap guard (use the venue guard tools). Returns the evidence session handle, the signed receipt, or the verification verdict, digest and matched evidence. Absorbs the deprecated names begin_trade_evidence, issue_execution_receipt and verify_evidence. Metering: begin_evidence and issue_receipt are C4 (40 credits / $0.040); verify_evidence is free for the three offline kinds (execution_pair, base_agent_swap, solana_swap) and C4 for live reads.',
    parameters: productParameters(TRADE_PROOF_OPS),
    inputSchema: productInputSchema(TRADE_PROOF_OPS, Object.values(TRADE_PROOF_IMPLEMENTATION)),
    handler: async (args, context) =>
      dispatchByOp('trade_proof', TRADE_PROOF_IMPLEMENTATION, args, context),
  }),
  defineTool({
    name: 'oracle_watch_window',
    pricing: { credits: 500, usd: '0.500' },
    description:
      'Oracle Watch for monitored trust signals. Use it to read one trust snapshot or history series, buy a 24h monitored window, or poll/close an already purchased window. Each call selects the branch with "op": snapshot, history, begin, poll or close. Do not use it for pre-trade safety (use trade_guard op check_safety), do not buy a second window for the same subject, and never reuse a token after close. Returns the trust signal or history series, the windowId plus one-time oww_ token and expiry for begin, and the poll signal or combined close summary for window ops. Absorbs the deprecated names oracle_watch, oracle_watch_window_begin and oracle_watch_window_control. Metering: begin is 500 credits / $0.500 for the 24h window; in-window poll and close are covered (0 credits); snapshot and history are C3 (20 credits / $0.020).',
    parameters: productParameters(ORACLE_WATCH_WINDOW_OPS),
    inputSchema: productInputSchema(
      ORACLE_WATCH_WINDOW_OPS,
      Object.values(ORACLE_WATCH_WINDOW_IMPLEMENTATION)
    ),
    handler: async (args, context) =>
      dispatchByOp('oracle_watch_window', ORACLE_WATCH_WINDOW_IMPLEMENTATION, args, context),
  }),
  defineTool({
    name: 'position_lifecycle',
    pricing: { credits: 550, usd: '0.550' },
    description:
      'Use it to buy a 24h Position Lifecycle bundle and run the guard, receipt and close steps inside it. Each call selects the branch with "op": begin, guard, receipt or close. Do not use it for a single pre-trade guard (use trade_guard op check_safety), for unrelated positions, or with a token after close. Returns the lifecycleId plus one-time plc_ token and expiry for begin, and the guard verdict, signed execution receipt or combined lifecycle summary for the in-window steps. Absorbs the deprecated names position_lifecycle_begin and position_lifecycle_step.',
    parameters: productParameters(POSITION_LIFECYCLE_OPS),
    inputSchema: productInputSchema(
      POSITION_LIFECYCLE_OPS,
      Object.values(POSITION_LIFECYCLE_IMPLEMENTATION)
    ),
    handler: async (args, context) =>
      dispatchByOp('position_lifecycle', POSITION_LIFECYCLE_IMPLEMENTATION, args, context),
  }),
];
