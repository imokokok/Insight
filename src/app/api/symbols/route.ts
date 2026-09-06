import { type NextRequest, NextResponse } from 'next/server';

import { createApiHandler, createOptionsHandler } from '@/lib/api/handler';
import { CACHE_PRESETS } from '@/lib/api/utils';
import { getDefaultFactory } from '@/lib/oracles/factory';
import { loadSymbolsFromDatabase } from '@/lib/symbols/symbolsService';
import { ORACLE_PROVIDER_VALUES, type Blockchain } from '@/types/oracle';

export const OPTIONS = createOptionsHandler();

/**
 * Internal symbol list endpoint.
 *
 * Returns the raw data shape directly (no {success,data,meta} wrapper) for
 * backwards compatibility with the existing Next.js UI. New external callers
 * should use /api/v1/symbols which follows the standardized API envelope.
 */
export const GET = createApiHandler(
  async (_request: NextRequest) => {
    const symbolsData = await loadSymbolsFromDatabase();
    const factory = getDefaultFactory();
    const oracleChains: Record<string, Blockchain[]> = {};
    const oracleChainSymbols: Record<string, Partial<Record<Blockchain, string[]>>> = {};

    for (const provider of ORACLE_PROVIDER_VALUES) {
      const client = factory.getClient(provider);
      const chains = [...client.supportedChains];
      const allSymbols = symbolsData.oracleSymbols[provider] ?? client.getSupportedSymbols();

      oracleChains[provider] = chains;
      oracleChainSymbols[provider] = Object.fromEntries(
        chains.map((chain) => {
          const clientWithChainSymbols = client as typeof client & {
            getSupportedSymbolsForChain?: (targetChain: Blockchain) => string[];
          };
          const supported = clientWithChainSymbols.getSupportedSymbolsForChain
            ? clientWithChainSymbols.getSupportedSymbolsForChain(chain)
            : allSymbols.filter((symbol) => client.isSymbolSupported(symbol, chain));
          return [chain, supported];
        })
      ) as Partial<Record<Blockchain, string[]>>;
    }

    const response = NextResponse.json({ ...symbolsData, oracleChains, oracleChainSymbols });
    // Symbol list is DB-driven and can change when the GitHub Action sync
    // activates/deactivates feeds. Keep CDN cache aligned with the 5-minute
    // server-side symbol cache so UI/API consumers don't see stale feeds.
    response.headers.set('Cache-Control', CACHE_PRESETS.semiStatic);
    return response;
  },
  {
    middlewares: {
      logging: true,
      rateLimit: { preset: 'moderate' },
      auth: { required: false },
    },
    skipInternalAuthAndRateLimit: true,
  }
);
