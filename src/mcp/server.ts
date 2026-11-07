import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js';

import type { MppMcpCallHandler } from '@/lib/api/mpp/mcp';
import type { CreditBillingHeaderInput } from '@/lib/billing/billingHeaders';
import { precheckCredits } from '@/lib/billing/creditWallet';
import { isNoUsableDataResult } from '@/lib/billing/exemptions';
import { countMcpBatchSuccessItems } from '@/lib/billing/metering';
import { getMcpToolCreditCostForCall } from '@/lib/billing/productPricing';
import {
  getCachedMcpResult,
  idempotencyMeteringKey,
  mcpRequestFingerprint,
  setCachedMcpResult,
} from '@/lib/billing/requestIdempotency';
import { createLogger } from '@/lib/utils/logger';

import packageJson from '../../package.json';

import { consumeMcpQuota, precheckMcpToolQuota, recordMcpToolUsage } from './middleware';
import { executeTool, getToolDefinitions } from './tools';

import type { McpAuthContext } from './auth';

const logger = createLogger('mcp-server');

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
              costCredits: cached.priceCredits,
              balance: replayBalance ?? null,
              balanceAfter: replayBalance ?? null,
              status: 'replayed',
              receipt: cached.receipt ?? cached.rest?.receipt ?? null,
            });
          }
          recordMcpToolUsage(auth, name, 200, Date.now() - startTime);
          logger.info(`MCP tool replayed from idempotency cache: ${name}`);
          return cached.result as {
            content: Array<{ type: 'text'; text: string }>;
            isError?: boolean;
            _meta?: Record<string, unknown>;
          };
        }
      }

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
          // upstream/chain timeouts, and `insufficient_data` results are NOT
          // metered — mirroring the REST API which only charges delivered data.
          if (result.isError) {
            if (receipt) {
              Object.assign(receipt, {
                costCredits: 0,
                status: /INSUFFICIENT_DATA/.test(resultText) ? 'waived' : 'not_charged',
              });
            }
          } else if (isNoUsableDataResult(resultText)) {
            if (receipt) {
              Object.assign(receipt, { costCredits: 0, status: 'waived' });
            }
            logger.info(`MCP tool returned no usable data; not billed: ${name}`);
          } else {
            // Batch tools can partially succeed. Bill only the items that
            // actually returned usable data; all-failed batches delivered no
            // conclusion and are exempt.
            const successfulItems = countMcpBatchSuccessItems(name, args, resultText);
            if (successfulItems === 0) {
              if (receipt) {
                Object.assign(receipt, { costCredits: 0, status: 'waived' });
              }
              logger.info(`MCP batch returned no usable items; not billed: ${name}`);
            } else {
              const charge = await consumeMcpQuota(auth, name, args, {
                meteringKey: requestKey !== null ? idempotencyMeteringKey(requestKey) : undefined,
                billableItems: successfulItems ?? undefined,
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
                const status =
                  charge.source === 'unmetered' || charge.cost === 0
                    ? 'free'
                    : charge.confirmed === false
                      ? 'degraded'
                      : charge.idempotent
                        ? 'replayed'
                        : charge.charged > 0
                          ? 'charged'
                          : 'not_charged';
                Object.assign(receipt, {
                  costCredits: charge.cost,
                  balance: balanceBefore,
                  balanceAfter,
                  status,
                  receipt: charge.receipt ?? null,
                });
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
