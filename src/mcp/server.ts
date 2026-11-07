import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';

import type { MppMcpCallHandler } from '@/lib/api/mpp/mcp';
import type { CreditBillingHeaderInput } from '@/lib/billing/billingHeaders';
import { makeMeteringKey, precheckCredits, recordWaivedCredit } from '@/lib/billing/creditWallet';
import {
  BILLING_ZERO_REASONS,
  isAllItemsFailedResult,
  isInsufficientDataResult,
  isUpstreamTimeoutError,
  type BillingZeroReason,
} from '@/lib/billing/exemptions';
import { isFreeVerifyCall } from '@/lib/billing/freeVerify';
import { countMcpBatchSuccessItems, getMcpToolBillableItems } from '@/lib/billing/metering';
import { getMcpToolCreditCostForCall } from '@/lib/billing/productPricing';
import {
  getCachedMcpResult,
  idempotencyMeteringKey,
  mcpRequestFingerprint,
  setCachedMcpResult,
} from '@/lib/billing/requestIdempotency';
import { createLogger } from '@/lib/utils/logger';

import packageJson from '../../package.json';

import {
  consumeMcpQuota,
  precheckMcpToolQuota,
  recordMcpToolUsage,
  type McpConsumeOutcome,
} from './middleware';
import { executeTool, getToolDefinitions } from './tools';

import type { McpAuthContext } from './auth';

const logger = createLogger('mcp-server');

/**
 * Map a consume outcome to its receipt status. Kept out of the tool handler so
 * the handler's branching stays within the complexity budget.
 */
function resolveMcpChargeReceipt(charge: McpConsumeOutcome): {
  status: CreditBillingHeaderInput['status'];
  zeroReason?: string;
} {
  if (charge.source === 'unmetered' || charge.cost === 0) {
    return { status: 'free', zeroReason: 'free' };
  }
  if (charge.confirmed === false) {
    return { status: 'degraded', zeroReason: 'unconfirmed' };
  }
  if (charge.idempotent) {
    return { status: 'replayed', zeroReason: 'replay' };
  }
  return charge.charged > 0 ? { status: 'charged' } : { status: 'not_charged' };
}

export interface McpServerOptions {
  mppPaymentEnabled?: boolean;
  mppCallHandler?: MppMcpCallHandler;
  /**
   * Caller-supplied idempotency key (`Idempotency-Key` or `X-Request-Id`).
   * When present it participates in the request fingerprint so an explicit
   * retry resolves to the same cache entry and ledger key.
   */
  idempotencyKey?: string | null;
  /**
   * Mutable per-request billing receipt. The HTTP transport fills
   * `X-Credit-*` headers from it after the response is produced.
   */
  billingReceipt?: CreditBillingHeaderInput;
}

export function createMcpServer(auth?: McpAuthContext, options: McpServerOptions = {}): Server {
  const tools = getToolDefinitions();

  const server = new Server(
    {
      name: 'insight-oracle-mcp-server',
      version: packageJson.version,
    },
    {
      capabilities: {
        tools: {},
        ...(options.mppPaymentEnabled
          ? {
              experimental: {
                payment: {
                  methods: {
                    evm: { intents: ['charge'] },
                  },
                },
              },
            }
          : {}),
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: tools as Tool[] };
  });

  server.setRequestHandler(
    CallToolRequestSchema,
    async (
      request,
      extra
    ): Promise<{
      content: Array<{ type: 'text'; text: string }>;
      isError?: boolean;
      _meta?: Record<string, unknown>;
    }> => {
      const { name, arguments: args } = request.params;
      const startTime = Date.now();
      logger.info(`MCP tool called: ${name}`, { args });

      const receipt = options.billingReceipt;
      const listPrice = getMcpToolCreditCostForCall(name, args);

      // Request-level idempotency only applies to metered API-key calls. A
      // replay inside the 10-minute window is served from the process cache
      // without re-executing or re-charging; the deterministic ledger key
      // protects replays that land on another instance.
      let requestKey: string | null = null;
      if (auth?.type === 'apikey') {
        requestKey = mcpRequestFingerprint(
          `key:${auth.apiKey.keyId}`,
          name,
          args,
          options.idempotencyKey ?? null
        );
        const cached = getCachedMcpResult(requestKey);
        if (cached) {
          if (receipt) {
            const replayBalance = (await precheckCredits(auth.apiKey.keyId, 0)).balance;
            Object.assign(receipt, {
              // A replay debits nothing: report 0, not the original price.
              costCredits: 0,
              balance: replayBalance ?? null,
              balanceAfter: replayBalance ?? null,
              status: 'replayed',
              zeroReason: 'replay',
              receipt: cached.receipt ?? cached.rest?.receipt ?? null,
            });
          }
          const replayedIsError = (cached.result as { isError?: boolean } | null)?.isError === true;
          recordMcpToolUsage(auth, name, replayedIsError ? 500 : 200, Date.now() - startTime);
          logger.info(`MCP tool replayed from idempotency cache: ${name}`);
          return cached.result as {
            content: Array<{ type: 'text'; text: string }>;
            isError?: boolean;
            _meta?: Record<string, unknown>;
          };
        }
      }

      /**
       * Write a 0-delta `waiver` ledger row for a zero-charge outcome. Uses the
       * same deterministic request key as the charge path, so a retried free
       * outcome records exactly one row and never blocks a later real charge.
       */
      const recordWaiver = async (reason: BillingZeroReason) => {
        if (auth?.type !== 'apikey') return;
        const meteringKey =
          requestKey !== null
            ? idempotencyMeteringKey(requestKey)
            : makeMeteringKey(`mcp:waiver:${auth.apiKey.keyId}:${name}`);
        await recordWaivedCredit({
          keyId: auth.apiKey.keyId,
          meteringKey,
          ref: `/mcp/tools/${name}`,
          reason,
        });
      };

      /**
       * Cache a deterministic terminal zero-charge outcome (never a timeout).
       * Shares the success-result cache and TTL; the entry keeps the original
       * `zeroReason`, while a replay reports `replay`.
       */
      const cacheZeroOutcome = (outcome: unknown, reason: BillingZeroReason) => {
        if (requestKey === null) return;
        setCachedMcpResult(requestKey, {
          priceCredits: 0,
          billableItems: 0,
          zeroReason: reason,
          result: outcome,
        });
      };

      const runBusiness = async () => {
        if (receipt) {
          Object.assign(receipt, { costCredits: listPrice, status: 'quote' });
        }

        // Credit gate: reject before executing if the key can't afford THIS
        // tool (the HTTP-boundary precheck only tests the cheapest class).
        if (auth) {
          const creditCheck = await precheckMcpToolQuota(auth, name, args);
          if (!creditCheck.allowed) {
            if (receipt) {
              Object.assign(receipt, {
                costCredits: 0,
                status: 'not_charged',
                balance: creditCheck.balance ?? null,
                balanceAfter: creditCheck.balance ?? null,
              });
            }
            recordMcpToolUsage(auth, name, 402, Date.now() - startTime);
            return {
              content: [
                { type: 'text' as const, text: `Insufficient credits: ${creditCheck.reason}` },
              ],
              isError: true,
            };
          }
        }

        const result = await executeTool(name, args, {
          // Product tools record payment provenance from the caller surface:
          // an API key bought with credits, a keyless caller buys with x402.
          apiKeyId: auth?.type === 'apikey' ? auth.apiKey.keyId : null,
        });

        if (auth) {
          const resultText = result.content.map((block) => block.text).join('\n');

          // Only consume credits when the tool actually delivered usable data.
          // Protocol overhead (initialize/tools/list/ping), execution failures,
          // upstream/chain timeouts, and results with no usable conclusion
          // (`insufficient_data` / `upstream_failed`) are NOT metered —
          // mirroring the REST API which only charges delivered data.
          if (result.isError) {
            const insufficient = isInsufficientDataResult(resultText);
            const timedOut = !insufficient && isUpstreamTimeoutError(resultText);
            if (receipt) {
              Object.assign(receipt, {
                costCredits: 0,
                status: insufficient ? 'waived' : 'not_charged',
                zeroReason: insufficient
                  ? BILLING_ZERO_REASONS.insufficientData
                  : timedOut
                    ? BILLING_ZERO_REASONS.timeout
                    : undefined,
              });
            }
            if (insufficient) {
              await recordWaiver(BILLING_ZERO_REASONS.insufficientData);
              cacheZeroOutcome(result, BILLING_ZERO_REASONS.insufficientData);
            } else if (timedOut) await recordWaiver(BILLING_ZERO_REASONS.timeout);
          } else if (isInsufficientDataResult(resultText)) {
            if (receipt) {
              Object.assign(receipt, {
                costCredits: 0,
                status: 'waived',
                zeroReason: BILLING_ZERO_REASONS.insufficientData,
              });
            }
            await recordWaiver(BILLING_ZERO_REASONS.insufficientData);
            cacheZeroOutcome(result, BILLING_ZERO_REASONS.insufficientData);
            logger.info(`MCP tool returned no usable data; not billed: ${name}`);
          } else if (isAllItemsFailedResult(resultText)) {
            if (receipt) {
              Object.assign(receipt, {
                costCredits: 0,
                status: 'waived',
                zeroReason: BILLING_ZERO_REASONS.upstreamFailed,
              });
            }
            await recordWaiver(BILLING_ZERO_REASONS.upstreamFailed);
            cacheZeroOutcome(result, BILLING_ZERO_REASONS.upstreamFailed);
            logger.info(`MCP batch failed upstream for every item; not billed: ${name}`);
          } else if (isFreeVerifyCall(name, args)) {
            // Offline verification is zero-priced by design. Record a waiver
            // row so the bill proves the call was free because of the price
            // rule, not because the data was unusable.
            if (receipt) {
              Object.assign(receipt, {
                costCredits: 0,
                status: 'waived',
                zeroReason: BILLING_ZERO_REASONS.toolFree,
              });
            }
            await recordWaiver(BILLING_ZERO_REASONS.toolFree);
            logger.info(`MCP offline verification is zero-priced; not billed: ${name}`);
          } else {
            // Batch tools can partially succeed. Bill only the items that
            // actually returned usable data; all-failed batches delivered no
            // conclusion and are exempt.
            const successfulItems = countMcpBatchSuccessItems(name, args, resultText);
            if (successfulItems === 0) {
              if (receipt) {
                Object.assign(receipt, {
                  costCredits: 0,
                  status: 'waived',
                  zeroReason: BILLING_ZERO_REASONS.upstreamFailed,
                });
              }
              await recordWaiver(BILLING_ZERO_REASONS.upstreamFailed);
              cacheZeroOutcome(result, BILLING_ZERO_REASONS.upstreamFailed);
              logger.info(`MCP batch returned no usable items; not billed: ${name}`);
            } else {
              const requestedItems = getMcpToolBillableItems(name, args);
              const charge = await consumeMcpQuota(auth, name, args, {
                meteringKey: requestKey !== null ? idempotencyMeteringKey(requestKey) : undefined,
                billableItems: successfulItems ?? undefined,
                reason:
                  successfulItems !== null
                    ? successfulItems < requestedItems
                      ? 'batch_partial'
                      : 'prices.batch'
                    : name,
                meta:
                  successfulItems !== null
                    ? { requested: requestedItems, charged: successfulItems }
                    : undefined,
              });
              if (!charge.allowed) {
                if (receipt) {
                  Object.assign(receipt, {
                    costCredits: 0,
                    status: 'not_charged',
                    balance: charge.balance ?? null,
                    balanceAfter: charge.balance ?? null,
                  });
                }
                recordMcpToolUsage(auth, name, 402, Date.now() - startTime);
                return {
                  content: [
                    {
                      type: 'text' as const,
                      text: `Insufficient credits: ${charge.reason ?? 'authoritative charge rejected'}`,
                    },
                  ],
                  isError: true,
                };
              }

              if (receipt) {
                // `charge.balance` is the post-debit balance when a debit
                // happened, and the current balance otherwise (see 0042 RPC).
                const balanceAfter = charge.balance ?? null;
                const balanceBefore =
                  balanceAfter !== null && charge.charged > 0
                    ? balanceAfter + charge.charged
                    : balanceAfter;
                const { status, zeroReason } = resolveMcpChargeReceipt(charge);
                Object.assign(receipt, {
                  costCredits: charge.cost,
                  balance: balanceBefore,
                  balanceAfter,
                  status,
                  zeroReason,
                  receipt: charge.receipt ?? null,
                });
              }

              // C4 fail-closed (§1.1 row 9 / §8.3): do not return the data
              // when a 40-credit debit could not be confirmed. A pending
              // settlement row has already been queued by consumeCredits.
              if (charge.confirmed === false && charge.cost >= 40) {
                logger.error(
                  'MCP C4 debit unconfirmed — withholding result',
                  new Error('C4_SETTLEMENT_UNCONFIRMED'),
                  {
                    apiKeyId: auth.type === 'apikey' ? auth.apiKey.keyId : null,
                    cost: charge.cost,
                  }
                );
                recordMcpToolUsage(auth, name, 503, Date.now() - startTime);
                return {
                  content: [
                    {
                      type: 'text' as const,
                      text: 'CREDIT_SETTLEMENT_UNAVAILABLE: the credit ledger is temporarily unavailable. Retry shortly; this call was not charged.',
                    },
                  ],
                  isError: true,
                };
              }

              // Cache only confirmed, billable successes. A replay of a free,
              // failed or unconfirmed request must never shadow a chargeable one.
              if (requestKey && charge.cost > 0 && charge.confirmed !== false) {
                setCachedMcpResult(requestKey, {
                  priceCredits: charge.cost,
                  billableItems: charge.items,
                  receipt: charge.receipt ?? null,
                  result,
                });
              }
            }
          }
          recordMcpToolUsage(auth, name, result.isError ? 500 : 200, Date.now() - startTime);
        }

        return result as {
          content: Array<{ type: 'text'; text: string }>;
          isError?: boolean;
        };
      };

      const result = options.mppCallHandler
        ? await options.mppCallHandler({
            name,
            args: (args ?? {}) as Record<string, unknown>,
            extra,
            runBusiness,
          })
        : await runBusiness();

      // Cast required due to minor zod v4 / MCP SDK type compatibility gap at compile time
      return result as {
        content: Array<{ type: 'text'; text: string }>;
        isError?: boolean;
        _meta?: Record<string, unknown>;
      };
    }
  );

  return server;
}

export async function runStdioServer(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();

  logger.info('Starting Insight MCP server on stdio transport');
  await server.connect(transport);
}
