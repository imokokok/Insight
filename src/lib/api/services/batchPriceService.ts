import { z } from 'zod';

import { fetchPriceWithDatabase } from '@/lib/oracles/base/databaseOperations';
import { SafeSymbolSchema, SafeProviderSchema, SafeChainSchema } from '@/lib/security/validation';
import { mapWithConcurrency } from '@/lib/utils/concurrency';
import type { Blockchain, OracleProvider, PriceData } from '@/types/oracle';

const BATCH_FETCH_CONCURRENCY = 5;

const BatchPriceQuerySchema = z.object({
  provider: SafeProviderSchema,
  symbol: SafeSymbolSchema,
  chain: SafeChainSchema.optional(),
});

export const BatchPriceRequestSchema = z.object({
  queries: z
    .array(BatchPriceQuerySchema)
    .min(1, 'At least one query is required')
    .max(20, 'Maximum 20 queries per batch request'),
  forceRefresh: z.boolean().optional().default(false),
});

export type BatchPriceBody = z.infer<typeof BatchPriceRequestSchema>;

export interface BatchPriceResult {
  provider: string;
  symbol: string;
  chain?: string;
  price: PriceData | null;
  error: string | null;
}

/**
 * Fetch at most five prices concurrently in request order. The legacy route
 * passes a parent signal; each query gets its own child signal to avoid
 * attaching one listener per provider call to the request signal.
 */
export async function fetchBatchPrices(
  body: BatchPriceBody,
  options: {
    signal?: AbortSignal;
    onQueryError?: (query: BatchPriceBody['queries'][number], message: string) => void;
  } = {}
): Promise<BatchPriceResult[]> {
  const { queries, forceRefresh } = body;
  const controllers = options.signal ? queries.map(() => new AbortController()) : null;
  const abortQueries = () => {
    for (const controller of controllers ?? []) {
      if (!controller.signal.aborted) controller.abort(options.signal?.reason);
    }
  };
  if (options.signal?.aborted) abortQueries();
  else options.signal?.addEventListener('abort', abortQueries, { once: true });

  try {
    return await mapWithConcurrency(
      queries,
      BATCH_FETCH_CONCURRENCY,
      async (query, index): Promise<BatchPriceResult> => {
        try {
          const price = controllers
            ? await fetchPriceWithDatabase(
                query.provider as OracleProvider,
                query.symbol,
                query.chain as Blockchain | undefined,
                true,
                forceRefresh,
                controllers[index].signal
              )
            : await fetchPriceWithDatabase(
                query.provider as OracleProvider,
                query.symbol,
                query.chain as Blockchain | undefined,
                true,
                forceRefresh
              );
          return {
            provider: query.provider,
            symbol: query.symbol,
            chain: query.chain,
            price,
            error: null,
          };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          options.onQueryError?.(query, message);
          return {
            provider: query.provider,
            symbol: query.symbol,
            chain: query.chain,
            price: null,
            error: message,
          };
        }
      }
    );
  } finally {
    if (options.signal) options.signal.removeEventListener('abort', abortQueries);
  }
}
