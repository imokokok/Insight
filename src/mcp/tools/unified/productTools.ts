import { callLegacy } from './runtime';
import {
  OracleWatchInputSchema,
  OracleWatchWindowBeginInputSchema,
  OracleWatchWindowControlInputSchema,
  PositionLifecycleBeginInputSchema,
  PositionLifecycleStepInputSchema,
} from './schemas';
import { defineTool, jsonSchema } from './tool';

import type { McpToolDefinition } from '../types';

/** 5 product state-machine tools: one-off read, paid window, bundled lifecycle. */
export const PRODUCT_MCP_TOOLS: McpToolDefinition[] = [
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
