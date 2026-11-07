/**
 * MCP tools for the Position Lifecycle Bundle — the second non-per-call
 * Insight product (roadmap C2). `position_lifecycle_begin` sells one 24h
 * lifecycle for one (symbol, chain) position subject: an embedded Oracle
 * Watch monitored window (poll it with the SAME lifecycle token via the
 * oracle-watch-window tools), 4 bundled guard assessments across the six
 * position-guard families, and 1 attested execution receipt. The bundled
 * operations are covered by that purchase — never re-metered per call — and
 * authenticate with the one-time lifecycle token the purchase returned.
 *
 * A BLOCK verdict is a complete, charged decision and consumes a budget slot;
 * a schema or assessor technical failure does not. A budget slot is consumed
 * atomically before the expensive work and released if the work fails on
 * technical grounds.
 */

import {
  closePositionLifecycle,
  issueBundledReceipt,
  PositionLifecycleError,
  runBundledGuard,
  beginPositionLifecycle,
} from '@/lib/api/services/positionLifecycleService';
import { ProductLimitError, productLimitMessage } from '@/lib/api/services/productLimits';

import {
  PositionLifecycleBeginInputSchema,
  PositionLifecycleCloseInputSchema,
  PositionLifecycleGuardInputSchema,
  PositionLifecycleReceiptInputSchema,
} from './schemas';

import type { McpToolCallContext, McpToolDefinition } from './types';

function paymentMethodFor(context: McpToolCallContext | undefined): 'x402' | 'credits' {
  return context?.apiKeyId ? 'credits' : 'x402';
}

const LIFECYCLE_FAILURE_MESSAGES: Record<PositionLifecycleError['code'], string> = {
  NOT_FOUND: 'Position lifecycle not found.',
  INVALID_TOKEN: 'Invalid or missing lifecycle token.',
  LIFECYCLE_CLOSED: 'This position lifecycle is already closed.',
  LIFECYCLE_EXPIRED: 'This position lifecycle has expired.',
  GUARD_BUDGET_REACHED: 'This position lifecycle has exhausted its guard budget.',
  RECEIPT_UNAVAILABLE: 'The bundled execution receipt has already been issued.',
};

function lifecycleFailureMessage(error: PositionLifecycleError): string {
  return `position_lifecycle failed (${error.code}): ${LIFECYCLE_FAILURE_MESSAGES[error.code]}`;
}

export const positionLifecycleBeginTool: McpToolDefinition<
  typeof PositionLifecycleBeginInputSchema
> = {
  name: 'position_lifecycle_begin',
  description:
    'Purchase a 24h Position Lifecycle Bundle for one position subject (optionally scoped to one chain): ONE product price covers an embedded Oracle Watch monitored window, 4 bundled guard assessments across base_perp, hyperliquid_perp, base_lending, monad_lending, multichain_evm_lending, or solana_lending, and 1 attested execution receipt. This tool charges the full bundle price once — it does not itself assess anything. The response includes a one-time lifecycle token shown exactly once; keep it, every bundled call authenticates with it (the embedded watch window accepts the SAME token).',
  parameters: PositionLifecycleBeginInputSchema,
  handler: async (args, context) => {
    try {
      const { lifecycle, windowId, lifecycleToken, usage } = await beginPositionLifecycle({
        symbol: args.symbol,
        chain: args.chain ?? null,
        paymentMethod: paymentMethodFor(context),
        apiKeyId: context?.apiKeyId ?? null,
      });

      return [
        `**Position lifecycle opened: ${lifecycle.symbol}${lifecycle.chain ? ` on ${lifecycle.chain}` : ''}**`,
        `- Lifecycle: ${lifecycle.lifecycleId} (status ${lifecycle.status})`,
        `- Coverage: ${lifecycle.openedAt} → ${lifecycle.expiresAt}`,
        `- Guard budget: ${lifecycle.guardUsed}/${lifecycle.guardBudget} used; receipt: ${lifecycle.receiptState}`,
        `- Embedded watch window: ${windowId} (poll with oracle_watch_window_poll using the SAME lifecycle token)`,
        `- Payment: ${lifecycle.paymentMethod}`,
        '',
        '**Lifecycle token (shown exactly once — store it now):**',
        `\`${lifecycleToken}\``,
        '',
        'Bundled calls (all authenticate with this token):',
        `- position_lifecycle_guard { lifecycleId, lifecycleToken, family, params${usage.guard.budget ? '' : ''} } — budget ${usage.guard.budget}`,
        `- position_lifecycle_receipt { lifecycleId, lifecycleToken, receipt } — budget ${usage.receipt.budget}`,
        `- position_lifecycle_close { lifecycleId, lifecycleToken } — idempotent summary`,
      ].join('\n');
    } catch (error) {
      if (error instanceof ProductLimitError) throw new Error(productLimitMessage(error));
      throw error;
    }
  },
};

export const positionLifecycleGuardTool: McpToolDefinition<
  typeof PositionLifecycleGuardInputSchema
> = {
  name: 'position_lifecycle_guard',
  description:
    "Run one bundled guard assessment inside an open Position Lifecycle (purchased with position_lifecycle_begin). Choose the guard family per call; params use that family's native input (the same schema as the family's standalone guard tool), and solana_lending additionally requires the exact unsigned Solana lending transaction. Covered by the lifecycle purchase — no per-call charge — but consumes one of the 4 bundled guard slots; a BLOCK verdict is a complete assessment and consumes the slot. Authenticates with the one-time lifecycle token.",
  parameters: PositionLifecycleGuardInputSchema,
  handler: async (args) => {
    try {
      const result = await runBundledGuard(
        args.lifecycleId,
        args.lifecycleToken,
        args.family,
        args.params,
        args.transaction
      );
      return [
        `**Bundled guard (${result.family}): ${args.lifecycleId}**`,
        `- Guard budget: ${result.guard.used}/${result.guard.budget} used`,
        `- Lifecycle expires: ${result.expiresAt}`,
        '',
        'The native guard result follows, unmodified:',
        '```json',
        JSON.stringify(result.result),
        '```',
      ].join('\n');
    } catch (error) {
      if (error instanceof PositionLifecycleError) throw new Error(lifecycleFailureMessage(error));
      throw error;
    }
  },
};

export const positionLifecycleReceiptTool: McpToolDefinition<
  typeof PositionLifecycleReceiptInputSchema
> = {
  name: 'position_lifecycle_receipt',
  description:
    'Issue the single bundled attested execution receipt inside an open Position Lifecycle (purchased with position_lifecycle_begin). The receipt fields are the same execution_receipt takes: the pre-trade fields the agent gated on plus the settlement txHash. Covered by the lifecycle purchase — no per-call charge — but the single bundled credit is consumed on success; a failed issuance never consumes it. Authenticates with the one-time lifecycle token.',
  parameters: PositionLifecycleReceiptInputSchema,
  handler: async (args) => {
    try {
      const result = await issueBundledReceipt(args.lifecycleId, args.lifecycleToken, args.receipt);
      const d = result.receipt.data;
      const verdict = d.priceExecutionStatus ?? d.executionStatus;
      return [
        '**Bundled Execution Receipt (verifiable proof of faithful fill):**',
        `- Execution status: ${verdict}`,
        `- Fill status: ${d.fillStatus}`,
        `- Pre-trade UID: ${d.preTradeUid}`,
        `- Price delta: ${d.priceDeltaBps} bps (bound ${d.maxSlippageBps} bps, satisfied: ${d.slippageSatisfied})`,
        `- Settlement: tx ${d.txHash} on chain ${d.settlementChainId}, block ${d.blockNumber}`,
        `- Attester: ${result.receipt.attester} (${result.receipt.attesterLabel})`,
        `- UID: ${result.receipt.uid}`,
        `- Receipt credit: ${result.receiptState} (lifecycle expires ${result.expiresAt})`,
        `- Verify at: POST ${result.receipt.verifyUrl} with body { "attestation": <object> }`,
        '',
        '```json',
        JSON.stringify(result.receipt),
        '```',
      ].join('\n');
    } catch (error) {
      if (error instanceof PositionLifecycleError) throw new Error(lifecycleFailureMessage(error));
      throw error;
    }
  },
};

export const positionLifecycleCloseTool: McpToolDefinition<
  typeof PositionLifecycleCloseInputSchema
> = {
  name: 'position_lifecycle_close',
  description:
    "Close a Position Lifecycle early (idempotent; also works on an expired lifecycle) and return the combined summary: guard and receipt usage plus the embedded watch window's coverage summary (polls, verdict distribution, halts). Covered by the lifecycle purchase — no per-call charge. Authenticates with the one-time lifecycle token.",
  parameters: PositionLifecycleCloseInputSchema,
  handler: async (args) => {
    try {
      const summary = await closePositionLifecycle(args.lifecycleId, args.lifecycleToken);
      return [
        `**Position lifecycle closed: ${summary.symbol}${summary.chain ? ` on ${summary.chain}` : ''}**`,
        `- Lifecycle: ${summary.lifecycleId} (${summary.expired ? 'expired' : 'closed early'})`,
        `- Coverage: ${summary.openedAt} → ${summary.closedAt}`,
        `- Guards: ${summary.guardUsed}/${summary.guardBudget} used; receipt: ${summary.receiptState}${summary.receiptUid ? ` (UID ${summary.receiptUid})` : ''}`,
        `- Watch: ${summary.watch.pollsIssued}/${summary.watch.pollCap} polls, ${summary.watch.haltCount} halts`,
        '',
        '```json',
        JSON.stringify(summary),
        '```',
      ].join('\n');
    } catch (error) {
      if (error instanceof PositionLifecycleError) throw new Error(lifecycleFailureMessage(error));
      throw error;
    }
  },
};
