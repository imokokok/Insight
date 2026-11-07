/**
 * MCP tools for the Oracle Watch monitored window — the first non-per-call
 * Insight product (roadmap C1). `oracle_watch_window_begin` sells one 24h
 * window (product-priced: x402 list price for keyless callers, product
 * credits for API keys); `oracle_watch_window_poll` and
 * `oracle_watch_window_close` are the in-window operations, covered by that
 * purchase and authenticated with the one-time token it returned — they are
 * never re-metered per call.
 *
 * Failure semantics mirror the REST routes fail-closed: an unknown windowId,
 * a wrong token, a closed/expired window, and an exhausted poll budget all
 * refuse to issue a signal.
 */

import {
  closeOracleWatchWindow,
  OracleWatchWindowError,
  pollOracleWatchWindow,
  beginOracleWatchWindow,
} from '@/lib/api/services/oracleWatchWindowService';
import { ProductLimitError, productLimitMessage } from '@/lib/api/services/productLimits';

import { OracleWatchWindowBeginInputSchema, OracleWatchWindowTokenInputSchema } from './schemas';

import type { McpToolCallContext, McpToolDefinition } from './types';

/** Map a caller context onto the window's payment provenance. */
function paymentMethodFor(context: McpToolCallContext | undefined): 'x402' | 'credits' {
  return context?.apiKeyId ? 'credits' : 'x402';
}

function windowFailureMessage(error: OracleWatchWindowError): string {
  const messages: Record<OracleWatchWindowError['code'], string> = {
    NOT_FOUND: 'Monitored window not found.',
    INVALID_TOKEN: 'Invalid or missing window token.',
    WINDOW_CLOSED: 'This monitored window is already closed.',
    WINDOW_EXPIRED: 'This monitored window has expired.',
    POLL_CAP_REACHED: 'This monitored window has exhausted its poll budget.',
    POLL_TOO_SOON: 'Polling too soon for this monitored window.',
  };
  const base = `oracle_watch_window failed (${error.code}): ${messages[error.code]}`;
  return error.code === 'POLL_TOO_SOON' && error.retryAfterSeconds
    ? `${base} Retry after ${error.retryAfterSeconds}s.`
    : base;
}

export const oracleWatchWindowBeginTool: McpToolDefinition<
  typeof OracleWatchWindowBeginInputSchema
> = {
  name: 'oracle_watch_window_begin',
  description:
    'Purchase a 24h Oracle Watch monitored window for one asset (optionally scoped to one chain): ONE product price covers continuous halt/proceed manipulation-signal coverage, then poll the current signal inside the window at no per-call charge via oracle_watch_window_poll (budget: 300 polls, minimum 30s apart, 10 polls per rolling minute per API key; at most 5 open windows per API key). This tool charges the full window product price once — it does not itself issue a signal. The response includes a one-time window token shown exactly once; keep it, every in-window call authenticates with it.',
  parameters: OracleWatchWindowBeginInputSchema,
  handler: async (args, context) => {
    try {
      const { window, windowToken } = await beginOracleWatchWindow({
        symbol: args.symbol,
        chain: args.chain ?? null,
        paymentMethod: paymentMethodFor(context),
        apiKeyId: context?.apiKeyId ?? null,
      });

      return [
        `**Oracle Watch monitored window opened: ${window.symbol}${window.chain ? ` on ${window.chain}` : ''}**`,
        `- Window: ${window.windowId} (status ${window.status})`,
        `- Coverage: ${window.openedAt} → ${window.expiresAt}`,
        `- Poll budget: ${window.pollCount}/${window.pollCap} used, minimum 30s between polls`,
        `- Payment: ${window.paymentMethod}`,
        '',
        '**Window token (shown exactly once — store it now):**',
        `\`${windowToken}\``,
        '',
        `Poll with oracle_watch_window_poll { windowId: "${window.windowId}", windowToken: <token> }.`,
        `Close early (idempotent) with oracle_watch_window_close for the per-window summary.`,
      ].join('\n');
    } catch (error) {
      if (error instanceof ProductLimitError) throw new Error(productLimitMessage(error));
      throw error;
    }
  },
};

export const oracleWatchWindowPollTool: McpToolDefinition<
  typeof OracleWatchWindowTokenInputSchema
> = {
  name: 'oracle_watch_window_poll',
  description:
    'Issue one current Oracle Watch halt/proceed signal inside an open monitored window purchased with oracle_watch_window_begin. Covered by the window purchase — no per-call charge — but counted against the window poll budget (300 per 24h, minimum 30s apart) and the per-key rate of 10 polls per rolling minute. Authenticates with the one-time window token from the purchase; without it the call fails closed.',
  parameters: OracleWatchWindowTokenInputSchema,
  handler: async (args) => {
    try {
      const result = await pollOracleWatchWindow(args.windowId, args.windowToken);
      const s = result.signal;
      return [
        `**Oracle Watch (window): ${s.symbol}**${s.chain ? ` on ${s.chain}` : ''}`,
        `- Verdict: ${s.verdict.toUpperCase()}`,
        `- Recommendation: ${s.recommendation}`,
        `- Reason: ${s.reason}`,
        `- Max cross-oracle deviation: ${s.maxDeviationPct !== null ? `${s.maxDeviationPct.toFixed(2)}%` : 'n/a'}`,
        `- Agreement: ${(s.agreement * 100).toFixed(2)}%`,
        `- Poll budget: ${result.window.pollCount}/${result.window.pollCap} used (window expires ${result.window.expiresAt})`,
        result.attestation
          ? `- Attestation UID: ${result.attestation.uid}`
          : '- Attestation: unavailable (signal is informational only)',
        '',
        '```json',
        JSON.stringify(result),
        '```',
      ].join('\n');
    } catch (error) {
      if (error instanceof ProductLimitError) throw new Error(productLimitMessage(error));
      if (error instanceof OracleWatchWindowError) throw new Error(windowFailureMessage(error));
      throw error;
    }
  },
};

export const oracleWatchWindowCloseTool: McpToolDefinition<
  typeof OracleWatchWindowTokenInputSchema
> = {
  name: 'oracle_watch_window_close',
  description:
    'Close an Oracle Watch monitored window early (idempotent; also works on an expired window) and return the summary of every signal issued inside it: poll counts, verdict distribution, and halt timestamps. Covered by the window purchase — no per-call charge. Authenticates with the one-time window token from the purchase.',
  parameters: OracleWatchWindowTokenInputSchema,
  handler: async (args) => {
    try {
      const summary = await closeOracleWatchWindow(args.windowId, args.windowToken);
      return [
        `**Oracle Watch monitored window closed: ${summary.symbol}${summary.chain ? ` on ${summary.chain}` : ''}**`,
        `- Window: ${summary.windowId} (${summary.expired ? 'expired' : 'closed early'})`,
        `- Coverage: ${summary.openedAt} → ${summary.closedAt}`,
        `- Polls issued: ${summary.pollsIssued}/${summary.pollCap}`,
        `- Verdicts: ${JSON.stringify(summary.verdictCounts)}`,
        `- Recommendations: ${JSON.stringify(summary.recommendationCounts)}`,
        `- Halts: ${summary.haltCount}${summary.firstHaltAt ? ` (first ${summary.firstHaltAt}` : ''}${summary.lastHaltAt ? `, last ${summary.lastHaltAt})` : summary.firstHaltAt ? ')' : ''}`,
        '',
        '```json',
        JSON.stringify(summary),
        '```',
      ].join('\n');
    } catch (error) {
      if (error instanceof OracleWatchWindowError) throw new Error(windowFailureMessage(error));
      throw error;
    }
  },
};
